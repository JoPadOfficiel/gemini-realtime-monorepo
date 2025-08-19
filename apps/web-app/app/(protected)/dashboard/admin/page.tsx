import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import AdminDashboard from "@/components/admin/admin-dashboard";
import UsersList from "@/components/admin/users-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = constructMetadata({
  title: "Admin – SaaS Starter",
  description: "Admin page for only admin management.",
});

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <>
      <DashboardHeader
        heading="Admin Dashboard"
        text="User management, analytics and platform monitoring."
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersList />
        </TabsContent>
      </Tabs>
    </>
  );
}
