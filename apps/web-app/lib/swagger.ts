import { createSwaggerSpec } from "next-swagger-doc";
import { generateSchemasFromValidations } from "./zod-to-openapi";

// Function to fetch FastAPI OpenAPI spec
async function fetchFastApiSpec() {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
    const response = await fetch(`${fastApiUrl}/openapi.json`);
    if (!response.ok) {
      console.warn("FastAPI not available, skipping backend documentation");
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch FastAPI spec:", error.message);
    return null;
  }
}

// Function to merge OpenAPI specs with server selection
function mergeOpenApiSpecs(nextjsSpec: any, fastApiSpec: any) {
  if (!fastApiSpec) {
    // If FastAPI is not available, return Next.js spec with updated info
    return {
      ...nextjsSpec,
      info: {
        ...nextjsSpec.info,
        title: "Gemini Live Monorepo API Documentation",
        description: "Complete API documentation for Next.js Web App (FastAPI Backend currently unavailable)"
      }
    };
  }

  // Create unified servers list for server selection dropdown
  const unifiedServers = [
    {
      url: process.env.NODE_ENV === "production"
        ? "https://your-domain.com"
        : "http://localhost:3000",
      description: "Next.js SaaS Web App API - Frontend endpoints for authentication, user management, webhooks, and utilities"
    },
    {
      url: process.env.FASTAPI_URL || "http://localhost:8000",
      description: "Gemini Live FastAPI Backend - Real-time WebSocket, memory management, token tracking, and session handling"
    }
  ];

  // Merge all paths from both specs without prefixes
  const mergedPaths = {
    ...nextjsSpec.paths,
    ...fastApiSpec.paths
  };

  // Update Next.js endpoint tags
  Object.keys(nextjsSpec.paths || {}).forEach(path => {
    Object.keys(mergedPaths[path]).forEach(method => {
      const endpoint = mergedPaths[path][method];
      if (endpoint.tags) {
        endpoint.tags = endpoint.tags.map((tag: string) =>
          tag.startsWith('Frontend -') ? tag : `Frontend - ${tag}`
        );
      }
      // Add server info to indicate which server this endpoint belongs to
      endpoint.servers = [{
        url: process.env.NODE_ENV === "production"
          ? "https://your-domain.com"
          : "http://localhost:3000",
        description: "Next.js Web App"
      }];
    });
  });

  // Update FastAPI endpoint tags and servers
  Object.keys(fastApiSpec.paths || {}).forEach(path => {
    if (mergedPaths[path]) {
      Object.keys(fastApiSpec.paths[path]).forEach(method => {
        const endpoint = mergedPaths[path][method];
        if (endpoint.tags) {
          endpoint.tags = endpoint.tags.map((tag: string) => `Backend - ${tag}`);
        } else {
          endpoint.tags = ["Backend - API"];
        }
        // Add server info to indicate which server this endpoint belongs to
        endpoint.servers = [{
          url: process.env.FASTAPI_URL || "http://localhost:8000",
          description: "FastAPI Backend"
        }];
      });
    }
  });

  // Merge schemas with prefixes to avoid conflicts
  const mergedSchemas = {
    ...nextjsSpec.components?.schemas || {},
  };

  // Add FastAPI schemas with Backend prefix if there are conflicts
  Object.keys(fastApiSpec.components?.schemas || {}).forEach(schemaName => {
    const prefixedName = mergedSchemas[schemaName] ? `Backend${schemaName}` : schemaName;
    mergedSchemas[prefixedName] = fastApiSpec.components.schemas[schemaName];
  });

  // Merge tags
  const nextjsTags = nextjsSpec.tags || [];
  const fastApiTags = (fastApiSpec.tags || []).map((tag: any) => ({
    ...tag,
    name: `Backend - ${tag.name}`,
    description: `${tag.description} (FastAPI Backend)`
  }));

  const mergedTags = [...nextjsTags, ...fastApiTags];

  // Merge security schemes
  const mergedSecuritySchemes = {
    ...nextjsSpec.components?.securitySchemes || {},
    ...fastApiSpec.components?.securitySchemes || {}
  };

  return {
    openapi: "3.0.0",
    info: {
      title: "Gemini Live Monorepo API Documentation",
      version: "1.0.0",
      description: "Complete API documentation for both Next.js SaaS Web App and Gemini Live FastAPI Backend. Use the server selector above to switch between frontend and backend APIs.",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: unifiedServers,
    paths: mergedPaths,
    components: {
      securitySchemes: mergedSecuritySchemes,
      schemas: mergedSchemas
    },
    tags: mergedTags,
    security: [
      { SessionAuth: [] }
    ]
  };
}

export const getApiDocs = async () => {
  // Generate schemas from Zod validations
  const generatedSchemas = generateSchemasFromValidations();

  // Generate Next.js API spec
  const nextjsSpec = createSwaggerSpec({
    apiFolder: "app/api", // define api folder under app folder
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Next.js Web App API",
        version: "1.0.0",
        description: "Next.js SaaS Web Application API endpoints",
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
            ? "Next.js Production Server"
            : "Next.js Development Server",
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
          name: "Frontend - Authentication",
          description: "Next.js authentication and authorization endpoints",
        },
        {
          name: "Frontend - User Management",
          description: "Next.js user profile and account management",
        },
        {
          name: "Frontend - Webhooks",
          description: "Next.js external service webhooks",
        },
        {
          name: "Frontend - Utilities",
          description: "Next.js utility endpoints for various features",
        },
      ],
    },
  });

  // Fetch FastAPI spec and merge
  const fastApiSpec = await fetchFastApiSpec();
  const mergedSpec = mergeOpenApiSpecs(nextjsSpec, fastApiSpec);

  return mergedSpec;
};
