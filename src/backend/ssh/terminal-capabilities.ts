export const TERMINAL_AUTOCOMPLETE_CAPABILITIES_TTL_MS = 5 * 60_000;
export const TERMINAL_AUTOCOMPLETE_CAPABILITIES_QUERY_TIMEOUT_MS = 5_000;
export const TERMINAL_AUTOCOMPLETE_CAPABILITIES_QUERY_MAX_BYTES = 32 * 1024;

export const TERMINAL_AUTOCOMPLETE_CAPABILITY_COMMANDS = [
  "systemctl",
  "journalctl",
  "systemd-analyze",
  "loginctl",
  "localectl",
  "networkctl",
  "busctl",
  "coredumpctl",
  "machinectl",
  "resolvectl",
  "service",
  "sysrc",
  "rc-service",
  "sudo",
  "doas",
  "apt",
  "apt-get",
  "apt-cache",
  "dpkg",
  "pacman",
  "makepkg",
  "yay",
  "paru",
  "pkg",
  "dnf",
  "yum",
  "zypper",
  "apk",
] as const;

export const TERMINAL_AUTOCOMPLETE_CAPABILITIES_QUERY = `
uname_value="$(uname -s 2>/dev/null || true)"
printf '__TERMIX_UNAME__%s\\n' "$uname_value"
if [ -r /etc/os-release ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      ID|ID_LIKE|NAME|VERSION_ID)
        value=\${value#\\"}
        value=\${value%\\"}
        printf '__TERMIX_OS_RELEASE__%s=%s\\n' "$key" "$value"
        ;;
    esac
  done < /etc/os-release
fi
for cmd in ${TERMINAL_AUTOCOMPLETE_CAPABILITY_COMMANDS.join(" ")}; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '__TERMIX_CMD__%s\\n' "$cmd"
  fi
done
`.trim();

export type TerminalAutocompleteOsFamily =
  | "linux"
  | "freebsd"
  | "openbsd"
  | "netbsd"
  | "darwin"
  | "unknown";

export type TerminalAutocompleteInitSystem =
  | "systemd"
  | "freebsd-rc"
  | "openrc"
  | "sysvinit"
  | "launchd";

export type TerminalAutocompleteServiceProvider =
  | "systemd"
  | "freebsd-rc"
  | "sysvinit";

export type TerminalAutocompletePackageManager =
  | "apt"
  | "dpkg"
  | "pacman"
  | "pkg"
  | "dnf"
  | "yum"
  | "zypper"
  | "apk";

export interface TerminalAutocompleteHostCapabilities {
  osFamily: TerminalAutocompleteOsFamily;
  uname: string;
  osId?: string;
  osIdLike: string[];
  osName?: string;
  versionId?: string;
  commands: string[];
  initSystems: TerminalAutocompleteInitSystem[];
  serviceProviders: TerminalAutocompleteServiceProvider[];
  packageManagers: TerminalAutocompletePackageManager[];
  commandCatalogs: string[];
}

export type TerminalAutocompleteCapabilitiesCacheEntry = {
  capabilities: TerminalAutocompleteHostCapabilities | null;
  fetchedAt: number;
  pending?: Promise<TerminalAutocompleteHostCapabilities>;
};

export type TerminalAutocompleteCapabilitiesCacheStatus =
  | "cache-hit"
  | "pending-reuse"
  | "fresh-fetch";

export type TerminalAutocompleteCapabilitiesCacheResult = {
  status: TerminalAutocompleteCapabilitiesCacheStatus;
  promise: Promise<TerminalAutocompleteHostCapabilities>;
};

const EMPTY_HOST_CAPABILITIES: TerminalAutocompleteHostCapabilities = {
  osFamily: "unknown",
  uname: "",
  osIdLike: [],
  commands: [],
  initSystems: [],
  serviceProviders: [],
  packageManagers: [],
  commandCatalogs: ["common-posix"],
};

function uniqueValues<T extends string>(values: T[]) {
  const seen = new Set<string>();
  const result: T[] = [];

  values.forEach((value) => {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(value);
  });

  return result;
}

function normalizeOsReleaseValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function detectOsFamily(uname: string, osId: string | undefined) {
  const normalizedUname = uname.trim().toLowerCase();
  const normalizedOsId = osId?.trim().toLowerCase() ?? "";

  if (normalizedUname.includes("freebsd") || normalizedOsId === "freebsd") {
    return "freebsd" as const;
  }
  if (normalizedUname.includes("openbsd") || normalizedOsId === "openbsd") {
    return "openbsd" as const;
  }
  if (normalizedUname.includes("netbsd") || normalizedOsId === "netbsd") {
    return "netbsd" as const;
  }
  if (normalizedUname.includes("darwin") || normalizedOsId === "darwin") {
    return "darwin" as const;
  }
  if (
    normalizedUname.includes("linux") ||
    ["arch", "debian", "raspbian", "raspios", "ubuntu", "linuxmint"].includes(
      normalizedOsId,
    )
  ) {
    return "linux" as const;
  }

  return "unknown" as const;
}

function deriveInitSystems(
  osFamily: TerminalAutocompleteOsFamily,
  commands: Set<string>,
) {
  const initSystems: TerminalAutocompleteInitSystem[] = [];

  if (commands.has("systemctl")) {
    initSystems.push("systemd");
  }
  if (osFamily === "freebsd" && commands.has("service")) {
    initSystems.push("freebsd-rc");
  }
  if (commands.has("rc-service")) {
    initSystems.push("openrc");
  }
  if (
    commands.has("service") &&
    !commands.has("systemctl") &&
    osFamily !== "freebsd"
  ) {
    initSystems.push("sysvinit");
  }
  if (osFamily === "darwin") {
    initSystems.push("launchd");
  }

  return uniqueValues(initSystems);
}

function deriveServiceProviders(
  osFamily: TerminalAutocompleteOsFamily,
  commands: Set<string>,
) {
  const providers: TerminalAutocompleteServiceProvider[] = [];

  if (commands.has("systemctl")) {
    providers.push("systemd");
  }
  if (osFamily === "freebsd" && commands.has("service")) {
    providers.push("freebsd-rc");
  }
  if (
    commands.has("service") &&
    !commands.has("systemctl") &&
    osFamily !== "freebsd"
  ) {
    providers.push("sysvinit");
  }

  return uniqueValues(providers);
}

function derivePackageManagers(commands: Set<string>) {
  const managers: TerminalAutocompletePackageManager[] = [];

  if (
    commands.has("apt") ||
    commands.has("apt-get") ||
    commands.has("apt-cache")
  ) {
    managers.push("apt");
  }
  if (commands.has("dpkg")) {
    managers.push("dpkg");
  }
  if (commands.has("pacman")) {
    managers.push("pacman");
  }
  if (commands.has("pkg")) {
    managers.push("pkg");
  }
  if (commands.has("dnf")) {
    managers.push("dnf");
  }
  if (commands.has("yum")) {
    managers.push("yum");
  }
  if (commands.has("zypper")) {
    managers.push("zypper");
  }
  if (commands.has("apk")) {
    managers.push("apk");
  }

  return uniqueValues(managers);
}

function deriveCommandCatalogs(
  osFamily: TerminalAutocompleteOsFamily,
  osId: string | undefined,
  osIdLike: string[],
  commands: Set<string>,
  initSystems: TerminalAutocompleteInitSystem[],
  packageManagers: TerminalAutocompletePackageManager[],
) {
  const catalogs = ["common-posix"];
  const normalizedOsId = osId?.toLowerCase() ?? "";
  const normalizedLike = osIdLike.map((value) => value.toLowerCase());

  if (osFamily === "linux") {
    catalogs.push("gnu-linux");
  }
  if (osFamily === "freebsd") {
    catalogs.push("bsd", "freebsd");
  }
  if (initSystems.includes("systemd")) {
    catalogs.push("systemd");
  }
  if (
    packageManagers.includes("apt") ||
    packageManagers.includes("dpkg") ||
    ["debian", "ubuntu", "raspbian", "raspios"].includes(normalizedOsId) ||
    normalizedLike.includes("debian")
  ) {
    catalogs.push("debian-like");
  }
  if (
    packageManagers.includes("pacman") ||
    normalizedOsId === "arch" ||
    normalizedLike.includes("arch")
  ) {
    catalogs.push("arch");
  }
  if (packageManagers.includes("pkg") && osFamily === "freebsd") {
    catalogs.push("freebsd-pkg");
  }
  if (commands.has("doas")) {
    catalogs.push("doas");
  }

  return uniqueValues(catalogs);
}

export function parseTerminalAutocompleteHostCapabilities(output: string) {
  const commands: string[] = [];
  const osRelease: Record<string, string> = {};
  let uname = "";

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("__TERMIX_UNAME__")) {
      uname = line.slice("__TERMIX_UNAME__".length).trim();
      continue;
    }

    if (line.startsWith("__TERMIX_OS_RELEASE__")) {
      const body = line.slice("__TERMIX_OS_RELEASE__".length);
      const separatorIndex = body.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = body.slice(0, separatorIndex);
      const value = normalizeOsReleaseValue(body.slice(separatorIndex + 1));
      osRelease[key] = value;
      continue;
    }

    if (line.startsWith("__TERMIX_CMD__")) {
      const command = line.slice("__TERMIX_CMD__".length).trim();
      if (command) {
        commands.push(command);
      }
    }
  }

  const uniqueCommands = uniqueValues(commands);
  const commandSet = new Set(
    uniqueCommands.map((command) => command.toLowerCase()),
  );
  const osId = osRelease.ID?.toLowerCase();
  const osIdLike = normalizeOsReleaseValue(osRelease.ID_LIKE ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const osFamily = detectOsFamily(uname, osId);
  const initSystems = deriveInitSystems(osFamily, commandSet);
  const serviceProviders = deriveServiceProviders(osFamily, commandSet);
  const packageManagers = derivePackageManagers(commandSet);
  const commandCatalogs = deriveCommandCatalogs(
    osFamily,
    osId,
    osIdLike,
    commandSet,
    initSystems,
    packageManagers,
  );

  return {
    osFamily,
    uname,
    osId,
    osIdLike,
    osName: osRelease.NAME,
    versionId: osRelease.VERSION_ID,
    commands: uniqueCommands,
    initSystems,
    serviceProviders,
    packageManagers,
    commandCatalogs,
  };
}

export function shouldUseSystemdAutocompleteProvider(
  capabilities: TerminalAutocompleteHostCapabilities | null | undefined,
) {
  return Boolean(capabilities?.serviceProviders.includes("systemd"));
}

export function shouldUseFreeBsdRcAutocompleteProvider(
  capabilities: TerminalAutocompleteHostCapabilities | null | undefined,
) {
  return Boolean(capabilities?.serviceProviders.includes("freebsd-rc"));
}

export function getOrFetchCachedTerminalAutocompleteCapabilities(
  cache: Map<string, TerminalAutocompleteCapabilitiesCacheEntry>,
  cacheKey: string,
  fetchCapabilities: () => Promise<TerminalAutocompleteHostCapabilities>,
  now: () => number = Date.now,
  ttlMs = TERMINAL_AUTOCOMPLETE_CAPABILITIES_TTL_MS,
): TerminalAutocompleteCapabilitiesCacheResult {
  const cached = cache.get(cacheKey);

  if (cached?.pending) {
    return {
      status: "pending-reuse",
      promise: cached.pending,
    };
  }

  if (cached?.capabilities && now() - cached.fetchedAt < ttlMs) {
    return {
      status: "cache-hit",
      promise: Promise.resolve(cached.capabilities),
    };
  }

  const previousCapabilities = cached?.capabilities ?? null;
  const previousFetchedAt = cached?.fetchedAt ?? 0;
  const pending = fetchCapabilities().then(
    (capabilities) => {
      cache.set(cacheKey, {
        capabilities,
        fetchedAt: now(),
      });
      return capabilities;
    },
    () => {
      const fallbackCapabilities =
        previousCapabilities ?? EMPTY_HOST_CAPABILITIES;
      cache.set(cacheKey, {
        capabilities: previousCapabilities,
        fetchedAt: previousCapabilities ? previousFetchedAt : now(),
      });
      return fallbackCapabilities;
    },
  );

  cache.set(cacheKey, {
    capabilities: previousCapabilities,
    fetchedAt: previousFetchedAt,
    pending,
  });

  return {
    status: "fresh-fetch",
    promise: pending,
  };
}
