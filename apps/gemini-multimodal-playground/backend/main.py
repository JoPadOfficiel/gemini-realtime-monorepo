from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
import base64
import struct
import wave
import io
import aiohttp
import time
from dotenv import load_dotenv
from websockets import connect
from typing import Dict
from simple_memory import get_memory_manager

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session management storage
session_handles = {}

def save_session_handle(session_id: str, handle: str):
    """Save session handle for resumption"""
    session_handles[session_id] = handle
    print(f"Saved session handle for {session_id}: {handle}")

def get_session_handle(session_id: str) -> str:
    """Get session handle for resumption"""
    return session_handles.get(session_id, None)

# Utility functions for audio processing
def pcm_to_wav(pcm_base64: str, sample_rate: int = 24000) -> str:
    """Convert PCM base64 data to WAV format and return as base64 - GitHub method"""
    try:
        # Decode base64 PCM data
        pcm_bytes = base64.b64decode(pcm_base64)

        # Convert bytes to samples (assuming 16-bit PCM)
        samples = struct.unpack('<' + 'h' * (len(pcm_bytes) // 2), pcm_bytes)
        pcm_byte_length = len(samples) * 2  # 16-bit = 2 bytes per sample

        # Create WAV header manually like GitHub
        wav_header = bytearray(44)

        # "RIFF" chunk descriptor
        wav_header[0:4] = b'RIFF'
        # File length (header size + data size)
        struct.pack_into('<I', wav_header, 4, 36 + pcm_byte_length)
        # "WAVE" format
        wav_header[8:12] = b'WAVE'
        # "fmt " sub-chunk
        wav_header[12:16] = b'fmt '
        # Sub-chunk size
        struct.pack_into('<I', wav_header, 16, 16)
        # Audio format (PCM = 1)
        struct.pack_into('<H', wav_header, 20, 1)
        # Number of channels
        struct.pack_into('<H', wav_header, 22, 1)
        # Sample rate
        struct.pack_into('<I', wav_header, 24, sample_rate)
        # Byte rate
        struct.pack_into('<I', wav_header, 28, sample_rate * 2)
        # Block align
        struct.pack_into('<H', wav_header, 32, 2)
        # Bits per sample
        struct.pack_into('<H', wav_header, 34, 16)
        # "data" sub-chunk
        wav_header[36:40] = b'data'
        # Data size
        struct.pack_into('<I', wav_header, 40, pcm_byte_length)

        # Combine header and PCM data
        wav_data = wav_header + pcm_bytes

        # Encode to base64
        return base64.b64encode(wav_data).decode('utf-8')
    except Exception as e:
        print(f"Error converting PCM to WAV: {e}")
        return ""

async def transcribe_pcm_data(pcm_base64: str) -> str:
    """Transcribe PCM data using a simpler approach - just return empty for now"""
    try:
        # For now, let's disable transcription to avoid the error
        # We'll implement a working solution later
        print(f"Transcription disabled temporarily - PCM data length: {len(pcm_base64)}")
        return ""
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""

# Define the memory query tool (following reference implementation)
MEMORY_QUERY_TOOL = {
    "function_declarations": [
        {
            "name": "query_memory",
            "description": "Query the memory database to retrieve relevant past interactions with the user.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {
                        "type": "STRING",
                        "description": "The query string to search the memory."
                    }
                },
                "required": ["query"]
            }
        }
    ]
}

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

                    # Handle interruptions - Send immediate interruption signal to frontend
                    try:
                        if "serverContent" in response:
                            if "interrupted" in response["serverContent"]:
                                if response["serverContent"]["interrupted"]:
                                    print(f"[{time.time()}] Generation interrupted by user activity")

                                    # Save conversation to memory on interruption (this is when conversations actually end)
                                    try:
                                        print("💾 INTERRUPTION - Attempting to save conversation to memory")
                                        user_text = None
                                        assistant_text = None

                                        # Get user message from accumulated input transcription
                                        if gemini.accumulated_input_transcription:
                                            user_text = "".join(gemini.accumulated_input_transcription).strip()
                                            print(f"📝 User text from interruption: '{user_text[:50]}...'")

                                        # Get assistant message from accumulated output transcription
                                        if gemini.accumulated_output_transcription:
                                            assistant_text = "".join(gemini.accumulated_output_transcription).strip()
                                            print(f"📝 Assistant text from interruption: '{assistant_text[:50]}...'")

                                        # Add to memory if we have both parts
                                        if user_text and assistant_text and gemini.memory_manager:
                                            # Skip very short or invalid messages
                                            if (len(user_text) > 3 and len(assistant_text) > 3 and
                                                user_text not in [".", " .", "  ."] and
                                                assistant_text not in [".", " .", "  ."]):

                                                messages = [
                                                    {"role": "user", "content": user_text},
                                                    {"role": "assistant", "content": assistant_text}
                                                ]

                                                print(f"💾 Saving interrupted conversation - User: {user_text[:30]}... Assistant: {assistant_text[:30]}...")

                                                # Save memory asynchronously to avoid blocking interruption
                                                async def save_memory_async():
                                                    try:
                                                        memory_id = gemini.memory_manager.add_to_memory(messages, gemini.session_id)
                                                        if memory_id:
                                                            print(f"✅ Interrupted conversation saved to memory with ID: {memory_id}")
                                                        else:
                                                            print("⚠️ Failed to save interrupted conversation to memory")
                                                    except Exception as e:
                                                        print(f"Error in async memory save: {e}")

                                                # Fire and forget - don't wait for memory save
                                                asyncio.create_task(save_memory_async())
                                            else:
                                                print(f"Skipping interrupted memory save - messages too short (user: {len(user_text) if user_text else 0}, assistant: {len(assistant_text) if assistant_text else 0})")
                                        else:
                                            print(f"Skipping interrupted memory save - missing data (user: {'✓' if user_text else '✗'}, assistant: {'✓' if assistant_text else '✗'}, manager: {'✓' if gemini.memory_manager else '✗'})")

                                    except Exception as e:
                                        print(f"Error saving interrupted conversation to memory: {e}")
                                        import traceback
                                        traceback.print_exc()

                                    # NOTE: We DON'T send interruption signals to Gemini
                                    # Gemini sends US the interruption, we just handle it
                                    print("🛑 INTERRUPTION DETECTED - Processing immediately")

                                    # Send interruption message to frontend
                                    interrupt_message = {
                                        "type": "interruption",
                                        "interrupted": True
                                    }
                                    print(f"🔴 SENDING INTERRUPTION MESSAGE TO FRONTEND: {interrupt_message}")
                                    await websocket.send_json(interrupt_message)
                                    print("✅ Interruption message sent successfully")
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
                            # FIRST: Save conversation to memory BEFORE clearing transcriptions
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

                                        print(f"💾 Saving conversation - User: {user_text[:50]}... Assistant: {assistant_text[:50]}...")
                                        memory_id = gemini.memory_manager.add_to_memory(messages, gemini.session_id)

                                        if memory_id:
                                            print(f"✅ Conversation saved to memory with ID: {memory_id}")
                                        else:
                                            print("⚠️ Failed to save conversation to memory")
                                    else:
                                        print(f"Skipping memory save - messages too short or invalid (user: {len(user_text) if user_text else 0}, assistant: {len(assistant_text) if assistant_text else 0})")
                                else:
                                    print(f"Skipping memory save - missing data (user: {'✓' if user_text else '✗'}, assistant: {'✓' if assistant_text else '✗'}, manager: {'✓' if gemini.memory_manager else '✗'})")

                            except Exception as e:
                                print(f"Error saving conversation to memory: {e}")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)