'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

import { Settings, Volume2, Globe, Mic, Search, Brain, Save, X, Cpu } from 'lucide-react';

const VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"];

const LANGUAGES = [
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

interface UserSettings {
  user_id: string;
  voice: string;
  language: string;
  enable_proactive_audio: boolean;
  enable_affective_dialog: boolean;
  enable_vad: boolean;
  enable_google_search: boolean;
}

interface GeminiSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSettingsChange?: (settings: UserSettings) => void;
  availableModels?: any[];
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

export function GeminiSettingsPopup({
  isOpen,
  onClose,
  userId = 'default-user',
  onSettingsChange,
  availableModels = [],
  currentModel,
  onModelChange
}: GeminiSettingsPopupProps) {
  const [settings, setSettings] = useState<UserSettings>({
    user_id: userId,
    voice: "Puck",
    language: "auto",
    enable_proactive_audio: false,
    enable_affective_dialog: false,
    enable_vad: true,
    enable_google_search: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadUserSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/users/${userId}/settings`);

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        console.log('✅ User settings loaded:', data);
      } else {
        console.warn('⚠️ Failed to load user settings, using defaults');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      toast.error("Failed to load user settings");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load user settings when popup opens
  useEffect(() => {
    if (isOpen) {
      loadUserSettings();
    }
  }, [isOpen, userId, loadUserSettings]);

  const saveUserSettings = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/users/${userId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Settings saved successfully!");
        onSettingsChange?.(settings);
        console.log('✅ User settings saved:', settings);
        onClose();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    setSettings({
      user_id: userId,
      voice: "Puck",
      language: "auto",
      enable_proactive_audio: false,
      enable_affective_dialog: false,
      enable_vad: true,
      enable_google_search: true
    });
  };

  if (!isOpen) return null;

  const popupContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed top-4 right-4 z-50 w-full max-w-md max-h-[90vh] bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-6 pb-3 border-b border-border bg-background rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <h2 className="text-lg font-semibold">User Settings</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs w-fit mt-2">
              Configurable by User
            </Badge>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Settings className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading settings...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Model Selection - First Priority */}
                {availableModels.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="model-select" className="flex items-center gap-2 text-sm font-medium">
                      <Cpu className="h-4 w-4" />
                      AI Model
                    </Label>
                    <Select
                      value={currentModel}
                      onValueChange={(value) => onModelChange?.(value)}
                    >
                      <SelectTrigger id="model-select" className="h-9">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        {availableModels.map((model, index) => {
                          // Handle both user-specific models and global models
                          const modelId = model.model_id || model.id;
                          const modelName = model.name || modelId?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                          const isDefault = model.is_default || model.recommended;

                          return (
                            <SelectItem key={`${modelId}-${index}`} value={modelId}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{modelName}</span>
                                {isDefault && (
                                  <Badge variant="secondary" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                                {model.warning && (
                                  <Badge variant="destructive" className="text-xs">
                                    {model.warning}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose the AI model for your conversations
                    </p>
                  </div>
                )}

                {/* Voice Selection */}
                <div className="space-y-2">
                  <Label htmlFor="voice-select" className="flex items-center gap-2 text-sm font-medium">
                    <Volume2 className="h-4 w-4" />
                    Voice Selection
                  </Label>
                  <Select
                    value={settings.voice}
                    onValueChange={(value) => updateSetting('voice', value)}
                  >
                    <SelectTrigger id="voice-select" className="h-9">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {VOICES.map((voice) => (
                        <SelectItem key={voice} value={voice}>
                          {voice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the voice for Gemini&apos;s audio responses
                  </p>
                </div>

                {/* Language Selection */}
                <div className="space-y-2">
                  <Label htmlFor="language-select" className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4" />
                    Language
                  </Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => updateSetting('language', value)}
                  >
                    <SelectTrigger id="language-select" className="h-9">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Primary language for conversation and transcription
                  </p>
                </div>

                {/* Audio Features */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Audio Features</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="proactive-audio" className="flex items-center gap-2 text-sm">
                        <Volume2 className="h-3 w-3" />
                        Proactive Audio
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Allow Gemini to speak proactively without being prompted
                      </p>
                    </div>
                    <Switch
                      id="proactive-audio"
                      checked={settings.enable_proactive_audio}
                      onCheckedChange={(checked) => updateSetting('enable_proactive_audio', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="affective-dialog" className="flex items-center gap-2 text-sm">
                        <Brain className="h-3 w-3" />
                        Affective Dialog
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enable emotional and expressive responses
                      </p>
                    </div>
                    <Switch
                      id="affective-dialog"
                      checked={settings.enable_affective_dialog}
                      onCheckedChange={(checked) => updateSetting('enable_affective_dialog', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="vad" className="flex items-center gap-2 text-sm">
                        <Mic className="h-3 w-3" />
                        Voice Activity Detection
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically detect when you start and stop speaking
                      </p>
                    </div>
                    <Switch
                      id="vad"
                      checked={settings.enable_vad}
                      onCheckedChange={(checked) => updateSetting('enable_vad', checked)}
                    />
                  </div>
                </div>

                {/* Integration Features */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Integration Features</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="google-search" className="flex items-center gap-2 text-sm">
                        <Search className="h-3 w-3" />
                        Google Search Integration
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Allow Gemini to search the web for current information
                      </p>
                    </div>
                    <Switch
                      id="google-search"
                      checked={settings.enable_google_search}
                      onCheckedChange={(checked) => updateSetting('enable_google_search', checked)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="flex-shrink-0 border-t border-border bg-background rounded-b-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={isSaving}
                  size="sm"
                >
                  Reset to Defaults
                </Button>

                <Button
                  onClick={saveUserSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  {isSaving ? (
                    <Settings className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Utiliser un Portal pour s'assurer que le popup est rendu au bon endroit
  return typeof window !== 'undefined' ? createPortal(popupContent, document.body) : null;
}
