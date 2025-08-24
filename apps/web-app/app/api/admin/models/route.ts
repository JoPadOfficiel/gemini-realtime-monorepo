import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

// Available Gemini models from the backend API (matching exact backend implementation)
const GEMINI_MODELS = [
  {
    id: "gemini-live-2.5-flash-preview",
    name: "Gemini Live 2.5 Flash (Recommended)",
    type: "half_cascade",
    recommended: true,
    limits: "3 sessions, 1M TPM (Free)",
    description: "Real-time multimodal AI with live audio/video capabilities"
  },
  {
    id: "gemini-2.5-flash-preview-native-audio-dialog",
    name: "Gemini 2.5 Flash Native Audio Dialog",
    type: "native_audio",
    recommended: false,
    limits: "⚠️ 1 session, 25K TPM (Free)",
    description: "Native audio processing with dialog capabilities",
    warning: "Very restrictive limits"
  },
  {
    id: "gemini-2.5-flash-exp-native-audio-thinking-dialog",
    name: "Gemini 2.5 Flash Native Audio Thinking",
    type: "native_audio",
    recommended: false,
    limits: "⚠️ 1 session, 10K TPM (Free)",
    description: "Experimental native audio with thinking capabilities",
    warning: "Extremely restrictive limits"
  }
];

const BACKEND_URL = process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch model limits from the backend for each model
    const modelsWithLimits = await Promise.allSettled(
      GEMINI_MODELS.map(async (model) => {
        try {
          const response = await fetch(`${BACKEND_URL}/model-limits/${model.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          let limits = model.limits;
          if (response.ok) {
            const limitsData = await response.json();
            limits = limitsData.limits || model.limits;
          }

          return {
            ...model,
            limits,
            available: response.ok,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          console.warn(`Failed to fetch limits for model ${model.id}:`, error);
          return {
            ...model,
            available: false,
            lastChecked: new Date().toISOString(),
            error: 'Backend unavailable'
          };
        }
      })
    );

    const availableModels = modelsWithLimits
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    return NextResponse.json({
      models: availableModels,
      totalModels: availableModels.length,
      backendUrl: BACKEND_URL,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching available models:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to refresh model availability
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force refresh of model availability
    const refreshedModels = await Promise.allSettled(
      GEMINI_MODELS.map(async (model) => {
        try {
          const response = await fetch(`${BACKEND_URL}/model-limits/${model.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-cache'
          });

          if (response.ok) {
            const limitsData = await response.json();
            return {
              ...model,
              limits: limitsData.limits || model.limits,
              available: true,
              lastChecked: new Date().toISOString(),
              rateLimit: limitsData.rateLimit,
              quota: limitsData.quota
            };
          } else {
            return {
              ...model,
              available: false,
              lastChecked: new Date().toISOString(),
              error: `HTTP ${response.status}`
            };
          }
        } catch (error) {
          return {
            ...model,
            available: false,
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const models = refreshedModels
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    return NextResponse.json({
      message: 'Models refreshed successfully',
      models,
      totalModels: models.length,
      availableModels: models.filter(m => m.available).length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error refreshing models:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
