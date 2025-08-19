// Utility function for conditional CSS class names
export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const float32ToPcm16 = (float32Array: Float32Array): Int16Array => {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
};

// Convert base64 audio data to Float32Array for audio processing
export const base64ToFloat32Array = (base64: string): Float32Array => {
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

// Gemini Live Backend API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class GeminiApiService {
  private static instance: GeminiApiService;

  static getInstance(): GeminiApiService {
    if (!GeminiApiService.instance) {
      GeminiApiService.instance = new GeminiApiService();
    }
    return GeminiApiService.instance;
  }

  async getTokenUsage(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tokens/usage/${sessionId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch token usage:', error);
      throw error;
    }
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch session info:', error);
      throw error;
    }
  }

  async listActiveSessions(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  async queryMemory(query: string, sessionId: string = 'default_session'): Promise<any> {
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

  async addMemory(messages: any[], sessionId: string = 'default_session', metadata?: any): Promise<any> {
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
