#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const SwaggerParser = require('swagger-parser');

/**
 * Validate OpenAPI specification
 */
async function validateOpenAPISpec() {
  try {
    console.log('🔍 Validating OpenAPI specification...');
    
    const specPath = path.join(process.cwd(), 'docs', 'openapi.json');
    
    if (!fs.existsSync(specPath)) {
      console.log('📄 OpenAPI spec not found, generating it first...');
      const { generateOpenAPISpec } = require('./generate-openapi.js');
      await generateOpenAPISpec();
    }
    
    // Parse and validate the specification
    const api = await SwaggerParser.validate(specPath);
    
    console.log('✅ OpenAPI specification is valid!');
    console.log(`📊 API Details:`);
    console.log(`   • Title: ${api.info.title}`);
    console.log(`   • Version: ${api.info.version}`);
    console.log(`   • Description: ${api.info.description}`);
    
    // Count endpoints
    const paths = Object.keys(api.paths || {});
    const totalEndpoints = paths.reduce((count, path) => {
      return count + Object.keys(api.paths[path]).length;
    }, 0);
    
    console.log(`   • Total paths: ${paths.length}`);
    console.log(`   • Total endpoints: ${totalEndpoints}`);
    
    // List all endpoints
    console.log(`\n📋 Available Endpoints:`);
    paths.forEach(path => {
      const methods = Object.keys(api.paths[path]);
      methods.forEach(method => {
        const endpoint = api.paths[path][method];
        const tags = endpoint.tags ? endpoint.tags.join(', ') : 'No tags';
        console.log(`   • ${method.toUpperCase().padEnd(6)} ${path.padEnd(30)} [${tags}]`);
      });
    });
    
    // Check for common issues
    console.log(`\n🔍 Checking for common issues...`);
    
    let issues = [];
    
    // Check if all endpoints have descriptions
    paths.forEach(path => {
      const methods = Object.keys(api.paths[path]);
      methods.forEach(method => {
        const endpoint = api.paths[path][method];
        if (!endpoint.description || endpoint.description.trim() === '') {
          issues.push(`Missing description for ${method.toUpperCase()} ${path}`);
        }
        if (!endpoint.tags || endpoint.tags.length === 0) {
          issues.push(`Missing tags for ${method.toUpperCase()} ${path}`);
        }
      });
    });
    
    // Check if all schemas are properly defined
    const schemas = api.components?.schemas || {};
    const schemaNames = Object.keys(schemas);
    console.log(`   • Schemas defined: ${schemaNames.length}`);
    
    if (issues.length > 0) {
      console.log(`\n⚠️  Found ${issues.length} potential issues:`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    } else {
      console.log(`   ✅ No issues found!`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ OpenAPI specification validation failed:', error.message);
    
    if (error.details) {
      console.error('📋 Validation details:');
      error.details.forEach((detail, index) => {
        console.error(`   ${index + 1}. ${detail.message} (${detail.path})`);
      });
    }
    
    process.exit(1);
  }
}

/**
 * Generate a markdown documentation from the OpenAPI spec
 */
async function generateMarkdownDocs() {
  try {
    console.log('📝 Generating markdown documentation...');
    
    const specPath = path.join(process.cwd(), 'docs', 'openapi.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    
    let markdown = `# ${spec.info.title}\n\n`;
    markdown += `${spec.info.description}\n\n`;
    markdown += `**Version:** ${spec.info.version}\n\n`;
    
    if (spec.servers && spec.servers.length > 0) {
      markdown += `## Servers\n\n`;
      spec.servers.forEach(server => {
        markdown += `- **${server.description || 'Server'}:** ${server.url}\n`;
      });
      markdown += `\n`;
    }
    
    // Group endpoints by tags
    const endpointsByTag = {};
    Object.keys(spec.paths).forEach(path => {
      Object.keys(spec.paths[path]).forEach(method => {
        const endpoint = spec.paths[path][method];
        const tags = endpoint.tags || ['Untagged'];
        
        tags.forEach(tag => {
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = [];
          }
          endpointsByTag[tag].push({
            method: method.toUpperCase(),
            path,
            ...endpoint
          });
        });
      });
    });
    
    // Generate documentation for each tag
    Object.keys(endpointsByTag).forEach(tag => {
      markdown += `## ${tag}\n\n`;
      
      endpointsByTag[tag].forEach(endpoint => {
        markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
        markdown += `${endpoint.description || endpoint.summary || 'No description available'}\n\n`;
        
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          markdown += `**Parameters:**\n\n`;
          endpoint.parameters.forEach(param => {
            markdown += `- **${param.name}** (${param.in}): ${param.description || 'No description'}\n`;
          });
          markdown += `\n`;
        }
        
        if (endpoint.responses) {
          markdown += `**Responses:**\n\n`;
          Object.keys(endpoint.responses).forEach(status => {
            const response = endpoint.responses[status];
            markdown += `- **${status}**: ${response.description}\n`;
          });
          markdown += `\n`;
        }
        
        markdown += `---\n\n`;
      });
    });
    
    const markdownPath = path.join(process.cwd(), 'docs', 'API.md');
    fs.writeFileSync(markdownPath, markdown);
    
    console.log(`✅ Markdown documentation generated: ${markdownPath}`);
    
  } catch (error) {
    console.error('❌ Failed to generate markdown documentation:', error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const shouldGenerateMarkdown = args.includes('--markdown') || args.includes('-m');

async function main() {
  await validateOpenAPISpec();
  
  if (shouldGenerateMarkdown) {
    await generateMarkdownDocs();
  }
}

main().catch(console.error);
