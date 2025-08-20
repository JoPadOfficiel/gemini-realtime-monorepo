"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestLoginPage() {
  const handleTestLogin = async () => {
    try {
      // Force sign in with the test user
      await signIn("email", {
        email: "test@example.com",
        redirect: true,
        callbackUrl: "/dashboard"
      });
    } catch (error) {
      console.error("Test login failed:", error);
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Test Login</CardTitle>
          <CardDescription>
            Development only - Login as test user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestLogin} className="w-full">
            Login as Test User
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
