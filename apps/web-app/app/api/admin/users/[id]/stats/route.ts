import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Get user basic info from database
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch real stats from FastAPI backend (same as admin dashboard)
    const BACKEND_URL = process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000';

    let tokenStats = { totalTokens: 0, monthlyTokens: 0 };
    let sessionStats = { totalSessions: 0, totalMessages: 0 };
    let activities: any[] = [];

    try {
      // Fetch from FastAPI backend
      const [tokenResponse, sessionResponse, activitiesResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tokens/stats`),
        fetch(`${BACKEND_URL}/api/sessions/stats`),
        fetch(`${BACKEND_URL}/api/dashboard/activities`)
      ]);

      if (tokenResponse.ok) {
        tokenStats = await tokenResponse.json();
      }
      if (sessionResponse.ok) {
        sessionStats = await sessionResponse.json();
      }
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        activities = activitiesData.activities || [];
      }
    } catch (error) {
      console.warn('FastAPI backend not available, using fallback data:', error);
    }

    // Calculate stats (using real data from FastAPI)
    const totalTokens = tokenStats.totalTokens || 0;
    const totalCost = totalTokens * 0.000075; // Estimate cost
    const sessionCount = sessionStats.totalSessions || 0;
    const activityCount = activities.length;
    const messageCount = sessionStats.totalMessages || Math.max(1, Math.floor(totalTokens / 50));

    // Create usage by model data
    const usageByModel = [{
      model: 'Gemini Live 2.5 Flash',
      modelId: 'gemini-2.0-flash-exp',
      totalTokens,
      totalCost,
      sessionCount,
    }];

    // Create recent token usage data
    const recentTokenUsage = activities.slice(0, 10).map((activity, index) => ({
      id: `token-${index}`,
      model: 'gemini-2.0-flash-exp',
      totalTokens: activity.tokens_used || 0,
      cost: (activity.tokens_used || 0) * 0.000075,
      endpoint: '/api/gemini-live',
      createdAt: activity.timestamp || new Date().toISOString(),
    }));

    // Create recent activities data
    const recentActivities = activities.slice(0, 10).map((activity, index) => ({
      id: `activity-${index}`,
      action: activity.type || 'session',
      details: { description: activity.description || 'Session activity' },
      createdAt: activity.timestamp || new Date().toISOString(),
    }));

    const response = {
      user: userInfo,
      stats: {
        totalTokens,
        totalCost,
        sessionCount,
        activityCount,
        messageCount,
      },
      usageByModel,
      recentTokenUsage,
      recentActivities,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
