import { createSwaggerSpec } from "next-swagger-doc";
import { generateSchemasFromValidations } from "./zod-to-openapi";

export const getApiDocs = async () => {
  // Generate schemas from Zod validations
  const generatedSchemas = generateSchemasFromValidations();
  const spec = createSwaggerSpec({
    apiFolder: "app/api", // define api folder under app folder
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Next.js SaaS Stripe Starter API",
        version: "1.0.0",
        description: "Comprehensive API documentation for the Next.js SaaS Stripe Starter application",
        contact: {
          name: "API Support",
          email: "support@example.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: process.env.NODE_ENV === "production" 
            ? "https://your-domain.com" 
            : "http://localhost:3000",
          description: process.env.NODE_ENV === "production" 
            ? "Production server" 
            : "Development server",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT token for authentication",
          },
          SessionAuth: {
            type: "apiKey",
            in: "cookie",
            name: "next-auth.session-token",
            description: "Session-based authentication using NextAuth",
          },
        },
        schemas: {
          // Generated schemas from Zod validations
          ...generatedSchemas,
          // Common schemas
          Error: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Error message",
              },
              code: {
                type: "string",
                description: "Error code",
              },
            },
            required: ["message"],
          },
          User: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "User ID",
              },
              email: {
                type: "string",
                format: "email",
                description: "User email address",
              },
              name: {
                type: "string",
                description: "User display name",
              },
              image: {
                type: "string",
                format: "uri",
                description: "User profile image URL",
              },
              role: {
                type: "string",
                enum: ["USER", "ADMIN"],
                description: "User role",
              },
              stripeCustomerId: {
                type: "string",
                description: "Stripe customer ID",
              },
              stripeSubscriptionId: {
                type: "string",
                description: "Stripe subscription ID",
              },
              stripePriceId: {
                type: "string",
                description: "Stripe price ID",
              },
              stripeCurrentPeriodEnd: {
                type: "string",
                format: "date-time",
                description: "Current subscription period end date",
              },
            },
            required: ["id", "email"],
          },
          SuccessResponse: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              data: {
                type: "object",
                description: "Response data",
              },
            },
            required: ["message"],
          },
        },
      },
      security: [
        {
          SessionAuth: [],
        },
      ],
      tags: [
        {
          name: "Authentication",
          description: "Authentication and authorization endpoints",
        },
        {
          name: "User Management",
          description: "User profile and account management",
        },
        {
          name: "Webhooks",
          description: "External service webhooks",
        },
        {
          name: "Utilities",
          description: "Utility endpoints for various features",
        },
      ],
    },
  });
  return spec;
};
