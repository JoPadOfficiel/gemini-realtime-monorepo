import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { GeminiAudioInterface } from "@/components/gemini-live/GeminiAudioInterface";

export const metadata = constructMetadata({
  title: "Audio Chat – Gemini Live",
  description: "Real-time audio conversation with Gemini AI. Voice-powered interactions with advanced AI capabilities.",
});

export default async function GeminiAudioPage() {
  const user = await getCurrentUser();

  if (!user && process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audio Chat</h1>
            <p className="text-muted-foreground">
              Real-time voice conversation with Gemini AI
            </p>
          </div>
        </div>

        <GeminiAudioInterface user={user} />
      </div>
    </div>
  );
}
