import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ShireEndpoints } from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { shireApiUrl } from '../shire/shire-http.util';
import type { BuildBookProspectContext } from './build-book-context';
import type { SiteThemePersistedOverride } from '../site-design/public';
import type { BuildBookBlockInstance, BuildBookPage, BuildBookPageKind, BuildBookSection } from './build-book.types';

export type BuildBookEntryMode = 'template' | 'blocks';

export interface BuildBookSectionSelectionDto {
  section: BuildBookSection;
  optionId: string;
  label?: string;
  notes?: string;
}

export type BuildBookBlockInstanceDto = BuildBookBlockInstance;

export interface BuildBookPageDto extends BuildBookPage {
  kind: BuildBookPageKind;
}

export interface BuildBookShireDto {
  id: string;
  prospectContext?: BuildBookProspectContext;
  entryMode: BuildBookEntryMode;
  selectedTemplateId?: string;
  siteTheme?: SiteThemePersistedOverride;
  homepageStack: BuildBookSection[];
  sectionSelections: BuildBookSectionSelectionDto[];
  pages: BuildBookPageDto[];
  strategyNotes: string;
  publishDraftId?: string;
  demoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuildBookGetResponseDto {
  buildBook: BuildBookShireDto | null;
}

export interface SaveBuildBookDto {
  prospectContext?: BuildBookProspectContext;
  entryMode: BuildBookEntryMode;
  selectedTemplateId?: string;
  siteTheme?: SiteThemePersistedOverride;
  homepageStack: BuildBookSection[];
  sectionSelections: BuildBookSectionSelectionDto[];
  pages?: BuildBookPageDto[];
  strategyNotes: string;
  publishDraftId?: string;
  demoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ProtopipeBuildBookShireApiService {
  private readonly http = inject(HttpClient);

  get(siteId: string): Promise<BuildBookGetResponseDto> {
    return firstValueFrom(
      this.http.get<BuildBookGetResponseDto>(shireApiUrl(ShireEndpoints.sites.buildBook(siteId))),
    );
  }

  save(siteId: string, body: SaveBuildBookDto): Promise<BuildBookGetResponseDto> {
    return firstValueFrom(
      this.http.put<BuildBookGetResponseDto>(
        shireApiUrl(ShireEndpoints.sites.buildBook(siteId)),
        body,
      ),
    );
  }
}
