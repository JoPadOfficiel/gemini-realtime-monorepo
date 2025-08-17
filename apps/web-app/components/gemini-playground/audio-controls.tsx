"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface AudioControlsProps {
  isAudioEnabled: boolean;
  onToggleAudio: (enabled: boolean) => void;
  websocket: WebSocket | null;
}

export function AudioControls({
  isAudioEnabled,
  onToggleAudio,
  websocket,
}: AudioControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && websocket?.readyState === WebSocket.OPEN) {
          // Convert audio data to base64 and send to backend
          const reader = new FileReader();
          reader.onload = () => {
            const audioData = reader.result as string;
            websocket.send(JSON.stringify({
              type: "audio_chunk",
              data: audioData.split(',')[1] // Remove data:audio/webm;base64, prefix
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorderRef.current.start(100); // Send chunks every 100ms
      setIsRecording(true);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setAudioLevel(0);
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
      
      if (isRecording) {
        requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Audio Controls
          {isAudioEnabled && <Badge variant="secondary">Enabled</Badge>}
          {isRecording && <Badge variant="default">Recording</Badge>}
        </CardTitle>
        <CardDescription>
          Enable microphone to speak with Gemini AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Enable Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="audio-enabled"
            checked={isAudioEnabled}
            onCheckedChange={onToggleAudio}
          />
          <Label htmlFor="audio-enabled">Enable Audio Input</Label>
        </div>

        {/* Recording Controls */}
        {isAudioEnabled && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {!isRecording ? (
                <Button onClick={startRecording} disabled={!websocket}>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive">
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="space-y-2">
                <Label className="text-xs">Audio Level</Label>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel / 255 * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Audio Status */}
            <div className="text-xs text-muted-foreground">
              {isRecording ? (
                <p>🎤 Recording audio - Gemini is listening</p>
              ) : (
                <p>🔇 Audio recording stopped</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
