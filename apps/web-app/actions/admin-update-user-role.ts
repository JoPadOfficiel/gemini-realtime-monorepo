"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { userRoleSchema } from "@/lib/validations/user";

export type AdminFormData = {
  role: UserRole;
};

export async function adminUpdateUserRole(targetUserId: string, data: AdminFormData) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized - No session");
    }

    // 🔒 SECURITY: Only admins can change user roles
    if (session.user.role !== "ADMIN") {
      throw new Error("Forbidden - Admin privileges required");
    }

    // 🔒 SECURITY: Prevent admins from changing their own role
    if (session.user.id === targetUserId) {
      throw new Error("Forbidden - Cannot modify your own role");
    }

    const { role } = userRoleSchema.parse(data);

    // Get target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, email: true }
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    // 🔒 SECURITY: Prevent removing the last admin
    if (role === "USER" && targetUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" }
      });

      if (adminCount <= 1) {
        throw new Error("Forbidden - Cannot remove the last admin");
      }
    }

    // Update the user role
    await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        role: role,
      },
    });

    // Log the admin action
    await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        action: 'user_role_changed',
        details: {
          targetUserId,
          targetUserEmail: targetUser.email,
          oldRole: targetUser.role,
          newRole: role,
        },
      },
    });

    revalidatePath("/dashboard/admin");
    return { status: "success" };
  } catch (error) {
    console.error("Admin role update error:", error);
    return { 
      status: "error", 
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
