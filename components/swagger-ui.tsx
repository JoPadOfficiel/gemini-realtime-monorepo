"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface SwaggerUIComponentProps {
  url?: string;
  spec?: object;
}

export default function SwaggerUIComponent({ 
  url = "/api/docs", 
  spec 
}: SwaggerUIComponentProps) {
  const [apiSpec, setApiSpec] = useState<object | null>(spec || null);
  const [loading, setLoading] = useState(!spec);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spec && url) {
      fetch(url)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch API spec: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setApiSpec(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [url, spec]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-500 mb-2">
            Failed to Load API Documentation
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!apiSpec) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">No API specification available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swagger-ui-container">
      <SwaggerUI
        spec={apiSpec}
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
        displayOperationId={false}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        tryItOutEnabled={true}
        requestInterceptor={(request: any) => {
          // Add any custom headers or modifications here
          return request;
        }}
        responseInterceptor={(response: any) => {
          // Handle responses here if needed
          return response;
        }}
      />
    </div>
  );
}
