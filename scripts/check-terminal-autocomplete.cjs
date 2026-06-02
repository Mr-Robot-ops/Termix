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
    "dmesg",
    "sysctl",
    "findmnt",
    "loginctl",
    "systemd-analyze",
    "chgrp",
    "umask",
    "groupadd",
    "userdel",
    "visudo",
    "tcpdump",
    "openssl s_client",
    "resolvectl",
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
  "curl -",
  "curl -H",
  "HTTP-Header setzen",
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
assertMinCount("printf ", 5);
assertIncludes("printf ", "printf '%04d\\n' 42");
assertIncludes("printf ", "printf '%q\\n' \"$PATH\"");
assertSuggestionDescription(
  "printf ",
  "printf '%q\\n' \"$PATH\"",
  "Shell-escaped Ausgabe erzeugen",
);
assertMinCount("pwd ", 4);
assertIncludes("pwd ", "pwd --physical");
assertSuggestionDescription(
  "pwd ",
  "pwd --physical",
  "physischen Pfad ohne Symlinks anzeigen",
);
assertMinCount("hostname ", 12);
assertIncludes("hostname ", "hostname --all-ip-addresses");
assertIncludes("hostname ", "hostname --all-fqdns");
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
assertSuggestionDescription("du ", "du -sh /var/log", "Gesamtsumme menschenlesbar anzeigen");
assertSuggestionDescription("pgrep ", "pgrep -af python", "PID und komplette Kommandozeile durchsuchen und anzeigen");
assertSuggestionDescription("lsof ", "lsof -nP -iTCP -sTCP:LISTEN", "TCP-Ports numerisch anzeigen");
assertSuggestionDescription("patch ", "patch -p1 < changes.patch", "einen führenden Pfadbestandteil entfernen");
assertTopSuggestionsHaveSpecificDescriptions([
  "cat ",
  "less ",
  "head ",
  "tail ",
  "wc ",
  "sort ",
  "uniq ",
  "cut ",
  "tr ",
  "nl ",
  "split ",
  "column ",
  "file ",
  "stat ",
  "readlink ",
  "basename ",
  "dirname ",
  "df ",
  "du ",
  "free ",
  "top ",
  "htop ",
  "kill ",
  "pgrep ",
  "pkill ",
  "netstat ",
  "lsof ",
  "ping ",
  "dig ",
  "host ",
  "traceroute ",
  "nmap ",
  "service ",
  "loginctl ",
  "findmnt ",
  "sysctl ",
  "dmesg ",
  "systemd-analyze ",
  "diff ",
  "patch ",
  "clear ",
  "printf ",
  "pwd ",
  "hostname ",
  "whoami",
  "passwd ",
  "ssh-agent ",
  "ssh-add ",
  "wget ",
  "sed ",
  "jq ",
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
assertSameEffectiveSuggestions("systemctl s", "sudo systemctl s", 12);
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
assertIncludes("systemctl s", "systemctl status nginx");
assertIncludes("systemctl status ", "systemctl status certbot.timer");
assertFirst("systemctl status ", "systemctl status custom-app.service");
assertIncludes("sudo systemctl status ", "sudo systemctl status nginx");
assertIncludes("sudo systemctl status ", "sudo systemctl status certbot.timer");
assertSource("sudo systemctl status ", "sudo systemctl status certbot.timer", "catalog");
assertIncludes("sudo systemctl status ", "sudo systemctl status custom-app.service");
assertSource("sudo systemctl status ", "sudo systemctl status custom-app.service", "history");
assertFirst("sudo systemctl status ", "sudo systemctl status custom-app.service");
assertNotIncludes("sudo systemctl status ", "sudo systemctl status cert.bot");

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

assertIncludes("journalctl -u n", "journalctl -u nginx");
assertIncludes("journalctl -u ", "journalctl -u backup.timer");
assertSource("journalctl -u ", "journalctl -u backup.timer", "history");
assertFirst("journalctl -u ", "journalctl -u custom-app.service");
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
assertMinCount("ssh-copy-id ", 12);
assertIncludes("ssh-copy-id ", "ssh-copy-id -s");
assertIncludes("ssh-copy-id ", "ssh-copy-id --help");
assertSuggestionDescription(
  "ssh-copy-id ",
  "ssh-copy-id -s",
  "sftp statt Shell-Kommandos verwenden",
);
assertMinCount("sftp ", 18);
assertIncludes("sftp ", "sftp -J");
assertIncludes("sftp ", "sftp -F");
assertIncludes("sftp ", "sftp -R");
assertSuggestionDescription("sftp ", "sftp -J", "Jump-Host verwenden");
assertIncludes("jq -r ", "jq -r .[]");
assertMinCount("uptime", 8);
assertIncludes("uptime", "uptime --pretty");
assertIncludes("uptime", "uptime --version");
assertSuggestionDescription("uptime", "uptime --pretty", "Laufzeit menschenlesbar anzeigen");
assertMinCount("who ", 14);
assertIncludes("who ", "who -b");
assertIncludes("who ", "who --heading");
assertSuggestionDescription("who ", "who -b", "Zeit des letzten Systemstarts anzeigen");
assertMinCount("printenv", 6);
assertIncludes("printenv", "printenv --null");
assertSuggestionDescription("printenv", "printenv --null", "Ausgabe mit NUL statt Zeilenumbruch trennen");
assertMinCount("awk ", 10);
assertIncludes("awk ", "awk --field-separator");
assertIncludes("awk ", "awk --lint");
assertSuggestionDescription("awk ", "awk -v", "Variable vor Programmausführung setzen");
assertMinCount("xargs ", 14);
assertIncludes("xargs ", "xargs --no-run-if-empty");
assertIncludes("xargs ", "xargs --max-procs");
assertNotIncludes("xargs ", "xargs rm");
assertSuggestionDescription("xargs ", "xargs -0", "Eingabe mit NUL-Trennung lesen");
assertMinCount("tee ", 6);
assertIncludes("tee ", "tee --append");
assertIncludes("tee ", "tee --output-error");
assertSuggestionDescription("tee ", "tee -a", "an Dateien anhängen statt überschreiben");
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
assertIncludes("ufw allow ", "ufw allow 22/tcp");
assertIncludes("ufw delete allow ", "ufw delete allow 22/tcp");
assertIncludes("tar -C ", "tar -C /tmp");
assertMinCount("tar ", 25);
assertIncludes("tar --", "tar --xz");
assertIncludes("tar --", "tar --directory");
assertIncludes("tar --", "tar --one-file-system");
assertSuggestionDescription("tar --", "tar --directory", "vor Aktion in Verzeichnis wechseln");
assertIncludes("grep --include ", "grep --include '*.log'");
assertIncludes("grep -A ", "grep -A 3");
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
assertIncludes("loginctl show-user ", "loginctl show-user $USER");
assertIncludes("loginctl session-status ", "loginctl session-status $XDG_SESSION_ID");
assertIncludes("systemd-analyze verify ", "systemd-analyze verify nginx");
assertIncludes("nmcli connection up ", "nmcli connection up 'Wired connection 1'");
assertIncludes("nmcli device show ", "nmcli device show eth0");
assertNotIncludes("nmcli device show ", "nmcli device show any");
assertIncludes("nmap -p ", "nmap -p 22,80,443");
assertNotIncludes("nmap -p ", "nmap -Pn");
assertNotIncludes("nmap -p ", "nmap -p 10.44.0.42");
assertIncludes("nmap -p 22,443 ", "nmap -p 22,443 10.44.0.42");
assertSource("nmap -p 22,443 ", "nmap -p 22,443 10.44.0.42", "history");
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
assertFirst("ls -", "ls -a");
assertNotIncludes("ls -", "ls - /etc/ssh");
assertFirst("cp -", "cp -r");
assertNotIncludes("cp -", "cp - /etc/termix/config.yml");
assertFirst("mv -", "mv -v");
assertNotIncludes("mv -", "mv - old.log");
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
