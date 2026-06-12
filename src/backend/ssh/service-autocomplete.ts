export const RUNTIME_SERVICE_AUTOCOMPLETE_TTL_MS = 60_000;
export const RUNTIME_SERVICE_AUTOCOMPLETE_QUERY_TIMEOUT_MS = 5_000;
export const RUNTIME_SERVICE_AUTOCOMPLETE_QUERY_MAX_BYTES = 64 * 1024;
export const RUNTIME_SERVICE_AUTOCOMPLETE_QUERY_LIMIT = 400;

export const FREEBSD_RC_SERVICE_LIST_COMMAND = "service -l";

export type RuntimeServiceAutocompleteCacheEntry = {
  services: string[];
  fetchedAt: number;
  pending?: Promise<string[]>;
};

export type RuntimeServiceAutocompleteCacheStatus =
  | "cache-hit"
  | "pending-reuse"
  | "fresh-fetch";

export type RuntimeServiceAutocompleteCacheResult = {
  status: RuntimeServiceAutocompleteCacheStatus;
  promise: Promise<string[]>;
};

function isLikelyRuntimeServiceName(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9@_.:+-]*$/i.test(value);
}

export function extractFreeBsdRcServicesForAutocomplete(output: string) {
  const services: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split(/\r?\n/)) {
    const firstColumn = rawLine.trim().split(/\s+/, 1)[0] ?? "";
    const normalized = firstColumn.toLowerCase();

    if (
      !firstColumn ||
      normalized === "usage:" ||
      normalized === "service" ||
      firstColumn.includes("/") ||
      !isLikelyRuntimeServiceName(firstColumn)
    ) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    services.push(firstColumn);

    if (services.length >= RUNTIME_SERVICE_AUTOCOMPLETE_QUERY_LIMIT) {
      break;
    }
  }

  return services;
}

export function getOrFetchCachedRuntimeServiceAutocomplete(
  cache: Map<string, RuntimeServiceAutocompleteCacheEntry>,
  cacheKey: string,
  fetchServices: () => Promise<string[]>,
  now: () => number = Date.now,
  ttlMs = RUNTIME_SERVICE_AUTOCOMPLETE_TTL_MS,
): RuntimeServiceAutocompleteCacheResult {
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
