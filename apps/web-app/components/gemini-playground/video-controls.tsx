"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Camera, CameraOff } from "lucide-react";

interface VideoControlsProps {
  isVideoEnabled: boolean;
  localVideoRef: RefObject<HTMLVideoElement>;
  onStartVideo: () => void;
  onStopVideo: () => void;
}

export function VideoControls({
  isVideoEnabled,
  localVideoRef,
  onStartVideo,
  onStopVideo,
}: VideoControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Video Controls
          {isVideoEnabled && <Badge variant="secondary">Active</Badge>}
        </CardTitle>
        <CardDescription>
          Enable your camera to share video with Gemini AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <VideoOff className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Camera is off
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Video Controls */}
        <div className="flex gap-2">
          {!isVideoEnabled ? (
            <Button onClick={onStartVideo} className="flex-1">
              <Video className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          ) : (
            <Button onClick={onStopVideo} variant="destructive" className="flex-1">
              <VideoOff className="mr-2 h-4 w-4" />
              Stop Camera
            </Button>
          )}
        </div>

        {/* Video Info */}
        {isVideoEnabled && (
          <div className="text-xs text-muted-foreground">
            <p>✅ Camera active - Gemini can see your video feed</p>
            <p>🔄 Real-time video processing enabled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
