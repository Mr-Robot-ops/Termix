const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function resolveTermixImport(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    return originalResolve.call(
      this,
      path.join(root, "src/ui", request.slice(2)),
      parent,
      isMain,
      options,
    );
  }

  return originalResolve.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;

  module._compile(output, filename);
};

const autocomplete = require("../src/ui/lib/terminal-autocomplete.ts");
const autocompleteKeys = require("../src/ui/features/terminal/command-history/commandAutocompleteKeys.ts");
const autocompleteVisibility = require("../src/ui/features/terminal/command-history/commandAutocompleteVisibility.ts");
const commandHistoryEvents = require("../src/ui/features/terminal/command-history/commandHistoryEvents.ts");
const autocompleteLayout = require("../src/ui/features/terminal/command-history/commandAutocompleteLayout.ts");
const commandHelp = require("../src/ui/lib/terminal-command-help.ts");
const autocompleteI18n = require("../src/ui/lib/terminal-autocomplete-i18n.ts");
const renderedCommand = require("../src/ui/lib/terminal-rendered-command.ts");
const serviceAutocomplete = require("../src/backend/ssh/service-autocomplete.ts");
const terminalCapabilities = require("../src/backend/ssh/terminal-capabilities.ts");
const systemdAutocomplete = require("../src/backend/ssh/systemd-autocomplete.ts");

const history = [
  "sudo systemctl status certbot.timer",
  "sudo systemctl restart ssh",
  "sudo apt update",
  "sudo apt install nginx",
  "sudo apt install wireguard-tools",
  "apt-cache policy termix-agent",
  "dpkg -s raspberrypi-kernel",
  "docker compose up -d",
  "docker ps -a",
  "git commit -m initial",
  "git checkout main",
  "git checkout feature/login -- README.md",
  "git switch release/v2",
  "git merge origin/main --no-ff",
  "git push origin feature/login",
  "git branch -d old/cleanup",
  "ssh pi@192.168.178.20",
  "ssh admin@10.10.10.10",
  "ssh admin@10.10.10.10 uptime",
  "ssh -p 2222 admin@server.example uptime",
  "scp backup.sql admin@10.10.10.10:/srv/backups/",
  "rsync -avz ./release/ deploy@10.10.10.11:/srv/app/",
  "ping nas.local",
  "dig api.internal.example",
  "traceroute 10.44.0.1",
  "resolvectl query pihole.lan",
  "openssl s_client -connect mail.example.com:993",
  "openssl s_client -connect mail.example.com:993 -servername mail.example.com",
  "nmap -p 22,443 10.44.0.42",
  "host -t MX internal.example",
  "sudo nano test.sh",
  "sudo systemctl status custom-app.service",
  "journalctl -u backup.timer -f",
  "service nginx restart",
  "docker compose logs payments -f",
  "docker compose exec scheduler sh",
  "docker logs certbot-renewal",
  "tail -f /var/log/pihole/FTL.log",
  "less /etc/nginx/sites-enabled/default",
  "cat /opt/termix/config.json",
  "cd /srv/app",
  "ls /var/log/nginx",
  "ls -la /etc/ssh",
  "mkdir -p /srv/app/releases",
  "cp config.yml /etc/termix/config.yml",
  "mv old.log /var/log/archive/old.log",
  "tar -C /srv/app -xzf release.tar.gz",
  "curl -o /tmp/api-response.json https://example.com/api",
  "sudo nano /etc/ssh/sshd_config",
  "vim ~/.bashrc",
  "sudo nantest.sh",
  "sudo systemctl status cert.bot",
];

const runtimeSystemdOutput = `
  certbot.service certbot.timer
  ssh.service nginx.service docker.socket
  custom-runtime.service loaded active running Runtime Service
`;
const runtimeSystemdUnits =
  autocomplete.extractSystemdUnitsFromTerminalOutput(runtimeSystemdOutput);
const missingSystemdUnitOutput = `
  Unit mariadb.service could not be found.
  Loaded: not-found (Reason: Unit mariadb.service not found.)
`;
const raspberryPiSystemdOutput = `
  avahi-daemon.service loaded active running Avahi mDNS/DNS-SD Stack
  dbus.service loaded active running D-Bus System Message Bus
  dhcpcd.service loaded active running DHCP Client Daemon
  ssh.service loaded active running OpenBSD Secure Shell server
`;
const raspberryPiSystemdUnits =
  autocomplete.extractSystemdUnitsFromTerminalOutput(raspberryPiSystemdOutput);
const backendSystemdServiceOutput = `
  UNIT LOAD ACTIVE SUB DESCRIPTION
  accounts-daemon.service loaded active running Accounts Service
  auditd.service not-found inactive dead auditd.service
  avahi-daemon.service loaded active running Avahi mDNS/DNS-SD Stack
  bluetooth.service loaded active running Bluetooth service
  cron.service loaded active running Regular background program processing daemon
  cups.service loaded active running CUPS Scheduler
  dns.service loaded active running Technitium DNS Server
  UNIT FILE STATE PRESET
  cron.service enabled enabled
  cups.service enabled enabled
`;
const backendSystemdServices =
  systemdAutocomplete.extractSystemdServiceUnitsForAutocomplete(
    backendSystemdServiceOutput,
  );
const freshSessionBackendSystemdServices = [
  "bluetooth.service",
  "cron.service",
  "cups.service",
  "dns.service",
];
const freeBsdRcServiceOutput = `
  cron
  devd
  netif
  routing
  sshd
  zfs
`;
const freeBsdRcServices =
  serviceAutocomplete.extractFreeBsdRcServicesForAutocomplete(
    freeBsdRcServiceOutput,
  );
const debianCapabilityOutput = `
__TERMIX_UNAME__Linux
__TERMIX_OS_RELEASE__ID=debian
__TERMIX_OS_RELEASE__ID_LIKE=debian
__TERMIX_OS_RELEASE__NAME=Debian GNU/Linux
__TERMIX_CMD__systemctl
__TERMIX_CMD__journalctl
__TERMIX_CMD__systemd-analyze
__TERMIX_CMD__service
__TERMIX_CMD__sudo
__TERMIX_CMD__apt
__TERMIX_CMD__apt-get
__TERMIX_CMD__apt-cache
__TERMIX_CMD__dpkg
`;
const raspberryPiCapabilityOutput = `
__TERMIX_UNAME__Linux
__TERMIX_OS_RELEASE__ID=raspbian
__TERMIX_OS_RELEASE__ID_LIKE=debian
__TERMIX_OS_RELEASE__NAME=Raspberry Pi OS
__TERMIX_CMD__systemctl
__TERMIX_CMD__journalctl
__TERMIX_CMD__service
__TERMIX_CMD__sudo
__TERMIX_CMD__apt
__TERMIX_CMD__dpkg
`;
const ubuntuCapabilityOutput = `
__TERMIX_UNAME__Linux
__TERMIX_OS_RELEASE__ID=ubuntu
__TERMIX_OS_RELEASE__ID_LIKE=debian
__TERMIX_OS_RELEASE__NAME=Ubuntu
__TERMIX_CMD__systemctl
__TERMIX_CMD__journalctl
__TERMIX_CMD__service
__TERMIX_CMD__sudo
__TERMIX_CMD__apt
__TERMIX_CMD__apt-get
__TERMIX_CMD__dpkg
`;
const archCapabilityOutput = `
__TERMIX_UNAME__Linux
__TERMIX_OS_RELEASE__ID=arch
__TERMIX_OS_RELEASE__NAME=Arch Linux
__TERMIX_CMD__systemctl
__TERMIX_CMD__journalctl
__TERMIX_CMD__service
__TERMIX_CMD__sudo
__TERMIX_CMD__pacman
__TERMIX_CMD__makepkg
__TERMIX_CMD__yay
`;
const freeBsdCapabilityOutput = `
__TERMIX_UNAME__FreeBSD
__TERMIX_CMD__service
__TERMIX_CMD__sysrc
__TERMIX_CMD__doas
__TERMIX_CMD__pkg
`;
const debianCapabilities =
  terminalCapabilities.parseTerminalAutocompleteHostCapabilities(
    debianCapabilityOutput,
  );
const raspberryPiCapabilities =
  terminalCapabilities.parseTerminalAutocompleteHostCapabilities(
    raspberryPiCapabilityOutput,
  );
const ubuntuCapabilities =
  terminalCapabilities.parseTerminalAutocompleteHostCapabilities(
    ubuntuCapabilityOutput,
  );
const archCapabilities =
  terminalCapabilities.parseTerminalAutocompleteHostCapabilities(
    archCapabilityOutput,
  );
const freeBsdCapabilities =
  terminalCapabilities.parseTerminalAutocompleteHostCapabilities(
    freeBsdCapabilityOutput,
  );

function fail(message) {
  throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualValue = JSON.stringify(actual);
  const expectedValue = JSON.stringify(expected);
  if (actualValue !== expectedValue) {
    fail(`${message}: expected ${expectedValue}, got ${actualValue}`);
  }
}

function assertPopupKeyAction(message, event, state, expected) {
  assertDeepEqual(
    autocompleteKeys.getCommandAutocompletePopupKeyAction(event, state),
    expected,
    message,
  );
}

function assertGhostKeyAction(message, event, state, expected) {
  assertDeepEqual(
    autocompleteKeys.getCommandAutocompleteGhostKeyAction(event, state),
    expected,
    message,
  );
}

function assertInputModeAfterTerminalData(
  message,
  data,
  currentMode,
  expected,
) {
  assertEqual(
    autocompleteKeys.getCommandAutocompleteInputModeAfterTerminalData(
      data,
      currentMode,
    ),
    expected,
    message,
  );
}

function itemsFor(command, mode = "popup") {
  return autocomplete.buildTerminalAutocompleteMatchItems(command, history, {
    mode,
  });
}

function commandsFor(command) {
  return itemsFor(command).map((item) => item.command);
}

function effectiveCommandsFor(command, limit = 12) {
  return commandsFor(command)
    .slice(0, limit)
    .map((item) => item.replace(/^sudo\s+/, ""));
}

function commandsForMode(command, mode) {
  return itemsFor(command, mode).map((item) => item.command);
}

function itemsForOptions(command, options) {
  return autocomplete.buildTerminalAutocompleteMatchItems(
    command,
    history,
    options,
  );
}

function runtimeItemsFor(command) {
  return itemsForOptions(command, {
    mode: "popup",
    systemdUnits: runtimeSystemdUnits,
  });
}

function runtimeCommandsFor(command) {
  return runtimeItemsFor(command).map((item) => item.command);
}

function commandsForSystemdUnits(command, systemdUnits) {
  return itemsForOptions(command, {
    mode: "popup",
    systemdUnits,
  }).map((item) => item.command);
}

function commandsForSystemdUnitsWithHistory(
  command,
  systemdUnits,
  commandHistory,
) {
  return autocomplete
    .buildTerminalAutocompleteMatchItems(command, commandHistory, {
      mode: "popup",
      systemdUnits,
    })
    .map((item) => item.command);
}

function commandsForCapabilities(command, capabilities, options = {}) {
  return autocomplete
    .buildTerminalAutocompleteMatchItems(command, options.history ?? history, {
      mode: "popup",
      hostCapabilities: capabilities,
      runtimeCommands: options.runtimeCommands ?? capabilities.commands,
      serviceNames: options.serviceNames ?? [],
      systemdUnits: options.systemdUnits ?? [],
    })
    .map((item) => item.command);
}

function assertRuntimeIncludes(command, expected) {
  const commands = runtimeCommandsFor(command);
  if (!commands.includes(expected)) {
    fail(`Expected runtime ${JSON.stringify(command)} to include ${expected}`);
  }
}

function assertRuntimeFirst(command, expected) {
  const first = runtimeCommandsFor(command)[0];
  if (first !== expected) {
    fail(
      `Expected first runtime ${JSON.stringify(command)} to be ${expected}, got ${first}`,
    );
  }
}

function assertRuntimeSource(command, expectedCommand, source) {
  const match = runtimeItemsFor(command).find(
    (item) => item.command === expectedCommand,
  );
  if (!match) {
    fail(
      `Expected runtime ${JSON.stringify(command)} to include ${expectedCommand}`,
    );
  }
  if (match.source !== source) {
    fail(
      `Expected runtime ${expectedCommand} from ${JSON.stringify(command)} to be ${source}, got ${match.source}`,
    );
  }
}

function assertSystemdUnitsIncludes(command, systemdUnits, expected) {
  const commands = commandsForSystemdUnits(command, systemdUnits);
  if (!commands.includes(expected)) {
    fail(
      `Expected ${JSON.stringify(command)} with systemd units ${JSON.stringify(systemdUnits)} to include ${expected}`,
    );
  }
}

function assertFreshSystemdUnitsIncludes(command, systemdUnits, expected) {
  const commands = commandsForSystemdUnitsWithHistory(
    command,
    systemdUnits,
    [],
  );
  if (!commands.includes(expected)) {
    fail(
      `Expected fresh ${JSON.stringify(command)} with systemd units ${JSON.stringify(systemdUnits)} to include ${expected}`,
    );
  }
}

function assertSystemdUnitsNotIncludes(command, systemdUnits, unwanted) {
  const commands = commandsForSystemdUnits(command, systemdUnits);
  if (commands.includes(unwanted)) {
    fail(
      `Expected ${JSON.stringify(command)} with systemd units ${JSON.stringify(systemdUnits)} not to include ${unwanted}`,
    );
  }
}

function assertCapabilitiesInclude(command, capabilities, expected, options) {
  const commands = commandsForCapabilities(command, capabilities, options);
  if (!commands.includes(expected)) {
    fail(
      `Expected ${JSON.stringify(command)} with capabilities ${JSON.stringify(capabilities)} to include ${expected}`,
    );
  }
}

function assertCapabilitiesNotInclude(
  command,
  capabilities,
  unwanted,
  options,
) {
  const commands = commandsForCapabilities(command, capabilities, options);
  if (commands.includes(unwanted)) {
    fail(
      `Expected ${JSON.stringify(command)} with capabilities ${JSON.stringify(capabilities)} not to include ${unwanted}`,
    );
  }
}

function assertIncludes(command, expected) {
  const commands = commandsFor(command);
  if (!commands.includes(expected)) {
    fail(`Expected ${JSON.stringify(command)} to include ${expected}`);
  }
}

function assertNotIncludes(command, unwanted) {
  const commands = commandsFor(command);
  if (commands.includes(unwanted)) {
    fail(`Expected ${JSON.stringify(command)} not to include ${unwanted}`);
  }
}

function assertFirst(command, expected) {
  const first = commandsFor(command)[0];
  if (first !== expected) {
    fail(
      `Expected first ${JSON.stringify(command)} to be ${expected}, got ${first}`,
    );
  }
}

function assertFirstSources(command, expectedSource, count) {
  const items = itemsFor(command).slice(0, count);
  if (items.length < count) {
    fail(
      `Expected ${JSON.stringify(command)} to return at least ${count} suggestions`,
    );
  }

  const wrongItem = items.find((item) => item.source !== expectedSource);
  if (wrongItem) {
    fail(
      `Expected first ${count} suggestions for ${JSON.stringify(command)} to be ${expectedSource}, got ${wrongItem.source} for ${wrongItem.command}`,
    );
  }
}

function assertSameEffectiveSuggestions(leftCommand, rightCommand, limit = 12) {
  const left = effectiveCommandsFor(leftCommand, limit);
  const right = effectiveCommandsFor(rightCommand, limit);
  const leftValue = JSON.stringify(left);
  const rightValue = JSON.stringify(right);
  if (leftValue !== rightValue) {
    fail(
      `Expected ${JSON.stringify(leftCommand)} and ${JSON.stringify(rightCommand)} to have the same effective suggestions.\n${leftValue}\n${rightValue}`,
    );
  }
}

function assertStartsWithSequence(command, expectedSequence) {
  const commands = commandsFor(command);
  const actualSequence = commands.slice(0, expectedSequence.length);
  if (JSON.stringify(actualSequence) !== JSON.stringify(expectedSequence)) {
    fail(
      `Expected ${JSON.stringify(command)} to start with ${JSON.stringify(expectedSequence)}, got ${JSON.stringify(actualSequence)}`,
    );
  }
}

function assertBefore(command, earlier, later) {
  const commands = commandsFor(command);
  const earlierIndex = commands.indexOf(earlier);
  const laterIndex = commands.indexOf(later);
  if (earlierIndex === -1) {
    fail(`Expected ${JSON.stringify(command)} to include ${earlier}`);
  }
  if (laterIndex === -1) {
    fail(`Expected ${JSON.stringify(command)} to include ${later}`);
  }
  if (earlierIndex > laterIndex) {
    fail(
      `Expected ${earlier} to rank before ${later} for ${JSON.stringify(command)}`,
    );
  }
}

function assertMinCount(command, minCount) {
  const count = commandsFor(command).length;
  if (count < minCount) {
    fail(
      `Expected ${JSON.stringify(command)} to return at least ${minCount}, got ${count}`,
    );
  }
}

function assertManualPopupExceedsTen(command) {
  const count = itemsForOptions(command, { mode: "popup" }).length;
  if (count <= 10) {
    fail(
      `Expected manual popup ${JSON.stringify(command)} to return more than 10 suggestions, got ${count}`,
    );
  }
}

function assertCountForOptions(command, options, expectedCount) {
  const count = itemsForOptions(command, options).length;
  if (count !== expectedCount) {
    fail(
      `Expected ${JSON.stringify(command)} with ${JSON.stringify(options)} to return ${expectedCount}, got ${count}`,
    );
  }
}

function assertUnique(command) {
  const commands = commandsFor(command);
  const unique = new Set(commands);
  if (commands.length !== unique.size) {
    fail(`Expected ${JSON.stringify(command)} to return unique suggestions`);
  }
}

function assertNoModeSuggestions(command, mode) {
  const commands = commandsForMode(command, mode);
  if (commands.length > 0) {
    fail(
      `Expected ${JSON.stringify(command)} in ${mode} mode to return no suggestions, got ${commands.join(", ")}`,
    );
  }
}

function assertSource(command, expectedCommand, source) {
  const match = itemsFor(command).find(
    (item) => item.command === expectedCommand,
  );
  if (!match) {
    fail(`Expected ${JSON.stringify(command)} to include ${expectedCommand}`);
  }
  if (match.source !== source) {
    fail(
      `Expected ${expectedCommand} from ${JSON.stringify(command)} to be ${source}, got ${match.source}`,
    );
  }
}

function assertUsefulHistory(command, useful) {
  const actual = autocomplete.isUsefulAutocompleteHistoryCommand(command);
  if (actual !== useful) {
    fail(
      `Expected history usefulness of ${command} to be ${useful}, got ${actual}`,
    );
  }
}

function assertHelp(command, expectedBaseCommand) {
  const help = autocomplete.getTerminalAutocompleteHelp(command);
  if (!help) {
    fail(`Expected ${command} to have autocomplete help`);
  }
  if (help.command !== expectedBaseCommand) {
    fail(
      `Expected ${command} help to be ${expectedBaseCommand}, got ${help.command}`,
    );
  }
}

function assertSuggestionDescription(
  command,
  suggestion,
  expectedDescription,
  language = "de",
) {
  const actual = autocomplete.getTerminalAutocompleteSuggestionDescription(
    command,
    suggestion,
    { language },
  );
  if (actual !== expectedDescription) {
    fail(
      `Expected description for ${JSON.stringify(suggestion)} from ${JSON.stringify(command)} to be ${expectedDescription}, got ${actual}`,
    );
  }
}

function assertDefaultSuggestionDescription(
  command,
  suggestion,
  expectedDescription,
) {
  const actual = autocomplete.getTerminalAutocompleteSuggestionDescription(
    command,
    suggestion,
  );
  if (actual !== expectedDescription) {
    fail(
      `Expected default description for ${JSON.stringify(suggestion)} from ${JSON.stringify(command)} to be ${expectedDescription}, got ${actual}`,
    );
  }
}

function assertTopSuggestionsHaveSpecificDescriptions(commands, limit = 10) {
  for (const command of commands) {
    const items = itemsForOptions(command, { mode: "popup", limit });
    for (const item of items) {
      if (item.source === "history") {
        continue;
      }

      const help = autocomplete.getTerminalAutocompleteHelp(item.command);
      if (!help) {
        continue;
      }

      const description =
        autocomplete.getTerminalAutocompleteSuggestionDescription(
          command,
          item.command,
        );
      if (description === help.description) {
        fail(
          `Expected ${item.command} from ${JSON.stringify(command)} to have a specific suggestion description, got generic ${description}`,
        );
      }
    }
  }
}

function collectAutocompleteResourceKeys(value, prefix = "") {
  if (typeof value === "string") {
    return [prefix];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    collectAutocompleteResourceKeys(
      nestedValue,
      prefix ? `${prefix}.${key}` : key,
    ),
  );
}

function collectAutocompleteResourceStrings(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).flatMap(collectAutocompleteResourceStrings);
}

function assertAutocompleteResourceCoverage() {
  const { de, en } = autocompleteI18n.TERMINAL_AUTOCOMPLETE_I18N_RESOURCES;
  const enKeys = collectAutocompleteResourceKeys(en);
  const deKeys = collectAutocompleteResourceKeys(de);
  const enKeySet = new Set(enKeys);
  const deKeySet = new Set(deKeys);

  for (const key of enKeys) {
    if (!deKeySet.has(key)) {
      fail(`German autocomplete resource is missing key ${key}`);
    }
  }

  for (const key of deKeys) {
    if (!enKeySet.has(key)) {
      fail(`English autocomplete resource is missing key ${key}`);
    }
  }

  const commandsWithoutSuggestionDetails =
    commandHelp.TERMINAL_AUTOCOMPLETE_HELP.filter((entry) => {
      const details = en.suggestionDetails?.[entry.command];
      return !details || Object.keys(details).length === 0;
    }).map((entry) => entry.command);
  if (commandsWithoutSuggestionDetails.length > 0) {
    fail(
      `Autocomplete commands without suggestion details: ${commandsWithoutSuggestionDetails.join(", ")}`,
    );
  }

  const forbiddenGermanText =
    /[äöüÄÖÜß]|\b(?:anzeigen|ausgeben|verwenden|auswaehlen|ausführen|ausfuehren|prüfen|pruefen|setzen|erstellen|entfernen|löschen|loeschen|ändern|aendern|suchen|filtern|auflisten|kopieren|verschieben|behalten|schreiben|lesen|ignorieren|erzwingen|begrenzen|hervorheben|verfolgen|aktualisieren|verwalten|steuern|bearbeiten|wechseln|zusammenführen|zusammenfuehren|Datei|Dateien|Befehl|Befehls|Benutzer|Gruppe|Verzeichnis|Pfad|Ausgabe|Umgebung|Verbindung|Sitzung|Versionsverwaltung|inklusive|Arbeitsbaum)\b/;
  const leakedEnglish = collectAutocompleteResourceStrings(en).find((value) =>
    forbiddenGermanText.test(value),
  );

  if (leakedEnglish) {
    fail(
      `English autocomplete resource contains German text: ${leakedEnglish}`,
    );
  }

  const localeFiles = [
    "src/ui/locales/en.json",
    ...fs
      .readdirSync(path.join(root, "src/ui/locales/translated"))
      .filter((file) => file.endsWith(".json"))
      .map((file) => `src/ui/locales/translated/${file}`),
  ];
  const supportedLanguageCodes = localeFiles.map((file) => {
    if (file.endsWith("/en.json") || file.endsWith("\\en.json")) {
      return "en";
    }

    const basename = path.basename(file, ".json");
    const [language, region] = basename.split("_");
    return region ? `${language}-${region}` : language;
  });
  const supportedAutocompleteLanguages =
    autocompleteI18n.TERMINAL_AUTOCOMPLETE_SUPPORTED_LANGUAGES;
  const missingAutocompleteLanguages = supportedLanguageCodes.filter(
    (language) =>
      !supportedAutocompleteLanguages.some((autocompleteLanguage) => {
        const expected = language.toLowerCase();
        const actual = autocompleteLanguage.toLowerCase();
        return (
          actual === expected ||
          actual.split("-", 1)[0] === expected.split("-", 1)[0]
        );
      }),
  );
  if (missingAutocompleteLanguages.length > 0) {
    fail(
      `Autocomplete i18n is missing supported app languages: ${missingAutocompleteLanguages.join(", ")}`,
    );
  }
  for (const language of supportedAutocompleteLanguages) {
    const autocompleteLocaleFile = path.join(
      root,
      "src/ui/locales/autocomplete",
      `${language}.json`,
    );
    if (!fs.existsSync(autocompleteLocaleFile)) {
      fail(`Autocomplete locale file is missing for ${language}`);
    }
  }

  for (const language of supportedLanguageCodes) {
    const resource =
      autocompleteI18n.getTerminalAutocompleteI18nResource(language);
    const keys = new Set(collectAutocompleteResourceKeys(resource));
    for (const key of enKeys) {
      if (!keys.has(key)) {
        fail(`Autocomplete resource for ${language} is missing key ${key}`);
      }
    }

    if (!language.toLowerCase().startsWith("de")) {
      const leakedNonGerman = collectAutocompleteResourceStrings(resource).find(
        (value) => forbiddenGermanText.test(value.replace(/[^\x00-\x7F]/g, "")),
      );
      if (leakedNonGerman) {
        fail(
          `Autocomplete resource for ${language} contains German text: ${leakedNonGerman}`,
        );
      }
    }
  }

  const localizedRawDetailCommands = [
    "ls",
    "cd",
    "echo",
    "pwd",
    "cat",
    "less",
    "head",
    "tail",
    "printf",
    "mkdir",
    "touch",
    "cp",
    "mv",
    "rm",
    "ln",
    "chmod",
    "chown",
    "find",
    "grep",
    "sed",
    "awk",
    "sort",
    "uniq",
    "cut",
    "tr",
    "file",
    "stat",
    "whoami",
    "clear",
    "umask",
    "chgrp",
    "sum",
    "sleep",
    "logger",
    "host",
    "hostnamectl",
    "nslookup",
    "tracepath",
    "mtr",
    "nmap",
    "netstat",
    "lsof",
    "dig",
    "ping",
    "traceroute",
    "gzip",
    "gunzip",
    "bzip2",
    "bunzip2",
    "xz",
    "unxz",
    "sync",
    "rmdir",
    "comm",
    "wc",
    "tee",
    "date",
    "yes",
    "updatedb",
    "truncate",
    "strings",
    "numfmt",
    "join",
    "basename",
    "dirname",
    "readlink",
    "realpath",
    "df",
    "du",
    "cmp",
    "diff",
    "base64",
    "free",
    "md5sum",
    "sha1sum",
    "sha256sum",
    "kill",
    "killall",
    "jobs",
    "fg",
    "bg",
    "disown",
    "tmux",
    "screen",
    "alias",
    "unalias",
    "export",
    "unset",
    "history",
    "type",
    "command",
    "coredumpctl",
    "systemd-cgls",
    "systemd-cgtop",
    "systemd-analyze",
    "machinectl",
    "timedatectl",
    "service",
    "more",
    "column",
    "hexdump",
    "lsblk",
    "blkid",
    "findmnt",
    "mount",
    "umount",
    "dmesg",
    "sysctl",
    "update-alternatives",
    "loginctl",
    "localectl",
    "networkctl",
    "busctl",
  ];
  const representativeDetailKeys = {
    cat: "-n",
    cd: "~",
    echo: "-n",
    head: "-n",
    less: "-N",
    ls: "-lah",
    pwd: "| cat",
    tail: "-f",
    printf: "%s",
    mkdir: "-p",
    touch: "file.txt",
    cp: "-r",
    mv: "-v",
    rm: "-i",
    ln: "-s",
    chmod: "+x",
    chown: "-R",
    find: "-name",
    grep: "-n",
    sed: "-i",
    awk: "-F",
    sort: "-n",
    uniq: "--count",
    cut: "-f",
    tr: "-d",
    file: "-i",
    stat: "-c",
    whoami: "--help",
    clear: "-x",
    umask: "022",
    chgrp: "-R",
    sum: "-r",
    sleep: "infinity",
    logger: "--journald",
    host: "-t",
    hostnamectl: "status",
    nslookup: "-type=MX example.com",
    tracepath: "-n 8.8.8.8",
    mtr: "-T -P 443 example.com",
    nmap: "-sV",
    netstat: "-tulpn",
    lsof: "-i :443",
    dig: "+short",
    ping: "-c",
    traceroute: "-n",
    gzip: "-9",
    gunzip: "-l",
    bzip2: "-t",
    bunzip2: "-c",
    xz: "-T",
    unxz: "-t",
    sync: "-d",
    rmdir: "--ignore-fail-on-non-empty",
    comm: "--output-delimiter",
    wc: "--max-line-length",
    tee: "--output-error=warn",
    date: "+<format>",
    yes: "ok | head -n 10",
    updatedb: "--require-visibility",
    truncate: "--reference",
    strings: "--encoding",
    numfmt: "--to",
    join: "--ignore-case",
    basename: "/var/log/syslog",
    dirname: "/var/log/syslog",
    readlink: "-m missing/path",
    realpath: "--relative-to /var /var/log/syslog",
    df: "-hT",
    du: "-sh *",
    cmp: "-s file-a file-b",
    diff: "-u",
    base64: "-d encoded.txt",
    free: "-h",
    md5sum: "-c checksums.txt",
    sha1sum: "-c checksums.txt",
    sha256sum: "find . -type f -print0 | xargs -0 sha256sum",
    kill: "-9",
    killall: "-i",
    jobs: "-l %%",
    fg: "%1",
    bg: "%1",
    disown: "-h %1",
    tmux: "attach -t",
    screen: "-ls",
    alias: "ll='ls -lah'",
    unalias: "-a",
    export: "HISTCONTROL=ignoredups",
    unset: "HISTFILE",
    history: "| grep ssh",
    type: "-t systemctl",
    command: "-V history",
    coredumpctl: "debug",
    "systemd-cgls": "--unit ssh.service",
    "systemd-cgtop": "--order=memory",
    "systemd-analyze": "blame",
    machinectl: "status",
    timedatectl: "list-timezones",
    service: "--status-all",
    more: "+/error /var/log/syslog",
    column: "-t -s ':' /etc/passwd",
    hexdump: "-C -n 128 file.bin",
    lsblk: "-f",
    blkid: "-o export /dev/sda1",
    findmnt: "-o TARGET,SOURCE,FSTYPE,OPTIONS",
    mount: "-o remount,rw /",
    umount: "--recursive /mnt",
    dmesg: "-T --level=err,warn",
    sysctl: "-p /etc/sysctl.conf",
    "update-alternatives": "--set editor /usr/bin/vim",
    loginctl: "show-user",
    localectl: "list-locales",
    networkctl: "lldp",
    busctl: "introspect",
  };

  for (const command of localizedRawDetailCommands) {
    const enDetailKeys = Object.keys(en.suggestionDetails?.[command] ?? {});
    if (enDetailKeys.length === 0) {
      fail(
        `English autocomplete resource is missing ${command} suggestion details`,
      );
    }
  }

  for (const language of supportedAutocompleteLanguages) {
    if (language === "en" || language === "de") {
      continue;
    }

    const autocompleteLocaleFile = path.join(
      root,
      "src/ui/locales/autocomplete",
      `${language}.json`,
    );
    const rawResource = JSON.parse(
      fs.readFileSync(autocompleteLocaleFile, "utf8"),
    );
    const rawKeys = new Set(collectAutocompleteResourceKeys(rawResource));
    const missingRawKeys = enKeys.filter((key) => !rawKeys.has(key));
    if (missingRawKeys.length > 0) {
      fail(
        `Autocomplete locale ${language} is missing raw keys: ${missingRawKeys.join(", ")}`,
      );
    }

    for (const command of localizedRawDetailCommands) {
      const rawDetails = rawResource.suggestionDetails?.[command] ?? {};
      const enDetailKeys = Object.keys(en.suggestionDetails?.[command] ?? {});
      const missingDetails = enDetailKeys.filter(
        (key) =>
          typeof rawDetails[key] !== "string" ||
          rawDetails[key].trim().length === 0,
      );

      if (missingDetails.length > 0) {
        fail(
          `Autocomplete locale ${language} is missing raw ${command} details: ${missingDetails.join(", ")}`,
        );
      }

      const representativeKey = representativeDetailKeys[command];
      if (
        rawDetails[representativeKey] ===
        en.suggestionDetails[command][representativeKey]
      ) {
        fail(
          `Autocomplete locale ${language} still falls back to English for ${command} ${representativeKey}`,
        );
      }
    }

    for (const command of [
      "cd",
      "echo",
      "pwd",
      "cat",
      "less",
      "head",
      "tail",
      "printf",
      "mkdir",
      "rm",
      "ln",
      "chmod",
      "chown",
      "sort",
      "uniq",
      "cp",
      "mv",
      "file",
      "stat",
      "umask",
      "chgrp",
      "sum",
      "sleep",
      "logger",
      "host",
      "hostnamectl",
      "nslookup",
      "tracepath",
      "mtr",
      "nmap",
      "netstat",
      "lsof",
      "dig",
      "ping",
      "traceroute",
      "gzip",
      "gunzip",
      "bzip2",
      "bunzip2",
      "xz",
      "unxz",
      "sync",
      "rmdir",
      "comm",
      "wc",
      "tee",
      "yes",
      "updatedb",
      "truncate",
      "strings",
      "numfmt",
      "join",
      "basename",
      "dirname",
      "readlink",
      "df",
      "du",
      "jobs",
      "fg",
      "bg",
      "disown",
      "tmux",
      "screen",
      "alias",
      "unalias",
      "export",
      "unset",
      "history",
      "type",
      "coredumpctl",
      "systemd-cgls",
      "systemd-cgtop",
      "systemd-analyze",
      "machinectl",
      "timedatectl",
      "service",
      "more",
      "lsblk",
      "blkid",
      "findmnt",
      "mount",
      "umount",
      "dmesg",
      "sysctl",
      "update-alternatives",
      "loginctl",
      "localectl",
      "networkctl",
      "busctl",
    ]) {
      if (
        typeof rawResource.help?.[command] !== "string" ||
        rawResource.help[command].trim().length === 0
      ) {
        fail(`Autocomplete locale ${language} is missing raw ${command} help`);
      }
      if (
        typeof rawResource.valueDescriptions?.[command] !== "string" ||
        rawResource.valueDescriptions[command].trim().length === 0
      ) {
        fail(`Autocomplete locale ${language} is missing raw ${command} value`);
      }
      if (rawResource.help[command] === en.help[command]) {
        fail(
          `Autocomplete locale ${language} still falls back to English for ${command} help`,
        );
      }
    }

    if (
      typeof rawResource.help?.touch !== "string" ||
      rawResource.help.touch.trim().length === 0
    ) {
      fail(`Autocomplete locale ${language} is missing raw touch help`);
    }
    if (rawResource.help.touch === en.help.touch) {
      fail(
        `Autocomplete locale ${language} still falls back to English for touch help`,
      );
    }
    if (rawResource.valueDescriptions?.touch) {
      fail(
        `Autocomplete locale ${language} defines touch value without English source-of-truth`,
      );
    }

    for (const command of [
      "find",
      "grep",
      "sed",
      "awk",
      "cut",
      "tr",
      "whoami",
      "clear",
      "date",
      "realpath",
      "cmp",
      "diff",
      "base64",
      "free",
      "md5sum",
      "sha1sum",
      "sha256sum",
      "kill",
      "killall",
      "command",
      "column",
      "hexdump",
    ]) {
      if (
        typeof rawResource.help?.[command] !== "string" ||
        rawResource.help[command].trim().length === 0
      ) {
        fail(`Autocomplete locale ${language} is missing raw ${command} help`);
      }
      if (rawResource.help[command] === en.help[command]) {
        fail(
          `Autocomplete locale ${language} still falls back to English for ${command} help`,
        );
      }
      if (rawResource.valueDescriptions?.[command]) {
        fail(
          `Autocomplete locale ${language} defines ${command} value without English source-of-truth`,
        );
      }
    }
  }

  const germanGitStatus =
    autocomplete.getTerminalAutocompleteSuggestionDescription(
      "git s",
      "git status",
      { language: "de" },
    );
  if (germanGitStatus !== "Arbeitsbaumstatus anzeigen") {
    fail(`Expected German autocomplete detail text, got ${germanGitStatus}`);
  }

  const frenchGitStatus =
    autocomplete.getTerminalAutocompleteSuggestionDescription(
      "git s",
      "git status",
      { language: "fr" },
    );
  if (
    frenchGitStatus === "Show working tree status" ||
    frenchGitStatus === germanGitStatus ||
    frenchGitStatus.trim().length === 0
  ) {
    fail(
      `Expected localized non-DE autocomplete text, got ${frenchGitStatus}`,
    );
  }

  const coreLocalizedResourceExpectations = {
    "es-ES": {
      help: {
        sudo: "Ejecutar comandos con privilegios elevados",
        systemctl: "Administrar servicios y unidades systemd",
        ssh: "Establecer una conexion SSH",
      },
      valueDescriptions: {
        ssh: "Iniciar sesion SSH en este host",
      },
    },
    fr: {
      help: {
        sudo: "Executer des commandes avec des privileges eleves",
        systemctl: "Gerer les services et unites systemd",
        ssh: "Etablir une connexion SSH",
      },
      valueDescriptions: {
        ssh: "Demarrer une connexion SSH vers cet hote",
      },
    },
    ja: {
      help: {
        sudo: "昇格権限でコマンドを実行する",
        systemctl: "systemd のサービスとユニットを管理する",
        ssh: "SSH 接続を開始する",
      },
      valueDescriptions: {
        ssh: "このホストへ SSH ログインを開始する",
      },
    },
    ru: {
      help: {
        sudo: "Выполнять команды с повышенными правами",
        systemctl: "Управлять службами и юнитами systemd",
        ssh: "Устанавливать SSH-соединение",
      },
      valueDescriptions: {
        ssh: "Начать SSH-вход на этот хост",
      },
    },
    ar: {
      help: {
        sudo: "تشغيل الأوامر بصلاحيات مرتفعة",
        systemctl: "إدارة خدمات ووحدات systemd",
        ssh: "بدء اتصال SSH",
      },
      valueDescriptions: {
        ssh: "بدء تسجيل دخول SSH إلى هذا المضيف",
      },
    },
    it: {
      help: {
        sudo: "Eseguire comandi con privilegi elevati",
        systemctl: "Gestire servizi e unita systemd",
        ssh: "Stabilire una connessione SSH",
      },
      valueDescriptions: {
        ssh: "Avviare login SSH verso questo host",
      },
    },
    ko: {
      help: {
        sudo: "상승 권한으로 명령 실행",
        systemctl: "systemd 서비스와 유닛 관리",
        ssh: "SSH 연결 시작",
      },
      valueDescriptions: {
        ssh: "이 호스트로 SSH 로그인 시작",
      },
    },
    pl: {
      help: {
        sudo: "Uruchamiac polecenia z podwyzszonymi uprawnieniami",
        systemctl: "Zarzadzac uslugami i jednostkami systemd",
        ssh: "Nawiazac polaczenie SSH",
      },
      valueDescriptions: {
        ssh: "Rozpoczac logowanie SSH do tego hosta",
      },
    },
    "pt-BR": {
      help: {
        sudo: "Executar comandos com privilegios elevados",
        systemctl: "Gerenciar servicos e unidades systemd",
        ssh: "Estabelecer conexao SSH",
      },
      valueDescriptions: {
        ssh: "Iniciar login SSH neste host",
      },
    },
    "zh-CN": {
      help: {
        sudo: "以提升的权限执行命令",
        systemctl: "管理 systemd 服务和单元",
        ssh: "建立 SSH 连接",
      },
      valueDescriptions: {
        ssh: "开始登录此主机的 SSH 会话",
      },
    },
    "zh-TW": {
      help: {
        sudo: "以提升的權限執行指令",
        systemctl: "管理 systemd 服務和單元",
        ssh: "建立 SSH 連線",
      },
      valueDescriptions: {
        ssh: "開始登入此主機的 SSH 工作階段",
      },
    },
  };

  for (const [language, sections] of Object.entries(
    coreLocalizedResourceExpectations,
  )) {
    const resource = autocompleteI18n.getTerminalAutocompleteI18nResource(
      language,
    );
    for (const [section, values] of Object.entries(sections)) {
      for (const [key, expected] of Object.entries(values)) {
        const actual = resource[section]?.[key];
        if (actual !== expected) {
          fail(
            `Expected ${language} autocomplete ${section}.${key} to be ${expected}, got ${actual}`,
          );
        }
        if (/: [A-Z][A-Za-z]/.test(actual)) {
          fail(
            `Expected ${language} autocomplete ${section}.${key} to avoid generated filler text, got ${actual}`,
          );
        }
      }
    }
  }

  const coreVisibleHelpKeys = [
    "sudo",
    "su",
    "systemctl",
    "journalctl",
    "ip",
    "ifconfig",
    "ps",
    "top",
    "htop",
    "pkill",
    "pgrep",
    "ss",
    "curl",
    "wget",
    "ssh",
    "scp",
    "rsync",
    "uptime",
    "rg",
    "tar",
    "tree",
    "nano",
    "vim",
    "xargs",
    "env",
    "printenv",
    "who",
    "which",
    "whereis",
    "uname",
    "hostname",
    "id",
    "groups",
    "crontab",
    "dpkg",
    "zstd",
    "zcat",
    "zgrep",
    "zip",
    "unzip",
  ];
  const coreVisibleValueKeys = [
    "sudo",
    "htop",
    "top",
    "pgrep",
    "pkill",
    "scp",
    "ssh",
    "which",
    "whereis",
    "unzip",
    "zip",
    "zstd",
    "ifconfig",
    "nano",
    "ufw",
    "zgrep",
    "visudo",
    "groupmod",
    "patch",
    "ssh-keyscan",
    "service",
    "alias",
    "systemd-cgtop",
    "lsof",
    "machinectl",
    "groupdel",
    "ncdu",
    "pidof",
    "ssh-copy-id",
    "vim",
    "kubectl",
    "aws",
    "az",
    "gcloud",
    "terraform",
    "helm",
    "ansible-inventory",
    "pg_dump",
    "pg_restore",
  ];
  const fullyLocalizedHelpKeys = [
    "fsck",
    "lsmod",
    "node",
    "shred",
    "ssh-add",
    "ssh-keygen",
    "lspci",
    "lsusb",
    "ufw",
    "zgrep",
    "ifconfig",
    "ipcalc",
    "journalctl",
    "ss",
    "su",
    "visudo",
    "groupmod",
    "patch",
    "ssh-keyscan",
    "resolvectl",
    "sshfs",
    "service",
    "alias",
    "systemd-cgtop",
    "lsof",
    "machinectl",
    "groupdel",
    "tree",
    "nc",
    "ncdu",
    "pidof",
    "ssh-copy-id",
    "iotop",
    "logrotate",
    "vim",
    "env",
    "ps",
    "apt-cache",
    "tcpdump",
    "git",
    "kubectl",
    "aws",
    "az",
    "gcloud",
    "terraform",
    "helm",
    "ansible-inventory",
    "pg_dump",
    "pg_restore",
  ];

  for (const language of supportedAutocompleteLanguages) {
    if (language === "en" || language === "de") {
      continue;
    }
    const resource = autocompleteI18n.getTerminalAutocompleteI18nResource(
      language,
    );
    for (const key of coreVisibleHelpKeys) {
      const actual = resource.help?.[key];
      if (actual === en.help[key]) {
        fail(
          `Expected ${language} autocomplete help.${key} to be localized, got English fallback ${actual}`,
        );
      }
      if (/: [A-Z][A-Za-z]/.test(actual)) {
        fail(
          `Expected ${language} autocomplete help.${key} to avoid generated filler text, got ${actual}`,
        );
      }
    }
    for (const key of fullyLocalizedHelpKeys) {
      const actual = resource.help?.[key];
      if (typeof actual !== "string" || actual.trim().length === 0) {
        fail(`Expected ${language} autocomplete help.${key} to be present`);
      }
      if (actual === en.help[key]) {
        fail(
          `Expected ${language} autocomplete help.${key} to be localized, got English fallback ${actual}`,
        );
      }
      if (/: [A-Z][A-Za-z]/.test(actual)) {
        fail(
          `Expected ${language} autocomplete help.${key} to avoid generated filler text, got ${actual}`,
        );
      }
    }
    for (const key of coreVisibleValueKeys) {
      const actual = resource.valueDescriptions?.[key];
      if (actual === en.valueDescriptions[key]) {
        fail(
          `Expected ${language} autocomplete valueDescriptions.${key} to be localized, got English fallback ${actual}`,
        );
      }
      if (/: [A-Z][A-Za-z]/.test(actual)) {
        fail(
          `Expected ${language} autocomplete valueDescriptions.${key} to avoid generated filler text, got ${actual}`,
        );
      }
    }
  }

  const genericAutocompleteFillerPattern =
    /Use this suggestion for:|Usa esta sugerencia para:|Utiliser cette suggestion pour|この候補を使って|Gebruik hierdie opdrag vir:|Gebruik deze opdracht om:|Bruk denne kommandoen til|Brug denne kommando til|Kies 'n voorstel vir:|Elige una sugerencia para:|Choisis une suggestion pour/;
  for (const language of supportedAutocompleteLanguages) {
    if (language === "en" || language === "de") {
      continue;
    }
    const resource = autocompleteI18n.getTerminalAutocompleteI18nResource(
      language,
    );
    const visitResource = (node, path = []) => {
      for (const [key, value] of Object.entries(node ?? {})) {
        const nextPath = path.concat(key);
        if (typeof value === "string") {
          if (genericAutocompleteFillerPattern.test(value)) {
            fail(
              `Expected ${language} autocomplete ${nextPath.join(".")} to avoid generated filler text, got ${value}`,
            );
          }
          continue;
        }
        if (value && typeof value === "object") {
          visitResource(value, nextPath);
        }
      }
    };
    visitResource(resource);
  }

  const fullyLocalizedDetailCommands = [
    "ssh",
    "sudo",
    "nano",
    "memusage",
    "install",
    "npm",
    "pnpm",
    "yarn",
    "docker",
    "tar",
    "zip",
    "unzip",
    "gzip",
    "gunzip",
    "bzip2",
    "bunzip2",
    "whereis",
    "man",
    "systemctl",
    "rsync",
    "dd",
    "ethtool",
    "fdisk",
    "parted",
    "passwd",
    "chage",
    "useradd",
    "groupadd",
    "usermod",
    "userdel",
    "groups",
    "id",
    "whoami",
    "uname",
    "hostname",
    "uptime",
    "lscpu",
    "vmstat",
    "iostat",
    "top",
    "htop",
    "watch",
    "nload",
    "iperf3",
    "iftop",
    "curl",
    "wget",
    "openssl s_client",
    "nft",
    "make",
    "dpkg",
    "modprobe",
    "nmcli",
    "certbot",
    "pm2",
    "psql",
    "mysql",
    "ansible",
    "ansible-playbook",
    "git",
    "kubectl",
    "aws",
    "az",
    "gcloud",
    "terraform",
    "ansible-inventory",
    "helm",
    "modinfo",
    "fsck",
    "lsmod",
    "lspci",
    "lsusb",
    "node",
    "shred",
    "pip",
    "nl",
    "pgrep",
    "rg",
    "sqlite3",
    "supervisorctl",
    "docker compose",
    "yq",
    "xxd",
    "mysqldump",
    "python",
    "redis-cli",
    "mongosh",
    "nginx",
    "timeout",
    "split",
    "scp",
    "ssh-agent",
    "ssh-add",
    "ssh-keygen",
    "ufw",
    "zgrep",
    "ifconfig",
    "ipcalc",
    "journalctl",
    "ss",
    "su",
    "visudo",
    "groupmod",
    "patch",
    "which",
    "ssh-keyscan",
    "resolvectl",
    "sshfs",
    "service",
    "alias",
    "systemd-cgtop",
    "lsof",
    "machinectl",
    "groupdel",
    "tree",
    "nc",
    "ncdu",
    "pidof",
    "ssh-copy-id",
    "iotop",
    "logrotate",
    "vim",
    "env",
    "ps",
    "apt-cache",
    "tcpdump",
    "locate",
    "iptables",
    "seq",
    "pstree",
    "ip",
    "zcat",
    "zstd",
    "vnstat",
    "paste",
    "apachectl",
    "info",
    "apt",
    "apt-get",
    "sftp",
    "crontab",
    "pg_dump",
    "pg_restore",
    "nohup",
    "xargs",
    "jq",
    "cksum",
    "who",
    "shuf",
    "test",
    "od",
    "pkill",
    "iw",
    "cal",
    "printenv",
  ];
  const localizedDetailKeyExpectations = {
    git: [
      "status",
      "add",
      "commit",
      "push",
      "pull",
      "fetch",
      "branch",
      "checkout",
      "switch",
      "merge",
      "rebase",
      "log",
      "diff",
      "stash",
      "remote",
      "clone",
      "init",
      "reset",
      "restore",
      "rm",
      "tag",
      "cherry-pick",
      "config",
      "clean",
      "show",
    ],
  };
  for (const language of supportedAutocompleteLanguages) {
    if (language === "en" || language === "de") {
      continue;
    }
    const resource = autocompleteI18n.getTerminalAutocompleteI18nResource(
      language,
    );
    for (const command of fullyLocalizedDetailCommands) {
      for (const [key, englishText] of Object.entries(
        en.suggestionDetails[command] ?? {},
      )) {
        const actual = resource.suggestionDetails?.[command]?.[key];
        if (typeof actual !== "string" || actual.trim().length === 0) {
          fail(
            `Expected ${language} autocomplete suggestionDetails.${command}.${key} to be present`,
          );
        }
        if (actual === englishText) {
          fail(
            `Expected ${language} autocomplete suggestionDetails.${command}.${key} to be localized, got English fallback ${actual}`,
          );
        }
        if (/: [A-Z][A-Za-z]/.test(actual)) {
          fail(
            `Expected ${language} autocomplete suggestionDetails.${command}.${key} to avoid generated filler text, got ${actual}`,
          );
        }
      }
    }
    for (const [command, keys] of Object.entries(localizedDetailKeyExpectations)) {
      for (const key of keys) {
        const englishText = en.suggestionDetails[command]?.[key];
        const actual = resource.suggestionDetails?.[command]?.[key];
        if (typeof actual !== "string" || actual.trim().length === 0) {
          fail(
            `Expected ${language} autocomplete suggestionDetails.${command}.${key} to be present`,
          );
        }
        if (actual === englishText) {
          fail(
            `Expected ${language} autocomplete suggestionDetails.${command}.${key} to be localized, got English fallback ${actual}`,
          );
        }
        if (/: [A-Z][A-Za-z]/.test(actual)) {
          fail(
            `Expected ${language} autocomplete suggestionDetails.${command}.${key} to avoid generated filler text, got ${actual}`,
          );
        }
      }
    }
  }

  const translatedLsDetailExpectations = {
    ar: "قائمة طويلة تشمل الإدخالات المخفية بأحجام سهلة القراءة",
    "es-ES": "lista larga con entradas ocultas y tamanos legibles",
    fr: "liste longue avec entrees cachees et tailles lisibles",
    ja: "隠し項目と読みやすいサイズを含む詳細一覧",
    ru: "подробный список со скрытыми элементами и читаемыми размерами",
    "zh-CN": "包含隐藏条目和易读大小的长列表",
  };

  for (const [language, expected] of Object.entries(
    translatedLsDetailExpectations,
  )) {
    const actual = autocomplete.getTerminalAutocompleteSuggestionDescription(
      "ls ",
      "ls -lah",
      { language },
    );
    if (actual !== expected) {
      fail(
        `Expected ${language} autocomplete ls -lah detail to be ${expected}, got ${actual}`,
      );
    }
  }

  const translatedShellBasicsExpectations = {
    "cat -n": {
      command: "cat ",
      suggestion: "cat -n",
      values: {
        "es-ES": "numerar todas las lineas de salida",
        fr: "numeroter toutes les lignes de sortie",
        ja: "すべての出力行に番号を付ける",
        ru: "нумеровать все строки вывода",
        "zh-CN": "为所有输出行编号",
      },
    },
    "echo -n": {
      command: "echo ",
      suggestion: "echo -n",
      values: {
        "es-ES": "No imprimir la nueva linea final",
        fr: "Ne pas afficher la nouvelle ligne finale",
        ja: "末尾の改行を出力しない",
        ru: "Не печатать завершающий перевод строки",
        "zh-CN": "不打印末尾换行",
      },
    },
    "cd ~": {
      command: "cd ",
      suggestion: "cd ~",
      values: {
        "es-ES": "Cambiar al directorio personal",
        fr: "Aller dans le repertoire personnel",
        ja: "ホームディレクトリへ移動する",
        ru: "Перейти в домашний каталог",
        "zh-CN": "切换到主目录",
      },
    },
    "head -n": {
      command: "head ",
      suggestion: "head -n",
      values: {
        "es-ES": "Definir numero de lineas a mostrar",
        fr: "Definir le nombre de lignes a afficher",
        ja: "出力する行数を設定する",
        ru: "Задать число выводимых строк",
        "zh-CN": "设置要输出的行数",
      },
    },
    "less -N": {
      command: "less ",
      suggestion: "less -N",
      values: {
        "es-ES": "Mostrar numeros de linea",
        fr: "Afficher les numeros de ligne",
        ja: "行番号を表示する",
        ru: "Показать номера строк",
        "zh-CN": "显示行号",
      },
    },
    "tail -f": {
      command: "tail ",
      suggestion: "tail -f",
      values: {
        "es-ES": "Seguir el final del archivo en vivo",
        fr: "Suivre la fin du fichier en direct",
        ja: "ファイル末尾をリアルタイムに追跡する",
        ru: "Отслеживать конец файла в реальном времени",
        "zh-CN": "实时跟踪文件末尾",
      },
    },
    "printf %s": {
      command: "printf ",
      suggestion: "printf %s",
      values: {
        "es-ES": "Mostrar cadena formateada",
        fr: "Afficher une chaine formatee",
        ja: "文字列を書式付きで出力する",
        ru: "Вывести форматированную строку",
        "zh-CN": "输出格式化字符串",
      },
    },
    "mkdir -p": {
      command: "mkdir ",
      suggestion: "mkdir -p",
      values: {
        "es-ES": "crear directorios padre faltantes",
        fr: "creer les repertoires parents manquants",
        ja: "不足している親ディレクトリを作成する",
        ru: "создать отсутствующие родительские каталоги",
        "zh-CN": "创建缺失的父目录",
      },
    },
    "touch file.txt": {
      command: "touch ",
      suggestion: "touch file.txt",
      values: {
        "es-ES": "Crear archivo o actualizar marca temporal",
        fr: "Creer un fichier ou mettre a jour l'horodatage",
        ja: "ファイルを作成またはタイムスタンプを更新する",
        ru: "Создать файл или обновить метку времени",
        "zh-CN": "创建文件或更新时间戳",
      },
    },
    "cp -r": {
      command: "cp ",
      suggestion: "cp -r",
      values: {
        "es-ES": "Copiar directorios recursivamente",
        fr: "Copier les repertoires recursivement",
        ja: "ディレクトリを再帰的にコピーする",
        ru: "Копировать каталоги рекурсивно",
        "zh-CN": "递归复制目录",
      },
    },
    "mv -v": {
      command: "mv ",
      suggestion: "mv -v",
      values: {
        "es-ES": "Mostrar archivos movidos",
        fr: "Afficher les fichiers deplaces",
        ja: "移動したファイルを表示する",
        ru: "Показать перемещенные файлы",
        "zh-CN": "显示已移动的文件",
      },
    },
    "rm -i": {
      command: "rm ",
      suggestion: "rm -i",
      values: {
        "es-ES": "preguntar antes de cada eliminacion",
        fr: "demander avant chaque suppression",
        ja: "削除ごとに確認する",
        ru: "спрашивать перед каждым удалением",
        "zh-CN": "每次删除前询问",
      },
    },
    "ln -s": {
      command: "ln ",
      suggestion: "ln -s",
      values: {
        "es-ES": "Crear enlaces simbolicos en lugar de enlaces duros",
        fr: "Creer des liens symboliques au lieu de liens physiques",
        ja: "ハードリンクの代わりにシンボリックリンクを作成する",
        ru: "Создавать символические ссылки вместо жестких ссылок",
        "zh-CN": "创建符号链接而不是硬链接",
      },
    },
    "chmod +x": {
      command: "chmod ",
      suggestion: "chmod +x",
      values: {
        "es-ES": "Agregar permiso de ejecucion",
        fr: "Ajouter le droit d execution",
        ja: "実行権限を追加する",
        ru: "Добавить право выполнения",
        "zh-CN": "添加执行权限",
      },
    },
    "chown -R": {
      command: "chown ",
      suggestion: "chown -R",
      values: {
        "es-ES": "Cambiar propietario recursivamente",
        fr: "Changer le proprietaire recursivement",
        ja: "所有者を再帰的に変更する",
        ru: "Изменять владельца рекурсивно",
        "zh-CN": "递归更改所有者",
      },
    },
    "find -name": {
      command: "find ",
      suggestion: "find -name",
      values: {
        "es-ES": "buscar por nombre de archivo",
        fr: "rechercher par nom de fichier",
        ja: "ファイル名で検索する",
        ru: "искать по имени файла",
        "zh-CN": "按文件名搜索",
      },
    },
    "grep -n": {
      command: "grep ",
      suggestion: "grep -n",
      values: {
        "es-ES": "Mostrar numeros de linea",
        fr: "Afficher les numeros de ligne",
        ja: "行番号を表示する",
        ru: "Показать номера строк",
        "zh-CN": "显示行号",
      },
    },
    "sed -i": {
      command: "sed ",
      suggestion: "sed -i",
      values: {
        "es-ES": "Editar archivos directamente",
        fr: "Modifier les fichiers directement",
        ja: "ファイルを直接編集する",
        ru: "Редактировать файлы напрямую",
        "zh-CN": "直接编辑文件",
      },
    },
    "awk -F": {
      command: "awk ",
      suggestion: "awk -F",
      values: {
        "es-ES": "Definir separadores de campo",
        fr: "Definir les separateurs de champs",
        ja: "フィールド区切りを設定する",
        ru: "Задать разделители полей",
        "zh-CN": "设置字段分隔符",
      },
    },
    "sort -n": {
      command: "sort ",
      suggestion: "sort -n",
      values: {
        "es-ES": "ordenar numericamente",
        fr: "trier numeriquement",
        ja: "数値として並べ替える",
        ru: "сортировать численно",
        "zh-CN": "按数字排序",
      },
    },
    "uniq --count": {
      command: "uniq ",
      suggestion: "uniq --count",
      values: {
        "es-ES": "Contar repeticiones",
        fr: "Compter les repetitions",
        ja: "繰り返し回数を数える",
        ru: "Подсчитать повторения",
        "zh-CN": "统计重复次数",
      },
    },
    "cut -f": {
      command: "cut ",
      suggestion: "cut -f",
      values: {
        "es-ES": "Seleccionar campos",
        fr: "Selectionner les champs",
        ja: "フィールドを選択する",
        ru: "Выбрать поля",
        "zh-CN": "选择字段",
      },
    },
    "tr -d": {
      command: "tr ",
      suggestion: "tr -d",
      values: {
        "es-ES": "Eliminar caracteres",
        fr: "Supprimer des caracteres",
        ja: "文字を削除する",
        ru: "Удалить символы",
        "zh-CN": "删除字符",
      },
    },
    "file -i": {
      command: "file ",
      suggestion: "file -i",
      values: {
        "es-ES": "Mostrar tipo MIME",
        fr: "Afficher le type MIME",
        ja: "MIME タイプを出力する",
        ru: "Вывести MIME-тип",
        "zh-CN": "输出 MIME 类型",
      },
    },
    "stat -c": {
      command: "stat ",
      suggestion: "stat -c",
      values: {
        "es-ES": "Establecer formato de salida",
        fr: "Definir le format de sortie",
        ja: "出力形式を設定する",
        ru: "Задать формат вывода",
        "zh-CN": "设置输出格式",
      },
    },
    "whoami --help": {
      command: "whoami ",
      suggestion: "whoami --help",
      values: {
        "es-ES": "Mostrar ayuda",
        fr: "Afficher l'aide",
        ja: "ヘルプを表示する",
        ru: "Показать справку",
        "zh-CN": "显示帮助",
      },
    },
    "clear -x": {
      command: "clear ",
      suggestion: "clear -x",
      values: {
        "es-ES": "No borrar el bufer de desplazamiento",
        fr: "Ne pas effacer le tampon de defilement",
        ja: "スクロールバックバッファを消去しない",
        ru: "Не очищать буфер прокрутки",
        "zh-CN": "不清除回滚缓冲区",
      },
    },
    "umask 022": {
      command: "umask ",
      suggestion: "umask 022",
      values: {
        "es-ES": "Establecer permisos predeterminados en 755 para directorios y 644 para archivos",
        fr: "Definir les permissions par defaut a 755 pour les repertoires et 644 pour les fichiers",
        ja: "ディレクトリは 755、ファイルは 644 の既定権限に設定する",
        ru: "Задать права по умолчанию 755 для каталогов и 644 для файлов",
        "zh-CN": "将目录默认权限设为 755，文件设为 644",
      },
    },
    "chgrp -R": {
      command: "chgrp ",
      suggestion: "chgrp -R",
      values: {
        "es-ES": "Cambiar grupo recursivamente",
        fr: "Changer le groupe recursivement",
        ja: "グループを再帰的に変更する",
        ru: "Изменять группу рекурсивно",
        "zh-CN": "递归更改组",
      },
    },
    "sum -r": {
      command: "sum ",
      suggestion: "sum -r",
      values: {
        "es-ES": "Usar el algoritmo de suma de comprobacion BSD",
        fr: "Utiliser l'algorithme de somme de controle BSD",
        ja: "BSD チェックサムアルゴリズムを使用する",
        ru: "Использовать алгоритм контрольной суммы BSD",
        "zh-CN": "使用 BSD 校验和算法",
      },
    },
    "sleep infinity": {
      command: "sleep ",
      suggestion: "sleep infinity",
      values: {
        "es-ES": "Dormir hasta que se interrumpa",
        fr: "Dormir jusqu'a interruption",
        ja: "中断されるまでスリープする",
        ru: "Спать до прерывания",
        "zh-CN": "休眠直到被中断",
      },
    },
    "logger --journald": {
      command: "logger ",
      suggestion: "logger --journald",
      values: {
        "es-ES": "Enviar campos journald estructurados",
        fr: "Envoyer des champs journald structures",
        ja: "構造化 journald フィールドを送信する",
        ru: "Отправить структурированные поля journald",
        "zh-CN": "提交结构化 journald 字段",
      },
    },
    "host -t": {
      command: "host ",
      suggestion: "host -t",
      values: {
        "es-ES": "Seleccionar tipo de registro DNS",
        fr: "Choisir le type d'enregistrement DNS",
        ja: "DNS レコードタイプを選択する",
        ru: "Выбрать тип DNS-записи",
        "zh-CN": "选择 DNS 记录类型",
      },
    },
    "dig +short": {
      command: "dig ",
      suggestion: "dig +short",
      values: {
        "es-ES": "dar solo una respuesta breve",
        fr: "ne donner qu'une reponse courte",
        ja: "短い回答だけを出力する",
        ru: "вывести только краткий ответ",
        "zh-CN": "只给出简短答案",
      },
    },
    "ping -c": {
      command: "ping ",
      suggestion: "ping -c",
      values: {
        "es-ES": "Limitar numero de paquetes",
        fr: "Limiter le nombre de paquets",
        ja: "パケット数を制限する",
        ru: "Ограничить число пакетов",
        "zh-CN": "限制数据包数量",
      },
    },
    "traceroute -n": {
      command: "traceroute ",
      suggestion: "traceroute -n",
      values: {
        "es-ES": "No resolver direcciones",
        fr: "Ne pas resoudre les adresses",
        ja: "アドレスを解決しない",
        ru: "Не разрешать адреса",
        "zh-CN": "不解析地址",
      },
    },
    "gzip -9": {
      command: "gzip ",
      suggestion: "gzip -9",
      values: {
        "es-ES": "Usar la compresion mas fuerte",
        fr: "Utiliser la compression la plus forte",
        ja: "最強の圧縮を使用する",
        ru: "Использовать самое сильное сжатие",
        "zh-CN": "使用最强压缩",
      },
    },
    "gunzip -l": {
      command: "gunzip ",
      suggestion: "gunzip -l",
      values: {
        "es-ES": "Mostrar tamanos de archivos comprimidos",
        fr: "Afficher les tailles des fichiers compresses",
        ja: "圧縮ファイルのサイズを表示する",
        ru: "Показать размеры сжатых файлов",
        "zh-CN": "显示压缩文件大小",
      },
    },
    "bzip2 -t": {
      command: "bzip2 ",
      suggestion: "bzip2 -t",
      values: {
        "es-ES": "Comprobar archivo comprimido",
        fr: "Verifier le fichier compresse",
        ja: "圧縮ファイルを検査する",
        ru: "Проверить сжатый файл",
        "zh-CN": "检查压缩文件",
      },
    },
    "bunzip2 -c": {
      command: "bunzip2 ",
      suggestion: "bunzip2 -c",
      values: {
        "es-ES": "Escribir contenido descomprimido en stdout",
        fr: "Ecrire le contenu decompresse sur stdout",
        ja: "展開した内容を stdout に書き込む",
        ru: "Записать распакованное содержимое в stdout",
        "zh-CN": "将解压内容写入 stdout",
      },
    },
    "xz -T": {
      command: "xz ",
      suggestion: "xz -T",
      values: {
        "es-ES": "Establecer numero de hilos de compresion",
        fr: "Definir le nombre de threads de compression",
        ja: "圧縮スレッド数を設定する",
        ru: "Задать число потоков сжатия",
        "zh-CN": "设置压缩线程数",
      },
    },
    "unxz -t": {
      command: "unxz ",
      suggestion: "unxz -t",
      values: {
        "es-ES": "Comprobar archivo comprimido",
        fr: "Verifier le fichier compresse",
        ja: "圧縮ファイルを検査する",
        ru: "Проверить сжатый файл",
        "zh-CN": "检查压缩文件",
      },
    },
    "sync -d": {
      command: "sync ",
      suggestion: "sync -d",
      values: {
        "es-ES": "Vaciar solo datos del archivo",
        fr: "Vider uniquement les donnees du fichier",
        ja: "ファイルデータだけを書き出す",
        ru: "Сбросить только данные файла",
        "zh-CN": "仅刷新文件数据",
      },
    },
    "rmdir --ignore-fail-on-non-empty": {
      command: "rmdir ",
      suggestion: "rmdir --ignore-fail-on-non-empty",
      values: {
        "es-ES": "Ignorar fallos causados por directorios no vacios",
        fr: "Ignorer les echecs dus aux repertoires non vides",
        ja: "空でないディレクトリによる失敗を無視する",
        ru: "Игнорировать ошибки из-за непустых каталогов",
        "zh-CN": "忽略由非空目录导致的失败",
      },
    },
    "comm --output-delimiter": {
      command: "comm ",
      suggestion: "comm --output-delimiter",
      values: {
        "es-ES": "Usar un delimitador de columna personalizado",
        fr: "Utiliser un delimiteur de colonne personnalise",
        ja: "カスタム列区切り文字を使用する",
        ru: "Использовать собственный разделитель столбцов",
        "zh-CN": "使用自定义列分隔符",
      },
    },
    "wc --max-line-length": {
      command: "wc ",
      suggestion: "wc --max-line-length",
      values: {
        "es-ES": "Mostrar longitud de la linea mas larga",
        fr: "Afficher la longueur de la ligne la plus longue",
        ja: "最長行の長さを表示する",
        ru: "Показать длину самой длинной строки",
        "zh-CN": "显示最长行的长度",
      },
    },
    "tee --output-error=warn": {
      command: "tee ",
      suggestion: "tee --output-error=warn",
      values: {
        "es-ES": "Informar errores de escritura y continuar",
        fr: "Signaler les erreurs d'ecriture et continuer",
        ja: "書き込みエラーを報告して続行する",
        ru: "Сообщать об ошибках записи и продолжать",
        "zh-CN": "报告写入错误并继续",
      },
    },
    "date +<format>": {
      command: "date ",
      suggestion: "date +<format>",
      values: {
        "es-ES": "Controlar salida con cadena de formato",
        fr: "Controler la sortie avec une chaine de format",
        ja: "書式文字列で出力を制御する",
        ru: "Управлять выводом с помощью строки формата",
        "zh-CN": "用格式字符串控制输出",
      },
    },
    "yes ok | head -n 10": {
      command: "yes ",
      suggestion: "yes ok | head -n 10",
      values: {
        "es-ES": "Imprimir ok repetidamente y mostrar diez lineas",
        fr: "Imprimer ok de facon repetee et afficher dix lignes",
        ja: "ok を繰り返し出力し、10 行を表示する",
        ru: "Печатать ok повторно и показать десять строк",
        "zh-CN": "重复打印 ok 并显示十行",
      },
    },
    "updatedb --require-visibility": {
      command: "updatedb ",
      suggestion: "updatedb --require-visibility",
      values: {
        "es-ES": "Controlar comprobaciones de visibilidad de directorios",
        fr: "Controler les verifications de visibilite des repertoires",
        ja: "ディレクトリの可視性チェックを制御する",
        ru: "Управлять проверками видимости каталогов",
        "zh-CN": "控制目录可见性检查",
      },
    },
    "truncate --reference": {
      command: "truncate ",
      suggestion: "truncate --reference",
      values: {
        "es-ES": "Usar el tamano de otro archivo como referencia",
        fr: "Utiliser la taille d'un autre fichier comme reference",
        ja: "別のファイルサイズを参照として使用する",
        ru: "Использовать размер другого файла как эталон",
        "zh-CN": "使用另一个文件大小作为参考",
      },
    },
    "strings --encoding": {
      command: "strings ",
      suggestion: "strings --encoding",
      values: {
        "es-ES": "Seleccionar codificacion de caracteres",
        fr: "Choisir l'encodage des caracteres",
        ja: "文字エンコーディングを選択する",
        ru: "Выбрать кодировку символов",
        "zh-CN": "选择字符编码",
      },
    },
    "numfmt --to": {
      command: "numfmt ",
      suggestion: "numfmt --to",
      values: {
        "es-ES": "Convertir numeros a un sistema de unidades destino",
        fr: "Convertir les nombres vers un systeme d'unites cible",
        ja: "\u6570\u5024\u3092\u5909\u63db\u5148\u306e\u5358\u4f4d\u4f53\u7cfb\u3078\u5909\u63db\u3059\u308b",
        ru: "\u041f\u0440\u0435\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u044c \u0447\u0438\u0441\u043b\u0430 \u0432 \u0446\u0435\u043b\u0435\u0432\u0443\u044e \u0441\u0438\u0441\u0442\u0435\u043c\u0443 \u0435\u0434\u0438\u043d\u0438\u0446",
        "zh-CN": "\u5c06\u6570\u5b57\u8f6c\u6362\u5230\u76ee\u6807\u5355\u4f4d\u4f53\u7cfb",
      },
    },
    "join --ignore-case": {
      command: "join ",
      suggestion: "join --ignore-case",
      values: {
        "es-ES": "Unir sin distinguir mayusculas y minusculas",
        fr: "Joindre sans tenir compte de la casse",
        ja: "\u5927\u6587\u5b57\u5c0f\u6587\u5b57\u3092\u533a\u5225\u305b\u305a\u306b\u7d50\u5408\u3059\u308b",
        ru: "\u041e\u0431\u044a\u0435\u0434\u0438\u043d\u044f\u0442\u044c \u0431\u0435\u0437 \u0443\u0447\u0435\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430",
        "zh-CN": "\u5ffd\u7565\u5927\u5c0f\u5199\u8fdb\u884c\u8fde\u63a5",
      },
    },
    "basename /var/log/syslog": {
      command: "basename ",
      suggestion: "basename /var/log/syslog",
      values: {
        "es-ES": "Extraer el nombre syslog desde la ruta",
        fr: "Extraire le nom syslog depuis le chemin",
        ja: "\u30d1\u30b9\u304b\u3089 syslog \u3068\u3044\u3046\u30d5\u30a1\u30a4\u30eb\u540d\u3092\u53d6\u308a\u51fa\u3059",
        ru: "\u0418\u0437\u0432\u043b\u0435\u0447\u044c \u0438\u043c\u044f \u0444\u0430\u0439\u043b\u0430 syslog \u0438\u0437 \u043f\u0443\u0442\u0438",
        "zh-CN": "\u4ece\u8def\u5f84\u63d0\u53d6\u6587\u4ef6\u540d syslog",
      },
    },
    "dirname /var/log/syslog": {
      command: "dirname ",
      suggestion: "dirname /var/log/syslog",
      values: {
        "es-ES": "Extraer el directorio /var/log desde la ruta",
        fr: "Extraire le repertoire /var/log depuis le chemin",
        ja: "\u30d1\u30b9\u304b\u3089 /var/log \u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u3092\u53d6\u308a\u51fa\u3059",
        ru: "\u0418\u0437\u0432\u043b\u0435\u0447\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433 /var/log \u0438\u0437 \u043f\u0443\u0442\u0438",
        "zh-CN": "\u4ece\u8def\u5f84\u63d0\u53d6\u76ee\u5f55 /var/log",
      },
    },
    "readlink -m missing/path": {
      command: "readlink ",
      suggestion: "readlink -m missing/path",
      values: {
        "es-ES": "Resolver ruta incluso con componentes faltantes",
        fr: "Resoudre le chemin meme avec des composants manquants",
        ja: "\u5b58\u5728\u3057\u306a\u3044\u69cb\u6210\u8981\u7d20\u304c\u3042\u3063\u3066\u3082\u30d1\u30b9\u3092\u89e3\u6c7a\u3059\u308b",
        ru: "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044c \u043f\u0443\u0442\u044c \u0434\u0430\u0436\u0435 \u0441 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u043c\u0438 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u0430\u043c\u0438",
        "zh-CN": "\u5373\u4f7f\u6709\u7f3a\u5931\u7ec4\u4ef6\u4e5f\u89e3\u6790\u8def\u5f84",
      },
    },
    "realpath --relative-to /var /var/log/syslog": {
      command: "realpath ",
      suggestion: "realpath --relative-to /var /var/log/syslog",
      values: {
        "es-ES": "Mostrar ruta relativa a /var",
        fr: "Afficher le chemin relatif a /var",
        ja: "/var \u304b\u3089\u306e\u76f8\u5bfe\u30d1\u30b9\u3092\u51fa\u529b\u3059\u308b",
        ru: "\u0412\u044b\u0432\u0435\u0441\u0442\u0438 \u043f\u0443\u0442\u044c \u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0435\u043b\u044c\u043d\u043e /var",
        "zh-CN": "\u8f93\u51fa\u76f8\u5bf9\u4e8e /var \u7684\u8def\u5f84",
      },
    },
    "df -hT": {
      command: "df ",
      suggestion: "df -hT",
      values: {
        "es-ES": "Mostrar tamanos legibles con tipo de sistema de archivos",
        fr: "Afficher les tailles lisibles avec le type de systeme de fichiers",
        ja: "\u30d5\u30a1\u30a4\u30eb\u30b7\u30b9\u30c6\u30e0\u7a2e\u5225\u4ed8\u304d\u3067\u30b5\u30a4\u30ba\u3092\u8aad\u307f\u3084\u3059\u304f\u8868\u793a\u3059\u308b",
        ru: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0447\u0438\u0442\u0430\u0435\u043c\u044b\u0435 \u0440\u0430\u0437\u043c\u0435\u0440\u044b \u0441 \u0442\u0438\u043f\u043e\u043c \u0444\u0430\u0439\u043b\u043e\u0432\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u044b",
        "zh-CN": "\u4ee5\u4eba\u7c7b\u53ef\u8bfb\u65b9\u5f0f\u663e\u793a\u5927\u5c0f\u548c\u6587\u4ef6\u7cfb\u7edf\u7c7b\u578b",
      },
    },
    "du -sh *": {
      command: "du ",
      suggestion: "du -sh *",
      values: {
        "es-ES": "Mostrar tamano de todas las entradas del directorio actual",
        fr: "Afficher la taille de toutes les entrees du repertoire courant",
        ja: "\u73fe\u5728\u306e\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u5185\u306e\u5168\u9805\u76ee\u306e\u30b5\u30a4\u30ba\u3092\u8868\u793a\u3059\u308b",
        ru: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0440\u0430\u0437\u043c\u0435\u0440 \u0432\u0441\u0435\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439 \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435",
        "zh-CN": "\u663e\u793a\u5f53\u524d\u76ee\u5f55\u4e2d\u6240\u6709\u6761\u76ee\u7684\u5927\u5c0f",
      },
    },
    "cmp -s file-a file-b": {
      command: "cmp ",
      suggestion: "cmp -s file-a file-b",
      values: {
        "es-ES": "Usar solo el codigo de salida para comparar",
        fr: "Utiliser seulement le code de sortie pour comparer",
        ja: "\u6bd4\u8f03\u306b\u306f\u7d42\u4e86\u30b3\u30fc\u30c9\u3060\u3051\u3092\u4f7f\u3046",
        ru: "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u0434\u043b\u044f \u0441\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043a\u043e\u0434 \u0432\u044b\u0445\u043e\u0434\u0430",
        "zh-CN": "\u53ea\u4f7f\u7528\u9000\u51fa\u7801\u8fdb\u884c\u6bd4\u8f83",
      },
    },
    "diff -u": {
      command: "diff ",
      suggestion: "diff -u",
      values: {
        "es-ES": "Mostrar diff unificado",
        fr: "Afficher un diff unifie",
        ja: "unified diff \u3092\u51fa\u529b\u3059\u308b",
        ru: "\u0412\u044b\u0432\u0435\u0441\u0442\u0438 unified diff",
        "zh-CN": "\u8f93\u51fa unified diff",
      },
    },
    "base64 -d encoded.txt": {
      command: "base64 ",
      suggestion: "base64 -d encoded.txt",
      values: {
        "es-ES": "Decodificar archivo Base64",
        fr: "Decoder le fichier Base64",
        ja: "Base64 \u30d5\u30a1\u30a4\u30eb\u3092\u30c7\u30b3\u30fc\u30c9\u3059\u308b",
        ru: "\u0414\u0435\u043a\u043e\u0434\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0444\u0430\u0439\u043b Base64",
        "zh-CN": "\u89e3\u7801 Base64 \u6587\u4ef6",
      },
    },
    "free -h": {
      command: "free ",
      suggestion: "free -h",
      values: {
        "es-ES": "Mostrar tamanos de memoria de forma legible",
        fr: "Afficher les tailles de memoire de facon lisible",
        ja: "\u30e1\u30e2\u30ea\u30b5\u30a4\u30ba\u3092\u8aad\u307f\u3084\u3059\u304f\u8868\u793a\u3059\u308b",
        ru: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0440\u0430\u0437\u043c\u0435\u0440\u044b \u043f\u0430\u043c\u044f\u0442\u0438 \u0432 \u0447\u0438\u0442\u0430\u0435\u043c\u043e\u043c \u0432\u0438\u0434\u0435",
        "zh-CN": "\u4ee5\u4eba\u7c7b\u53ef\u8bfb\u65b9\u5f0f\u663e\u793a\u5185\u5b58\u5927\u5c0f",
      },
    },
    "md5sum -c checksums.txt": {
      command: "md5sum ",
      suggestion: "md5sum -c checksums.txt",
      values: {
        "es-ES": "Comprobar sumas MD5 desde archivo",
        fr: "Verifier les sommes MD5 depuis un fichier",
        ja: "\u30d5\u30a1\u30a4\u30eb\u304b\u3089 MD5 \u30c1\u30a7\u30c3\u30af\u30b5\u30e0\u3092\u691c\u67fb\u3059\u308b",
        ru: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\u043d\u044b\u0435 \u0441\u0443\u043c\u043c\u044b MD5 \u0438\u0437 \u0444\u0430\u0439\u043b\u0430",
        "zh-CN": "\u4ece\u6587\u4ef6\u68c0\u67e5 MD5 \u6821\u9a8c\u548c",
      },
    },
    "sha256sum find": {
      command: "sha256sum ",
      suggestion: "sha256sum find . -type f -print0 | xargs -0 sha256sum",
      values: {
        "es-ES": "calcular hash de todos los archivos de forma segura con NUL",
        fr: "calculer le hash de tous les fichiers avec NUL en securite",
        ja: "\u5168\u30d5\u30a1\u30a4\u30eb\u3092 NUL \u5b89\u5168\u306b\u30cf\u30c3\u30b7\u30e5\u3059\u308b",
        ru: "\u0445\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0432\u0441\u0435 \u0444\u0430\u0439\u043b\u044b \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u0447\u0435\u0440\u0435\u0437 NUL",
        "zh-CN": "\u4ee5 NUL \u5b89\u5168\u65b9\u5f0f\u54c8\u5e0c\u6240\u6709\u6587\u4ef6",
      },
    },
    "kill -9": {
      command: "kill ",
      suggestion: "kill -9",
      values: {
        "es-ES": "Enviar se\u00f1al KILL",
        fr: "Envoyer le signal KILL",
        ja: "KILL \u30b7\u30b0\u30ca\u30eb\u3092\u9001\u308b",
        ru: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u0438\u0433\u043d\u0430\u043b KILL",
        "zh-CN": "\u53d1\u9001 KILL \u4fe1\u53f7",
      },
    },
    "killall -i": {
      command: "killall ",
      suggestion: "killall -i",
      values: {
        "es-ES": "preguntar antes de finalizar",
        fr: "demander avant de terminer",
        ja: "\u7d42\u4e86\u524d\u306b\u78ba\u8a8d\u3059\u308b",
        ru: "\u0441\u043f\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044c \u043f\u0435\u0440\u0435\u0434 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0435\u043c",
        "zh-CN": "\u7ed3\u675f\u524d\u8be2\u95ee",
      },
    },
    "jobs -l %%": {
      command: "jobs ",
      suggestion: "jobs -l %%",
      values: {
        "es-ES": "Mostrar trabajo actual con ID de proceso",
        fr: "Afficher job courant avec l'ID de processus",
        ja: "現在のジョブをプロセス ID 付きで表示する",
        ru: "Показать текущее задание с ID процесса",
        "zh-CN": "显示当前作业及进程 ID",
      },
    },
    "fg %1": {
      command: "fg ",
      suggestion: "fg %1",
      values: {
        "es-ES": "Llevar trabajo 1 al primer plano",
        fr: "Ramener job 1 au premier plan",
        ja: "ジョブ1をフォアグラウンドへ移す",
        ru: "Перевести задание 1 на передний план",
        "zh-CN": "将作业1带到前台",
      },
    },
    "bg %1": {
      command: "bg ",
      suggestion: "bg %1",
      values: {
        "es-ES": "Continuar trabajo 1 en segundo plano",
        fr: "Continuer job 1 en arrière-plan",
        ja: "ジョブ1をバックグラウンドで続行する",
        ru: "Продолжить задание 1 в фоне",
        "zh-CN": "在后台继续作业1",
      },
    },
    "disown -h %1": {
      command: "disown ",
      suggestion: "disown -h %1",
      values: {
        "es-ES": "Proteger trabajo 1 contra SIGHUP",
        fr: "Protéger job 1 contre SIGHUP",
        ja: "ジョブ1を SIGHUP から保護する",
        ru: "Защитить задание 1 от SIGHUP",
        "zh-CN": "保护作业1不受 SIGHUP 影响",
      },
    },
    "tmux attach -t": {
      command: "tmux ",
      suggestion: "tmux attach -t <name>",
      values: {
        "es-ES": "Adjuntarse a una sesión tmux existente",
        fr: "S'attacher à une session tmux existante",
        ja: "既存の tmux セッションへ接続する",
        ru: "Подключиться к существующему сеансу tmux",
        "zh-CN": "连接到现有 tmux 会话",
      },
    },
    "screen -ls": {
      command: "screen ",
      suggestion: "screen -ls",
      values: {
        "es-ES": "Listar sesiones screen",
        fr: "Lister les sessions screen",
        ja: "screen セッションを一覧表示する",
        ru: "Показать сеансы screen",
        "zh-CN": "列出 screen 会话",
      },
    },
    "alias ll": {
      command: "alias ",
      suggestion: "alias ll='ls -lah'",
      values: {
        "es-ES": "Alias para listado largo incluyendo archivos ocultos",
        fr: "Alias pour une liste longue avec fichiers cachés",
        ja: "隠しファイルを含む詳細一覧の alias",
        ru: "Псевдоним для подробного списка со скрытыми файлами",
        "zh-CN": "用于包含隐藏文件的长列表别名",
      },
    },
    "unalias -a": {
      command: "unalias ",
      suggestion: "unalias -a",
      values: {
        "es-ES": "Eliminar todos los alias",
        fr: "Supprimer tous les alias",
        ja: "すべての alias を削除する",
        ru: "Удалить все псевдонимы",
        "zh-CN": "删除所有别名",
      },
    },
    "export HISTCONTROL": {
      command: "export ",
      suggestion: "export HISTCONTROL=ignoredups",
      values: {
        "es-ES": "Evitar entradas duplicadas en el historial",
        fr: "Éviter les entrées d'historique en double",
        ja: "重複する history エントリを避ける",
        ru: "Избегать дублирующихся записей history",
        "zh-CN": "避免重复的 history 条目",
      },
    },
    "unset HISTFILE": {
      command: "unset ",
      suggestion: "unset HISTFILE",
      values: {
        "es-ES": "Eliminar variable HISTFILE del entorno de la shell",
        fr: "Supprimer la variable HISTFILE de l'environnement du shell",
        ja: "シェル環境から変数 HISTFILE を削除する",
        ru: "Удалить переменную HISTFILE из окружения оболочки",
        "zh-CN": "从 shell 环境中移除变量 HISTFILE",
      },
    },
    "history grep ssh": {
      command: "history ",
      suggestion: "history | grep ssh",
      values: {
        "es-ES": "Buscar ssh en el historial",
        fr: "Rechercher ssh dans l'historique",
        ja: "履歴から ssh を検索する",
        ru: "Искать ssh в истории",
        "zh-CN": "在历史中搜索 ssh",
      },
    },
    "type systemctl": {
      command: "type ",
      suggestion: "type -t systemctl",
      values: {
        "es-ES": "Mostrar solo el tipo de systemctl",
        fr: "Afficher seulement le type de systemctl",
        ja: "systemctl の種別だけを出力する",
        ru: "Вывести только тип systemctl",
        "zh-CN": "只输出 systemctl 的类型",
      },
    },
    "command history": {
      command: "command ",
      suggestion: "command -V history",
      values: {
        "es-ES": "Explicar resolución de shell para history",
        fr: "Expliquer la résolution shell pour history",
        ja: "history のシェル解決を説明する",
        ru: "Объяснить разрешение оболочки для history",
        "zh-CN": "解释 history 的 shell 解析",
      },
    },
    "more error": {
      command: "more ",
      suggestion: "more +/error /var/log/syslog",
      values: {
        "es-ES": "Empezar en la primera coincidencia de error",
        fr: "Commencer au premier résultat pour error",
        ja: "error の最初の一致から開始する",
        ru: "Начать с первого совпадения для error",
        "zh-CN": "从 error 的第一个匹配开始",
      },
    },
    "column passwd": {
      command: "column ",
      suggestion: "column -t -s ':' /etc/passwd",
      values: {
        "es-ES": "Alinear columnas separadas por dos puntos",
        fr: "Aligner les colonnes séparées par deux-points",
        ja: "コロン区切りの列を整列する",
        ru: "Выравнять столбцы, разделенные двоеточием",
        "zh-CN": "对齐冒号分隔的列",
      },
    },
    "hexdump first bytes": {
      command: "hexdump ",
      suggestion: "hexdump -C -n 128 file.bin",
      values: {
        "es-ES": "Mostrar los primeros 128 bytes en formato canónico",
        fr: "Afficher les 128 premiers octets au format canonique",
        ja: "先頭 128 バイトを標準形式で表示する",
        ru: "Показать первые 128 байт в каноническом формате",
        "zh-CN": "以标准格式显示前 128 个字节",
      },
    },
    "lsblk filesystems": {
      command: "lsblk ",
      suggestion: "lsblk -f",
      values: {
        "es-ES": "Ver sistemas de archivos, etiquetas y UUID",
        fr: "Afficher systèmes de fichiers, étiquettes et UUID",
        ja: "ファイルシステム、ラベル、UUID を表示する",
        ru: "Показать файловые системы, метки и UUID",
        "zh-CN": "显示文件系统、标签和 UUID",
      },
    },
    "blkid export": {
      command: "blkid ",
      suggestion: "blkid -o export /dev/sda1",
      values: {
        "es-ES": "Mostrar datos del dispositivo de bloque como clave valor",
        fr: "Afficher les données du périphérique bloc en clé valeur",
        ja: "ブロックデバイス情報をキー値形式で出力する",
        ru: "Вывести данные блочного устройства как ключ значение",
        "zh-CN": "以键值形式输出块设备数据",
      },
    },
    "findmnt columns": {
      command: "findmnt ",
      suggestion: "findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS",
      values: {
        "es-ES": "Mostrar columnas de montaje seleccionadas",
        fr: "Afficher les colonnes de montage sélectionnées",
        ja: "選択したマウント列を表示する",
        ru: "Показать выбранные столбцы монтирования",
        "zh-CN": "显示选定的挂载列",
      },
    },
    "mount remount rw": {
      command: "mount ",
      suggestion: "mount -o remount,rw /",
      values: {
        "es-ES": "Remontar el sistema de archivos raíz con escritura",
        fr: "Remonter le système de fichiers racine en écriture",
        ja: "root ファイルシステムを書き込み可能で再マウントする",
        ru: "Перемонтировать корневую файловую систему с записью",
        "zh-CN": "以可写方式重新挂载根文件系统",
      },
    },
    "umount recursive": {
      command: "umount ",
      suggestion: "umount --recursive /mnt",
      values: {
        "es-ES": "Desmontar submontajes bajo /mnt recursivamente",
        fr: "Démonter récursivement les sous-montages sous /mnt",
        ja: "/mnt 配下のサブマウントを再帰的にアンマウントする",
        ru: "Размонтировать подмонтирования под /mnt рекурсивно",
        "zh-CN": "递归卸载 /mnt 下的子挂载",
      },
    },
    "dmesg errors": {
      command: "dmesg ",
      suggestion: "dmesg -T --level=err,warn",
      values: {
        "es-ES": "Mostrar errores y advertencias con tiempo legible",
        fr: "Afficher erreurs et avertissements avec heure lisible",
        ja: "エラーと警告を読みやすい時刻付きで表示する",
        ru: "Показать ошибки и предупреждения с читаемым временем",
        "zh-CN": "显示带易读时间的错误和警告",
      },
    },
    "sysctl load config": {
      command: "sysctl ",
      suggestion: "sysctl -p /etc/sysctl.conf",
      values: {
        "es-ES": "Cargar parámetros desde /etc/sysctl.conf",
        fr: "Charger les paramètres depuis /etc/sysctl.conf",
        ja: "/etc/sysctl.conf からパラメータを読み込む",
        ru: "Загрузить параметры из /etc/sysctl.conf",
        "zh-CN": "从 /etc/sysctl.conf 加载参数",
      },
    },
    "update alternatives set editor": {
      command: "update-alternatives ",
      suggestion: "update-alternatives --set editor /usr/bin/vim",
      values: {
        "es-ES": "Establecer editor como vim",
        fr: "Définir editor sur vim",
        ja: "editor を vim に設定する",
        ru: "Назначить editor на vim",
        "zh-CN": "将 editor 设置为 vim",
      },
    },
    "loginctl show-user": {
      command: "loginctl ",
      suggestion: "loginctl show-user",
      values: {
        "es-ES": "Mostrar propiedades de usuario",
        fr: "Afficher les propriétés d'utilisateur",
        ja: "ユーザープロパティを表示する",
        ru: "Показать свойства пользователя",
        "zh-CN": "显示用户属性",
      },
    },
    "localectl list-locales": {
      command: "localectl ",
      suggestion: "localectl list-locales",
      values: {
        "es-ES": "Listar locales disponibles",
        fr: "Lister les locales disponibles",
        ja: "利用可能な locales を一覧表示する",
        ru: "Перечислить доступные locales",
        "zh-CN": "列出可用 locales",
      },
    },
    "networkctl lldp": {
      command: "networkctl ",
      suggestion: "networkctl lldp",
      values: {
        "es-ES": "Mostrar vecinos LLDP",
        fr: "Afficher les voisins LLDP",
        ja: "LLDP 隣接を表示する",
        ru: "Показать соседей LLDP",
        "zh-CN": "显示 LLDP 邻居",
      },
    },
    "busctl introspect": {
      command: "busctl i",
      suggestion: "busctl introspect <service> <path>",
      values: {
        "es-ES": "Mostrar interfaces y métodos de un objeto",
        fr: "Afficher interfaces et méthodes d'un objet",
        ja: "オブジェクトの interfaces とメソッドを表示する",
        ru: "Показать interfaces и методы объекта",
        "zh-CN": "显示对象的接口和方法",
      },
    },
    "coredumpctl debug": {
      command: "coredumpctl ",
      suggestion: "coredumpctl debug <match>",
      values: {
        "es-ES": "Abrir coredump en el debugger",
        fr: "Ouvrir le coredump dans le debugger",
        ja: "debugger で coredump を開く",
        ru: "Открыть coredump в debugger",
        "zh-CN": "在 debugger 中打开 coredump",
      },
    },
    "systemd-cgls unit": {
      command: "systemd-cgls ",
      suggestion: "systemd-cgls --unit ssh.service",
      values: {
        "es-ES": "Mostrar control group de ssh.service",
        fr: "Afficher le control group de ssh.service",
        ja: "ssh.service の control group を表示する",
        ru: "Показать control group для ssh.service",
        "zh-CN": "显示 ssh.service 的 control group",
      },
    },
    "systemd-cgtop order memory": {
      command: "systemd-cgtop ",
      suggestion: "systemd-cgtop --order=memory",
      values: {
        "es-ES": "Ordenar por uso de memoria",
        fr: "Trier par utilisation mémoire",
        ja: "メモリ使用量で並べる",
        ru: "Сортировать по использованию памяти",
        "zh-CN": "按内存使用量排序",
      },
    },
    "machinectl status": {
      command: "machinectl ",
      suggestion: "machinectl status <machine>",
      values: {
        "es-ES": "Mostrar estado de una máquina",
        fr: "Afficher l'état d'une machine",
        ja: "machine の状態を表示する",
        ru: "Показать состояние machine",
        "zh-CN": "显示 machine 状态",
      },
    },
    "hostnamectl status": {
      command: "hostnamectl ",
      suggestion: "hostnamectl status",
      values: {
        "es-ES": "Mostrar hostnames y host metadata",
        fr: "Afficher hostnames et host metadata",
        ja: "表示する hostnames と host metadata",
        ru: "Показать hostnames и host metadata",
        "zh-CN": "显示 hostnames 和 host metadata",
      },
    },
    "timedatectl list-timezones": {
      command: "timedatectl ",
      suggestion: "timedatectl list-timezones",
      values: {
        "es-ES": "Listar time zones disponibles",
        fr: "Lister les time zones disponibles",
        ja: "利用可能な time zones を一覧表示する",
        ru: "Перечислить доступные time zones",
        "zh-CN": "列出可用 time zones",
      },
    },
    "systemd-analyze blame": {
      command: "systemd-analyze ",
      suggestion: "systemd-analyze blame",
      values: {
        "es-ES": "Ordenar units por duración de inicio",
        fr: "Trier les units par durée de démarrage",
        ja: "units を start duration で並べる",
        ru: "Сортировать units по start duration",
        "zh-CN": "按 start duration 对 units 排序",
      },
    },
    "service status all": {
      command: "service ",
      suggestion: "service --status-all",
      values: {
        "es-ES": "Mostrar estado de todos los SysV services",
        fr: "Afficher l'état de tous les SysV services",
        ja: "すべての SysV services の状態を表示する",
        ru: "Показать состояние всех SysV services",
        "zh-CN": "查看所有 SysV services 的状态",
      },
    },
    "nslookup mx": {
      command: "nslookup ",
      suggestion: "nslookup -type=MX example.com",
      values: {
        "es-ES": "Consultar records de mail server",
        fr: "Interroger les records de mail server",
        ja: "mail server records を問い合わせる",
        ru: "Запросить mail server records",
        "zh-CN": "查询 mail server records",
      },
    },
    "tracepath numeric": {
      command: "tracepath ",
      suggestion: "tracepath -n 8.8.8.8",
      values: {
        "es-ES": "Seguir route numéricamente hasta 8.8.8.8",
        fr: "Suivre route numériquement vers 8.8.8.8",
        ja: "8.8.8.8 までの route を数値で trace する",
        ru: "Отследить route численно до 8.8.8.8",
        "zh-CN": "以数字方式跟踪到 8.8.8.8 的 route",
      },
    },
    "mtr tcp port": {
      command: "mtr ",
      suggestion: "mtr -T -P 443 example.com",
      values: {
        "es-ES": "Ejecutar medición TCP al puerto 443",
        fr: "Exécuter mesure TCP vers le port 443",
        ja: "port 443 への TCP 測定を実行する",
        ru: "Выполнить TCP измерение к port 443",
        "zh-CN": "执行到 port 443 的 TCP 测量",
      },
    },
    "nmap service version": {
      command: "nmap ",
      suggestion: "nmap -sV",
      values: {
        "es-ES": "Ejecutar service y version scan",
        fr: "Exécuter service et version scan",
        ja: "service と version scan を実行する",
        ru: "Запустить service и version scan",
        "zh-CN": "运行 service 和 version scan",
      },
    },
    "netstat listening tcp udp": {
      command: "netstat ",
      suggestion: "netstat -tulpn",
      values: {
        "es-ES": "Mostrar listening TCP/UDP ports con processes",
        fr: "Afficher listening TCP/UDP ports avec processes",
        ja: "processes 付きで listening TCP/UDP ports を表示する",
        ru: "Показать listening TCP/UDP ports с processes",
        "zh-CN": "显示带 processes 的 listening TCP/UDP ports",
      },
    },
    "lsof port 443": {
      command: "lsof ",
      suggestion: "lsof -i :443",
      values: {
        "es-ES": "Mostrar processes en port 443",
        fr: "Afficher processes sur port 443",
        ja: "port 443 の processes を表示する",
        ru: "Показать processes на port 443",
        "zh-CN": "显示 port 443 上的 processes",
      },
    },
    "pwd | cat": {
      command: "pwd ",
      suggestion: "pwd | cat",
      values: {
        "es-ES": "Mostrar la ruta actual mediante una tuberia",
        fr: "Afficher le chemin actuel via un tube",
        ja: "現在のパスを pipe 経由で出力する",
        ru: "Вывести текущий путь через pipe",
        "zh-CN": "通过 pipe 输出当前路径",
      },
    },
  };

  for (const expectation of Object.values(translatedShellBasicsExpectations)) {
    for (const [language, expected] of Object.entries(expectation.values)) {
      const actual = autocomplete.getTerminalAutocompleteSuggestionDescription(
        expectation.command,
        expectation.suggestion,
        { language },
      );
      if (actual !== expected) {
        fail(
          `Expected ${language} autocomplete ${expectation.suggestion} detail to be ${expected}, got ${actual}`,
        );
      }
    }
  }

  const translatedHelpExpectations = {
    af: "Lees handleidingbladsye en soek dokumentasie",
    ar: "قراءة صفحات الدليل والبحث في الوثائق",
    bg: "Четене на man страници и търсене в документацията",
    bn: "ম্যানুয়াল পৃষ্ঠা পড়ুন এবং ডকুমেন্টেশন খুঁজুন",
    ca: "Llegeix pàgines de manual i cerca documentació",
    cs: "Číst manuálové stránky a hledat dokumentaci",
    da: "Læs manualsider og søg dokumentation",
    el: "Ανάγνωση σελίδων manual και αναζήτηση τεκμηρίωσης",
    "es-ES": "Leer paginas de manual y buscar documentacion",
    fi: "Lue manuaalisivuja ja etsi dokumentaatiota",
    fr: "Lire les pages de manuel et rechercher de la documentation",
    he: "קריאת דפי מדריך וחיפוש בתיעוד",
    hi: "manual pages पढ़ें और documentation खोजें",
    hu: "Kézikönyvoldalak olvasása és dokumentáció keresése",
    id: "Baca halaman manual dan cari dokumentasi",
    it: "Leggere pagine di manuale e cercare documentazione",
    ja: "マニュアルページを読み、ドキュメントを検索する",
    ko: "매뉴얼 페이지를 읽고 문서 검색",
    nl: "Handleidingpagina's lezen en documentatie zoeken",
    no: "Les manualsider og søk i dokumentasjon",
    pl: "Czytaj strony manuala i szukaj dokumentacji",
    "pt-BR": "Ler paginas de manual e pesquisar documentacao",
    "pt-PT": "Ler paginas de manual e pesquisar documentacao",
    ro: "Citește pagini de manual și caută documentație",
    ru: "Читать man-страницы и искать документацию",
    sr: "Читај man странице и претражуј документацију",
    "sv-SE": "Läs manualsidor och sök dokumentation",
    th: "อ่านหน้า manual และค้นหาเอกสาร",
    tr: "Kılavuz sayfalarını oku ve dokümantasyon ara",
    uk: "Читати man-сторінки й шукати документацію",
    vi: "Đọc trang hướng dẫn và tìm tài liệu",
    "zh-CN": "阅读手册页并搜索文档",
    "zh-TW": "閱讀手冊頁並搜尋文件",
  };

  for (const [language, expected] of Object.entries(
    translatedHelpExpectations,
  )) {
    const actual = autocompleteI18n.getTerminalAutocompleteHelpDescriptionText(
      "man",
      language,
    );
    if (actual !== expected) {
      fail(
        `Expected ${language} autocomplete man help to be ${expected}, got ${actual}`,
      );
    }
  }

  const translatedValueExpectation =
    autocomplete.getTerminalAutocompleteSuggestionDescription(
      "man ",
      "man unknown-topic",
      { language: "fr" },
    );
  if (
    translatedValueExpectation !==
    "page de manuel, section, mot-cle ou option de pager"
  ) {
    fail(
      `Expected French autocomplete value fallback to be localized, got ${translatedValueExpectation}`,
    );
  }
}

function assertCompactPopupSourceLabels() {
  const componentPath = path.join(
    root,
    "src/ui/features/terminal/command-history/CommandAutocomplete.tsx",
  );
  const source = fs.readFileSync(componentPath, "utf8");
  const forbiddenLabels = [
    "HISTORY",
    "History",
    "COMMANDS",
    "Commands",
    "COMMANDS AND OPTIONS",
    "Commands and options",
    "Befehle",
    "Verlauf",
  ];

  for (const label of forbiddenLabels) {
    if (source.includes(`>${label}<`) || source.includes(`\"${label}\"`)) {
      fail(
        `Autocomplete popup should use icons instead of visible source label ${label}`,
      );
    }
  }
}

function assertRenderedCommand(line, trackedCommand, expectedCommand) {
  const actual = renderedCommand.extractRenderedCommandFromLine(
    line,
    trackedCommand,
  );
  if (actual !== expectedCommand) {
    fail(
      `Expected rendered command from ${JSON.stringify(line)} and ${JSON.stringify(trackedCommand)} to be ${expectedCommand}, got ${actual}`,
    );
  }
}

function assertSecretPrompt(line) {
  if (!renderedCommand.terminalLineLooksLikeSecretPrompt(line)) {
    fail(`Expected ${JSON.stringify(line)} to look like a secret prompt`);
  }
}

function normalizeSuggestionForDuplicateCheck(value) {
  return String(value)
    .trim()
    .split(/\s+/)
    .map((token) =>
      /^-[A-Za-z]+$/.test(token) || /^\\[A-Za-z0-9]+$/.test(token)
        ? token
        : token.toLowerCase(),
    )
    .join(" ");
}

function assertHelpCatalogQuality() {
  const entries = commandHelp.TERMINAL_AUTOCOMPLETE_HELP;
  const suggestions = commandHelp.TERMINAL_AUTOCOMPLETE_COMMANDS;
  const seenCommands = new Set();
  const seenLookupKeys = new Map();
  const seenSuggestions = new Set();
  const unsafeSuggestionPattern =
    /\b(?:rm\s+(?:-[^\n]*[rf]|--(?:force|recursive|no-preserve-root))|mkfs(?:\.\w+)?|dd\s+(?:if=|of=)|shutdown|poweroff|reboot|halt|iptables\s+-F|nft\s+flush|docker\s+system\s+prune|history\s+-c|userdel\s+-r|find\s+-delete)\b/i;
  const requiredCommands = [
    "cp",
    "mv",
    "mkdir",
    "ssh",
    "ssh-keygen",
    "ssh-copy-id",
    "ssh-agent",
    "ssh-add",
    "sftp",
    "alias",
    "unalias",
    "export",
    "unset",
    "history",
    "pwd",
    "which",
    "whereis",
    "man",
    "info",
    "type",
    "command",
    "screen",
    "nohup",
    "jobs",
    "fg",
    "bg",
    "disown",
    "pidof",
    "pstree",
    "top",
    "htop",
    "basename",
    "dirname",
    "more",
    "printf",
    "tee",
    "diff",
    "patch",
    "tr",
    "nl",
    "split",
    "column",
    "jq",
    "watch",
    "sleep",
    "logger",
    "cal",
    "ncal",
    "sync",
    "test",
    "memusage",
    "apt-get",
    "apt-cache",
    "dpkg",
    "df",
    "du",
    "free",
    "locate",
    "updatedb",
    "dmesg",
    "sysctl",
    "findmnt",
    "lsblk",
    "blkid",
    "mount",
    "umount",
    "update-alternatives",
    "loginctl",
    "systemd-analyze",
    "chgrp",
    "truncate",
    "umask",
    "groups",
    "groupadd",
    "groupmod",
    "useradd",
    "usermod",
    "userdel",
    "passwd",
    "chage",
    "visudo",
    "tcpdump",
    "nslookup",
    "tracepath",
    "iw",
    "nft",
    "openssl s_client",
    "resolvectl",
    "ssh-keyscan",
    "scp",
    "ncdu",
    "iftop",
    "nload",
    "vnstat",
    "iperf3",
    "npm",
    "pnpm",
    "yarn",
    "node",
    "python",
    "python3",
    "pip",
    "pip3",
    "make",
    "kubectl",
    "helm",
    "terraform",
    "ansible",
    "ansible-playbook",
    "ansible-inventory",
    "aws",
    "gcloud",
    "az",
    "psql",
    "pg_dump",
    "pg_restore",
    "mysql",
    "mariadb",
    "mysqldump",
    "sqlite3",
    "redis-cli",
    "mongosh",
    "crontab",
    "nginx",
    "apachectl",
    "apache2ctl",
    "certbot",
    "supervisorctl",
    "pm2",
    "comm",
    "join",
    "numfmt",
    "shuf",
    "od",
    "strings",
    "cksum",
    "sum",
  ];

  if (!Array.isArray(entries) || entries.length < 160) {
    fail(`Expected at least 160 help entries, got ${entries?.length ?? 0}`);
  }

  if (!Array.isArray(suggestions) || suggestions.length < 1500) {
    fail(
      `Expected at least 1500 generated autocomplete suggestions, got ${suggestions?.length ?? 0}`,
    );
  }

  for (const entry of entries) {
    const command = String(entry.command ?? "").trim();
    if (!command) {
      fail("Help entry is missing command");
    }
    if (seenCommands.has(command)) {
      fail(`Duplicate help command: ${command}`);
    }
    seenCommands.add(command);

    if (!String(entry.description ?? "").trim()) {
      fail(`Help entry ${command} is missing description`);
    }
    if (!Array.isArray(entry.examples) || entry.examples.length === 0) {
      fail(`Help entry ${command} is missing examples`);
    }

    for (const lookupKey of [command, ...(entry.aliases ?? [])]) {
      const normalizedLookupKey = String(lookupKey).trim().toLowerCase();
      const existingCommand = seenLookupKeys.get(normalizedLookupKey);
      if (existingCommand && existingCommand !== command) {
        fail(
          `Help lookup key ${lookupKey} is shared by ${existingCommand} and ${command}`,
        );
      }
      seenLookupKeys.set(normalizedLookupKey, command);
    }
  }

  for (const requiredCommand of requiredCommands) {
    if (
      !commandHelp.TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(requiredCommand)
    ) {
      fail(`Required help command is missing: ${requiredCommand}`);
    }
  }

  for (const suggestion of suggestions) {
    const normalizedSuggestion =
      normalizeSuggestionForDuplicateCheck(suggestion);
    if (!normalizedSuggestion) {
      fail("Generated autocomplete suggestion is empty");
    }
    if (seenSuggestions.has(normalizedSuggestion)) {
      fail(`Duplicate generated autocomplete suggestion: ${suggestion}`);
    }
    if (unsafeSuggestionPattern.test(String(suggestion))) {
      fail(`Unsafe command leaked into direct suggestions: ${suggestion}`);
    }
    seenSuggestions.add(normalizedSuggestion);
  }
}

assertHelpCatalogQuality();
assertAutocompleteResourceCoverage();
assertEqual(
  autocompleteLayout.getCommandAutocompleteVisibleRowCount(false),
  8,
  "Manual autocomplete popup visible row count",
);
assertEqual(
  autocompleteLayout.getCommandAutocompleteVisibleRowCount(true),
  5,
  "Automatic autocomplete popup visible row count",
);
assertCompactPopupSourceLabels();
assertEqual(
  autocompleteLayout.getCommandAutocompleteListHeight(
    Array.from({ length: 20 }, (_, index) => ({
      hasSourceBoundary: index === 4 || index === 12,
    })),
    false,
  ),
  8 * 32,
  "Manual autocomplete popup height keeps 8 suggestion rows",
);
assertEqual(
  autocompleteLayout.getCommandAutocompleteListHeight(
    Array.from({ length: 20 }, (_, index) => ({
      hasSourceBoundary: index === 4 || index === 12,
    })),
    true,
  ),
  5 * 32,
  "Automatic autocomplete popup height keeps 5 suggestion rows",
);
assertPopupKeyAction(
  "sudo su popup Enter without active selection executes command",
  { key: "Enter" },
  { selectedIndex: 0, selectionActive: false, suggestionCount: 5 },
  { type: "close-and-pass-through" },
);
assertPopupKeyAction(
  "visible popup Enter without active selection does not accept first suggestion",
  { key: "Enter" },
  { selectedIndex: 0, selectionActive: false, suggestionCount: 1 },
  { type: "close-and-pass-through" },
);
assertPopupKeyAction(
  "sudo su popup Tab accepts best suggestion",
  { key: "Tab" },
  { selectedIndex: 0, selectionActive: false, suggestionCount: 5 },
  { type: "accept", selectedIndex: 0 },
);
assertGhostKeyAction(
  "ghost hint Tab accepts inline suggestion",
  { key: "Tab" },
  { cursorAtEnd: true, suggestionCount: 1 },
  { type: "accept", selectedIndex: 0 },
);
assertGhostKeyAction(
  "ghost hint ArrowRight no longer accepts inline suggestion",
  { key: "ArrowRight" },
  { cursorAtEnd: true, suggestionCount: 1 },
  { type: "pass-through" },
);
assertGhostKeyAction(
  "ghost hint Shift+Tab remains shell reverse-tab",
  { key: "Tab", shiftKey: true },
  { cursorAtEnd: true, suggestionCount: 1 },
  { type: "pass-through" },
);
assertGhostKeyAction(
  "ghost hint Tab does not accept away from command end",
  { key: "Tab" },
  { cursorAtEnd: false, suggestionCount: 1 },
  { type: "pass-through" },
);
assertPopupKeyAction(
  "visible popup ArrowUp without active selection keeps shell history navigation",
  { key: "ArrowUp" },
  {
    inputMode: "history",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 5,
  },
  { type: "close-and-pass-through" },
);
assertPopupKeyAction(
  "visible popup ArrowDown without active selection keeps shell history navigation",
  { key: "ArrowDown" },
  {
    inputMode: "history",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 5,
  },
  { type: "close-and-pass-through" },
);
assertPopupKeyAction(
  "history-loaded sudo su popup ArrowUp remains shell history navigation",
  { key: "ArrowUp" },
  {
    inputMode: "history",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 5,
  },
  { type: "close-and-pass-through" },
);
assertPopupKeyAction(
  "typing popup ArrowDown activates first suggestion",
  { key: "ArrowDown" },
  {
    inputMode: "typing",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 5,
  },
  { type: "move", selectedIndex: 0 },
);
assertPopupKeyAction(
  "manual git popup ArrowDown enters completion navigation",
  { key: "ArrowDown" },
  {
    inputMode: "typing",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 11,
  },
  { type: "move", selectedIndex: 0 },
);
assertPopupKeyAction(
  "manual sudo git popup ArrowDown enters completion navigation",
  { key: "ArrowDown" },
  {
    inputMode: "typing",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 11,
  },
  { type: "move", selectedIndex: 0 },
);
assertPopupKeyAction(
  "manual uptime popup ArrowDown enters completion navigation",
  { key: "ArrowDown" },
  {
    inputMode: "typing",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 8,
  },
  { type: "move", selectedIndex: 0 },
);
assertPopupKeyAction(
  "manual git popup Enter without completion navigation executes command",
  { key: "Enter" },
  {
    inputMode: "typing",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 11,
  },
  { type: "close-and-pass-through" },
);
assertPopupKeyAction(
  "typing popup ArrowUp activates last suggestion",
  { key: "ArrowUp" },
  {
    inputMode: "typing",
    selectedIndex: 0,
    selectionActive: false,
    suggestionCount: 5,
  },
  { type: "move", selectedIndex: 4 },
);
assertPopupKeyAction(
  "explicit completion mode ArrowDown moves to next suggestion",
  { key: "ArrowDown" },
  {
    inputMode: "completion",
    selectedIndex: 0,
    selectionActive: true,
    suggestionCount: 5,
  },
  { type: "move", selectedIndex: 1 },
);
assertPopupKeyAction(
  "explicit completion mode ArrowUp wraps to previous suggestion",
  { key: "ArrowUp" },
  {
    inputMode: "completion",
    selectedIndex: 0,
    selectionActive: true,
    suggestionCount: 5,
  },
  { type: "move", selectedIndex: 4 },
);
assertPopupKeyAction(
  "sudo su popup Enter after explicit selection accepts selected suggestion",
  { key: "Enter" },
  { selectedIndex: 0, selectionActive: true, suggestionCount: 5 },
  { type: "accept", selectedIndex: 0 },
);
assertPopupKeyAction(
  "sudo su dash popup Enter without active selection executes typed dash command",
  { key: "Enter" },
  { selectedIndex: 0, selectionActive: false, suggestionCount: 4 },
  { type: "close-and-pass-through" },
);
assertInputModeAfterTerminalData(
  "plain text input enters typing mode",
  "git",
  "idle",
  "typing",
);
assertInputModeAfterTerminalData(
  "backspace keeps typing mode",
  "\x7f",
  "history",
  "typing",
);
assertInputModeAfterTerminalData(
  "ArrowUp enters history mode",
  "\x1b[A",
  "typing",
  "history",
);
assertInputModeAfterTerminalData(
  "ArrowDown enters history mode",
  "\x1b[B",
  "typing",
  "history",
);
assertInputModeAfterTerminalData(
  "typing after history exits history mode",
  "x",
  "history",
  "typing",
);
assertInputModeAfterTerminalData(
  "Enter resets input mode",
  "\r",
  "completion",
  "idle",
);
assertInputModeAfterTerminalData(
  "Ctrl+C resets input mode",
  "\u0003",
  "completion",
  "idle",
);
assertSuggestionDescription(
  "git s",
  "git status",
  "Arbeitsbaumstatus anzeigen",
);
assertSuggestionDescription(
  "git p",
  "git pull",
  "fetch plus Integration in aktuellen Branch",
);
assertSuggestionDescription(
  "git status --",
  "git status --short",
  "Kurzformat des Arbeitsbaumstatus anzeigen",
);
assertSuggestionDescription(
  "git reset --",
  "git reset --soft",
  "Commits zurücksetzen, Änderungen gestaged lassen",
);
assertSuggestionDescription(
  "ls ",
  "ls -la",
  "lange Liste inklusive versteckter Einträge",
);
assertSuggestionDescription("cp -", "cp -r", "Verzeichnisse rekursiv kopieren");
assertSuggestionDescription(
  "mv -",
  "mv -n",
  "bestehende Ziele nicht überschreiben",
);
assertSuggestionDescription(
  "mkdir -",
  "mkdir -p",
  "fehlende Elternverzeichnisse erstellen",
);
assertDefaultSuggestionDescription(
  "gzip ",
  "gzip -k",
  "Keep the original file",
);
assertDefaultSuggestionDescription(
  "systemctl ",
  "systemctl status",
  "Show unit status",
);
assertDefaultSuggestionDescription(
  "alias ",
  "alias ll='ls -lah'",
  "Alias for a long listing including hidden files",
);
assertSuggestionDescription("grep -", "grep -R", "rekursiv suchen");
assertSuggestionDescription(
  "rg -",
  "rg --files",
  "Dateipfade statt Treffer ausgeben",
);
assertSuggestionDescription("curl -", "curl -H", "HTTP-Header setzen");
assertSuggestionDescription(
  "curl --",
  "curl --retry",
  "fehlgeschlagene Requests erneut versuchen",
);
assertSuggestionDescription(
  "rsync -",
  "rsync --dry-run",
  "Änderungen nur simulieren",
);
assertSuggestionDescription(
  "jq -",
  "jq -r",
  "Strings roh ohne JSON-Anführungszeichen ausgeben",
);
assertSuggestionDescription("yq -", "yq -i", "Datei direkt bearbeiten");
assertSuggestionDescription("gzip ", "gzip -k", "Originaldatei behalten");
assertSuggestionDescription(
  "gunzip ",
  "gunzip -l",
  "komprimierte Dateigrößen anzeigen",
);
assertSuggestionDescription("bzip2 ", "bzip2 -t", "komprimierte Datei prüfen");
assertSuggestionDescription(
  "bunzip2 ",
  "bunzip2 -c",
  "entpackten Inhalt auf stdout schreiben",
);
assertSuggestionDescription(
  "xz ",
  "xz -T",
  "Anzahl Kompressionsthreads setzen",
);
assertSuggestionDescription("unxz ", "unxz -k", "Originaldatei behalten");
assertSuggestionDescription(
  "zstd ",
  "zstd --long",
  "Long-Range-Modus für große Dateien nutzen",
);
assertSuggestionDescription(
  "zcat ",
  "zcat -l",
  "komprimierte Dateigrößen anzeigen",
);
assertSuggestionDescription("zgrep ", "zgrep -n", "Zeilennummern anzeigen");
assertSuggestionDescription(
  "ssh-keygen -",
  "ssh-keygen -t",
  "Schlüsseltyp wählen",
);
assertSuggestionDescription("tcpdump -", "tcpdump -i", "Interface auswählen");
assertSuggestionDescription(
  "openssl s_client -",
  "openssl s_client -connect",
  "TLS-Ziel als host:port setzen",
);
assertSuggestionDescription(
  "resolvectl q",
  "resolvectl query <name>",
  "DNS-Namen auflösen",
);
assertSuggestionDescription(
  "sudo systemctl s",
  "sudo systemctl status <unit>",
  "Status einer Unit anzeigen",
);
assertSuggestionDescription(
  "sudo systemctl s",
  "sudo systemctl set-environment <VARIABLE=VALUE>",
  "systemd-Manager-Variable setzen",
);
assertSuggestionDescription(
  "systemctl list-",
  "systemctl list-sockets",
  "Socket-Units anzeigen",
);
assertSuggestionDescription("ssh -", "ssh -l", "Login-Benutzer setzen");
assertSuggestionDescription(
  "ssh -",
  "ssh -A",
  "SSH-Agent-Forwarding aktivieren",
);
assertSuggestionDescription(
  "ssh -o ",
  "ssh -o StrictHostKeyChecking=accept-new",
  "neue Hostkeys automatisch akzeptieren",
);
assertSuggestionDescription(
  "ssh -o ",
  "ssh -o ConnectTimeout=10",
  "Verbindungs-Timeout setzen",
);
assertSuggestionDescription(
  "ssh -o ",
  "ssh -o LogLevel=ERROR",
  "nur Fehler ausgeben",
);
assertSuggestionDescription(
  "sudo su",
  "sudo su -c <command>",
  "einzelnen Befehl als Zielbenutzer ausführen",
);
assertSuggestionDescription(
  "find . -",
  "find . -type",
  "nach Dateityp filtern",
);
assertSuggestionDescription(
  "ssh ",
  "ssh -vvv",
  "maximale SSH-Debug-Ausgabe anzeigen",
);
assertSuggestionDescription("scp ", "scp -P", "SSH-Port setzen");
assertSuggestionDescription(
  "dpkg -",
  "dpkg --listfiles",
  "installierte Dateien eines Pakets anzeigen",
);
assertSuggestionDescription(
  "tar -",
  "tar -tf archive.tar.gz",
  "Archivinhalt anzeigen",
);
assertMinCount("clear ", 4);
assertIncludes("clear ", "clear -x");
assertIncludes("clear ", "clear -T");
assertSuggestionDescription(
  "clear ",
  "clear -x",
  "Scrollback-Puffer nicht löschen",
);
assertDeepEqual(
  commandsFor("echo "),
  ["echo -n", "echo -e", "echo -E"],
  "echo suggestions use only Bash builtin options",
);
assertDeepEqual(
  autocomplete
    .buildTerminalAutocompleteMatchItems(
      "echo ",
      ["echo --help", "echo --version"],
      { mode: "popup" },
    )
    .map((item) => item.command),
  ["echo -n", "echo -e", "echo -E"],
  "echo history does not reintroduce non-builtin long options",
);
assertDeepEqual(
  commandsFor("echo --"),
  [],
  "echo long options are not suggested for the Bash builtin",
);
assertNotIncludes("echo --", "echo --help");
assertNotIncludes("echo --", "echo --version");
assertDeepEqual(
  commandsFor("echo \\"),
  [
    "echo \\\\",
    "echo \\a",
    "echo \\b",
    "echo \\c",
    "echo \\e",
    "echo \\E",
    "echo \\f",
    "echo \\n",
    "echo \\r",
    "echo \\t",
    "echo \\v",
    "echo \\0nnn",
    "echo \\xHH",
    "echo \\uHHHH",
    "echo \\UHHHHHHHH",
  ],
  "echo escape suggestions match Bash builtin help",
);
assertSuggestionDescription(
  "echo ",
  "echo -n",
  "keinen abschliessenden Zeilenumbruch anhaengen",
);
assertSuggestionDescription(
  "echo \\",
  "echo \\t",
  "horizontaler Tabulator",
);
assertDefaultSuggestionDescription(
  "echo ",
  "echo -e",
  "Enable interpretation of the following backslash escapes",
);
assertDefaultSuggestionDescription(
  "echo \\",
  "echo \\UHHHHHHHH",
  "The Unicode character whose value is the hexadecimal value HHHHHHHH. HHHHHHHH can be one to eight hex digits",
);
{
  const echoHelp = autocomplete.getTerminalAutocompleteHelp("echo");
  if (!echoHelp) {
    fail("Expected echo to have autocomplete help");
  }
  assertEqual(
    autocomplete.getTerminalAutocompleteHelpDescription(echoHelp),
    "Write arguments to the standard output.",
    "echo help description is Bash builtin help",
  );
  assertDefaultSuggestionDescription(
    "echo ",
    "echo custom",
    "Display the ARGs, separated by a single space character and followed by a newline, on the standard output.",
  );
}
assertDeepEqual(
  commandsFor("sudo echo "),
  ["sudo echo -n", "sudo echo -e", "sudo echo -E"],
  "sudo echo suggestions use only Bash builtin options",
);
assertMinCount("printf ", 12);
assertIncludes("printf ", "printf '%04d\\n' 42");
assertIncludes("printf ", "printf '%q\\n' \"$PATH\"");
assertIncludes("printf ", "printf '%(%F %T)T\\n' -1");
assertSuggestionDescription(
  "printf ",
  "printf '%q\\n' \"$PATH\"",
  "Shell-escaped Ausgabe erzeugen",
);
assertMinCount("pwd ", 12);
assertIncludes("pwd ", "pwd --physical");
assertIncludes("pwd ", "pwd | xargs basename");
assertSuggestionDescription(
  "pwd ",
  "pwd --physical",
  "physischen Pfad ohne Symlinks anzeigen",
);
assertMinCount("hostname ", 14);
assertIncludes("hostname ", "hostname --all-ip-addresses");
assertIncludes("hostname ", "hostname --all-fqdns");
assertStartsWithSequence("hostname ", [
  "hostname -f",
  "hostname -I",
  "hostname -i",
]);
assertSuggestionDescription(
  "hostname ",
  "hostname --all-ip-addresses",
  "alle Netzwerkadressen des Hosts anzeigen",
);
assertMinCount("whoami", 2);
assertIncludes("whoami", "whoami --version");
assertSuggestionDescription("whoami", "whoami --version", "Version anzeigen");
assertMinCount("passwd ", 16);
assertIncludes("passwd ", "passwd --status");
assertIncludes("passwd ", "passwd --lock");
assertSuggestionDescription(
  "passwd ",
  "passwd --lock",
  "Benutzerpasswort sperren",
);
assertSuggestionDescription(
  "passwd ",
  "passwd username",
  "Passwort dieses Benutzers ändern",
);
assertMinCount("groups ", 12);
assertStartsWithSequence("groups ", [
  "groups $USER",
  "groups username",
  "groups www-data",
  "groups deploy",
]);
assertSuggestionDescription(
  "groups ",
  "groups www-data",
  "Gruppen des Webserver-Benutzers anzeigen",
);
assertMinCount("useradd ", 17);
assertStartsWithSequence("useradd ", [
  "useradd -m -s /bin/bash username",
  "useradd -m -G sudo username",
  "useradd -m -d /home/deploy deploy",
]);
assertSuggestionDescription(
  "useradd ",
  "useradd -r -s /usr/sbin/nologin app",
  "Systembenutzer ohne Login-Shell erstellen",
);
assertSuggestionDescription(
  "useradd ",
  "useradd --user-group",
  "gleichnamige Benutzergruppe anlegen",
);
assertMinCount("usermod ", 18);
assertStartsWithSequence("usermod ", [
  "usermod -aG sudo username",
  "usermod -aG docker username",
  "usermod -s /bin/bash username",
]);
assertSuggestionDescription(
  "usermod ",
  "usermod -d /home/deploy -m deploy",
  "Home-Verzeichnis ändern und Inhalte verschieben",
);
assertSuggestionDescription(
  "usermod ",
  "usermod --lock",
  "Benutzerpasswort sperren",
);
assertMinCount("chage ", 18);
assertStartsWithSequence("chage ", [
  "chage -l username",
  "chage -d 0 username",
  "chage -M 90 -W 14 username",
]);
assertSuggestionDescription(
  "chage ",
  "chage -d 0 username",
  "Passwortwechsel beim nächsten Login erzwingen",
);
assertSuggestionDescription(
  "chage ",
  "chage --inactive",
  "Inaktivitätstage nach Passwortablauf setzen",
);
assertMinCount("groupadd ", 12);
assertStartsWithSequence("groupadd ", [
  "groupadd developers",
  "groupadd -g 1500 app",
  "groupadd -r servicegroup",
]);
assertSuggestionDescription(
  "groupadd ",
  "groupadd -f developers",
  "keinen Fehler melden, wenn Gruppe existiert",
);
assertMinCount("groupmod ", 11);
assertStartsWithSequence("groupmod ", [
  "groupmod -n newname oldname",
  "groupmod --new-name app app-old",
  "groupmod -g 1501 developers",
]);
assertSuggestionDescription(
  "groupmod ",
  "groupmod -n newname oldname",
  "Gruppe oldname in newname umbenennen",
);
assertMinCount("visudo ", 14);
assertStartsWithSequence("visudo ", [
  "visudo -c",
  "visudo -c -f /etc/sudoers.d/app",
  "visudo -f /etc/sudoers.d/app",
]);
assertSuggestionDescription(
  "visudo ",
  "visudo -c -f /etc/sudoers.d/app",
  "sudoers-Drop-in app prüfen",
);
assertMinCount("ssh-agent ", 9);
assertIncludes("ssh-agent ", "ssh-agent -D");
assertIncludes("ssh-agent ", "ssh-agent -d");
assertSuggestionDescription(
  "ssh-agent ",
  "ssh-agent -D",
  "Agent im Vordergrund starten",
);
assertMinCount("ssh-add ", 17);
assertIncludes("ssh-add ", "ssh-add -L");
assertIncludes("ssh-add ", "ssh-add -X");
assertIncludes("ssh-add ", "ssh-add -T");
assertSuggestionDescription(
  "ssh-add ",
  "ssh-add -L",
  "öffentliche Schlüssel des Agents ausgeben",
);
assertSuggestionDescription(
  "wget ",
  "wget -c",
  "abgebrochenen Download fortsetzen",
);
assertSuggestionDescription(
  "watch ",
  "watch --interval",
  "Intervall in Sekunden setzen",
);
assertMinCount("watch ", 20);
assertStartsWithSequence("watch ", [
  "watch -n 1 date",
  "watch -d 'df -h'",
  "watch -n 2 'systemctl status ssh'",
]);
assertSuggestionDescription(
  "watch ",
  "watch --differences=cumulative 'ss -tulpn'",
  "Socket-Aenderungen kumulativ hervorheben",
);
assertMinCount("sleep ", 8);
assertIncludes("sleep ", "sleep 1m");
assertSuggestionDescription(
  "sleep ",
  "sleep infinity",
  "bis zur Unterbrechung schlafen",
);
assertMinCount("logger ", 16);
assertIncludes("logger ", "logger -t deploy 'release started'");
assertSuggestionDescription(
  "logger ",
  "logger --journald",
  "strukturierte journald-Felder senden",
);
assertMinCount("cal ", 10);
assertIncludes("cal ", "cal --week=iso");
assertIncludes("ncal ", "ncal --week=iso");
assertSuggestionDescription(
  "cal ",
  "cal --monday",
  "Wochen am Montag beginnen",
);
assertMinCount("sync ", 8);
assertIncludes("sync ", "sync --file-system /mnt/usb");
assertSuggestionDescription(
  "sync ",
  "sync --data file.txt",
  "nur Dateidaten schreiben",
);
assertMinCount("test ", 12);
assertIncludes("test ", "test -f /etc/passwd");
assertSuggestionDescription(
  "test ",
  "test -d /var/log",
  "pruefen, ob ein Pfad ein Verzeichnis ist",
);
assertSuggestionDescription("sed ", "sed -i", "Dateien direkt bearbeiten");
assertSuggestionDescription(
  "jq ",
  "jq .[].name",
  "Feld name aus jedem Array-Element ausgeben",
);
assertSuggestionDescription(
  "ip ",
  "ip route",
  "Routing-Tabelle anzeigen oder ändern",
);
assertSuggestionDescription("ss ", "ss -t", "TCP-Sockets anzeigen");
assertSuggestionDescription(
  "ps ",
  "ps aux",
  "alle Prozesse mit Benutzer und Ressourcen anzeigen",
);
assertSuggestionDescription(
  "cat ",
  "cat /var/log/syslog",
  "Dateiinhalt ausgeben",
);
assertSuggestionDescription("tail ", "tail -f", "Dateiende live verfolgen");
assertSuggestionDescription(
  "wc ",
  "wc file.txt",
  "Zeilen, Wörter oder Bytes für Datei zählen",
);
assertSuggestionDescription(
  "sort ",
  "sort -nr numbers.txt",
  "numerisch absteigend sortieren",
);
assertSuggestionDescription(
  "df ",
  "df -hT",
  "Größen menschenlesbar mit Dateisystemtyp anzeigen",
);
assertSuggestionDescription(
  "du ",
  "du -sh /var/log",
  "Größe von /var/log anzeigen",
);
assertSuggestionDescription(
  "ncdu ",
  "ncdu -x",
  "auf einem Dateisystem bleiben",
);
assertSuggestionDescription(
  "tmux ",
  "tmux attach -t <name>",
  "an bestehende tmux-Sitzung anhängen",
);
assertSuggestionDescription(
  "tmux ",
  "tmux split-window",
  "aktuelles Fenster teilen",
);
assertSuggestionDescription(
  "screen ",
  "screen -r",
  "Screen-Sitzung wieder anhängen",
);
assertSuggestionDescription(
  "screen ",
  "screen -ls",
  "Screen-Sitzungen auflisten",
);
assertSuggestionDescription(
  "nohup ",
  "nohup ./server.sh &",
  "Befehl nach Logout weiterlaufen lassen",
);
assertSuggestionDescription(
  "jobs ",
  "jobs -l",
  "Jobs mit Prozess-IDs anzeigen",
);
assertSuggestionDescription("fg ", "fg %1", "Job 1 in den Vordergrund holen");
assertSuggestionDescription("bg ", "bg %1", "Job 1 im Hintergrund fortsetzen");
assertSuggestionDescription(
  "disown ",
  "disown -h",
  "Job vor SIGHUP beim Logout schützen",
);
assertSuggestionDescription(
  "pgrep ",
  "pgrep -af python",
  "PID und komplette Kommandozeile durchsuchen und anzeigen",
);
assertMinCount("pgrep ", 24);
assertStartsWithSequence("pgrep ", [
  "pgrep -af python",
  "pgrep -u www-data",
  "pgrep -x sshd",
  "pgrep -n node",
]);
assertSuggestionDescription(
  "pgrep ",
  "pgrep -d ',' nginx",
  "PIDs durch Komma getrennt ausgeben",
);
assertSuggestionDescription(
  "lsof ",
  "lsof -nP -iTCP -sTCP:LISTEN",
  "lauschende TCP-Ports numerisch anzeigen",
);
assertSuggestionDescription(
  "patch ",
  "patch -p1 < changes.patch",
  "einen führenden Pfadbestandteil entfernen",
);
assertMinCount("alias ", 12);
assertStartsWithSequence("alias ", [
  "alias ll='ls -lah'",
  "alias gs='git status'",
  "alias ga='git add'",
  "alias gp='git pull'",
  "alias dc='docker compose'",
]);
assertSuggestionDescription(
  "alias ",
  "alias ports='ss -tulpn'",
  "Alias fuer lauschende Ports mit Prozessen",
);
assertMinCount("unalias ", 12);
assertStartsWithSequence("unalias ", [
  "unalias ll",
  "unalias gs",
  "unalias ga",
  "unalias gp",
  "unalias dc",
]);
assertSuggestionDescription(
  "unalias ",
  "unalias serve",
  "Alias serve entfernen",
);
assertMinCount("export ", 12);
assertStartsWithSequence("export ", [
  "export PATH=$PATH:/opt/bin",
  "export EDITOR=nano",
  "export NODE_ENV=production",
  "export LANG=C.UTF-8",
]);
assertSuggestionDescription(
  "export ",
  "export HISTCONTROL=ignoredups",
  "doppelte History-Eintraege vermeiden",
);
assertMinCount("unset ", 12);
assertStartsWithSequence("unset ", [
  "unset VAR",
  "unset NODE_ENV",
  "unset SSH_AUTH_SOCK",
  "unset DEBUG",
]);
assertSuggestionDescription(
  "unset ",
  "unset -f function_name",
  "Shell-Funktion entfernen",
);
assertMinCount("history ", 12);
assertStartsWithSequence("history ", [
  "history 20",
  "history 100",
  "history | grep ssh",
  "history | grep systemctl",
]);
assertNotIncludes("history ", "history -c");
assertSuggestionDescription(
  "history ",
  "history | grep ssh",
  "History nach ssh durchsuchen",
);
assertMinCount("which ", 12);
assertStartsWithSequence("which ", [
  "which python",
  "which node",
  "which docker",
  "which systemctl",
]);
assertSuggestionDescription(
  "which ",
  "which -a python",
  "alle python-Fundstellen anzeigen",
);
assertMinCount("type ", 12);
assertStartsWithSequence("type ", [
  "type cd",
  "type alias",
  "type export",
  "type history",
]);
assertSuggestionDescription(
  "type ",
  "type -t systemctl",
  "nur den Typ von systemctl ausgeben",
);
assertMinCount("command ", 12);
assertStartsWithSequence("command ", [
  "command -v docker",
  "command -v systemctl",
  "command -V cd",
  "command -V history",
]);
assertSuggestionDescription(
  "command ",
  "command -v docker",
  "Pfad zu docker anzeigen",
);
assertMinCount("dirname ", 11);
assertSuggestionDescription(
  "dirname ",
  "dirname ~/.ssh/config",
  "SSH-Konfigurationsverzeichnis ausgeben",
);
assertMinCount("basename ", 12);
assertSuggestionDescription(
  "basename ",
  "basename --suffix=.tar.gz archive.tar.gz",
  "Suffix .tar.gz entfernen",
);
assertMinCount("more ", 12);
assertStartsWithSequence("more ", [
  "more /var/log/syslog",
  "more file.txt",
  "more -d file.txt",
  "more -f file.txt",
]);
assertSuggestionDescription(
  "more ",
  "more +/error /var/log/syslog",
  "bei erstem Treffer fuer error starten",
);
assertTopSuggestionsHaveSpecificDescriptions([
  "cat ",
  "less ",
  "more ",
  "head ",
  "tail ",
  "wc ",
  "sort ",
  "uniq ",
  "cut ",
  "tee ",
  "tr ",
  "nl ",
  "base64 ",
  "split ",
  "column ",
  "file ",
  "stat ",
  "readlink ",
  "realpath ",
  "basename ",
  "dirname ",
  "df ",
  "du ",
  "free ",
  "lsblk ",
  "blkid ",
  "mount ",
  "umount ",
  "top ",
  "htop ",
  "kill ",
  "pgrep ",
  "pidof ",
  "pstree ",
  "pkill ",
  "netstat ",
  "lsof ",
  "ping ",
  "dig ",
  "host ",
  "traceroute ",
  "mtr ",
  "nmap ",
  "iftop ",
  "nload ",
  "iostat ",
  "modinfo ",
  "vnstat ",
  "iperf3 ",
  "lscpu ",
  "lspci ",
  "lsusb ",
  "lsmod",
  "vmstat ",
  "ncdu ",
  "tmux ",
  "screen ",
  "nohup ",
  "ssh-agent ",
  "jobs ",
  "fg ",
  "bg ",
  "disown ",
  "service ",
  "hostnamectl ",
  "timedatectl ",
  "loginctl ",
  "localectl ",
  "networkctl ",
  "busctl ",
  "coredumpctl ",
  "systemd-cgls ",
  "systemd-cgtop ",
  "update-alternatives ",
  "machinectl ",
  "findmnt ",
  "sysctl ",
  "dmesg ",
  "systemd-analyze ",
  "awk ",
  "zip ",
  "unzip ",
  "zcat ",
  "diff ",
  "patch ",
  "alias ",
  "unalias ",
  "export ",
  "unset ",
  "history ",
  "which ",
  "type ",
  "command ",
  "clear ",
  "uptime",
  "watch ",
  "printf ",
  "pwd ",
  "hostname ",
  "whoami",
  "touch ",
  "tail ",
  "timeout ",
  "memusage ",
  "sha256sum ",
  "sha1sum ",
  "md5sum ",
  "hexdump ",
  "xxd ",
  "passwd ",
  "groups ",
  "useradd ",
  "usermod ",
  "chage ",
  "groupadd ",
  "groupmod ",
  "visudo ",
  "ssh-agent ",
  "ssh-add ",
  "wget ",
  "sed ",
  "jq ",
  "yq ",
  "rg ",
  "rg -",
  "npm ",
  "npm run ",
  "pnpm ",
  "pnpm run ",
  "yarn ",
  "node ",
  "python ",
  "python3 ",
  "pip ",
  "pip3 ",
  "make ",
  "kubectl ",
  "kubectl get ",
  "kubectl logs ",
  "helm ",
  "helm list ",
  "helm upgrade ",
  "terraform ",
  "terraform plan ",
  "terraform workspace ",
  "ansible ",
  "ansible-playbook ",
  "ansible-inventory ",
  "aws ",
  "aws s3 ",
  "aws logs ",
  "aws eks ",
  "gcloud ",
  "gcloud compute ",
  "gcloud container ",
  "gcloud logging ",
  "az ",
  "az account ",
  "az aks ",
  "az webapp ",
  "psql ",
  "pg_dump ",
  "pg_restore ",
  "mysql ",
  "mariadb ",
  "mysqldump ",
  "sqlite3 ",
  "redis-cli ",
  "mongosh ",
  "crontab ",
  "nginx ",
  "apachectl ",
  "apache2ctl ",
  "certbot ",
  "supervisorctl ",
  "pm2 ",
  "nslookup ",
  "tracepath ",
  "iw ",
  "nft ",
  "openssl s_client ",
  "ssh-keyscan ",
  "scp ",
  "gzip ",
  "gunzip ",
  "bzip2 ",
  "bunzip2 ",
  "xz ",
  "unxz ",
  "zstd ",
  "zcat ",
  "zgrep ",
  "zip ",
  "unzip ",
  "vi ",
  "ip ",
  "ss ",
  "ps ",
  "git ",
  "git re",
  "git co",
  "git branch ",
  "git log --",
  "docker ",
  "docker ps ",
  "docker logs ",
  "docker run ",
  "docker compose ",
  "docker compose up ",
  "systemctl ",
  "systemctl s",
  "systemctl list-",
  "journalctl -",
  "journalctl -u ",
  "ssh ",
  "ssh -",
  "ssh -o ",
  "scp ",
  "rsync ",
  "apt ",
  "apt install ",
  "dpkg -",
  "find . -",
  "grep -",
  "tar -",
  "curl -",
  "ls -",
  "cp -",
  "mv -",
  "mkdir -",
  "sudo su",
  "sudo su -",
  "openssl s_client -",
  "tcpdump -",
  "resolvectl ",
]);

assertMinCount("sudo systemctl ", 50);
assertMinCount("sudo systemctl ", 65);
assertSameEffectiveSuggestions("systemctl s", "sudo systemctl s", 10);
assertSameEffectiveSuggestions(
  "systemctl status ",
  "sudo systemctl status ",
  12,
);
assertIncludes("sudo systemctl s", "sudo systemctl status <unit>");
assertBefore(
  "sudo systemctl s",
  "sudo systemctl show <unit>",
  "sudo systemctl set-environment <VARIABLE=VALUE>",
);
assertNotIncludes("systemctl s", "systemctl status nginx");
assertIncludes("systemctl status ", "systemctl status certbot.timer");
assertFirst("systemctl status ", "systemctl status certbot.timer");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status nginx");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status ssh");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status sshd");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status apache2");
assertNotIncludes(
  "sudo systemctl status ",
  "sudo systemctl status ssh | tee status.txt",
);
assertIncludes("sudo systemctl status ", "sudo systemctl status certbot.timer");
assertSource(
  "sudo systemctl status ",
  "sudo systemctl status certbot.timer",
  "history",
);
assertIncludes(
  "sudo systemctl status ",
  "sudo systemctl status custom-app.service",
);
assertSource(
  "sudo systemctl status ",
  "sudo systemctl status custom-app.service",
  "history",
);
assertFirst("sudo systemctl status ", "sudo systemctl status certbot.timer");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status cert.bot");
assertDeepEqual(
  runtimeSystemdUnits,
  [
    "certbot.service",
    "certbot.timer",
    "ssh.service",
    "nginx.service",
    "docker.socket",
    "custom-runtime.service",
  ],
  "runtime systemd unit extraction",
);
assertDeepEqual(
  autocomplete.extractSystemdUnitsFromTerminalOutput(missingSystemdUnitOutput),
  [],
  "missing systemd units are not learned from error output",
);
assertDeepEqual(
  raspberryPiSystemdUnits,
  ["avahi-daemon.service", "dbus.service", "dhcpcd.service", "ssh.service"],
  "real systemd service output extraction",
);
assertDeepEqual(
  backendSystemdServices,
  [
    "accounts-daemon.service",
    "avahi-daemon.service",
    "bluetooth.service",
    "cron.service",
    "cups.service",
    "dns.service",
  ],
  "backend systemd service first-column extraction",
);
assertDeepEqual(
  systemdAutocomplete.extractSystemdServiceUnitsForAutocomplete(
    "auditd.service not-found inactive dead auditd.service",
  ),
  [],
  "backend systemd service list-units not-found exclusion",
);
assertDeepEqual(
  freeBsdRcServices,
  ["cron", "devd", "netif", "routing", "sshd", "zfs"],
  "FreeBSD rc service first-column extraction",
);
assertDeepEqual(
  serviceAutocomplete.extractFreeBsdRcServicesForAutocomplete(
    "Usage: service [-j jail] -l\ncron\n/usr/local/etc/rc.d/nginx\nsshd",
  ),
  ["cron", "sshd"],
  "FreeBSD rc service parser ignores usage and paths",
);
assertEqual(
  systemdAutocomplete.SYSTEMD_SERVICE_AUTOCOMPLETE_QUERY,
  [
    "systemctl list-units --type=service --all --plain --no-legend --no-pager",
    "systemctl list-unit-files --type=service --plain --no-legend --no-pager",
  ].join("; "),
  "backend systemd service query commands",
);
assertEqual(
  terminalCapabilities.TERMINAL_AUTOCOMPLETE_CAPABILITIES_QUERY.includes(
    "command -v",
  ),
  true,
  "backend capability query detects commands",
);
assertEqual(
  debianCapabilities.osFamily,
  "linux",
  "Debian capabilities detect Linux",
);
assertEqual(
  debianCapabilities.serviceProviders.includes("systemd"),
  true,
  "Debian capabilities enable systemd provider",
);
assertEqual(
  debianCapabilities.commandCatalogs.includes("debian-like"),
  true,
  "Debian capabilities enable Debian catalog",
);
assertEqual(
  raspberryPiCapabilities.osFamily,
  "linux",
  "Raspberry Pi OS capabilities detect Linux",
);
assertEqual(
  raspberryPiCapabilities.commandCatalogs.includes("debian-like"),
  true,
  "Raspberry Pi OS capabilities enable Debian-like catalog",
);
assertEqual(
  raspberryPiCapabilities.serviceProviders.includes("systemd"),
  true,
  "Raspberry Pi OS capabilities enable systemd provider",
);
assertEqual(
  ubuntuCapabilities.osFamily,
  "linux",
  "Ubuntu capabilities detect Linux",
);
assertEqual(
  ubuntuCapabilities.commandCatalogs.includes("debian-like"),
  true,
  "Ubuntu capabilities enable Debian-like catalog",
);
assertEqual(
  ubuntuCapabilities.serviceProviders.includes("systemd"),
  true,
  "Ubuntu capabilities enable systemd provider",
);
assertEqual(
  archCapabilities.packageManagers.includes("pacman"),
  true,
  "Arch capabilities detect pacman",
);
assertEqual(
  archCapabilities.commandCatalogs.includes("arch"),
  true,
  "Arch capabilities enable Arch catalog",
);
assertEqual(
  freeBsdCapabilities.osFamily,
  "freebsd",
  "FreeBSD capabilities detect FreeBSD",
);
assertEqual(
  freeBsdCapabilities.serviceProviders.includes("freebsd-rc"),
  true,
  "FreeBSD capabilities enable rc service provider",
);
assertEqual(
  terminalCapabilities.shouldUseSystemdAutocompleteProvider(debianCapabilities),
  true,
  "systemd provider selected for Debian",
);
assertEqual(
  terminalCapabilities.shouldUseFreeBsdRcAutocompleteProvider(
    freeBsdCapabilities,
  ),
  true,
  "FreeBSD rc provider selected for FreeBSD",
);
assertEqual(
  autocomplete.isSystemdUnitAutocompleteContext("sudo systemctl status "),
  true,
  "sudo systemctl status requests systemd unit metadata",
);
assertEqual(
  autocomplete.isSystemdUnitAutocompleteContext("systemctl list-units "),
  false,
  "systemctl list-units does not request a unit value",
);
assertRuntimeFirst("systemctl status ", "systemctl status certbot.service");
assertRuntimeIncludes("systemctl status c", "systemctl status certbot.service");
assertRuntimeIncludes("systemctl status c", "systemctl status certbot.timer");
assertRuntimeIncludes(
  "sudo systemctl stop ",
  "sudo systemctl stop ssh.service",
);
assertRuntimeIncludes("systemctl restart n", "systemctl restart nginx.service");
assertRuntimeIncludes(
  "systemctl reload ",
  "systemctl reload custom-runtime.service",
);
assertRuntimeIncludes(
  "journalctl -u c",
  "journalctl -u custom-runtime.service",
);
assertSystemdUnitsIncludes(
  "sudo systemctl status bl",
  backendSystemdServices,
  "sudo systemctl status bluetooth.service",
);
assertSystemdUnitsIncludes(
  "sudo systemctl status ",
  backendSystemdServices,
  "sudo systemctl status cups.service",
);
freshSessionBackendSystemdServices.forEach((service) => {
  assertFreshSystemdUnitsIncludes(
    "sudo systemctl status ",
    freshSessionBackendSystemdServices,
    `sudo systemctl status ${service}`,
  );
});
assertCapabilitiesInclude(
  "sudo systemctl status ",
  debianCapabilities,
  "sudo systemctl status bluetooth.service",
  {
    history: [],
    systemdUnits: freshSessionBackendSystemdServices,
  },
);
assertCapabilitiesNotInclude(
  "systemctl status ",
  freeBsdCapabilities,
  "systemctl status ssh.service",
  {
    history: [],
    systemdUnits: ["ssh.service"],
  },
);
assertCapabilitiesInclude("sudo pac", archCapabilities, "sudo pacman", {
  history: [],
});
assertCapabilitiesNotInclude("sudo apt ", archCapabilities, "sudo apt update", {
  history: [],
});
assertCapabilitiesInclude("service ssh", freeBsdCapabilities, "service sshd", {
  history: [],
  serviceNames: freeBsdRcServices,
});
assertCapabilitiesNotInclude(
  "sudo systemctl ",
  freeBsdCapabilities,
  "sudo systemctl status",
  {
    history: [],
  },
);
assertRuntimeSource(
  "sudo systemctl stop ",
  "sudo systemctl stop ssh.service",
  "catalog",
);
assertSystemdUnitsIncludes(
  "sudo systemctl status d",
  raspberryPiSystemdUnits,
  "sudo systemctl status dbus.service",
);
assertSystemdUnitsIncludes(
  "systemctl restart av",
  raspberryPiSystemdUnits,
  "systemctl restart avahi-daemon.service",
);
assertSystemdUnitsIncludes(
  "systemctl stop ",
  raspberryPiSystemdUnits,
  "systemctl stop dhcpcd.service",
);
assertSystemdUnitsIncludes(
  "sudo systemctl status ",
  raspberryPiSystemdUnits,
  "sudo systemctl status avahi-daemon.service",
);
assertSystemdUnitsNotIncludes(
  "sudo systemctl status m",
  autocomplete.extractSystemdUnitsFromTerminalOutput(missingSystemdUnitOutput),
  "sudo systemctl status mariadb.service",
);
assertNotIncludes("systemctl stop ", "systemctl stop ssh");
assertNotIncludes("systemctl restart ", "systemctl restart ssh");

assertNotIncludes("sudo s", "sudo ssh pi@192.168.178.20");
assertFirst("sudo s", "sudo systemctl");
assertIncludes("sudo s", "sudo systemctl");
assertSource("sudo s", "sudo systemctl", "catalog");
assertFirst("sudo ", "sudo systemctl");
assertIncludes("sudo ", "sudo apt update");
assertIncludes("sudo ", "sudo journalctl");
assertNotIncludes("sudo ", "sudo sudo");
assertNotIncludes("sudo ", "sudo <command>");
assertSource("sudo ", "sudo systemctl", "catalog");
assertNoModeSuggestions("sudo su", "ghost");
assertManualPopupExceedsTen("git");
assertManualPopupExceedsTen("sudo git");
assertManualPopupExceedsTen("sudo systemctl ");
assertManualPopupExceedsTen("alias ");
assertManualPopupExceedsTen("unalias ");
assertManualPopupExceedsTen("export ");
assertManualPopupExceedsTen("unset ");
assertManualPopupExceedsTen("history ");
assertManualPopupExceedsTen("pwd ");
assertManualPopupExceedsTen("which ");
assertManualPopupExceedsTen("type ");
assertManualPopupExceedsTen("command ");
assertManualPopupExceedsTen("dirname ");
assertManualPopupExceedsTen("basename ");
assertManualPopupExceedsTen("printf ");
assertManualPopupExceedsTen("tee ");
assertManualPopupExceedsTen("more ");
assertManualPopupExceedsTen("screen ");
assertManualPopupExceedsTen("nohup ");
assertManualPopupExceedsTen("jobs ");
assertManualPopupExceedsTen("fg ");
assertManualPopupExceedsTen("bg ");
assertManualPopupExceedsTen("disown ");
assertManualPopupExceedsTen("pidof ");
assertManualPopupExceedsTen("pstree ");
assertManualPopupExceedsTen("top ");
assertManualPopupExceedsTen("htop ");
assertManualPopupExceedsTen("docker ");
assertManualPopupExceedsTen("npm ");
assertManualPopupExceedsTen("pnpm ");
assertManualPopupExceedsTen("yarn ");
assertManualPopupExceedsTen("python ");
assertManualPopupExceedsTen("pip ");
assertManualPopupExceedsTen("kubectl ");
assertManualPopupExceedsTen("helm ");
assertManualPopupExceedsTen("terraform ");
assertManualPopupExceedsTen("ansible ");
assertManualPopupExceedsTen("ansible-playbook ");
assertManualPopupExceedsTen("ansible-inventory ");
assertManualPopupExceedsTen("aws ");
assertManualPopupExceedsTen("gcloud ");
assertManualPopupExceedsTen("az ");
assertManualPopupExceedsTen("psql ");
assertManualPopupExceedsTen("pg_dump ");
assertManualPopupExceedsTen("mysql ");
assertManualPopupExceedsTen("sqlite3 ");
assertManualPopupExceedsTen("redis-cli ");
assertManualPopupExceedsTen("mongosh ");
assertManualPopupExceedsTen("crontab ");
assertManualPopupExceedsTen("nginx ");
assertManualPopupExceedsTen("apachectl ");
assertManualPopupExceedsTen("apache2ctl ");
assertManualPopupExceedsTen("certbot ");
assertManualPopupExceedsTen("supervisorctl ");
assertManualPopupExceedsTen("pm2 ");
assertManualPopupExceedsTen("groups ");
assertManualPopupExceedsTen("useradd ");
assertManualPopupExceedsTen("usermod ");
assertManualPopupExceedsTen("chage ");
assertManualPopupExceedsTen("groupadd ");
assertManualPopupExceedsTen("groupmod ");
assertManualPopupExceedsTen("visudo ");
assertManualPopupExceedsTen("nslookup ");
assertManualPopupExceedsTen("tracepath ");
assertManualPopupExceedsTen("iw ");
assertManualPopupExceedsTen("nft ");
assertManualPopupExceedsTen("openssl s_client ");
assertManualPopupExceedsTen("ssh-keyscan ");
assertManualPopupExceedsTen("scp ");
assertManualPopupExceedsTen("lsof ");
assertManualPopupExceedsTen("pkill ");
assertManualPopupExceedsTen("lsblk ");
assertManualPopupExceedsTen("blkid ");
assertManualPopupExceedsTen("mount ");
assertManualPopupExceedsTen("umount ");
assertManualPopupExceedsTen("free ");
assertManualPopupExceedsTen("dmesg ");
assertManualPopupExceedsTen("zip ");
assertManualPopupExceedsTen("unzip ");
assertManualPopupExceedsTen("zcat ");
assertManualPopupExceedsTen("split ");
assertManualPopupExceedsTen("base64 ");
assertManualPopupExceedsTen("awk ");
assertManualPopupExceedsTen("findmnt ");
assertManualPopupExceedsTen("mtr ");
assertManualPopupExceedsTen("iftop ");
assertManualPopupExceedsTen("ssh-agent ");
assertManualPopupExceedsTen("hostname ");
assertManualPopupExceedsTen("dirname ");
assertManualPopupExceedsTen("basename ");
assertManualPopupExceedsTen("pgrep ");
assertManualPopupExceedsTen("uptime");
assertManualPopupExceedsTen("hostnamectl ");
assertManualPopupExceedsTen("timedatectl ");
assertManualPopupExceedsTen("systemd-cgls ");
assertManualPopupExceedsTen("systemd-cgtop ");
assertManualPopupExceedsTen("systemd-analyze ");
assertManualPopupExceedsTen("watch ");
assertManualPopupExceedsTen("nload ");
assertManualPopupExceedsTen("iostat ");
assertManualPopupExceedsTen("modinfo ");
assertManualPopupExceedsTen("vmstat ");
assertManualPopupExceedsTen("lscpu ");
assertManualPopupExceedsTen("lspci ");
assertManualPopupExceedsTen("lsusb ");
assertManualPopupExceedsTen("lsmod");
assertManualPopupExceedsTen("readlink ");
assertManualPopupExceedsTen("realpath ");
assertManualPopupExceedsTen("touch ");
assertManualPopupExceedsTen("tail ");
assertManualPopupExceedsTen("timeout ");
assertManualPopupExceedsTen("sha256sum ");
assertManualPopupExceedsTen("sha1sum ");
assertManualPopupExceedsTen("md5sum ");
assertManualPopupExceedsTen("hexdump ");
assertManualPopupExceedsTen("xxd ");
assertManualPopupExceedsTen("sysctl ");
assertManualPopupExceedsTen("update-alternatives ");
assertManualPopupExceedsTen("df ");
assertManualPopupExceedsTen("du ");

assertIncludes("ssh ", "ssh -p");
assertIncludes("ssh ", "ssh admin@10.10.10.10");
assertSource("ssh ", "ssh admin@10.10.10.10", "history");
assertFirst("ssh ", "ssh pi@192.168.178.20");
assertIncludes("ssh a", "ssh admin@10.10.10.10");
assertIncludes("ssh a", "ssh admin@server.example");
assertNotIncludes("ssh a", "ssh admin@10.10.10.10 uptime");
assertIncludes("ssh -p 2222 a", "ssh -p 2222 admin@server.example");
assertNotIncludes("ssh -p 2222 a", "ssh -p 2222 admin@server.example uptime");
assertNotIncludes("ssh ", "ssh-keygen");
assertIncludes("ssh -o ", "ssh -o StrictHostKeyChecking=accept-new");
assertSource("ssh -o ", "ssh -o StrictHostKeyChecking=accept-new", "catalog");

assertNotIncludes("journalctl -u n", "journalctl -u nginx");
assertRuntimeIncludes("journalctl -u n", "journalctl -u nginx.service");
assertIncludes("journalctl -u ", "journalctl -u backup.timer");
assertSource("journalctl -u ", "journalctl -u backup.timer", "history");
assertFirst("journalctl -u ", "journalctl -u certbot.timer");
assertSameEffectiveSuggestions("journalctl -u ", "sudo journalctl -u ", 8);
assertIncludes("journalctl -p e", "journalctl -p err");
assertIncludes("journalctl --since ", "journalctl --since today");
assertIncludes("journalctl --since ", "journalctl --since '1 hour ago'");
assertIncludes("journalctl -S ", "journalctl -S today");
assertIncludes("journalctl -n ", "journalctl -n 100");
assertIncludes("journalctl -u ssh ", "journalctl -u ssh -f");
assertNotIncludes("journalctl -u ssh ", "journalctl -u sshd");
assertIncludes("journalctl --unit=ssh ", "journalctl --unit=ssh -f");
assertFirst("systemctl --type=s", "systemctl --type=service");
assertIncludes("systemctl --state=", "systemctl --state=failed");
assertSuggestionDescription(
  "systemctl --",
  "systemctl --all",
  "auch inaktive oder sonst ausgeblendete Units anzeigen",
);
assertSuggestionDescription(
  "systemctl --",
  "systemctl --value",
  "nur Eigenschaftswerte ohne Namen ausgeben",
);
assertSuggestionDescription(
  "systemctl --",
  "systemctl --since",
  "Startzeit für zeitraumbezogene Ausgabe setzen",
);
assertFirst("systemctl list-", "systemctl list-units");
assertBefore(
  "systemctl list-",
  "systemctl list-unit-files",
  "systemctl list-jobs",
);
assertBefore(
  "systemctl re",
  "systemctl reload-or-restart <unit>",
  "systemctl reset-failed <unit>",
);
assertIncludes(
  "systemctl list-units --state ",
  "systemctl list-units --state running",
);
assertIncludes("systemctl status nginx ", "systemctl status nginx --no-pager");
assertIncludes(
  "systemctl restart nginx ",
  "systemctl restart nginx --no-block",
);
assertFirst("journalctl -o ", "journalctl -o short");

assertIncludes("git checkout ", "git checkout main");
assertIncludes("git switch ", "git switch develop");
assertSource("git checkout ", "git checkout main", "catalog");
assertFirst("git checkout f", "git checkout feature/login");
assertIncludes("git checkout ", "git checkout feature/login");
assertSource("git checkout ", "git checkout feature/login", "history");
assertNotIncludes("git checkout f", "git checkout feature/login -- README.md");
assertIncludes("git switch ", "git switch release/v2");
assertSameEffectiveSuggestions("git", "sudo git", 12);
assertSameEffectiveSuggestions("git st", "sudo git st", 10);
assertFirstSources("git", "catalog", 10);
assertFirstSources("sudo git", "catalog", 10);
assertFirst("git", "git status");
assertFirst("sudo git", "sudo git status");
assertStartsWithSequence("git", [
  "git status",
  "git add <file>",
  "git add -A",
  "git commit",
  "git checkout <branch>",
  "git switch <branch>",
  "git pull",
  "git push",
  "git fetch",
  "git clone <repo>",
  "git init",
]);
assertStartsWithSequence("sudo git", [
  "sudo git status",
  "sudo git add <file>",
  "sudo git add -A",
  "sudo git commit",
  "sudo git checkout <branch>",
  "sudo git switch <branch>",
  "sudo git pull",
  "sudo git push",
  "sudo git fetch",
  "sudo git clone <repo>",
  "sudo git init",
]);
assertStartsWithSequence("git st", [
  "git status",
  "git status --short",
  "git status --branch",
  "git status --porcelain",
  "git status --ignored",
]);
assertStartsWithSequence("sudo git st", [
  "sudo git status",
  "sudo git status --short",
  "sudo git status --branch",
  "sudo git status --porcelain",
  "sudo git status --ignored",
]);
[
  "git status",
  "git add <file>",
  "git add -A",
  "git commit -m <message>",
  "git checkout <branch>",
  "git switch <branch>",
  "git pull",
  "git push",
  "git fetch",
  "git clone <repo>",
  "git init",
].forEach((suggestion) => assertIncludes("git", suggestion));
assertIncludes("git i", "git init");
assertIncludes("git m", "git mv <source> <destination>");
assertIncludes("git re", "git restore <path>");
assertIncludes("git re", "git revert <commit>");
assertIncludes("git sh", "git show <object>");
assertIncludes("git ch", "git cherry-pick <commit>");
assertIncludes("git gr", "git grep <pattern>");
assertIncludes("git ta", "git tag");
assertIncludes("git status --", "git status --short");
assertIncludes("git status --", "git status --branch");
assertIncludes("git --", "git --help");
assertIncludes("git --", "git --no-pager");
assertIncludes("git --", "git --git-dir");
assertIncludes("git -", "git -C");
assertIncludes("git -", "git -c");
assertIncludes("git log --", "git log --oneline");
assertIncludes("git diff --", "git diff --staged");
assertIncludes("git branch --", "git branch --merged");
assertIncludes("git stash ", "git stash pop");
assertIncludes("git remote ", "git remote add origin <url>");
assertMinCount("git", 55);
assertSameEffectiveSuggestions("git work", "sudo git work", 8);
assertSameEffectiveSuggestions("git config", "sudo git config", 8);
assertSameEffectiveSuggestions("git submodule", "sudo git submodule", 8);
assertIncludes("git work", "git worktree list");
assertIncludes("git work", "git worktree add <path> <branch>");
assertIncludes("git config", "git config --list");
assertIncludes("git config", "git config --global user.name");
assertIncludes("git clean", "git clean -n");
assertIncludes("git clean", "git clean -i");
assertNotIncludes("git clean", "git clean -fd");
assertIncludes("git submodule", "git submodule status");
assertIncludes("git submodule", "git submodule update --init --recursive");
assertIncludes("git bla", "git blame <file>");
assertIncludes("git describe", "git describe --tags");
assertIncludes("git ls-", "git ls-files");
assertIncludes("git ls-", "git ls-remote <repo>");
assertIncludes("git rev-", "git rev-parse --show-toplevel");
assertSuggestionDescription(
  "git work",
  "git worktree add <path> <branch>",
  "neuen Arbeitsbaum für Branch oder Commit anlegen",
);
assertSuggestionDescription(
  "git config",
  "git config --list",
  "wirksame Git-Konfiguration auflisten",
);
assertSuggestionDescription(
  "git clean",
  "git clean -n",
  "nur anzeigen, was entfernt würde",
);

assertSuggestionDescription("git --", "git --no-pager", "Pager deaktivieren");
assertSuggestionDescription(
  "git -",
  "git -C",
  "Befehl in anderem Pfad ausführen",
);

assertSuggestionDescription(
  "service ",
  "service nginx restart",
  "Dienst neu starten",
);
assertSuggestionDescription(
  "sudo service ",
  "sudo service nginx restart",
  "Dienst neu starten",
);
assertSuggestionDescription(
  "docker logs ",
  "docker logs nginx -f",
  "Logs live verfolgen",
);
assertSuggestionDescription(
  "docker logs ",
  "docker logs --tail 100 nginx",
  "Anzahl der letzten Logzeilen begrenzen",
);
assertSuggestionDescription(
  "docker compose logs ",
  "docker compose logs payments -f",
  "Logs live verfolgen",
);
assertSuggestionDescription(
  "docker compose logs ",
  "docker compose logs --follow",
  "Logs live verfolgen",
);

assertIncludes("docker logs ", "docker logs nginx");
assertStartsWithSequence("docker ", [
  "docker ps",
  "docker logs <container>",
  "docker exec <container> <command>",
  "docker images",
  "docker pull <image>",
  "docker run <image>",
  "docker build <path>",
]);
assertStartsWithSequence("docker compose ", [
  "docker compose up",
  "docker compose up -d",
  "docker compose down",
  "docker compose ps",
  "docker compose logs",
]);
assertMinCount("docker ", 100);
assertCountForOptions("docker ", { mode: "ghost" }, 16);
assertCountForOptions("docker ", { limit: 5, mode: "popup" }, 5);
assertIncludes("docker logs ", "docker logs certbot-renewal");
assertSource("docker logs ", "docker logs certbot-renewal", "history");
assertIncludes("docker compose logs ", "docker compose logs api");
assertIncludes("docker compose logs ", "docker compose logs payments");
assertSource("docker compose logs ", "docker compose logs payments", "history");
assertFirst("docker compose logs ", "docker compose logs payments");
assertNotIncludes("docker compose logs ", "docker compose logs payments -f");
assertIncludes("docker compose exec ", "docker compose exec app");
assertIncludes("docker compose exec ", "docker compose exec scheduler");
assertSource(
  "docker compose exec ",
  "docker compose exec scheduler",
  "history",
);
assertNotIncludes("docker compose exec ", "docker compose exec scheduler sh");
assertIncludes("docker compose exec app ", "docker compose exec app bash");
assertIncludes("docker compose logs api ", "docker compose logs api -f");
assertIncludes("docker exec nginx ", "docker exec nginx sh");
assertIncludes("docker run ", "docker run nginx:latest");
assertIncludes("docker run -p ", "docker run -p 8080:80");
assertIncludes("docker run --name ", "docker run --name nginx");
assertIncludes("docker run --restart ", "docker run --restart unless-stopped");
assertIncludes("docker run -v ", "docker run -v $PWD:/app");
assertIncludes("docker build -t ", "docker build -t myapp:latest");
assertIncludes("docker pull ", "docker pull nginx:latest");
assertIncludes("docker run -it ", "docker run -it nginx:latest");

assertIncludes("git pull ", "git pull origin main");
assertIncludes("git push ", "git push origin main");
assertIncludes("git push origin ", "git push origin main");
assertIncludes("git push origin ", "git push origin feature/login");
assertSource("git push origin ", "git push origin feature/login", "history");
assertNotIncludes("git push origin ", "git push origin origin/main");
assertIncludes("git branch -d ", "git branch -d old/cleanup");
assertNotIncludes("git branch -d ", "git branch -d origin/main");
assertIncludes("git remote ", "git remote add origin <url>");
assertIncludes("git reset --", "git reset --soft");
assertNotIncludes("git reset --", "git reset --hard");

assertIncludes("apt install d", "apt install docker.io");
assertIncludes("sudo apt install d", "sudo apt install docker.io");
assertIncludes("sudo apt install ", "sudo apt install nginx");
assertIncludes("sudo apt install ", "sudo apt install wireguard-tools");
assertSource(
  "sudo apt install ",
  "sudo apt install wireguard-tools",
  "history",
);
assertFirst("sudo apt install ", "sudo apt install wireguard-tools");
assertIncludes("apt remove ", "apt remove nginx");
assertIncludes("apt purge ", "apt purge nginx");
assertIncludes("apt-get remove ", "apt-get remove nginx");
assertIncludes("apt-cache policy d", "apt-cache policy docker.io");
assertIncludes("apt-cache policy ", "apt-cache policy termix-agent");
assertSource("apt-cache policy ", "apt-cache policy termix-agent", "history");
assertSuggestionDescription(
  "apt-cache ",
  "apt-cache --names-only",
  "nur Paketnamen durchsuchen",
);
assertSuggestionDescription(
  "apt-get ",
  "apt-get --simulate",
  "Aktion nur simulieren",
);
assertIncludes("dpkg -s n", "dpkg -s nginx");
assertIncludes("dpkg -s ", "dpkg -s raspberrypi-kernel");
assertSource("dpkg -s ", "dpkg -s raspberrypi-kernel", "history");
assertIncludes("dpkg -L ", "dpkg -L nginx");
assertMinCount("dpkg ", 20);
assertIncludes("dpkg --", "dpkg --contents");
assertIncludes("dpkg --", "dpkg --info");
assertIncludes("dpkg --", "dpkg --audit");
assertSuggestionDescription(
  "dpkg --",
  "dpkg --contents",
  "Inhalt eines .deb-Pakets anzeigen",
);

assertMinCount("npm ", 30);
assertStartsWithSequence("npm ", [
  "npm install",
  "npm install <package>",
  "npm ci",
  "npm run dev",
  "npm run build",
]);
assertStartsWithSequence("npm run ", [
  "npm run dev",
  "npm run build",
  "npm run start",
]);
assertIncludes("npm ", "npm audit");
assertIncludes("npm ", "npm list --depth=0");
assertSuggestionDescription(
  "npm ",
  "npm run dev",
  "Entwicklungs-Skript starten",
);
assertSuggestionDescription(
  "npm ",
  "npm ci",
  "Dependencies exakt aus package-lock installieren",
);

assertMinCount("pnpm ", 24);
assertStartsWithSequence("pnpm ", [
  "pnpm install",
  "pnpm add <package>",
  "pnpm run dev",
  "pnpm run build",
]);
assertIncludes("pnpm ", "pnpm add -D <package>");
assertIncludes("pnpm ", "pnpm dlx <package>");
assertSuggestionDescription(
  "pnpm ",
  "pnpm add -D <package>",
  "Paket als Dev-Dependency hinzufügen",
);

assertMinCount("yarn ", 20);
assertStartsWithSequence("yarn ", [
  "yarn install",
  "yarn add <package>",
  "yarn run <script>",
  "yarn dev",
]);
assertIncludes("yarn ", "yarn --immutable");
assertSuggestionDescription(
  "yarn ",
  "yarn --immutable",
  "Yarn-Install ohne Lockfile-Änderung erzwingen",
);

assertMinCount("node ", 12);
assertStartsWithSequence("node ", [
  "node server.js",
  "node --watch",
  "node --test",
  "node -e",
]);
assertIncludes("node ", "node --inspect-brk");
assertSuggestionDescription(
  "node ",
  "node --watch",
  "Skript bei Dateiänderungen neu starten",
);

assertMinCount("python ", 18);
assertMinCount("python3 ", 18);
assertStartsWithSequence("python ", [
  "python -m venv .venv",
  "python -m pip install -r requirements.txt",
  "python -m pip list",
]);
assertStartsWithSequence("python3 ", [
  "python3 -m venv .venv",
  "python3 -m pip install -r requirements.txt",
  "python3 -m pip list",
]);
assertSuggestionDescription(
  "python ",
  "python -m venv .venv",
  "virtuelle Umgebung erstellen",
);
assertSuggestionDescription(
  "python3 ",
  "python3 -m pip install -r requirements.txt",
  "Requirements-Datei installieren",
);

assertMinCount("pip ", 20);
assertMinCount("pip3 ", 20);
assertStartsWithSequence("pip ", [
  "pip install <package>",
  "pip install -r requirements.txt",
  "pip install --upgrade <package>",
]);
assertStartsWithSequence("pip3 ", [
  "pip3 install <package>",
  "pip3 install -r requirements.txt",
  "pip3 install --upgrade <package>",
]);
assertSuggestionDescription(
  "pip ",
  "pip install -r requirements.txt",
  "Requirements-Datei installieren",
);
assertSuggestionDescription(
  "pip3 ",
  "pip3 freeze > requirements.txt",
  "Requirements-Datei erzeugen",
);

assertMinCount("make ", 16);
assertStartsWithSequence("make ", [
  "make build",
  "make test",
  "make install",
  "make clean",
]);
assertIncludes("make ", "make -j");
assertSuggestionDescription("make ", "make -j", "parallele Jobs setzen");

assertMinCount("kubectl ", 70);
assertMinCount("kubectl get ", 18);
assertStartsWithSequence("kubectl ", [
  "kubectl get pods",
  "kubectl get pods -A",
  "kubectl get services",
  "kubectl get deployments",
  "kubectl get namespaces",
]);
assertStartsWithSequence("kubectl get ", [
  "kubectl get pods",
  "kubectl get pods -A",
  "kubectl get services",
  "kubectl get deployments",
]);
assertStartsWithSequence("kubectl logs ", [
  "kubectl logs deployment/<name>",
  "kubectl logs -f <pod>",
  "kubectl logs --follow",
]);
assertStartsWithSequence("kubectl rollout ", [
  "kubectl rollout status deployment/<name>",
  "kubectl rollout restart deployment/<name>",
]);
assertIncludes("kubectl ", "kubectl apply -f <file>");
assertIncludes("kubectl ", "kubectl config get-contexts");
assertSuggestionDescription(
  "kubectl ",
  "kubectl get pods -A",
  "Pods in allen Namespaces anzeigen",
);
assertSuggestionDescription(
  "kubectl logs ",
  "kubectl logs -f deployment/app",
  "Logs live verfolgen",
);
assertSuggestionDescription(
  "kubectl rollout ",
  "kubectl rollout status deployment/<name>",
  "Rollout-Fortschritt beobachten",
);

assertMinCount("helm ", 70);
assertStartsWithSequence("helm ", [
  "helm list",
  "helm status <release>",
  "helm upgrade --install <release> <chart>",
  "helm upgrade --install",
  "helm install <release> <chart>",
]);
assertStartsWithSequence("helm list ", [
  "helm list -A",
  "helm list --all-namespaces",
  "helm list -n",
]);
assertStartsWithSequence("helm upgrade ", [
  "helm upgrade --install <release> <chart>",
  "helm upgrade --install",
  "helm upgrade --install app ./chart -n prod",
]);
assertIncludes("helm ", "helm repo add <name> <url>");
assertIncludes("helm ", "helm dependency update");
assertSuggestionDescription(
  "helm list ",
  "helm list -A",
  "Releases in allen Namespaces auflisten",
);
assertSuggestionDescription(
  "helm upgrade ",
  "helm upgrade --install app ./chart -n prod",
  "Release aktualisieren oder installieren",
);

assertMinCount("terraform ", 50);
assertStartsWithSequence("terraform ", [
  "terraform init",
  "terraform plan",
  "terraform plan -out",
  "terraform plan -out tfplan",
  "terraform validate",
]);
assertStartsWithSequence("terraform workspace ", [
  "terraform workspace list",
  "terraform workspace show",
  "terraform workspace select <name>",
]);
assertIncludes("terraform ", "terraform fmt -check");
assertIncludes("terraform ", "terraform state list");
assertNotIncludes("terraform ", "terraform destroy");
assertSuggestionDescription(
  "terraform ",
  "terraform plan -out tfplan",
  "Plan in tfplan-Datei speichern",
);
assertSuggestionDescription(
  "terraform workspace ",
  "terraform workspace list",
  "Workspaces auflisten",
);

assertMinCount("ansible ", 20);
assertStartsWithSequence("ansible ", [
  "ansible all -m ping",
  "ansible all --list-hosts",
  "ansible -i",
  "ansible web -a uptime",
]);
assertIncludes("ansible ", "ansible --check");
assertIncludes("ansible ", "ansible --diff");
assertSuggestionDescription(
  "ansible ",
  "ansible all -m ping",
  "Erreichbarkeit aller Hosts testen",
);
assertSuggestionDescription(
  "ansible ",
  "ansible --check",
  "Dry-Run ohne Änderungen ausführen",
);

assertMinCount("ansible-playbook ", 28);
assertStartsWithSequence("ansible-playbook ", [
  "ansible-playbook site.yml --check",
  "ansible-playbook site.yml --diff",
  "ansible-playbook site.yml --syntax-check",
  "ansible-playbook site.yml",
]);
assertIncludes("ansible-playbook ", "ansible-playbook --list-tasks");
assertIncludes("ansible-playbook ", "ansible-playbook --limit");
assertSuggestionDescription(
  "ansible-playbook ",
  "ansible-playbook site.yml --check",
  "Playbook als Dry-Run prüfen",
);
assertSuggestionDescription(
  "ansible-playbook ",
  "ansible-playbook --list-tasks",
  "Tasks anzeigen, ohne sie auszuführen",
);

assertMinCount("ansible-inventory ", 12);
assertStartsWithSequence("ansible-inventory ", [
  "ansible-inventory --list",
  "ansible-inventory --graph",
  "ansible-inventory -i",
  "ansible-inventory --host",
]);
assertIncludes("ansible-inventory ", "ansible-inventory --yaml --list");
assertSuggestionDescription(
  "ansible-inventory ",
  "ansible-inventory --list",
  "Inventory als JSON-Struktur ausgeben",
);
assertSuggestionDescription(
  "ansible-inventory ",
  "ansible-inventory --graph",
  "Inventory-Gruppen als Baum anzeigen",
);

assertMinCount("aws ", 50);
assertStartsWithSequence("aws ", [
  "aws sts get-caller-identity",
  "aws configure list",
  "aws s3 ls",
]);
assertIncludes("aws ", "aws ec2 describe-instances");
assertIncludes("aws ", "aws eks update-kubeconfig --name <cluster>");
assertIncludes("aws logs ", "aws logs tail <group> --follow");
assertSuggestionDescription(
  "aws ",
  "aws sts get-caller-identity",
  "aktiven AWS-Account und Benutzer anzeigen",
);
assertSuggestionDescription(
  "aws eks ",
  "aws eks update-kubeconfig --name <cluster>",
  "Kubeconfig für EKS-Cluster aktualisieren",
);
assertSuggestionDescription(
  "aws logs ",
  "aws logs tail /aws/lambda/my-function --follow",
  "Logs live verfolgen",
);

assertMinCount("gcloud ", 40);
assertStartsWithSequence("gcloud ", [
  "gcloud auth list",
  "gcloud config list",
  "gcloud projects list",
  "gcloud compute instances list",
]);
assertIncludes(
  "gcloud ",
  "gcloud container clusters get-credentials <cluster>",
);
assertIncludes("gcloud logging ", "gcloud logging tail <filter>");
assertSuggestionDescription(
  "gcloud ",
  "gcloud compute instances list",
  "Compute-Instanzen auflisten",
);
assertSuggestionDescription(
  "gcloud container ",
  "gcloud container clusters get-credentials cluster",
  "Kubeconfig für GKE-Cluster aktualisieren",
);
assertSuggestionDescription(
  "gcloud logging ",
  "gcloud logging read 'severity>=ERROR' --limit 50",
  "Fehlerlogs mit Limit lesen",
);

assertMinCount("az ", 40);
assertStartsWithSequence("az ", [
  "az account show",
  "az account list",
  "az account list -o table",
  "az account list --query",
  "az group list",
]);
assertIncludes(
  "az ",
  "az aks get-credentials --resource-group <group> --name <cluster>",
);
assertIncludes(
  "az ",
  "az webapp log tail --name <app> --resource-group <group>",
);
assertSuggestionDescription(
  "az account ",
  "az account list -o table",
  "Azure-Subscriptions als Tabelle auflisten",
);
assertSuggestionDescription(
  "az aks ",
  "az aks get-credentials --resource-group <group> --name <cluster>",
  "Kubeconfig für AKS-Cluster aktualisieren",
);
assertSuggestionDescription(
  "az webapp ",
  "az webapp log tail --name <app> --resource-group <group>",
  "Web-App-Logs live verfolgen",
);

assertMinCount("psql ", 28);
assertStartsWithSequence("psql ", [
  "psql -h",
  "psql -U",
  "psql -d",
  "psql -c",
  "psql -f",
  "psql -l",
  "psql \\dt",
]);
assertSuggestionDescription("psql ", "psql \\dt", "Tabellen auflisten");
assertSuggestionDescription(
  "psql ",
  "psql -d app -c '\\dt'",
  "Tabellen in Datenbank app auflisten",
);

assertMinCount("pg_dump ", 18);
assertStartsWithSequence("pg_dump ", [
  "pg_dump -h",
  "pg_dump -U",
  "pg_dump -d",
  "pg_dump -f",
  "pg_dump -F",
  "pg_dump -Fc",
]);
assertSuggestionDescription(
  "pg_dump ",
  "pg_dump -Fc",
  "Custom-Format-Dump erzeugen",
);
assertSuggestionDescription(
  "pg_dump ",
  "pg_dump --schema-only",
  "nur Schema sichern",
);

assertMinCount("pg_restore ", 18);
assertStartsWithSequence("pg_restore ", [
  "pg_restore -l",
  "pg_restore -d",
  "pg_restore -j",
  "pg_restore --schema-only",
]);
assertSuggestionDescription(
  "pg_restore ",
  "pg_restore -l app.dump",
  "Inhaltsverzeichnis des Dumps anzeigen",
);

assertMinCount("mysql ", 18);
assertMinCount("mariadb ", 18);
assertStartsWithSequence("mysql ", [
  "mysql -h",
  "mysql -u",
  "mysql -P",
  "mysql -p",
  "mysql -D",
]);
assertStartsWithSequence("mariadb ", [
  "mariadb -h",
  "mariadb -u",
  "mariadb -P",
  "mariadb -p",
]);
assertSuggestionDescription(
  "mysql ",
  "mysql -e 'SHOW DATABASES;'",
  "Datenbanken auflisten",
);
assertSuggestionDescription(
  "mariadb ",
  "mariadb -u root -p",
  "als root mit Passwortabfrage verbinden",
);

assertMinCount("mysqldump ", 18);
assertStartsWithSequence("mysqldump ", [
  "mysqldump --single-transaction",
  "mysqldump --routines",
  "mysqldump --triggers",
  "mysqldump --events",
]);
assertSuggestionDescription(
  "mysqldump ",
  "mysqldump --single-transaction",
  "konsistenten InnoDB-Dump ohne Lock erzeugen",
);

assertMinCount("sqlite3 ", 17);
assertStartsWithSequence("sqlite3 ", [
  "sqlite3 app.db",
  "sqlite3 .tables",
  "sqlite3 .schema",
  "sqlite3 .dump",
]);
assertSuggestionDescription(
  "sqlite3 ",
  "sqlite3 app.db '.tables'",
  "Tabellen in app.db auflisten",
);
assertSuggestionDescription(
  "sqlite3 ",
  "sqlite3 app.db 'select count(*) from users;'",
  "Anzahl Datensätze in users zählen",
);

assertMinCount("redis-cli ", 17);
assertStartsWithSequence("redis-cli ", [
  "redis-cli ping",
  "redis-cli info",
  "redis-cli --scan",
  "redis-cli dbsize",
]);
assertSuggestionDescription(
  "redis-cli ",
  "redis-cli --scan",
  "Keys per SCAN iterieren",
);
assertSuggestionDescription(
  "redis-cli ",
  "redis-cli -h localhost -p 6379",
  "zu lokalem Redis auf Port 6379 verbinden",
);

assertMinCount("mongosh ", 15);
assertStartsWithSequence("mongosh ", [
  "mongosh mongodb://localhost:27017/app",
  "mongosh --eval",
  "mongosh --host",
  "mongosh --port",
]);
assertSuggestionDescription(
  "mongosh ",
  "mongosh --eval 'db.runCommand({ ping: 1 })'",
  "MongoDB-Ping per JavaScript ausführen",
);

assertMinCount("crontab ", 12);
assertStartsWithSequence("crontab ", [
  "crontab -l",
  "crontab -e",
  "crontab -u www-data -l",
  "crontab -u root -e",
]);
assertSuggestionDescription(
  "crontab ",
  "crontab -T crontab.backup",
  "Backup-Datei vor Installation prüfen",
);
assertSuggestionDescription(
  "crontab ",
  "crontab -",
  "Crontab aus Standardeingabe installieren",
);

assertMinCount("nginx ", 16);
assertStartsWithSequence("nginx ", [
  "nginx -t",
  "nginx -T",
  "nginx -s reload",
  "nginx -s reopen",
  "nginx -q -t",
]);
assertSuggestionDescription(
  "nginx ",
  "nginx -s reload",
  "Nginx-Konfiguration neu laden",
);
assertSuggestionDescription(
  "nginx ",
  'nginx -g "daemon off;"',
  "Nginx im Vordergrund starten",
);

assertMinCount("apachectl ", 12);
assertStartsWithSequence("apachectl ", [
  "apachectl configtest",
  "apachectl -S",
  "apachectl -M",
  "apachectl status",
]);
assertSuggestionDescription(
  "apachectl ",
  "apachectl -S",
  "VirtualHost-Konfiguration anzeigen",
);
assertMinCount("apache2ctl ", 12);
assertStartsWithSequence("apache2ctl ", [
  "apache2ctl configtest",
  "apache2ctl -S",
  "apache2ctl -M",
  "apache2ctl status",
]);
assertSuggestionDescription(
  "apache2ctl ",
  "apache2ctl -S",
  "VirtualHost-Konfiguration anzeigen",
);

assertMinCount("certbot ", 16);
assertStartsWithSequence("certbot ", [
  "certbot certificates",
  "certbot renew --dry-run",
  "certbot renew",
  "certbot plugins",
]);
assertSuggestionDescription(
  "certbot ",
  "certbot renew --dry-run",
  "Zertifikatserneuerung testen",
);
assertSuggestionDescription(
  "certbot ",
  "certbot certonly --nginx -d",
  "Zertifikat per Nginx für Domain beziehen",
);

assertMinCount("supervisorctl ", 13);
assertStartsWithSequence("supervisorctl ", [
  "supervisorctl status",
  "supervisorctl tail",
  "supervisorctl tail -f",
  "supervisorctl restart",
]);
assertSuggestionDescription(
  "supervisorctl ",
  "supervisorctl tail -f app",
  "Programmlog live verfolgen",
);

assertMinCount("pm2 ", 16);
assertStartsWithSequence("pm2 ", [
  "pm2 list",
  "pm2 status",
  "pm2 logs",
  "pm2 logs --lines",
]);
assertIncludes("pm2 ", "pm2 start app.js --name app");
assertSuggestionDescription(
  "pm2 ",
  "pm2 start app.js --name",
  "app.js mit Namen starten",
);

assertMinCount("nslookup ", 16);
assertStartsWithSequence("nslookup ", [
  "nslookup example.com",
  "nslookup example.com 1.1.1.1",
  "nslookup -type=MX example.com",
  "nslookup -type=TXT example.com",
]);
assertSuggestionDescription(
  "nslookup ",
  "nslookup -type=TXT example.com",
  "TXT-Records abfragen",
);
assertSuggestionDescription(
  "nslookup ",
  "nslookup -type=SOA",
  "SOA-Record abfragen",
);

assertMinCount("tracepath ", 12);
assertStartsWithSequence("tracepath ", [
  "tracepath example.com",
  "tracepath -n 8.8.8.8",
  "tracepath -b example.com",
  "tracepath -m 20 example.com",
]);
assertSuggestionDescription(
  "tracepath ",
  "tracepath -l 1200 example.com",
  "Paketlänge auf 1200 Bytes setzen",
);

assertMinCount("mtr ", 24);
assertStartsWithSequence("mtr ", [
  "mtr example.com",
  "mtr -rw -c 100 example.com",
  "mtr -T -P 443 example.com",
]);
assertSuggestionDescription(
  "mtr ",
  "mtr --json example.com",
  "MTR-Ergebnis als JSON ausgeben",
);

assertMinCount("iw ", 13);
assertStartsWithSequence("iw ", [
  "iw dev",
  "iw dev wlan0 link",
  "iw dev wlan0 scan",
  "iw dev wlan0 station dump",
]);
assertSuggestionDescription(
  "iw ",
  "iw dev wlan0 set power_save off",
  "WLAN-Energiesparen deaktivieren",
);

assertMinCount("nft ", 18);
assertStartsWithSequence("nft ", [
  "nft list ruleset",
  "nft list tables",
  "nft list table inet filter",
  "nft list counters",
]);
assertNotIncludes("nft ", "nft flush ruleset");
assertSuggestionDescription(
  "nft ",
  "nft --check -f rules.nft",
  "Regeldatei validieren, ohne sie anzuwenden",
);

assertMinCount("openssl s_client ", 16);
assertIncludes(
  "openssl s_client ",
  "openssl s_client -brief -connect example.com:443",
);
assertIncludes(
  "openssl s_client ",
  "openssl s_client -verify_return_error -connect example.com:443",
);
assertSuggestionDescription(
  "openssl s_client ",
  "openssl s_client -connect example.com:443 -servername example.com",
  "TLS-Verbindung mit SNI testen",
);

assertMinCount("ssh-keyscan ", 13);
assertStartsWithSequence("ssh-keyscan ", [
  "ssh-keyscan github.com",
  "ssh-keyscan -t ed25519,rsa github.com",
  "ssh-keyscan -p 2222 host",
]);
assertSuggestionDescription(
  "ssh-keyscan ",
  "ssh-keyscan -H host >> ~/.ssh/known_hosts",
  "gehashten Host-Key an known_hosts anhängen",
);

assertMinCount("scp ", 18);
assertIncludes("scp ", "scp -i ~/.ssh/id_ed25519 file.txt user@host:/tmp/");
assertIncludes("scp ", "scp -J bastion file.txt user@host:/tmp/");
assertSuggestionDescription(
  "scp ",
  "scp -P 2222 file.txt user@host:/tmp/",
  "Datei über SSH-Port 2222 kopieren",
);

assertMinCount("lsof ", 18);
assertStartsWithSequence("lsof ", [
  "lsof -nP -iTCP -sTCP:LISTEN",
  "lsof -i :80",
  "lsof -iTCP -sTCP:LISTEN",
]);
assertIncludes("lsof ", "lsof -i");
assertSuggestionDescription(
  "lsof ",
  "lsof +D /var/log",
  "offene Dateien unter /var/log suchen",
);

assertMinCount("pkill ", 18);
assertStartsWithSequence("pkill ", [
  "pkill -TERM nginx",
  "pkill -HUP nginx",
  "pkill -f 'python app.py'",
]);
assertSuggestionDescription(
  "pkill ",
  "pkill -e -TERM nginx",
  "beendete nginx-Prozesse ausgeben",
);

assertIncludes("docker ps -", "docker ps -a");
assertUnique("docker ps -");

assertIncludes("sudo tcpdump -i ", "sudo tcpdump -i any");
assertIncludes("resolvectl query g", "resolvectl query github.com");
assertIncludes("resolvectl query ", "resolvectl query pihole.lan");
assertSource("resolvectl query ", "resolvectl query pihole.lan", "history");
assertIncludes(
  "openssl s_client -connect g",
  "openssl s_client -connect github.com:443",
);
assertIncludes(
  "openssl s_client -connect ",
  "openssl s_client -connect mail.example.com:993",
);
assertSource(
  "openssl s_client -connect ",
  "openssl s_client -connect mail.example.com:993",
  "history",
);
assertFirst(
  "openssl s_client -connect ",
  "openssl s_client -connect mail.example.com:993",
);
assertNotIncludes(
  "openssl s_client -connect ",
  "openssl s_client -connect mail.example.com:993 -servername mail.example.com",
);
assertIncludes(
  "openssl s_client -connect mail.example.com:993 ",
  "openssl s_client -connect mail.example.com:993 -servername mail.example.com",
);
assertIncludes(
  "openssl s_client -connect mail.example.com:993 ",
  "openssl s_client -connect mail.example.com:993 -showcerts",
);
assertSuggestionDescription(
  "openssl s_client -connect mail.example.com:993 ",
  "openssl s_client -connect mail.example.com:993 -showcerts",
  "Zertifikatskette anzeigen",
);
assertSuggestionDescription(
  "openssl s_client -connect mail.example.com:993 ",
  "openssl s_client -connect mail.example.com:993 -servername mail.example.com",
  "SNI-Hostname setzen",
);
assertIncludes("chmod ", "chmod +x");
assertIncludes("chmod ", "chmod 755");
assertIncludes("chown ", "chown www-data:www-data");
assertIncludes("find . -type ", "find . -type f");
assertMinCount("find . -", 20);
assertFirst("find . -", "find . -type");
assertIncludes("find . -", "find . -maxdepth");
assertNotIncludes("find . -", "find . -delete");
assertIncludes("find . -name ", "find . -name '*.log'");
assertIncludes("find . -mtime ", "find . -mtime +7");
assertIncludes("find . -size ", "find . -size +100M");
assertIncludes("find . -maxdepth ", "find . -maxdepth 2");
assertIncludes("find . -perm ", "find . -perm 755");
assertIncludes("find . -user ", "find . -user www-data");
assertIncludes("ssh-keygen -t ", "ssh-keygen -t ed25519");
assertIncludes("ssh-keygen -b ", "ssh-keygen -b 4096");
assertSuggestionDescription(
  "ssh-keygen ",
  "ssh-keygen -F",
  "Host in known_hosts suchen",
);
assertSuggestionDescription(
  "ssh-keygen ",
  "ssh-keygen -lf ~/.ssh/id_ed25519.pub",
  "Fingerprint einer Public-Key-Datei anzeigen",
);
assertMinCount("ssh-copy-id ", 12);
assertIncludes("ssh-copy-id ", "ssh-copy-id -s");
assertIncludes("ssh-copy-id ", "ssh-copy-id --help");
assertSuggestionDescription(
  "ssh-copy-id ",
  "ssh-copy-id -s",
  "sftp statt Shell-Kommandos verwenden",
);
assertSuggestionDescription(
  "ssh-copy-id ",
  "ssh-copy-id user@host",
  "Public Key für diesen Login installieren",
);
assertMinCount("ssh-agent ", 16);
assertStartsWithSequence("ssh-agent ", [
  "ssh-agent -s",
  "ssh-agent -c",
  "ssh-agent -k",
]);
assertSuggestionDescription(
  "ssh-agent ",
  "ssh-agent -s > agent.env",
  "Agent-Umgebung in Datei schreiben",
);
assertMinCount("sftp ", 18);
assertIncludes("sftp ", "sftp -J");
assertIncludes("sftp ", "sftp -F");
assertIncludes("sftp ", "sftp -R");
assertSuggestionDescription("sftp ", "sftp -J", "Jump-Host verwenden");
assertIncludes("jq -r ", "jq -r .[]");
assertMinCount("uptime", 13);
assertIncludes("uptime", "uptime --pretty");
assertIncludes("uptime", "uptime --version");
assertSuggestionDescription(
  "uptime",
  "uptime --pretty",
  "Laufzeit menschenlesbar anzeigen",
);
assertSuggestionDescription(
  "uptime",
  "uptime | sed 's/.*load average: //'",
  "Load-Average-Teil per sed extrahieren",
);
assertMinCount("who ", 14);
assertIncludes("who ", "who -b");
assertIncludes("who ", "who --heading");
assertSuggestionDescription(
  "who ",
  "who -b",
  "Zeit des letzten Systemstarts anzeigen",
);
assertMinCount("printenv", 6);
assertIncludes("printenv", "printenv --null");
assertSuggestionDescription(
  "printenv",
  "printenv --null",
  "Ausgabe mit NUL statt Zeilenumbruch trennen",
);
assertMinCount("awk ", 20);
assertStartsWithSequence("awk ", [
  "awk '{print $1}' file.txt",
  "awk -F ':' '{print $1}' /etc/passwd",
  "awk 'NF {print}' file.txt",
]);
assertIncludes("awk ", "awk --field-separator");
assertIncludes("awk ", "awk --lint");
assertSuggestionDescription(
  "awk ",
  "awk '{sum += $1} END {print sum}' numbers.txt",
  "erste Spalte aufsummieren",
);
assertSuggestionDescription(
  "awk ",
  "awk -v",
  "Variable vor Programmausführung setzen",
);
assertMinCount("base64 ", 17);
assertStartsWithSequence("base64 ", [
  "base64 file.bin",
  "base64 -d encoded.txt",
  "base64 -d encoded.txt > decoded.bin",
]);
assertSuggestionDescription(
  "base64 ",
  "base64 --ignore-garbage -d dirty.txt",
  "ungueltige Zeichen beim Dekodieren ignorieren",
);
assertMinCount("split ", 20);
assertStartsWithSequence("split ", [
  "split -l 1000 big.log part-",
  "split -b 100M archive.tar archive.part.",
  "split -d -a 3 file chunk-",
]);
assertSuggestionDescription(
  "split ",
  "split --filter='gzip > $FILE.gz' big.log part-",
  "Teile direkt durch gzip filtern",
);
assertMinCount("basename ", 18);
assertIncludes("basename ", "basename --multiple /etc/passwd /etc/group");
assertSuggestionDescription(
  "basename ",
  "basename /srv/app/releases/current",
  "Release-Name aus Pfad extrahieren",
);
assertMinCount("dirname ", 15);
assertIncludes("dirname ", "dirname /etc/systemd/system/ssh.service");
assertSuggestionDescription(
  "dirname ",
  "dirname -z /tmp/file | xargs -0 printf '%s\\n'",
  "NUL-Ausgabe lesbar weiterverarbeiten",
);
assertMinCount("xargs ", 14);
assertIncludes("xargs ", "xargs --no-run-if-empty");
assertIncludes("xargs ", "xargs --max-procs");
assertNotIncludes("xargs ", "xargs rm");
assertSuggestionDescription(
  "xargs ",
  "xargs -0",
  "Eingabe mit NUL-Trennung lesen",
);
assertMinCount("tee ", 12);
assertIncludes("tee ", "tee --append");
assertIncludes("tee ", "tee --output-error");
assertIncludes("tee ", "tee file.txt");
assertSuggestionDescription(
  "tee ",
  "tee -a",
  "an Dateien anhängen statt überschreiben",
);
assertSuggestionDescription(
  "tee ",
  "tee file1.log file2.log",
  "Ausgabe in mehrere Logdateien schreiben",
);
assertMinCount("env ", 12);
assertIncludes("env ", "env --ignore-environment");
assertIncludes("env ", "env --split-string");
assertSuggestionDescription(
  "env ",
  "env | grep PATH",
  "Umgebung anzeigen oder Befehl mit Umgebung starten",
);
assertMinCount("date ", 12);
assertIncludes("date ", "date --iso-8601");
assertIncludes("date ", "date +<format>");
assertMinCount("uname ", 14);
assertIncludes("uname ", "uname --kernel-release");
assertIncludes("uname ", "uname --operating-system");
assertMinCount("id ", 12);
assertIncludes("id ", "id --groups");
assertIncludes("id ", "id --zero");

assertMinCount("lsusb ", 12);
assertStartsWithSequence("lsusb ", [
  "lsusb -t",
  "lsusb -v",
  "lsusb -V",
  "lsusb -d 1d6b:",
]);
assertSuggestionDescription(
  "lsusb ",
  "lsusb -D /dev/bus/usb/001/002",
  "bestimmte USB-Geraetedatei auslesen",
);

assertMinCount("lspci ", 15);
assertStartsWithSequence("lspci ", [
  "lspci -nn",
  "lspci -k",
  "lspci -tv",
  "lspci -vv",
]);
assertSuggestionDescription(
  "lspci ",
  "lspci -s 00:1f.3",
  "nur Geraet am Slot 00:1f.3 anzeigen",
);

assertMinCount("lscpu ", 18);
assertStartsWithSequence("lscpu ", [
  "lscpu -J",
  "lscpu --extended",
  "lscpu -e=CPU,CORE,SOCKET,NODE,ONLINE",
]);
assertSuggestionDescription(
  "lscpu ",
  "lscpu -e=CPU,CORE,SOCKET,NODE,ONLINE",
  "ausgewaehlte CPU-Spalten anzeigen",
);

assertMinCount("lsmod", 12);
assertIncludes("lsmod", "lsmod | grep bluetooth");
assertIncludes("lsmod", "lsmod | column -t");
assertSuggestionDescription(
  "lsmod",
  "lsmod | wc -l",
  "Anzahl geladener Module zaehlen",
);

assertMinCount("vmstat ", 20);
assertStartsWithSequence("vmstat ", ["vmstat 1", "vmstat 1 5", "vmstat -s"]);
assertSuggestionDescription(
  "vmstat ",
  "vmstat -S M 1",
  "Speicherwerte in MiB anzeigen",
);

assertMinCount("iostat ", 24);
assertStartsWithSequence("iostat ", [
  "iostat -xz 1",
  "iostat -p ALL",
  "iostat -m 1 5",
]);
assertSuggestionDescription(
  "iostat ",
  "iostat -y 1",
  "erste Statistik seit Boot ueberspringen",
);

assertMinCount("modinfo ", 20);
assertStartsWithSequence("modinfo ", [
  "modinfo overlay",
  "modinfo -F filename overlay",
  "modinfo -p module_name",
]);
assertSuggestionDescription(
  "modinfo ",
  "modinfo --field vermagic overlay",
  "vermagic-Feld eines Moduls anzeigen",
);

assertMinCount("readlink ", 18);
assertIncludes("readlink ", "readlink -e /etc/alternatives/editor");
assertSuggestionDescription(
  "readlink ",
  "readlink -m missing/path",
  "Pfad auch mit fehlenden Bestandteilen aufloesen",
);

assertMinCount("realpath ", 20);
assertIncludes(
  "realpath ",
  "realpath --relative-base=/srv /srv/app/config.yml",
);
assertSuggestionDescription(
  "realpath ",
  "realpath --relative-to /var /var/log/syslog",
  "Pfad relativ zu /var ausgeben",
);

assertMinCount("touch ", 18);
assertIncludes("touch ", "touch -t 202606030900 release.txt");
assertSuggestionDescription(
  "touch ",
  "touch -r reference.txt target.txt",
  "Zeitstempel von Referenzdatei uebernehmen",
);

assertMinCount("tail ", 20);
assertIncludes("tail ", "tail --pid 1234 -f /var/log/app.log");
assertSuggestionDescription(
  "tail ",
  "tail --retry -F /var/log/app.log",
  "Datei beim Folgen erneut oeffnen",
);

assertMinCount("timeout ", 16);
assertIncludes("timeout ", "timeout --foreground 30s ssh host");
assertSuggestionDescription(
  "timeout ",
  "timeout --signal=TERM 10s command",
  "Signal fuer Timeout-Abbruch setzen",
);

assertMinCount("install ", 32);
assertIncludes("install ", "install -C -m 644 config.yml /etc/app/config.yml");
assertIncludes("install ", "install -b -S .bak file /etc/app/file");
assertIncludes("install --", "install --target-directory");
assertIncludes("install --", "install --compare");
assertSuggestionDescription(
  "install ",
  "install -C -m 644 config.yml /etc/app/config.yml",
  "nur kopieren, wenn Inhalt, Besitzer oder Rechte abweichen",
);
assertSuggestionDescription(
  "install --",
  "install --context",
  "SELinux- oder SMACK-Sicherheitskontext setzen",
);
assertDefaultSuggestionDescription(
  "install ",
  "install -t /usr/local/bin app helper",
  "Copy app and helper into /usr/local/bin",
);

assertSuggestionDescription(
  "cd ",
  "cd -P",
  "physische Verzeichnisstruktur ohne Symlink-Aufloesung verwenden",
);
assertSuggestionDescription(
  "dd ",
  "dd conv=noerror,sync",
  "nach Lesefehlern fortfahren und kurze Bloecke auffuellen",
);
assertSuggestionDescription(
  "nano ",
  "nano --syntax",
  "Syntax-Highlighting-Definition waehlen",
);
assertSuggestionDescription(
  "sudo ",
  "sudo --validate",
  "sudo-Anmeldedaten pruefen und erneuern",
);
assertSuggestionDescription(
  "rm ",
  "rm --one-file-system",
  "beim rekursiven Entfernen auf demselben Dateisystem bleiben",
);
assertSuggestionDescription(
  "whereis ",
  "whereis -g",
  "Namen als Glob-Muster interpretieren",
);
assertMinCount("man ", 14);
assertIncludes("man ", "man 5 crontab");
assertSuggestionDescription(
  "man ",
  "man -k ssh",
  "Handbuchseiten nach Namen und Beschreibung suchen",
);
assertDefaultSuggestionDescription(
  "man ",
  "man ls",
  "Open the manual page for ls",
);
assertMinCount("info ", 12);
assertIncludes("info ", "info '(coreutils) ls invocation'");
assertSuggestionDescription(
  "info ",
  "info --index-search=chmod coreutils",
  "zu einem Indexeintrag springen",
);
assertMinCount("locate ", 14);
assertIncludes("locate ", "locate --existing sshd_config");
assertSuggestionDescription(
  "locate ",
  "locate -r '/etc/.*\\.conf$'",
  "regulaeren Ausdruck verwenden",
);
assertMinCount("updatedb ", 10);
assertIncludes("updatedb ", "updatedb --output=/tmp/locatedb");
assertSuggestionDescription(
  "updatedb ",
  "updatedb --prunepaths='/tmp /var/tmp'",
  "ausgewaehlte Pfade beim Indizieren auslassen",
);

assertMinCount("memusage ", 28);
assertIncludes("memusage ", "memusage --png=memory.png ./app");
assertIncludes(
  "memusage ",
  "memusage --time-based --total --png=memory.png ./app",
);
assertIncludes(
  "memusage ",
  "memusage --title='Memory profile' --x-size=1200 --y-size=800 --png=memory.png ./app",
);
assertSuggestionDescription(
  "memusage ",
  "memusage -m ./app",
  "auch mmap und verwandte Allokationsaufrufe verfolgen",
);
assertSuggestionDescription(
  "memusage ",
  "memusage --title='Memory profile' --x-size=1200 --y-size=800 --png=memory.png ./app",
  "PNG-Grafik mit Titel und festen Abmessungen erzeugen",
);
assertDefaultSuggestionDescription(
  "memusage ",
  "memusage --png=memory.png ./app",
  "Write a PNG memory graph to memory.png",
);

assertMinCount("sha256sum ", 20);
assertIncludes("sha256sum ", "sha256sum --ignore-missing -c checksums.txt");
assertSuggestionDescription(
  "sha256sum ",
  "sha256sum --quiet -c checksums.txt",
  "nur fehlerhafte Pruefungen melden",
);

assertMinCount("sha1sum ", 20);
assertIncludes("sha1sum ", "sha1sum --tag file.iso");
assertSuggestionDescription(
  "sha1sum ",
  "sha1sum --status -c checksums.txt",
  "Pruefung ohne Ausgabe, nur Exit-Code",
);

assertMinCount("md5sum ", 20);
assertIncludes("md5sum ", "md5sum --ignore-missing -c checksums.txt");
assertSuggestionDescription(
  "md5sum ",
  "md5sum --binary file.iso",
  "Datei im Binaermodus pruefen",
);

assertMinCount("hexdump ", 24);
assertIncludes("hexdump ", "hexdump -C -s 512 file.bin");
assertSuggestionDescription(
  "hexdump ",
  'hexdump -e \'16/1 "%02x " "\\n"\' file.bin',
  "Bytes mit eigenem Format ausgeben",
);

assertMinCount("xxd ", 18);
assertIncludes("xxd ", "xxd -i file.bin");
assertSuggestionDescription(
  "xxd ",
  "xxd -g 1 file.bin",
  "Bytes einzeln gruppieren",
);
assertMinCount("truncate ", 12);
assertIncludes("truncate ", "truncate --reference=source.bin target.bin");
assertIncludes("truncate --", "truncate --no-create");
assertSuggestionDescription(
  "truncate --",
  "truncate --no-create",
  "fehlende Dateien nicht erstellen",
);
assertMinCount("od ", 18);
assertIncludes("od ", "od -Ax -tx1z file.bin");
assertSuggestionDescription(
  "od ",
  "od --endian=little -tx4 file.bin",
  "Byte-Reihenfolge fuer Mehrbyte-Daten waehlen",
);
assertMinCount("strings ", 18);
assertIncludes("strings ", "strings --bytes=12 binary");
assertSuggestionDescription(
  "strings ",
  "strings -t x binary",
  "Offsets in gewaehlter Basis ausgeben",
);
assertMinCount("cksum ", 20);
assertIncludes("cksum ", "cksum --algorithm=sha256 file.iso");
assertSuggestionDescription(
  "cksum ",
  "cksum --check checksums.txt",
  "Pruefsummen aus Datei pruefen",
);
assertMinCount("sum ", 8);
assertIncludes("sum ", "sum --sysv file.txt");
assertSuggestionDescription(
  "sum ",
  "sum --bsd file.txt",
  "BSD-Pruefsummenalgorithmus verwenden",
);

assertMinCount("lsblk ", 15);
assertStartsWithSequence("lsblk ", [
  "lsblk -f",
  "lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT,UUID",
  "lsblk -J",
  "lsblk -p",
]);
assertSuggestionDescription(
  "lsblk ",
  "lsblk -d -o NAME,MODEL,SIZE,ROTA",
  "nur Platten mit Modell, Größe und Rotation anzeigen",
);

assertMinCount("blkid ", 14);
assertStartsWithSequence("blkid ", [
  "blkid /dev/sda1",
  "blkid -o export /dev/sda1",
  "blkid -s UUID /dev/sda1",
  "blkid -L data",
]);
assertSuggestionDescription(
  "blkid ",
  "blkid -U <uuid>",
  "Gerät mit dieser UUID finden",
);
assertSuggestionDescription("blkid ", "blkid -c", "Cache-Datei setzen");

assertMinCount("mount ", 20);
assertStartsWithSequence("mount ", [
  "mount | column -t",
  "mount | grep /mnt",
  "mount /dev/sdb1 /mnt",
  "mount -t nfs server:/share /mnt",
]);
assertSuggestionDescription(
  "mount ",
  "mount -o remount,rw /",
  "Root-Dateisystem schreibbar remounten",
);
assertSuggestionDescription(
  "mount ",
  "mount --bind /srv/data /mnt/data",
  "Verzeichnis per Bind-Mount einhängen",
);

assertMinCount("umount ", 14);
assertStartsWithSequence("umount ", [
  "umount /mnt",
  "umount -l /mnt",
  "umount -v /mnt",
  "umount /dev/sdb1",
]);
assertNotIncludes("umount ", "umount -a");
assertSuggestionDescription(
  "umount ",
  "umount --recursive /mnt",
  "Submounts unter /mnt rekursiv aushängen",
);

assertMinCount("findmnt ", 24);
assertStartsWithSequence("findmnt ", [
  "findmnt /",
  "findmnt -t ext4",
  "findmnt -J",
]);
assertSuggestionDescription(
  "findmnt ",
  "findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS",
  "ausgewaehlte Mount-Spalten anzeigen",
);

assertMinCount("free ", 20);
assertStartsWithSequence("free ", [
  "free -h",
  "free -w -h",
  "free -m",
  "free -h -s 2",
]);
assertSuggestionDescription(
  "free ",
  "free -w -h",
  "Speicher breit und menschenlesbar anzeigen",
);

assertMinCount("dmesg ", 20);
assertStartsWithSequence("dmesg ", [
  "dmesg -T",
  "dmesg -w",
  "dmesg -T --level=err,warn",
  "dmesg -H",
]);
assertSuggestionDescription(
  "dmesg ",
  "dmesg -T --level=err,warn",
  "Fehler und Warnungen mit lesbarer Zeit anzeigen",
);

assertMinCount("sysctl ", 20);
assertStartsWithSequence("sysctl ", [
  "sysctl -a",
  "sysctl net.ipv4.ip_forward",
  "sysctl vm.swappiness",
  "sysctl -n kernel.hostname",
]);
assertSuggestionDescription(
  "sysctl ",
  "sysctl vm.swappiness",
  "Swappiness-Parameter anzeigen",
);
assertSuggestionDescription(
  "sysctl ",
  "sysctl -p /etc/sysctl.conf",
  "Parameter aus /etc/sysctl.conf laden",
);

assertMinCount("update-alternatives ", 19);
assertStartsWithSequence("update-alternatives ", [
  "update-alternatives --display editor",
  "update-alternatives --config java",
  "update-alternatives --list editor",
]);
assertSuggestionDescription(
  "update-alternatives ",
  "update-alternatives --set editor /usr/bin/vim",
  "editor auf vim setzen",
);

assertMinCount("df ", 15);
assertStartsWithSequence("df ", ["df -h", "df -hT", "df -ih"]);
assertSuggestionDescription(
  "df ",
  "df -x tmpfs -x devtmpfs",
  "temporäre Dateisysteme ausblenden",
);

assertMinCount("du ", 18);
assertStartsWithSequence("du ", [
  "du -sh *",
  "du -sh /var/log",
  "du -h --max-depth=1 /var",
]);
assertSuggestionDescription(
  "du ",
  "du -xhd1 /",
  "Root-Dateisystem auf erster Ebene auswerten",
);

assertIncludes("ufw allow ", "ufw allow 22/tcp");
assertIncludes("ufw delete allow ", "ufw delete allow 22/tcp");
assertIncludes("tar -C ", "tar -C /tmp");
assertMinCount("tar ", 25);
assertIncludes("tar --", "tar --xz");
assertIncludes("tar --", "tar --directory");
assertIncludes("tar --", "tar --one-file-system");
assertSuggestionDescription(
  "tar --",
  "tar --directory",
  "vor Aktion in Verzeichnis wechseln",
);
assertIncludes("ncdu ", "ncdu /var/log");
assertIncludes("ncdu ", "ncdu --one-file-system");
assertStartsWithSequence("ncdu ", ["ncdu /var/log", "ncdu -x"]);
assertStartsWithSequence("tmux ", [
  "tmux new -s <name>",
  "tmux new -s work",
  "tmux attach -t <name>",
  "tmux ls",
]);
assertStartsWithSequence("screen ", [
  "screen -S work",
  "screen -S work -X quit",
  "screen -S work -X hardcopy",
  "screen -r work",
  "screen -ls",
]);
assertMinCount("screen ", 12);
assertSuggestionDescription(
  "screen ",
  "screen -x work",
  "Sitzung work gemeinsam anhaengen",
);
assertMinCount("nohup ", 12);
assertStartsWithSequence("nohup ", [
  "nohup ./server.sh &",
  "nohup npm start > app.log 2>&1 &",
  "nohup python app.py > app.log 2>&1 &",
  "nohup node server.js > server.log 2>&1 &",
]);
assertSuggestionDescription(
  "nohup ",
  "nohup npm start > app.log 2>&1 &",
  "npm start mit Logdatei vom Terminal loesen",
);
assertMinCount("jobs ", 12);
assertStartsWithSequence("jobs ", ["jobs -l", "jobs -p", "jobs -r", "jobs -s"]);
assertSuggestionDescription(
  "jobs ",
  "jobs -l %%",
  "aktuellen Job mit Prozess-ID anzeigen",
);
assertMinCount("fg ", 12);
assertStartsWithSequence("fg ", ["fg %1", "fg %2", "fg %3", "fg %%"]);
assertSuggestionDescription(
  "fg ",
  "fg %?python",
  "Job mit python im Kommando in den Vordergrund holen",
);
assertMinCount("bg ", 12);
assertStartsWithSequence("bg ", ["bg %1", "bg %2", "bg %3", "bg %%"]);
assertSuggestionDescription(
  "bg ",
  "bg %?python",
  "Job mit python im Kommando im Hintergrund fortsetzen",
);
assertMinCount("disown ", 12);
assertStartsWithSequence("disown ", [
  "disown %1",
  "disown %2",
  "disown %%",
  "disown %+",
]);
assertSuggestionDescription(
  "disown ",
  "disown -h %%",
  "aktuellen Job vor SIGHUP schuetzen",
);
assertMinCount("pidof ", 12);
assertStartsWithSequence("pidof ", [
  "pidof sshd",
  "pidof nginx",
  "pidof systemd",
  "pidof -s nginx",
]);
assertSuggestionDescription(
  "pidof ",
  "pidof -o %PPID sshd",
  "aufrufenden Parent-Prozess ausschliessen",
);
assertMinCount("pstree ", 12);
assertStartsWithSequence("pstree ", [
  "pstree -p",
  "pstree -u",
  "pstree -a",
  "pstree -h",
]);
assertSuggestionDescription("pstree ", "pstree -T", "Threads ausblenden");
assertMinCount("top ", 12);
assertStartsWithSequence("top ", [
  "top -u www-data",
  "top -u root",
  "top -p 1",
  "top -b -n 1",
]);
assertSuggestionDescription(
  "top ",
  "top -b -n 1 -o %CPU",
  "einmalige Batch-Ausgabe nach CPU sortieren",
);
assertMinCount("htop ", 12);
assertStartsWithSequence("htop ", [
  "htop -u root",
  "htop -u www-data",
  "htop -p 1",
  "htop -d 10",
]);
assertSuggestionDescription(
  "htop ",
  "htop -s PERCENT_CPU",
  "nach CPU-Auslastung sortieren",
);
assertIncludes("grep --include ", "grep --include '*.log'");
assertIncludes("grep -A ", "grep -A 3");
assertMinCount("rg ", 20);
assertIncludes("rg ", "rg TODO");
assertIncludes("rg -", "rg --files");
assertStartsWithSequence("rg ", ["rg TODO", "rg -n", "rg -g", "rg --files"]);
assertIncludes("rg -g ", "rg -g '*.ts' autocomplete");
assertIncludes("rg --", "rg --no-ignore");
assertIncludes("yq ", "yq '.metadata.name' file.yml");
assertIncludes("yq -", "yq -o");
assertIncludes("yq -", "yq -o json file.yml");
assertIncludes("yq --", "yq --output-format");
assertMinCount("comm ", 12);
assertIncludes("comm ", "comm -12 sorted-a.txt sorted-b.txt");
assertSuggestionDescription(
  "comm ",
  "comm --output-delimiter=',' a.txt b.txt",
  "eigenes Spaltentrennzeichen verwenden",
);
assertMinCount("join ", 14);
assertIncludes("join ", "join -t ',' users.csv groups.csv");
assertSuggestionDescription(
  "join ",
  "join --header left.tsv right.tsv",
  "erste Zeile als Kopfzeile behandeln",
);
assertMinCount("numfmt ", 14);
assertIncludes("numfmt ", "numfmt --to=iec 1048576");
assertIncludes("numfmt --", "numfmt --field");
assertSuggestionDescription(
  "numfmt --",
  "numfmt --field",
  "nur ausgewaehlte Felder umrechnen",
);
assertMinCount("shuf ", 14);
assertIncludes("shuf ", "shuf -i 1-100 -n 10");
assertSuggestionDescription(
  "shuf ",
  "shuf --random-source=/dev/urandom file.txt",
  "Zufallsbytes aus Datei lesen",
);
assertIncludes("gzip ", "gzip --stdout");
assertIncludes("gunzip ", "gunzip --list");
assertIncludes("bzip2 ", "bzip2 -k");
assertIncludes("bunzip2 ", "bunzip2 -c");
assertIncludes("xz ", "xz -T");
assertIncludes("unxz ", "unxz -k");
assertIncludes("zstd ", "zstd -T");
assertIncludes("zcat ", "zcat file.log.gz");
assertIncludes("zgrep ", "zgrep -n");
assertMinCount("zip ", 20);
assertStartsWithSequence("zip ", [
  "zip archive.zip file.txt",
  "zip -r archive.zip ./dir",
  "zip -r archive.zip ./dir -x '*.git*'",
]);
assertSuggestionDescription(
  "zip ",
  "zip -r encrypted.zip ./secrets -e",
  "verschluesseltes Archiv erstellen",
);
assertMinCount("unzip ", 20);
assertStartsWithSequence("unzip ", [
  "unzip archive.zip",
  "unzip archive.zip -d /tmp",
  "unzip -l archive.zip",
]);
assertSuggestionDescription(
  "unzip ",
  "unzip -p archive.zip file.txt",
  "Datei aus Archiv auf stdout ausgeben",
);
assertMinCount("zcat ", 16);
assertIncludes("zcat ", "zcat *.log.gz | grep -i error");
assertSuggestionDescription(
  "zcat ",
  "zcat file.log.gz | wc -l",
  "Zeilen in komprimiertem Log zaehlen",
);
assertSuggestionDescription(
  "zip ",
  "zip -r",
  "Verzeichnisse rekursiv einpacken",
);
assertSuggestionDescription("unzip ", "unzip -l", "Archivinhalt anzeigen");
assertIncludes("head -n ", "head -n 100");
assertIncludes("tail -n ", "tail -n 100");
assertIncludes("ip route get ", "ip route get 8.8.8.8");
assertIncludes("ip route add ", "ip route add default via 192.168.1.1");
assertIncludes("ip addr show dev ", "ip addr show dev eth0");
assertNotIncludes("ip addr show dev ", "ip addr show dev any");
assertIncludes("ip link set ", "ip link set eth0");
assertIncludes("ip link set eth0 ", "ip link set eth0 up");
assertIncludes("rsync --exclude ", "rsync --exclude 'node_modules/'");
assertIncludes("rsync -e ", "rsync -e 'ssh -p 2222'");
assertMinCount("rsync ", 30);
assertIncludes("rsync --", "rsync --itemize-changes");
assertIncludes("rsync --", "rsync --bwlimit");
assertIncludes("rsync --", "rsync --protect-args");
assertSuggestionDescription(
  "rsync --",
  "rsync --itemize-changes",
  "Änderungen einzeln markieren",
);
assertIncludes("curl -H ", "curl -H 'Content-Type: application/json'");
assertIncludes("curl -X ", "curl -X POST");
assertIncludes("curl -o ", "curl -o response.json");
assertIncludes(
  "openssl s_client -servername ",
  "openssl s_client -servername example.com",
);
assertIncludes("ps --sort ", "ps --sort -%mem");
assertIncludes("lsof -i :", "lsof -i :443");
assertIncludes("ss -tulpn ", "ss -tulpn | grep :443");
assertMinCount("service ", 20);
assertIncludes("service ", "service custom-app");
assertSource("service ", "service custom-app", "history");
assertFirst("service ", "service custom-app");
assertIncludes("service ", "service nginx");
assertSource("service ", "service nginx", "catalog");
assertIncludes("service nginx ", "service nginx restart");
assertIncludes("sudo service ", "sudo service custom-app");
assertSource("sudo service ", "sudo service custom-app", "history");
assertFirst("sudo service ", "sudo service custom-app");
assertMinCount("hostnamectl ", 20);
assertStartsWithSequence("hostnamectl ", [
  "hostnamectl status",
  "hostnamectl hostname",
  "hostnamectl chassis",
]);
assertSuggestionDescription(
  "hostnamectl ",
  "hostnamectl location",
  "Standort-Metadatum anzeigen",
);
assertMinCount("timedatectl ", 20);
assertStartsWithSequence("timedatectl ", [
  "timedatectl status",
  "timedatectl show",
  "timedatectl list-timezones",
]);
assertSuggestionDescription(
  "timedatectl ",
  "timedatectl timesync-status",
  "Status von systemd-timesyncd anzeigen",
);
assertIncludes("loginctl show-user ", "loginctl show-user $USER");
assertIncludes(
  "loginctl session-status ",
  "loginctl session-status $XDG_SESSION_ID",
);
assertIncludes("localectl ", "localectl list-locales");
assertIncludes("localectl ", "localectl set-keymap de");
assertIncludes("networkctl ", "networkctl status <link>");
assertIncludes("networkctl ", "networkctl lldp");
assertIncludes("busctl i", "busctl introspect <service> <path>");
assertIncludes("coredumpctl ", "coredumpctl debug <match>");
assertMinCount("systemd-cgls ", 13);
assertStartsWithSequence("systemd-cgls ", [
  "systemd-cgls --user",
  "systemd-cgls --system",
  "systemd-cgls --all",
]);
assertIncludes("systemd-cgls --", "systemd-cgls --unit");
assertIncludes("systemd-cgls ", "systemd-cgls --unit dbus.service");
assertMinCount("systemd-cgtop ", 14);
assertStartsWithSequence("systemd-cgtop ", [
  "systemd-cgtop --depth=2",
  "systemd-cgtop --order=memory",
  "systemd-cgtop --order=cpu",
]);
assertIncludes("systemd-cgtop --", "systemd-cgtop --order");
assertMinCount("systemd-analyze ", 20);
assertStartsWithSequence("systemd-analyze ", [
  "systemd-analyze time",
  "systemd-analyze blame",
  "systemd-analyze critical-chain",
]);
assertIncludes("machinectl ", "machinectl list-images");
assertSuggestionDescription(
  "systemd-cgtop ",
  "systemd-cgtop --iterations=5 --batch",
  "fuenf Batch-Messungen ausgeben",
);
assertSuggestionDescription(
  "systemd-analyze ",
  "systemd-analyze security ssh.service",
  "Sicherheitsprofil von ssh.service bewerten",
);
assertSuggestionDescription(
  "localectl ",
  "localectl list-locales",
  "verfügbare Locales auflisten",
);
assertSuggestionDescription(
  "networkctl ",
  "networkctl lldp",
  "LLDP-Nachbarn anzeigen",
);
assertSuggestionDescription(
  "busctl i",
  "busctl introspect <service> <path>",
  "Interfaces und Methoden eines Objekts anzeigen",
);
assertSuggestionDescription(
  "coredumpctl ",
  "coredumpctl debug <match>",
  "Coredump im Debugger öffnen",
);
assertSuggestionDescription(
  "systemd-cgls --",
  "systemd-cgls --unit",
  "Control-Group einer Unit anzeigen",
);
assertSuggestionDescription(
  "systemd-cgtop --",
  "systemd-cgtop --order",
  "Sortierspalte wählen",
);
assertSuggestionDescription(
  "machinectl ",
  "machinectl list-images",
  "lokale Maschinen-Images auflisten",
);
assertNotIncludes("systemd-analyze verify ", "systemd-analyze verify nginx");
assertRuntimeIncludes(
  "systemd-analyze verify ",
  "systemd-analyze verify certbot.service",
);
assertIncludes(
  "nmcli connection up ",
  "nmcli connection up 'Wired connection 1'",
);
assertIncludes("nmcli device show ", "nmcli device show eth0");
assertNotIncludes("nmcli device show ", "nmcli device show any");
assertIncludes("nmap -p ", "nmap -p 22,80,443");
assertNotIncludes("nmap -p ", "nmap -Pn");
assertNotIncludes("nmap -p ", "nmap -p 10.44.0.42");
assertIncludes("nmap -p 22,443 ", "nmap -p 22,443 10.44.0.42");
assertSource("nmap -p 22,443 ", "nmap -p 22,443 10.44.0.42", "history");
assertMinCount("iftop ", 16);
assertStartsWithSequence("iftop ", [
  "iftop -i eth0",
  "iftop -P -n",
  "iftop -i wlan0 -B",
]);
assertIncludes("iftop ", "iftop -i");
assertIncludes("sudo iftop ", "sudo iftop -P");
assertStartsWithSequence("sudo iftop ", [
  "sudo iftop -i",
  "sudo iftop -P",
  "sudo iftop -n",
]);
assertSuggestionDescription(
  "iftop ",
  "iftop -f 'port 443'",
  "Traffic per pcap-Filter auf Port 443 begrenzen",
);
assertSuggestionDescription("iftop ", "iftop -P", "Ports anzeigen");
assertMinCount("nload ", 16);
assertIncludes("nload ", "nload eth0");
assertIncludes("nload ", "nload wlan0");
assertIncludes("nload -u ", "nload -u M -t 500 eth0");
assertSuggestionDescription(
  "nload ",
  "nload -m",
  "mehrere Interfaces gleichzeitig anzeigen",
);
assertSuggestionDescription(
  "nload ",
  "nload -i 10000 -o 10000 eth0",
  "Skala fuer eth0 auf 10 MBit/s setzen",
);
assertIncludes("vnstat ", "vnstat -i");
assertIncludes("vnstat ", "vnstat --json");
assertSuggestionDescription("vnstat ", "vnstat -l", "Live-Verkehr anzeigen");
assertIncludes("iperf3 ", "iperf3 -s");
assertIncludes("iperf3 -c ", "iperf3 -c 192.168.1.10");
assertIncludes("iperf3 ", "iperf3 -R");
assertStartsWithSequence("iperf3 ", ["iperf3 -s", "iperf3 -c", "iperf3 -R"]);
assertSuggestionDescription(
  "iperf3 ",
  "iperf3 -R",
  "Reverse-Test vom Server zum Client",
);
assertIncludes("ping -c ", "ping -c 4");
assertIncludes("ping -I ", "ping -I eth0");
assertNotIncludes("ping -I ", "ping -I any");
assertIncludes("ping ", "ping nas.local");
assertSource("ping ", "ping nas.local", "history");
assertIncludes("traceroute ", "traceroute 8.8.8.8");
assertIncludes("traceroute ", "traceroute 10.44.0.1");
assertSource("traceroute ", "traceroute 10.44.0.1", "history");
assertIncludes("dig ", "dig example.com");
assertIncludes("dig ", "dig api.internal.example");
assertSource("dig ", "dig api.internal.example", "history");
assertIncludes("host ", "host internal.example");
assertSource("host ", "host internal.example", "history");
assertIncludes("host -t ", "host -t MX");
assertIncludes("host -t MX ", "host -t MX internal.example");
assertSource("host -t MX ", "host -t MX internal.example", "history");
assertIncludes("tail -f ", "tail -f /var/log/syslog");
assertFirst("tail -f ", "tail -f /var/log/pihole/FTL.log");
assertSource("tail -f ", "tail -f /var/log/pihole/FTL.log", "history");
assertNotIncludes("tail -f ", "tail -f /etc/nginx/sites-enabled/default");
assertIncludes("less /var/log/", "less /var/log/auth.log");
assertIncludes("less ", "less /etc/nginx/sites-enabled/default");
assertSource("less ", "less /etc/nginx/sites-enabled/default", "history");
assertIncludes("cat /var/log/", "cat /var/log/syslog");
assertIncludes("cat ", "cat /opt/termix/config.json");
assertSource("cat ", "cat /opt/termix/config.json", "history");
assertIncludes("cd ", "cd /srv/app");
assertIncludes("cd ", "cd /var/log/nginx");
assertIncludes("ls ", "ls /var/log/nginx");
assertIncludes("ls -la ", "ls -la /etc/ssh");
assertBefore("ls", "ls -la", "lsof");
assertBefore("ls", "ls -a", "lsblk");
assertBefore("ls", "ls -l", "lscpu");
assertIncludes("ls ", "ls -lah");
assertFirst("ls -", "ls -lah");
assertFirst("ls -l", "ls -lah");
assertNotIncludes("ls -", "ls - /etc/ssh");
assertFirst("cp -", "cp -r");
assertNotIncludes("cp -", "cp - /etc/termix/config.yml");
assertFirst("mv -", "mv -v");
assertNotIncludes("mv -", "mv - old.log");
assertFirst("mkdir -", "mkdir -p");
assertIncludes("mkdir -p ", "mkdir -p /srv/app/releases");
assertIncludes("cp ", "cp /etc/termix/config.yml");
assertIncludes("cp ", "cp old.log");
assertIncludes("mv ", "mv /var/log/archive/old.log");
assertIncludes("cat ", "cat /etc/termix/config.yml");
assertIncludes("less ", "less /var/log/archive/old.log");
assertIncludes("chmod 640 ", "chmod 640 /etc/termix/config.yml");
assertIncludes(
  "chown www-data:www-data ",
  "chown www-data:www-data /var/log/archive/old.log",
);
assertIncludes("nano ", "nano /etc/ssh/sshd_config");
assertIncludes("sudo nano ", "sudo nano /etc/ssh/sshd_config");
assertIncludes("vim ", "vim ~/.bashrc");
assertIncludes("vi ", "vi ~/.bashrc");
assertIncludes("tar -C ", "tar -C /srv/app");
assertSource("tar -C ", "tar -C /srv/app", "history");
assertNotIncludes("tar -C ", "tar -C /srv/app -xzf release.tar.gz");
assertIncludes("curl -o ", "curl -o /tmp/api-response.json");
assertSource("curl -o ", "curl -o /tmp/api-response.json", "history");
assertNotIncludes(
  "curl -o ",
  "curl -o /tmp/api-response.json https://example.com/api",
);
assertIncludes("ssh -L ", "ssh -L 8080:localhost:80");
assertIncludes("ssh -R ", "ssh -R 2222:localhost:22");
assertIncludes("ssh -D ", "ssh -D 1080");
assertIncludes("ssh -p ", "ssh -p 2222");
assertMinCount("ssh -p ", 8);
assertMinCount("ssh -i ", 8);
assertMinCount("ssh -L ", 8);
assertMinCount("ssh -R ", 8);
assertMinCount("ssh -D ", 8);
assertNotIncludes("ssh -p ", "ssh -p pi@192.168.178.20");
assertIncludes("scp file.txt ", "scp file.txt user@host:/tmp/");
assertIncludes("scp file.txt ", "scp file.txt admin@10.10.10.10:/srv/backups/");
assertSource(
  "scp file.txt ",
  "scp file.txt admin@10.10.10.10:/srv/backups/",
  "history",
);
assertFirst("scp file.txt ", "scp file.txt admin@10.10.10.10:/srv/backups/");
assertMinCount("scp file.txt ", 10);
assertIncludes("scp -P ", "scp -P 2222");
assertMinCount("scp -P ", 8);
assertIncludes("scp -i ", "scp -i ~/.ssh/id_ed25519");
assertMinCount("scp -i ", 8);
assertIncludes("rsync -avz ./dist/ ", "rsync -avz ./dist/ user@host:/tmp/");
assertIncludes(
  "rsync -avz ./build/ ",
  "rsync -avz ./build/ deploy@10.10.10.11:/srv/app/",
);
assertSource(
  "rsync -avz ./build/ ",
  "rsync -avz ./build/ deploy@10.10.10.11:/srv/app/",
  "history",
);
assertMinCount("rsync -avz ./dist/ ", 10);
assertMinCount("rsync -e ", 8);
assertNotIncludes(
  "rsync --exclude ",
  "rsync --exclude admin@10.10.10.10:/srv/backups/",
);
assertNotIncludes("find . -", "find . -name '*.tmp' -delete");
assertNotIncludes("find . -", "find . -name '*.log' | xargs rm");
assertNotIncludes("rm ", "rm -rf ./dir");
assertNotIncludes("sudo rm ", "sudo rm -rf ./dir");

assertDeepEqual(
  commandHistoryEvents.applyCommandHistoryChangeToList(
    ["sudo apt update", "ls -lah", "journalctl -u ssh.service"],
    { action: "delete", hostId: 1, command: "ls -lah" },
  ),
  ["sudo apt update", "journalctl -u ssh.service"],
  "command history delete event removes autocomplete history entry",
);
assertDeepEqual(
  commandHistoryEvents.applyCommandHistoryChangeToList(
    ["sudo apt update", "ls -lah"],
    { action: "clear", hostId: 1 },
  ),
  [],
  "command history clear event empties autocomplete history",
);

assertEqual(
  autocompleteVisibility.shouldRenderCommandAutocomplete({
    isConnected: true,
    showAutocomplete: true,
    suggestionCount: 5,
  }),
  true,
  "autocomplete popup renders while connected",
);
assertEqual(
  autocompleteVisibility.shouldRenderCommandAutocomplete({
    isConnected: false,
    showAutocomplete: true,
    suggestionCount: 5,
  }),
  false,
  "autocomplete popup hides after disconnect",
);
assertEqual(
  autocompleteVisibility.shouldRenderCommandAutocomplete({
    isConnected: true,
    showAutocomplete: true,
    showDisconnectedOverlay: true,
    suggestionCount: 5,
  }),
  false,
  "autocomplete popup hides behind reconnect overlay",
);
assertEqual(
  autocompleteVisibility.shouldRenderCommandAutocomplete({
    isConnected: true,
    isConnecting: true,
    showAutocomplete: true,
    suggestionCount: 5,
  }),
  false,
  "autocomplete popup hides while reconnecting",
);
assertEqual(
  autocompleteVisibility.shouldRenderCommandAutocomplete({
    connectionError: "Connection lost",
    isConnected: true,
    showAutocomplete: true,
    suggestionCount: 5,
  }),
  false,
  "autocomplete popup hides on connection error",
);

assertUsefulHistory("sudo systemctl status certbot.timer", true);
assertUsefulHistory("sudo systemctl restart ssh", false);
assertUsefulHistory("sudo systemctl status cert.bot", false);
assertUsefulHistory("sudo systemctl status certbot.", false);
assertUsefulHistory("sudo nantest.sh", false);
assertUsefulHistory("find -delete", false);
assertUsefulHistory("sudo nano test.sh", true);
assertRenderedCommand(
  "pi@raspberrypi:~ $ sudo systemctl status certbot.timer",
  "sudo systemctl status certbot.",
  "sudo systemctl status certbot.timer",
);
assertRenderedCommand(
  "PS C:\\Users\\User\\Documents\\Termix> ssh pi@192.168.178.20",
  "ssh pi@192.168.",
  "ssh pi@192.168.178.20",
);
assertRenderedCommand(
  "mock$ docker compose logs payments -f",
  "",
  "docker compose logs payments -f",
);
const userPromptGitCommand = renderedCommand.extractRenderedCommandFromLine(
  "pi@raspberrypi:~ $ git st",
  "",
);
const rootPromptGitCommand = renderedCommand.extractRenderedCommandFromLine(
  "root@raspberrypi:/home/pi# git st",
  "",
);
assertEqual(userPromptGitCommand, "git st", "User prompt command extraction");
assertEqual(rootPromptGitCommand, "git st", "Root prompt command extraction");
assertSameEffectiveSuggestions(userPromptGitCommand, rootPromptGitCommand, 10);
assertSecretPrompt("pi@raspberrypi:~ $ Password: ");
assertHelp("sudo systemctl status custom-app.service", "systemctl");
assertHelp("ssh pi@192.168.178.20", "ssh");
assertHelp("rsync -avz ./build/ deploy@10.10.10.11:/srv/app/", "rsync");

async function assertSystemdServiceCacheReuse() {
  const cache = new Map();
  let now = 1000;
  let fetchCount = 0;
  let resolvePending;

  const first = systemdAutocomplete.getOrFetchCachedSystemdServiceAutocomplete(
    cache,
    "host:1",
    () => {
      fetchCount += 1;
      return new Promise((resolve) => {
        resolvePending = resolve;
      });
    },
    () => now,
    1000,
  );
  assertEqual(first.status, "fresh-fetch", "first cache request fetches");

  const second = systemdAutocomplete.getOrFetchCachedSystemdServiceAutocomplete(
    cache,
    "host:1",
    () => {
      fetchCount += 1;
      return Promise.resolve(["unexpected.service"]);
    },
    () => now,
    1000,
  );
  assertEqual(
    second.status,
    "pending-reuse",
    "pending cache request reuses fetch",
  );
  assertEqual(fetchCount, 1, "pending cache request avoids duplicate command");

  resolvePending(["cron.service"]);
  assertDeepEqual(
    await first.promise,
    ["cron.service"],
    "first pending result",
  );
  assertDeepEqual(
    await second.promise,
    ["cron.service"],
    "second pending result",
  );

  const third = systemdAutocomplete.getOrFetchCachedSystemdServiceAutocomplete(
    cache,
    "host:1",
    () => {
      fetchCount += 1;
      return Promise.resolve(["unexpected.service"]);
    },
    () => now,
    1000,
  );
  assertEqual(third.status, "cache-hit", "fresh cache request reuses TTL data");
  assertDeepEqual(await third.promise, ["cron.service"], "fresh cache data");
  assertEqual(fetchCount, 1, "fresh cache hit avoids duplicate command");

  now = 3001;
  const failedRefresh =
    systemdAutocomplete.getOrFetchCachedSystemdServiceAutocomplete(
      cache,
      "host:1",
      () => {
        fetchCount += 1;
        return Promise.reject(new Error("systemctl failed"));
      },
      () => now,
      1000,
    );
  assertEqual(
    failedRefresh.status,
    "fresh-fetch",
    "stale cache starts fresh fetch",
  );
  assertDeepEqual(
    await failedRefresh.promise,
    ["cron.service"],
    "failed refresh keeps previous cached services",
  );
  assertEqual(fetchCount, 2, "stale refresh attempted one new command");
}

assertSystemdServiceCacheReuse()
  .then(() => {
    console.log("terminal autocomplete regression checks passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
