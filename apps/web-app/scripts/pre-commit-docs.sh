#!/bin/bash

# Pre-commit hook to ensure OpenAPI documentation is up to date

set -e

echo "🔍 Checking OpenAPI documentation..."

# Check if API routes or validation files have been modified
API_FILES_CHANGED=$(git diff --cached --name-only | grep -E "(app/api/|lib/validations/|lib/swagger\.ts)" || true)

if [ -n "$API_FILES_CHANGED" ]; then
    echo "📝 API-related files have been modified:"
    echo "$API_FILES_CHANGED"
    
    echo "🔄 Regenerating OpenAPI documentation..."
    
    # Generate the OpenAPI specification
    npm run docs:generate
    
    # Validate the specification
    npm run docs:validate
    
    # Check if the generated files have changes
    DOCS_CHANGED=$(git diff --name-only docs/ || true)
    
    if [ -n "$DOCS_CHANGED" ]; then
        echo "📄 Documentation files have been updated:"
        echo "$DOCS_CHANGED"
        
        # Add the updated documentation files to the commit
        git add docs/
        
        echo "✅ Documentation has been updated and added to the commit"
    else
        echo "✅ Documentation is already up to date"
    fi
else
    echo "✅ No API-related files modified, skipping documentation check"
fi

echo "🎉 Pre-commit documentation check completed successfully!"
