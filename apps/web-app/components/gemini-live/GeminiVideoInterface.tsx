'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, StopCircle, Camera, CameraOff, Mic, MicOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GeminiQuickActions } from './GeminiQuickActions';
import { GeminiConversationHistory } from './GeminiConversationHistory';
import { GeminiSessionStats } from './GeminiSessionStats';
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Controls
                {isStreaming && (
                  <Badge variant="default" className="animate-pulse">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Display */}
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
                
                {/* Video overlay controls */}
                {isStreaming && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                    <Button
                      onClick={toggleMicrophone}
                      variant={isMicEnabled ? "default" : "destructive"}
                      size="sm"
                      className="rounded-full w-10 h-10 p-0"
                    >
                      {isMicEnabled ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <MicOff className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      onClick={toggleCamera}
                      variant={isCameraEnabled ? "default" : "destructive"}
                      size="sm"
                      className="rounded-full w-10 h-10 p-0"
                    >
                      {isCameraEnabled ? (
                        <Camera className="h-4 w-4" />
                      ) : (
                        <CameraOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Main Control Button */}
              <div className="flex items-center justify-center">
                {!isStreaming ? (
                  <Button
                    onClick={startStream}
                    size="lg"
                    className="h-16 px-8"
                  >
                    <Video className="h-6 w-6 mr-2" />
                    Start Video Chat
                  </Button>
                ) : (
                  <Button
                    onClick={stopStream}
                    variant="destructive"
                    size="lg"
                    className="h-16 px-8"
                  >
                    <StopCircle className="h-6 w-6 mr-2" />
                    Stop Video Chat
                  </Button>
                )}
              </div>

              {/* Status Information */}
              {isStreaming && (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">
                        Camera: {isCameraEnabled ? 'On' : 'Off'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">
                        Mic: {isMicEnabled ? 'On' : 'Off'}
                      </span>
                    </div>
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
            currentThinking={currentThinking}
            onClearConversation={() => setConversation([])}
            mode="video"
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
