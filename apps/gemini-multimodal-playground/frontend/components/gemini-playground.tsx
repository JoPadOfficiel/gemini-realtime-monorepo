'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Video, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base64ToFloat32Array, float32ToPcm16, GeminiApiService } from '@/lib/utils';

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

export default function GeminiVoiceChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [config, setConfig] = useState<Config>({
    systemPrompt: "You are a friendly Gemini 2.0 model. Respond verbally in a casual, helpful tone.",
    voice: "Puck",
    model: "gemini-live-2.5-flash-preview",
    language: "auto",
    googleSearch: true,
    allowInterruptions: false,
    enableAffectiveDialog: false,
    enableProactiveAudio: false,
    enableThinking: false,
    enableVAD: true
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputRef = useRef<any>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const [videoEnabled, setVideoEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatMode, setChatMode] = useState<'audio' | 'video' | null>(null);
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | null>(null);
  const [tokenCount, setTokenCount] = useState(0);
  const [modelLimits, setModelLimits] = useState<any>(null);
  const [conversation, setConversation] = useState<Array<{role: string, content: string, type?: string}>>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [currentThinking, setCurrentThinking] = useState('');

  // API Service and polling for hybrid architecture
  const [apiService] = useState(() => GeminiApiService.getInstance());
  const [tokenPollingInterval, setTokenPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Available models
  const models = [
    {
      id: "gemini-live-2.5-flash-preview",
      name: "Gemini Live 2.5 Flash (Recommended)",
      type: "half_cascade",
      recommended: true,
      limits: "3 sessions, 1M TPM (Free)"
    },
    {
      id: "gemini-2.5-flash-preview-native-audio-dialog",
      name: "Gemini 2.5 Flash Native Audio Dialog",
      type: "native_audio",
      recommended: false,
      limits: "⚠️ 1 session, 25K TPM (Free)",
      warning: "Very restrictive limits"
    },
    {
      id: "gemini-2.5-flash-exp-native-audio-thinking-dialog",
      name: "Gemini 2.5 Flash Native Audio Thinking",
      type: "native_audio",
      recommended: false,
      limits: "⚠️ 1 session, 10K TPM (Free)",
      warning: "Extremely restrictive limits"
    }
  ];

  // Available voices (expanded list)
  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"];

  // Available languages
  const languages = [
    { code: "auto", name: "Auto-detect" },
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "fr-FR", name: "French" },
    { code: "es-ES", name: "Spanish" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "ja-JP", name: "Japanese" },
    { code: "ko-KR", name: "Korean" },
    { code: "cmn-CN", name: "Chinese (Mandarin)" },
    { code: "hi-IN", name: "Hindi" },
    { code: "ar-XA", name: "Arabic" },
    { code: "ru-RU", name: "Russian" }
  ];
  let audioBuffer: Float32Array[] = []
  let isPlaying = false

  // Token polling functions for hybrid architecture
  const startTokenPolling = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const tokenData = await apiService.getTokenUsage(clientId.current);
        setTokenCount(tokenData.total_tokens);
        setModelLimits(tokenData.limits);
      } catch (error) {
        console.error('Token polling failed:', error);
      }
    }, 5000); // Poll every 5 seconds

    setTokenPollingInterval(interval);
  }, [apiService]);

  const stopTokenPolling = useCallback(() => {
    if (tokenPollingInterval) {
      clearInterval(tokenPollingInterval);
      setTokenPollingInterval(null);
    }
  }, [tokenPollingInterval]);

  const startStream = async (mode: 'audio' | 'camera' | 'screen') => {

    if (mode !== 'audio') {
      setChatMode('video');
    } else {
      setChatMode('audio');
    }

    wsRef.current = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`);
    
    wsRef.current.onopen = async () => {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        config: config
      }));
      
      await startAudioStream();

      if (mode !== 'audio') {
        setVideoEnabled(true);
        setVideoSource(mode)
      }

      setIsStreaming(true);
      setIsConnected(true);

      // Start token polling for hybrid architecture
      startTokenPolling();

      // Add initial user message to conversation only if not already added
      setConversation(prev => {
        const hasStartMessage = prev.some(msg =>
          msg.content.includes('Started') && msg.content.includes('conversation')
        );
        if (!hasStartMessage) {
          return [...prev, {
            role: 'user',
            content: `Started ${mode} conversation...`
          }];
        }
        return prev;
      });
    };

    wsRef.current.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'audio') {
        const audioData = base64ToFloat32Array(response.data);
        playAudioData(audioData);
      } else if (response.type === 'text') {
        const textData = response.data || response.text || '';
        // Accumulate text fragments in currentAssistantMessage
        setCurrentAssistantMessage(prev => prev + textData);
        setText(prev => prev + textData + '\n');
      } else if (response.type === 'thinking') {
        const thinkingData = response.data || '';
        // Add each thinking fragment as a separate message immediately
        if (thinkingData.trim()) {
          setConversation(prev => [...prev, { role: 'assistant', content: thinkingData.trim(), type: 'thinking' }]);
        }
      } else if (response.type === 'user_message') {
        // Add complete user message from accumulated transcription
        const messageData = response.data || '';
        if (messageData.trim()) {
          setConversation(prev => [...prev, { role: 'user', content: messageData.trim() }]);
        }
      } else if (response.type === 'assistant_message') {
        // Add complete assistant message from accumulated transcription
        const messageData = response.data || '';
        if (messageData.trim()) {
          setConversation(prev => [...prev, { role: 'assistant', content: messageData.trim() }]);
        }
      } else if (response.type === 'interruption' || response.interrupted) {
        // Handle interruption - immediately stop audio playback
        console.log('🔴 INTERRUPTION RECEIVED - Stopping audio playback');
        stopCurrentAudio();
        clearAudioBuffer();
      } else if (response.type === 'turn_complete') {
        // When turn is complete, just clear any remaining accumulated text
        if (currentAssistantMessage.trim()) {
          setConversation(prev => [...prev, { role: 'assistant', content: currentAssistantMessage.trim() }]);
          setCurrentAssistantMessage(''); // Reset for next message
        }
        // Clear thinking state (thinking messages are added immediately)
        setCurrentThinking('');
        setCurrentUserMessage(''); // Clear user message state
      }
      // Token usage now handled by REST API polling - removed WebSocket handling
    };

    wsRef.current.onerror = (error) => {
      setError('WebSocket error: ' + error.message);
      setIsStreaming(false);
    };

    wsRef.current.onclose = () => {
      setIsStreaming(false);
    };
  };

  // Initialize audio context and stream
  const startAudioStream = async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Required by Gemini
      });

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio input node
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);
      
      processor.onaudioprocess = (e) => {
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

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      audioInputRef.current = { source, processor, stream };
      setIsStreaming(true);
    } catch (err) {
      setError('Failed to access microphone: ' + err.message);
    }
  };

  // Stop streaming
  const stopStream = () => {
    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach(track => track.stop());
      audioInputRef.current = null;
    }

    if (chatMode === 'video') {
      setVideoEnabled(false);
      setVideoSource(null);

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
    }

    // stop ongoing audio playback
    stopCurrentAudio();
    clearAudioBuffer();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
    setChatMode(null);

    // Stop token polling for hybrid architecture
    stopTokenPolling();

    // Keep conversation history but clear current text and accumulated messages
    setText('');
    setCurrentAssistantMessage('');
    setCurrentUserMessage('');
    setCurrentThinking('');
  };

  const playAudioData = async (audioData) => {
    audioBuffer.push(audioData)
    if (!isPlaying) {
      playNextInQueue(); // Start playback if not already playing
      }
    }

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioBuffer.length == 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true
    const audioData = audioBuffer.shift()

    if (!audioData) {
      isPlaying = false;
      return;
    }

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    // Store reference to current audio source for interruption
    currentAudioSourceRef.current = source;

    source.onended = () => {
      currentAudioSourceRef.current = null;
      playNextInQueue()
    }
    source.start();
  };

  // Function to stop current audio playback immediately
  const stopCurrentAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current = null;
        console.log('✅ Current audio stopped');
      } catch (error) {
        console.log('Audio already stopped or error stopping:', error);
      }
    }
    isPlaying = false;
  };

  // Function to clear audio buffer
  const clearAudioBuffer = () => {
    audioBuffer.length = 0;
    console.log('✅ Audio buffer cleared');
  };

  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      const startVideo = async () => {
        try {
          let stream;
          if (videoSource === 'camera') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 320 }, height: { ideal: 240 } }
            });
          } else if (videoSource === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
          }
          
          videoRef.current.srcObject = stream;
          videoStreamRef.current = stream;
          
          // Start frame capture after video is playing
          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
          }, 1000);

        } catch (err) {
          console.error('Video initialization error:', err);
          setError('Failed to access camera/screen: ' + err.message);

          if (videoSource === 'screen') {
            // Reset chat mode and clean up any existing connections
            setChatMode(null);
            stopStream();
          }

          setVideoEnabled(false);
          setVideoSource(null);
        }
      };

      startVideo();

      // Cleanup function
      return () => {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => track.stop());
          videoStreamRef.current = null;
        }
        if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
        }
      };
    }
  }, [videoEnabled, videoSource]);

  // Frame capture function
  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    wsRef.current.send(JSON.stringify({
      type: 'image',
      data: base64Image
    }));
  };

  // Toggle video function
  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Gemini 2.0 Realtime Playground ✨</h1>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Token Usage and Limits */}
        {(tokenCount > 0 || modelLimits) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Token Usage & Model Limits
                {modelLimits?.warning && (
                  <span className="text-red-500 text-sm">⚠️ {modelLimits.warning}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{tokenCount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Tokens Used</div>
                </div>
                {modelLimits && (
                  <>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{modelLimits.free_tier?.sessions || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Max Sessions (Free)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {modelLimits.free_tier?.tpm ? (modelLimits.free_tier.tpm / 1000).toLocaleString() + 'K' : 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">TPM Limit (Free)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{modelLimits.free_tier?.rpd || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">RPD Limit (Free)</div>
                    </div>
                  </>
                )}
              </div>
              {modelLimits && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="text-sm">
                    <strong>Model:</strong> {modelLimits.name}
                    {modelLimits.recommended === false && (
                      <span className="ml-2 text-red-600 font-semibold">⚠️ Not Recommended for Heavy Use</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              <Select
                value={config.model}
                onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}
                disabled={isConnected}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            model.recommended ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {model.recommended ? '✅ Recommended' : '⚠️ Limited'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            model.type === 'native_audio' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {model.type === 'native_audio' ? 'Native Audio' : 'Half-Cascade'}
                          </span>
                        </div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.limits}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language-select">Language</Label>
              <Select
                value={config.language}
                onValueChange={(value) => setConfig(prev => ({ ...prev, language: value }))}
                disabled={isConnected}
              >
                <SelectTrigger id="language-select">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                disabled={isConnected}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select
                value={config.voice}
                onValueChange={(value) => setConfig(prev => ({ ...prev, voice: value }))}
                disabled={isConnected}
              >
                <SelectTrigger id="voice-select">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="google-search"
                  checked={config.googleSearch}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, googleSearch: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="google-search">Google Search</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="affective-dialog"
                  checked={config.enableAffectiveDialog}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enableAffectiveDialog: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="affective-dialog">Affective Dialog</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proactive-audio"
                  checked={config.enableProactiveAudio}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enableProactiveAudio: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="proactive-audio">Proactive Audio</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vad"
                  checked={config.enableVAD}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enableVAD: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="vad">
                  Voice Activity Detection
                  <span className="text-xs text-muted-foreground ml-1">(Enables interruption)</span>
                </Label>
              </div>


            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          {!isStreaming && (
            <>
            <Button
              onClick={() => startStream('audio')}
              disabled={isStreaming}
              className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Start Chatting
          </Button>

          <Button
            onClick={() => startStream('camera')}
            disabled={isStreaming}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
              Start Chatting with Video
            </Button>
          
          <Button
            onClick={() => startStream('screen')}
            disabled={isStreaming}
            className="gap-2"
          >
            <Monitor className="h-4 w-4" />
              Start Chatting with Screen
            </Button>
          </>

            
          )}

          {isStreaming && (
            <Button
              onClick={stopStream}
              variant="destructive"
              className="gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop Chat
            </Button>
          )}
        </div>

        {isStreaming && (
          <Card>
            <CardContent className="flex items-center justify-center h-24 mt-6">
              <div className="flex flex-col items-center gap-2">
                <Mic className="h-8 w-8 text-blue-500 animate-pulse" />
                <p className="text-gray-600">Listening...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {(chatMode === 'video') && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Video Input</h2>
              </div>
              
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={320}
                  height={240}
                  className="w-full h-full object-contain"
                  //style={{ transform: 'scaleX(-1)' }}
                  style={{ transform: videoSource === 'camera' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={640}
                  height={480}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {(text || conversation.length > 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Conversation:</h2>
                {conversation.length > 0 && (
                  <Button
                    onClick={() => setConversation([])}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Clear History
                  </Button>
                )}
              </div>

              {/* Show conversation history */}
              {conversation.length > 0 && (
                <div className="space-y-3 mb-4">
                  {conversation.map((message, index) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-50 border-l-4 border-blue-400'
                        : message.type === 'thinking'
                        ? 'bg-purple-50 border-l-4 border-purple-400'
                        : 'bg-green-50 border-l-4 border-green-400'
                    }`}>
                      <div className="text-sm font-medium text-gray-600 mb-1">
                        {message.role === 'user'
                          ? '👤 You'
                          : message.type === 'thinking'
                          ? '🧠 Gemini (réflexion)'
                          : '🤖 Gemini'
                        }
                      </div>
                      <div className={`text-gray-800 ${message.type === 'thinking' ? 'italic text-purple-800' : ''}`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show current user message being transcribed */}
              {currentUserMessage && (
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-blue-100 border-l-4 border-blue-300">
                    <div className="text-sm font-medium text-gray-600 mb-1">
                      👤 You <span className="text-xs text-blue-600">(speaking...)</span>
                    </div>
                    <div className="text-gray-800">{currentUserMessage}</div>
                  </div>
                </div>
              )}

              {/* Show current thinking being processed */}
              {currentThinking && (
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-purple-100 border-l-4 border-purple-300">
                    <div className="text-sm font-medium text-gray-600 mb-1">
                      🧠 Gemini <span className="text-xs text-purple-600">(réflexion...)</span>
                    </div>
                    <div className="text-gray-800 italic text-purple-800">{currentThinking}</div>
                  </div>
                </div>
              )}

              {/* Show current assistant message being typed */}
              {currentAssistantMessage && (
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-yellow-50 border-l-4 border-yellow-400">
                    <div className="text-sm font-medium text-gray-600 mb-1">
                      🤖 Gemini <span className="text-xs text-yellow-600">(speaking...)</span>
                    </div>
                    <div className="text-gray-800">{currentAssistantMessage}</div>
                  </div>
                </div>
              )}


            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}