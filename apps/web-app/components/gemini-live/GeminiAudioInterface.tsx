'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Settings, Volume2, VolumeX, BarChart3, MessageCircle, Cpu, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base64ToFloat32Array, float32ToPcm16, GeminiApiService } from '@/lib/gemini-utils';
import { GeminiQuickActions } from './GeminiQuickActions';
import { GeminiConversationHistory } from './GeminiConversationHistory';
import { GeminiSessionStats } from './GeminiSessionStats';
import { GeminiSettingsPopup } from './GeminiSettingsPopup';

interface Config {
  systemPrompt: string;
  voice: string;
  model: string;
  language: string;
  googleSearch: boolean;
  allowInterruptions: boolean;
  enableAffectiveDialog: boolean;
  enableProactiveAudio: boolean;
  enableThinking: boolean;
  enableVAD: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'thinking' | 'text';
  timestamp: Date;
}

interface GeminiAudioInterfaceProps {
  user?: any;
}

export function GeminiAudioInterface({ user }: GeminiAudioInterfaceProps) {
  // State management
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  const [config, setConfig] = useState<Config>({
    systemPrompt: "You are a friendly Gemini 2.0 model. Respond verbally in a casual, helpful tone. If the user speaks in French, respond in French. If the user speaks in English, respond in English. Adapt to the user's language automatically.",
    voice: "Puck",
    model: "gemini-live-2.5-flash-preview",
    language: "fr-FR",
    googleSearch: true,
    allowInterruptions: true,
    enableAffectiveDialog: true,
    enableProactiveAudio: true,
    enableThinking: false,
    enableVAD: true
  });

  // Load user settings on component mount
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`http://localhost:8000/api/users/${user.id}/settings`);
        if (response.ok) {
          const userSettings = await response.json();
          console.log('🔧 Loading user settings:', userSettings);

          // Update config with user settings
          setConfig(prev => ({
            ...prev,
            voice: userSettings.voice || prev.voice,
            language: userSettings.language || prev.language,
            enableProactiveAudio: userSettings.enable_proactive_audio ?? prev.enableProactiveAudio,
            enableAffectiveDialog: userSettings.enable_affective_dialog ?? prev.enableAffectiveDialog,
            enableVAD: userSettings.enable_vad ?? prev.enableVAD,
            googleSearch: userSettings.enable_google_search ?? prev.googleSearch
          }));
        }
      } catch (error) {
        console.warn('⚠️ Failed to load user settings:', error);
      }
    };

    loadUserSettings();
  }, [user?.id]);

  // Load available models on component mount
  useEffect(() => {
    const loadAvailableModels = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingModels(true);

        // First, try to get user-specific model access
        const userModelsResponse = await fetch(`http://localhost:8000/api/admin/users/${user.id}/models`);
        let userModels = [];

        if (userModelsResponse.ok) {
          const userModelData = await userModelsResponse.json();
          console.log('🔧 User-specific models raw:', userModelData);

          // Extract models from the response format and filter enabled ones
          if (userModelData && userModelData.model_access) {
            userModels = userModelData.model_access.filter((model: any) => model.enabled);
            console.log('🔧 Extracted user models:', userModelData.model_access);
            console.log('🔧 Filtered enabled models:', userModels);
          }
        }

        // If no user-specific models, get global models
        if (userModels.length === 0) {
          const globalModelsResponse = await fetch('http://localhost:8000/api/admin/models');
          if (globalModelsResponse.ok) {
            const globalModels = await globalModelsResponse.json();
            // Filter only enabled models
            userModels = globalModels.filter((model: any) => model.enabled);
            console.log('🔧 Global enabled models:', userModels);
          }
        }

        setAvailableModels(userModels);

        // Set default model if available
        if (userModels.length > 0) {
          console.log('🔧 Available models structure:', userModels);

          // Find default model (look for is_default: true or recommended: true)
          const defaultModel = userModels.find((m: any) => m.is_default || m.recommended) || userModels[0];
          console.log('🔧 Selected default model:', defaultModel);

          if (defaultModel && defaultModel.model_id) {
            setConfig(prev => ({
              ...prev,
              model: defaultModel.model_id
            }));
            console.log('🔧 Default model set to:', defaultModel.model_id);
          }
        }

      } catch (error) {
        console.warn('⚠️ Failed to load available models:', error);
        // Fallback to default model
        setAvailableModels([{
          id: "gemini-live-2.5-flash-preview",
          name: "Gemini Live 2.5 Flash (Fallback)",
          enabled: true
        }]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadAvailableModels();
  }, [user?.id]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const audioBuffer = useRef<Float32Array[]>([]);
  const isPlaying = useRef(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const tokenPollingInterval = useRef<NodeJS.Timeout | null>(null);

  // API service instance
  const apiService = GeminiApiService.getInstance();

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, []);

  // Token polling for hybrid architecture (WebSocket + REST API)
  const startTokenPolling = useCallback(() => {
    if (tokenPollingInterval.current) return;

    tokenPollingInterval.current = setInterval(async () => {
      try {
        const tokenData = await apiService.getTokenUsage(clientId.current);
        setTokenCount(tokenData.total_tokens || 0);
      } catch (error) {
        console.error('Token polling failed:', error);
      }
    }, 5000); // Poll every 5 seconds
  }, [apiService]);

  const stopTokenPolling = useCallback(() => {
    if (tokenPollingInterval.current) {
      clearInterval(tokenPollingInterval.current);
      tokenPollingInterval.current = null;
    }
  }, []);

  // Start audio stream
  const startAudioStream = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      micStreamRef.current = stream;

      // Create audio context for analysis and processing (Gemini requires 16kHz)
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      analyserRef.current = audioContextRef.current.createAnalyser();

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Create processor for sending audio data
      processorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = float32ToPcm16(inputData);
          // Convert to base64 and send as binary
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Data
          }));
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      analyserRef.current.fftSize = 256;
      startAudioLevelMonitoring();
      
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Unable to access microphone. Please check permissions.');
      throw error;
    }
  }, [startAudioLevelMonitoring]);

  // Audio playback functions
  const playAudioData = useCallback(async (audioData: Float32Array) => {
    audioBuffer.current.push(audioData);
    if (!isPlaying.current) {
      playNextInQueue();
    }
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (!audioContextRef.current || audioBuffer.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const audioData = audioBuffer.current.shift();

    if (!audioData) {
      isPlaying.current = false;
      return;
    }

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    currentAudioSourceRef.current = source;

    source.onended = () => {
      currentAudioSourceRef.current = null;
      playNextInQueue();
    };
    source.start();
  }, []);

  // Start streaming session
  const startStream = useCallback(async () => {
    try {
      setError(null);
      setIsStreaming(true);

      // Start audio stream
      await startAudioStream();

      // Connect to WebSocket with clientId
      setSessionId(clientId.current);

      const wsUrl = `${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL?.replace('http', 'ws') || 'ws://localhost:8000'}/ws/${clientId.current}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);

        // Send configuration with user_id
        if (wsRef.current) {
          const configWithUserId = {
            ...config,
            user_id: user?.id || 'default-user'
          };

          console.log('🔧 Sending config with user_id:', configWithUserId);

          wsRef.current.send(JSON.stringify({
            type: 'config',
            config: configWithUserId
          }));
        }

        // Start token polling for hybrid architecture
        startTokenPolling();

        // Add initial conversation message
        setConversation(prev => [...prev, {
          role: 'user',
          content: 'Started audio conversation...',
          timestamp: new Date()
        }]);
      };
      
      wsRef.current.onmessage = async (event) => {
        const response = JSON.parse(event.data);

        if (response.type === 'audio') {
          // Handle audio response from Gemini
          const audioData = base64ToFloat32Array(response.data);
          await playAudioData(audioData);
        } else if (response.type === 'text') {
          // Handle text fragments from Gemini
          const textData = response.data || response.text || '';
          setCurrentAssistantMessage(prev => prev + textData);
        } else if (response.type === 'thinking') {
          // Handle thinking fragments from Gemini
          const thinkingData = response.data || '';
          if (thinkingData.trim()) {
            setConversation(prev => [...prev, {
              role: 'assistant',
              content: thinkingData.trim(),
              type: 'thinking',
              timestamp: new Date()
            }]);
          }
        } else if (response.type === 'user_message') {
          // Add complete user message from accumulated transcription
          const messageData = response.data || '';
          if (messageData.trim()) {
            setConversation(prev => [...prev, {
              role: 'user',
              content: messageData.trim(),
              timestamp: new Date()
            }]);
          }
        } else if (response.type === 'assistant_message') {
          // Add complete assistant message from accumulated transcription
          const messageData = response.data || '';
          if (messageData.trim()) {
            setConversation(prev => [...prev, {
              role: 'assistant',
              content: messageData.trim(),
              timestamp: new Date()
            }]);
          }
        } else if (response.type === 'interruption' || response.interrupted) {
          // Handle interruption - immediately stop audio playback
          console.log('🔴 INTERRUPTION RECEIVED - Stopping audio playback');
          stopCurrentAudio();
        } else if (response.type === 'turn_complete') {
          // When turn is complete, add any remaining accumulated text
          if (currentAssistantMessage.trim()) {
            setConversation(prev => [...prev, {
              role: 'assistant',
              content: currentAssistantMessage.trim(),
              timestamp: new Date()
            }]);
            setCurrentAssistantMessage(''); // Reset for next message
          }
          setCurrentUserMessage(''); // Clear user message state
        } else if (response.type === 'error') {
          setError(response.message || 'An error occurred');
        }
        // Token usage now handled by REST API polling - removed WebSocket handling
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Error starting stream:', error);
      setIsStreaming(false);
    }
  }, [config, startAudioStream]);

  // Stop current audio playback
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    isPlaying.current = false;
    audioBuffer.current = []; // Clear audio buffer
  }, []);

  // Stop streaming session
  const stopStream = useCallback(() => {
    // Stop WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Stop audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop current audio playback
    stopCurrentAudio();

    // Stop token polling
    stopTokenPolling();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clear audio buffer
    audioBuffer.current = [];
    isPlaying.current = false;

    setIsStreaming(false);
    setIsConnected(false);
    setAudioLevel(0);
    setCurrentUserMessage('');
    setCurrentAssistantMessage('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}



      {/* Quick Actions */}
      <GeminiQuickActions
        currentMode="audio"
        isStreaming={isStreaming}
        onStartAudio={startStream}
        onStop={stopStream}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Popup */}
      <GeminiSettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={user?.id || 'default-user'}
        availableModels={availableModels}
        currentModel={config.model}
        onModelChange={(modelId) => {
          setConfig(prev => ({ ...prev, model: modelId }));
          console.log('🔧 Model changed to:', modelId);
        }}
        onSettingsChange={(settings) => {
          console.log('✅ Settings updated:', settings);
          // Update config with new settings
          setConfig(prev => ({
            ...prev,
            voice: settings.voice,
            language: settings.language,
            enableProactiveAudio: settings.enable_proactive_audio,
            enableAffectiveDialog: settings.enable_affective_dialog,
            enableVAD: settings.enable_vad,
            googleSearch: settings.enable_google_search
          }));
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Audio Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Audio Controls
                {isStreaming && (
                  <Badge variant="default" className="animate-pulse">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Control Button */}
              <div className="flex items-center justify-center">
                {!isStreaming ? (
                  <Button
                    onClick={startStream}
                    size="lg"
                    className="h-20 w-20 rounded-full"
                  >
                    <Mic className="h-8 w-8" />
                  </Button>
                ) : (
                  <Button
                    onClick={stopStream}
                    variant="destructive"
                    size="lg"
                    className="h-20 w-20 rounded-full"
                  >
                    <StopCircle className="h-8 w-8" />
                  </Button>
                )}
              </div>

              {/* Audio Level Indicator */}
              {isStreaming && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audio Level</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(audioLevel)} / 255
                    </span>
                  </div>
                  <Progress value={(audioLevel / 255) * 100} className="h-2" />
                </div>
              )}

              {/* Status Information */}
              {isStreaming && (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">Listening...</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Model: {config.model.replace('gemini-', '').replace('-preview', '')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          <GeminiConversationHistory 
            conversation={conversation}
            currentUserMessage={currentUserMessage}
            currentAssistantMessage={currentAssistantMessage}
            onClearConversation={() => setConversation([])}
          />
        </div>

        {/* Session Statistics */}
        <div className="space-y-6">
          <GeminiSessionStats
            tokenCount={tokenCount}
            sessionId={sessionId}
            isConnected={isConnected}
            messageCount={conversation.length}
            model={config.model}
          />
        </div>
      </div>
    </div>
  );
}
