const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Server } = require("ssh2");

const PORT = Number(process.env.TERMIX_TEST_SSH_PORT || 2222);
const HOST = process.env.TERMIX_TEST_SSH_HOST || "127.0.0.1";
const PASSWORD = process.env.TERMIX_TEST_SSH_PASSWORD || "codex";
const USERS = new Set(["codex", "pi", "root"]);
const RUN_DIR = path.join(process.cwd(), ".codex-run");
const HOST_KEY_PATH = path.join(RUN_DIR, "local-ssh-test-host.key");

function ensureHostKey() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  if (fs.existsSync(HOST_KEY_PATH)) {
    return fs.readFileSync(HOST_KEY_PATH, "utf8");
  }

  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  fs.writeFileSync(HOST_KEY_PATH, privateKey, { mode: 0o600 });
  return privateKey;
}

function commandWords(input) {
  return input.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

function formatPrompt(state) {
  const home = `/home/${state.loginUser}`;
  const cwd = state.cwd === home ? "~" : state.cwd;
  const marker = state.effectiveUser === "root" ? "#" : "$";
  return `${state.effectiveUser}@termix-local:${cwd} ${marker} `;
}

function writePrompt(stream, state) {
  stream.write(formatPrompt(state));
}

function normalizePath(state, target) {
  const home = `/home/${state.loginUser}`;
  if (!target || target === "~") return home;
  if (target === "-") return "/var/log";
  if (target.startsWith("~/")) return `${home}/${target.slice(2)}`;
  if (target.startsWith("/")) return target.replace(/\/+$/, "") || "/";

  const base = state.cwd.endsWith("/") ? state.cwd : `${state.cwd}/`;
  const parts = `${base}${target}`.split("/");
  const resolved = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return `/${resolved.join("/")}`;
}

const rootListing = [
  "bin",
  "boot",
  "dev",
  "etc",
  "home",
  "lib",
  "lib64",
  "opt",
  "proc",
  "root",
  "run",
  "sbin",
  "srv",
  "tmp",
  "usr",
  "var",
];

const homeListing = [
  "Bookshelf",
  "Desktop",
  "Documents",
  "Downloads",
  "Music",
  "Pictures",
  "Public",
  "Templates",
  "Videos",
  "commands.json",
  "go",
  "libmsquic-test",
  "log_prices.sh",
  "market-state.json",
  "ngtcp2",
  "openssl-quic",
  "price-history.jsonl",
  "price-history-new.jsonl",
  "thinclient_drives",
  "trades.json",
  "unbound",
  "wget-log",
];

function columns(items, width = 96) {
  const colWidth = Math.max(12, Math.min(28, Math.max(...items.map((item) => item.length)) + 3));
  const cols = Math.max(1, Math.floor(width / colWidth));
  const rows = Math.ceil(items.length / cols);
  const lines = [];
  for (let row = 0; row < rows; row += 1) {
    let line = "";
    for (let col = 0; col < cols; col += 1) {
      const item = items[col * rows + row];
      if (item) line += item.padEnd(colWidth);
    }
    lines.push(line.trimEnd());
  }
  return `${lines.join("\r\n")}\r\n`;
}

function psAux() {
  const rows = [
    "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
    "root           1  0.0  0.2 166884 11264 ?        Ss   09:41   0:03 /sbin/init",
    "root         641  0.0  0.1  15420  7616 ?        Ss   09:41   0:00 /usr/sbin/sshd -D",
    "root         702  0.0  0.1  18264  9472 ?        Ss   09:42   0:00 /usr/lib/systemd/systemd-journald",
    "codex       1298  0.1  0.1  32240  6144 pts/0    Ss   10:12   0:00 -bash",
  ];
  for (let i = 0; i < 34; i += 1) {
    rows.push(
      `codex       ${1300 + i}  0.0  0.1  32440  6144 pts/0    S    10:${String(14 + i).padStart(2, "0")}   0:00 worker-${i + 1}`,
    );
  }
  return `${rows.join("\r\n")}\r\n`;
}

function systemctlStatus(unit = "ssh.service") {
  const displayUnit = unit.includes(".") ? unit : `${unit}.service`;
  return [
    `* ${displayUnit} - Termix local SSH test unit`,
    "     Loaded: loaded (/usr/lib/systemd/system/test.service; enabled; preset: enabled)",
    "     Active: active (running) since Tue 2026-06-02 10:42:13 CEST; 21min ago",
    "   Main PID: 641 (sshd)",
    "      Tasks: 3 (limit: 19166)",
    "     Memory: 12.4M",
    "        CPU: 1.284s",
    "     CGroup: /system.slice/test.service",
    "             `-641 /usr/sbin/sshd -D",
    "",
    "Jun 02 10:42:13 termix-local systemd[1]: Started Termix local SSH test unit.",
  ].join("\r\n") + "\r\n";
}

function gitHelp() {
  return [
    "usage: git [-v | --version] [-h | --help] <command> [<args>]",
    "",
    "These are common Git commands used in various situations:",
    "   clone     Clone a repository into a new directory",
    "   init      Create an empty Git repository or reinitialize an existing one",
    "   add       Add file contents to the index",
    "   status    Show the working tree status",
    "   commit    Record changes to the repository",
    "   diff      Show changes between commits, commit and working tree, etc",
    "   log       Show commit logs",
    "   branch    List, create, or delete branches",
    "   switch    Switch branches",
    "   fetch     Download objects and refs from another repository",
    "   pull      Fetch from and integrate with another repository",
    "   push      Update remote refs along with associated objects",
  ].join("\r\n") + "\r\n";
}

function dockerPs() {
  return [
    "CONTAINER ID   IMAGE          COMMAND                  STATUS         PORTS                  NAMES",
    "01a7f0419c33   nginx:alpine   \"/docker-entrypoint\"     Up 2 hours     0.0.0.0:8080->80/tcp   web",
    "42f188bba17c   redis:7        \"docker-entrypoint.s\"    Up 2 hours     6379/tcp               cache",
  ].join("\r\n") + "\r\n";
}

function ipAddress() {
  return [
    "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN",
    "    inet 127.0.0.1/8 scope host lo",
    "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP",
    "    inet 192.168.178.20/24 brd 192.168.178.255 scope global eth0",
  ].join("\r\n") + "\r\n";
}

function journalLines() {
  return [
    "Jun 02 10:42:13 termix-local sshd[641]: Server listening on 0.0.0.0 port 22.",
    "Jun 02 10:42:29 termix-local sshd[702]: Accepted password for codex from 127.0.0.1",
    "Jun 02 10:43:02 termix-local systemd[1]: Started Certbot timer.",
    "Jun 02 10:44:11 termix-local sudo[812]: codex : TTY=pts/0 ; COMMAND=/bin/systemctl status ssh",
    "Jun 02 10:44:11 termix-local sudo[812]: pam_unix(sudo:session): session opened for user root",
  ].join("\r\n") + "\r\n";
}

function trimSudo(command) {
  let current = command.trim();
  while (current.startsWith("sudo ")) {
    current = current.slice(5).trimStart();
  }
  return current;
}

function runCommand(input, stream, state) {
  const trimmed = input.trim();
  if (!trimmed) return true;

  state.history.push(trimmed);
  state.historyIndex = state.history.length;

  const command = trimSudo(trimmed);
  const [name = "", ...args] = commandWords(command);

  switch (name) {
    case "exit":
    case "logout":
      if (state.effectiveUser === "root" && state.loginUser !== "root") {
        state.effectiveUser = state.loginUser;
        state.cwd = `/home/${state.loginUser}`;
        return true;
      }
      stream.write("logout\r\n");
      stream.exit(0);
      stream.end();
      return false;

    case "clear":
      stream.write("\x1b[2J\x1b[H");
      return true;

    case "pwd":
      stream.write(`${state.cwd}\r\n`);
      return true;

    case "cd":
      state.cwd = normalizePath(state, args[0]);
      return true;

    case "ls": {
      const target = args.find((arg) => !arg.startsWith("-"));
      const dir = normalizePath(state, target);
      stream.write(columns(dir === "/" ? rootListing : homeListing, state.cols));
      return true;
    }

    case "whoami":
      stream.write(`${state.effectiveUser}\r\n`);
      return true;

    case "hostname":
      stream.write("termix-local\r\n");
      return true;

    case "uname":
      stream.write("Linux termix-local 6.8.0-termix #1 SMP PREEMPT Tue Jun 2 2026 x86_64 GNU/Linux\r\n");
      return true;

    case "uptime":
      stream.write(" 10:43:17 up 2 days,  3:18,  1 user,  load average: 0.08, 0.04, 0.01\r\n");
      return true;

    case "date":
      stream.write(`${new Date().toString()}\r\n`);
      return true;

    case "echo":
      stream.write(`${args.map(stripQuotes).join(" ")}\r\n`);
      return true;

    case "cat":
      if (args[0] === "/etc/os-release") {
        stream.write('PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\r\nNAME="Debian GNU/Linux"\r\nVERSION_ID="12"\r\n');
      } else if (args[0] === "log_prices.sh") {
        stream.write("#!/usr/bin/env bash\r\necho syncing prices\r\n");
      } else {
        stream.write(`cat: ${args[0] || ""}: No such file or directory\r\n`);
      }
      return true;

    case "head":
    case "tail":
      stream.write("2026-06-02T10:42:13Z app started\r\n2026-06-02T10:42:18Z cache warmed\r\n2026-06-02T10:42:29Z ssh login accepted\r\n");
      return true;

    case "ps":
      stream.write(psAux());
      return true;

    case "df":
      stream.write("Filesystem      Size  Used Avail Use% Mounted on\r\n/dev/root        58G   22G   34G  40% /\r\ntmpfs           1.9G     0  1.9G   0% /dev/shm\r\n");
      return true;

    case "du":
      stream.write("4.0K\t./Documents\r\n12K\t./Downloads\r\n28K\t.\r\n");
      return true;

    case "systemctl":
      if (args[0] === "status") {
        stream.write(systemctlStatus(args[1] || "ssh.service"));
      } else if (args[0] === "list-units") {
        stream.write("UNIT                       LOAD   ACTIVE SUB     DESCRIPTION\r\nssh.service                loaded active running OpenSSH server\r\ncertbot.timer              loaded active waiting Run certbot twice daily\r\nnginx.service              loaded active running A high performance web server\r\n");
      } else if (["start", "stop", "restart", "reload", "enable", "disable"].includes(args[0])) {
        stream.write(`${args[0]} ${args[1] || "unit"}: simulated successfully\r\n`);
      } else {
        stream.write("Try: systemctl status ssh.service\r\n");
      }
      return true;

    case "journalctl":
      stream.write(journalLines());
      return true;

    case "git":
      if (args.length === 0 || args[0] === "--help" || args[0] === "help") stream.write(gitHelp());
      else if (args[0] === "status") stream.write("On branch codex/dev/fix-terminal-autocomplete\r\nnothing to commit, working tree clean\r\n");
      else if (args[0] === "log") stream.write("8e2b72d Improve terminal autocomplete behavior\r\n0f18a63 Add autocomplete suggestion descriptions\r\n");
      else stream.write(`git: '${args[0]}' is available in the autocomplete catalog for testing\r\n`);
      return true;

    case "docker":
      if (args[0] === "ps") stream.write(dockerPs());
      else stream.write("Try: docker ps\r\n");
      return true;

    case "ip":
      stream.write(ipAddress());
      return true;

    case "ss":
      stream.write("Netid State  Local Address:Port  Peer Address:Port Process\r\ntcp   LISTEN 0.0.0.0:22          0.0.0.0:*         users:((\"sshd\",pid=641,fd=3))\r\n");
      return true;

    case "ping":
      stream.write("PING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.\r\n64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=12.4 ms\r\n64 bytes from 1.1.1.1: icmp_seq=2 ttl=57 time=12.6 ms\r\n");
      return true;

    case "su":
      state.effectiveUser = "root";
      state.cwd = state.cwd.startsWith("/home/") ? state.cwd : `/home/${state.loginUser}`;
      return true;

    case "sudo":
      return true;

    case "help":
      stream.write("Try: ls, ps aux, git --help, sudo systemctl status certbot.timer, journalctl -u ssh, sudo su, exit\r\n");
      return true;

    default:
      stream.write(`${name}: command not found\r\n`);
      return true;
  }
}

function redraw(stream, state, input, cursor) {
  const prompt = formatPrompt(state);
  stream.write(`\r\x1b[2K${prompt}${input}`);
  const charsRight = input.length - cursor;
  if (charsRight > 0) {
    stream.write(`\x1b[${charsRight}D`);
  }
}

function completionsFor(input) {
  const word = input.split(/\s+/).at(-1) || "";
  const suggestions = [
    "status",
    "start",
    "stop",
    "restart",
    "reload",
    "enable",
    "disable",
    "certbot.timer",
    "ssh.service",
    "nginx.service",
    "git",
    "systemctl",
    "journalctl",
    "docker",
    "log_prices.sh",
    "Documents",
    "Downloads",
  ];
  return suggestions.filter((item) => item.startsWith(word));
}

function attachShell(stream, loginUser, cols) {
  const state = {
    loginUser: loginUser === "root" ? "codex" : loginUser,
    effectiveUser: loginUser,
    cwd: loginUser === "root" ? "/root" : `/home/${loginUser}`,
    history: ["sudo systemctl status certbot.timer", "git status", "ps aux", "sudo su"],
    historyIndex: 4,
    cols: cols || 96,
  };
  let input = "";
  let cursor = 0;

  stream.write("Linux termix-local 6.8.0-termix #1 SMP PREEMPT Tue Jun 2 2026 x86_64\r\n\r\n");
  stream.write("The programs included with the Debian GNU/Linux system are free software.\r\n");
  stream.write("Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY.\r\n");
  stream.write("Last login: Tue Jun  2 10:41:43 2026 from 127.0.0.1\r\n\r\n");
  writePrompt(stream, state);

  stream.on("data", (chunk) => {
    const data = chunk.toString("utf8");
    for (let i = 0; i < data.length; i += 1) {
      const ch = data[i];
      const sequence = data.slice(i, i + 3);

      if (ch === "\x03") {
        input = "";
        cursor = 0;
        stream.write("^C\r\n");
        writePrompt(stream, state);
      } else if (ch === "\r" || ch === "\n") {
        stream.write("\r\n");
        const keepOpen = runCommand(input, stream, state);
        input = "";
        cursor = 0;
        if (keepOpen) writePrompt(stream, state);
      } else if (ch === "\x7f" || ch === "\b") {
        if (cursor > 0) {
          input = `${input.slice(0, cursor - 1)}${input.slice(cursor)}`;
          cursor -= 1;
          redraw(stream, state, input, cursor);
        }
      } else if (ch === "\t") {
        const matches = completionsFor(input);
        if (matches.length > 0) {
          stream.write(`\r\n${columns(matches, state.cols)}`);
          redraw(stream, state, input, cursor);
        }
      } else if (ch === "\x1b" && sequence === "\x1b[A") {
        i += 2;
        if (state.history.length > 0) {
          state.historyIndex = Math.max(0, state.historyIndex - 1);
          input = state.history[state.historyIndex] || "";
          cursor = input.length;
          redraw(stream, state, input, cursor);
        }
      } else if (ch === "\x1b" && sequence === "\x1b[B") {
        i += 2;
        state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
        input = state.history[state.historyIndex] || "";
        cursor = input.length;
        redraw(stream, state, input, cursor);
      } else if (ch === "\x1b" && sequence === "\x1b[C") {
        i += 2;
        if (cursor < input.length) {
          cursor += 1;
          stream.write("\x1b[C");
        }
      } else if (ch === "\x1b" && sequence === "\x1b[D") {
        i += 2;
        if (cursor > 0) {
          cursor -= 1;
          stream.write("\x1b[D");
        }
      } else if (ch >= " " && ch !== "\x7f") {
        input = `${input.slice(0, cursor)}${ch}${input.slice(cursor)}`;
        cursor += 1;
        redraw(stream, state, input, cursor);
      }
    }
  });
}

function execCommand(command) {
  let output = "";
  const stream = {
    write(value) {
      output += value;
    },
    exit() {},
    end() {},
  };
  const state = {
    loginUser: "codex",
    effectiveUser: "codex",
    cwd: "/home/codex",
    history: [],
    historyIndex: 0,
    cols: 96,
  };
  runCommand(command, stream, state);
  return output;
}

const server = new Server({ hostKeys: [ensureHostKey()] }, (client) => {
  let username = "codex";

  client.on("error", (error) => {
    console.warn(`SSH client disconnected during setup: ${error.message}`);
  });

  client.on("authentication", (ctx) => {
    username = USERS.has(ctx.username) ? ctx.username : "codex";
    if (ctx.method === "password" && ctx.password === PASSWORD && USERS.has(ctx.username)) {
      ctx.accept();
      return;
    }
    if (ctx.method === "none" && USERS.has(ctx.username)) {
      ctx.accept();
      return;
    }
    ctx.reject(["password", "none"]);
  });

  client.on("ready", () => {
    client.on("session", (accept) => {
      const session = accept();
      let cols = 96;

      session.on("pty", (acceptPty, _reject, info) => {
        cols = info.cols || cols;
        acceptPty?.();
      });
      session.on("window-change", (acceptChange, _reject, info) => {
        cols = info.cols || cols;
        acceptChange?.();
      });
      session.on("shell", (acceptShell) => {
        const stream = acceptShell();
        attachShell(stream, username, cols);
      });
      session.on("exec", (acceptExec, _reject, info) => {
        const stream = acceptExec();
        stream.write(execCommand(info.command));
        stream.exit(0);
        stream.end();
      });
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Termix local SSH test server listening on ${HOST}:${PORT}`);
  console.log(`Login: codex / ${PASSWORD} (also accepts pi / ${PASSWORD})`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
