const LOCATIONS_KEY = 'ecrs-schedule-locations';

export function saveLocations(locations: Record<string, string>): void {
  try {
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  } catch {
    // localStorage unavailable
  }
}

export function loadLocations(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveLocationHistory(history: string[]): void {
  try {
    const existing = loadLocationHistory();
    const merged = Array.from(new Set([...history, ...existing])).slice(0, 50);
    localStorage.setItem(`${LOCATIONS_KEY}-history`, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

export function loadLocationHistory(): string[] {
  try {
    const raw = localStorage.getItem(`${LOCATIONS_KEY}-history`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function clearAll(): void {
  try {
    localStorage.removeItem(LOCATIONS_KEY);
    localStorage.removeItem(`${LOCATIONS_KEY}-history`);
  } catch {
    // ignore
  }
}
