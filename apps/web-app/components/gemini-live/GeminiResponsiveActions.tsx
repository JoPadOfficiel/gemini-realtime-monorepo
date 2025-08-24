'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Mic, 
  Video, 
  Monitor, 
  Play, 
  Menu,
  Settings,
  Zap
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  buttonText: string;
  buttonIcon: React.ReactNode;
}

interface GeminiResponsiveActionsProps {
  currentMode: 'audio' | 'video' | 'screen';
  onStartSession?: () => void;
  onOpenSettings?: () => void;
  isConnected?: boolean;
}

export function GeminiResponsiveActions({ 
  currentMode, 
  onStartSession, 
  onOpenSettings,
  isConnected = false 
}: GeminiResponsiveActionsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'audio',
      title: 'Audio Chat',
      description: 'Voice conversation with AI',
      icon: <Mic className="size-5" />,
      href: '/dashboard/gemini-live/audio',
      isActive: currentMode === 'audio',
      buttonText: currentMode === 'audio' ? 'Start Session' : 'Switch to Audio Chat',
      buttonIcon: currentMode === 'audio' ? <Play className="size-4" /> : <Mic className="size-4" />
    },
    {
      id: 'video',
      title: 'Video Chat',
      description: 'Camera-powered conversation',
      icon: <Video className="size-5" />,
      href: '/dashboard/gemini-live/video',
      isActive: currentMode === 'video',
      buttonText: currentMode === 'video' ? 'Start Session' : 'Switch to Video Chat',
      buttonIcon: currentMode === 'video' ? <Play className="size-4" /> : <Video className="size-4" />
    },
    {
      id: 'screen',
      title: 'Screen Share',
      description: 'Share your screen with AI',
      icon: <Monitor className="size-5" />,
      href: '/dashboard/gemini-live/screen',
      isActive: currentMode === 'screen',
      buttonText: currentMode === 'screen' ? 'Start Session' : 'Switch to Screen Share',
      buttonIcon: currentMode === 'screen' ? <Play className="size-4" /> : <Monitor className="size-4" />
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    if (action.isActive && onStartSession) {
      onStartSession();
    }
    setIsSheetOpen(false);
  };

  const ActionCard = ({ action }: { action: QuickAction }) => (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${action.isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {action.icon}
            <div>
              <h3 className="text-sm font-medium">{action.title}</h3>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {action.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
            {action.isActive ? (
              <Button 
                size="sm" 
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-1"
              >
                {action.buttonIcon}
                <span className="hidden sm:inline">{action.buttonText}</span>
              </Button>
            ) : (
              <Link href={action.href || '#'}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {action.buttonIcon}
                  <span className="hidden sm:inline">{action.buttonText}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="size-4" />
              <span className="text-sm font-medium">Quick Actions</span>
            </div>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tablet View */}
      <div className="hidden md:block lg:hidden">
        <Card>
          <CardContent className="p-3">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="size-4" />
              <span className="text-sm font-medium">Quick Actions</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action) => (
                <div key={action.id} className={`rounded-lg border p-3 transition-all hover:shadow-sm ${action.isActive ? 'bg-primary/5 ring-2 ring-primary' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {action.icon}
                      <div>
                        <h3 className="text-sm font-medium">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {action.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                      {action.isActive ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleActionClick(action)}
                          className="flex items-center gap-1"
                        >
                          {action.buttonIcon}
                          <span className="text-xs">{action.buttonText}</span>
                        </Button>
                      ) : (
                        <Link href={action.href || '#'}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            {action.buttonIcon}
                            <span className="text-xs">{action.buttonText}</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile View - Sheet */}
      <div className="block md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4" />
            <span className="text-sm font-medium">Quick Actions</span>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Menu className="size-4" />
                <span className="text-xs">Actions</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="size-5" />
                  Quick Actions
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {quickActions.map((action) => (
                  <ActionCard key={action.id} action={action} />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Current Active Mode Display */}
        <Card className="mb-4">
          <CardContent className="p-3">
            {(() => {
              const activeAction = quickActions.find(a => a.isActive);
              return activeAction ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {activeAction.icon}
                    <div>
                      <h3 className="text-sm font-medium">{activeAction.title}</h3>
                      <p className="text-xs text-muted-foreground">{activeAction.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleActionClick(activeAction)}
                      className="flex items-center gap-1"
                    >
                      {activeAction.buttonIcon}
                      <span className="text-xs">Start</span>
                    </Button>
                  </div>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
