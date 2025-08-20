'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Settings, Volume2, Globe, Mic, Search, Brain, CheckCircle, AlertTriangle, Save, X } from 'lucide-react';

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
}

export function GeminiSettingsPopup({ isOpen, onClose, userId = 'default-user', onSettingsChange }: GeminiSettingsPopupProps) {
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load user settings when popup opens
  useEffect(() => {
    if (isOpen) {
      loadUserSettings();
    }
  }, [isOpen, userId]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadUserSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8000/api/users/${userId}/settings`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        console.log('✅ User settings loaded:', data);
      } else {
        console.warn('⚠️ Failed to load user settings, using defaults');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      setError('Failed to load user settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`http://localhost:8000/api/users/${userId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        onSettingsChange?.(settings);
        console.log('✅ User settings saved:', settings);
        
        // Auto-close popup after successful save
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      setError('Failed to save settings');
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed top-4 right-4 z-50 w-full max-w-md bg-background border rounded-lg shadow-xl">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                User Settings
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs w-fit">
              Configurable by User
            </Badge>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Settings className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
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
                      <SelectContent>
                        {VOICES.map((voice) => (
                          <SelectItem key={voice} value={voice}>
                            {voice}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose the voice for Gemini's audio responses
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
                      <SelectContent>
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

                  {/* Success/Error Messages */}
                  {(success || error) && (
                    <div className="space-y-2">
                      {success && (
                        <Alert className="border-green-200 bg-green-50">
                          <AlertDescription className="text-green-800">
                            ✅ {success}
                          </AlertDescription>
                        </Alert>
                      )}
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            ❌ {error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
