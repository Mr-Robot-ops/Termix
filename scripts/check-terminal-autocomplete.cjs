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
const autocompleteLayout = require("../src/ui/features/terminal/command-history/commandAutocompleteLayout.ts");
const commandHelp = require("../src/ui/lib/terminal-command-help.ts");
const renderedCommand = require("../src/ui/lib/terminal-rendered-command.ts");

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

function assertInputModeAfterTerminalData(message, data, currentMode, expected) {
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
  return autocomplete.buildTerminalAutocompleteMatchItems(command, history, options);
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

function assertRuntimeIncludes(command, expected) {
  const commands = runtimeCommandsFor(command);
  if (!commands.includes(expected)) {
    fail(`Expected runtime ${JSON.stringify(command)} to include ${expected}`);
  }
}

function assertRuntimeFirst(command, expected) {
  const first = runtimeCommandsFor(command)[0];
  if (first !== expected) {
    fail(`Expected first runtime ${JSON.stringify(command)} to be ${expected}, got ${first}`);
  }
}

function assertRuntimeSource(command, expectedCommand, source) {
  const match = runtimeItemsFor(command).find((item) => item.command === expectedCommand);
  if (!match) {
    fail(`Expected runtime ${JSON.stringify(command)} to include ${expectedCommand}`);
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

function assertSystemdUnitsNotIncludes(command, systemdUnits, unwanted) {
  const commands = commandsForSystemdUnits(command, systemdUnits);
  if (commands.includes(unwanted)) {
    fail(
      `Expected ${JSON.stringify(command)} with systemd units ${JSON.stringify(systemdUnits)} not to include ${unwanted}`,
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
    fail(`Expected first ${JSON.stringify(command)} to be ${expected}, got ${first}`);
  }
}

function assertFirstSources(command, expectedSource, count) {
  const items = itemsFor(command).slice(0, count);
  if (items.length < count) {
    fail(`Expected ${JSON.stringify(command)} to return at least ${count} suggestions`);
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
    fail(`Expected ${JSON.stringify(command)} to return at least ${minCount}, got ${count}`);
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
  const match = itemsFor(command).find((item) => item.command === expectedCommand);
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
    fail(`Expected history usefulness of ${command} to be ${useful}, got ${actual}`);
  }
}

function assertHelp(command, expectedBaseCommand) {
  const help = autocomplete.getTerminalAutocompleteHelp(command);
  if (!help) {
    fail(`Expected ${command} to have autocomplete help`);
  }
  if (help.command !== expectedBaseCommand) {
    fail(`Expected ${command} help to be ${expectedBaseCommand}, got ${help.command}`);
  }
}

function assertSuggestionDescription(command, suggestion, expectedDescription) {
  const actual = autocomplete.getTerminalAutocompleteSuggestionDescription(
    command,
    suggestion,
  );
  if (actual !== expectedDescription) {
    fail(
      `Expected description for ${JSON.stringify(suggestion)} from ${JSON.stringify(command)} to be ${expectedDescription}, got ${actual}`,
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

      const description = autocomplete.getTerminalAutocompleteSuggestionDescription(
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
    .map((token) => (/^-[A-Za-z]+$/.test(token) ? token : token.toLowerCase()))
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
    "apt-get",
    "apt-cache",
    "dpkg",
    "df",
    "du",
    "free",
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
    if (!commandHelp.TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(requiredCommand)) {
      fail(`Required help command is missing: ${requiredCommand}`);
    }
  }

  for (const suggestion of suggestions) {
    const normalizedSuggestion = normalizeSuggestionForDuplicateCheck(suggestion);
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
assertSuggestionDescription(
  "grep -",
  "grep -R",
  "rekursiv suchen",
);
assertSuggestionDescription(
  "rg -",
  "rg --files",
  "Dateipfade statt Treffer ausgeben",
);
assertSuggestionDescription(
  "curl -",
  "curl -H",
  "HTTP-Header setzen",
);
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
assertSuggestionDescription("gunzip ", "gunzip -l", "komprimierte Dateigrößen anzeigen");
assertSuggestionDescription("bzip2 ", "bzip2 -t", "komprimierte Datei prüfen");
assertSuggestionDescription("bunzip2 ", "bunzip2 -c", "entpackten Inhalt auf stdout schreiben");
assertSuggestionDescription("xz ", "xz -T", "Anzahl Kompressionsthreads setzen");
assertSuggestionDescription("unxz ", "unxz -k", "Originaldatei behalten");
assertSuggestionDescription("zstd ", "zstd --long", "Long-Range-Modus für große Dateien nutzen");
assertSuggestionDescription("zcat ", "zcat -l", "komprimierte Dateigrößen anzeigen");
assertSuggestionDescription("zgrep ", "zgrep -n", "Zeilennummern anzeigen");
assertSuggestionDescription(
  "ssh-keygen -",
  "ssh-keygen -t",
  "Schlüsseltyp wählen",
);
assertSuggestionDescription(
  "tcpdump -",
  "tcpdump -i",
  "Interface auswählen",
);
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
assertSuggestionDescription(
  "scp ",
  "scp -P",
  "SSH-Port setzen",
);
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
assertSuggestionDescription(
  "whoami",
  "whoami --version",
  "Version anzeigen",
);
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
assertSuggestionDescription("useradd ", "useradd --user-group", "gleichnamige Benutzergruppe anlegen");
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
assertSuggestionDescription("usermod ", "usermod --lock", "Benutzerpasswort sperren");
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
assertSuggestionDescription("chage ", "chage --inactive", "Inaktivitätstage nach Passwortablauf setzen");
assertMinCount("groupadd ", 12);
assertStartsWithSequence("groupadd ", [
  "groupadd developers",
  "groupadd -g 1500 app",
  "groupadd -r servicegroup",
]);
assertSuggestionDescription("groupadd ", "groupadd -f developers", "keinen Fehler melden, wenn Gruppe existiert");
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
assertSuggestionDescription("visudo ", "visudo -c -f /etc/sudoers.d/app", "sudoers-Drop-in app prüfen");
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
assertSuggestionDescription("wget ", "wget -c", "abgebrochenen Download fortsetzen");
assertSuggestionDescription("watch ", "watch --interval", "Intervall in Sekunden setzen");
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
assertSuggestionDescription("wc ", "wc file.txt", "Zeilen, Wörter oder Bytes für Datei zählen");
assertSuggestionDescription("sort ", "sort -nr numbers.txt", "numerisch absteigend sortieren");
assertSuggestionDescription("df ", "df -hT", "Größen menschenlesbar mit Dateisystemtyp anzeigen");
assertSuggestionDescription("du ", "du -sh /var/log", "Größe von /var/log anzeigen");
assertSuggestionDescription("ncdu ", "ncdu -x", "auf einem Dateisystem bleiben");
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
assertSuggestionDescription(
  "fg ",
  "fg %1",
  "Job 1 in den Vordergrund holen",
);
assertSuggestionDescription(
  "bg ",
  "bg %1",
  "Job 1 im Hintergrund fortsetzen",
);
assertSuggestionDescription(
  "disown ",
  "disown -h",
  "Job vor SIGHUP beim Logout schützen",
);
assertSuggestionDescription("pgrep ", "pgrep -af python", "PID und komplette Kommandozeile durchsuchen und anzeigen");
assertMinCount("pgrep ", 24);
assertStartsWithSequence("pgrep ", [
  "pgrep -af python",
  "pgrep -u www-data",
  "pgrep -x sshd",
  "pgrep -n node",
]);
assertSuggestionDescription("pgrep ", "pgrep -d ',' nginx", "PIDs durch Komma getrennt ausgeben");
assertSuggestionDescription(
  "lsof ",
  "lsof -nP -iTCP -sTCP:LISTEN",
  "lauschende TCP-Ports numerisch anzeigen",
);
assertSuggestionDescription("patch ", "patch -p1 < changes.patch", "einen führenden Pfadbestandteil entfernen");
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
assertSuggestionDescription("unalias ", "unalias serve", "Alias serve entfernen");
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
assertSuggestionDescription("unset ", "unset -f function_name", "Shell-Funktion entfernen");
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
assertSuggestionDescription("which ", "which -a python", "alle python-Fundstellen anzeigen");
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
assertSuggestionDescription("command ", "command -v docker", "Pfad zu docker anzeigen");
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
assertSource("sudo systemctl status ", "sudo systemctl status certbot.timer", "history");
assertIncludes("sudo systemctl status ", "sudo systemctl status custom-app.service");
assertSource("sudo systemctl status ", "sudo systemctl status custom-app.service", "history");
assertFirst("sudo systemctl status ", "sudo systemctl status certbot.timer");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status cert.bot");
assertDeepEqual(runtimeSystemdUnits, [
  "certbot.service",
  "certbot.timer",
  "ssh.service",
  "nginx.service",
  "docker.socket",
  "custom-runtime.service",
], "runtime systemd unit extraction");
assertDeepEqual(
  autocomplete.extractSystemdUnitsFromTerminalOutput(missingSystemdUnitOutput),
  [],
  "missing systemd units are not learned from error output",
);
assertDeepEqual(
  raspberryPiSystemdUnits,
  [
    "avahi-daemon.service",
    "dbus.service",
    "dhcpcd.service",
    "ssh.service",
  ],
  "real systemd service output extraction",
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
assertRuntimeIncludes("sudo systemctl stop ", "sudo systemctl stop ssh.service");
assertRuntimeIncludes("systemctl restart n", "systemctl restart nginx.service");
assertRuntimeIncludes("systemctl reload ", "systemctl reload custom-runtime.service");
assertRuntimeIncludes("journalctl -u c", "journalctl -u custom-runtime.service");
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
assertNotIncludes(
  "ssh -p 2222 a",
  "ssh -p 2222 admin@server.example uptime",
);
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
assertBefore("systemctl list-", "systemctl list-unit-files", "systemctl list-jobs");
assertBefore(
  "systemctl re",
  "systemctl reload-or-restart <unit>",
  "systemctl reset-failed <unit>",
);
assertIncludes("systemctl list-units --state ", "systemctl list-units --state running");
assertIncludes("systemctl status nginx ", "systemctl status nginx --no-pager");
assertIncludes("systemctl restart nginx ", "systemctl restart nginx --no-block");
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

assertSuggestionDescription(
  "git --",
  "git --no-pager",
  "Pager deaktivieren",
);
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
assertSource("docker compose exec ", "docker compose exec scheduler", "history");
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
assertSource("sudo apt install ", "sudo apt install wireguard-tools", "history");
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
assertSuggestionDescription("npm ", "npm run dev", "Entwicklungs-Skript starten");
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
assertSuggestionDescription("yarn ", "yarn --immutable", "Yarn-Install ohne Lockfile-Änderung erzwingen");

assertMinCount("node ", 12);
assertStartsWithSequence("node ", [
  "node server.js",
  "node --watch",
  "node --test",
  "node -e",
]);
assertIncludes("node ", "node --inspect-brk");
assertSuggestionDescription("node ", "node --watch", "Skript bei Dateiänderungen neu starten");

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
assertSuggestionDescription("python ", "python -m venv .venv", "virtuelle Umgebung erstellen");
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
assertSuggestionDescription("pip3 ", "pip3 freeze > requirements.txt", "Requirements-Datei erzeugen");

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
assertSuggestionDescription("kubectl ", "kubectl get pods -A", "Pods in allen Namespaces anzeigen");
assertSuggestionDescription("kubectl logs ", "kubectl logs -f deployment/app", "Logs live verfolgen");
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
assertSuggestionDescription("helm list ", "helm list -A", "Releases in allen Namespaces auflisten");
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
assertIncludes("gcloud ", "gcloud container clusters get-credentials <cluster>");
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
assertIncludes("az ", "az aks get-credentials --resource-group <group> --name <cluster>");
assertIncludes("az ", "az webapp log tail --name <app> --resource-group <group>");
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
assertSuggestionDescription("pg_dump ", "pg_dump -Fc", "Custom-Format-Dump erzeugen");
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
assertSuggestionDescription("redis-cli ", "redis-cli --scan", "Keys per SCAN iterieren");
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
assertSuggestionDescription("crontab ", "crontab -", "Crontab aus Standardeingabe installieren");

assertMinCount("nginx ", 16);
assertStartsWithSequence("nginx ", [
  "nginx -t",
  "nginx -T",
  "nginx -s reload",
  "nginx -s reopen",
  "nginx -q -t",
]);
assertSuggestionDescription("nginx ", "nginx -s reload", "Nginx-Konfiguration neu laden");
assertSuggestionDescription("nginx ", "nginx -g \"daemon off;\"", "Nginx im Vordergrund starten");

assertMinCount("apachectl ", 12);
assertStartsWithSequence("apachectl ", [
  "apachectl configtest",
  "apachectl -S",
  "apachectl -M",
  "apachectl status",
]);
assertSuggestionDescription("apachectl ", "apachectl -S", "VirtualHost-Konfiguration anzeigen");
assertMinCount("apache2ctl ", 12);
assertStartsWithSequence("apache2ctl ", [
  "apache2ctl configtest",
  "apache2ctl -S",
  "apache2ctl -M",
  "apache2ctl status",
]);
assertSuggestionDescription("apache2ctl ", "apache2ctl -S", "VirtualHost-Konfiguration anzeigen");

assertMinCount("certbot ", 16);
assertStartsWithSequence("certbot ", [
  "certbot certificates",
  "certbot renew --dry-run",
  "certbot renew",
  "certbot plugins",
]);
assertSuggestionDescription("certbot ", "certbot renew --dry-run", "Zertifikatserneuerung testen");
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
assertSuggestionDescription("pm2 ", "pm2 start app.js --name", "app.js mit Namen starten");

assertMinCount("nslookup ", 16);
assertStartsWithSequence("nslookup ", [
  "nslookup example.com",
  "nslookup example.com 1.1.1.1",
  "nslookup -type=MX example.com",
  "nslookup -type=TXT example.com",
]);
assertSuggestionDescription("nslookup ", "nslookup -type=TXT example.com", "TXT-Records abfragen");
assertSuggestionDescription("nslookup ", "nslookup -type=SOA", "SOA-Record abfragen");

assertMinCount("tracepath ", 12);
assertStartsWithSequence("tracepath ", [
  "tracepath example.com",
  "tracepath -n 8.8.8.8",
  "tracepath -b example.com",
  "tracepath -m 20 example.com",
]);
assertSuggestionDescription("tracepath ", "tracepath -l 1200 example.com", "Paketlänge auf 1200 Bytes setzen");

assertMinCount("mtr ", 24);
assertStartsWithSequence("mtr ", [
  "mtr example.com",
  "mtr -rw -c 100 example.com",
  "mtr -T -P 443 example.com",
]);
assertSuggestionDescription("mtr ", "mtr --json example.com", "MTR-Ergebnis als JSON ausgeben");

assertMinCount("iw ", 13);
assertStartsWithSequence("iw ", [
  "iw dev",
  "iw dev wlan0 link",
  "iw dev wlan0 scan",
  "iw dev wlan0 station dump",
]);
assertSuggestionDescription("iw ", "iw dev wlan0 set power_save off", "WLAN-Energiesparen deaktivieren");

assertMinCount("nft ", 18);
assertStartsWithSequence("nft ", [
  "nft list ruleset",
  "nft list tables",
  "nft list table inet filter",
  "nft list counters",
]);
assertNotIncludes("nft ", "nft flush ruleset");
assertSuggestionDescription("nft ", "nft --check -f rules.nft", "Regeldatei validieren, ohne sie anzuwenden");

assertMinCount("openssl s_client ", 16);
assertIncludes("openssl s_client ", "openssl s_client -brief -connect example.com:443");
assertIncludes("openssl s_client ", "openssl s_client -verify_return_error -connect example.com:443");
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
assertSuggestionDescription("lsof ", "lsof +D /var/log", "offene Dateien unter /var/log suchen");

assertMinCount("pkill ", 18);
assertStartsWithSequence("pkill ", [
  "pkill -TERM nginx",
  "pkill -HUP nginx",
  "pkill -f 'python app.py'",
]);
assertSuggestionDescription("pkill ", "pkill -e -TERM nginx", "beendete nginx-Prozesse ausgeben");

assertIncludes("docker ps -", "docker ps -a");
assertUnique("docker ps -");

assertIncludes("sudo tcpdump -i ", "sudo tcpdump -i any");
assertIncludes("resolvectl query g", "resolvectl query github.com");
assertIncludes("resolvectl query ", "resolvectl query pihole.lan");
assertSource("resolvectl query ", "resolvectl query pihole.lan", "history");
assertIncludes("openssl s_client -connect g", "openssl s_client -connect github.com:443");
assertIncludes("openssl s_client -connect ", "openssl s_client -connect mail.example.com:993");
assertSource(
  "openssl s_client -connect ",
  "openssl s_client -connect mail.example.com:993",
  "history",
);
assertFirst("openssl s_client -connect ", "openssl s_client -connect mail.example.com:993");
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
assertSuggestionDescription("uptime", "uptime --pretty", "Laufzeit menschenlesbar anzeigen");
assertSuggestionDescription(
  "uptime",
  "uptime | sed 's/.*load average: //'",
  "Load-Average-Teil per sed extrahieren",
);
assertMinCount("who ", 14);
assertIncludes("who ", "who -b");
assertIncludes("who ", "who --heading");
assertSuggestionDescription("who ", "who -b", "Zeit des letzten Systemstarts anzeigen");
assertMinCount("printenv", 6);
assertIncludes("printenv", "printenv --null");
assertSuggestionDescription("printenv", "printenv --null", "Ausgabe mit NUL statt Zeilenumbruch trennen");
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
assertSuggestionDescription("awk ", "awk -v", "Variable vor Programmausführung setzen");
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
assertSuggestionDescription("xargs ", "xargs -0", "Eingabe mit NUL-Trennung lesen");
assertMinCount("tee ", 12);
assertIncludes("tee ", "tee --append");
assertIncludes("tee ", "tee --output-error");
assertIncludes("tee ", "tee file.txt");
assertSuggestionDescription("tee ", "tee -a", "an Dateien anhängen statt überschreiben");
assertSuggestionDescription("tee ", "tee file1.log file2.log", "Ausgabe in mehrere Logdateien schreiben");
assertMinCount("env ", 12);
assertIncludes("env ", "env --ignore-environment");
assertIncludes("env ", "env --split-string");
assertSuggestionDescription("env ", "env | grep PATH", "Umgebung anzeigen oder Befehl mit Umgebung starten");
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
assertSuggestionDescription("lsmod", "lsmod | wc -l", "Anzahl geladener Module zaehlen");

assertMinCount("vmstat ", 20);
assertStartsWithSequence("vmstat ", [
  "vmstat 1",
  "vmstat 1 5",
  "vmstat -s",
]);
assertSuggestionDescription("vmstat ", "vmstat -S M 1", "Speicherwerte in MiB anzeigen");

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
assertIncludes("realpath ", "realpath --relative-base=/srv /srv/app/config.yml");
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
  "hexdump -e '16/1 \"%02x \" \"\\n\"' file.bin",
  "Bytes mit eigenem Format ausgeben",
);

assertMinCount("xxd ", 18);
assertIncludes("xxd ", "xxd -i file.bin");
assertSuggestionDescription("xxd ", "xxd -g 1 file.bin", "Bytes einzeln gruppieren");

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
assertSuggestionDescription("blkid ", "blkid -U <uuid>", "Gerät mit dieser UUID finden");
assertSuggestionDescription("blkid ", "blkid -c", "Cache-Datei setzen");

assertMinCount("mount ", 20);
assertStartsWithSequence("mount ", [
  "mount | column -t",
  "mount | grep /mnt",
  "mount /dev/sdb1 /mnt",
  "mount -t nfs server:/share /mnt",
]);
assertSuggestionDescription("mount ", "mount -o remount,rw /", "Root-Dateisystem schreibbar remounten");
assertSuggestionDescription("mount ", "mount --bind /srv/data /mnt/data", "Verzeichnis per Bind-Mount einhängen");

assertMinCount("umount ", 14);
assertStartsWithSequence("umount ", [
  "umount /mnt",
  "umount -l /mnt",
  "umount -v /mnt",
  "umount /dev/sdb1",
]);
assertNotIncludes("umount ", "umount -a");
assertSuggestionDescription("umount ", "umount --recursive /mnt", "Submounts unter /mnt rekursiv aushängen");

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
assertSuggestionDescription("free ", "free -w -h", "Speicher breit und menschenlesbar anzeigen");

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
assertSuggestionDescription("sysctl ", "sysctl vm.swappiness", "Swappiness-Parameter anzeigen");
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
assertSuggestionDescription("df ", "df -x tmpfs -x devtmpfs", "temporäre Dateisysteme ausblenden");

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
assertSuggestionDescription("tar --", "tar --directory", "vor Aktion in Verzeichnis wechseln");
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
assertSuggestionDescription("screen ", "screen -x work", "Sitzung work gemeinsam anhaengen");
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
assertSuggestionDescription("jobs ", "jobs -l %%", "aktuellen Job mit Prozess-ID anzeigen");
assertMinCount("fg ", 12);
assertStartsWithSequence("fg ", ["fg %1", "fg %2", "fg %3", "fg %%"]);
assertSuggestionDescription("fg ", "fg %?python", "Job mit python im Kommando in den Vordergrund holen");
assertMinCount("bg ", 12);
assertStartsWithSequence("bg ", ["bg %1", "bg %2", "bg %3", "bg %%"]);
assertSuggestionDescription("bg ", "bg %?python", "Job mit python im Kommando im Hintergrund fortsetzen");
assertMinCount("disown ", 12);
assertStartsWithSequence("disown ", [
  "disown %1",
  "disown %2",
  "disown %%",
  "disown %+",
]);
assertSuggestionDescription("disown ", "disown -h %%", "aktuellen Job vor SIGHUP schuetzen");
assertMinCount("pidof ", 12);
assertStartsWithSequence("pidof ", [
  "pidof sshd",
  "pidof nginx",
  "pidof systemd",
  "pidof -s nginx",
]);
assertSuggestionDescription("pidof ", "pidof -o %PPID sshd", "aufrufenden Parent-Prozess ausschliessen");
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
assertSuggestionDescription("top ", "top -b -n 1 -o %CPU", "einmalige Batch-Ausgabe nach CPU sortieren");
assertMinCount("htop ", 12);
assertStartsWithSequence("htop ", [
  "htop -u root",
  "htop -u www-data",
  "htop -p 1",
  "htop -d 10",
]);
assertSuggestionDescription("htop ", "htop -s PERCENT_CPU", "nach CPU-Auslastung sortieren");
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
assertSuggestionDescription("zip ", "zip -r encrypted.zip ./secrets -e", "verschluesseltes Archiv erstellen");
assertMinCount("unzip ", 20);
assertStartsWithSequence("unzip ", [
  "unzip archive.zip",
  "unzip archive.zip -d /tmp",
  "unzip -l archive.zip",
]);
assertSuggestionDescription("unzip ", "unzip -p archive.zip file.txt", "Datei aus Archiv auf stdout ausgeben");
assertMinCount("zcat ", 16);
assertIncludes("zcat ", "zcat *.log.gz | grep -i error");
assertSuggestionDescription("zcat ", "zcat file.log.gz | wc -l", "Zeilen in komprimiertem Log zaehlen");
assertSuggestionDescription("zip ", "zip -r", "Verzeichnisse rekursiv einpacken");
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
assertIncludes("openssl s_client -servername ", "openssl s_client -servername example.com");
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
assertSuggestionDescription("hostnamectl ", "hostnamectl location", "Standort-Metadatum anzeigen");
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
assertIncludes("loginctl session-status ", "loginctl session-status $XDG_SESSION_ID");
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
assertIncludes("nmcli connection up ", "nmcli connection up 'Wired connection 1'");
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
assertSuggestionDescription("iftop ", "iftop -f 'port 443'", "Traffic per pcap-Filter auf Port 443 begrenzen");
assertSuggestionDescription("iftop ", "iftop -P", "Ports anzeigen");
assertMinCount("nload ", 16);
assertIncludes("nload ", "nload eth0");
assertIncludes("nload ", "nload wlan0");
assertIncludes("nload -u ", "nload -u M -t 500 eth0");
assertSuggestionDescription("nload ", "nload -m", "mehrere Interfaces gleichzeitig anzeigen");
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
assertStartsWithSequence("iperf3 ", [
  "iperf3 -s",
  "iperf3 -c",
  "iperf3 -R",
]);
assertSuggestionDescription("iperf3 ", "iperf3 -R", "Reverse-Test vom Server zum Client");
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
assertFirst("ls -", "ls -a");
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
assertNotIncludes("curl -o ", "curl -o /tmp/api-response.json https://example.com/api");
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
assertSource("scp file.txt ", "scp file.txt admin@10.10.10.10:/srv/backups/", "history");
assertFirst("scp file.txt ", "scp file.txt admin@10.10.10.10:/srv/backups/");
assertMinCount("scp file.txt ", 10);
assertIncludes("scp -P ", "scp -P 2222");
assertMinCount("scp -P ", 8);
assertIncludes("scp -i ", "scp -i ~/.ssh/id_ed25519");
assertMinCount("scp -i ", 8);
assertIncludes("rsync -avz ./dist/ ", "rsync -avz ./dist/ user@host:/tmp/");
assertIncludes("rsync -avz ./build/ ", "rsync -avz ./build/ deploy@10.10.10.11:/srv/app/");
assertSource("rsync -avz ./build/ ", "rsync -avz ./build/ deploy@10.10.10.11:/srv/app/", "history");
assertMinCount("rsync -avz ./dist/ ", 10);
assertMinCount("rsync -e ", 8);
assertNotIncludes("rsync --exclude ", "rsync --exclude admin@10.10.10.10:/srv/backups/");
assertNotIncludes("find . -", "find . -name '*.tmp' -delete");
assertNotIncludes("find . -", "find . -name '*.log' | xargs rm");
assertNotIncludes("rm ", "rm -rf ./dir");
assertNotIncludes("sudo rm ", "sudo rm -rf ./dir");

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

console.log("terminal autocomplete regression checks passed");
