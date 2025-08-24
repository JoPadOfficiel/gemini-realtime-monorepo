'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { DollarSign, Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModelPricing {
  id: string;
  modelId: string;
  modelName: string;
  textInputPricePerMillion: number;
  textOutputPricePerMillion: number;
  audioInputPricePerMillion: number | null;
  audioOutputPricePerMillion: number | null;
  isActive: boolean;
}

export default function PricingConfiguration() {
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pricing');
      if (!response.ok) throw new Error('Failed to fetch pricing');
      const data = await response.json();
      setPricing(data.pricing);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      setError('Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const updatePricing = async (modelId: string, updates: Partial<ModelPricing>) => {
    try {
      setSaving(modelId);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          textInputPricePerMillion: updates.textInputPricePerMillion,
          textOutputPricePerMillion: updates.textOutputPricePerMillion,
          audioInputPricePerMillion: updates.audioInputPricePerMillion,
          audioOutputPricePerMillion: updates.audioOutputPricePerMillion,
        }),
      });

      if (!response.ok) throw new Error('Failed to update pricing');

      const data = await response.json();
      setSuccess(`Pricing updated for ${data.pricing.modelName}`);
      
      // Update local state
      setPricing(prev => prev.map(p => 
        p.modelId === modelId ? { ...p, ...updates } : p
      ));

      toast.success('Pricing updated successfully');
    } catch (error) {
      console.error('Error updating pricing:', error);
      setError('Failed to update pricing');
      toast.error('Failed to update pricing');
    } finally {
      setSaving(null);
    }
  };

  const handleInputChange = (modelId: string, field: keyof ModelPricing, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPricing(prev => prev.map(p => 
      p.modelId === modelId ? { ...p, [field]: numValue } : p
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Model Pricing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="size-6 animate-spin" />
            <span className="ml-2">Loading pricing configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="size-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Gemini 2.5 Flash Native Audio Pricing
          </CardTitle>
          <CardDescription>
            Configure pricing per million tokens for Gemini 2.5 models. Prices are in USD.
            Text input: $0.50, Text output: $2.00, Audio input: $3.00, Audio output: $12.00
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {pricing.map((model) => (
              <Card key={model.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{model.modelName}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {model.modelId}
                      </CardDescription>
                    </div>
                    <Badge variant={model.isActive ? 'default' : 'secondary'}>
                      {model.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`text-input-${model.modelId}`}>
                        Text Input (per 1M tokens)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id={`text-input-${model.modelId}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={model.textInputPricePerMillion}
                          onChange={(e) => handleInputChange(model.modelId, 'textInputPricePerMillion', e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`text-output-${model.modelId}`}>
                        Text Output (per 1M tokens)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id={`text-output-${model.modelId}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={model.textOutputPricePerMillion}
                          onChange={(e) => handleInputChange(model.modelId, 'textOutputPricePerMillion', e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`audio-input-${model.modelId}`}>
                        Audio Input (per 1M tokens)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id={`audio-input-${model.modelId}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={model.audioInputPricePerMillion || ''}
                          onChange={(e) => handleInputChange(model.modelId, 'audioInputPricePerMillion', e.target.value)}
                          className="pl-8"
                          placeholder="3.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`audio-output-${model.modelId}`}>
                        Audio Output (per 1M tokens)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id={`audio-output-${model.modelId}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={model.audioOutputPricePerMillion || ''}
                          onChange={(e) => handleInputChange(model.modelId, 'audioOutputPricePerMillion', e.target.value)}
                          className="pl-8"
                          placeholder="12.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => updatePricing(model.modelId, {
                        textInputPricePerMillion: model.textInputPricePerMillion,
                        textOutputPricePerMillion: model.textOutputPricePerMillion,
                        audioInputPricePerMillion: model.audioInputPricePerMillion,
                        audioOutputPricePerMillion: model.audioOutputPricePerMillion,
                      })}
                      disabled={saving === model.modelId}
                      className="flex items-center gap-2"
                    >
                      {saving === model.modelId ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {saving === model.modelId ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
