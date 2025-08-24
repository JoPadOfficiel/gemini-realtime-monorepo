'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Settings, Volume2, Globe, Mic, Search, Brain, CheckCircle, AlertTriangle, Save } from 'lucide-react';

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

interface GeminiUserSettingsProps {
  userId?: string;
  onSettingsChange?: (settings: UserSettings) => void;
}

export function GeminiUserSettings({ userId = 'default-user', onSettingsChange }: GeminiUserSettingsProps) {
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

  const loadUserSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/users/${userId}/settings`);

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        console.log('✅ User settings loaded:', data);
      } else {
        // Use default settings if API call fails
        console.warn('⚠️ Failed to load user settings, using defaults');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      setError('Failed to load user settings');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load user settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, [userId, loadUserSettings]);

  const saveUserSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/users/${userId}/settings`, {
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          User Settings
          <Badge variant="secondary" className="text-xs">
            Configurable by User
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice-select" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice Selection
          </Label>
          <Select
            value={settings.voice}
            onValueChange={(value) => updateSetting('voice', value)}
          >
            <SelectTrigger id="voice-select">
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
            Choose the voice for Gemini&apos;s audio responses
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="language-select" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language
          </Label>
          <Select
            value={settings.language}
            onValueChange={(value) => updateSetting('language', value)}
          >
            <SelectTrigger id="language-select">
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
              <Label htmlFor="proactive-audio" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
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
              <Label htmlFor="affective-dialog" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
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
              <Label htmlFor="vad" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
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
              <Label htmlFor="google-search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
          
          <Button
            onClick={saveUserSettings}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Settings className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
