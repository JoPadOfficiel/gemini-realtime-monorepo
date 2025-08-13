import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

/**
 * Convert a Zod schema to OpenAPI schema format
 */
export function zodToOpenApiSchema(zodSchema: z.ZodType<any>) {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: "openApi3",
    $refStrategy: "none",
  });

  // Remove the $schema property as it's not needed in OpenAPI
  const { $schema, ...openApiSchema } = jsonSchema as any;

  return openApiSchema;
}

/**
 * Generate OpenAPI schemas from all validation schemas in the project
 */
export function generateSchemasFromValidations() {
  // Import all validation schemas
  const schemas: Record<string, any> = {};

  try {
    // User validation schemas
    const userValidations = require("@/lib/validations/user");
    if (userValidations.userNameSchema) {
      schemas.UserNameUpdate = zodToOpenApiSchema(userValidations.userNameSchema);
    }

    // Auth validation schemas
    const authValidations = require("@/lib/validations/auth");
    if (authValidations.userAuthSchema) {
      schemas.UserAuth = zodToOpenApiSchema(authValidations.userAuthSchema);
    }

    // OG validation schemas
    const ogValidations = require("@/lib/validations/og");
    if (ogValidations.ogImageSchema) {
      schemas.OGImageParams = zodToOpenApiSchema(ogValidations.ogImageSchema);
    }

    return schemas;
  } catch (error) {
    console.warn("Failed to generate schemas from validations:", error);
    return {};
  }
}

/**
 * Generate OpenAPI parameter object from Zod schema
 */
export function zodToOpenApiParameter(
  name: string,
  zodSchema: z.ZodType<any>,
  location: "query" | "path" | "header" = "query",
  required: boolean = false,
  description?: string
) {
  const schema = zodToOpenApiSchema(zodSchema);
  
  return {
    name,
    in: location,
    required,
    description: description || schema.description,
    schema,
  };
}

/**
 * Generate OpenAPI request body from Zod schema
 */
export function zodToOpenApiRequestBody(
  zodSchema: z.ZodType<any>,
  contentType: string = "application/json",
  description?: string
) {
  const schema = zodToOpenApiSchema(zodSchema);
  
  return {
    description: description || "Request body",
    required: true,
    content: {
      [contentType]: {
        schema,
      },
    },
  };
}

/**
 * Generate OpenAPI response from Zod schema
 */
export function zodToOpenApiResponse(
  zodSchema: z.ZodType<any>,
  statusCode: number = 200,
  description?: string,
  contentType: string = "application/json"
) {
  const schema = zodToOpenApiSchema(zodSchema);
  
  return {
    [statusCode]: {
      description: description || "Successful response",
      content: {
        [contentType]: {
          schema,
        },
      },
    },
  };
}

/**
 * Common response schemas
 */
export const commonResponses = {
  400: {
    description: "Bad Request",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            code: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  },
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  },
  404: {
    description: "Not Found",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  },
  500: {
    description: "Internal Server Error",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  },
};
