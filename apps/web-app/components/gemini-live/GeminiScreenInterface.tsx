'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, StopCircle, Mic, MicOff, Share, Square, BarChart3, MessageCircle, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

interface GeminiScreenInterfaceProps {
  user?: any;
}

export function GeminiScreenInterface({ user }: GeminiScreenInterfaceProps) {
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
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  
  const [config, setConfig] = useState<Config>({
    systemPrompt: "You are a friendly Gemini 2.0 model with screen analysis capabilities. Respond verbally and analyze what you see on the shared screen. If the user speaks in French, respond in French. If the user speaks in English, respond in English. Adapt to the user's language automatically.",
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

  // Load user settings on component mount
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`${BACKEND_URL}/api/users/${user.id}/settings`);
        if (response.ok) {
          const userSettings = await response.json();
          console.log('🔧 Loading user settings for screen share:', userSettings);

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
        console.warn('⚠️ Failed to load user settings for screen share:', error);
      }
    };

    loadUserSettings();
  }, [user?.id]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      setError(null);
      
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser');
      }
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false // We'll get audio separately from microphone
      });

      // Get microphone audio separately
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Combine screen video with microphone audio
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      streamRef.current = combinedStream;

      // Set screen sharing state FIRST so video element exists
      setIsScreenSharing(true);
      console.log('🎥 Screen sharing state set to true');

      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream; // Only show screen video
          console.log('🎥 Video element srcObject set:', screenStream);

          // Start frame capture after video is loaded
          videoRef.current.onloadedmetadata = () => {
            console.log('🎥 Video metadata loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
            // Start capturing frames every second for Gemini analysis
            videoIntervalRef.current = setInterval(() => {
              captureAndSendFrame();
            }, 1000);
          };

          // Add additional event listeners for debugging
          videoRef.current.oncanplay = () => {
            console.log('🎥 Video can play');
          };

          videoRef.current.onplaying = () => {
            console.log('🎥 Video is playing');
          };
        } else {
          console.error('🎥 Video element still not available after state update');
        }
      }, 100);

      // Handle screen share end
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          console.log('Screen sharing ended by user');
          setIsScreenSharing(false);
          stopStream();
        });
      }

      return combinedStream;
    } catch (error) {
      console.error('Error accessing screen/microphone:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Screen sharing permission denied. Please allow screen sharing and try again.');
        } else if (error.name === 'NotSupportedError') {
          setError('Screen sharing is not supported in this browser.');
        } else {
          setError(`Unable to start screen sharing: ${error.message}`);
        }
      } else {
        setError('Unable to start screen sharing. Please check permissions.');
      }
      throw error;
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

  // Frame capture function for screen share analysis
  const captureAndSendFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) {
      console.log('🖼️ Missing refs for frame capture:', {
        canvas: !!canvasRef.current,
        video: !!videoRef.current,
        ws: !!wsRef.current
      });
      return;
    }
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('🖼️ WebSocket not open for frame capture');
      return;
    }

    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) {
        console.log('🖼️ No canvas context available');
        return;
      }

      // Check if video has valid dimensions
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        // Only log once to avoid spam
        if (!videoRef.current.dataset.dimensionLogged) {
          console.log('🖼️ Video has no dimensions yet:', {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          });
          videoRef.current.dataset.dimensionLogged = 'true';
        }
        return;
      }

      // Set canvas dimensions to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(videoRef.current, 0, 0);

      // Convert canvas to base64 image
      const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];

      if (!base64Image) {
        console.log('🖼️ Failed to generate base64 image');
        return;
      }

      // Log only first successful capture
      if (videoRef.current.videoWidth > 0) {
        console.log('🖼️ Frame capture successful:', {
          dimensions: `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`,
          dataSize: base64Image.length
        });
      }

      // Send image data to Gemini via WebSocket
      wsRef.current.send(JSON.stringify({
        type: 'image',
        data: base64Image
      }));
    } catch (error) {
      console.error('🖼️ Error capturing frame:', error);
    }
  }, []);

  // Start streaming session
  const startStream = useCallback(async () => {
    try {
      setError(null);
      setIsStreaming(true);

      // Start screen sharing
      const stream = await startScreenShare();
      if (!stream) {
        throw new Error('Failed to start screen sharing');
      }
      
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

            // Convert to base64 using a more robust method
            const uint8Array = new Uint8Array(pcmData.buffer);
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binaryString += String.fromCharCode(uint8Array[i] || 0);
            }
            const base64Data = btoa(binaryString);

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
        console.log('WebSocket connected for screen sharing');
        setIsConnected(true);

        // Send configuration with user_id
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'config',
            config: {
              ...config,
              user_id: user?.id || 'default-user'
            }
          }));
        }

        // Start token polling
        startTokenPolling();

        // Add initial conversation message
        setConversation(prev => [...prev, {
          role: 'user',
          content: 'Started screen sharing conversation...',
          timestamp: new Date()
        }]);
      };
      
      wsRef.current.onmessage = async (event) => {
        const response = JSON.parse(event.data);

        if (response.type === 'audio') {
          // Handle audio response from Gemini
          try {
            const audioData = base64ToFloat32Array(response.data);
            await playAudioData(audioData);
          } catch (error) {
            console.error('Error playing audio:', error);
          }
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
          // Handle interruption - immediately stop audio playbook
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
        } else if (response.type === 'token_count') {
          setTokenCount(response.count);
        } else if (response.type === 'error') {
          setError(response.message || 'An error occurred');
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
      console.error('Error starting screen share:', error);
      setIsStreaming(false);
      setIsScreenSharing(false);
    }
  }, [config, startScreenShare]);

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
    setIsScreenSharing(false);
    setCurrentUserMessage('');
    setCurrentAssistantMessage('');
    setCurrentThinking('');
    setIsMicEnabled(true);
  }, [stopCurrentAudio, stopTokenPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Load available models
  useEffect(() => {
    const loadAvailableModels = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingModels(true);

        // First, try to get user-specific model access
        const userModelsResponse = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/admin/users/${user.id}/models`);
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
          const globalModelsResponse = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/admin/models`);
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
        currentMode="screen"
        isStreaming={isStreaming}
        onStartScreen={startStream}
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
          console.log('✅ Screen share settings updated:', settings);
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
        <div className="space-y-6 lg:hidden">
          {/* Screen Share Controls */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Monitor className="size-4" />
                Screen Share
                {isStreaming && (
                  <Badge variant="default" className="animate-pulse text-xs">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Screen Display */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                {isScreenSharing ? (
                  <>
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <Monitor className="mx-auto mb-2 size-8 text-green-500" />
                        <p className="text-xs text-green-500">
                          Screen sharing active
                        </p>
                        <p className="text-xs text-muted-foreground">
                          View on desktop for preview
                        </p>
                      </div>
                    </div>

                    {/* Compact overlay controls */}
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
                      <Button
                        onClick={toggleMicrophone}
                        variant={isMicEnabled ? "default" : "destructive"}
                        size="sm"
                        className="size-6 rounded-full p-0"
                      >
                        {isMicEnabled ? (
                          <Mic className="size-3" />
                        ) : (
                          <MicOff className="size-3" />
                        )}
                      </Button>

                      <Button
                        onClick={stopStream}
                        variant="destructive"
                        size="sm"
                        className="size-6 rounded-full p-0"
                      >
                        <StopCircle className="size-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Monitor className="mx-auto mb-2 size-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        No screen shared
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Control Buttons */}
              {!isStreaming && (
                <div className="flex items-center justify-center">
                  <Button
                    onClick={startStream}
                    size="sm"
                    className="size-12 rounded-full"
                  >
                    <Share className="size-5" />
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
              mode="screen"
            />
          </div>

          {/* Stats Grid on Mobile */}
          <div className="grid grid-cols-2 gap-4">
            {/* Session Status */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-medium">
                  {isConnected ? (
                    <div className="size-2 rounded-full bg-green-500"></div>
                  ) : (
                    <div className="size-2 rounded-full bg-red-500"></div>
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
                <CardTitle className="flex items-center gap-2 text-xs font-medium">
                  <BarChart3 className="size-3" />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                <div className="text-sm font-bold">
                  {tokenCount.toLocaleString()}
                </div>
                <Progress value={(tokenCount / 1000000) * 100} className="h-1" />
              </CardContent>
            </Card>

            {/* Session Metrics */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-medium">
                  <MessageCircle className="size-3" />
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
                <CardTitle className="flex items-center gap-2 text-xs font-medium">
                  <Cpu className="size-3" />
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
        <div className="hidden gap-6 lg:grid lg:grid-cols-4">
          {/* Left Side - Controls and Stats */}
          <div className="space-y-4 lg:col-span-1">
          {/* Screen Share Controls */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Monitor className="size-4" />
                Screen Share
                {isStreaming && (
                  <Badge variant="default" className="animate-pulse text-xs">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Screen Display */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">

                {isScreenSharing ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="size-full object-contain"
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                      width={640}
                      height={480}
                    />

                    {/* Compact overlay controls */}
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
                      <Button
                        onClick={toggleMicrophone}
                        variant={isMicEnabled ? "default" : "destructive"}
                        size="sm"
                        className="size-6 rounded-full p-0"
                      >
                        {isMicEnabled ? (
                          <Mic className="size-3" />
                        ) : (
                          <MicOff className="size-3" />
                        )}
                      </Button>

                      <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                        <Share className="mr-1 size-2" />
                        Sharing
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Monitor className="mx-auto mb-2 size-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        No screen shared
                      </p>
                    </div>
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
                    <Monitor className="mr-1 size-3" />
                    Start
                  </Button>
                ) : (
                  <Button
                    onClick={stopStream}
                    variant="destructive"
                    size="sm"
                    className="h-8 px-4 text-xs"
                  >
                    <Square className="mr-1 size-3" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Compact Status */}
              {isStreaming && (
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className={`${isScreenSharing ? 'text-blue-500' : 'text-red-500'}`}>
                      Screen: {isScreenSharing ? 'On' : 'Off'}
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                {isConnected ? (
                  <div className="size-2 rounded-full bg-green-500"></div>
                ) : (
                  <div className="size-2 rounded-full bg-red-500"></div>
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
                  <div className="font-mono text-xs text-muted-foreground">
                    {sessionId.slice(0, 8)}...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Token Usage */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="size-4" />
                Token Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <MessageCircle className="size-4" />
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Cpu className="size-4" />
                Model Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {config.model.replace('gemini-', '').replace('-preview', '').replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </div>
                <div className="flex flex-wrap items-center gap-1">
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
          <div className="h-full lg:col-span-3">
            <GeminiConversationHistory
            conversation={conversation}
            currentUserMessage={currentUserMessage}
            currentAssistantMessage={currentAssistantMessage}
            currentThinking={currentThinking}
            onClearConversation={() => setConversation([])}
            mode="screen"
          />
          </div>
        </div>
      </div>
    </div>
  );
}
