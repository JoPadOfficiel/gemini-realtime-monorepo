import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { recalculateAllTokenCosts } from '@/lib/pricing-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Recalculate costs if needed (only if there are records without costs)
    const recordsWithoutCost = await prisma.tokenUsage.count({
      where: { cost: null }
    });

    if (recordsWithoutCost > 0) {
      console.log(`🔄 Found ${recordsWithoutCost} records without cost, recalculating...`);
      await recalculateAllTokenCosts();
    }

    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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

    // Get unique sessions count (based on sessionId)
    const totalSessions = await prisma.tokenUsage.groupBy({
      by: ['sessionId'],
      where: { sessionId: { not: null } },
    });



    // Usage by model with proper model names
    const usageByModel = await prisma.tokenUsage.groupBy({
      by: ['model'],
      _sum: { totalTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: 'desc' } },
    });

    // Get model pricing to display correct names
    const modelPricing = await prisma.modelPricing.findMany({
      where: { isActive: true },
    });

    const modelPricingMap = new Map(
      modelPricing.map(p => [p.modelId, p.modelName])
    );

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
        sessionId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group data by date and aggregate tokens and unique sessions
    const dailyUsageMap = new Map<string, { tokens: number; sessions: Set<string> }>();

    dailyUsageData.forEach((usage) => {
      const dateStr = usage.createdAt.toISOString().split('T')[0];
      if (!dateStr) return; // Safety check

      const existing = dailyUsageMap.get(dateStr) || { tokens: 0, sessions: new Set<string>() };
      existing.tokens += usage.totalTokens || 0;
      if (usage.sessionId) {
        existing.sessions.add(usage.sessionId);
      }
      dailyUsageMap.set(dateStr, existing);
    });

    // Convert to array format for the chart
    const dailyUsageChart = Array.from(dailyUsageMap.entries())
      .map(([date, data]) => ({
        date,
        tokens: data.tokens,
        sessions: data.sessions.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalSessions: totalSessions.length,
        totalTokens: totalTokenUsage._sum.totalTokens || 0,
        monthlyTokens: monthlyTokenUsage._sum.totalTokens || 0,
        totalCost: totalCost._sum.cost || 0,
      },
      usageByModel: usageByModel.map(item => ({
        model: modelPricingMap.get(item.model) || item.model,
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
