export interface BuildBookProspectContext {
  name: string;
  category?: string;
  area?: string;
  phone?: string;
  websiteStatus?: 'none' | 'poor' | 'fair' | 'good' | 'unknown';
  score?: number;
  priority?: 'critical' | 'high' | 'medium' | 'monitor';
  topSignal?: string;
  source?: 'prospector' | 'pitch-prep' | 'manual';
}
