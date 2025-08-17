from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
import time
from dotenv import load_dotenv
from websockets import connect
from typing import Dict

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

class GeminiConnection:
    def __init__(self, model="gemini-live-2.5-flash-preview"):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = model
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.config = None
        self.token_count = 0
        self.session_start_time = None

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
                            "text": self.config.get("systemPrompt", "You are a helpful assistant.")
                        }
                    ]
                }
            }
        }

        # Add advanced features if enabled
        # Note: Most advanced features are only available in native audio models
        # For half-cascade models, we focus on basic functionality

        # VAD configuration (not supported in current API version)
        # Will be implemented when v1alpha API is available

        # Transcription
        if self.config.get("enableTranscription", False):
            setup_message["setup"]["generation_config"]["input_audio_transcription"] = {}
            setup_message["setup"]["generation_config"]["output_audio_transcription"] = {}

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
        """Send audio data to Gemini"""
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
        gemini = GeminiConnection()
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

                    # Forward audio data to client
                    try:
                        parts = response["serverContent"]["modelTurn"]["parts"]
                        for p in parts:
                            # Check connection state before each send
                            if websocket.client_state.value == 3:
                                return
                                
                            if "inlineData" in p:
                                audio_data = p["inlineData"]["data"]
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_data
                                })
                            elif "text" in p:
                                print(f"Received text: {p['text']}")
                                await websocket.send_json({
                                    "type": "text",
                                    "data": p["text"]
                                })
                    except KeyError:
                        pass

                    # Handle turn completion
                    try:
                        if response["serverContent"]["turnComplete"]:
                            await websocket.send_json({
                                "type": "turn_complete",
                                "data": True
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
    dummy_connection = GeminiConnection(model_name)
    limits = dummy_connection.get_model_limits()
    return {
        "model": model_name,
        "limits": limits,
        "timestamp": time.time()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)