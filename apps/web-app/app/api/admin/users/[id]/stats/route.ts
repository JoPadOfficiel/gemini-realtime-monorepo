import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-live-2.5-flash-preview': 'Gemini Live 2.5 Flash',
  'gemini-2.5-flash-preview-native-audio-dialog': 'Gemini 2.5 Flash Native Audio Dialog',
  'gemini-2.5-flash-exp-native-audio-thinking-dialog': 'Gemini 2.5 Flash Native Audio Thinking'
};

const MODEL_ENDPOINTS: Record<string, string> = {
  'gemini-live-2.5-flash-preview': '/ws/{client_id}',
  'gemini-2.5-flash-preview-native-audio-dialog': '/ws/{client_id}',
  'gemini-2.5-flash-exp-native-audio-thinking-dialog': '/ws/{client_id}'
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Get user with detailed stats
    const userStats = await prisma.user.findUnique({
      where: { id: userId },
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
            id: true,
            model: true,
            inputTokens: true,
            outputTokens: true,
            totalTokens: true,
            cost: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        userActivities: {
          select: {
            id: true,
            action: true,
            createdAt: true,
            details: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            tokenUsages: true,
            userActivities: true,
          },
        },
      },
    });

    if (!userStats) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate aggregated stats
    const totalTokens = userStats.tokenUsages.reduce((sum, usage) => sum + (usage.totalTokens || 0), 0);
    const totalCost = userStats.tokenUsages.reduce((sum, usage) => sum + (usage.cost || 0), 0);
    const sessionCount = userStats._count.tokenUsages;
    const activityCount = userStats._count.userActivities;

    // Estimate message count (roughly 50 tokens per message)
    const messageCount = Math.max(1, Math.floor(totalTokens / 50));

    // Group usage by model with display names
    const usageByModel = userStats.tokenUsages.reduce((acc, usage) => {
      const modelId = usage.model || 'unknown';
      const displayName = MODEL_DISPLAY_NAMES[modelId] || modelId;

      if (!acc[modelId]) {
        acc[modelId] = {
          model: displayName,
          modelId: modelId,
          totalTokens: 0,
          totalCost: 0,
          sessionCount: 0,
        };
      }
      acc[modelId].totalTokens += usage.totalTokens || 0;
      acc[modelId].totalCost += usage.cost || 0;
      acc[modelId].sessionCount += 1;
      return acc;
    }, {} as Record<string, any>);

    const response = {
      user: {
        id: userStats.id,
        name: userStats.name,
        email: userStats.email,
        role: userStats.role,
        isActive: userStats.isActive,
        createdAt: userStats.createdAt,
        lastLoginAt: userStats.lastLoginAt,
      },
      stats: {
        totalTokens,
        totalCost,
        sessionCount,
        activityCount,
        messageCount,
      },
      usageByModel: Object.values(usageByModel),
      recentTokenUsage: userStats.tokenUsages.map(usage => ({
        ...usage,
        endpoint: MODEL_ENDPOINTS[usage.model] || '/api/unknown'
      })),
      recentActivities: userStats.userActivities,
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
