"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { userRoleSchema } from "@/lib/validations/user";

export type FormData = {
  role: UserRole;
};

export async function updateUserRole(userId: string, data: FormData) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized - No session");
    }

    // 🔒 SECURITY: Prevent users from changing their own role
    if (session.user.id === userId) {
      throw new Error("Forbidden - Cannot modify your own role");
    }

    // 🔒 SECURITY: Only admins can change user roles
    if (session.user.role !== "ADMIN") {
      throw new Error("Forbidden - Admin privileges required");
    }

    const { role } = userRoleSchema.parse(data);

    // 🔒 SECURITY: Prevent removing the last admin
    if (role === "USER") {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (targetUser?.role === "ADMIN") {
        const adminCount = await prisma.user.count({
          where: { role: "ADMIN" }
        });

        if (adminCount <= 1) {
          throw new Error("Forbidden - Cannot remove the last admin");
        }
      }
    }

    // Update the user role.
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: role,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/admin");
    return { status: "success" };
  } catch (error) {
    console.error("Role update error:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
