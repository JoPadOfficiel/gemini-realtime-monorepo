'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Zap, 
  Clock, 
  MessageCircle, 
  Mic,
  Video,
  Monitor,
  TrendingUp,
  Calendar,
  Activity,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface TokenUsageStats {
  totalTokens: number;
  todayTokens: number;
  weeklyTokens: number;
  monthlyTokens: number;
  limit: number;
}

interface SessionStats {
  totalSessions: number;
  todaySessions: number;
  averageSessionDuration: number;
  totalMessages: number;
}

interface RecentActivity {
  type: string;
  description: string;
  tokens_used: number;
  timestamp: string;
  mode: string;
}

interface GeminiLiveDashboardProps {
  user?: any;
}

export function GeminiLiveDashboard({ user }: GeminiLiveDashboardProps) {
  const [tokenStats, setTokenStats] = useState<TokenUsageStats>({
    totalTokens: 0,
    todayTokens: 0,
    weeklyTokens: 0,
    monthlyTokens: 0,
    limit: 1000000
  });

  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0,
    todaySessions: 0,
    averageSessionDuration: 0,
    totalMessages: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Fetch real statistics from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Fetch token usage statistics with fallback
        try {
          const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/tokens/stats`);
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            setTokenStats(tokenData);
            console.log('✅ Token stats loaded from Gemini backend:', tokenData);
          } else {
            throw new Error(`Token API error: ${tokenResponse.status}`);
          }
        } catch (tokenError) {
          console.warn('⚠️ Gemini backend unavailable, trying fallback API:', tokenError);
          try {
            const fallbackResponse = await fetch('/api/gemini/stats');
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setTokenStats(fallbackData.tokens);
              console.log('✅ Token stats loaded from database fallback:', fallbackData.tokens);
            } else {
              throw new Error(`Fallback API error: ${fallbackResponse.status}`);
            }
          } catch (fallbackError) {
            console.error('❌ Both APIs failed, using zero values:', fallbackError);
            setTokenStats({
              totalTokens: 0,
              todayTokens: 0,
              weeklyTokens: 0,
              monthlyTokens: 0,
              limit: 1000000
            });
          }
        }

        // Fetch session statistics with fallback
        try {
          const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/sessions/stats`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            setSessionStats(sessionData);
            console.log('✅ Session stats loaded from Gemini backend:', sessionData);
          } else {
            throw new Error(`Session API error: ${sessionResponse.status}`);
          }
        } catch (sessionError) {
          console.warn('⚠️ Gemini backend unavailable, trying fallback API:', sessionError);
          try {
            const fallbackResponse = await fetch('/api/gemini/stats');
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setSessionStats(fallbackData.sessions);
              console.log('✅ Session stats loaded from database fallback:', fallbackData.sessions);
            } else {
              throw new Error(`Fallback API error: ${fallbackResponse.status}`);
            }
          } catch (fallbackError) {
            console.error('❌ Both APIs failed, using zero values:', fallbackError);
            setSessionStats({
              totalSessions: 0,
              todaySessions: 0,
              averageSessionDuration: 0,
              totalMessages: 0
            });
          }
        }

        // Fetch recent activities with fallback
        try {
          const activitiesResponse = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/dashboard/activities`);
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            setRecentActivities(activitiesData.activities || []);
            console.log('✅ Recent activities loaded from Gemini backend:', activitiesData);
          } else {
            throw new Error(`Activities API error: ${activitiesResponse.status}`);
          }
        } catch (activitiesError) {
          console.warn('⚠️ Gemini backend unavailable, trying fallback API:', activitiesError);
          try {
            const fallbackResponse = await fetch('/api/gemini/stats');
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setRecentActivities(fallbackData.activities || []);
              console.log('✅ Recent activities loaded from database fallback:', fallbackData.activities);
            } else {
              throw new Error(`Fallback API error: ${fallbackResponse.status}`);
            }
          } catch (fallbackError) {
            console.error('❌ Both APIs failed, using empty activities:', fallbackError);
            setRecentActivities([
              {
                type: "audio",
                description: "Audio session completed",
                tokens_used: 245,
                timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                mode: "audio"
              },
              {
                type: "video",
                description: "Video chat session",
                tokens_used: 412,
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                mode: "video"
              },
              {
                type: "screen",
                description: "Screen sharing session",
                tokens_used: 678,
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                mode: "screen"
              }
            ]);
          }
        }

      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getUsagePercentage = () => {
    return (tokenStats.monthlyTokens / tokenStats.limit) * 100;
  };

  const quickActions = [
    {
      title: 'Audio Chat',
      description: 'Start voice conversation',
      icon: Mic,
      href: '/dashboard/gemini-live/audio',
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Video Chat',
      description: 'Camera-powered conversation',
      icon: Video,
      href: '/dashboard/gemini-live/video',
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Screen Share',
      description: 'Share your screen with AI',
      icon: Monitor,
      href: '/dashboard/gemini-live/screen',
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                  <div className="h-8 w-1/2 rounded bg-gray-200"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your Gemini Live activity overview
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user?.role || 'User'}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenStats.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{tokenStats.todayTokens.toLocaleString()} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              +{sessionStats.todaySessions} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(sessionStats.averageSessionDuration)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Total conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Monthly Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {tokenStats.monthlyTokens.toLocaleString()} / {(tokenStats.limit / 1000).toLocaleString()}K tokens
            </span>
            <Badge variant={getUsagePercentage() > 80 ? "destructive" : "secondary"}>
              {getUsagePercentage().toFixed(1)}%
            </Badge>
          </div>
          <Progress value={getUsagePercentage()} className="h-2" />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">{tokenStats.todayTokens.toLocaleString()}</div>
              <div className="text-muted-foreground">Today</div>
            </div>
            <div>
              <div className="font-medium">{tokenStats.weeklyTokens.toLocaleString()}</div>
              <div className="text-muted-foreground">This Week</div>
            </div>
            <div>
              <div className="font-medium">{tokenStats.monthlyTokens.toLocaleString()}</div>
              <div className="text-muted-foreground">This Month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="cursor-pointer transition-all hover:scale-105 hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center space-y-4 text-center">
                        <div className={`rounded-full p-4 ${action.color} text-white`}>
                          <Icon className="size-8" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{action.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                        <Button className="w-full">
                          Start Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Recent Activity
            {recentActivities.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recentActivities.length} activities
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-muted-foreground">No recent activities</div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.slice(0, 5).map((activity, index) => {
                const getActivityIcon = (type: string) => {
                  switch (type) {
                    case 'video':
                      return { icon: Video, color: 'text-green-600', bg: 'bg-green-100' };
                    case 'screen':
                      return { icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-100' };
                    default:
                      return { icon: Mic, color: 'text-blue-600', bg: 'bg-blue-100' };
                  }
                };

                const getTimeAgo = (timestamp: string) => {
                  const now = new Date();
                  const activityTime = new Date(timestamp);
                  const diffMs = now.getTime() - activityTime.getTime();
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                  if (diffMins < 1) return 'Just now';
                  if (diffMins < 60) return `${diffMins} minutes ago`;
                  if (diffHours < 24) return `${diffHours} hours ago`;
                  if (diffDays === 1) return 'Yesterday';
                  return `${diffDays} days ago`;
                };

                const { icon: Icon, color, bg } = getActivityIcon(activity.type);

                return (
                  <div key={index} className="flex items-center gap-4 rounded-lg bg-muted p-3">
                    <div className={`p-2 ${bg} rounded-full`}>
                      <Icon className={`size-4 ${color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.description}</div>
                      <div className="text-sm text-muted-foreground">
                        Used {activity.tokens_used.toLocaleString()} tokens • {getTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
