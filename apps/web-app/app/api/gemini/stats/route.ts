import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalTokenUsage = await prisma.tokenUsage.aggregate({
      _sum: { totalTokens: true },
      _count: { id: true },
    });

    const todayTokenUsage = await prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: startOfToday } },
      _sum: { totalTokens: true },
    });

    const weeklyTokenUsage = await prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: startOfWeek } },
      _sum: { totalTokens: true },
    });

    const monthlyTokenUsage = await prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { totalTokens: true },
    });

    const totalSessions = await prisma.tokenUsage.groupBy({
      by: ['sessionId'],
      where: { sessionId: { not: null } },
    });

    const todaySessions = await prisma.tokenUsage.groupBy({
      by: ['sessionId'],
      where: { 
        sessionId: { not: null },
        createdAt: { gte: startOfToday }
      },
    });

    const sessionDurations = await prisma.tokenUsage.findMany({
      where: { sessionId: { not: null } },
      select: {
        sessionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalDuration = 0;
    let sessionCount = 0;
    const sessionMap = new Map<string, Date[]>();

    sessionDurations.forEach(record => {
      if (!sessionMap.has(record.sessionId!)) {
        sessionMap.set(record.sessionId!, []);
      }
      sessionMap.get(record.sessionId!)!.push(record.createdAt);
    });

    sessionMap.forEach((timestamps) => {
      if (timestamps.length > 1) {
        const start = timestamps[0];
        const end = timestamps[timestamps.length - 1];
        const duration = (end.getTime() - start.getTime()) / 1000;
        totalDuration += Math.min(duration, 7200);
        sessionCount++;
      } else {
        totalDuration += 300;
        sessionCount++;
      }
    });

    const averageSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
    const totalMessages = Math.round((totalTokenUsage._sum.totalTokens || 0) / 75);

    const recentActivities = await prisma.userActivity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    const activitiesWithTokens = await Promise.all(
      recentActivities.map(async (activity) => {
        let sessionId = null;
        try {
          const details = typeof activity.details === 'object' ? activity.details : JSON.parse(activity.details as string);
          sessionId = (details as any)?.session_id;
        } catch (e) {
          // Ignore parsing errors
        }

        let tokensUsed = 0;
        if (sessionId) {
          const tokenUsage = await prisma.tokenUsage.findFirst({
            where: { sessionId: sessionId },
            select: { totalTokens: true }
          });
          tokensUsed = tokenUsage?.totalTokens || 0;
        }

        return {
          type: activity.action,
          description: `Session activity: ${activity.action}`,
          timestamp: activity.createdAt.toISOString(),
          user: activity.user?.name || 'Unknown User',
          tokens_used: tokensUsed
        };
      })
    );

    const response = {
      tokens: {
        totalTokens: totalTokenUsage._sum.totalTokens || 0,
        todayTokens: todayTokenUsage._sum.totalTokens || 0,
        weeklyTokens: weeklyTokenUsage._sum.totalTokens || 0,
        monthlyTokens: monthlyTokenUsage._sum.totalTokens || 0,
        limit: 1000000
      },
      sessions: {
        totalSessions: totalSessions.length,
        todaySessions: todaySessions.length,
        averageSessionDuration: averageSessionDuration,
        totalMessages: totalMessages
      },
      activities: activitiesWithTokens
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to load fallback statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
