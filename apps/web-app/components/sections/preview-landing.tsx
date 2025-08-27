"use client";

import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { cn } from "@/lib/utils";

export default function PreviewLanding() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  return (
    <div className="pb-6 sm:pb-16">
      <MaxWidthWrapper>
        <div className="rounded-xl md:bg-muted/30 md:p-3.5 md:ring-1 md:ring-inset md:ring-border">
          <div
            className="relative aspect-video overflow-hidden rounded-xl border md:rounded-lg cursor-pointer group"
            onClick={handleVideoClick}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <video
              ref={videoRef}
              className="size-full object-cover object-center"
              src="/_static/demo-arkely.mp4"
              preload="metadata"
              poster="/_static/poste-image-demo-arkely.png"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src="/_static/demo-arkely.mp4" type="video/mp4" />
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>

            {/* Overlay avec bouton play */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                isPlaying && !showControls ? "opacity-0" : "opacity-100"
              )}
            >
              <div className="relative">
                {/* Cercle de fond avec effet glassmorphism */}
                <div className="absolute inset-0 rounded-full bg-black/20 backdrop-blur-sm border border-white/20" />

                {/* Bouton play/pause */}
                <button
                  className={cn(
                    "relative flex items-center justify-center w-16 h-16 rounded-full",
                    "bg-white/90 hover:bg-white transition-all duration-200",
                    "shadow-lg hover:shadow-xl transform hover:scale-105",
                    "border border-gray-200/50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-gray-800 ml-0" />
                  ) : (
                    <Play className="w-6 h-6 text-gray-800 ml-1" />
                  )}
                </button>
              </div>
            </div>

            {/* Gradient overlay pour améliorer la lisibilité */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/10 to-transparent transition-opacity duration-300",
                isPlaying && !showControls ? "opacity-0" : "opacity-100"
              )}
            />
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
