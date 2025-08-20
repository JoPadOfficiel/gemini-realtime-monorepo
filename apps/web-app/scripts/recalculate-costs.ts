import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TokenUsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  isAudioSession?: boolean;
}

interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

async function calculateTokenCost(usage: TokenUsageData): Promise<CostCalculation> {
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
      };
    }

    // Determine which pricing to use based on session type
    const inputPrice = usage.isAudioSession && pricing.audioPricePerMillion
      ? pricing.audioPricePerMillion
      : pricing.inputPricePerMillion;

    const outputPrice = usage.isAudioSession && pricing.audioPricePerMillion
      ? pricing.audioPricePerMillion
      : pricing.outputPricePerMillion;

    // Calculate costs (price is per million tokens)
    const inputCost = (usage.inputTokens / 1_000_000) * inputPrice;
    const outputCost = (usage.outputTokens / 1_000_000) * outputPrice;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
    };
  } catch (error) {
    console.error('Error calculating token cost:', error);
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  }
}

async function recalculateAllTokenCosts(): Promise<void> {
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

async function main() {
  console.log('🔄 Starting cost recalculation for all token usage records...');

  try {
    // Get count of records without costs
    const recordsWithoutCost = await prisma.tokenUsage.count({
      where: { cost: null }
    });

    const totalRecords = await prisma.tokenUsage.count();

    console.log(`📊 Found ${totalRecords} total token usage records`);
    console.log(`💰 ${recordsWithoutCost} records need cost calculation`);

    if (recordsWithoutCost === 0) {
      console.log('✅ All records already have costs calculated!');
      return;
    }

    // Recalculate all costs
    await recalculateAllTokenCosts();

    // Verify the results
    const recordsStillWithoutCost = await prisma.tokenUsage.count({
      where: { cost: null }
    });

    const totalCost = await prisma.tokenUsage.aggregate({
      _sum: { cost: true }
    });

    console.log(`✅ Cost recalculation completed!`);
    console.log(`📈 Records still without cost: ${recordsStillWithoutCost}`);
    console.log(`💵 Total calculated cost: $${(totalCost._sum.cost || 0).toFixed(4)}`);

  } catch (error) {
    console.error('❌ Error during cost recalculation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Cost recalculation script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cost recalculation script failed:', error);
      process.exit(1);
    });
}

export { main as recalculateCosts };
