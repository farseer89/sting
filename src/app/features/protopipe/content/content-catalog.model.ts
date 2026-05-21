import type { ProtopipeContentPost, ProtopipeKeywordDto } from '@hive/contracts';

export interface ContentCatalog {
  siteId: string;
  posts: ProtopipeContentPost[];
  keywords: ProtopipeKeywordDto[];
}
