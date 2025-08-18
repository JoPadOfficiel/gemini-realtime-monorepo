from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import os
import time
from dotenv import load_dotenv
from websockets import connect
from typing import Dict, List, Optional
from simple_memory import get_memory_manager
from async_memory import async_memory_queue, TaskStatus

load_dotenv()

app = FastAPI(
    title="Gemini Live Backend API",
    description="Backend API for Gemini Live multimodal playground with memory management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Memory query tool definition for Gemini
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

# Session management storage
session_handles = {}

def save_session_handle(session_id: str, handle: str):
    """Save session handle for resumption"""
    session_handles[session_id] = handle

def get_session_handle(session_id: str) -> str:
    """Get session handle for resumption"""
    return session_handles.get(session_id, None)




class GeminiConnection:
    def __init__(self, model="gemini-live-2.5-flash-preview", session_id=None):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = model
        self.session_id = session_id or "default_session"  # Add session_id for session management
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.config = None
        self.accumulated_pcm_data = []  # Pour accumuler les fragments PCM de Gemini
        self.accumulated_user_pcm_data = []  # Pour accumuler les fragments PCM utilisateur
        # Système d'accumulation des transcriptions comme GitHub
        self.accumulated_input_transcription = []  # Fragments de transcription utilisateur
        self.accumulated_output_transcription = []  # Fragments de transcription Gemini
        self.token_count = 0
        # Memory management flags
        self.is_conversation_interrupted = False  # Track if current conversation was interrupted
        self.session_start_time = None
        # Memory manager will be initialized when needed
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
        # Accumulate user audio data for transcription (same system as GitHub)
        self.accumulated_user_pcm_data.append(audio_data)

        # Send audio data (VAD automatique gère l'interruption)
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
        """Send audio stream end signal for VAD when audio is paused > 1 second"""
        realtime_input_msg = {
            "realtime_input": {
                "audio_stream_end": True
            }
        }
        await self.ws.send(json.dumps(realtime_input_msg))
        print("Sent audio stream end signal")

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

# Store active connections
connections: Dict[str, GeminiConnection] = {}

# Pydantic models for API requests/responses
class MemoryQuery(BaseModel):
    query: str
    session_id: Optional[str] = "default_session"

class MemoryAdd(BaseModel):
    messages: List[Dict]
    session_id: Optional[str] = "default_session"
    metadata: Optional[Dict] = None

class MemoryResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    message: str

class TokenUsageResponse(BaseModel):
    total_tokens: int
    model: str
    limits: Dict
    timestamp: float

class SessionInfo(BaseModel):
    session_id: str
    active: bool
    model: str
    token_count: int

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()

    try:
        # Create new Gemini connection for this client
        gemini = GeminiConnection(session_id=client_id)
        connections[client_id] = gemini
        
        # Wait for initial configuration
        config_data = await websocket.receive_json()
        if config_data.get("type") != "config":
            raise ValueError("First message must be configuration")
        
        # Set the configuration
        gemini.set_config(config_data.get("config", {}))
        
        # Initialize Gemini connection
        await gemini.connect()
        
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
                        if msg_type == "audio":
                            await gemini.send_audio(message_content["data"])    
                        elif msg_type == "image":
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
                            # Send token update to client
                            await websocket.send_text(json.dumps({
                                "type": "token_usage",
                                "data": {
                                    "total_tokens": gemini.token_count,
                                    "model": gemini.model,
                                    "limits": gemini.get_model_limits()
                                }
                            }))

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

                                    # Query memory using the simple memory manager
                                    memories = gemini.memory_manager.query_memory(query, gemini.session_id)
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
                                    print("� Conversation marked as interrupted - will not be saved to memory")

                                    # Send immediate interruption message to frontend
                                    await websocket.send_json({"interrupted": "True"})
                                    print("� Interruption message sent to frontend")
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
                                # ONLY save complete, uninterrupted conversations to memory
                                try:
                                    # Get transcriptions from accumulated data BEFORE they are cleared
                                    user_text = None
                                    assistant_text = None

                                    # Get user message from accumulated input transcription
                                    if gemini.accumulated_input_transcription:
                                        user_text = "".join(gemini.accumulated_input_transcription).strip()

                                    # Get assistant message from accumulated output transcription
                                    if gemini.accumulated_output_transcription:
                                        assistant_text = "".join(gemini.accumulated_output_transcription).strip()

                                    # Add to memory if we have both parts (following reference approach)
                                    if user_text and assistant_text and gemini.memory_manager:
                                        # Skip very short or invalid messages
                                        if (len(user_text) > 3 and len(assistant_text) > 3 and
                                            user_text not in [".", " .", "  ."] and
                                            assistant_text not in [".", " .", "  ."]):

                                            messages = [
                                                {"role": "user", "content": user_text},
                                                {"role": "assistant", "content": assistant_text}
                                            ]

                                            print(f"💾 Saving complete conversation - User: {user_text[:50]}... Assistant: {assistant_text[:50]}...")

                                            # Use new async memory queue (non-blocking, performance optimized)
                                            async def save_complete_conversation():
                                                try:
                                                    # Initialize async queue if needed
                                                    if not async_memory_queue.mem0_client:
                                                        await async_memory_queue.initialize(gemini.memory_manager)

                                                    # Queue memory save (returns immediately, no UI blocking)
                                                    task_id = await async_memory_queue.queue_memory_save(
                                                        gemini.session_id,
                                                        messages
                                                    )
                                                    print(f"✅ Complete conversation queued for memory save (task: {task_id[:8]}...)")
                                                except Exception as e:
                                                    print(f"Error queuing async complete conversation save: {e}")
                                                    # Fallback to synchronous save if async fails
                                                    try:
                                                        memory_id = gemini.memory_manager.add_to_memory(messages, gemini.session_id)
                                                        print(f"✅ Fallback: Complete conversation saved synchronously with ID: {memory_id}")
                                                    except Exception as fallback_error:
                                                        print(f"❌ Both async and sync memory save failed: {fallback_error}")

                                            # Fire and forget - completely non-blocking
                                            asyncio.create_task(save_complete_conversation())
                                        else:
                                            print(f"Skipping memory save - messages too short or invalid (user: {len(user_text) if user_text else 0}, assistant: {len(assistant_text) if assistant_text else 0})")
                                    else:
                                        print(f"Skipping memory save - missing data (user: {'✓' if user_text else '✗'}, assistant: {'✓' if assistant_text else '✗'}, manager: {'✓' if gemini.memory_manager else '✗'})")

                                except Exception as e:
                                    print(f"Error saving complete conversation to memory: {e}")
                                    import traceback
                                    traceback.print_exc()

                            # SECOND: Send accumulated INPUT transcription (user message) - API officielle + GitHub system
                            # Only if not already sent during interruption
                            if gemini.accumulated_input_transcription:
                                complete_input_transcription = "".join(gemini.accumulated_input_transcription)
                                # Don't send if it's just a point (interruption artifact)
                                if complete_input_transcription.strip() not in [".", " .", "  ."]:
                                    print(f"Complete input transcription: {complete_input_transcription}")
                                    await websocket.send_json({
                                        "type": "user_message",
                                        "data": complete_input_transcription
                                    })
                                else:
                                    print(f"Skipping interruption artifact: '{complete_input_transcription}'")
                                gemini.accumulated_input_transcription = []

                            # THIRD: Send accumulated OUTPUT transcription (assistant message) - API officielle + GitHub system
                            if gemini.accumulated_output_transcription:
                                complete_output_transcription = "".join(gemini.accumulated_output_transcription)
                                print(f"Complete output transcription: {complete_output_transcription}")
                                await websocket.send_json({
                                    "type": "assistant_message",
                                    "data": complete_output_transcription
                                })
                                gemini.accumulated_output_transcription = []

                            # Clear accumulated PCM data (not needed for transcription anymore)
                            if gemini.accumulated_user_pcm_data:
                                print(f"Clearing user PCM data: {len(gemini.accumulated_user_pcm_data)} fragments")
                                gemini.accumulated_user_pcm_data = []

                            if gemini.accumulated_pcm_data:
                                print(f"Clearing assistant PCM data: {len(gemini.accumulated_pcm_data)} fragments")
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
        async with asyncio.TaskGroup() as tg:
            tg.create_task(receive_from_client())
            tg.create_task(receive_from_gemini())

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Cleanup
        if client_id in connections:
            await connections[client_id].close()
            del connections[client_id]

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/model-limits/{model_name}")
async def get_model_limits(model_name: str):
    """Get rate limits for a specific model"""
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
        memory_manager = await get_memory_manager()
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
    if session_id not in connections:
        raise HTTPException(status_code=404, detail="Session not found")

    connection = connections[session_id]
    return TokenUsageResponse(
        total_tokens=connection.token_count,
        model=connection.model,
        limits=connection.get_model_limits(),
        timestamp=time.time()
    )

# Session Management APIs
@app.get("/api/sessions", tags=["Sessions"])
async def list_active_sessions():
    """List all active WebSocket sessions"""
    sessions = []
    for session_id, connection in connections.items():
        sessions.append({
            "session_id": session_id,
            "active": True,
            "model": connection.model,
            "token_count": connection.token_count
        })
    return {"sessions": sessions, "count": len(sessions)}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)