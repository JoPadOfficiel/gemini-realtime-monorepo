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
            <MessageCircle className="h-5 w-5" />
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{getModeIcon()}</div>
            <h3 className="font-medium text-lg mb-2">No conversation yet</h3>
            <p className="text-muted-foreground text-sm">
              Start a session to begin your conversation with Gemini AI
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
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
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  onClick={onClearConversation}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 max-h-[500px] lg:max-h-[600px] w-full pr-4" ref={scrollAreaRef}>
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.type === 'thinking'
                      ? 'bg-purple-50 border border-purple-200'
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
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Current user message being transcribed */}
            {currentUserMessage && (
              <div className="flex gap-3 justify-end">
                <div className="max-w-[80%] rounded-lg p-3 bg-blue-100 border border-blue-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-blue-900">
                      {currentUserMessage}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-blue-600">
                      {formatTime(new Date())}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-blue-200 text-blue-800">
                      Speaking...
                    </Badge>
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}

            {/* Current thinking being processed */}
            {currentThinking && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <div className="max-w-[80%] rounded-lg p-3 bg-purple-100 border border-purple-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed italic text-purple-800">
                      {currentThinking}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-purple-600">
                      {formatTime(new Date())}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-purple-200 text-purple-800">
                      Thinking...
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Current assistant message being generated */}
            {currentAssistantMessage && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="max-w-[80%] rounded-lg p-3 bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-yellow-900">
                      {currentAssistantMessage}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-yellow-600">
                      {formatTime(new Date())}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-yellow-200 text-yellow-800">
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
