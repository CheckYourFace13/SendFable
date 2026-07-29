export type CompetitorTier = {
  name: string;
  contacts?: number;
  monthlyPrice: number | string;
  notes?: string;
};

export type CompetitorPricing = {
  id: string;
  name: string;
  website: string;
  lastChecked: string;
  sources: string[];
  disclaimer: string;
  tiers: CompetitorTier[];
};
