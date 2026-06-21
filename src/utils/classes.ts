export type EventClass = {
  name: string;
  instructor?: string;
  ageRange?: string;
  period?: string;
  days?: string;
  limitedCapacity?: boolean;
  advanceRegistration?: boolean;
  description?: string;
};

/**
 * Groups classes by period in first-seen insertion order.
 * Classes with no period are grouped under the empty string key.
 */
export function groupClassesByPeriod(classes: EventClass[]): Map<string, EventClass[]> {
  const groups = new Map<string, EventClass[]>();
  for (const cls of classes) {
    const key = cls.period ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cls);
  }
  return groups;
}
