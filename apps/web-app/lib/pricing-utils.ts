import { prisma } from '@/lib/db';

export interface TokenUsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  isAudioSession?: boolean;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  pricePerMillion: {
    textInput: number;
    textOutput: number;
    audioInput?: number;
    audioOutput?: number;
  };
}

/**
 * Calculate cost for token usage based on configured model pricing
 */
export async function calculateTokenCost(usage: TokenUsageData): Promise<CostCalculation> {
  try {
    // Get pricing for the model
    const pricing = await prisma.modelPricing.findUnique({
      where: { modelId: usage.model, isActive: true },
    });

    if (!pricing) {
      console.warn(`No pricing found for model: ${usage.model}`);
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        pricePerMillion: { textInput: 0, textOutput: 0 },
      };
    }

    // Determine which pricing to use based on session type
    const inputPrice = usage.isAudioSession && pricing.audioInputPricePerMillion
      ? pricing.audioInputPricePerMillion
      : pricing.textInputPricePerMillion;

    const outputPrice = usage.isAudioSession && pricing.audioOutputPricePerMillion
      ? pricing.audioOutputPricePerMillion
      : pricing.textOutputPricePerMillion;

    // Calculate costs (price is per million tokens)
    const inputCost = (usage.inputTokens / 1_000_000) * inputPrice;
    const outputCost = (usage.outputTokens / 1_000_000) * outputPrice;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      pricePerMillion: {
        textInput: pricing.textInputPricePerMillion,
        textOutput: pricing.textOutputPricePerMillion,
        audioInput: pricing.audioInputPricePerMillion || undefined,
        audioOutput: pricing.audioOutputPricePerMillion || undefined,
      },
    };
  } catch (error) {
    console.error('Error calculating token cost:', error);
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      pricePerMillion: { input: 0, output: 0 },
    };
  }
}

/**
 * Update token usage record with calculated cost
 */
export async function updateTokenUsageCost(tokenUsageId: string): Promise<void> {
  try {
    const tokenUsage = await prisma.tokenUsage.findUnique({
      where: { id: tokenUsageId },
    });

    if (!tokenUsage) {
      console.warn(`Token usage not found: ${tokenUsageId}`);
      return;
    }

    const costCalculation = await calculateTokenCost({
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      model: tokenUsage.model,
      isAudioSession: tokenUsage.endpoint?.includes('live') || tokenUsage.endpoint?.includes('audio'),
    });

    await prisma.tokenUsage.update({
      where: { id: tokenUsageId },
      data: { cost: costCalculation.totalCost },
    });
  } catch (error) {
    console.error('Error updating token usage cost:', error);
  }
}

/**
 * Recalculate costs for all token usage records
 */
export async function recalculateAllTokenCosts(): Promise<void> {
  try {
    console.log('🔄 Recalculating all token usage costs...');
    
    const tokenUsages = await prisma.tokenUsage.findMany({
      select: {
        id: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        model: true,
        endpoint: true,
      },
    });

    let updated = 0;
    for (const usage of tokenUsages) {
      const costCalculation = await calculateTokenCost({
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        model: usage.model,
        isAudioSession: usage.endpoint?.includes('live') || usage.endpoint?.includes('audio'),
      });

      await prisma.tokenUsage.update({
        where: { id: usage.id },
        data: { cost: costCalculation.totalCost },
      });

      updated++;
    }

    console.log(`✅ Updated costs for ${updated} token usage records`);
  } catch (error) {
    console.error('Error recalculating token costs:', error);
    throw error;
  }
}

/**
 * Get all available model pricing
 */
export async function getAllModelPricing() {
  return await prisma.modelPricing.findMany({
    where: { isActive: true },
    orderBy: { modelName: 'asc' },
  });
}

/**
 * Update model pricing
 */
export async function updateModelPricing(
  modelId: string,
  pricing: {
    textInputPricePerMillion: number;
    textOutputPricePerMillion: number;
    audioInputPricePerMillion?: number;
    audioOutputPricePerMillion?: number;
  }
) {
  return await prisma.modelPricing.update({
    where: { modelId },
    data: pricing,
  });
}
