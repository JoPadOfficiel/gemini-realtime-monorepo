# Gemini Live Backend API

A high-performance FastAPI backend that provides real-time multimodal AI conversations using Google's Gemini Live API. This backend serves as the core engine for the Gemini Realtime Monorepo, handling WebSocket connections, memory management, and session persistence.

## Overview

This backend application enables real-time communication with Google's Gemini Live API, supporting voice, text, and image interactions. It's designed to handle multiple concurrent users with persistent memory and comprehensive session management.

### Key Features

- **🔄 Real-time Communication**: WebSocket connections for live audio/text/image streaming
- **🧠 Memory Management**: Long-term conversation memory using Mem0 and PostgreSQL
- **👥 Multi-user Sessions**: Concurrent session handling with user isolation
- **📊 Usage Tracking**: Comprehensive token and cost monitoring
- **⚡ High Performance**: Asynchronous operations with FastAPI
- **📚 Auto Documentation**: OpenAPI/Swagger documentation generation
- **🔒 Security**: CORS configuration and secure WebSocket handling

## Architecture

```
backend/
├── main.py                 # FastAPI application entry point
├── websocket_handler.py    # WebSocket connection management
├── memory_manager.py       # Mem0 integration for conversation memory
├── session_manager.py      # User session handling
├── models/                 # Pydantic models and schemas
├── utils/                  # Utility functions
├── tests/                  # Test suite
└── requirements.txt        # Python dependencies
```

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL database
- Google Gemini API key
- Mem0 API key (optional, for enhanced memory)

### Installation

1. **Navigate to the backend directory**
   ```bash
   cd apps/gemini-multimodal-playground/backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

5. **Configure your `.env` file**:
   ```bash
   # Required
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional (for enhanced memory)
   MEM0_API_KEY=your_mem0_api_key_here

   # Database (optional, uses in-memory if not provided)
   DATABASE_URL=postgresql://username:password@host:port/database

   # Server Configuration
   HOST=0.0.0.0
   PORT=8000
   DEBUG=true
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

6. **Start the development server**
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`.

### API Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Health & System
- `GET /health` - Health check and system status
- `GET /model-limits/{model_name}` - Get model rate limits and capabilities

### Memory Management
- `POST /api/memory/query` - Query conversation memory for context
- `POST /api/memory/add` - Add conversation to long-term memory
- `DELETE /api/memory/{session_id}` - Clear session memory
- `POST /api/memory/save-async` - Queue memory save operation
- `POST /api/memory/query-async` - Queue memory query operation
- `GET /api/memory/task/{task_id}` - Get async task status

### Session Management
- `GET /api/sessions` - List all active sessions
- `GET /api/sessions/{session_id}/status` - Get session status
- `GET /api/sessions/{session_id}` - Get detailed session information

### Token Usage & Analytics
- `GET /api/tokens/usage/{session_id}` - Get token usage statistics

### Real-time Communication
- `WS /ws/{client_id}` - WebSocket endpoint for real-time multimodal communication

## WebSocket Protocol

The WebSocket connection supports the following message types:

### Client → Server
```json
{
  "type": "audio_chunk",
  "data": "base64_encoded_audio",
  "session_id": "unique_session_id"
}
```

```json
{
  "type": "text_message",
  "content": "User message text",
  "session_id": "unique_session_id"
}
```

### Server → Client
```json
{
  "type": "audio_response",
  "data": "base64_encoded_audio",
  "session_id": "unique_session_id"
}
```

```json
{
  "type": "text_response",
  "content": "AI response text",
  "session_id": "unique_session_id"
}
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=. --cov-report=html
```

### Code Quality

```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

### Environment Variables

See [.env.example](.env.example) for a complete list of configuration options.

## Production Deployment

### Docker Deployment

```bash
# Build image
docker build -t gemini-backend .

# Run container
docker run -p 8000:8000 --env-file .env gemini-backend
```

### VPS Deployment

For detailed production deployment instructions, see the [Deployment Guide](../../../docs/DEPLOYMENT.md).

## Technology Stack

- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
- **[WebSockets](https://websockets.readthedocs.io/)** - Real-time communication
- **[Google Gemini Live API](https://ai.google.dev/)** - Multimodal AI capabilities
- **[Mem0](https://mem0.ai/)** - Advanced memory management
- **[PostgreSQL](https://www.postgresql.org/)** - Persistent data storage
- **[Pydantic](https://pydantic.dev/)** - Data validation and serialization
- **[Uvicorn](https://www.uvicorn.org/)** - ASGI server

## Contributing

Please read our [Contributing Guidelines](../../../CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](../../../LICENSE) file for details.
