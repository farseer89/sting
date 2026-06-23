import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ProspectorRunDto, EnrichmentDto } from './prospector-run.model';

const API = environment.MICRO_BASE_URL;

@Injectable({ providedIn: 'root' })
export class ProtopipeProspectorService {
  private readonly http = inject(HttpClient);

  async createRun(category: string, location: string): Promise<ProspectorRunDto> {
    const res = await firstValueFrom(
      this.http.post<{ ok: boolean; data: ProspectorRunDto }>(
        `${API}/api/v2/protopipe/prospector/runs`,
        { category, location },
      ),
    );
    return res.data;
  }

  async getRun(runId: string): Promise<ProspectorRunDto> {
    const res = await firstValueFrom(
      this.http.get<{ ok: boolean; data: ProspectorRunDto }>(
        `${API}/api/v2/protopipe/prospector/runs/${runId}`,
      ),
    );
    return res.data;
  }

  async listRuns(): Promise<ProspectorRunDto[]> {
    const res = await firstValueFrom(
      this.http.get<{ ok: boolean; data: ProspectorRunDto[] }>(
        `${API}/api/v2/protopipe/prospector/runs`,
      ),
    );
    return res.data;
  }

  async triggerEnrichment(placeId: string, websiteUri?: string): Promise<EnrichmentDto> {
    const res = await firstValueFrom(
      this.http.post<{ ok: boolean; data: EnrichmentDto }>(
        `${API}/api/v2/protopipe/prospector/leads/${encodeURIComponent(placeId)}/enrich`,
        { websiteUri },
      ),
    );
    return res.data;
  }

  async getEnrichment(placeId: string): Promise<EnrichmentDto> {
    const res = await firstValueFrom(
      this.http.get<{ ok: boolean; data: EnrichmentDto }>(
        `${API}/api/v2/protopipe/prospector/leads/${encodeURIComponent(placeId)}/enrichment`,
      ),
    );
    return res.data;
  }
}
