'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, StopCircle, Camera, CameraOff, Mic, MicOff, BarChart3, MessageCircle, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { GeminiQuickActions } from './GeminiQuickActions';
import { GeminiConversationHistory } from './GeminiConversationHistory';
import { GeminiSettingsPopup } from './GeminiSettingsPopup';
import { base64ToFloat32Array, float32ToPcm16, GeminiApiService } from '@/lib/gemini-utils';

// Configuration constants
const BACKEND_URL = process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000';

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

interface GeminiVideoInterfaceProps {
  user?: any;
}

export function GeminiVideoInterface({ user }: GeminiVideoInterfaceProps) {
  // State management
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [currentThinking, setCurrentThinking] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [config, setConfig] = useState<Config>({
    systemPrompt: "You are a friendly Gemini 2.0 model with vision capabilities. Respond verbally and analyze what you see in the video feed. If the user speaks in French, respond in French. If the user speaks in English, respond in English. Adapt to the user's language automatically.",
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

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBuffer = useRef<Float32Array[]>([]);
  const isPlaying = useRef(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenPollingInterval = useRef<NodeJS.Timeout | null>(null);

  // API service instance
  const apiService = GeminiApiService.getInstance();

  // Start video stream
  const startVideoStream = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Start frame capture after video is loaded
        videoRef.current.onloadedmetadata = () => {
          // Start capturing frames every second for Gemini analysis
          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
          }, 1000);
        };
      }

      return stream;
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setError('Unable to access camera or microphone. Please check permissions.');
      throw error;
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraEnabled(prev => !prev);
    }
  }, []);

  // Toggle microphone
  const toggleMicrophone = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicEnabled(prev => !prev);
    }
  }, []);

  // Audio playback functions
  const playAudioData = useCallback(async (audioData: Float32Array) => {
    audioBuffer.current.push(audioData);
    if (!isPlaying.current) {
      playNextInQueue();
    }
  }, []);

  const playNextInQueue = useCallback(() => {
    if (audioBuffer.current.length === 0 || !audioContextRef.current) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const audioData = audioBuffer.current.shift()!;

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    const channelData = new Float32Array(audioData);
    buffer.copyToChannel(channelData, 0);

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

  // Stop current audio playback
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    isPlaying.current = false;
    audioBuffer.current = []; // Clear audio buffer
  }, []);

  // Token polling functions
  const startTokenPolling = useCallback(() => {
    if (tokenPollingInterval.current) return;

    tokenPollingInterval.current = setInterval(async () => {
      try {
        const tokenData = await apiService.getTokenUsage(clientId.current);
        setTokenCount(tokenData.total_tokens || 0);
      } catch (error) {
        console.error('Token polling failed:', error);
      }
    }, 5000);
  }, [apiService]);

  const stopTokenPolling = useCallback(() => {
    if (tokenPollingInterval.current) {
      clearInterval(tokenPollingInterval.current);
      tokenPollingInterval.current = null;
    }
  }, []);

  // Frame capture function for video analysis
  const captureAndSendFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to match video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert canvas to base64 image
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];

    // Send image data to Gemini via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'image',
      data: base64Image
    }));
  }, []);

  // Start streaming session
  const startStream = useCallback(async () => {
    try {
      setError(null);
      setIsStreaming(true);
      
      // Start video stream
      await startVideoStream();
      
      // Initialize audio context for processing
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });

      // Setup audio processing for microphone
      if (streamRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        processorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);

        processorRef.current.onaudioprocess = (e) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = float32ToPcm16(inputData);
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              data: base64Data
            }));
          }
        };

        source.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
      }

      // Connect to WebSocket with clientId
      setSessionId(clientId.current);

      const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/${clientId.current}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for video');
        setIsConnected(true);

        // Send configuration
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'config',
            config: config
          }));
        }

        // Start token polling
        startTokenPolling();

        // Add initial conversation message
        setConversation(prev => [...prev, {
          role: 'user',
          content: 'Started video conversation...',
          timestamp: new Date()
        }]);
      };
      
      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'user_transcription') {
          setCurrentUserMessage(data.content);
        } else if (data.type === 'assistant_transcription') {
          setCurrentAssistantMessage(data.content);
        } else if (data.type === 'thinking') {
          setCurrentThinking(data.content);
        } else if (data.type === 'conversation_update') {
          setConversation(prev => [...prev, data.message]);
          setCurrentUserMessage('');
          setCurrentAssistantMessage('');
          setCurrentThinking('');
        } else if (data.type === 'token_count') {
          setTokenCount(data.count);
        } else if (data.type === 'audio') {
          // Handle audio response from Gemini
          try {
            const audioData = base64ToFloat32Array(data.data);
            await playAudioData(audioData);
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        } else if (data.type === 'interruption' || data.interrupted) {
          // Handle interruption - immediately stop audio playback
          console.log('🔴 INTERRUPTION RECEIVED - Stopping audio playback');
          stopCurrentAudio();
        } else if (data.type === 'error') {
          setError(data.message);
        }
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
      console.error('Error starting video stream:', error);
      setIsStreaming(false);
    }
  }, [config, startVideoStream]);

  // Stop streaming session
  const stopStream = useCallback(() => {
    // Stop WebSocket connection
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop current audio playback
    stopCurrentAudio();

    // Stop token polling
    stopTokenPolling();

    // Stop video frame capture
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    // Stop media streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
    setCurrentUserMessage('');
    setCurrentAssistantMessage('');
    setCurrentThinking('');
    setIsCameraEnabled(true);
    setIsMicEnabled(true);
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
        currentMode="video"
        isStreaming={isStreaming}
        onStartVideo={startStream}
        onStop={stopStream}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Popup */}
      <GeminiSettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId="default-user"
        onSettingsChange={(settings) => {
          console.log('Settings updated:', settings);
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

      <div className="space-y-6">
        {/* Mobile/Tablet Layout */}
        <div className="lg:hidden space-y-6">
          {/* Video Controls */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Controls
                {isStreaming && (
                  <Badge variant="default" className="animate-pulse text-xs">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Video Display */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror effect
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={640}
                  height={480}
                />

                {/* Compact overlay controls */}
                {isStreaming && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
                    <Button
                      onClick={toggleMicrophone}
                      variant={isMicEnabled ? "default" : "destructive"}
                      size="sm"
                      className="rounded-full w-6 h-6 p-0"
                    >
                      {isMicEnabled ? (
                        <Mic className="h-3 w-3" />
                      ) : (
                        <MicOff className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      onClick={toggleCamera}
                      variant={isCameraEnabled ? "default" : "destructive"}
                      size="sm"
                      className="rounded-full w-6 h-6 p-0"
                    >
                      {isCameraEnabled ? (
                        <Camera className="h-3 w-3" />
                      ) : (
                        <CameraOff className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      onClick={stopStream}
                      variant="destructive"
                      size="sm"
                      className="rounded-full w-6 h-6 p-0"
                    >
                      <StopCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Compact Control Buttons */}
              {!isStreaming && (
                <div className="flex items-center justify-center">
                  <Button
                    onClick={startStream}
                    size="sm"
                    className="h-12 w-12 rounded-full"
                  >
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation History - Priority on Mobile */}
          <div className="h-[600px]">
            <GeminiConversationHistory
              conversation={conversation}
              currentUserMessage={currentUserMessage}
              currentAssistantMessage={currentAssistantMessage}
              currentThinking={currentThinking}
              onClearConversation={() => setConversation([])}
              mode="video"
            />
          </div>

          {/* Stats Grid on Mobile */}
          <div className="grid grid-cols-2 gap-4">
            {/* Session Status */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  {isConnected ? (
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                  )}
                  Session Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge
                  variant="secondary"
                  className={`${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} border-0 text-xs`}
                >
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </CardContent>
            </Card>

            {/* Token Usage */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <div className="text-sm font-bold">
                  {tokenCount.toLocaleString()}
                </div>
                <Progress value={(tokenCount / 1000000) * 100} className="h-1" />
              </CardContent>
            </Card>

            {/* Session Metrics */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <MessageCircle className="h-3 w-3" />
                  Session Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm font-bold">{conversation.length}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </CardContent>
            </Card>

            {/* Model Info */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2">
                  <Cpu className="h-3 w-3" />
                  Model Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm font-medium">
                  {config.model.replace('gemini-', '').replace('-preview', '').replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {/* Left Side - Controls and Stats */}
          <div className="lg:col-span-1 space-y-4">
          {/* Video Controls */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Controls
                {isStreaming && (
                  <Badge variant="default" className="animate-pulse text-xs">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Video Display */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror effect
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={640}
                  height={480}
                />

                {/* Compact overlay controls */}
                {isStreaming && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
                    <Button
                      onClick={toggleMicrophone}
                      variant={isMicEnabled ? "default" : "destructive"}
                      size="sm"
                      className="rounded-full w-6 h-6 p-0"
                    >
                      {isMicEnabled ? (
                        <Mic className="h-3 w-3" />
                      ) : (
                        <MicOff className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      onClick={toggleCamera}
                      variant={isCameraEnabled ? "default" : "destructive"}
                      size="sm"
                      className="rounded-full w-6 h-6 p-0"
                    >
                      {isCameraEnabled ? (
                        <Camera className="h-3 w-3" />
                      ) : (
                        <CameraOff className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Compact Control Button */}
              <div className="flex items-center justify-center">
                {!isStreaming ? (
                  <Button
                    onClick={startStream}
                    size="sm"
                    className="h-8 px-4 text-xs"
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button
                    onClick={stopStream}
                    variant="destructive"
                    size="sm"
                    className="h-8 px-4 text-xs"
                  >
                    <StopCircle className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Compact Status */}
              {isStreaming && (
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className={`${isCameraEnabled ? 'text-green-500' : 'text-red-500'}`}>
                      Cam: {isCameraEnabled ? 'On' : 'Off'}
                    </span>
                    <span className={`${isMicEnabled ? 'text-blue-500' : 'text-red-500'}`}>
                      Mic: {isMicEnabled ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Status */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {isConnected ? (
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                ) : (
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                )}
                Session Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Badge
                  variant="secondary"
                  className={`${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} border-0`}
                >
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                {sessionId && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {sessionId.slice(0, 8)}...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Token Usage */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Token Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  {tokenCount.toLocaleString()}
                </span>
                <Badge variant="outline" className="text-xs">
                  {((tokenCount / 1000000) * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={(tokenCount / 1000000) * 100} className="h-1.5" />
              <div className="text-xs text-muted-foreground">
                Limit: 1,000K
              </div>
            </CardContent>
          </Card>

          {/* Session Metrics */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Session Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold">{conversation.length}</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {isConnected ? Math.round(tokenCount / Math.max(conversation.length, 1)) : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Tokens</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Info */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Model Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="font-medium text-sm">
                  {config.model.replace('gemini-', '').replace('-preview', '').replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    Live Audio
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Real-time
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Right Side - Expanded Conversation */}
          <div className="lg:col-span-3 h-full">
            <GeminiConversationHistory
            conversation={conversation}
            currentUserMessage={currentUserMessage}
            currentAssistantMessage={currentAssistantMessage}
            currentThinking={currentThinking}
            onClearConversation={() => setConversation([])}
            mode="video"
          />
          </div>
        </div>
      </div>
    </div>
  );
}
