/** Re-export Protopipe contracts for feature-local imports. */
export type {
  KeywordIntent,
  KeywordPriority,
  ProtopipeKeyword,
  ProtopipeKeywordDto,
  ProtopipeKeywordMarket,
  ProtopipeKeywordMetricPoint,
  ProtopipeSite,
  ProtopipePlan,
} from '@hive/contracts';

/** Alias used by dashboard / strategy service. */
export type ProtopipeStrategySummary = import('@hive/contracts').ProtopipePlan;
