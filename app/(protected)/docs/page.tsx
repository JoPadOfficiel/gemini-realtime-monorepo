import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SwaggerUIComponent from "@/components/swagger-ui";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Interactive API documentation for the Next.js SaaS Stripe Starter",
};

export default function DocsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <Badge variant="secondary">v1.0.0</Badge>
        </div>
        <p className="text-muted-foreground text-lg">
          Comprehensive API documentation for the Next.js SaaS Stripe Starter application.
          Explore and test all available endpoints interactively.
        </p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Authentication</CardTitle>
            <CardDescription>
              Most endpoints require authentication via NextAuth session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Session</Badge>
                <span className="text-sm text-muted-foreground">Cookie-based</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Bearer</Badge>
                <span className="text-sm text-muted-foreground">JWT tokens</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Base URL</CardTitle>
            <CardDescription>
              API endpoints are available at the following base URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {process.env.NODE_ENV === "production" 
                  ? "https://your-domain.com/api" 
                  : "http://localhost:3000/api"}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Response Format</CardTitle>
            <CardDescription>
              All responses follow consistent JSON structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">JSON</Badge>
                <span className="text-sm text-muted-foreground">Standard format</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Errors</Badge>
                <span className="text-sm text-muted-foreground">Structured messages</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive API Explorer</CardTitle>
          <CardDescription>
            Use the interactive documentation below to explore and test API endpoints.
            You can try out requests directly from this interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SwaggerUIComponent />
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">1. Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Sign in to your account to access protected endpoints
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">2. Explore Endpoints</h4>
              <p className="text-sm text-muted-foreground">
                Browse available endpoints organized by category
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">3. Test Requests</h4>
              <p className="text-sm text-muted-foreground">
                Use the "Try it out" feature to test API calls
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">Standard Endpoints</h4>
              <p className="text-sm text-muted-foreground">
                100 requests per minute per user
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Webhook Endpoints</h4>
              <p className="text-sm text-muted-foreground">
                No rate limits (verified webhooks only)
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Image Generation</h4>
              <p className="text-sm text-muted-foreground">
                10 requests per minute per IP
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
