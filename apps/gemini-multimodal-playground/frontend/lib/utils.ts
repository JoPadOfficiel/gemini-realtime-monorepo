export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const float32ToPcm16 = (float32Array: string | any[]) => {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
};

// Utility function to convert base64 to Float32Array
export const base64ToFloat32Array = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Convert to 16-bit PCM
  const pcm16 = new Int16Array(bytes.buffer);
  // Convert to float32
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
};

// API Service Layer for Gemini Live Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class GeminiApiService {
  private static instance: GeminiApiService;

  static getInstance(): GeminiApiService {
    if (!GeminiApiService.instance) {
      GeminiApiService.instance = new GeminiApiService();
    }
    return GeminiApiService.instance;
  }

  // Token Management
  async getTokenUsage(sessionId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tokens/usage/${sessionId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch token usage:', error);
      throw error;
    }
  }

  // Session Management
  async getSessionInfo(sessionId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch session info:', error);
      throw error;
    }
  }

  async listActiveSessions() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  // Memory Management
  async queryMemory(query: string, sessionId: string = 'default_session') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/memory/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to query memory:', error);
      throw error;
    }
  }

  async addMemory(messages: any[], sessionId: string = 'default_session', metadata?: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/memory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, session_id: sessionId, metadata })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to add memory:', error);
      throw error;
    }
  }
}
