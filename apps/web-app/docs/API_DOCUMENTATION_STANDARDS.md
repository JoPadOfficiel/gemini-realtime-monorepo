# API Documentation Standards

This document outlines the standards and best practices for documenting APIs in this Next.js project using OpenAPI/Swagger.

## Overview

Our API documentation system automatically generates comprehensive OpenAPI 3.0 specifications from JSDoc comments in API route files. This ensures that documentation stays in sync with the actual implementation.

## Documentation Requirements

### 1. JSDoc Comments

Every API route **MUST** include comprehensive JSDoc comments with the following structure:

```javascript
/**
 * @swagger
 * /api/endpoint:
 *   method:
 *     summary: Brief description of what the endpoint does
 *     description: Detailed description of the endpoint functionality
 *     tags:
 *       - Category Name
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query|path|header
 *         name: parameterName
 *         required: true|false
 *         description: Parameter description
 *         schema:
 *           type: string|number|boolean|array|object
 *           example: "example value"
 *     requestBody:
 *       required: true|false
 *       description: Request body description
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Success response description
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
```

### 2. Required Fields

Every endpoint documentation **MUST** include:

- **summary**: One-line description (max 50 characters)
- **description**: Detailed explanation of functionality
- **tags**: Categorization for grouping endpoints
- **responses**: At least success (200) and error responses

### 3. Optional but Recommended Fields

- **security**: Authentication requirements
- **parameters**: Query, path, or header parameters
- **requestBody**: For POST, PUT, PATCH requests
- **examples**: Request/response examples

## Tagging Standards

Use these predefined tags to categorize endpoints:

- **Authentication**: Login, logout, session management
- **User Management**: User profile, account operations
- **Webhooks**: External service webhooks
- **Utilities**: Helper endpoints (OG images, health checks)

## Schema Standards

### 1. Zod Integration

When using Zod schemas for validation, leverage the automatic schema generation:

```typescript
import { z } from 'zod';
import { zodToOpenApiSchema } from '@/lib/zod-to-openapi';

const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// The schema will be automatically converted to OpenAPI format
```

### 2. Schema Naming

- Use PascalCase for schema names
- Be descriptive and specific
- Include the purpose: `UserCreateRequest`, `UserResponse`, `ErrorResponse`

### 3. Common Schemas

Reuse these predefined schemas when applicable:

- `Error`: Standard error response
- `User`: User object
- `SuccessResponse`: Generic success response

## Response Standards

### 1. HTTP Status Codes

Use appropriate HTTP status codes:

- **200**: Success (GET, PUT, PATCH)
- **201**: Created (POST)
- **204**: No Content (DELETE)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

### 2. Error Response Format

All error responses should follow this structure:

```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### 3. Success Response Format

Success responses should be consistent:

```json
{
  "message": "Operation completed successfully",
  "data": {} // The actual response data
}
```

## Security Documentation

### 1. Authentication Methods

Document the authentication method used:

```yaml
security:
  - SessionAuth: []  # For session-based auth
  - BearerAuth: []   # For JWT tokens
```

### 2. Protected Endpoints

All protected endpoints must include security requirements in their documentation.

## Examples and Testing

### 1. Provide Examples

Include realistic examples for:
- Request parameters
- Request bodies
- Response bodies

### 2. Test Data

Use consistent test data across examples:
- User IDs: Use UUIDs
- Emails: Use example.com domain
- Names: Use realistic but generic names

## Validation and Quality Assurance

### 1. Automated Validation

The documentation is automatically validated on:
- Every commit (pre-commit hook)
- Pull requests (GitHub Actions)
- Builds (CI/CD pipeline)

### 2. Manual Review Checklist

Before submitting API changes, ensure:

- [ ] All endpoints have complete JSDoc documentation
- [ ] Examples are provided and realistic
- [ ] Error responses are documented
- [ ] Security requirements are specified
- [ ] Tags are appropriate and consistent
- [ ] Schemas are properly referenced

### 3. Documentation Testing

Test the generated documentation by:
- Viewing the Swagger UI at `/docs`
- Trying the "Try it out" functionality
- Verifying examples work correctly

## Maintenance

### 1. Regular Updates

- Update documentation when API changes
- Review and improve descriptions regularly
- Keep examples current and relevant

### 2. Version Management

- Document breaking changes
- Maintain changelog for API versions
- Use semantic versioning for API releases

## Tools and Scripts

### Available Commands

```bash
# Generate OpenAPI specification
pnpm run docs:generate

# Validate OpenAPI specification
pnpm run docs:validate

# Generate with markdown output
pnpm run docs:validate --markdown

# Development with auto-regeneration
pnpm run docs:dev

# Watch for changes
pnpm run docs:watch
```

### File Locations

- **OpenAPI Spec**: `docs/openapi.json`
- **YAML Spec**: `docs/openapi.yaml`
- **Markdown Docs**: `docs/API.md`
- **Swagger Config**: `lib/swagger.ts`
- **Schema Helpers**: `lib/zod-to-openapi.ts`

## Best Practices

1. **Write documentation first**: Consider documentation-driven development
2. **Keep it simple**: Use clear, concise language
3. **Be consistent**: Follow the established patterns
4. **Include context**: Explain why, not just what
5. **Test thoroughly**: Verify examples work in practice
6. **Update promptly**: Keep documentation in sync with code changes

## Getting Help

- Check existing API routes for examples
- Review the generated Swagger UI for formatting
- Consult the OpenAPI 3.0 specification for advanced features
- Ask the team for review and feedback

---

*This document is automatically updated when API documentation standards change.*
