import { auth } from "@/auth";

import { prisma } from "@/lib/db";

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
