# API Documentation

This directory contains the OpenAPI documentation for the Gemini Live Backend API.

## Files

- `openapi.json` - OpenAPI 3.1 specification (compact)
- `openapi-pretty.json` - OpenAPI specification (formatted)

## Access Documentation

When the server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Generate Documentation

```bash
# Generate documentation
python generate_openapi.py --validate

# Generate formatted version
python generate_openapi.py --pretty --validate
```

## Start Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
