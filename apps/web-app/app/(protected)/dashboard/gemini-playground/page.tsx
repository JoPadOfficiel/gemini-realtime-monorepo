import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import GeminiVoiceChat from "@/components/gemini-playground/gemini-playground";

export const metadata = constructMetadata({
  title: "Gemini AI Playground – Dashboard",
  description: "Interact with Google's Gemini AI using multimodal capabilities including video, audio, and text.",
});

export default async function GeminiPlaygroundPage() {
  const user = await getCurrentUser();

  // Allow access in development mode for testing
  if (!user && process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  return (
    <>
      <DashboardHeader
        heading="Gemini AI Playground"
        text="Experience multimodal AI interactions with Google's Gemini. Use video, audio, and text to communicate with advanced AI capabilities."
      />
      <div className="grid gap-10">
        <GeminiVoiceChat />
      </div>
    </>
  );
}
