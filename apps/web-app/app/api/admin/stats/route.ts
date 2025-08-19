import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-live-2.5-flash-preview': 'Gemini Live 2.5 Flash',
  'gemini-2.5-flash-preview-native-audio-dialog': 'Gemini 2.5 Flash Native Audio Dialog',
  'gemini-2.5-flash-exp-native-audio-thinking-dialog': 'Gemini 2.5 Flash Native Audio Thinking'
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // User statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // Token usage statistics
    const totalTokenUsage = await prisma.tokenUsage.aggregate({
      _sum: { totalTokens: true },
      _count: { id: true },
    });

    const monthlyTokenUsage = await prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { totalTokens: true },
      _count: { id: true },
    });

    const totalCost = await prisma.tokenUsage.aggregate({
      _sum: { cost: true },
    });

    // Usage by model
    const usageByModel = await prisma.tokenUsage.groupBy({
      by: ['model'],
      _sum: { totalTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: 'desc' } },
    });

    // Recent activities
    const recentActivities = await prisma.userActivity.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Daily usage for the last 30 days - Query real data from database
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of day

    // Query actual token usage data from the database
    const dailyUsageData = await prisma.tokenUsage.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        totalTokens: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group data by date and aggregate tokens and sessions
    const dailyUsageMap = new Map<string, { tokens: number; sessions: number }>();

    dailyUsageData.forEach((usage) => {
      const dateStr = usage.createdAt.toISOString().split('T')[0];
      const existing = dailyUsageMap.get(dateStr) || { tokens: 0, sessions: 0 };
      existing.tokens += usage.totalTokens || 0;
      existing.sessions += 1;
      dailyUsageMap.set(dateStr, existing);
    });

    // Convert to array format for the chart
    const dailyUsageChart = Array.from(dailyUsageMap.entries())
      .map(([date, data]) => ({
        date,
        tokens: data.tokens,
        sessions: data.sessions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalSessions: totalTokenUsage._count || 0,
        totalTokens: totalTokenUsage._sum.totalTokens || 0,
        monthlyTokens: monthlyTokenUsage._sum.totalTokens || 0,
        totalCost: totalCost._sum.cost || 0,
      },
      usageByModel: usageByModel.map(item => ({
        model: MODEL_DISPLAY_NAMES[item.model] || item.model,
        modelId: item.model,
        totalTokens: item._sum.totalTokens || 0,
        sessionCount: item._count,
      })),
      recentActivities: recentActivities.map(activity => ({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt,
        user: activity.user,
      })),
      dailyUsage: dailyUsageChart,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
