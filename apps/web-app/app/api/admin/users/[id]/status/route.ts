import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user?.id || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isActive } = await request.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isActive value' }, { status: 400 });
    }

    const { id } = await params;

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Log the admin action
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: `user_${isActive ? 'activated' : 'deactivated'}`,
        details: {
          targetUserId: id,
          targetUserEmail: updatedUser.email,
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
