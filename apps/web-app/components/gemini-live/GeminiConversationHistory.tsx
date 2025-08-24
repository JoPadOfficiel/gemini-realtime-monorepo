'use client';

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, User, Bot, Trash2, Copy, Download } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'thinking' | 'text';
  timestamp: Date;
}

interface GeminiConversationHistoryProps {
  conversation: Message[];
  currentUserMessage?: string;
  currentAssistantMessage?: string;
  currentThinking?: string;
  onClearConversation?: () => void;
  mode?: 'audio' | 'video' | 'screen';
}

export function GeminiConversationHistory({ 
  conversation, 
  currentUserMessage, 
  currentAssistantMessage, 
  currentThinking,
  onClearConversation,
  mode = 'audio'
}: GeminiConversationHistoryProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation, currentUserMessage, currentAssistantMessage, currentThinking]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const exportConversation = () => {
    const conversationText = conversation.map(msg => 
      `[${formatTime(msg.timestamp)}] ${msg.role === 'user' ? 'You' : 'Gemini'}: ${msg.content}`
    ).join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'video':
        return '📹';
      case 'screen':
        return '🖥️';
      default:
        return '🎤';
    }
  };

  const hasContent = conversation.length > 0 || currentUserMessage || currentAssistantMessage || currentThinking;

  if (!hasContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-5" />
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mb-4 text-4xl">{getModeIcon()}</div>
            <h3 className="mb-2 text-lg font-medium">No conversation yet</h3>
            <p className="text-sm text-muted-foreground">
              Start a session to begin your conversation with Gemini AI
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-5" />
            Conversation History
            {conversation.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {conversation.length} messages
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {conversation.length > 0 && (
              <>
                <Button
                  onClick={exportConversation}
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  onClick={onClearConversation}
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="max-h-[500px] w-full flex-1 pr-4 lg:max-h-[600px]" ref={scrollAreaRef}>
          <div className="space-y-4 p-6">
            {/* Historical messages */}
            {conversation.map((message, index) => (
              <div
                key={index}
                className={`group flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.type === 'thinking'
                      ? 'border border-purple-200 bg-purple-50'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed ${
                        message.type === 'thinking' ? 'italic text-purple-800' : ''
                      }`}>
                        {message.content}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMessage(message.content)}
                      className="size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.type === 'thinking' && (
                      <Badge variant="secondary" className="text-xs">
                        Thinking
                      </Badge>
                    )}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="size-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Current user message being transcribed */}
            {currentUserMessage && (
              <div className="flex justify-end gap-3">
                <div className="max-w-[80%] rounded-lg border border-blue-200 bg-blue-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-blue-900">
                      {currentUserMessage}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-blue-600">
                      {formatTime(new Date())}
                    </span>
                    <Badge variant="secondary" className="bg-blue-200 text-xs text-blue-800">
                      Speaking...
                    </Badge>
                  </div>
                </div>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                  <User className="size-4 text-primary-foreground" />
                </div>
              </div>
            )}

            {/* Current thinking being processed */}
            {currentThinking && (
              <div className="flex justify-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Bot className="size-4 text-purple-600" />
                </div>
                <div className="max-w-[80%] rounded-lg border border-purple-200 bg-purple-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm italic leading-relaxed text-purple-800">
                      {currentThinking}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-purple-600">
                      {formatTime(new Date())}
                    </span>
                    <Badge variant="secondary" className="bg-purple-200 text-xs text-purple-800">
                      Thinking...
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Current assistant message being generated */}
            {currentAssistantMessage && (
              <div className="flex justify-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </div>
                <div className="max-w-[80%] rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-yellow-900">
                      {currentAssistantMessage}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-yellow-600">
                      {formatTime(new Date())}
                    </span>
                    <Badge variant="secondary" className="bg-yellow-200 text-xs text-yellow-800">
                      Speaking...
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
