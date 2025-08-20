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
    <div className="container mx-auto py-6 px-4">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
