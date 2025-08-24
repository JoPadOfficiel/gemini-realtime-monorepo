import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEMINI_PRICING = [
  {
    modelId: 'gemini-live-2.5-flash-preview',
    modelName: 'Gemini Live 2.5 Flash Preview',
    textInputPricePerMillion: 0.50,
    textOutputPricePerMillion: 2.00,
    audioInputPricePerMillion: 3.00,
    audioOutputPricePerMillion: 12.00,
  },
  {
    modelId: 'gemini-2.5-flash-preview-native-audio-dialog',
    modelName: 'Gemini 2.5 Flash Native Audio Dialog',
    textInputPricePerMillion: 0.50,
    textOutputPricePerMillion: 2.00,
    audioInputPricePerMillion: 3.00,
    audioOutputPricePerMillion: 12.00,
  },
  {
    modelId: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
    modelName: 'Gemini 2.5 Flash Native Audio Thinking',
    textInputPricePerMillion: 0.50,
    textOutputPricePerMillion: 2.00,
    audioInputPricePerMillion: 3.00,
    audioOutputPricePerMillion: 12.00,
  },
];

async function seedModelPricing() {
  console.log('🌱 Seeding model pricing data...');

  try {
    // Upsert each model pricing
    for (const pricing of GEMINI_PRICING) {
      await prisma.modelPricing.upsert({
        where: { modelId: pricing.modelId },
        update: {
          modelName: pricing.modelName,
          textInputPricePerMillion: pricing.textInputPricePerMillion,
          textOutputPricePerMillion: pricing.textOutputPricePerMillion,
          audioInputPricePerMillion: pricing.audioInputPricePerMillion,
          audioOutputPricePerMillion: pricing.audioOutputPricePerMillion,
          isActive: true,
        },
        create: {
          modelId: pricing.modelId,
          modelName: pricing.modelName,
          textInputPricePerMillion: pricing.textInputPricePerMillion,
          textOutputPricePerMillion: pricing.textOutputPricePerMillion,
          audioInputPricePerMillion: pricing.audioInputPricePerMillion,
          audioOutputPricePerMillion: pricing.audioOutputPricePerMillion,
          isActive: true,
        },
      });

      console.log(`✅ Seeded pricing for ${pricing.modelName}`);
    }

    console.log('Model pricing seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding model pricing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedModelPricing()
    .then(() => {
      console.log('✨ Seeding process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedModelPricing };
