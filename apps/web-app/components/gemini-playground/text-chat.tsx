"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Bot, User } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "gemini";
  content: string;
  timestamp: Date;
}

interface TextChatProps {
  websocket: WebSocket | null;
  isConnected: boolean;
}

export function TextChat({ websocket, isConnected }: TextChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!inputValue.trim() || !websocket || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Send to Gemini backend
    websocket.send(JSON.stringify({
      type: "text",
      data: inputValue.trim()
    }));

    setInputValue("");
    setIsTyping(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Listen for WebSocket messages
  useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === "text") {
          const geminiMessage: Message = {
            id: Date.now().toString(),
            type: "gemini",
            content: message.data,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, geminiMessage]);
          setIsTyping(false);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    websocket.addEventListener("message", handleMessage);
    
    return () => {
      websocket.removeEventListener("message", handleMessage);
    };
  }, [websocket]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Text Chat
          {isConnected && <Badge variant="secondary">Connected</Badge>}
        </CardTitle>
        <CardDescription>
          Chat with Gemini AI using text messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <ScrollArea className="h-96 w-full rounded-md border p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground">
                <Bot className="mx-auto h-8 w-8 mb-2" />
                <p>Start a conversation with Gemini AI</p>
                <p className="text-xs">Type a message below to begin</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[80%] gap-2 ${
                      message.type === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.type === "user" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <User className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.type === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Type your message to Gemini..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputValue.trim() || !isConnected}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Status */}
        <div className="text-xs text-muted-foreground">
          {isConnected ? (
            <p>✅ Connected to Gemini - Ready to chat</p>
          ) : (
            <p>❌ Not connected - Connect to Gemini first</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
