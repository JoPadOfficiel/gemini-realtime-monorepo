'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Video, Monitor, Settings, Volume2, Brain, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Types for the new Gemini Live API
interface SessionConfig {
  model: string;
  response_modalities: string[];
  language_code?: string;
  voice_name?: string;
  system_instruction?: string;
  enable_affective_dialog: boolean;
  enable_proactive_audio: boolean;
  enable_thinking: boolean;
  enable_vad: boolean;
  vad_sensitivity_start: string;
  vad_sensitivity_end: string;
  enable_input_transcription: boolean;
  enable_output_transcription: boolean;
  enable_context_compression: boolean;
  enable_session_resumption: boolean;
  media_resolution: string;
}

interface SessionState {
  session_id?: string;
  is_connected: boolean;
  is_listening: boolean;
  is_speaking: boolean;
  is_interrupted: boolean;
  token_count: number;
  session_handle?: string;
}

interface AvailableModel {
  id: string;
  name: string;
  type: 'native_audio' | 'half_cascade';
  supports_thinking: boolean;
  supports_affective: boolean;
  supports_proactive: boolean;
}

export default function GeminiLivePlayground() {
  // Session state
  const [sessionState, setSessionState] = useState<SessionState>({
    is_connected: false,
    is_listening: false,
    is_speaking: false,
    is_interrupted: false,
    token_count: 0,
  });

  // Configuration state
  const [config, setConfig] = useState<SessionConfig>({
    model: "gemini-live-2.5-flash-preview",
    response_modalities: ["AUDIO"],
    system_instruction: "You are a helpful AI assistant. Respond in a friendly, conversational tone.",
    enable_affective_dialog: false,
    enable_proactive_audio: false,
    enable_thinking: false,
    enable_vad: true,
    vad_sensitivity_start: "START_SENSITIVITY_MEDIUM",
    vad_sensitivity_end: "END_SENSITIVITY_MEDIUM",
    enable_input_transcription: false,
    enable_output_transcription: false,
    enable_context_compression: false,
    enable_session_resumption: false,
    media_resolution: "MEDIA_RESOLUTION_MEDIUM",
  });

  // Available options
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [supportedLanguages, setSupportedLanguages] = useState<{code: string, name: string}[]>([]);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [outputTranscription, setOutputTranscription] = useState<string>('');
  const [chatMode, setChatMode] = useState<'audio' | 'video' | 'screen' | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    loadAvailableOptions();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:8000');
      
      wsRef.current.onopen = () => {
        console.log('Connected to Gemini Live API server');
        setError(null);
      };
      
      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect to server');
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setSessionState(prev => ({ ...prev, is_connected: false }));
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to create WebSocket connection');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    console.log('Received message:', message.type, message.data);
    
    switch (message.type) {
      case 'connected':
        console.log('Server connected');
        break;
        
      case 'session_created':
        setSessionState(prev => ({
          ...prev,
          session_id: message.data.session_id,
          is_connected: true,
        }));
        console.log('Session created:', message.data.session_id);
        break;
        
      case 'text_response':
        console.log('Text response:', message.data);
        break;
        
      case 'audio_response':
        playAudioResponse(message.data);
        break;
        
      case 'token_usage':
        setSessionState(prev => ({
          ...prev,
          token_count: message.data.total_tokens,
        }));
        break;
        
      case 'input_transcription':
        setTranscription(message.data.text);
        break;
        
      case 'output_transcription':
        setOutputTranscription(message.data.text);
        break;
        
      case 'interruption':
        setSessionState(prev => ({
          ...prev,
          is_interrupted: message.data.interrupted,
        }));
        break;
        
      case 'generation_complete':
        setSessionState(prev => ({
          ...prev,
          is_speaking: false,
        }));
        break;
        
      case 'turn_complete':
        console.log('Turn complete');
        break;
        
      case 'go_away':
        console.log('Server going away in:', message.data.time_left);
        setError(`Server disconnecting in ${message.data.time_left}ms`);
        break;
        
      case 'available_models':
        setAvailableModels(message.data.models);
        break;
        
      case 'available_voices':
        setAvailableVoices(message.data.voices);
        break;
        
      case 'supported_languages':
        setSupportedLanguages(message.data.languages);
        break;
        
      case 'error':
        setError(message.data.message);
        console.error('Server error:', message.data.message);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const loadAvailableOptions = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Load available models
      wsRef.current.send(JSON.stringify({
        type: 'get_available_models',
        data: {}
      }));
      
      // Load available voices for current model
      wsRef.current.send(JSON.stringify({
        type: 'get_available_voices',
        data: { model: config.model }
      }));
      
      // Load supported languages
      wsRef.current.send(JSON.stringify({
        type: 'get_supported_languages',
        data: {}
      }));
    } else {
      // Retry after connection is established
      setTimeout(loadAvailableOptions, 1000);
    }
  };

  const createSession = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'create_session',
        config: config
      }));
      
      console.log('Creating session with config:', config);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create session');
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      audioInputRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (sessionState.is_connected && wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          const pcmData = float32ToPcm16(inputData);
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          
          wsRef.current.send(JSON.stringify({
            type: 'send_audio',
            data: {
              audio: base64Data,
              mime_type: 'audio/pcm;rate=16000'
            }
          }));
        }
      };
      
      audioInputRef.current.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      setSessionState(prev => ({ ...prev, is_listening: true }));
      
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      setError('Failed to access microphone');
    }
  };

  const playAudioResponse = (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      audioContextRef.current.decodeAudioData(audioArray.buffer)
        .then(audioBuffer => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current!.destination);
          source.start();
          
          setSessionState(prev => ({ ...prev, is_speaking: true }));
          
          source.onended = () => {
            setSessionState(prev => ({ ...prev, is_speaking: false }));
          };
        })
        .catch(error => {
          console.error('Failed to decode audio:', error);
        });
        
    } catch (error) {
      console.error('Failed to play audio response:', error);
    }
  };

  const startChat = async (mode: 'audio' | 'video' | 'screen') => {
    setChatMode(mode);
    setError(null);
    
    // Create session first
    await createSession();
    
    // Start audio capture
    await startAudioCapture();
    
    // Start video capture if needed
    if (mode === 'video') {
      await startVideoCapture('camera');
    } else if (mode === 'screen') {
      await startVideoCapture('screen');
    }
  };

  const startVideoCapture = async (source: 'camera' | 'screen') => {
    try {
      let stream: MediaStream;
      
      if (source === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { width: 1280, height: 720 } 
        });
      }
      
      videoStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Capture video frames and send to backend
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        
        videoIntervalRef.current = setInterval(() => {
          if (videoRef.current && ctx && sessionState.is_connected) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64Data = (reader.result as string).split(',')[1];
                  
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      type: 'send_image',
                      data: {
                        image: base64Data,
                        mime_type: 'image/jpeg'
                      }
                    }));
                  }
                };
                reader.readAsDataURL(blob);
              }
            }, 'image/jpeg', 0.8);
          }
        }, 1000); // Send frame every second
      }
      
    } catch (error) {
      console.error('Failed to start video capture:', error);
      setError(`Failed to access ${source}`);
    }
  };

  const stopChat = () => {
    // Stop audio
    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop video
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    
    // Disconnect session
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'disconnect',
        data: {}
      }));
    }
    
    setChatMode(null);
    setSessionState({
      is_connected: false,
      is_listening: false,
      is_speaking: false,
      is_interrupted: false,
      token_count: 0,
    });
  };

  const sendTextMessage = () => {
    if (!sessionState.is_connected || !wsRef.current) {
      setError('No active session');
      return;
    }
    
    const textToSend = (document.getElementById('text-input') as HTMLTextAreaElement)?.value;
    if (!textToSend.trim()) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'send_text',
      data: { text: textToSend }
    }));
    
    (document.getElementById('text-input') as HTMLTextAreaElement).value = '';
  };

  const updateConfig = (key: keyof SessionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Update available voices when model changes
    if (key === 'model' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_available_voices',
        data: { model: value }
      }));
    }
  };

  const getModelBadgeColor = (model: AvailableModel) => {
    if (model.type === 'native_audio') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusColor = () => {
    if (sessionState.is_interrupted) return 'text-red-500';
    if (sessionState.is_speaking) return 'text-blue-500';
    if (sessionState.is_listening) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Gemini Live API Playground</h1>
          <p className="text-muted-foreground">
            Test the latest Gemini Live API with native audio models and advanced features
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Session Status
              {sessionState.session_id && (
                <Badge variant="outline">ID: {sessionState.session_id.slice(-8)}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`font-semibold ${sessionState.is_connected ? 'text-green-500' : 'text-red-500'}`}>
                  {sessionState.is_connected ? 'Connected' : 'Disconnected'}
                </div>
                <div className="text-sm text-muted-foreground">Connection</div>
              </div>
              <div className="text-center">
                <div className={`font-semibold ${getStatusColor()}`}>
                  {sessionState.is_listening ? 'Listening' : 
                   sessionState.is_speaking ? 'Speaking' : 
                   sessionState.is_interrupted ? 'Interrupted' : 'Idle'}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{sessionState.token_count}</div>
                <div className="text-sm text-muted-foreground">Tokens</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{config.model.split('-').pop()}</div>
                <div className="text-sm text-muted-foreground">Model</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Model Selection */}
            <div className="space-y-2">
              <Label>Model</Label>
              <Select 
                value={config.model} 
                onValueChange={(value) => updateConfig('model', value)}
                disabled={sessionState.is_connected}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <Badge className={getModelBadgeColor(model)}>
                          {model.type}
                        </Badge>
                        {model.name}
                        {model.supports_thinking && <Brain className="h-4 w-4" />}
                        {model.supports_affective && <Heart className="h-4 w-4" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select 
                value={config.voice_name || ''} 
                onValueChange={(value) => updateConfig('voice_name', value)}
                disabled={sessionState.is_connected}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Select 
                value={config.language_code || ''} 
                onValueChange={(value) => updateConfig('language_code', value)}
                disabled={sessionState.is_connected}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Instruction */}
            <div className="space-y-2">
              <Label>System Instruction</Label>
              <Textarea
                value={config.system_instruction || ''}
                onChange={(e) => updateConfig('system_instruction', e.target.value)}
                disabled={sessionState.is_connected}
                placeholder="Enter system instructions..."
                rows={3}
              />
            </div>

            {/* Advanced Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="affective"
                  checked={config.enable_affective_dialog}
                  onCheckedChange={(checked) => updateConfig('enable_affective_dialog', checked)}
                  disabled={sessionState.is_connected}
                />
                <Label htmlFor="affective" className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  Affective Dialog
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proactive"
                  checked={config.enable_proactive_audio}
                  onCheckedChange={(checked) => updateConfig('enable_proactive_audio', checked)}
                  disabled={sessionState.is_connected}
                />
                <Label htmlFor="proactive" className="flex items-center gap-1">
                  <Volume2 className="h-4 w-4" />
                  Proactive Audio
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="thinking"
                  checked={config.enable_thinking}
                  onCheckedChange={(checked) => updateConfig('enable_thinking', checked)}
                  disabled={sessionState.is_connected}
                />
                <Label htmlFor="thinking" className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  Thinking Mode
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transcription"
                  checked={config.enable_input_transcription}
                  onCheckedChange={(checked) => updateConfig('enable_input_transcription', checked)}
                  disabled={sessionState.is_connected}
                />
                <Label htmlFor="transcription">Input Transcription</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Controls */}
        <Card>
          <CardContent className="pt-6">
            {!sessionState.is_connected ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={() => startChat('audio')} className="h-16">
                  <Mic className="mr-2 h-5 w-5" />
                  Start Audio Chat
                </Button>
                <Button onClick={() => startChat('video')} className="h-16">
                  <Video className="mr-2 h-5 w-5" />
                  Start Video Chat
                </Button>
                <Button onClick={() => startChat('screen')} className="h-16">
                  <Monitor className="mr-2 h-5 w-5" />
                  Start Screen Chat
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button onClick={stopChat} variant="destructive" className="w-full h-16">
                  <StopCircle className="mr-2 h-5 w-5" />
                  Stop Chat
                </Button>
                
                {/* Text Input */}
                <div className="space-y-2">
                  <Label>Send Text Message</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="text-input"
                      placeholder="Type a message..."
                      rows={2}
                    />
                    <Button onClick={sendTextMessage}>Send</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcriptions */}
        {(transcription || outputTranscription) && (
          <Card>
            <CardHeader>
              <CardTitle>Transcriptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {transcription && (
                <div>
                  <Label>Your Speech:</Label>
                  <div className="p-3 bg-muted rounded-md">{transcription}</div>
                </div>
              )}
              {outputTranscription && (
                <div>
                  <Label>Gemini Response:</Label>
                  <div className="p-3 bg-muted rounded-md">{outputTranscription}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Video Display */}
        {chatMode !== 'audio' && (
          <Card>
            <CardHeader>
              <CardTitle>Video Input</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full max-w-md mx-auto rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
