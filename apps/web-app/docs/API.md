# Next.js SaaS Stripe Starter API

Comprehensive API documentation for the Next.js SaaS Stripe Starter application

**Version:** 1.0.0

## Servers

- **Development server:** http://localhost:3000

## User Management

### DELETE /api/user

Permanently deletes the authenticated user's account and all associated data

**Responses:**

- **200**: User account deleted successfully
- **401**: User not authenticated or invalid session
- **500**: Internal server error during deletion

---

