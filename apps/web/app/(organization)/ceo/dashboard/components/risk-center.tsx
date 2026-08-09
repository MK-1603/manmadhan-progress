import React from 'react';
import { PremiumCard } from '@/components/ui/premium-card';

export function RiskCenter() {
  return (
    <PremiumCard className="p-4 bg-layer-1 border-border rounded-xl">
      <h3 className="text-sm font-semibold text-foreground mb-4">RiskCenter</h3>
      <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
        Data Loading...
      </div>
    </PremiumCard>
  );
}
