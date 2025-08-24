import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { GeminiVideoInterface } from "@/components/gemini-live/GeminiVideoInterface";

export const metadata = constructMetadata({
  title: "Video Chat – Gemini Live",
  description: "Real-time video conversation with Gemini AI. Camera-powered multimodal interactions with advanced AI capabilities.",
});

export default async function GeminiVideoPage() {
  const user = await getCurrentUser();

  if (!user && process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Video Chat</h1>
            <p className="text-muted-foreground">
              Real-time video conversation with Gemini AI using your camera
            </p>
          </div>
        </div>

        <GeminiVideoInterface user={user} />
      </div>
    </div>
  );
}
