'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Coins, Calendar, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-live-2.5-flash-preview': 'Gemini Live 2.5 Flash',
  'gemini-2.5-flash-preview-native-audio-dialog': 'Gemini 2.5 Flash Native Audio Dialog',
  'gemini-2.5-flash-exp-native-audio-thinking-dialog': 'Gemini 2.5 Flash Native Audio Thinking'
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
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

const truncateModelName = (modelName: string, maxLength: number = 20) => {
  if (modelName.length <= maxLength) return modelName;
  return `${modelName.substring(0, maxLength)}...`;
};

interface UserStats {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: 'USER' | 'ADMIN';
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    tokenUsages: Array<{
      id: string;
      model: string;
      totalTokens: number;
      cost: number | null;
      endpoint: string | null;
      createdAt: string;
    }>;
    userActivities: Array<{
      id: string;
      action: string;
      details: any;
      createdAt: string;
    }>;
  };
  summary: {
    totalTokens: number;
    totalCost: number;
    totalSessions: number;
    totalActivities: number;
  };
  usageByModel: Array<{
    model: string;
    modelId: string;
    totalTokens: number;
    sessionCount: number;
  }>;
  recentActivity: Array<{
    action: string;
    createdAt: string;
  }>;
}

interface UserDetailsModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailsModal({ userId, isOpen, onClose }: UserDetailsModalProps) {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserStats = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch user stats');

      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserStats();
    }
  }, [isOpen, userId, fetchUserStats]);



  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            User Details
            {userStats && (
              <Badge variant={userStats.user.isActive ? 'default' : 'destructive'}>
                {userStats.user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Detailed information and usage statistics
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : userStats ? (
          <div className="space-y-6">
            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">General Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{userStats.user.name || 'Not defined'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{userStats.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant={userStats.user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {userStats.user.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration</p>
                  <p className="font-medium">{formatDate(userStats.user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {userStats.user.lastLoginAt
                      ? formatDate(userStats.user.lastLoginAt)
                      : 'Never logged in'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{userStats.summary.totalTokens.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Tokens used</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Coins className="size-4 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(userStats.summary.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">Total cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{userStats.summary.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{userStats.summary.totalActivities}</p>
                      <p className="text-xs text-muted-foreground">Activities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="usage" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:h-10 sm:grid-cols-3">
                <TabsTrigger value="usage" className="py-2 text-xs sm:py-1 sm:text-sm">Token Usage</TabsTrigger>
                <TabsTrigger value="models" className="py-2 text-xs sm:py-1 sm:text-sm">Models Used</TabsTrigger>
                <TabsTrigger value="activity" className="py-2 text-xs sm:py-1 sm:text-sm">Recent Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="usage" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Token Usage History</CardTitle>
                    <CardDescription>Last 50 sessions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="w-full overflow-x-auto">
                      <div className="rounded-md border">
                        <Table className="w-full min-w-[400px]">{/* Minimum width for mobile readability */}
                        <TableHeader>
                          <TableRow>
                            {/* Progressive responsive columns: Mobile(3) -> SM(4) -> MD+(5) */}
                            <TableHead className="w-24">Date</TableHead>
                            <TableHead className="w-auto">Model</TableHead>
                            <TableHead className="w-20 text-center">Tokens</TableHead>
                            <TableHead className="hidden w-20 text-center sm:table-cell">Cost</TableHead>
                            <TableHead className="hidden w-24 md:table-cell">Endpoint</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userStats.user.tokenUsages?.map((usage) => (
                            <TableRow key={usage.id}>
                              <TableCell className="text-sm">{formatDate(usage.createdAt)}</TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline" title={MODEL_DISPLAY_NAMES[usage.model] || usage.model}>
                                  <span className="block sm:hidden">
                                    {truncateModelName(MODEL_DISPLAY_NAMES[usage.model] || usage.model, 15)}
                                  </span>
                                  <span className="hidden sm:block">
                                    {MODEL_DISPLAY_NAMES[usage.model] || usage.model}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">{usage.totalTokens.toLocaleString()}</TableCell>
                              <TableCell className="hidden text-center text-sm sm:table-cell">
                                {usage.cost ? formatCurrency(usage.cost) : 'Free'}
                              </TableCell>
                              <TableCell className="hidden text-sm md:table-cell">{usage.endpoint || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="models" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Model</CardTitle>
                    <CardDescription>Distribution of usage by AI model</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userStats.usageByModel.map((model) => (
                        <div key={model.modelId || model.model} className="flex flex-col space-y-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <div className="flex-1">
                            <p className="break-words text-sm font-medium sm:text-base">{model.model}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                              {model.sessionCount} sessions
                            </p>
                          </div>
                          <div className="shrink-0 text-left sm:text-right">
                            <p className="text-xl font-bold sm:text-2xl">{model.totalTokens.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">tokens</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Last 50 user activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userStats.user.userActivities?.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{activity.action}</p>
                            {activity.details && (
                              <p className="text-sm text-muted-foreground">
                                {JSON.stringify(activity.details)}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Unable to load user details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
