import { getApiDocs } from "@/lib/swagger";

export async function GET() {
  const spec = await getApiDocs();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <link rel="stylesheet" type="text/css" href="/api/swagger/assets/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/swagger/assets/swagger-ui-bundle.js"></script>
  <script src="/api/swagger/assets/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
