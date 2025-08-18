#!/usr/bin/env python3
"""
OpenAPI Documentation Generator for Gemini Live Backend API

Generates OpenAPI JSON specification from the FastAPI application.

Usage:
    python generate_openapi.py [--output docs/openapi.json] [--pretty]
"""

import argparse
import json
import sys
import os
from pathlib import Path

def generate_openapi_spec(output_file: str = "docs/openapi.json", pretty: bool = False):
    """Generate OpenAPI specification from FastAPI app"""
    try:
        from main import app

        print("Generating OpenAPI specification...")

        # Generate the OpenAPI schema
        openapi_schema = app.openapi()

        # Ensure output directory exists
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            if pretty:
                json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
            else:
                json.dump(openapi_schema, f, ensure_ascii=False)

        # Report results
        file_size_kb = os.path.getsize(output_file) / 1024
        endpoint_count = len(openapi_schema.get('paths', {}))

        print(f"SUCCESS: OpenAPI specification generated")
        print(f"File: {output_file}")
        print(f"Size: {file_size_kb:.1f} KB")
        print(f"Endpoints: {endpoint_count}")

        return True

    except ImportError as e:
        print(f"ERROR: Cannot import FastAPI app - {e}")
        print("Ensure you're in the backend directory and dependencies are installed")
        return False

    except Exception as e:
        print(f"ERROR: Failed to generate OpenAPI specification - {e}")
        return False

def validate_openapi_spec(file_path: str):
    """Validate the generated OpenAPI specification"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            spec = json.load(f)

        # Basic validation
        required_fields = ['openapi', 'info', 'paths']
        missing_fields = [field for field in required_fields if field not in spec]

        if missing_fields:
            print(f"WARNING: Missing required fields: {missing_fields}")
            return False

        print("SUCCESS: OpenAPI specification validation passed")
        return True

    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON - {e}")
        return False
    except Exception as e:
        print(f"ERROR: Validation failed - {e}")
        return False

def main():
    """Main function with CLI argument parsing"""
    parser = argparse.ArgumentParser(
        description="Generate OpenAPI specification for Gemini Live Backend API"
    )

    parser.add_argument(
        '--output', '-o',
        default='docs/openapi.json',
        help='Output file path (default: docs/openapi.json)'
    )

    parser.add_argument(
        '--pretty', '-p',
        action='store_true',
        help='Format JSON with indentation'
    )

    parser.add_argument(
        '--validate', '-v',
        action='store_true',
        help='Validate the generated specification'
    )

    args = parser.parse_args()

    # Generate OpenAPI specification
    success = generate_openapi_spec(args.output, args.pretty)

    if not success:
        sys.exit(1)

    # Validate if requested
    if args.validate:
        if not validate_openapi_spec(args.output):
            sys.exit(1)

if __name__ == "__main__":
    main()
