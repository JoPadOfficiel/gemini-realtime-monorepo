#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate a basic OpenAPI specification
 */
async function generateOpenAPISpec() {
  try {
    console.log('🔄 Generating OpenAPI specification...');

    // Create a basic OpenAPI spec structure
    const spec = {
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
            },
            required: ["id", "email"],
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
      paths: {
        "/api/user": {
          delete: {
            summary: "Delete current user account",
            description: "Permanently deletes the authenticated user's account and all associated data",
            tags: ["User Management"],
            security: [{ SessionAuth: [] }],
            responses: {
              200: {
                description: "User account deleted successfully",
                content: {
                  "text/plain": {
                    schema: {
                      type: "string",
                      example: "User deleted successfully!"
                    }
                  }
                }
              },
              401: {
                description: "User not authenticated or invalid session",
                content: {
                  "text/plain": {
                    schema: {
                      type: "string",
                      example: "Not authenticated"
                    }
                  }
                }
              },
              500: {
                description: "Internal server error during deletion",
                content: {
                  "text/plain": {
                    schema: {
                      type: "string",
                      example: "Internal server error"
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    // Ensure the docs directory exists
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    // Write the OpenAPI spec to a file
    const specPath = path.join(docsDir, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
    
    console.log('✅ OpenAPI specification generated successfully!');
    console.log(`📄 Specification saved to: ${specPath}`);
    
    // Also generate a YAML version
    const yaml = require('js-yaml');
    const yamlPath = path.join(docsDir, 'openapi.yaml');
    fs.writeFileSync(yamlPath, yaml.dump(spec));
    console.log(`📄 YAML specification saved to: ${yamlPath}`);
    
    // Generate a summary
    const endpoints = Object.keys(spec.paths || {});
    const totalEndpoints = endpoints.reduce((count, path) => {
      return count + Object.keys(spec.paths[path]).length;
    }, 0);
    
    console.log(`📊 Summary:`);
    console.log(`   • Total paths: ${endpoints.length}`);
    console.log(`   • Total endpoints: ${totalEndpoints}`);
    console.log(`   • API version: ${spec.info?.version || 'unknown'}`);
    
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI specification:', error.message);
    process.exit(1);
  }
}

/**
 * Watch for changes and regenerate
 */
function watchMode() {
  const chokidar = require('chokidar');
  
  console.log('👀 Watching for changes in API routes and validations...');
  
  const watcher = chokidar.watch([
    'app/api/**/*.{ts,tsx,js,jsx}',
    'lib/validations/**/*.{ts,js}',
    'lib/swagger.ts'
  ], {
    ignored: /node_modules/,
    persistent: true
  });
  
  watcher.on('change', (filePath) => {
    console.log(`🔄 File changed: ${filePath}`);
    generateOpenAPISpec();
  });
  
  watcher.on('add', (filePath) => {
    console.log(`➕ File added: ${filePath}`);
    generateOpenAPISpec();
  });
  
  watcher.on('unlink', (filePath) => {
    console.log(`➖ File removed: ${filePath}`);
    generateOpenAPISpec();
  });
  
  // Initial generation
  generateOpenAPISpec();
}

// Check command line arguments
const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch') || args.includes('-w');

if (isWatchMode) {
  watchMode();
} else {
  generateOpenAPISpec();
}

module.exports = { generateOpenAPISpec };
