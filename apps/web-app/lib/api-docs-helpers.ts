import { z } from "zod";
import { 
  zodToOpenApiSchema, 
  zodToOpenApiParameter, 
  zodToOpenApiRequestBody, 
  zodToOpenApiResponse,
  commonResponses 
} from "./zod-to-openapi";

/**
 * Helper to generate complete OpenAPI documentation for an API route
 */
export interface ApiRouteDocumentation {
  summary: string;
  description: string;
  tags: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: Array<{
    name: string;
    in: "query" | "path" | "header";
    required?: boolean;
    description?: string;
    schema: any;
  }>;
  requestBody?: {
    description: string;
    required: boolean;
    content: Record<string, { schema: any }>;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, { schema: any }>;
  }>;
}

/**
 * Generate JSDoc comment for Swagger from route documentation
 */
export function generateSwaggerJSDoc(
  path: string,
  method: string,
  docs: ApiRouteDocumentation
): string {
  const lines = [
    "/**",
    " * @swagger",
    ` * ${path}:`,
    ` *   ${method.toLowerCase()}:`,
    ` *     summary: ${docs.summary}`,
    ` *     description: ${docs.description}`,
  ];

  // Add tags
  if (docs.tags.length > 0) {
    lines.push(" *     tags:");
    docs.tags.forEach(tag => {
      lines.push(` *       - ${tag}`);
    });
  }

  // Add security
  if (docs.security) {
    lines.push(" *     security:");
    docs.security.forEach(sec => {
      Object.entries(sec).forEach(([key, value]) => {
        lines.push(` *       - ${key}: [${value.join(", ")}]`);
      });
    });
  }

  // Add parameters
  if (docs.parameters && docs.parameters.length > 0) {
    lines.push(" *     parameters:");
    docs.parameters.forEach(param => {
      lines.push(` *       - in: ${param.in}`);
      lines.push(` *         name: ${param.name}`);
      if (param.required) lines.push(` *         required: ${param.required}`);
      if (param.description) lines.push(` *         description: ${param.description}`);
      lines.push(" *         schema:");
      lines.push(` *           type: ${param.schema.type || "string"}`);
      if (param.schema.example) lines.push(` *           example: "${param.schema.example}"`);
    });
  }

  // Add request body
  if (docs.requestBody) {
    lines.push(" *     requestBody:");
    lines.push(` *       required: ${docs.requestBody.required}`);
    lines.push(` *       description: ${docs.requestBody.description}`);
    lines.push(" *       content:");
    Object.entries(docs.requestBody.content).forEach(([contentType, content]) => {
      lines.push(` *         ${contentType}:`);
      lines.push(" *           schema:");
      lines.push(` *             type: ${content.schema.type || "object"}`);
    });
  }

  // Add responses
  lines.push(" *     responses:");
  Object.entries(docs.responses).forEach(([status, response]) => {
    lines.push(` *       ${status}:`);
    lines.push(` *         description: ${response.description}`);
    if (response.content) {
      lines.push(" *         content:");
      Object.entries(response.content).forEach(([contentType, content]) => {
        lines.push(` *           ${contentType}:`);
        lines.push(" *             schema:");
        lines.push(` *               type: ${content.schema.type || "object"}`);
        if (content.schema.example) {
          lines.push(` *               example: "${content.schema.example}"`);
        }
      });
    }
  });

  lines.push(" */");
  return lines.join("\n");
}

/**
 * Common documentation templates for different types of endpoints
 */
export const docTemplates = {
  userManagement: {
    tags: ["User Management"],
    security: [{ SessionAuth: [] }],
  },
  authentication: {
    tags: ["Authentication"],
    security: [],
  },
  webhooks: {
    tags: ["Webhooks"],
    security: [],
  },
  utilities: {
    tags: ["Utilities"],
    security: [],
  },
};

/**
 * Helper to create documentation for CRUD operations
 */
export function createCrudDocs(
  entityName: string,
  schema?: z.ZodType<any>
): Record<string, ApiRouteDocumentation> {
  const entityLower = entityName.toLowerCase();
  const entityTitle = entityName.charAt(0).toUpperCase() + entityName.slice(1);

  return {
    get: {
      summary: `Get ${entityLower}`,
      description: `Retrieve ${entityLower} information`,
      tags: ["User Management"],
      security: [{ SessionAuth: [] }],
      responses: {
        200: {
          description: `${entityTitle} retrieved successfully`,
          content: {
            "application/json": {
              schema: schema ? zodToOpenApiSchema(schema) : { type: "object" },
            },
          },
        },
        ...commonResponses,
      },
    },
    post: {
      summary: `Create ${entityLower}`,
      description: `Create a new ${entityLower}`,
      tags: ["User Management"],
      security: [{ SessionAuth: [] }],
      requestBody: schema ? zodToOpenApiRequestBody(schema, "application/json", `${entityTitle} data`) : undefined,
      responses: {
        201: {
          description: `${entityTitle} created successfully`,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        ...commonResponses,
      },
    },
    put: {
      summary: `Update ${entityLower}`,
      description: `Update existing ${entityLower}`,
      tags: ["User Management"],
      security: [{ SessionAuth: [] }],
      requestBody: schema ? zodToOpenApiRequestBody(schema, "application/json", `Updated ${entityLower} data`) : undefined,
      responses: {
        200: {
          description: `${entityTitle} updated successfully`,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        ...commonResponses,
      },
    },
    delete: {
      summary: `Delete ${entityLower}`,
      description: `Delete ${entityLower}`,
      tags: ["User Management"],
      security: [{ SessionAuth: [] }],
      responses: {
        200: {
          description: `${entityTitle} deleted successfully`,
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
          },
        },
        ...commonResponses,
      },
    },
  };
}
