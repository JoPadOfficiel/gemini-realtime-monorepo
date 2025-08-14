'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Video, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base64ToFloat32Array, float32ToPcm16 } from '@/lib/utils';

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
  enableTranscription: boolean;
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
    enableVAD: true,
    enableTranscription: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioInputRef = useRef(null);
  const clientId = useRef(crypto.randomUUID());
  const [videoEnabled, setVideoEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatMode, setChatMode] = useState<'audio' | 'video' | null>(null);
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | null>(null);

  // Available models
  const models = [
    { id: "gemini-live-2.5-flash-preview", name: "Gemini Live 2.5 Flash (Half-Cascade)", type: "half_cascade" },
    { id: "gemini-2.0-flash-live-001", name: "Gemini 2.0 Flash Live (Half-Cascade)", type: "half_cascade" },
    { id: "gemini-2.5-flash-preview-native-audio-dialog", name: "Gemini 2.5 Flash Native Audio Dialog", type: "native_audio" },
    { id: "gemini-2.5-flash-exp-native-audio-thinking-dialog", name: "Gemini 2.5 Flash Native Audio Thinking", type: "native_audio" }
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
  let audioBuffer = []
  let isPlaying = false

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
    };

    wsRef.current.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'audio') {
        const audioData = base64ToFloat32Array(response.data);
        playAudioData(audioData);
      } else if (response.type === 'text') {
        setText(prev => prev + response.text + '\n');
      }
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

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      playNextInQueue()
    }
    source.start();
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
      stopVideo();
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
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          model.type === 'native_audio' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {model.type === 'native_audio' ? 'Native Audio' : 'Half-Cascade'}
                        </span>
                        {model.name}
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
                  id="thinking-mode"
                  checked={config.enableThinking}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enableThinking: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="thinking-mode">Thinking Mode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vad"
                  checked={config.enableVAD}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enableVAD: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="vad">Voice Activity Detection</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transcription"
                  checked={config.enableTranscription}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enableTranscription: checked as boolean }))}
                  disabled={isConnected}
                />
                <Label htmlFor="transcription">Audio Transcription</Label>
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

        {text && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2">Conversation:</h2>
              <pre className="whitespace-pre-wrap text-gray-700">{text}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}