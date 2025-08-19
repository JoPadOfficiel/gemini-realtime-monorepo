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
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();

      // Sanitize data to ensure React 19 compatibility
      const sanitizedStats = {
        overview: {
          totalUsers: Number(data.overview?.totalUsers || 0),
          activeUsers: Number(data.overview?.activeUsers || 0),
          newUsersThisMonth: Number(data.overview?.newUsersThisMonth || 0),
          totalSessions: Number(data.overview?.totalSessions || 0),
          totalTokens: Number(data.overview?.totalTokens || 0),
          monthlyTokens: Number(data.overview?.monthlyTokens || 0),
          totalCost: Number(data.overview?.totalCost || 0),
        },
        usageByModel: Array.isArray(data.usageByModel) ? data.usageByModel.map((model: any) => ({
          model: String(model.model || 'Unknown'),
          sessionCount: Number.isNaN(Number(model.sessionCount)) ? 0 : Number(model.sessionCount || 0),
          totalTokens: Number.isNaN(Number(model.totalTokens)) ? 0 : Number(model.totalTokens || 0),
        })) : [],
        recentActivities: Array.isArray(data.recentActivities) ? data.recentActivities.map((activity: any) => ({
          id: String(activity.id || Math.random()),
          action: String(activity.action || 'Unknown action'),
          createdAt: activity.createdAt ? String(activity.createdAt) : null,
          user: activity.user ? {
            name: activity.user.name ? String(activity.user.name) : null,
            email: activity.user.email ? String(activity.user.email) : null,
          } : null,
        })) : [],
        dailyUsage: Array.isArray(data.dailyUsage) ? data.dailyUsage : [],
      };

      setStats(sanitizedStats);
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
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.overview?.activeUsers || 0} active
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold">{stats.overview?.newUsersThisMonth || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  Growth
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Tokens</p>
                <p className="text-3xl font-bold">{(stats.overview?.monthlyTokens || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.overview?.totalSessions || 0} sessions
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.overview?.totalCost || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(stats.overview?.totalTokens || 0).toLocaleString()} tokens
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Model Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
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
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{modelName}</p>
                          <p className="text-xs text-muted-foreground">
                            {sessionCount} sessions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{totalTokens.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">tokens</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No model usage data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
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
                    <div key={activityId} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{actionText}</p>
                        <p className="text-xs text-muted-foreground">{userName}</p>
                        <p className="text-xs text-muted-foreground">{dateText}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
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
            <Calendar className="h-5 w-5" />
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
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
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
