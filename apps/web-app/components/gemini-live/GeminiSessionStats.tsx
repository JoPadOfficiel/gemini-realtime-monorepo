'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Zap, 
  Clock, 
  MessageCircle, 
  Wifi, 
  WifiOff,
  TrendingUp,
  Database
} from 'lucide-react';

interface GeminiSessionStatsProps {
  tokenCount: number;
  sessionId: string | null;
  isConnected: boolean;
  messageCount: number;
  model: string;
}

interface TokenUsageData {
  current: number;
  limit: number;
  percentage: number;
}

export function GeminiSessionStats({ 
  tokenCount, 
  sessionId, 
  isConnected, 
  messageCount, 
  model 
}: GeminiSessionStatsProps) {
  const [sessionDuration, setSessionDuration] = useState(0);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData>({
    current: 0,
    limit: 1000000, // 1M tokens for free tier
    percentage: 0
  });

  // Update session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  // Update token usage
  useEffect(() => {
    setTokenUsage(prev => ({
      ...prev,
      current: tokenCount,
      percentage: (tokenCount / prev.limit) * 100
    }));
  }, [tokenCount]);

  // Fetch real token usage from API
  useEffect(() => {
    const fetchTokenUsage = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`http://localhost:8000/api/tokens/usage/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setTokenUsage({
            current: data.tokens_used || tokenCount,
            limit: data.limit || 1000000,
            percentage: ((data.tokens_used || tokenCount) / (data.limit || 1000000)) * 100
          });
        }
      } catch (error) {
        console.error('Failed to fetch token usage:', error);
      }
    };

    if (sessionId && isConnected) {
      fetchTokenUsage();
      const interval = setInterval(fetchTokenUsage, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [sessionId, isConnected, tokenCount]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModelDisplayName = (modelName: string) => {
    return modelName
      .replace('gemini-', '')
      .replace('-preview', '')
      .replace('-', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getConnectionStatus = () => {
    if (isConnected) {
      return {
        icon: Wifi,
        text: 'Connected',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    } else {
      return {
        icon: WifiOff,
        text: 'Disconnected',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    }
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            Session Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <Badge 
              variant="secondary" 
              className={`${status.bgColor} ${status.color} border-0`}
            >
              {status.text}
            </Badge>
            {isConnected && sessionDuration > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(sessionDuration)}
              </div>
            )}
          </div>
          
          {sessionId && (
            <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
              Session: {sessionId.slice(0, 8)}...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {tokenUsage.current.toLocaleString()}
            </span>
            <Badge variant="outline" className="text-xs">
              {tokenUsage.percentage.toFixed(1)}%
            </Badge>
          </div>
          
          <Progress 
            value={tokenUsage.percentage} 
            className="h-2"
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Current session</span>
            <span>Limit: {(tokenUsage.limit / 1000).toLocaleString()}K</span>
          </div>
        </CardContent>
      </Card>

      {/* Session Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Session Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold">{messageCount}</div>
              <div className="text-xs text-muted-foreground">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {isConnected ? Math.round(tokenCount / Math.max(messageCount, 1)) : 0}
              </div>
              <div className="text-xs text-muted-foreground">Avg Tokens</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Model Info
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="font-medium text-sm">
              {getModelDisplayName(model)}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Live Audio
              </Badge>
              <Badge variant="outline" className="text-xs">
                Real-time
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Optimized for conversational AI with low latency
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
