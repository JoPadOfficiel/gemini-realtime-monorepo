# ============================================================================
# GEMINI LIVE BACKEND API
# ============================================================================

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
import asyncio
import json
import os
import time
from datetime import datetime
from dataclasses import dataclass, field
from dotenv import load_dotenv
from websockets import connect
from typing import Dict, List, Optional
from simple_memory import get_memory_manager
from async_memory import async_memory_queue
from collections import defaultdict
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

# ============================================================================
# API CONFIGURATION
# ============================================================================

tags_metadata = [
    {"name": "Health", "description": "Health check and system status endpoints"},
    {"name": "Models", "description": "Model information and rate limits management"},
    {"name": "Memory", "description": "Conversation memory management operations"},
    {"name": "Async", "description": "Asynchronous operations for improved performance"},
    {"name": "Tokens", "description": "Token usage tracking and monitoring"},
    {"name": "Sessions", "description": "WebSocket session management and monitoring"},
]

app = FastAPI(
    title="Gemini Live Backend API",
    description="Backend API for Gemini Live Multimodal Playground with real-time WebSocket communication, memory management, and session handling.",
    version="1.2.0",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # change production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# CONSTANTS AND CONFIGURATION
# ============================================================================
MEMORY_QUERY_TOOL = {
    "function_declarations": [
        {
            "name": "query_memory",
            "description": "Query the conversation memory to retrieve relevant past context and information from previous conversations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant memories and past conversation context"
                    }
                },
                "required": ["query"]
            }
        }
    ]
}

session_handles = {}

def save_session_handle(session_id: str, handle: str):
    """Save session handle for resumption"""
    session_handles[session_id] = handle

def get_session_handle(session_id: str) -> str:
    """Get session handle for resumption"""
    return session_handles.get(session_id, None)

# ============================================================================
# GEMINI CONNECTION CLASS
# ============================================================================

class GeminiConnection:
    def __init__(self, model="gemini-live-2.5-flash-preview", session_id=None):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = model
        self.session_id = session_id or "default_session"
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.config = None
        self.accumulated_pcm_data = []
        self.accumulated_user_pcm_data = []
        self.accumulated_input_transcription = []
        self.accumulated_output_transcription = []
        self.token_count = 0
        self.is_conversation_interrupted = False
        self.session_start_time = None
        self.memory_manager = None

    def get_model_limits(self):
        """Get rate limits for the current model"""
        limits = {
            "gemini-live-2.5-flash-preview": {
                "name": "Gemini 2.5 Flash Live (Half-Cascade)",
                "free_tier": {"sessions": 3, "tpm": 1000000, "rpd": "Unlimited"},
                "tier_1": {"sessions": 50, "tpm": 4000000, "rpd": "Unlimited"},
                "tier_2": {"sessions": 1000, "tpm": 10000000, "rpd": "Unlimited"},
                "recommended": True
            },
            "gemini-2.0-flash-live-001": {
                "name": "Gemini 2.0 Flash Live (Half-Cascade)",
                "free_tier": {"sessions": 3, "tpm": 1000000, "rpd": "Unlimited"},
                "tier_1": {"sessions": 50, "tpm": 4000000, "rpd": "Unlimited"},
                "tier_2": {"sessions": 1000, "tpm": 10000000, "rpd": "Unlimited"},
                "recommended": True
            },
            "gemini-2.5-flash-preview-native-audio-dialog": {
                "name": "Gemini 2.5 Flash Native Audio Dialog",
                "free_tier": {"sessions": 1, "tpm": 25000, "rpd": 5},
                "tier_1": {"sessions": 3, "tpm": 50000, "rpd": 50},
                "tier_2": {"sessions": 100, "tpm": 1000000, "rpd": "Unlimited"},
                "recommended": False,
                "warning": "Very restrictive limits"
            },
            "gemini-2.5-flash-exp-native-audio-thinking-dialog": {
                "name": "Gemini 2.5 Flash Native Audio Thinking",
                "free_tier": {"sessions": 1, "tpm": 10000, "rpd": 5},
                "tier_1": {"sessions": 1, "tpm": 25000, "rpd": 50},
                "tier_2": {"sessions": 1, "tpm": 25000, "rpd": 50},
                "recommended": False,
                "warning": "Extremely restrictive limits"
            }
        }
        return limits.get(self.model, {
            "name": "Unknown Model",
            "free_tier": {"sessions": "Unknown", "tpm": "Unknown", "rpd": "Unknown"},
            "recommended": False
        })

    async def connect(self):
        """Initialize connection to Gemini"""
        self.ws = await connect(self.uri, additional_headers={"Content-Type": "application/json"})

        if not self.config:
            raise ValueError("Configuration must be set before connecting")

        # Initialize memory manager
        if self.memory_manager is None:
            self.memory_manager = await get_memory_manager()

        # Send initial setup message with configuration
        setup_message = {
            "setup": {
                "model": f"models/{self.model}",
                "generation_config": {
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": self.config.get("voice", "Puck")
                            }
                        }
                    }
                },
                "system_instruction": {
                    "parts": [
                        {
                            "text": self.config.get("systemPrompt", "You are a helpful assistant with long-term memory. Before answering any questions, you should use the query_memory tool to check if we have discussed similar topics before. Use relevant past context to provide better, more personalized responses.")
                        }
                    ]
                },
                "tools": [MEMORY_QUERY_TOOL]
            }
        }

        # Add transcription configuration using official API + GitHub accumulation system
        setup_message["setup"]["input_audio_transcription"] = {}
        setup_message["setup"]["output_audio_transcription"] = {}

        # Add session resumption configuration
        previous_handle = get_session_handle(self.session_id)
        if previous_handle:
            setup_message["setup"]["session_resumption"] = {
                "handle": previous_handle
            }
            print(f"Resuming session with handle: {previous_handle}")
        else:
            setup_message["setup"]["session_resumption"] = {}
            print("Starting new session")

        # Add VAD configuration (enabled by default)
        setup_message["setup"]["realtime_input_config"] = {
            "automatic_activity_detection": {
                "disabled": False,  # Enabled by default
                "start_of_speech_sensitivity": "START_SENSITIVITY_HIGH",  # High for quick detection
                "end_of_speech_sensitivity": "END_SENSITIVITY_HIGH",      # High for immediate interruption
                "prefix_padding_ms": 5,    # Lower for faster response
                "silence_duration_ms": 45  # Much lower for immediate interruption
            },
            "activity_handling": "START_OF_ACTIVITY_INTERRUPTS"  # Enable interruptions
        }

        # Add advanced features for native audio models
        if "native-audio" in self.model:
            # Automatically enable thinking mode for thinking models
            if "thinking" in self.model:
                print("Thinking Mode automatically enabled for this model")

            # Affective Dialog for native audio models
            if self.config.get("enableAffectiveDialog", False):
                setup_message["setup"]["generation_config"]["enable_affective_dialog"] = True

            # Proactive Audio removed - not supported by all Native Audio models

        # Language configuration (for half-cascade models)
        if self.config.get("language") and self.config["language"] != "auto":
            if "native-audio" not in self.model:  # Only for half-cascade models
                setup_message["setup"]["generation_config"]["speech_config"]["language_code"] = self.config["language"]
        print(f"Sending setup message with model: {self.model}")
        print(f"Voice: {self.config.get('voice', 'Puck')}")
        print(f"Affective Dialog: {self.config.get('enableAffectiveDialog', False)}")
        print(f"Setup message: {json.dumps(setup_message, indent=2)}")
        await self.ws.send(json.dumps(setup_message))
        
        # Wait for setup completion
        setup_response = await self.ws.recv()
        return setup_response

    def set_config(self, config):
        """Set configuration for the connection"""
        self.config = config
        # Update model if specified in config
        if "model" in config:
            self.model = config["model"]

    async def send_audio(self, audio_data: str):
        """Send audio data to Gemini and accumulate for user transcription"""
        self.accumulated_user_pcm_data.append(audio_data)

        realtime_input_msg = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": audio_data,
                        "mime_type": "audio/pcm"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(realtime_input_msg))

    async def send_audio_stream_end(self):
        """Send audio stream end signal for VAD"""
        realtime_input_msg = {
            "realtime_input": {
                "audio_stream_end": True
            }
        }
        await self.ws.send(json.dumps(realtime_input_msg))

    async def receive(self):
        """Receive message from Gemini"""
        return await self.ws.recv()

    async def close(self):
        """Close the connection"""
        if self.ws:
            await self.ws.close()

    async def send_image(self, image_data: str):
        """Send image data to Gemini"""
        image_message = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": image_data,
                        "mime_type": "image/jpeg"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(image_message))

    async def send_text(self, text: str):
        """Send text message to Gemini"""
        text_message = {
            "client_content": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ],
                "turn_complete": True
            }
        }
        await self.ws.send(json.dumps(text_message))

# ============================================================================
# GLOBAL STATE MANAGEMENT
# ============================================================================

connections: Dict[str, GeminiConnection] = {}

@dataclass
class SessionState:
    session_id: str
    status: str
    error_message: Optional[str] = None
    token_count: int = 0
    model: str = "gemini-2.0-flash-exp"
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)

session_states: Dict[str, SessionState] = {}
token_usage_history: List[Dict] = []
session_history: List[Dict] = []
daily_stats = defaultdict(lambda: {"tokens": 0, "sessions": 0, "messages": 0})
recent_activities: List[Dict] = []

# ============================================================================
# POSTGRESQL DATABASE SAVE FUNCTION
# ============================================================================

def save_to_database(user_id: str, session_id: str, model: str, total_tokens: int):
    """Function to save token usage to PostgreSQL - UPSERT to prevent duplicates"""
    try:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            return

        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO token_usages (id, "userId", model, "inputTokens", "outputTokens", "totalTokens", cost, endpoint, "sessionId", created_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("sessionId")
            DO UPDATE SET
                "totalTokens" = EXCLUDED."totalTokens",
                "inputTokens" = EXCLUDED."inputTokens",
                "outputTokens" = EXCLUDED."outputTokens",
                cost = EXCLUDED.cost,
                created_at = NOW()
        """, (user_id, model, total_tokens//2, total_tokens//2, total_tokens, total_tokens * 0.000075, f"/ws/{session_id}", session_id))

        cursor.execute("""
            INSERT INTO user_activities (id, "userId", action, details, created_at)
            VALUES (gen_random_uuid(), %s, %s, %s, NOW())
            ON CONFLICT DO NOTHING
        """, (user_id, "session_activity", json.dumps({"tokens": total_tokens, "model": model, "session_id": session_id})))

        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ UPSERTED to DB: {total_tokens} tokens for session {session_id}")

    except Exception as e:
        print(f"❌ DB save failed: {e}")

def load_database_stats():
    """Load historical statistics from PostgreSQL database"""
    try:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            return {"total_tokens": 0, "total_sessions": 0, "activities": []}

        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get total tokens from database
        cursor.execute("SELECT COALESCE(SUM(\"totalTokens\"), 0) as total_tokens FROM token_usages")
        total_tokens = cursor.fetchone()["total_tokens"]

        # Get total sessions from database
        cursor.execute("SELECT COUNT(DISTINCT \"sessionId\") as total_sessions FROM token_usages WHERE \"sessionId\" IS NOT NULL")
        total_sessions = cursor.fetchone()["total_sessions"]

        # Get recent activities from database
        cursor.execute("""
            SELECT ua.action, ua.details, ua.created_at, tu."totalTokens", tu.model
            FROM user_activities ua
            LEFT JOIN token_usages tu ON ua."userId" = tu."userId"
            ORDER BY ua.created_at DESC
            LIMIT 20
        """)
        activities = cursor.fetchall()

        cursor.close()
        conn.close()

        print(f"✅ Loaded from DB: {total_tokens} total tokens, {total_sessions} sessions, {len(activities)} activities")
        return {
            "total_tokens": int(total_tokens),
            "total_sessions": int(total_sessions),
            "activities": [
                {
                    "type": activity["action"],
                    "description": f"Session with {activity.get('totalTokens', 0)} tokens",
                    "tokens_used": activity.get("totalTokens", 0),
                    "timestamp": activity["created_at"].isoformat() if activity["created_at"] else datetime.now().isoformat(),
                    "mode": "audio"
                }
                for activity in activities
            ]
        }

    except Exception as e:
        print(f"⚠️ DB load failed: {e}")
        return {"total_tokens": 0, "total_sessions": 0, "activities": []}

@app.post("/api/admin/reset-statistics", tags=["Admin"])
async def reset_all_statistics():
    """Reset all statistics data"""
    global connections, session_states, token_usage_history, session_history, daily_stats, recent_activities

    # Close all active connections
    for session_id, connection in list(connections.items()):
        try:
            await connection.close()
        except Exception as e:
            print(f"Error closing connection {session_id}: {e}")

    # Clear all data
    connections.clear()
    session_states.clear()
    token_usage_history.clear()
    session_history.clear()
    daily_stats.clear()
    recent_activities.clear()

    return {
        "message": "Statistics reset completed",
        "reset_data": {
            "connections": 0,
            "session_states": 0,
            "token_usage_history": 0,
            "session_history": 0,
            "daily_stats": 0,
            "recent_activities": 0
        },
        "timestamp": datetime.now().isoformat()
    }


available_models: List[Dict] = [
    {
        "id": "gemini-live-2.5-flash-preview",
        "name": "Gemini Live 2.5 Flash (Recommended)",
        "type": "half_cascade",
        "recommended": True,
        "limits": "3 sessions, 1M TPM (Free)",
        "enabled": True
    },
    {
        "id": "gemini-2.5-flash-preview-native-audio-dialog",
        "name": "Gemini 2.5 Flash Native Audio Dialog",
        "type": "native_audio",
        "recommended": False,
        "limits": "⚠️ 1 session, 25K TPM (Free)",
        "warning": "Very restrictive limits",
        "enabled": True
    },
    {
        "id": "gemini-2.5-flash-exp-native-audio-thinking-dialog",
        "name": "Gemini 2.5 Flash Native Audio Thinking",
        "type": "native_audio",
        "recommended": False,
        "limits": "⚠️ 1 session, 10K TPM (Free)",
        "warning": "Extremely restrictive limits",
        "enabled": True
    }
]

user_model_access: Dict[str, List[Dict]] = {}
user_settings: Dict[str, Dict] = {}

# ============================================================================
# Mem0 Pydantic MODELS
# ============================================================================
class MemoryQuery(BaseModel):
    """Query model for searching conversation memory"""

    query: str = Field(
        ...,
        description="Search query to find relevant memories and past conversation context"
    )
    session_id: Optional[str] = Field(
        default="default_session",
        description="Session identifier to scope the memory search"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "What did we discuss about machine learning?",
                "session_id": "user_123_session"
            }
        }
    )

class MemoryAdd(BaseModel):
    """Model for adding conversation messages to memory"""

    messages: List[Dict] = Field(
        ...,
        description="List of conversation messages to store in memory"
    )
    session_id: Optional[str] = Field(
        default="default_session",
        description="Session identifier for memory organization"
    )
    metadata: Optional[Dict] = Field(
        default=None,
        description="Additional metadata to store with the conversation"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "messages": [
                    {"role": "user", "content": "What is machine learning?"},
                    {"role": "assistant", "content": "Machine learning is a subset of artificial intelligence..."}
                ],
                "session_id": "user_123_session",
                "metadata": {"topic": "AI", "importance": "high"}
            }
        }
    )

class MemoryResponse(BaseModel):
    """Standard response model for memory operations"""

    success: bool = Field(
        ...,
        description="Whether the memory operation was successful"
    )
    data: Optional[Dict] = Field(
        default=None,
        description="Response data containing memories or operation results"
    )
    message: str = Field(
        ...,
        description="Human-readable message describing the operation result"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "data": {
                    "memories": ["Previous conversation about AI..."],
                    "count": 3
                },
                "message": "Memory query successful"
            }
        }
    )

class TokenUsageResponse(BaseModel):
    """Response model for token usage information"""

    total_tokens: int = Field(
        ...,
        description="Total number of tokens used in the session"
    )
    model: str = Field(
        ...,
        description="AI model being used"
    )
    limits: Dict = Field(
        ...,
        description="Rate limits and quotas for the current model"
    )
    timestamp: float = Field(
        ...,
        description="Unix timestamp when the usage was recorded"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_tokens": 1250,
                "model": "gemini-2.0-flash-live-001",
                "limits": {
                    "sessions": 50,
                    "tpm": 4000000,
                    "rpd": "Unlimited"
                },
                "timestamp": 1703123456.789
            }
        }
    )

class SessionInfo(BaseModel):
    """Information about a WebSocket session"""

    session_id: str = Field(
        ...,
        description="Unique identifier for the session"
    )
    active: bool = Field(
        ...,
        description="Whether the WebSocket connection is currently active"
    )
    model: str = Field(
        ...,
        description="AI model being used in this session"
    )
    token_count: int = Field(
        ...,
        description="Number of tokens used in this session"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "user_123_session",
                "active": True,
                "model": "gemini-2.0-flash-live-001",
                "token_count": 1250
            }
        }
    )

class TokenStats(BaseModel):
    """Token usage statistics for dashboard"""
    totalTokens: int = Field(..., description="Total tokens used across all sessions")
    todayTokens: int = Field(..., description="Tokens used today")
    weeklyTokens: int = Field(..., description="Tokens used this week")
    monthlyTokens: int = Field(..., description="Tokens used this month")
    limit: int = Field(..., description="Monthly token limit")

class SessionStats(BaseModel):
    """Session statistics for dashboard"""
    totalSessions: int = Field(..., description="Total number of sessions")
    todaySessions: int = Field(..., description="Sessions started today")
    averageSessionDuration: int = Field(..., description="Average session duration in seconds")
    totalMessages: int = Field(..., description="Total messages across all sessions")

class DashboardActivity(BaseModel):
    """Recent activity item for dashboard"""
    type: str = Field(..., description="Type of activity (audio, video, screen)")
    description: str = Field(..., description="Human-readable description")
    tokens_used: int = Field(..., description="Tokens used in this activity")
    timestamp: str = Field(..., description="ISO timestamp of the activity")
    mode: str = Field(..., description="Session mode (audio, video, screen)")

class ModelConfig(BaseModel):
    """Model configuration for admin management"""
    id: str = Field(..., description="Model ID")
    name: str = Field(..., description="Human-readable model name")
    type: str = Field(..., description="Model type (half_cascade, native_audio)")
    recommended: bool = Field(..., description="Whether this model is recommended")
    limits: str = Field(..., description="Model usage limits")
    warning: Optional[str] = Field(None, description="Warning message for restrictive models")
    enabled: bool = Field(True, description="Whether this model is enabled globally")

class UserModelAccess(BaseModel):
    """User-specific model access configuration"""
    user_id: str = Field(..., description="User ID")
    model_id: str = Field(..., description="Model ID")
    enabled: bool = Field(..., description="Whether user has access to this model")
    is_default: bool = Field(False, description="Whether this is the default model for the user")

class UserSettings(BaseModel):
    """User-configurable settings"""
    user_id: str = Field(..., description="User ID")
    voice: str = Field("Puck", description="Selected voice")
    language: str = Field("auto", description="Selected language")
    enable_proactive_audio: bool = Field(False, description="Enable proactive audio")
    enable_affective_dialog: bool = Field(False, description="Enable affective dialog")
    enable_vad: bool = Field(True, description="Enable voice activity detection")
    enable_google_search: bool = Field(True, description="Enable Google search integration")

# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()

    # Create session state immediately
    session_states[client_id] = SessionState(
        session_id=client_id,
        status="connecting"
    )

    try:
        # Create new Gemini connection for this client
        gemini = GeminiConnection(session_id=client_id)
        connections[client_id] = gemini

        # Wait for initial configuration
        config_data = await websocket.receive_json()
        if config_data.get("type") != "config":
            raise ValueError("First message must be configuration")

        # Get user_id from config and load user settings
        user_id = config_data.get("config", {}).get("user_id", "default-user")
        user_config = user_settings.get(user_id, {
            "user_id": user_id,
            "voice": "Puck",
            "language": "auto",
            "enable_proactive_audio": False,
            "enable_affective_dialog": False,
            "enable_vad": True,
            "enable_google_search": True
        })

        # Merge user settings with frontend config (frontend config takes precedence)
        frontend_config = config_data.get("config", {})
        merged_config = {
            "model": frontend_config.get("model", "gemini-live-2.5-flash-preview"),
            "voice": user_config.get("voice", "Puck"),
            "language": user_config.get("language", "auto"),
            "enableAffectiveDialog": user_config.get("enable_affective_dialog", False),
            "enableVAD": user_config.get("enable_vad", True),
            "enableGoogleSearch": user_config.get("enable_google_search", True),
            "user_id": user_id
        }

        print(f"🔧 User settings loaded for {user_id}: {user_config}")
        print(f"🔧 Merged config: {merged_config}")

        # Set the merged configuration
        gemini.set_config(merged_config)

        # Update session state
        session_states[client_id].model = gemini.model
        session_states[client_id].status = "connecting"

        # Initialize Gemini connection
        await gemini.connect()

        # Connection successful
        session_states[client_id].status = "active"
        
        # Handle bidirectional communication
        async def receive_from_client():
            try:
                while True:
                    try:
                        # Check if connection is closed
                        if websocket.client_state.value == 3:  # WebSocket.CLOSED
                            print("WebSocket connection closed by client")
                            return
                            
                        message = await websocket.receive()
                        
                        # Check for close message
                        if message["type"] == "websocket.disconnect":
                            print("Received disconnect message")
                            return
                            
                        message_content = json.loads(message["text"])
                        msg_type = message_content["type"]
                        if msg_type == "config":
                            # Config message already handled during setup, just acknowledge
                            print(f"Received config message: {message_content.get('config', {}).get('model', 'unknown')}")
                            continue
                        elif msg_type == "audio":
                            await gemini.send_audio(message_content["data"])
                        elif msg_type == "image":
                            print(f"Received image data: {len(message_content['data'])} bytes")
                            await gemini.send_image(message_content["data"])
                        elif msg_type == "text":
                            await gemini.send_text(message_content["data"])
                        else:
                            print(f"Unknown message type: {msg_type}")
                    except json.JSONDecodeError as e:
                        print(f"JSON decode error: {e}")
                        continue
                    except KeyError as e:
                        print(f"Key error in message: {e}")
                        continue
                    except Exception as e:
                        print(f"Error processing client message: {str(e)}")
                        if "disconnect message" in str(e):
                            return
                        continue
                            
            except Exception as e:
                print(f"Fatal error in receive_from_client: {str(e)}")
                return

        async def receive_from_gemini():
            try:
                while True:
                    if websocket.client_state.value == 3:  # WebSocket.CLOSED
                        print("WebSocket closed, stopping Gemini receiver")
                        return

                    msg = await gemini.receive()
                    response = json.loads(msg)

                    # Track token usage if available
                    if "usageMetadata" in response:
                        usage = response["usageMetadata"]
                        if "totalTokenCount" in usage:
                            gemini.token_count = usage["totalTokenCount"]
                            if client_id in session_states:
                                session_states[client_id].token_count = gemini.token_count

                            print(f"🔍 Token count updated: {gemini.token_count} for session {client_id}")

                            await websocket.send_text(json.dumps({
                                "type": "token_usage",
                                "data": {
                                    "total_tokens": gemini.token_count,
                                    "model": gemini.model,
                                    "limits": gemini.get_model_limits()
                                }
                            }))
                    else:
                        # Manual token counting fallback
                        if "candidates" in response:
                            for candidate in response["candidates"]:
                                if "content" in candidate and "parts" in candidate["content"]:
                                    for part in candidate["content"]["parts"]:
                                        if "text" in part:
                                            estimated_tokens = len(part["text"]) // 4
                                            gemini.token_count += estimated_tokens
                                            if client_id in session_states:
                                                session_states[client_id].token_count = gemini.token_count

                    # Handle function calls (memory queries) - following reference implementation
                    if "toolCall" in response:
                        tool_call = response["toolCall"]
                        function_calls = tool_call.get("functionCalls", [])

                        for function_call in function_calls:
                            function_name = function_call.get("name")
                            function_args = function_call.get("args", {})
                            call_id = function_call.get("id")

                            if function_name == "query_memory":
                                try:
                                    query = function_args.get("query", "")
                                    print(f"Memory query: {query}")

                                    user_id = gemini.config.get('user_id', 'default-user') if gemini.config else 'default-user'
                                    memories = gemini.memory_manager.query_memory(query, user_id, gemini.session_id)
                                    memory_response = gemini.memory_manager.format_memory_response(memories)

                                    # Send function response back to Gemini (following reference format)
                                    function_response = {
                                        "toolResponse": {
                                            "functionResponses": [
                                                {
                                                    "id": call_id,
                                                    "name": function_name,
                                                    "response": {"result": memory_response}
                                                }
                                            ]
                                        }
                                    }

                                    print(f"Sending memory response: {memory_response[:200]}...")
                                    await gemini.ws.send(json.dumps(function_response))

                                except Exception as e:
                                    print(f"Error handling memory query: {e}")
                                    # Send error response
                                    error_response = {
                                        "toolResponse": {
                                            "functionResponses": [
                                                {
                                                    "id": call_id,
                                                    "name": function_name,
                                                    "response": {"result": "Error retrieving memories"}
                                                }
                                            ]
                                        }
                                    }
                                    await gemini.ws.send(json.dumps(error_response))

                    # Forward audio data to client and accumulate PCM data
                    try:
                        parts = response["serverContent"]["modelTurn"]["parts"]
                        for p in parts:
                            # Check connection state before each send
                            if websocket.client_state.value == 3:
                                return

                            if "inlineData" in p:
                                audio_data = p["inlineData"]["data"]
                                # Accumulate PCM data for transcription
                                if p["inlineData"]["mimeType"] == "audio/pcm;rate=24000":
                                    gemini.accumulated_pcm_data.append(audio_data)

                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_data
                                })
                            elif "text" in p:
                                text_content = p["text"]
                                print(f"Received text: {text_content}")

                                # Detect if this is thinking content (starts with **)
                                if text_content.startswith("**") and "native-audio" in gemini.model and "thinking" in gemini.model:
                                    print(f"Sending thinking to frontend: {text_content}")
                                    await websocket.send_json({
                                        "type": "thinking",
                                        "data": text_content
                                    })
                                else:
                                    print(f"Sending text to frontend: {text_content}")
                                    await websocket.send_json({
                                        "type": "text",
                                        "data": text_content
                                    })
                    except KeyError:
                        pass

                    # Handle session resumption updates
                    try:
                        if "sessionResumptionUpdate" in response:
                            update = response["sessionResumptionUpdate"]
                            if update.get("resumable") and update.get("newHandle"):
                                save_session_handle(gemini.session_id, update["newHandle"])
                                print(f"Session resumption update: {update['newHandle']}")
                    except KeyError:
                        pass

                    # Handle interruptions - Immediate processing, no memory save
                    try:
                        if "serverContent" in response:
                            if "interrupted" in response["serverContent"]:
                                if response["serverContent"]["interrupted"]:
                                    print(f"[{time.time()}] Generation interrupted by user activity")

                                    # Mark conversation as interrupted (no memory save for interrupted conversations)
                                    gemini.is_conversation_interrupted = True
                                    print("Conversation marked as interrupted - will not be saved to memory")

                                    # Send immediate interruption message to frontend
                                    await websocket.send_json({"interrupted": "True"})
                                    print("Interruption message sent to frontend")
                                    continue  # Continue processing, don't block
                    except KeyError:
                        pass

                    # Handle official API transcriptions - ACCUMULATE fragments like GitHub does with PCM
                    try:
                        if "inputTranscription" in response["serverContent"]:
                            transcription_fragment = response["serverContent"]["inputTranscription"]["text"]
                            print(f"Input transcription fragment: {transcription_fragment}")
                            # Accumulate input transcription fragments (like GitHub accumulates PCM)
                            gemini.accumulated_input_transcription.append(transcription_fragment)
                    except KeyError:
                        pass

                    try:
                        if "outputTranscription" in response["serverContent"]:
                            transcription_fragment = response["serverContent"]["outputTranscription"]["text"]
                            print(f"Output transcription fragment: {transcription_fragment}")
                            # Accumulate output transcription fragments (like GitHub accumulates PCM)
                            gemini.accumulated_output_transcription.append(transcription_fragment)
                    except KeyError:
                        pass

                    # Handle turn completion - send accumulated transcriptions like GitHub
                    try:
                        if response["serverContent"]["turnComplete"]:
                            print("🔄 TURN COMPLETE detected - processing memory save")

                            # Check if conversation was interrupted
                            if gemini.is_conversation_interrupted:
                                print("🚫 Skipping memory save - conversation was interrupted (rejected by user)")
                                # Reset flag for next conversation
                                gemini.is_conversation_interrupted = False
                            else:
                                # Save complete, uninterrupted conversations to memory
                                try:
                                    user_text = None
                                    assistant_text = None

                                    if gemini.accumulated_input_transcription:
                                        user_text = "".join(gemini.accumulated_input_transcription).strip()

                                    if gemini.accumulated_output_transcription:
                                        assistant_text = "".join(gemini.accumulated_output_transcription).strip()

                                    if user_text and assistant_text and gemini.memory_manager:
                                        if (len(user_text) > 3 and len(assistant_text) > 3 and
                                            user_text not in [".", " .", "  ."] and
                                            assistant_text not in [".", " .", "  ."]):

                                            messages = [
                                                {"role": "user", "content": user_text},
                                                {"role": "assistant", "content": assistant_text}
                                            ]

                                            async def save_complete_conversation():
                                                try:
                                                    if not async_memory_queue.mem0_client:
                                                        await async_memory_queue.initialize(gemini.memory_manager)

                                                    user_id = gemini.config.get('user_id', 'default-user') if gemini.config else 'default-user'
                                                    task_id = await async_memory_queue.queue_memory_save(
                                                        gemini.session_id,
                                                        messages,
                                                        user_id
                                                    )
                                                    print(f"✅ Conversation queued for memory save (task: {task_id[:8]}...)")
                                                except Exception as e:
                                                    print(f"Error queuing conversation save: {e}")
                                                    try:
                                                        user_id = gemini.config.get('user_id', 'default-user') if gemini.config else 'default-user'
                                                        gemini.memory_manager.add_to_memory(messages, gemini.session_id, user_id)
                                                        print(f"✅ Fallback: Conversation saved synchronously for user {user_id}")
                                                    except Exception as fallback_error:
                                                        print(f"❌ Memory save failed: {fallback_error}")

                                            asyncio.create_task(save_complete_conversation())

                                except Exception as e:
                                    print(f"Error saving complete conversation to memory: {e}")
                                    import traceback
                                    traceback.print_exc()

                            # Send accumulated input transcription (user message)
                            if gemini.accumulated_input_transcription:
                                complete_input_transcription = "".join(gemini.accumulated_input_transcription)
                                if complete_input_transcription.strip() not in [".", " .", "  ."]:
                                    await websocket.send_json({
                                        "type": "user_message",
                                        "data": complete_input_transcription
                                    })
                                gemini.accumulated_input_transcription = []

                            # Send accumulated output transcription (assistant message)
                            if gemini.accumulated_output_transcription:
                                complete_output_transcription = "".join(gemini.accumulated_output_transcription)
                                await websocket.send_json({
                                    "type": "assistant_message",
                                    "data": complete_output_transcription
                                })
                                gemini.accumulated_output_transcription = []

                            # Clear accumulated PCM data
                            if gemini.accumulated_user_pcm_data:
                                gemini.accumulated_user_pcm_data = []

                            if gemini.accumulated_pcm_data:
                                gemini.accumulated_pcm_data = []



                            await websocket.send_json({
                                "type": "turn_complete",
                                "data": True
                            })
                    except KeyError:
                        pass

                    # Handle GoAway message (connection will be terminated soon)
                    try:
                        if "goAway" in response:
                            time_left = response["goAway"].get("timeLeft", "unknown")
                            print(f"Server will disconnect soon. Time left: {time_left}")
                            await websocket.send_json({
                                "type": "go_away",
                                "data": {"timeLeft": time_left}
                            })
                    except KeyError:
                        pass
            except Exception as e:
                print(f"Error receiving from Gemini: {e}")

        # Run both receiving tasks concurrently
        # Using asyncio.gather for Python 3.9+ compatibility instead of TaskGroup (3.11+)
        await asyncio.gather(
            receive_from_client(),
            receive_from_gemini(),
            return_exceptions=True
        )

    except Exception as e:
        error_message = str(e)
        print(f"WebSocket error: {error_message}")

        # Update session state with specific error types
        if client_id in session_states:
            if "quota" in error_message.lower() or "exceeded" in error_message.lower():
                session_states[client_id].status = "quota_exceeded"
                session_states[client_id].error_message = "API quota exceeded. Please check your billing details."

                # Send quota error to frontend
                try:
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "error_type": "quota_exceeded",
                            "message": "API quota exceeded. Please check your Gemini API billing details.",
                            "action": "stop_polling"
                        }
                    })
                except:
                    pass  # WebSocket might be closed

            else:
                session_states[client_id].status = "error"
                session_states[client_id].error_message = error_message

                # Send generic error to frontend
                try:
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "error_type": "connection_error",
                            "message": f"Connection error: {error_message}",
                            "action": "retry_later"
                        }
                    })
                except:
                    pass  # WebSocket might be closed

    finally:
        if client_id in connections:
            try:
                gemini = connections[client_id]
                if gemini.token_count > 0:
                    user_id = gemini.config.get('user_id', 'default-user-gemini-live') if gemini.config else 'default-user-gemini-live'
                    save_to_database(user_id, client_id, gemini.model, gemini.token_count)
                    print(f"💾 Final save: {gemini.token_count} tokens for session {client_id}")

                await connections[client_id].close()
            except Exception as e:
                print(f"Error closing connection: {e}")
            finally:
                del connections[client_id]

        # Mark session as disconnected but don't delete (for token API)
        if client_id in session_states:
            if session_states[client_id].status == "active":
                session_states[client_id].status = "disconnected"

# ============================================================================
# REST API ENDPOINTS
# ============================================================================

@app.get("/health", tags=["Health"])
async def health():
    """
    Health check endpoint

    Returns the current health status of the API server.
    Used for monitoring and load balancer health checks.
    """
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/model-limits/{model_name}", tags=["Models"])
async def get_model_limits(model_name: str):
    """
    Get rate limits for a specific Gemini model

    Returns detailed information about rate limits, quotas, and recommendations
    for the specified AI model. Useful for understanding usage constraints
    before establishing connections.

    - **model_name**: The Gemini model identifier (e.g., 'gemini-2.0-flash-live-001')
    """
    dummy_connection = GeminiConnection(model_name, session_id="dummy")
    limits = dummy_connection.get_model_limits()
    return {
        "model": model_name,
        "limits": limits,
        "timestamp": time.time()
    }

# Memory Management APIs
@app.post("/api/memory/query", response_model=MemoryResponse, tags=["Memory"])
async def query_memory_api(query_data: MemoryQuery):
    """Query conversation memory for relevant past context"""
    try:
        memory_manager = await get_memory_manager()
        memories = memory_manager.query_memory(query_data.query, query_data.session_id)
        formatted_response = memory_manager.format_memory_response(memories)

        return MemoryResponse(
            success=True,
            data={"memories": memories, "formatted": formatted_response},
            message="Memory query successful"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory query failed: {str(e)}")

@app.post("/api/memory/add", response_model=MemoryResponse, tags=["Memory"])
async def add_memory_api(memory_data: MemoryAdd):
    """Add conversation to memory storage"""
    try:
        memory_manager = await get_memory_manager()
        memory_id = memory_manager.add_to_memory(
            memory_data.messages,
            memory_data.session_id,
            memory_data.metadata
        )

        return MemoryResponse(
            success=True,
            data={"memory_id": memory_id},
            message="Memory added successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add memory: {str(e)}")

@app.delete("/api/memory/{session_id}", response_model=MemoryResponse, tags=["Memory"])
async def clear_session_memory(session_id: str):
    """Clear all memories for a specific session"""
    try:
        await get_memory_manager()
        # Note: This would need to be implemented in the memory manager
        return MemoryResponse(
            success=True,
            message=f"Memory cleared for session {session_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear memory: {str(e)}")

# Asynchronous Memory APIs (Performance Optimized)
@app.post("/api/memory/save-async", tags=["Memory", "Async"])
async def save_memory_async(memory_data: MemoryAdd):
    """
    Queue memory save operation asynchronously (non-blocking)
    Resolves UI blocking issues - returns immediately with task_id
    Performance improvement: Eliminates 200-500ms synchronous delays
    """
    try:
        # Initialize async queue if needed
        if not async_memory_queue.mem0_client:
            memory_manager = await get_memory_manager()
            await async_memory_queue.initialize(memory_manager)

        # Queue the save operation (non-blocking)
        task_id = await async_memory_queue.queue_memory_save(
            memory_data.session_id,
            memory_data.messages
        )

        return {
            "success": True,
            "task_id": task_id,
            "status": "queued",
            "message": "Memory save queued for background processing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue memory save: {str(e)}")

@app.post("/api/memory/query-async", tags=["Memory", "Async"])
async def query_memory_async(query_data: MemoryQuery):
    """
    Queue memory query operation asynchronously (non-blocking)
    Returns task_id immediately for status tracking
    """
    try:
        # Initialize async queue if needed
        if not async_memory_queue.mem0_client:
            memory_manager = await get_memory_manager()
            await async_memory_queue.initialize(memory_manager)

        # Queue the query operation (non-blocking)
        task_id = await async_memory_queue.queue_memory_query(
            query_data.session_id,
            query_data.query
        )

        return {
            "success": True,
            "task_id": task_id,
            "status": "queued",
            "message": "Memory query queued for background processing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue memory query: {str(e)}")

@app.get("/api/memory/task/{task_id}", tags=["Memory", "Async"])
async def get_memory_task_status(task_id: str):
    """
    Get status and result of asynchronous memory operation
    Use this to check if queued operations are complete
    """
    try:
        task_status = await async_memory_queue.get_task_status(task_id)

        if not task_status:
            raise HTTPException(status_code=404, detail="Task not found")

        return {
            "success": True,
            "task": task_status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")

# Token Usage APIs
@app.get("/api/tokens/usage/{session_id}", response_model=TokenUsageResponse, tags=["Tokens"])
async def get_token_usage(session_id: str):
    """Get current token usage for a session"""
    # Check session state first (persists even when WebSocket fails)
    if session_id in session_states:
        session_state = session_states[session_id]
        session_state.last_activity = datetime.now()

        # If session has error, return error info
        if session_state.status in ["error", "quota_exceeded"]:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": session_state.status,
                    "message": session_state.error_message or "Service temporarily unavailable",
                    "session_id": session_id
                }
            )

        # Return session state data
        return TokenUsageResponse(
            total_tokens=session_state.token_count,
            model=session_state.model,
            limits={"input_tokens": 1000000, "output_tokens": 8192},  # Default limits
            timestamp=time.time()
        )

    # Fallback to active connection if available
    if session_id in connections:
        connection = connections[session_id]
        return TokenUsageResponse(
            total_tokens=connection.token_count,
            model=connection.model,
            limits=connection.get_model_limits(),
            timestamp=time.time()
        )

    # Session not found at all
    raise HTTPException(status_code=404, detail="Session not found")

# Session Management APIs
@app.get("/api/sessions/stats", response_model=SessionStats, tags=["Sessions"])
async def get_session_stats():
    """Get session statistics for dashboard (database + current session)"""
    from datetime import datetime

    # Load historical data from database
    db_stats = load_database_stats()

    now = datetime.now()
    today = now.date()

    unique_sessions = set()
    today_sessions = 0
    total_duration = 0
    session_count = 0
    total_messages = 0

    # Count active sessions and calculate durations
    for session_id, connection in connections.items():
        unique_sessions.add(session_id)

        if hasattr(connection, 'session_start_time') and connection.session_start_time:
            if connection.session_start_time.date() == today:
                today_sessions += 1
            # Calculate duration from session start time
            duration = (now - connection.session_start_time).total_seconds()
            total_duration += duration
            session_count += 1
        else:
            # Fallback: assume active sessions are from today
            today_sessions += 1
            # Estimate duration (assume 5 minutes for active sessions without start time)
            total_duration += 300  # 5 minutes
            session_count += 1

        # Count messages for ACTIVE sessions too!
        if connection.token_count > 0:
            if "native-audio" in connection.model:
                avg_tokens_per_message = 100
            else:
                avg_tokens_per_message = 50

            estimated_messages = max(1, connection.token_count // avg_tokens_per_message)
            total_messages += estimated_messages

    # Count historical sessions
    for session_id, state in session_states.items():
        if session_id not in connections:  # Don't double count active sessions
            unique_sessions.add(session_id)

            if state.created_at.date() == today:
                today_sessions += 1

            duration = (state.last_activity - state.created_at).total_seconds()
            # Cap duration at 24 hours to prevent unrealistic values
            duration = min(duration, 24 * 3600)  # Max 24 hours
            total_duration += duration
            session_count += 1

            if state.token_count > 0:
                # Different models have different token-to-message ratios
                if "native-audio" in state.model:
                    # Native audio models tend to use more tokens per message
                    avg_tokens_per_message = 100
                else:
                    # Half-cascade models use fewer tokens per message
                    avg_tokens_per_message = 50

                estimated_messages = max(1, state.token_count // avg_tokens_per_message)
                total_messages += estimated_messages

    # Calculate average session duration
    if session_count > 0:
        avg_duration = int(total_duration / session_count)
        # Ensure reasonable bounds (between 10 seconds and 2 hours)
        avg_duration = max(10, min(avg_duration, 7200))
    else:
        avg_duration = 0

    total_sessions_count = max(db_stats["total_sessions"], len(unique_sessions))

    # Combine database + session data
    return SessionStats(
        totalSessions=total_sessions_count,
        todaySessions=today_sessions,
        averageSessionDuration=avg_duration,
        totalMessages=total_messages
    )

@app.get("/api/sessions", tags=["Sessions"])
async def list_active_sessions():
    """List all active WebSocket sessions and session states"""
    sessions = []

    # Add active WebSocket connections
    for session_id, connection in connections.items():
        sessions.append({
            "session_id": session_id,
            "active": True,
            "model": connection.model,
            "token_count": connection.token_count,
            "status": "active"
        })

    # Add session states (including failed/disconnected sessions)
    for session_id, state in session_states.items():
        if session_id not in connections:  # Don't duplicate active sessions
            sessions.append({
                "session_id": session_id,
                "active": False,
                "model": state.model,
                "token_count": state.token_count,
                "status": state.status,
                "error_message": state.error_message,
                "last_activity": state.last_activity.isoformat()
            })

    return {"sessions": sessions, "count": len(sessions)}

@app.get("/api/sessions/{session_id}/status", tags=["Sessions"])
async def get_session_status(session_id: str):
    """Get detailed status of a specific session"""
    if session_id not in session_states:
        raise HTTPException(status_code=404, detail="Session not found")

    state = session_states[session_id]
    return {
        "session_id": session_id,
        "status": state.status,
        "error_message": state.error_message,
        "model": state.model,
        "token_count": state.token_count,
        "created_at": state.created_at.isoformat(),
        "last_activity": state.last_activity.isoformat(),
        "websocket_active": session_id in connections
    }

@app.get("/api/sessions/{session_id}", response_model=SessionInfo, tags=["Sessions"])
async def get_session_info(session_id: str):
    """Get information about a specific session"""
    if session_id not in connections:
        raise HTTPException(status_code=404, detail="Session not found")

    connection = connections[session_id]
    return SessionInfo(
        session_id=session_id,
        active=True,
        model=connection.model,
        token_count=connection.token_count
    )

@app.get("/api/tokens/stats", response_model=TokenStats, tags=["Tokens"])
async def get_token_stats():
    """Get token usage statistics (database + current session)"""
    from datetime import datetime, timedelta

    # Load historical data from database
    db_stats = load_database_stats()

    # Get current session data
    now = datetime.now()
    today = now.date()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    session_tokens = today_tokens = weekly_tokens = monthly_tokens = 0

    for connection in connections.values():
        session_tokens += connection.token_count
        today_tokens += connection.token_count
        weekly_tokens += connection.token_count
        monthly_tokens += connection.token_count

    for session_id, state in session_states.items():
        if session_id not in connections:
            session_tokens += state.token_count
            session_date = state.created_at.date()
            if session_date == today:
                today_tokens += state.token_count
            if state.created_at >= week_ago:
                weekly_tokens += state.token_count
            if state.created_at >= month_ago:
                monthly_tokens += state.token_count

    # 🚨 CRITICAL FIX: Don't double-count tokens (DB already contains session data)
    return TokenStats(
        totalTokens=db_stats["total_tokens"],  # Remove + session_tokens to prevent double counting
        todayTokens=today_tokens,
        weeklyTokens=weekly_tokens,
        monthlyTokens=monthly_tokens,
        limit=1000000
    )

@app.get("/api/dashboard/activities", tags=["Sessions"])
async def get_recent_activities():
    """Get recent activities for dashboard (database + current session)"""
    # Load historical activities from database
    db_stats = load_database_stats()
    activities = db_stats["activities"][:10]  # Get top 10 from database

    # Add recent sessions as activities
    all_sessions = []

    # Add active sessions
    for session_id, connection in connections.items():
        all_sessions.append({
            "session_id": session_id,
            "tokens": connection.token_count,
            "model": connection.model,
            "timestamp": datetime.now(),  # Active sessions
            "status": "active"
        })

    # Add session history
    for session_id, state in session_states.items():
        if session_id not in connections:
            all_sessions.append({
                "session_id": session_id,
                "tokens": state.token_count,
                "model": state.model,
                "timestamp": state.last_activity,
                "status": state.status
            })

    # Sort by timestamp and take the 10 most recent
    all_sessions.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_sessions = all_sessions[:10]

    # Convert to activity format
    for session in recent_sessions:
        mode = "audio"  # Default mode
        if "video" in session["model"].lower():
            mode = "video"
        elif "screen" in session["model"].lower():
            mode = "screen"

        description = f"{mode.title()} session"
        if session["status"] == "active":
            description += " (active)"
        else:
            description += " completed"

        # Add current session activities to the list
        activities.append({
            "type": mode,
            "description": description,
            "tokens_used": session["tokens"],
            "timestamp": session["timestamp"].isoformat(),
            "mode": mode
        })

    # Combine database activities + current session activities
    # Sort by timestamp and take the most recent 20
    all_activities = sorted(activities, key=lambda x: x["timestamp"], reverse=True)[:20]

    return {"activities": all_activities}

# Admin Model Configuration APIs
@app.get("/api/admin/models", tags=["Admin"])
async def get_available_models():
    """Get all available models (admin only)"""
    return {"models": available_models}

@app.post("/api/admin/models", tags=["Admin"])
async def update_model_config(model_config: ModelConfig):
    """Update model configuration (admin only)"""
    global available_models

    # Find and update existing model or add new one
    model_found = False
    for i, model in enumerate(available_models):
        if model["id"] == model_config.id:
            available_models[i] = model_config.model_dump()
            model_found = True
            break

    if not model_found:
        available_models.append(model_config.model_dump())

    return {"success": True, "message": "Model configuration updated"}

@app.get("/api/admin/users/{user_id}/models", tags=["Admin"])
async def get_user_model_access(user_id: str):
    """Get model access configuration for a specific user (admin only)"""
    user_access = user_model_access.get(user_id, [])

    # If user has no specific configuration, return all enabled models as accessible
    if not user_access:
        user_access = [
            {
                "user_id": user_id,
                "model_id": model["id"],
                "enabled": model["enabled"],
                "is_default": model["recommended"]
            }
            for model in available_models
        ]

    return {"user_id": user_id, "model_access": user_access}

@app.post("/api/admin/users/{user_id}/models", tags=["Admin"])
async def update_user_model_access(user_id: str, model_access: List[UserModelAccess]):
    """Update model access for a specific user (admin only)"""
    global user_model_access

    # Validate that only one model can be default
    default_models = [access for access in model_access if access.is_default]
    if len(default_models) > 1:
        raise HTTPException(status_code=400, detail="Only one model can be set as default per user")

    user_model_access[user_id] = [access.model_dump() for access in model_access]

    return {"success": True, "message": f"Model access updated for user {user_id}"}

# User Settings APIs
@app.get("/api/users/{user_id}/settings", tags=["Users"])
async def get_user_settings(user_id: str):
    """Get user settings"""
    settings = user_settings.get(user_id, {
        "user_id": user_id,
        "voice": "Puck",
        "language": "auto",
        "enable_proactive_audio": False,
        "enable_affective_dialog": False,
        "enable_vad": True,
        "enable_google_search": True
    })

    return settings

@app.post("/api/users/{user_id}/settings", tags=["Users"])
async def update_user_settings(user_id: str, settings: UserSettings):
    """Update user settings"""
    global user_settings

    user_settings[user_id] = settings.model_dump()

    return {"success": True, "message": "User settings updated"}

@app.get("/api/users/{user_id}/available-models", tags=["Users"])
async def get_user_available_models(user_id: str):
    """Get models available to a specific user"""
    user_access = user_model_access.get(user_id, [])

    # If user has no specific configuration, return all enabled models
    if not user_access:
        available_to_user = [model for model in available_models if model["enabled"]]
    else:
        # Filter models based on user access configuration
        accessible_model_ids = [access["model_id"] for access in user_access if access["enabled"]]
        available_to_user = [model for model in available_models if model["id"] in accessible_model_ids]

    # Find default model for user
    default_model = None
    if user_access:
        default_access = next((access for access in user_access if access["is_default"]), None)
        if default_access:
            default_model = default_access["model_id"]

    if not default_model and available_to_user:
        # Use first recommended model as default, or first available model
        recommended_models = [model for model in available_to_user if model.get("recommended", False)]
        default_model = recommended_models[0]["id"] if recommended_models else available_to_user[0]["id"]

    return {
        "models": available_to_user,
        "default_model": default_model
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)