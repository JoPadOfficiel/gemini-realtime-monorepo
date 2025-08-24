'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Video, Monitor, Play, Square, Zap, Settings, Menu } from 'lucide-react';
import Link from 'next/link';

interface GeminiQuickActionsProps {
  currentMode: 'audio' | 'video' | 'screen';
  isStreaming: boolean;
  onStartAudio?: () => void;
  onStartVideo?: () => void;
  onStartScreen?: () => void;
  onStop?: () => void;
  onOpenSettings?: () => void;
}

export function GeminiQuickActions({
  currentMode,
  isStreaming,
  onStartAudio,
  onStartVideo,
  onStartScreen,
  onStop,
  onOpenSettings
}: GeminiQuickActionsProps) {
  
  const modes = [
    {
      id: 'audio' as const,
      name: 'Audio Chat',
      description: 'Voice conversation with AI',
      icon: Mic,
      href: '/dashboard/gemini-live/audio',
      color: 'bg-blue-500',
      onStart: onStartAudio
    },
    {
      id: 'video' as const,
      name: 'Video Chat',
      description: 'Camera-powered conversation',
      icon: Video,
      href: '/dashboard/gemini-live/video',
      color: 'bg-green-500',
      onStart: onStartVideo
    },
    {
      id: 'screen' as const,
      name: 'Screen Share',
      description: 'Share your screen with AI',
      icon: Monitor,
      href: '/dashboard/gemini-live/screen',
      color: 'bg-purple-500',
      onStart: onStartScreen
    }
  ];



  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-5" />
              Quick Actions
              {isStreaming && (
                <Badge variant="default" className="animate-pulse">
                  Session Active
                </Badge>
              )}
            </div>
            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="flex items-center gap-2"
              >
                <Settings className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      <CardContent>
        {/* Desktop and Tablet View */}
        <div className="hidden grid-cols-1 gap-4 sm:grid md:grid-cols-3">
          {modes.map((mode) => {
            const isCurrentMode = mode.id === currentMode;
            const Icon = mode.icon;
            
            return (
              <div key={mode.id} className="relative">
                <Card className={`cursor-pointer transition-all hover:shadow-md ${
                  isCurrentMode ? 'ring-2 ring-primary' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center space-y-3 text-center">
                      <div className={`rounded-full p-3 ${mode.color} text-white`}>
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">{mode.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {mode.description}
                        </p>
                      </div>
                      
                      {isCurrentMode ? (
                        <div className="w-full space-y-2">
                          {!isStreaming ? (
                            <Button 
                              onClick={mode.onStart}
                              className="w-full"
                              size="sm"
                            >
                              <Play className="mr-2 size-4" />
                              Start Session
                            </Button>
                          ) : (
                            <Button 
                              onClick={onStop}
                              variant="destructive"
                              className="w-full"
                              size="sm"
                            >
                              <Square className="mr-2 size-4" />
                              Stop Session
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Link href={mode.href} className="w-full">
                          <Button 
                            variant="outline"
                            className="w-full"
                            size="sm"
                            disabled={isStreaming}
                          >
                            Switch to {mode.name}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {isCurrentMode && (
                  <Badge 
                    variant="default" 
                    className="absolute -right-2 -top-2 text-xs"
                  >
                    Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile View - Compact Layout */}
        <div className="block space-y-3 sm:hidden">
          {/* Current Active Mode */}
          {(() => {
            const currentModeData = modes.find(mode => mode.id === currentMode);
            if (!currentModeData) return null;

            const Icon = currentModeData.icon;

            return (
              <Card className="ring-2 ring-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`rounded-full p-2 ${currentModeData.color} text-white`}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{currentModeData.name}</h3>
                        <p className="text-xs text-muted-foreground">{currentModeData.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="text-xs">Active</Badge>
                      {!isStreaming ? (
                        <Button
                          onClick={currentModeData.onStart}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Play className="size-3" />
                          <span className="text-xs">Start</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={onStop}
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Square className="size-3" />
                          <span className="text-xs">Stop</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Other Modes - Compact */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Switch Mode</h4>
            <div className="grid grid-cols-2 gap-2">
              {modes.filter(mode => mode.id !== currentMode).map((mode) => {
                const Icon = mode.icon;

                return (
                  <Link key={mode.id} href={mode.href}>
                    <Card className="cursor-pointer transition-all hover:shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className={`rounded-full p-1.5 ${mode.color} text-white`}>
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-xs font-medium">{mode.name}</h3>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
