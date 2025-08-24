import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { GeminiScreenInterface } from "@/components/gemini-live/GeminiScreenInterface";

export const metadata = constructMetadata({
  title: "Screen Share – Gemini Live",
  description: "Real-time screen sharing conversation with Gemini AI. Share your screen for advanced multimodal interactions.",
});

export default async function GeminiScreenPage() {
  const user = await getCurrentUser();

  if (!user && process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Screen Share</h1>
            <p className="text-muted-foreground">
              Real-time screen sharing conversation with Gemini AI
            </p>
          </div>
        </div>

        <GeminiScreenInterface user={user} />
      </div>
    </div>
  );
}
