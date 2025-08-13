# API Documentation System

This directory contains the automated OpenAPI/Swagger documentation system for the Next.js SaaS Starter project.

## 📚 Overview

Our API documentation system provides:

- **Automated OpenAPI 3.0 specification generation** from JSDoc comments
- **Interactive Swagger UI** for testing endpoints
- **Automatic schema generation** from Zod validation schemas
- **CI/CD integration** for keeping docs up-to-date
- **Multiple output formats** (JSON, YAML, Markdown)

## 🚀 Quick Start

### View Documentation

1. **Interactive Swagger UI**: Visit `/docs` in your browser
2. **OpenAPI Spec**: Available at `/api/docs`
3. **Generated Files**: Check the `docs/` directory for `openapi.json`, `openapi.yaml`, and `API.md`

### Generate Documentation

```bash
# Generate OpenAPI specification
pnpm run docs:generate

# Validate and generate markdown
pnpm run docs:validate --markdown

# Development with auto-regeneration
pnpm run docs:dev
```

## 📁 API Documentation Files

```
docs/
├── API_DOCUMENTATION_README.md        # This file
├── API_DOCUMENTATION_STANDARDS.md     # Documentation standards and guidelines
├── openapi.json                       # Generated OpenAPI 3.0 specification
├── openapi.yaml                       # Generated YAML specification
├── API.md                             # Generated markdown documentation
└── templates/
    └── api-route-template.ts          # Template for new API routes
```

## 🛠️ How It Works

### 1. JSDoc Comments

API routes are documented using JSDoc comments with Swagger annotations:

```javascript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users
 *     description: Retrieve a list of users
 *     tags:
 *       - User Management
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
export async function GET() {
  // Implementation
}
```

### 2. Automatic Schema Generation

Zod schemas are automatically converted to OpenAPI schemas:

```typescript
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// Automatically becomes OpenAPI schema
```

### 3. Build-Time Generation

The OpenAPI specification is generated during:
- Development (with file watching)
- Build process
- CI/CD pipeline
- Pre-commit hooks

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run docs:generate` | Generate OpenAPI specification |
| `pnpm run docs:validate` | Validate specification and generate markdown |
| `pnpm run docs:dev` | Development with auto-regeneration |
| `pnpm run docs:watch` | Watch for changes and regenerate |

## 🔧 Configuration

### Swagger Configuration

Main configuration is in `lib/swagger.ts`

### Schema Generation

Zod to OpenAPI conversion is handled in `lib/zod-to-openapi.ts`

## 🎯 Best Practices

### 1. Documentation Standards

- Follow the [API Documentation Standards](./API_DOCUMENTATION_STANDARDS.md)
- Use consistent tagging and naming
- Include examples and descriptions
- Document all responses and errors

### 2. Schema Design

- Use Zod for validation and automatic schema generation
- Create reusable schemas for common patterns
- Follow consistent naming conventions

### 3. Testing

- Test endpoints using the Swagger UI
- Verify examples work correctly
- Validate the generated specification

## 🔄 CI/CD Integration

### GitHub Actions

The `.github/workflows/openapi-docs.yml` workflow automatically handles documentation generation and validation.

### Pre-commit Hooks

The `scripts/pre-commit-docs.sh` script ensures documentation stays up-to-date.

## 📖 Documentation Categories

### Tags Used

- **Authentication**: Login, logout, session management
- **User Management**: User profile and account operations
- **Webhooks**: External service webhooks
- **Utilities**: Helper endpoints and utilities

### Security Schemes

- **SessionAuth**: Cookie-based authentication (NextAuth)
- **BearerAuth**: JWT token authentication

## 🚨 Troubleshooting

### Common Issues

1. **Documentation not updating**
   - Run `pnpm run docs:generate` manually
   - Check for syntax errors in JSDoc comments

2. **Validation errors**
   - Run `pnpm run docs:validate` for details
   - Check OpenAPI specification syntax

3. **Missing schemas**
   - Ensure Zod schemas are properly exported
   - Check `lib/zod-to-openapi.ts` configuration

## 📝 Contributing

When adding new API endpoints:

1. Use the template in `docs/templates/api-route-template.ts`
2. Follow the documentation standards
3. Include comprehensive JSDoc comments
4. Test the generated documentation

---

*This documentation system is automatically maintained and updated with API changes.*
