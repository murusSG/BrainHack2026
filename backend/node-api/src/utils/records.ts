export function firstPresent(record: Record<string, unknown>, keys: string[]): unknown {
  const normalized = new Map(
    Object.entries(record).map(([key, value]) => [key.toLowerCase().replace(/\s+/g, "_"), value])
  );

  for (const key of keys) {
    const direct = record[key];
    if (direct !== undefined && direct !== null && direct !== "") return direct;
    const normalizedValue = normalized.get(key.toLowerCase().replace(/\s+/g, "_"));
    if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== "") return normalizedValue;
  }
  return undefined;
}

export function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
