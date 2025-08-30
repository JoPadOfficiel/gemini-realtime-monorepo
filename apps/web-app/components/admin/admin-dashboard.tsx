'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Calendar,
  UserPlus,
  Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    totalSessions: number;
    totalTokens: number;
    monthlyTokens: number;
    totalCost: number;
  };
  usageByModel: Array<{
    model: string;
    totalTokens: number;
    sessionCount: number;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    details: any;
    createdAt: string;
    user: {
      name: string | null;
      email: string | null;
    };
  }>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    sessions: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      // Use the same working pattern as user dashboard - fetch from FastAPI backend
      const BACKEND_URL = process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000';

      // Fetch token stats from backend (same as user dashboard)
      const tokenResponse = await fetch(`${BACKEND_URL}/api/tokens/stats`);
      const sessionResponse = await fetch(`${BACKEND_URL}/api/sessions/stats`);
      const activitiesResponse = await fetch(`${BACKEND_URL}/api/dashboard/activities`);

      // Get user count from database
      const usersResponse = await fetch('/api/admin/users');

      if (!tokenResponse.ok || !sessionResponse.ok) {
        throw new Error('Failed to fetch backend stats');
      }

      const tokenData = await tokenResponse.json();
      const sessionData = await sessionResponse.json();
      const activitiesData = activitiesResponse.ok ? await activitiesResponse.json() : { activities: [] };
      const usersData = usersResponse.ok ? await usersResponse.json() : { users: [] };

      // Transform backend data to admin dashboard format
      const data = {
        overview: {
          totalUsers: usersData.users?.length || 1,
          activeUsers: usersData.users?.filter((u: any) => u.isActive)?.length || 1,
          newUsersThisMonth: 0,
          totalSessions: sessionData.totalSessions || 0,
          totalTokens: tokenData.totalTokens || 0,
          monthlyTokens: tokenData.monthlyTokens || 0,
          totalCost: (tokenData.totalTokens || 0) * 0.000075, // Estimate cost
        },
        usageByModel: [
          {
            model: 'Gemini Live 2.5 Flash',
            totalTokens: tokenData.totalTokens || 0,
            sessionCount: sessionData.totalSessions || 0,
          }
        ],
        recentActivities: (activitiesData.activities || []).map((activity: any) => ({
          id: activity.id || Math.random().toString(),
          action: activity.type || 'session',
          details: { description: activity.description || 'Session activity' },
          createdAt: activity.timestamp || new Date().toISOString(),
          user: { name: 'User', email: 'user@example.com' }
        })),
        dailyUsage: []
      };

      setStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load dashboard statistics');
      setStats({
        overview: {
          totalUsers: 0,
          activeUsers: 0,
          newUsersThisMonth: 0,
          totalSessions: 0,
          totalTokens: 0,
          monthlyTokens: 0,
          totalCost: 0,
        },
        usageByModel: [],
        recentActivities: [],
        dailyUsage: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{stats.overview?.totalUsers || 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.overview?.activeUsers || 0} active
                </p>
              </div>
              <Users className="size-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold">{stats.overview?.newUsersThisMonth || 0}</p>
                <p className="mt-1 text-xs text-green-600">
                  <TrendingUp className="mr-1 inline size-3" />
                  Growth
                </p>
              </div>
              <UserPlus className="size-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Tokens</p>
                <p className="text-3xl font-bold">{(stats.overview?.monthlyTokens || 0).toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.overview?.totalSessions || 0} sessions
                </p>
              </div>
              <Zap className="size-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.overview?.totalCost || 0)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(stats.overview?.totalTokens || 0).toLocaleString()} tokens
                </p>
              </div>
              <DollarSign className="size-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Model Section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5" />
              Usage by Model
            </CardTitle>
            <CardDescription>
              Distribution of usage across different AI models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.usageByModel && stats.usageByModel.length > 0 ? (
                stats.usageByModel.slice(0, 5).map((model, index) => {
                  // Ensure all values are strings/numbers to prevent React 19 errors
                  const modelKey = `model-${index}-${String(model.model || 'unknown')}`;
                  const modelName = model.model ? String(model.model) : 'Unknown model';
                  const sessionCount = typeof model.sessionCount === 'number' ? model.sessionCount : 0;
                  const totalTokens = typeof model.totalTokens === 'number' ? model.totalTokens : 0;

                  return (
                    <div key={modelKey} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{modelName}</p>
                          <p className="text-xs text-muted-foreground">
                            {sessionCount} sessions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{(totalTokens || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">tokens</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">No model usage data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions from users and administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.slice(0, 8).map((activity, index) => {
                  // Ensure all values are strings to prevent React 19 errors
                  const activityId = activity.id ? String(activity.id) : `activity-${index}`;
                  const actionText = activity.action ? String(activity.action) : 'Unknown action';
                  const userName = activity.user?.name ? String(activity.user.name) :
                                  activity.user?.email ? String(activity.user.email) : 'Unknown user';
                  const dateText = activity.createdAt ? formatDate(activity.createdAt) : 'Unknown date';

                  return (
                    <div key={activityId} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50">
                      <div className="mt-2 size-2 rounded-full bg-green-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{actionText}</p>
                        <p className="text-xs text-muted-foreground">{userName}</p>
                        <p className="text-xs text-muted-foreground">{dateText}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Daily Usage (Last 30 Days)
          </CardTitle>
          <CardDescription>
            Token usage evolution over the past month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.dailyUsage && stats.dailyUsage.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toLocaleString() : value,
                      name === 'tokens' ? 'Tokens' : 'Sessions'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
              <div className="text-center">
                <TrendingUp className="mx-auto mb-2 size-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No usage data available</p>
                <p className="text-sm text-muted-foreground">
                  Data will appear as users interact with the platform
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );


}
