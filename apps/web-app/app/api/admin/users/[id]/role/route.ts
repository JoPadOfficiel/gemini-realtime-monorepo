import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    // SECURITY: Only admins can change user roles
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await request.json();

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
    }

    const { id: targetUserId } = await params;

    // SECURITY: Prevent admins from changing their own role
    if (user.id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 403 }
      );
    }

    // Get target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, email: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY: Prevent removing the last admin
    if (role === 'USER' && targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin' },
          { status: 403 }
        );
      }
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
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
        action: 'user_role_changed',
        details: {
          targetUserId,
          targetUserEmail: targetUser.email,
          targetUserName: targetUser.name,
          oldRole: targetUser.role,
          newRole: role,
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
