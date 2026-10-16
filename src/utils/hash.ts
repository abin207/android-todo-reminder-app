/**
 * Deterministic 31-bit hash used to derive stable Android notification ids
 * from `${taskId}:${occurrence}`. Deterministic ids are mandatory: without
 * them a device could never cancel a previously scheduled notification.
 */
export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Keep inside positive Java int range as required by Android.
  return (Math.abs(hash) % 2147483000) + 1;
}

export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
