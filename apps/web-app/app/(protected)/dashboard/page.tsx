import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { GeminiLiveDashboard } from "@/components/dashboard/GeminiLiveDashboard";

export const metadata = constructMetadata({
  title: "Dashboard – Gemini Live",
  description: "Your Gemini Live AI conversation dashboard with real-time statistics and quick actions.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="container mx-auto px-4 py-6">
      <GeminiLiveDashboard user={user} />
    </div>
  );
}