import { auth } from "@/auth";

import { prisma } from "@/lib/db";

/**
 * @swagger
 * /api/user:
 *   delete:
 *     summary: Delete current user account
 *     description: Permanently deletes the authenticated user's account and all associated data
 *     tags:
 *       - User Management
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "User deleted successfully!"
 *       401:
 *         description: User not authenticated or invalid session
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Not authenticated"
 *       500:
 *         description: Internal server error during deletion
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Internal server error"
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Not authenticated", { status: 401 });
  }

  const currentUser = session.user;
  if (!currentUser) {
    return new Response("Invalid user", { status: 401 });
  }

  try {
    await prisma.user.delete({
      where: {
        id: currentUser.id,
      },
    });
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }

  return new Response("User deleted successfully!", { status: 200 });
}
