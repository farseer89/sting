export type BuildPropPathSegment = string | number;

export function parsePropPath(path: string): BuildPropPathSegment[] {
  return path.split('.').map((segment) => {
    const index = Number(segment);
    return Number.isInteger(index) && String(index) === segment ? index : segment;
  });
}

export function readProp(props: Record<string, unknown>, path: string): unknown {
  const segments = parsePropPath(path);
  let current: unknown = props;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment as string];
  }
  return current;
}

export function patchProp(
  props: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const next = structuredClone(props);
  const segments = parsePropPath(path);
  if (segments.length === 0) return next;

  let current: Record<string, unknown> = next;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const existing = current[segment as string];
    if (existing == null || typeof existing !== 'object') {
      current[segment as string] = typeof segments[i + 1] === 'number' ? [] : {};
    }
    current = current[segment as string] as Record<string, unknown>;
  }

  const last = segments[segments.length - 1]!;
  if (value === null || value === undefined) {
    delete current[last as string];
  } else {
    current[last as string] = value;
  }
  return next;
}

export function readStringProp(props: Record<string, unknown>, path: string, fallback = ''): string {
  const value = readProp(props, path);
  return typeof value === 'string' ? value : fallback;
}

export function readStatPairs(
  props: Record<string, unknown>,
  key = 'stats',
): { value: string; label: string }[] {
  const raw = props[key];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item !== 'object' || item == null) return { value: '', label: '' };
    const record = item as Record<string, unknown>;
    return {
      value: String(record['value'] ?? ''),
      label: String(record['label'] ?? ''),
    };
  });
}

export function patchStatPair(
  props: Record<string, unknown>,
  index: number,
  field: 'value' | 'label',
  value: string,
  key = 'stats',
): Record<string, unknown> {
  return patchProp(props, `${key}.${index}.${field}`, value);
}

export function patchArrayItem<T>(
  props: Record<string, unknown>,
  key: string,
  index: number,
  item: T,
): Record<string, unknown> {
  const next = structuredClone(props);
  const raw = next[key];
  const items = Array.isArray(raw) ? [...raw] : [];
  items[index] = item;
  next[key] = items;
  return next;
}

export function appendArrayItem<T>(
  props: Record<string, unknown>,
  key: string,
  item: T,
): Record<string, unknown> {
  const next = structuredClone(props);
  const raw = next[key];
  const items = Array.isArray(raw) ? [...raw] : [];
  items.push(item);
  next[key] = items;
  return next;
}

export function removeArrayItem(
  props: Record<string, unknown>,
  key: string,
  index: number,
): Record<string, unknown> {
  const next = structuredClone(props);
  const raw = next[key];
  if (!Array.isArray(raw)) return next;
  next[key] = raw.filter((_, i) => i !== index);
  return next;
}
