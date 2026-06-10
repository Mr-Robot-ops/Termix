export const SYSTEMD_SERVICE_AUTOCOMPLETE_TTL_MS = 60_000;
export const SYSTEMD_SERVICE_AUTOCOMPLETE_QUERY_TIMEOUT_MS = 5_000;
export const SYSTEMD_SERVICE_AUTOCOMPLETE_QUERY_MAX_BYTES = 128 * 1024;
export const SYSTEMD_SERVICE_AUTOCOMPLETE_QUERY_LIMIT = 400;

export const SYSTEMD_SERVICE_LIST_UNITS_COMMAND =
  "systemctl list-units --type=service --all --plain --no-legend --no-pager";
export const SYSTEMD_SERVICE_LIST_UNIT_FILES_COMMAND =
  "systemctl list-unit-files --type=service --plain --no-legend --no-pager";

export const SYSTEMD_SERVICE_AUTOCOMPLETE_QUERY = [
  SYSTEMD_SERVICE_LIST_UNITS_COMMAND,
  SYSTEMD_SERVICE_LIST_UNIT_FILES_COMMAND,
].join("; ");

export type SystemdServiceAutocompleteCacheEntry = {
  services: string[];
  fetchedAt: number;
  pending?: Promise<string[]>;
};

export type SystemdServiceAutocompleteCacheStatus =
  | "cache-hit"
  | "pending-reuse"
  | "fresh-fetch";

export type SystemdServiceAutocompleteCacheResult = {
  status: SystemdServiceAutocompleteCacheStatus;
  promise: Promise<string[]>;
};

function isLikelySystemdServiceUnit(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9@_.:+-]*\.service$/i.test(value);
}

export function extractSystemdServiceUnitsForAutocomplete(output: string) {
  const units: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split(/\r?\n/)) {
    const columns = rawLine.trim().split(/\s+/);
    const firstColumn = columns[0] ?? "";
    const secondColumn = columns[1]?.toLowerCase() ?? "";
    if (
      !firstColumn ||
      firstColumn.toUpperCase() === "UNIT" ||
      firstColumn.toUpperCase() === "UNIT FILE" ||
      secondColumn === "not-found"
    ) {
      continue;
    }

    if (!isLikelySystemdServiceUnit(firstColumn)) {
      continue;
    }

    const normalized = firstColumn.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    units.push(firstColumn);

    if (units.length >= SYSTEMD_SERVICE_AUTOCOMPLETE_QUERY_LIMIT) {
      break;
    }
  }

  return units;
}

export function getOrFetchCachedSystemdServiceAutocomplete(
  cache: Map<string, SystemdServiceAutocompleteCacheEntry>,
  cacheKey: string,
  fetchServices: () => Promise<string[]>,
  now: () => number = Date.now,
  ttlMs = SYSTEMD_SERVICE_AUTOCOMPLETE_TTL_MS,
): SystemdServiceAutocompleteCacheResult {
  const cached = cache.get(cacheKey);

  if (cached?.pending) {
    return {
      status: "pending-reuse",
      promise: cached.pending,
    };
  }

  if (cached && now() - cached.fetchedAt < ttlMs) {
    return {
      status: "cache-hit",
      promise: Promise.resolve(cached.services),
    };
  }

  const previousServices = cached?.services ?? [];
  const previousFetchedAt = cached?.fetchedAt ?? 0;
  const pending = fetchServices().then(
    (services) => {
      cache.set(cacheKey, {
        services,
        fetchedAt: now(),
      });
      return services;
    },
    () => {
      cache.set(cacheKey, {
        services: previousServices,
        fetchedAt: previousServices.length > 0 ? previousFetchedAt : now(),
      });
      return previousServices;
    },
  );

  cache.set(cacheKey, {
    services: previousServices,
    fetchedAt: previousFetchedAt,
    pending,
  });

  return {
    status: "fresh-fetch",
    promise: pending,
  };
}
