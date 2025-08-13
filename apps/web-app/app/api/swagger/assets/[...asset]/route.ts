import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { asset: string[] } }
) {
  try {
    const resolvedParams = await params;
    const assetPath = resolvedParams.asset.join("/");

    // Sécurité : vérifier que le fichier demandé est autorisé
    const allowedFiles = [
      "swagger-ui.css",
      "swagger-ui-bundle.js",
      "swagger-ui-standalone-preset.js"
    ];
    
    const fileName = assetPath.split("/").pop();
    if (!fileName || !allowedFiles.includes(fileName)) {
      return new Response("File not found", { status: 404 });
    }
    
    // Chemin vers les assets de swagger-ui-dist
    const swaggerUiPath = join(process.cwd(), "node_modules", "swagger-ui-dist", fileName);
    
    // Lire le fichier
    const fileContent = readFileSync(swaggerUiPath);
    
    // Déterminer le type de contenu
    let contentType = "text/plain";
    if (fileName.endsWith(".css")) {
      contentType = "text/css";
    } else if (fileName.endsWith(".js")) {
      contentType = "application/javascript";
    }
    
    return new Response(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // Cache pendant 1 an
      },
    });
  } catch (error) {
    console.error("Error serving Swagger UI asset:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
