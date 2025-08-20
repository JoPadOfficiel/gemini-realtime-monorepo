import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getAllModelPricing, updateModelPricing } from '@/lib/pricing-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pricing = await getAllModelPricing();
    return NextResponse.json({ pricing });

  } catch (error) {
    console.error('Error fetching model pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { modelId, inputPricePerMillion, outputPricePerMillion, audioPricePerMillion } = body;

    if (!modelId || typeof inputPricePerMillion !== 'number' || typeof outputPricePerMillion !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, inputPricePerMillion, outputPricePerMillion' },
        { status: 400 }
      );
    }

    const updatedPricing = await updateModelPricing(modelId, {
      inputPricePerMillion,
      outputPricePerMillion,
      audioPricePerMillion: audioPricePerMillion || null,
    });

    return NextResponse.json({ 
      message: 'Pricing updated successfully',
      pricing: updatedPricing 
    });

  } catch (error) {
    console.error('Error updating model pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
