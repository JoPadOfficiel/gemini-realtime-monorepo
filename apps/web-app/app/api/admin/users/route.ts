import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        tokenUsages: {
          select: {
            totalTokens: true,
            cost: true,
          },
        },
        _count: {
          select: {
            userActivities: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate total tokens and cost for each user
    const usersWithStats = users.map(user => {
      const totalTokens = user.tokenUsages.reduce((sum, usage) => sum + (usage.totalTokens || 0), 0);
      const totalCost = user.tokenUsages.reduce((sum, usage) => sum + (usage.cost || 0), 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        _count: {
          tokenUsages: totalTokens, // Now this is the actual token count, not record count
          userActivities: user._count.userActivities,
        },
        totalCost,
      };
    });

    return NextResponse.json({ users: usersWithStats });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
