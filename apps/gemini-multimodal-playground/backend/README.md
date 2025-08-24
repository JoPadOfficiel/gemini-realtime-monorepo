# Gemini Live Backend API

FastAPI backend for real-time multimodal AI conversations using Google's Gemini Live API.

## Features

- Real-time WebSocket communication (audio, text, image)
- Long-term memory management with PostgreSQL
- Session management with resumption capabilities
- Token usage tracking across different models
- Asynchronous operations for optimal performance
- Automatic OpenAPI documentation generation

## Production Deployment

Pour le déploiement en production avec HTTPS, voir [DEPLOYMENT.md](./DEPLOYMENT.md).

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Setup

Create `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Documentation

### Generate Documentation

```bash
# Generate OpenAPI specification
python generate_openapi.py --validate

# Generate formatted version
python generate_openapi.py --pretty --validate
```

### Documentation Files

Generated files are stored in `docs/`:
- `openapi.json` - Compact specification
- `openapi-pretty.json` - Formatted specification

## API Endpoints

### Health & Models
- `GET /health` - Health check
- `GET /model-limits/{model_name}` - Model rate limits

### Memory Management
- `POST /api/memory/query` - Query conversation memory
- `POST /api/memory/add` - Add conversation to memory
- `DELETE /api/memory/{session_id}` - Clear session memory

### Asynchronous Operations
- `POST /api/memory/save-async` - Queue memory save
- `POST /api/memory/query-async` - Queue memory query
- `GET /api/memory/task/{task_id}` - Get task status

### Token Usage
- `GET /api/tokens/usage/{session_id}` - Get token usage

### Session Management
- `GET /api/sessions` - List active sessions
- `GET /api/sessions/{session_id}/status` - Session status
- `GET /api/sessions/{session_id}` - Session info

### WebSocket
- `WS /ws/{client_id}` - Real-time communication

## Development

### Code Quality

The FastAPI application includes:
- Comprehensive type hints with Pydantic models
- Detailed endpoint descriptions and examples
- Organized API tags for better documentation structure
- Automatic request/response validation

### CI/CD

GitHub Actions workflow automatically:
- Generates OpenAPI documentation on code changes
- Validates the generated specification
- Creates artifacts for deployment

## Architecture

- **FastAPI**: Web framework with automatic OpenAPI generation
- **WebSocket**: Real-time bidirectional communication
- **PostgreSQL**: Persistent memory storage
- **Mem0**: Memory management integration
- **Pydantic**: Data validation and serialization

## Configuration

The FastAPI app is configured with:
- Comprehensive metadata (title, description, version)
- Contact and license information
- Organized tags for endpoint grouping
- CORS middleware for cross-origin requests

## File Structure

```
backend/
├── main.py                 # FastAPI application
├── generate_openapi.py     # Documentation generator
├── simple_memory.py        # Memory management
├── async_memory.py         # Async memory operations
├── init_db.py             # Database initialization
├── requirements.txt        # Python dependencies
└── docs/
    ├── openapi.json       # OpenAPI specification
    ├── openapi-pretty.json # Formatted specification
    └── README.md          # Documentation guide
```

## Makefile Justification

**Note**: The original implementation included a Makefile, but it has been removed for the following reasons:

1. **Unnecessary Complexity**: For a Python project with FastAPI, standard Python tools (pip, uvicorn, python) are sufficient
2. **Platform Dependency**: Makefiles add a dependency on make, which isn't always available on all development environments
3. **Simple Commands**: The project's commands are straightforward enough to run directly
4. **Standard Practice**: Python projects typically use setup.py, pyproject.toml, or direct command execution rather than Makefiles

Instead, use these direct commands:
- `pip install -r requirements.txt` (install dependencies)
- `python generate_openapi.py` (generate docs)
- `uvicorn main:app --reload` (start server)

This approach is simpler, more portable, and follows Python ecosystem conventions.
