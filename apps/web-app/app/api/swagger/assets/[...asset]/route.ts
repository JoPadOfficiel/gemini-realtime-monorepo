import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const assetPath = resolvedParams.asset.join("/");

    // Security: verify that the requested file is allowed
    const allowedFiles = [
      "swagger-ui.css",
      "swagger-ui-bundle.js",
      "swagger-ui-standalone-preset.js"
    ];

    const fileName = assetPath.split("/").pop();
    if (!fileName || !allowedFiles.includes(fileName)) {
      return new Response("File not found", { status: 404 });
    }

    // Path to swagger-ui-dist assets
    const swaggerUiPath = join(process.cwd(), "node_modules", "swagger-ui-dist", fileName);

    // Read the file
    const fileContent = readFileSync(swaggerUiPath);

    // Determine content type
    let contentType = "text/plain";
    if (fileName.endsWith(".css")) {
      contentType = "text/css";
    } else if (fileName.endsWith(".js")) {
      contentType = "application/javascript";
    }
    
    return new Response(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving Swagger UI asset:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
