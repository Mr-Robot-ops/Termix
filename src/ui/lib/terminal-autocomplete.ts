import {
  TERMINAL_AUTOCOMPLETE_COMMANDS,
  TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND,
  type TerminalAutocompleteHelp,
} from "@/lib/terminal-command-help.ts";

export type { TerminalAutocompleteHelp } from "@/lib/terminal-command-help.ts";

export interface TerminalAutocompleteSettings {
  ghost: boolean;
  popup: boolean;
  popupAuto: boolean;
  help: boolean;
  /** @deprecated Use ghost. Kept so older callers can migrate without breaking. */
  inline: boolean;
}

const MAX_POPUP_AUTOCOMPLETE_SUGGESTIONS = 160;
const MAX_GHOST_AUTOCOMPLETE_SUGGESTIONS = 16;
const MAX_AUTOCOMPLETE_COMMAND_LENGTH = 240;
const LEGACY_AUTOCOMPLETE_KEY = "commandAutocomplete";
const INLINE_AUTOCOMPLETE_KEY = "terminalInlineAutocomplete";
const GHOST_AUTOCOMPLETE_KEY = "terminalAutocompleteGhost";
const POPUP_AUTOCOMPLETE_KEY = "terminalAutocompletePopup";
const POPUP_AUTO_AUTOCOMPLETE_KEY = "terminalAutocompletePopupAuto";
const HELP_AUTOCOMPLETE_KEY = "terminalAutocompleteHelp";
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/;
const PROMPT_PREFIX_RE =
  /^(?:PS\s+[A-Z]:\\.*>|\w[\w.-]*@[\w.-]+(?::[^\s#$>]*)?[$#]|[\w./~-]+[$#>])\s+/i;
const OPTION_SMEAR_RE = /\s-{3,}\S/;
const EXECUTABLE_REPEAT_RE = /([A-Za-z])\1{2,}/;
const ANSI_ESCAPE_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const UNSAFE_AUTOCOMPLETE_RE =
  /\b(?:rm(?:\s+\S+|$)|mkfs(?:\.\w+)?|dd\s+(?:if=|of=)|shutdown|poweroff|reboot|halt|systemctl\s+(?:suspend|hibernate|hybrid-sleep|suspend-then-hibernate)|iptables\s+-F|nft\s+flush|docker\s+system\s+prune|history\s+-c|userdel\s+-r|find\b[^\n]*\s-delete\b|xargs\b[^\n]*\brm\b)\b/i;
const PLACEHOLDER_RE = /(?:<[^>\n]+>|\{\{[^}\n]+\}\})/;
const ENV_ASSIGNMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*=.*/;
const NICE_PRIORITY_RE = /^-\d+$/;
const DUPLICATE_PRIVILEGE_WRAPPERS = new Set(["sudo", "doas"]);
const SUDO_OPTION_ARGUMENTS = new Set([
  "-u",
  "--user",
  "-g",
  "--group",
  "-p",
  "--prompt",
  "-C",
  "--close-from",
]);
const MIN_KNOWN_COMMAND_SUFFIX_LENGTH = 4;
const MIN_SUFFIXLESS_SYSTEMD_UNIT_LENGTH = 4;
const PATHLESS_SCRIPT_EXECUTABLE_RE =
  /^[A-Za-z0-9._+-]+\.(?:sh|bash|zsh|fish|py|pl|rb|js|mjs|cjs)$/i;
const SYSTEMCTL_UNIT_SUBCOMMANDS = new Set([
  "status",
  "start",
  "stop",
  "restart",
  "reload",
  "try-restart",
  "reload-or-restart",
  "enable",
  "disable",
  "is-active",
  "is-enabled",
  "mask",
  "unmask",
]);
const SYSTEMCTL_QUERY_UNIT_SUBCOMMANDS = new Set([
  "cat",
  "is-active",
  "is-enabled",
  "is-failed",
  "list-dependencies",
  "show",
  "status",
]);
const SYSTEMCTL_UNIT_VALUE_SUBCOMMANDS = new Set([
  ...SYSTEMCTL_UNIT_SUBCOMMANDS,
  ...SYSTEMCTL_QUERY_UNIT_SUBCOMMANDS,
]);
const SYSTEMCTL_CATALOG_FIRST_SUBCOMMANDS = new Set([
  "add-requires",
  "add-wants",
  "bind",
  "cancel",
  "cat",
  "clean",
  "daemon-reexec",
  "daemon-reload",
  "disable",
  "edit",
  "enable",
  "get-default",
  "halt",
  "help",
  "hibernate",
  "import-environment",
  "is-active",
  "is-enabled",
  "is-failed",
  "isolate",
  "kill",
  "link",
  "list-dependencies",
  "list-jobs",
  "list-sockets",
  "list-timers",
  "list-unit-files",
  "list-units",
  "mask",
  "poweroff",
  "preset",
  "preset-all",
  "reboot",
  "reenable",
  "reload",
  "reload-or-restart",
  "reset-failed",
  "restart",
  "revert",
  "set-default",
  "set-environment",
  "set-property",
  "show",
  "show-environment",
  "start",
  "status",
  "stop",
  "suspend",
  "switch-root",
  "try-reload-or-restart",
  "try-restart",
  "unmask",
  "unset-environment",
]);
const SYSTEMD_UNIT_SUFFIXES = new Set([
  "automount",
  "device",
  "mount",
  "path",
  "scope",
  "service",
  "slice",
  "socket",
  "swap",
  "target",
  "timer",
]);
const COMMON_SUFFIXLESS_SYSTEMD_UNITS = new Set([
  "apache2",
  "certbot",
  "cron",
  "docker",
  "lightdm",
  "mariadb",
  "mysql",
  "nginx",
  "pihole",
  "pihole-ftl",
  "postgresql",
  "redis",
  "rsyslog",
  "ssh",
  "sshd",
  "ufw",
]);
const COMMON_SERVICE_NAMES = [
  "ssh",
  "sshd",
  "nginx",
  "apache2",
  "docker",
  "cron",
  "ufw",
  "certbot",
  "pihole-FTL",
  "lightdm",
  "mysql",
  "mariadb",
  "postgresql",
  "redis",
  "rsyslog",
];
const COMMON_SYSTEMCTL_STATUS_FLAGS = [
  "--no-pager",
  "--full",
  "-l",
  "--lines=100",
  "--plain",
];
const COMMON_SYSTEMCTL_JOB_FLAGS = [
  "--no-block",
  "--job-mode=replace",
  "--quiet",
];
const COMMON_SERVICE_ACTIONS = [
  "status",
  "restart",
  "reload",
  "start",
  "stop",
  "force-reload",
];
const JOURNALCTL_PRIORITIES = [
  "emerg",
  "alert",
  "crit",
  "err",
  "warning",
  "notice",
  "info",
  "debug",
];
const SYSTEMD_UNIT_TYPES = [
  "service",
  "socket",
  "timer",
  "target",
  "mount",
  "path",
  "automount",
  "swap",
  "slice",
];
const SYSTEMD_UNIT_STATES = [
  "running",
  "active",
  "failed",
  "inactive",
  "loaded",
  "enabled",
  "disabled",
  "exited",
  "dead",
];
const COMMON_APT_PACKAGES = [
  "nginx",
  "apache2",
  "docker.io",
  "docker-compose-plugin",
  "certbot",
  "python3-certbot-nginx",
  "git",
  "curl",
  "wget",
  "htop",
  "tmux",
  "ufw",
  "fail2ban",
  "openssh-server",
  "rsync",
  "jq",
  "ripgrep",
  "net-tools",
  "dnsutils",
  "postgresql",
  "mariadb-server",
  "redis-server",
];
const COMMON_SSH_OPTION_VALUES = [
  "StrictHostKeyChecking=accept-new",
  "ServerAliveInterval=60",
  "ServerAliveCountMax=3",
  "ConnectTimeout=10",
  "IdentitiesOnly=yes",
  "Compression=yes",
  "ForwardAgent=no",
  "UserKnownHostsFile=~/.ssh/known_hosts",
  "LogLevel=ERROR",
];
const COMMON_SSH_PORT_VALUES = [
  "22",
  "2222",
  "2022",
  "2200",
  "8022",
  "10022",
  "22222",
  "222",
];
const COMMON_SSH_KEY_FILES = [
  "~/.ssh/id_ed25519",
  "~/.ssh/id_rsa",
  "~/.ssh/id_ecdsa",
  "~/.ssh/termix",
  "~/.ssh/pi",
  "~/.ssh/deploy",
  "~/.ssh/work",
  "~/.ssh/github",
];
const COMMON_SSH_LOCAL_FORWARDS = [
  "8080:localhost:80",
  "8443:localhost:443",
  "3000:localhost:3000",
  "5173:localhost:5173",
  "8000:localhost:8000",
  "5432:localhost:5432",
  "3306:localhost:3306",
  "6379:localhost:6379",
];
const COMMON_SSH_REMOTE_FORWARDS = [
  "8080:localhost:80",
  "2222:localhost:22",
  "3000:localhost:3000",
  "5173:localhost:5173",
  "8000:localhost:8000",
  "9090:localhost:9090",
  "5432:localhost:5432",
  "6379:localhost:6379",
];
const COMMON_SSH_DYNAMIC_FORWARDS = [
  "1080",
  "localhost:1080",
  "127.0.0.1:1080",
  "1081",
  "localhost:1081",
  "9050",
  "localhost:9050",
  "0.0.0.0:1080",
];
const COMMON_REMOTE_DESTINATIONS = [
  "user@host:/tmp/",
  "pi@raspberrypi.local:/tmp/",
  "root@host:/root/",
  "user@host:/var/www/",
  "user@host:~/",
  "user@host:~/Downloads/",
  "deploy@host:/srv/app/",
  "admin@host:/srv/backups/",
  "pi@raspberrypi.local:/home/pi/",
  "root@host:/etc/",
  "user@host:/opt/",
  "backup@host:/backup/",
];
const COMMON_NETWORK_INTERFACES = [
  "any",
  "eth0",
  "wlan0",
  "lo",
  "docker0",
  "wg0",
  "tailscale0",
];
const COMMON_DEVICE_INTERFACES = COMMON_NETWORK_INTERFACES.filter(
  (interfaceName) => interfaceName !== "any",
);
const COMMON_DNS_QUERY_NAMES = [
  "example.com",
  "localhost",
  "raspberrypi.local",
  "github.com",
  "cloudflare.com",
  "google.com",
];
const COMMON_TLS_ENDPOINTS = [
  "example.com:443",
  "localhost:443",
  "127.0.0.1:443",
  "github.com:443",
  "cloudflare.com:443",
  "google.com:443",
];
const COMMON_GIT_REFS = [
  "main",
  "master",
  "develop",
  "dev",
  "staging",
  "production",
  "release",
  "origin/main",
  "origin/develop",
];
const COMMON_GIT_REMOTES = ["origin", "upstream"];
const COMMON_GIT_REMOTE_COMMANDS = [
  "add origin <url>",
  "set-url origin <url>",
  "remove origin",
  "rename origin upstream",
  "-v",
];
const COMMON_GIT_RESET_MODES = ["--soft", "--mixed", "--merge", "--keep"];
const COMMON_DOCKER_TARGETS = [
  "app",
  "web",
  "api",
  "worker",
  "nginx",
  "db",
  "postgres",
  "mysql",
  "redis",
];
const COMMON_DOCKER_IMAGES = [
  "nginx:latest",
  "alpine:latest",
  "ubuntu:latest",
  "debian:latest",
  "node:22-alpine",
  "python:3.12-slim",
  "postgres:16",
  "mysql:8",
  "redis:7",
];
const COMMON_DOCKER_TAGS = [
  "myapp:latest",
  "termix/app:latest",
  "app:dev",
  "app:latest",
  "web:latest",
];
const COMMON_DOCKER_PORT_MAPS = [
  "8080:80",
  "3000:3000",
  "5173:5173",
  "5432:5432",
  "3306:3306",
  "6379:6379",
  "2222:22",
];
const COMMON_DOCKER_VOLUMES = [
  "$PWD:/app",
  "./data:/data",
  "./config:/config:ro",
  "/var/run/docker.sock:/var/run/docker.sock",
];
const COMMON_DOCKER_ENV = [
  "TZ=Europe/Berlin",
  "NODE_ENV=production",
  "DEBUG=1",
  "POSTGRES_PASSWORD=<password>",
];
const COMMON_DOCKER_RESTART_POLICIES = [
  "unless-stopped",
  "always",
  "on-failure",
  "no",
];
const COMMON_DOCKER_NETWORKS = ["bridge", "host", "none", "app_default"];
const COMMON_DOCKER_COMPOSE_LOG_FLAGS = [
  "-f",
  "--tail=100",
  "--since=1h",
  "--timestamps",
  "--no-color",
];
const COMMON_CONTAINER_COMMANDS = [
  "sh",
  "bash",
  "ash",
  "/bin/sh",
  "/bin/bash",
  "env",
  "printenv",
  "ls -la",
  "cat /etc/os-release",
  "python --version",
  "node --version",
];
const COMMON_ROUTE_TARGETS = [
  "8.8.8.8",
  "1.1.1.1",
  "192.168.1.1",
  "192.168.178.1",
  "10.0.0.1",
  "127.0.0.1",
];
const COMMON_HOST_TARGETS = [
  "example.com",
  "github.com",
  "raspberrypi.local",
  "8.8.8.8",
  "1.1.1.1",
  "192.168.1.1",
  "192.168.178.1",
];
const PING_TARGET_OPTION_ARGUMENTS = new Set([
  "-c",
  "-i",
  "-I",
  "-s",
  "-t",
  "-W",
  "-w",
  "-M",
  "-m",
  "-Q",
]);
const TRACEROUTE_TARGET_OPTION_ARGUMENTS = new Set([
  "-p",
  "-m",
  "-w",
  "-q",
  "-s",
  "-g",
  "-i",
  "-z",
  "-f",
  "-N",
]);
const DIG_TARGET_OPTION_ARGUMENTS = new Set([
  "-b",
  "-k",
  "-p",
  "-y",
]);
const HOST_TARGET_OPTION_ARGUMENTS = new Set([
  "-c",
  "-m",
  "-R",
  "-t",
  "-W",
]);
const NMAP_TARGET_OPTION_ARGUMENTS = new Set([
  "-e",
  "-iL",
  "-oA",
  "-oG",
  "-oN",
  "-oS",
  "-oX",
  "-p",
  "-S",
  "--dns-servers",
  "--exclude",
  "--exclude-file",
  "--script",
  "--script-args",
  "--top-ports",
]);
const COMMON_IP_ROUTE_ADDS = [
  "default via 192.168.1.1",
  "default via 192.168.178.1",
  "192.168.1.0/24 via 192.168.1.1",
  "10.0.0.0/24 via 10.0.0.1",
];
const COMMON_IP_LINK_ACTIONS = [
  "up",
  "down",
  "mtu 1500",
  "promisc on",
  "promisc off",
];
const COMMON_TIME_EXPRESSIONS = [
  "today",
  "yesterday",
  "'1 hour ago'",
  "'2 hours ago'",
  "'10 minutes ago'",
  "'30 minutes ago'",
  "2026-06-01",
];
const COMMON_SMALL_COUNTS = ["1", "3", "4", "5", "10", "20"];
const COMMON_LINE_COUNTS = ["50", "100", "200", "500", "1000"];
const COMMON_FIND_TYPES = ["f", "d", "l", "s", "p"];
const COMMON_FIND_NAME_PATTERNS = [
  "'*.log'",
  "'*.conf'",
  "'*.service'",
  "'*.sh'",
  "'*.txt'",
  "'*.json'",
  "'*.yml'",
  "'*.yaml'",
];
const COMMON_FIND_MTIME_VALUES = ["-1", "+1", "+7", "+14", "+30", "0"];
const COMMON_FIND_SIZE_VALUES = [
  "+1M",
  "+10M",
  "+100M",
  "+1G",
  "-1M",
  "0",
];
const COMMON_FIND_DEPTH_VALUES = ["1", "2", "3", "4", "5"];
const COMMON_FIND_PERM_VALUES = [
  "644",
  "755",
  "600",
  "700",
  "/111",
  "-u+x",
];
const COMMON_FIND_OPTIONS = [
  "-type",
  "-name",
  "-iname",
  "-mtime",
  "-size",
  "-maxdepth",
  "-mindepth",
  "-perm",
  "-user",
  "-group",
  "-empty",
  "-readable",
  "-writable",
  "-executable",
  "-newer",
  "-path",
  "-not",
  "-o",
  "-prune",
  "-print",
  "-print0",
];
const COMMON_CHMOD_MODES = [
  "+x",
  "644",
  "755",
  "600",
  "700",
  "664",
  "775",
  "-R 755",
];
const COMMON_CHOWN_OWNERS = [
  "www-data:www-data",
  "root:root",
  "$USER:$USER",
  "nginx:nginx",
  "docker:docker",
  "pi:pi",
];
const COMMON_USERS = [
  "root",
  "$USER",
  "www-data",
  "nginx",
  "postgres",
  "mysql",
  "pi",
];
const COMMON_LOGINCTL_SESSION_IDS = ["1", "2", "self", "$XDG_SESSION_ID"];
const COMMON_JQ_FILTERS = [
  ".",
  ".[]",
  ".name",
  ".[].name",
  "keys",
  "length",
  "map(.name)",
  "select(.enabled)",
  "to_entries",
];
const COMMON_SSH_KEY_TYPES = ["ed25519", "rsa", "ecdsa"];
const COMMON_SSH_KEY_BITS = ["4096", "3072", "521", "384", "256"];
const COMMON_TAR_DIRECTORIES = [
  ".",
  "./dist",
  "./build",
  "/tmp",
  "/var/www",
  "/opt",
];
const COMMON_GREP_GLOBS = [
  "'*.log'",
  "'*.conf'",
  "'*.service'",
  "'*.sh'",
  "'*.ts'",
  "'*.tsx'",
  "'*.json'",
];
const COMMON_CONTEXT_LINE_COUNTS = ["1", "2", "3", "5", "10", "20"];
const COMMON_UFW_PORTS = [
  "22/tcp",
  "80/tcp",
  "443/tcp",
  "2222/tcp",
  "8080/tcp",
  "53",
];
const COMMON_PORTS = ["22", "80", "443", "2222", "3000", "5432", "3306", "6379", "8080"];
const COMMON_RSYNC_EXCLUDES = [
  "'node_modules/'",
  "'.git/'",
  "'dist/'",
  "'build/'",
  "'*.log'",
  "'*.tmp'",
  "'*.cache'",
];
const COMMON_RSYNC_SSH_COMMANDS = [
  "'ssh -p 2222'",
  "'ssh -i ~/.ssh/id_ed25519'",
  "'ssh -o StrictHostKeyChecking=accept-new'",
  "'ssh -p 22'",
  "'ssh -p 2022'",
  "'ssh -i ~/.ssh/deploy'",
  "'ssh -J bastion'",
  "'ssh -C'",
  "'ssh -o ConnectTimeout=10'",
];
const COMMON_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const COMMON_CURL_HEADERS = [
  "'Accept: application/json'",
  "'Content-Type: application/json'",
  "'Authorization: Bearer <token>'",
  "'User-Agent: Termix'",
  "'Cache-Control: no-cache'",
];
const COMMON_CURL_OUTPUTS = [
  "response.json",
  "headers.txt",
  "download.bin",
  "/tmp/response.json",
];
const COMMON_TLS_SERVER_NAMES = [
  "example.com",
  "localhost",
  "github.com",
  "cloudflare.com",
  "google.com",
];
const COMMON_NMCLI_CONNECTIONS = [
  "'Wired connection 1'",
  "'Home Wi-Fi'",
  "eth0",
  "wlan0",
  "docker0",
];
const COMMON_NMAP_PORTS = [
  "22",
  "80",
  "443",
  "22,80,443",
  "1-1024",
  "3000,5173,8080",
];
const COMMON_DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SRV", "CAA"];
const COMMON_PS_SORT_FIELDS = [
  "-%mem",
  "-%cpu",
  "pid",
  "ppid",
  "user",
  "etime",
  "cmd",
];
const COMMON_SS_FILTERS = [
  "| grep :22",
  "| grep :80",
  "| grep :443",
  "| grep LISTEN",
];
const COMMON_LOG_FILES = [
  "/var/log/syslog",
  "/var/log/auth.log",
  "/var/log/kern.log",
  "/var/log/dpkg.log",
  "/var/log/nginx/error.log",
  "/var/log/nginx/access.log",
  "/var/log/apache2/error.log",
  "/var/log/apache2/access.log",
];
const TEXT_EDITOR_COMMANDS = new Set(["nano", "vim", "vi", "nvim", "micro"]);
const COMMON_EDITABLE_FILES = [
  "~/.bashrc",
  "~/.profile",
  "~/.ssh/config",
  "/etc/ssh/sshd_config",
  "/etc/hosts",
  "/etc/fstab",
  "/etc/nginx/nginx.conf",
  "/etc/nginx/sites-enabled/default",
  "/etc/systemd/system/example.service",
  "docker-compose.yml",
  ".env",
  "README.md",
];
const COMMON_DIRECTORIES = [
  "~",
  ".",
  "..",
  "/tmp",
  "/var/log",
  "/var/www",
  "/etc",
  "/etc/ssh",
  "/etc/nginx",
  "/opt",
  "/srv",
  "/srv/app",
];
const COMMON_FILE_PATHS = [
  "README.md",
  ".env",
  "docker-compose.yml",
  "package.json",
  "config.yml",
  "config.json",
  "/etc/hosts",
  "/etc/fstab",
  "/etc/ssh/sshd_config",
  "/var/log/syslog",
  "/var/log/auth.log",
];
const COMMON_SUFFIXLESS_FILE_NAMES = new Set([
  "authorized_keys",
  "config",
  "crontab",
  "dockerfile",
  "fstab",
  "group",
  "hosts",
  "known_hosts",
  "makefile",
  "passwd",
  "shadow",
  "sshd_config",
  "sudoers",
]);
const DIRECTORY_VALUE_COMMANDS = new Set(["cd", "ls", "mkdir"]);
const FILE_VALUE_COMMANDS = new Set(["cat", "file", "head", "less", "stat"]);
const FILE_SOURCE_COMMANDS = new Set(["cp", "mv"]);
const FILE_TARGET_COMMANDS = new Set(["chmod", "chgrp", "chown"]);
const PATH_OPTION_ARGUMENTS = new Set([
  "-C",
  "-I",
  "-S",
  "-T",
  "-b",
  "-c",
  "-f",
  "-g",
  "-m",
  "-o",
  "-t",
  "-u",
  "--backup",
  "--context",
  "--format",
  "--group",
  "--mode",
  "--owner",
  "--reference",
  "--suffix",
  "--target-directory",
  "--time-style",
]);
const COMMON_PRIVILEGED_COMMAND_STARTERS = [
  "systemctl",
  "journalctl",
  "service",
  "apt",
  "apt-get",
  "apt-cache",
  "apt update",
  "apt install <package>",
  "apt upgrade",
  "apt autoremove",
  "apt-cache policy <package>",
  "dpkg -s <package>",
  "nano",
  "vim",
  "tcpdump -i <interface>",
  "ss -tulpn",
  "lsof -i :<port>",
  "ufw status",
  "tail -f /var/log/syslog",
  "less /var/log/syslog",
  "find /var/log -type f -name '*.log'",
];

type TerminalAutocompleteMode = "ghost" | "popup";

interface TerminalAutocompleteMatchOptions {
  limit?: number;
  mode?: TerminalAutocompleteMode;
  systemdUnits?: string[];
}

export type TerminalAutocompleteSource = "catalog" | "history";

interface TerminalAutocompleteContext {
  typedCommand: string;
  matchCommand: string;
  prefix: string;
}

export interface TerminalAutocompleteMatch {
  command: string;
  source: TerminalAutocompleteSource;
}

const TERMINAL_AUTOCOMPLETE_PRIORITY: Record<string, string[]> = {
  "docker compose": [
    "up",
    "up -d",
    "down",
    "ps",
    "logs",
    "exec",
    "build",
    "pull",
    "restart",
    "stop",
    "start",
    "config",
  ],
  docker: [
    "ps",
    "logs",
    "exec",
    "images",
    "pull",
    "run",
    "build",
    "stop",
    "restart",
    "inspect",
    "compose",
  ],
  git: [
    "status",
    "add",
    "add -a",
    "commit",
    "checkout",
    "switch",
    "pull",
    "push",
    "fetch",
    "clone",
    "init",
    "diff",
    "log",
    "show",
    "branch",
    "stash",
    "remote",
    "restore",
    "reset",
    "rebase",
    "merge",
    "tag",
    "revert",
    "cherry-pick",
    "worktree",
    "worktree list",
    "worktree add",
    "worktree remove",
    "submodule",
    "submodule status",
    "submodule update",
    "config",
    "config --list",
    "config user.name",
    "config user.email",
    "clean",
    "clean -n",
    "clean -i",
    "blame",
    "describe",
    "ls-files",
    "ls-remote",
    "reflog",
    "rev-parse",
    "shortlog",
    "archive",
  ],
  journalctl: [
    "-u",
    "-f",
    "-n",
    "-e",
    "-b",
    "-k",
    "-p",
    "--since",
    "--until",
    "--no-pager",
    "-o",
  ],
  ls: [
    "-a",
    "-la",
    "-l",
    "-lh",
    "-h",
    "-R",
    "-t",
    "-r",
    "-S",
    "-A",
    "-d",
  ],
  pwd: [
    "-P",
    "--physical",
    "-L",
    "--logical",
    "| cat",
    "| tr -d '\\n'",
    "| xargs basename",
    "| xargs dirname",
    "| tee cwd.txt",
    "| awk -F/ '{print $NF}'",
    "> cwd.txt",
  ],
  basename: [
    "/var/log/syslog",
    "/path/file.txt .txt",
    "-s .log /var/log/syslog",
    "-a /etc/passwd /etc/hosts",
    "--suffix=.tar.gz archive.tar.gz",
    "-z /tmp/file",
    "/srv/app/releases/current",
    "-a /var/log/syslog /var/log/auth.log",
    "--multiple /etc/passwd /etc/group",
    "--zero /tmp/file",
    "-a",
    "-s",
    "--suffix",
    "--zero",
  ],
  dirname: [
    "/var/log/syslog",
    "./path/to/file.txt",
    "/etc/nginx/nginx.conf",
    "~/.ssh/config",
    "/srv/app/releases/current",
    "/tmp/archive.tar.gz",
    "-z /tmp/file",
    "--zero /tmp/file",
    "/srv/app/releases/current",
    "/etc/systemd/system/ssh.service",
    "-z /tmp/file | xargs -0 printf '%s\\n'",
    "-z",
    "--zero",
  ],
  more: [
    "/var/log/syslog",
    "file.txt",
    "-d file.txt",
    "-f file.txt",
    "-20 file.txt",
    "+20 file.txt",
    "+/error /var/log/syslog",
    "-s",
    "-u",
  ],
  tee: [
    "-a",
    "--append",
    "file.txt",
    "-a file.txt",
    "/tmp/check.txt",
    "status.txt",
    "file1.log file2.log",
    "--output-error",
    "--output-error=warn",
    "--output-error=exit",
  ],
  printf: [
    "'%s\\n' hello",
    "'%04d\\n' 42",
    "'%s=%s\\n' KEY value",
    "'%q\\n' \"$PATH\"",
    "'%b\\n' 'line1\\nline2'",
    "'%(%F %T)T\\n' -1",
    "'%s\\0' file1 file2",
    "'%-20s %s\\n' name value",
    "%s",
    "%q",
  ],
  export: [
    "PATH=$PATH:/opt/bin",
    "EDITOR=nano",
    "NODE_ENV=production",
    "LANG=C.UTF-8",
    "TERM=xterm-256color",
    "PAGER=less",
    "DEBUG=1",
    "TZ=UTC",
    "HISTCONTROL=ignoredups",
    "-p",
    "-n",
  ],
  unset: [
    "VAR",
    "NODE_ENV",
    "SSH_AUTH_SOCK",
    "DEBUG",
    "EDITOR",
    "PAGER",
    "GPG_TTY",
    "HISTFILE",
    "-v",
    "-f",
  ],
  alias: [
    "ll='ls -lah'",
    "gs='git status'",
    "ga='git add'",
    "gp='git pull'",
    "dc='docker compose'",
    "grep='grep --color=auto'",
    "ports='ss -tulpn'",
    "..='cd ..'",
    "path='printf %s\\n \"$PATH\"'",
    "serve='python -m http.server'",
    "k='kubectl'",
    "-p",
  ],
  unalias: [
    "ll",
    "gs",
    "ga",
    "gp",
    "dc",
    "grep",
    "ports",
    "k",
    "serve",
    "path",
    "-a",
  ],
  history: [
    "20",
    "100",
    "| grep ssh",
    "| grep systemctl",
    "| tail -n 50",
    "| less",
    "-w",
    "-r",
    "-d",
    "-a",
    "-n",
  ],
  which: [
    "python",
    "node",
    "docker",
    "systemctl",
    "bash",
    "npm",
    "ssh",
    "-a sh",
    "-a python",
    "-a",
  ],
  type: [
    "cd",
    "alias",
    "export",
    "history",
    "-a python",
    "-t systemctl",
    "-p bash",
    "-P sh",
    "-a",
    "-t",
  ],
  command: [
    "-v docker",
    "-v systemctl",
    "-V cd",
    "-V history",
    "-p env",
    "ls -la",
    "-v bash",
    "-v node",
    "-v npm",
    "-v",
    "-V",
  ],
  sed: [
    "'s/foo/bar/g' file.txt",
    "-i 's/foo/bar/g' file.txt",
    "-n '1,20p' file.txt",
    "-n '/error/p' /var/log/syslog",
    "-E 's/[0-9]+/NUM/g' file.txt",
    "-n '10,20p' file.txt",
    "'/^#/d' config.conf",
    "-e",
    "-f",
    "-n",
    "-i",
  ],
  cut: [
    "-d ':' -f 1 /etc/passwd",
    "-d ':' -f 1,3 /etc/passwd",
    "-d ',' -f 1,2 data.csv",
    "-f 1 file.tsv",
    "-c 1-10 file.txt",
    "-b 1-16 file.bin",
    "--complement",
    "--output-delimiter",
    "-d",
    "-f",
  ],
  tr: [
    "a-z A-Z",
    "-d '\\r' < windows.txt > unix.txt",
    "-s ' ' < file.txt",
    "'[:lower:]' '[:upper:]' < file.txt",
    "-d '[:digit:]' < file.txt",
    "-cd '[:print:]\\n' < file.txt",
    "-s '\\n' < file.txt",
    "'\\t' ',' < table.tsv",
    "-d",
    "-s",
  ],
  wc: [
    "-l file.txt",
    "-w file.txt",
    "-c file.txt",
    "-m file.txt",
    "-L file.txt",
    "-l *.log",
    "-l",
    "--lines",
    "-w",
    "--words",
  ],
  uniq: [
    "file.txt",
    "-c",
    "-d",
    "-u",
    "-i names.txt",
    "-c access.log | sort -nr",
    "-f 1 data.txt",
    "-s 4 data.txt",
    "--count",
    "--repeated",
  ],
  base64: [
    "file.bin",
    "-d encoded.txt",
    "--decode encoded.txt",
    "-w 0 file.bin",
    "--wrap 76 file.bin",
    "-i dirty.txt",
    "-d encoded.txt > decoded.bin",
    "--ignore-garbage -d dirty.txt",
    "--wrap 0 file.bin",
    "-d",
    "--decode",
    "-w",
    "--wrap",
  ],
  split: [
    "-l 1000 big.log part-",
    "-b 100M archive.tar archive.part.",
    "-d -a 3 file chunk-",
    "-n 4 bigfile chunk-",
    "-C 10M access.log access.part.",
    "--filter='gzip > $FILE.gz' big.log part-",
    "--additional-suffix=.txt -l 500 file part-",
    "-x -a 2 file chunk-",
  ],
  awk: [
    "'{print $1}' file.txt",
    "-F ':' '{print $1}' /etc/passwd",
    "'NF {print}' file.txt",
    "'{sum += $1} END {print sum}' numbers.txt",
    "-F, 'NR>1 {print $2}' data.csv",
    "length($0) > 120 file.txt",
    "-v limit=10 '$1 > limit {print}' data.txt",
    "-f script.awk data.txt",
  ],
  zip: [
    "archive.zip file.txt",
    "-r archive.zip ./dir",
    "-r archive.zip ./dir -x '*.git*'",
    "-9 archive.zip large-file.bin",
    "-u archive.zip changed.txt",
    "-d archive.zip old.txt",
    "-r -q archive.zip ./dir",
    "-r encrypted.zip ./secrets -e",
  ],
  unzip: [
    "archive.zip",
    "archive.zip -d /tmp",
    "-l archive.zip",
    "-t archive.zip",
    "-q archive.zip -d /tmp/out",
    "-n archive.zip",
    "-o archive.zip",
    "archive.zip '*.txt'",
    "-p archive.zip file.txt",
    "-Z1 archive.zip",
  ],
  zcat: [
    "file.log.gz",
    "file.log.gz | less",
    "file.log.gz | grep error",
    "-f maybe.log",
    "-l file.log.gz",
    "file.log.gz | head",
    "file.log.gz | tail",
    "file.log.gz | wc -l",
    "*.log.gz | grep -i error",
  ],
  cmp: [
    "file-a file-b",
    "-s file-a file-b",
    "-l file-a file-b",
    "-b file-a file-b",
    "--quiet file-a file-b",
    "--print-bytes file-a file-b",
    "-i",
    "-n",
    "-s",
    "-l",
  ],
  column: [
    "-t table.txt",
    "-t -s ':' /etc/passwd",
    "-N USER,UID,SHELL -t users.tsv",
    "-o ' | ' -t table.txt",
    "-s, -t",
    "-t",
    "--table",
    "-s",
    "-N",
    "-o",
  ],
  nl: [
    "file.txt",
    "-ba file.txt",
    "-bt file.txt",
    "-w1 -s': ' file.txt",
    "-n rz -w3 file.txt",
    "-v 100 file.txt",
    "-i 10 file.txt",
    "-b",
    "-n",
    "-w",
  ],
  paste: [
    "names.txt values.txt",
    "-d ',' a.txt b.txt",
    "-s file.txt",
    "-d ':' users.txt shells.txt",
    "-d '\\t' col1.txt col2.txt",
    "-s -d ',' file.txt",
    "-z names.txt values.txt",
    "-d",
    "-s",
    "-z",
  ],
  seq: [
    "5",
    "1 10",
    "1 2 10",
    "-w 001 010",
    "-s ',' 1 5",
    "-f 'host%02g' 1 5",
    "10 -1 1",
    "0 .5 2",
    "--equal-width 1 12",
    "-w",
  ],
  yes: [
    "y | head",
    "n | head",
    "'test' | head",
    "| head -n 5",
    "'' | head -n 3",
    "ok | head -n 10",
    "n | command",
    "--help",
    "--version",
  ],
  printenv: [
    "PATH",
    "HOME",
    "SHELL",
    "USER",
    "LANG",
    "HOME SHELL",
    "| sort",
    "| grep PATH",
    "-0",
    "--null",
  ],
  whereis: [
    "nginx",
    "bash",
    "python",
    "systemctl",
    "-b bash",
    "-m systemctl",
    "-s bash",
    "-u nginx",
    "-B /usr/bin -f bash",
    "-M /usr/share/man -f systemctl",
  ],
  cp: ["-r", "-R", "-a", "-v", "-i", "-n", "-u", "-p", "-L", "-P"],
  mv: ["-v", "-i", "-n", "-f", "-u", "--backup"],
  mkdir: ["-p", "-v", "-m", "--parents", "--mode"],
  rg: [
    "todo",
    "-n",
    "-g",
    "--files",
    "-i",
    "-S",
    "-t",
    "--hidden",
    "--no-ignore",
    "-C",
  ],
  ncdu: [
    "/var/log",
    "-x",
    "/",
    "--one-file-system",
    "-r",
    "--read-only",
    "--exclude",
  ],
  findmnt: [
    "/",
    "-t ext4",
    "-J",
    "-R /",
    "-T /var/log",
    "-S /dev/sda1",
    "-o TARGET,SOURCE,FSTYPE,OPTIONS",
    "--df",
    "--fstab",
  ],
  hostname: [
    "-f",
    "-I",
    "-A",
    "-s",
    "-i",
    "-d",
    "--fqdn",
    "--all-ip-addresses",
    "--all-fqdns",
  ],
  "ssh-agent": [
    "-s",
    "-c",
    "-k",
    "-t 1h",
    "-a /tmp/ssh-agent.sock",
    "sh",
    "-s > agent.env",
    "-t 8h bash",
    "-E sha256 bash",
    "-D",
    "-d",
    "bash",
  ],
  mtr: [
    "example.com",
    "-rw -c 100 example.com",
    "-T -P 443 example.com",
    "-n 8.8.8.8",
    "-6 example.com",
    "-u -P 53 example.com",
    "--json example.com",
    "--csv example.com",
  ],
  iftop: [
    "-i eth0",
    "-P -n",
    "-i wlan0 -B",
    "-F 192.168.1.0/24",
    "-f 'port 443'",
    "-t -s 10",
    "-nN",
    "-i",
    "-P",
    "-n",
  ],
  nload: [
    "eth0",
    "wlan0",
    "-m",
    "-u M -t 500 eth0",
    "-U M eth0",
    "-a 30 eth0",
    "-i 10000 -o 10000 eth0",
  ],
  uptime: [
    "-p",
    "-s",
    "--pretty",
    "--since",
    "| awk -F'load average:' '{print $2}'",
    "| cut -d, -f1",
    "| sed 's/.*load average: //'",
    "| tr -s ' '",
    "| awk '{print $3,$4,$5}'",
  ],
  pgrep: [
    "-af python",
    "-u www-data",
    "-x sshd",
    "-n node",
    "-o bash",
    "-P 1",
    "-d ',' nginx",
    "-c sshd",
    "-l systemd",
  ],
  watch: [
    "-n 1 date",
    "-d 'df -h'",
    "-n 2 'systemctl status ssh'",
    "-c 'systemctl --failed'",
    "-t 'uptime'",
    "-n 5 'free -h'",
    "-x date",
    "--differences=cumulative 'ss -tulpn'",
  ],
  vmstat: ["1", "1 5", "-s", "-d", "-w 1", "-S M 1", "-a", "-t 1"],
  iostat: [
    "-xz 1",
    "-p ALL",
    "-m 1 5",
    "-d sda 1",
    "-c 1",
    "-h",
    "-y 1",
  ],
  lscpu: [
    "-J",
    "--extended",
    "-e=CPU,CORE,SOCKET,NODE,ONLINE",
    "-p",
    "-C",
    "--online",
    "--offline",
  ],
  lspci: ["-nn", "-k", "-tv", "-vv", "-s 00:1f.3", "-d 8086:", "-mm"],
  lsusb: [
    "-t",
    "-v",
    "-d 1d6b:",
    "-d 1d6b:0002",
    "-s 001:002",
    "-D /dev/bus/usb/001/002",
    "-v | less",
  ],
  lsmod: [
    "| grep usb",
    "| grep bluetooth",
    "| sort -k3 -nr",
    "| head",
    "| less",
    "| awk '{print $1}'",
    "| grep '^snd'",
    "| column -t",
    "| wc -l",
    "| sort",
  ],
  modinfo: [
    "overlay",
    "-F filename overlay",
    "-p module_name",
    "-d overlay",
    "-n overlay",
    "-a overlay",
    "-l overlay",
    "--field vermagic overlay",
  ],
  hostnamectl: [
    "status",
    "hostname",
    "chassis",
    "deployment",
    "location",
    "--json pretty status",
    "--no-pager status",
    "set-hostname server01",
  ],
  timedatectl: [
    "status",
    "show",
    "list-timezones",
    "timesync-status",
    "show-timesync",
    "--property Timezone --value show",
    "set-timezone Europe/Berlin",
    "set-ntp true",
  ],
  "systemd-cgls": [
    "--user",
    "--system",
    "--all",
    "--unit ssh.service",
    "--unit dbus.service",
    "/system.slice/ssh.service",
    "--no-pager",
    "--machine <name>",
    "--machine .host",
    "--full",
    "--no-legend",
  ],
  "systemd-cgtop": [
    "--depth=2",
    "--order=memory",
    "--order=cpu",
    "--iterations=5 --batch",
    "--user",
    "--system",
    "--recursive",
  ],
  "systemd-analyze": [
    "time",
    "blame",
    "critical-chain",
    "plot > boot.svg",
    "dot --order > boot.dot",
    "verify /etc/systemd/system/app.service",
    "security ssh.service",
    "calendar 'Mon *-*-* 09:00'",
  ],
  readlink: [
    "-f ./path",
    "-e /etc/alternatives/editor",
    "-m missing/path",
    "-n symlink",
    "/proc/self/exe",
    "--canonicalize",
    "--canonicalize-existing",
  ],
  realpath: [
    ".",
    "file.txt",
    "-e /etc/passwd",
    "-m missing/path",
    "--relative-to /var /var/log/syslog",
    "--relative-base=/srv /srv/app/config.yml",
    "-s symlink",
  ],
  touch: [
    "file.txt",
    "-c existing.txt",
    "-a access.log",
    "-m modified.log",
    "-t 202606030900 release.txt",
    "-r reference.txt target.txt",
    "--date='1 hour ago' file.txt",
  ],
  tail: [
    "-n 100 /var/log/syslog",
    "-f /var/log/app.log",
    "-F /var/log/app.log",
    "-n +20 file.txt",
    "-c 1K file.bin",
    "--pid 1234 -f /var/log/app.log",
    "--retry -F /var/log/app.log",
  ],
  timeout: [
    "10s ping 8.8.8.8",
    "5s curl https://example.com",
    "-k 5s 1m long-command",
    "--preserve-status 30s script.sh",
    "--signal=TERM 10s command",
    "--foreground 30s ssh host",
    "-v 5s command",
  ],
  sha256sum: [
    "file.iso",
    "-c checksums.txt",
    "--tag file.iso",
    "--status -c checksums.txt",
    "--ignore-missing -c checksums.txt",
    "--quiet -c checksums.txt",
    "--binary file.iso",
  ],
  sha1sum: [
    "file.iso",
    "-c checksums.txt",
    "--tag file.iso",
    "--status -c checksums.txt",
    "--ignore-missing -c checksums.txt",
    "--binary file.iso",
  ],
  md5sum: [
    "file.iso",
    "-c checksums.txt",
    "--tag file.iso",
    "--status -c checksums.txt",
    "--ignore-missing -c checksums.txt",
    "--binary file.iso",
  ],
  hexdump: [
    "-C file.bin",
    "-C -n 128 file.bin",
    "-C -s 512 file.bin",
    "-n 64 file.bin",
    "-v file.bin",
    "-x file.bin",
  ],
  xxd: [
    "file.bin",
    "-l 64 file.bin",
    "-g 1 file.bin",
    "-c 16 file.bin",
    "-s 128 file.bin",
    "-p file.bin",
    "-i file.bin",
  ],
  vnstat: ["-i", "-l", "-d", "-m", "-h", "-5", "--json"],
  iperf3: ["-s", "-c", "-R", "-P", "-t", "-p", "-u", "-b", "-J"],
  npm: [
    "install",
    "ci",
    "run dev",
    "run build",
    "test",
    "start",
    "run start",
    "run",
    "outdated",
    "audit",
    "list",
  ],
  pnpm: [
    "install",
    "add",
    "run dev",
    "run build",
    "test",
    "build",
    "start",
    "run",
    "dlx",
    "outdated",
  ],
  yarn: [
    "install",
    "add",
    "run",
    "dev",
    "build",
    "test",
    "start",
    "dlx",
    "outdated",
  ],
  node: [
    "server.js",
    "--watch",
    "--test",
    "-e",
    "-p",
    "-r",
    "--inspect",
    "--version",
  ],
  python: [
    "-m venv",
    "-m pip",
    "-m pip install",
    "-m http.server",
    "-m pytest",
    "script.py",
    "-c",
    "-V",
  ],
  python3: [
    "-m venv",
    "-m pip",
    "-m pip install",
    "-m http.server",
    "-m pytest",
    "script.py",
    "-c",
    "-V",
  ],
  pip: [
    "install",
    "install -r",
    "install --upgrade",
    "list",
    "show",
    "freeze",
    "check",
    "cache dir",
  ],
  pip3: [
    "install",
    "install -r",
    "install --upgrade",
    "list",
    "show",
    "freeze",
    "check",
    "cache dir",
  ],
  make: ["build", "test", "install", "clean", "lint", "run", "help", "-j", "-C"],
  kubectl: [
    "get pods",
    "get services",
    "get deployments",
    "get namespaces",
    "get nodes",
    "describe pod",
    "logs",
    "logs -f",
    "exec -it",
    "rollout status",
    "rollout restart",
    "apply -f",
    "diff -f",
    "config get-contexts",
  ],
  helm: [
    "list",
    "status",
    "upgrade --install",
    "install",
    "upgrade",
    "repo add",
    "repo update",
    "history",
    "rollback",
    "show values",
    "dependency update",
    "template",
    "lint",
  ],
  terraform: [
    "init",
    "plan",
    "plan -out",
    "plan -out tfplan",
    "validate",
    "fmt",
    "fmt -check",
    "output",
    "state list",
    "workspace list",
    "workspace show",
    "show",
    "providers",
    "version",
    "apply",
  ],
  ansible: [
    "all -m ping",
    "all --list-hosts",
    "web -a uptime",
    "-i",
    "-m",
    "-a",
    "-u",
    "-b",
    "--check",
    "--diff",
    "-l",
  ],
  "ansible-playbook": [
    "site.yml --check",
    "site.yml --diff",
    "site.yml --syntax-check",
    "site.yml",
    "-i",
    "--limit",
    "--tags",
    "--list-hosts",
    "--list-tasks",
    "--list-tags",
    "--check",
    "--diff",
  ],
  "ansible-inventory": [
    "--list",
    "--graph",
    "-i",
    "--host",
    "--yaml",
    "--vars",
    "--export",
  ],
  aws: [
    "sts get-caller-identity",
    "configure list",
    "s3 ls",
    "s3 sync",
    "ec2 describe-instances",
    "logs tail",
    "eks list-clusters",
    "eks update-kubeconfig",
    "lambda list-functions",
    "cloudformation describe-stacks",
  ],
  gcloud: [
    "auth list",
    "config list",
    "projects list",
    "compute instances list",
    "compute ssh",
    "container clusters list",
    "container clusters get-credentials",
    "logging read",
    "logging tail",
    "services list",
  ],
  az: [
    "account show",
    "account list",
    "group list",
    "vm list",
    "aks list",
    "aks get-credentials",
    "webapp list",
    "webapp log tail",
    "storage account list",
    "role assignment list",
  ],
  psql: [
    "-h",
    "-U",
    "-d",
    "-c",
    "-f",
    "-l",
    "\\dt",
    "\\d",
    "-A",
    "-t",
  ],
  pg_dump: [
    "-h",
    "-U",
    "-d",
    "-f",
    "-Fc",
    "--schema-only",
    "--data-only",
    "--no-owner",
    "--no-acl",
  ],
  pg_restore: [
    "-l",
    "-d",
    "-j",
    "--schema-only",
    "--data-only",
    "--no-owner",
    "--no-acl",
  ],
  mysql: [
    "-h",
    "-u",
    "-p",
    "-D",
    "-e",
    "SHOW DATABASES",
    "--ssl-mode",
    "--batch",
    "--table",
  ],
  mariadb: [
    "-h",
    "-u",
    "-p",
    "-D",
    "-e",
    "SHOW DATABASES",
    "--ssl-mode",
    "--batch",
    "--table",
  ],
  mysqldump: [
    "--single-transaction",
    "--routines",
    "--triggers",
    "--events",
    "--databases",
    "--no-data",
    "--quick",
    "-h",
    "-u",
    "-p",
  ],
  sqlite3: [
    "app.db",
    ".tables",
    ".schema",
    ".dump",
    "-readonly",
    "-header",
    "-column",
    "-json",
    "-csv",
  ],
  "redis-cli": [
    "ping",
    "info",
    "--scan",
    "dbsize",
    "slowlog get",
    "monitor",
    "-h",
    "-p",
    "-n",
  ],
  mongosh: [
    "mongodb://localhost:27017/app",
    "--eval",
    "--host",
    "--port",
    "--username",
    "--authenticationDatabase",
    "--file",
    "--quiet",
  ],
  groups: [
    "$USER",
    "username",
    "www-data",
    "deploy",
    "docker",
    "git",
    "nginx",
    "apache",
    "postgres",
    "mysql",
    "redis",
  ],
  useradd: [
    "-m -s /bin/bash username",
    "-m -G sudo username",
    "-m -d /home/deploy deploy",
    "-r -s /usr/sbin/nologin app",
    "-m",
    "-s",
    "-G",
    "-g",
    "-d",
    "-u",
    "-c",
    "-r",
    "--system",
    "-U",
    "-N",
  ],
  usermod: [
    "-aG sudo username",
    "-aG docker username",
    "-s /bin/bash username",
    "-d /home/deploy -m deploy",
    "-L username",
    "-U username",
    "-e 2026-12-31 username",
    "-aG",
    "-G",
    "-s",
    "-d",
    "-m",
    "-L",
    "-U",
    "-e",
    "-c",
  ],
  chage: [
    "-l username",
    "-d 0 username",
    "-M 90 -W 14 username",
    "-E 2026-12-31 username",
    "-I 30 username",
    "-l",
    "--list",
    "-d",
    "-E",
    "-M",
    "-m",
    "-W",
    "-I",
  ],
  groupadd: [
    "developers",
    "-g 1500 app",
    "-r servicegroup",
    "-f developers",
    "-g",
    "--gid",
    "-r",
    "--system",
    "-f",
    "--force",
    "-K",
    "--key",
  ],
  groupmod: [
    "-n newname oldname",
    "--new-name app app-old",
    "-g 1501 developers",
    "-o -g 1501 legacy",
    "-n",
    "--new-name",
    "-g",
    "--gid",
    "-o",
    "--non-unique",
    "-p",
  ],
  visudo: [
    "-c",
    "-c -f /etc/sudoers.d/app",
    "-f /etc/sudoers.d/app",
    "-s",
    "-q -c",
    "--check",
    "--file",
    "--strict",
    "-V",
    "--version",
    "-h",
    "--help",
  ],
  crontab: [
    "-l",
    "-e",
    "-u www-data -l",
    "-u root -e",
    "-l > crontab.backup",
    "crontab.backup",
    "-T crontab.backup",
    "-u",
    "-i",
    "-r",
    "-u root -l",
    "-",
  ],
  nginx: [
    "-t",
    "-T",
    "-s reload",
    "-s reopen",
    "-q -t",
    "-c /etc/nginx/nginx.conf -t",
    "-V",
    "-v",
    "-c",
    "-g",
    "-g \"daemon off;\"",
    "-p",
    "-e",
    "-s quit",
  ],
  apachectl: [
    "configtest",
    "-S",
    "-M",
    "status",
    "graceful",
    "-t",
    "fullstatus",
    "-k graceful",
  ],
  apache2ctl: [
    "configtest",
    "-S",
    "-M",
    "status",
    "graceful",
    "-t",
    "fullstatus",
    "-k graceful",
  ],
  certbot: [
    "certificates",
    "renew --dry-run",
    "renew",
    "plugins",
    "certonly --nginx -d",
    "certonly --webroot -w",
    "install --nginx",
    "--dry-run",
    "--staging",
  ],
  supervisorctl: [
    "status",
    "tail",
    "tail -f",
    "restart",
    "reread",
    "update",
    "start",
    "-c",
  ],
  pm2: [
    "list",
    "status",
    "logs",
    "logs --lines",
    "monit",
    "describe",
    "start app.js --name",
    "restart",
    "reload",
    "save",
    "startup",
  ],
  lsblk: [
    "-f",
    "-o NAME,SIZE,FSTYPE,MOUNTPOINT,UUID",
    "-J",
    "-p",
    "-d -o NAME,MODEL,SIZE,ROTA",
    "-o",
    "-a",
    "-b",
    "-d",
    "-n",
    "-r",
    "-S",
    "-D",
    "-x",
  ],
  blkid: [
    "/dev/sda1",
    "-o export /dev/sda1",
    "-s UUID /dev/sda1",
    "-L data",
    "-U <uuid>",
    "-p /dev/sda1",
    "-t TYPE=ext4",
    "-o",
    "-s",
    "-p",
    "-l",
    "-c /dev/null",
    "-g",
  ],
  mount: [
    "| column -t",
    "| grep /mnt",
    "/dev/sdb1 /mnt",
    "-t nfs server:/share /mnt",
    "-o ro /dev/sdb1 /mnt",
    "-o remount,rw /",
    "--bind /srv/data /mnt/data",
    "-t tmpfs tmpfs /mnt",
    "-t",
    "-o",
    "-o ro",
    "-o remount",
    "--bind",
    "-L",
    "-U",
    "-v",
  ],
  umount: [
    "/mnt",
    "-l /mnt",
    "-v /mnt",
    "/dev/sdb1",
    "--recursive /mnt",
    "-l",
    "--lazy",
    "-v",
    "--verbose",
    "-R",
    "--recursive",
    "-f",
  ],
  free: [
    "-h",
    "-w -h",
    "-h -s 2",
    "-m",
    "-g",
    "--si",
    "--mega",
    "--giga",
    "-t",
    "--total",
    "-s",
    "--seconds",
    "-c",
    "--count",
    "-w",
    "--wide",
  ],
  dmesg: [
    "-T",
    "-w",
    "-T --level=err,warn",
    "-H",
    "--facility=kern",
    "--ctime",
    "--follow",
    "--human",
    "-l",
    "--level",
    "--level=err,warn",
    "-x",
    "--decode",
    "-e",
    "--reltime",
    "-P",
  ],
  sysctl: [
    "-a",
    "net.ipv4.ip_forward",
    "vm.swappiness",
    "-n kernel.hostname",
    "-p /etc/sysctl.conf",
    "-w net.ipv4.ip_forward=1",
    "-n",
    "-w",
    "-p",
    "--load",
    "-e",
    "-N",
    "-q",
    "-r",
  ],
  "update-alternatives": [
    "--display editor",
    "--config java",
    "--list editor",
    "--set editor /usr/bin/vim",
    "--auto editor",
    "--query editor",
    "--get-selections",
    "--install /usr/bin/editor editor /usr/bin/vim 100",
    "--display",
    "--config",
    "--list",
    "--set",
    "--auto",
    "--query",
    "--verbose",
  ],
  df: [
    "-h",
    "-hT",
    "-ih",
    "-h /var/log",
    "-x tmpfs -x devtmpfs",
    "--total -h",
    "-T",
    "-i",
    "-a",
    "-x",
    "--total",
    "--output",
    "--local",
    "-P",
  ],
  du: [
    "-sh *",
    "-sh /var/log",
    "-h --max-depth=1 /var",
    "-ah /var/log | sort -h",
    "-xhd1 /",
    "--exclude node_modules -sh .",
    "-h",
    "-s",
    "-a",
    "-c",
    "-d",
    "--max-depth",
    "--exclude",
    "-x",
    "--one-file-system",
  ],
  nslookup: [
    "example.com",
    "example.com 1.1.1.1",
    "-type=MX example.com",
    "-type=TXT example.com",
    "-type=AAAA example.com",
    "-type=NS example.com",
    "-debug example.com",
    "-port=5353 example.com 127.0.0.1",
    "-type=A",
    "-type=MX",
    "-type=TXT",
    "-timeout",
    "-retry",
  ],
  tracepath: [
    "example.com",
    "-n 8.8.8.8",
    "-b example.com",
    "-m 20 example.com",
    "-l 1200 example.com",
    "-n",
    "-b",
    "-l",
    "-m",
    "-4",
    "-6",
    "-V",
  ],
  iw: [
    "dev",
    "dev wlan0 link",
    "dev wlan0 scan",
    "dev wlan0 station dump",
    "dev wlan0 info",
    "dev wlan0 set power_save off",
    "reg get",
    "reg set DE",
    "list",
    "event",
    "phy",
    "dev wlan0 survey dump",
  ],
  nft: [
    "list ruleset",
    "list tables",
    "list table inet filter",
    "list chain inet filter input",
    "list counters",
    "--check -f rules.nft",
    "-a list ruleset",
    "-n list ruleset",
    "monitor",
    "monitor trace",
    "-a",
    "--handle",
    "-n",
    "--numeric",
    "-c",
    "--check",
    "-f",
  ],
  "openssl s_client": [
    "-connect",
    "-connect example.com:443",
    "-connect example.com:443 -servername example.com",
    "-brief -connect example.com:443",
    "-showcerts -connect example.com:443",
    "-verify_return_error -connect example.com:443",
    "-servername",
    "-showcerts",
    "-brief",
    "-tls1_2",
    "-tls1_3",
    "-CAfile",
    "-verify_return_error",
    "-alpn",
    "-starttls",
    "-ign_eof",
  ],
  "ssh-keyscan": [
    "github.com",
    "-H github.com",
    "-t ed25519,rsa github.com",
    "-p 2222 host",
    "-T 5 -4 host",
    "-H host >> ~/.ssh/known_hosts",
    "-p",
    "-t",
    "-H",
    "-T",
    "-4",
    "-6",
    "-v",
    "-f",
  ],
  scp: [
    "file.txt user@host:/tmp/",
    "-r ./dir user@host:/var/www/",
    "-P 2222 file.txt user@host:/tmp/",
    "-i ~/.ssh/id_ed25519 file.txt user@host:/tmp/",
    "-J bastion file.txt user@host:/tmp/",
    "-P",
    "-i",
    "-r",
    "-p",
    "-v",
    "-C",
    "-J",
    "-o",
    "-F",
    "-l",
    "-4",
    "-6",
  ],
  lsof: [
    "-nP -iTCP -sTCP:LISTEN",
    "-i :80",
    "-i :443",
    "-iTCP -sTCP:LISTEN",
    "-p 1234",
    "-u www-data",
    "+D /var/log",
    "-t -i :443",
    "-iTCP",
    "-sTCP:LISTEN",
    "-nP",
    "-p",
    "-u",
    "-a",
    "-c",
    "-t",
  ],
  pkill: [
    "-TERM nginx",
    "-HUP nginx",
    "-f 'python app.py'",
    "-u www-data php",
    "-x nginx",
    "-e -TERM nginx",
    "-n nginx",
    "-o nginx",
    "-f",
    "-u",
    "-x",
    "-TERM",
    "-HUP",
    "-e",
    "-n",
    "-o",
  ],
  tmux: [
    "new -s",
    "attach -t",
    "ls",
    "split-window",
    "new-window",
    "kill-session -t",
    "send-keys",
    "-2",
    "-f",
  ],
  screen: [
    "-S work",
    "-r work",
    "-ls",
    "-x work",
    "-d -r work",
    "-dmS worker",
    "-S work -X quit",
    "-S work -X hardcopy",
    "-wipe",
    "-L",
  ],
  nohup: [
    "./server.sh &",
    "npm start > app.log 2>&1 &",
    "python app.py > app.log 2>&1 &",
    "node server.js > server.log 2>&1 &",
    "./worker.sh > worker.log 2>&1 &",
    "rsync -av /src /dst > rsync.log 2>&1 &",
    "sleep 3600 &",
    "java -jar app.jar > app.log 2>&1 &",
    "long-command > output.log 2>&1 &",
    "./backup.sh >> backup.log 2>&1 &",
    "tail -f /var/log/syslog > syslog.follow 2>&1 &",
    "command &",
    "--help",
    "--version",
  ],
  jobs: [
    "-l",
    "-p",
    "-r",
    "-s",
    "%1",
    "%%",
    "%+",
    "%-",
    "-l %1",
    "-p %1",
    "-l %%",
    "-p %%",
    "-x echo %1",
  ],
  fg: ["%1", "%2", "%3", "%%", "%+", "%-", "%?ssh", "%?python", "%vim", "%nano", "%<job>"],
  bg: ["%1", "%2", "%3", "%%", "%+", "%-", "%?ssh", "%?python", "%vim", "%nano", "%<job>"],
  disown: [
    "%1",
    "%2",
    "%%",
    "%+",
    "%-",
    "-h %1",
    "-h %%",
    "-h %+",
    "-h %-",
    "%?ssh",
    "-a",
    "-r",
  ],
  pidof: [
    "sshd",
    "nginx",
    "systemd",
    "-s nginx",
    "-x script.sh",
    "-o %PPID sshd",
    "--single-shot nginx",
    "--scripts script.sh",
    "-q",
    "--quiet",
  ],
  pstree: [
    "-p",
    "-u",
    "-a",
    "-h",
    "-T",
    "-s",
    "-s <pid>",
    "-p systemd",
    "-u www-data",
    "--show-pids",
  ],
  top: [
    "-u www-data",
    "-u root",
    "-p 1",
    "-b -n 1",
    "-b -n 1 -o %CPU",
    "-H",
    "-d 1",
    "-o %MEM",
    "-c",
    "-i",
  ],
  htop: [
    "-u root",
    "-u www-data",
    "-p 1",
    "-d 10",
    "-s PERCENT_CPU",
    "-s PERCENT_MEM",
    "-t",
    "--tree",
    "-C",
    "--no-color",
  ],
  systemctl: [
    "status",
    "start",
    "stop",
    "restart",
    "reload",
    "show",
    "cat",
    "edit",
    "enable",
    "disable",
    "is-active",
    "is-enabled",
    "list-units",
    "list-unit-files",
    "list-timers",
    "list-sockets",
    "list-jobs",
    "list-dependencies",
    "daemon-reload",
    "reload-or-restart",
    "try-restart",
    "reset-failed",
  ],
};

function normalizeAutocompleteToken(token: string) {
  return /^-[A-Za-z]+$/.test(token) ? token : token.toLowerCase();
}

function normalizeAutocompleteCommand(command: string) {
  return command.trim().split(/\s+/).map(normalizeAutocompleteToken).join(" ");
}

function normalizePriorityKey(value: string) {
  return value
    .replace(/\s+<[^>]+>/g, "")
    .replace(/=<[^>]+>/g, "")
    .trim()
    .toLowerCase();
}

function getAutocompletePriorityIndex(
  candidate: string,
  allowFirstTokenFallback = true,
) {
  const commandName = getKnownCommandName(candidate);
  const priorities = TERMINAL_AUTOCOMPLETE_PRIORITY[commandName];
  if (!priorities) {
    return -1;
  }

  const candidateTokens = splitCommandTokens(
    getTerminalAutocompleteInsertCommand(candidate),
  );
  const commandTokenCount = getKnownCommandTokenCount(candidate);
  const labelTokens = candidateTokens.slice(commandTokenCount);
  if (labelTokens.length === 0) {
    return -1;
  }

  const exactPriorityKeys = [
    normalizePriorityKey(labelTokens.join(" ")),
    normalizePriorityKey(labelTokens.slice(0, 2).join(" ")),
  ].filter(Boolean);

  const exactIndex = priorities.findIndex((priority) =>
    exactPriorityKeys.includes(normalizePriorityKey(priority)),
  );
  if (exactIndex !== -1 || !allowFirstTokenFallback) {
    return exactIndex;
  }

  const firstTokenKey = normalizePriorityKey(labelTokens[0] ?? "");
  return priorities.findIndex(
    (priority) => normalizePriorityKey(priority) === firstTokenKey,
  );
}

function getAutocompletePriorityAdjustment(candidate: string) {
  const index = getAutocompletePriorityIndex(candidate);
  if (index === -1) {
    return 0;
  }

  return -10 + index / 20;
}

function scoreAutocompleteMatch(
  currentCommand: string,
  candidate: string,
  originalIndex: number,
  context: TerminalAutocompleteContext,
  mode: TerminalAutocompleteMode,
  source: TerminalAutocompleteSource,
) {
  const trimmedCurrent = currentCommand.trim();
  const effectiveCurrent = context.matchCommand.trim();
  const effectiveCandidate = getEffectiveCandidate(candidate, context);
  const completion = candidate.slice(trimmedCurrent.length).trimStart();
  const currentTokens = splitCommandTokens(effectiveCurrent);
  const lastToken = currentTokens[currentTokens.length - 1] ?? "";
  const currentBaseCommand = currentTokens[0] ?? "";
  const candidateTokens = splitCommandTokens(
    getTerminalAutocompleteInsertCommand(effectiveCandidate),
  );
  const candidateBaseCommand = candidateTokens[0] ?? "";
  const isPrivilegeWrapperContext =
    context.prefix &&
    DUPLICATE_PRIVILEGE_WRAPPERS.has(
      context.prefix.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "",
    );
  const isBarePrivilegeWrapperContext =
    isPrivilegeWrapperContext && !effectiveCurrent;
  const isCommonPrivilegedStarter =
    isPrivilegeWrapperContext &&
    COMMON_PRIVILEGED_COMMAND_STARTERS.some(
      (starter) => starter === effectiveCandidate.trim(),
    );
  const knownCommandBoundary = isKnownCommandBoundary(currentCommand, context);
  const isBareKnownProvider = isBareKnownProviderQuery(context);
  const preferContextualHistoryValues =
    shouldPreferContextualHistoryValues(context);
  const preferCatalogCompletions =
    shouldPreferCatalogCompletions(context) || knownCommandBoundary;
  let score =
    originalIndex / 10000 + getAutocompletePriorityAdjustment(effectiveCandidate);

  if (source === "history") {
    score += preferContextualHistoryValues
      ? -42
      : preferCatalogCompletions
        ? 18
        : -30;
  } else if (preferCatalogCompletions) {
    score -= 18;
  }

  if (isPrivilegeWrapperContext) {
    if (effectiveCandidate.trim().startsWith("-")) {
      score += 28;
    } else if (isCommonPrivilegedStarter) {
      score -= 8;
    } else if (
      isBarePrivilegeWrapperContext &&
      effectiveCandidate.trim().includes(" ")
    ) {
      score += 18;
    }
  }

  if (
    !isBarePrivilegeWrapperContext &&
    !effectiveCurrent.includes(" ") &&
    !effectiveCandidate.trim().includes(" ")
  ) {
    score -= 10;
  }

  if (
    /\s$/.test(currentCommand) &&
    currentBaseCommand &&
    candidateBaseCommand &&
    candidateBaseCommand !== currentBaseCommand
  ) {
    score += 12;
  }

  if (
    currentBaseCommand &&
    candidateBaseCommand === currentBaseCommand &&
    effectiveCandidate.trim().includes(" ")
  ) {
    score -= 2;
  }

  if (preferCatalogCompletions) {
    const priorityIndex = getAutocompletePriorityIndex(effectiveCandidate);
    if (source === "catalog") {
      score += priorityIndex === -1 ? 120 : priorityIndex * 8;
    }

    if (candidateTokens.length === currentTokens.length) {
      score -= 12;
    } else if (candidateTokens.length > currentTokens.length) {
      score += Math.min(
        16,
        (candidateTokens.length - currentTokens.length) * 6,
      );
    }

    if (
      source === "catalog" &&
      !hasPlaceholder(candidate) &&
      candidateTokens.length > currentTokens.length &&
      !knownCommandBoundary
    ) {
      score += 36;
    }
  }

  if (isBareKnownProvider && source === "catalog") {
    const loosePriorityIndex = getAutocompletePriorityIndex(effectiveCandidate);
    const exactPriorityIndex = getAutocompletePriorityIndex(
      effectiveCandidate,
      false,
    );
    const bareCommandTokenCount = getKnownCommandTokenCount(effectiveCurrent);
    const queryCommandName = getKnownCommandName(effectiveCurrent);
    const candidateCommandName = getKnownCommandName(effectiveCandidate);
    const queryIsKnownProvider =
      TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(queryCommandName);
    const candidateUsesSameProvider =
      queryIsKnownProvider && candidateCommandName === queryCommandName;
    const candidateLabelTokenCount =
      bareCommandTokenCount > 0
        ? Math.max(0, candidateTokens.length - bareCommandTokenCount)
        : 0;

    if (candidateUsesSameProvider && candidateLabelTokenCount > 0) {
      score -= 34;
    } else if (
      queryIsKnownProvider &&
      candidateCommandName !== queryCommandName &&
      candidateLabelTokenCount === 0
    ) {
      score += 24;
    }

    if (loosePriorityIndex !== -1 && exactPriorityIndex === -1) {
      score += 28;
    }

    if (candidateLabelTokenCount > 1 && exactPriorityIndex === -1) {
      score += 36;
    }
  }

  const isOptionNameCompletion =
    !/\s$/.test(currentCommand) &&
    !lastToken.includes("=") &&
    (lastToken.startsWith("-") || trimmedCurrent.endsWith("-"));

  if (isOptionNameCompletion) {
    if (currentBaseCommand === "find") {
      const candidateOption =
        candidateTokens[candidateTokens.length - 1]?.toLowerCase() ?? "";
      const findOptionIndex = COMMON_FIND_OPTIONS.indexOf(candidateOption);
      if (findOptionIndex !== -1) {
        score += findOptionIndex / 100;
      }
    }

    if (/\s/.test(completion)) {
      score += 20;
    }
    score += candidate.length / 1000;
  }

  if (mode === "ghost" && hasPlaceholder(candidate)) {
    score += 80;
  }

  return score;
}

function hasPlaceholder(command: string) {
  return PLACEHOLDER_RE.test(command);
}

function splitCommandTokens(command: string) {
  return command.trim().split(/\s+/).filter(Boolean);
}

function getFirstCommandToken(command: string) {
  return splitCommandTokens(command)[0]?.toLowerCase() ?? "";
}

function hasPrivilegeWrapperInPrefix(prefix: string) {
  return splitCommandTokens(prefix).some((token) =>
    DUPLICATE_PRIVILEGE_WRAPPERS.has(token.toLowerCase()),
  );
}

function shouldUseContextPrefixVariant(
  candidate: string,
  context: TerminalAutocompleteContext,
) {
  const candidateFirstToken = getFirstCommandToken(candidate);
  return !(
    context.prefix &&
    hasPrivilegeWrapperInPrefix(context.prefix) &&
    DUPLICATE_PRIVILEGE_WRAPPERS.has(candidateFirstToken)
  );
}

function shouldPreferCatalogCompletions(context: TerminalAutocompleteContext) {
  const tokens = splitCommandTokens(context.matchCommand);
  if (tokens.length !== 2) {
    return false;
  }

  const [command, partialSubcommand] = tokens;
  const normalizedCommand = command?.toLowerCase();
  const normalizedPartialSubcommand = partialSubcommand?.toLowerCase() ?? "";

  if (!normalizedCommand || normalizedPartialSubcommand.length === 0) {
    return false;
  }

  if (normalizedCommand === "systemctl") {
    return [...SYSTEMCTL_CATALOG_FIRST_SUBCOMMANDS].some(
      (subcommand) =>
        subcommand.startsWith(normalizedPartialSubcommand) &&
        subcommand !== normalizedPartialSubcommand,
    );
  }

  return TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(normalizedCommand);
}

function shouldPreferContextualHistoryValues(
  context: TerminalAutocompleteContext,
) {
  return Boolean(
    getSystemctlUnitSuggestionPrefix(context.matchCommand) ||
      getJournalctlUnitSuggestionPrefix(context.matchCommand) ||
      getSshHostSuggestionPrefix(context.matchCommand) ||
      getRemoteDestinationPrefix(context.matchCommand, "scp") ||
      getRemoteDestinationPrefix(context.matchCommand, "rsync") ||
      getAptPackageSuggestionPrefix(context.matchCommand) ||
      getServiceNameSuggestionPrefix(context.matchCommand) ||
      getNetworkTargetSuggestionPrefix(
        context.matchCommand,
        "ping",
        PING_TARGET_OPTION_ARGUMENTS,
      ) ||
      getNetworkTargetSuggestionPrefix(
        context.matchCommand,
        "traceroute",
        TRACEROUTE_TARGET_OPTION_ARGUMENTS,
      ) ||
      getNetworkTargetSuggestionPrefix(
        context.matchCommand,
        "dig",
        DIG_TARGET_OPTION_ARGUMENTS,
      ) ||
      getNetworkTargetSuggestionPrefix(
        context.matchCommand,
        "host",
        HOST_TARGET_OPTION_ARGUMENTS,
      ) ||
      getNetworkTargetSuggestionPrefix(
        context.matchCommand,
        "nmap",
        NMAP_TARGET_OPTION_ARGUMENTS,
      ) ||
      getLiteralArgumentSuggestionPrefix(
        context.matchCommand,
        "resolvectl",
        "query",
      ) ||
      getOpenSslConnectSuggestionPrefix(context.matchCommand) ||
      getGitRefSuggestionPrefix(context.matchCommand) ||
      getGitPullPushRemoteSuggestionPrefix(context.matchCommand) ||
      getGitPushBranchSuggestionPrefix(context.matchCommand) ||
      getGitBranchTargetSuggestionPrefix(context.matchCommand) ||
      getLogFileSuggestionPrefix(context.matchCommand) ||
      getEditorFileSuggestionPrefix(context.matchCommand) ||
      getDirectoryPathSuggestionPrefix(context.matchCommand) ||
      getFilePathSuggestionPrefix(context.matchCommand) ||
      getFileSourceSuggestionPrefix(context.matchCommand) ||
      getDirectoryTargetSuggestionPrefix(context.matchCommand) ||
      getPermissionTargetSuggestionPrefix(context.matchCommand) ||
      getOptionValueSuggestionPrefix(context.matchCommand, "tar", [
        "-C",
        "--directory",
      ]) ||
      getOptionValueSuggestionPrefix(context.matchCommand, "curl", [
        "-o",
        "--output",
      ]) ||
      getDockerContainerSuggestionPrefix(context.matchCommand) ||
      getDockerComposeServiceSuggestionPrefix(context.matchCommand),
  );
}

function isKnownCommandBoundary(
  currentCommand: string,
  context: TerminalAutocompleteContext,
) {
  const typed = currentCommand.trim().toLowerCase();
  const effective = context.matchCommand.trim();
  const tokenCount = effective ? effective.split(/\s+/).length : 0;

  return (
    /\s$/.test(currentCommand) &&
    tokenCount > 0 &&
    tokenCount === getKnownCommandTokenCount(effective) &&
    !["sudo", "doas", "env"].includes(typed)
  );
}

function isKnownProviderCommandContext(context: TerminalAutocompleteContext) {
  const effective = context.matchCommand.trim();
  if (!effective) {
    return false;
  }

  const tokens = splitCommandTokens(effective);
  if (tokens.length === 0) {
    return false;
  }

  return TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(
    getKnownCommandName(effective),
  );
}

function isBareKnownProviderQuery(context: TerminalAutocompleteContext) {
  const effective = context.matchCommand.trim();
  if (!effective) {
    return false;
  }

  const tokens = splitCommandTokens(effective);
  const commandTokenCount = getKnownCommandTokenCount(effective);
  return commandTokenCount > 0 && tokens.length === commandTokenCount;
}

function shouldPreferHistoryOnly(
  currentCommand: string,
  context: TerminalAutocompleteContext,
  historyMatches: TerminalAutocompleteMatch[],
) {
  if (historyMatches.length === 0) {
    return false;
  }

  const typed = currentCommand.trim();
  const effective = context.matchCommand.trim();
  const tokenCount = effective ? effective.split(/\s+/).length : 0;

  if (isKnownCommandBoundary(currentCommand, context)) {
    return false;
  }

  if (isKnownProviderCommandContext(context)) {
    return false;
  }

  if (getSystemctlUnitSuggestionPrefix(context.matchCommand)) {
    return false;
  }

  if (context.prefix) {
    return false;
  }

  return (
    tokenCount <= 1 ||
    isSystemctlUnitCommandPrefix(context.matchCommand) ||
    typed === "sudo" ||
    typed === "doas" ||
    typed === "env"
  );
}

function shouldGroupCatalogBeforeHistory(
  currentCommand: string,
  context: TerminalAutocompleteContext,
  catalogMatches: TerminalAutocompleteMatch[],
) {
  if (catalogMatches.length === 0) {
    return false;
  }

  if (
    !shouldPreferContextualHistoryValues(context) &&
    (shouldPreferCatalogCompletions(context) ||
      isKnownCommandBoundary(currentCommand, context) ||
      isKnownProviderCommandContext(context) ||
      context.prefix)
  ) {
    return true;
  }

  const tokens = splitCommandTokens(context.matchCommand);
  const commandTokenCount = getKnownCommandTokenCount(context.matchCommand);
  return commandTokenCount > 0 && tokens.length > commandTokenCount;
}

function uniqueAutocompleteMatches(matches: TerminalAutocompleteMatch[]) {
  const seen = new Set<string>();

  return matches.filter((match) => {
    const normalizedCommand = normalizeAutocompleteCommand(match.command);
    if (seen.has(normalizedCommand)) {
      return false;
    }

    seen.add(normalizedCommand);
    return true;
  });
}

function isBareWrapperCommand(command: string) {
  const [firstToken, secondToken] = command.trim().split(/\s+/, 2);
  return (
    !secondToken &&
    ["sudo", "doas", "env", "nice", "nohup", "time", "timeout"].includes(
      firstToken?.toLowerCase() ?? "",
    )
  );
}

function isCompleteKnownEffectiveCommand(command: string) {
  if (/\s$/.test(command)) {
    return false;
  }

  const context = getAutocompleteContext(command);
  const tokens = splitCommandTokens(context.matchCommand);
  return tokens.length === 1 && isKnownCommandToken(tokens[0] ?? "");
}

function isKnownCommandToken(token: string) {
  const normalizedToken = token.toLowerCase();
  return (
    Boolean(normalizedToken) &&
    !normalizedToken.includes(" ") &&
    TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(normalizedToken)
  );
}

function hasSuspiciousKnownCommandSuffix(token: string) {
  const normalizedToken = token.toLowerCase();

  if (
    !/^[a-z0-9._+-]+$/.test(normalizedToken) ||
    isKnownCommandToken(normalizedToken)
  ) {
    return false;
  }

  for (const command of TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.keys()) {
    if (
      command.includes(" ") ||
      command.length < MIN_KNOWN_COMMAND_SUFFIX_LENGTH
    ) {
      continue;
    }

    const prefixLength = normalizedToken.length - command.length;
    if (
      prefixLength >= MIN_KNOWN_COMMAND_SUFFIX_LENGTH &&
      normalizedToken.endsWith(command)
    ) {
      return true;
    }
  }

  return false;
}

function hasRepeatedPrivilegeWrapper(command: string) {
  const tokens = splitCommandTokens(command);
  let cursor = 0;
  let hasPrivilegeWrapper = false;

  while (cursor < tokens.length) {
    const token = tokens[cursor]?.toLowerCase() ?? "";
    if (!DUPLICATE_PRIVILEGE_WRAPPERS.has(token)) {
      return false;
    }

    if (hasPrivilegeWrapper) {
      return true;
    }

    hasPrivilegeWrapper = true;
    const nextCursor = scanPrivilegeWrapper(tokens, cursor);
    if (nextCursor <= cursor) {
      return false;
    }
    cursor = nextCursor;
  }

  return false;
}

function scanPrivilegeWrapper(tokens: string[], index: number) {
  let cursor = index + 1;

  while (cursor < tokens.length && tokens[cursor]?.startsWith("-")) {
    const option = tokens[cursor]?.toLowerCase() ?? "";
    cursor += 1;

    if (option === "--") {
      break;
    }

    if (
      SUDO_OPTION_ARGUMENTS.has(option) ||
      option.startsWith("--user=") ||
      option.startsWith("--group=") ||
      option.startsWith("--prompt=") ||
      option.startsWith("--close-from=")
    ) {
      if (!option.includes("=") && cursor < tokens.length) {
        cursor += 1;
      }
    }
  }

  return cursor;
}

function scanSimpleWrapper(tokens: string[], index: number) {
  let cursor = index + 1;

  while (cursor < tokens.length && tokens[cursor]?.startsWith("-")) {
    cursor += 1;
  }

  return cursor;
}

function scanEnvWrapper(tokens: string[], index: number) {
  let cursor = index + 1;

  while (
    cursor < tokens.length &&
    ENV_ASSIGNMENT_RE.test(tokens[cursor] ?? "")
  ) {
    cursor += 1;
  }

  if (tokens[cursor]?.startsWith("-")) {
    return index;
  }

  return cursor;
}

function scanNiceWrapper(tokens: string[], index: number) {
  let cursor = index + 1;

  if (tokens[cursor] === "-n" && cursor + 1 < tokens.length) {
    cursor += 2;
  } else if (NICE_PRIORITY_RE.test(tokens[cursor] ?? "")) {
    cursor += 1;
  }

  return cursor;
}

function scanTimeoutWrapper(tokens: string[], index: number) {
  let cursor = index + 1;

  while (cursor < tokens.length && tokens[cursor]?.startsWith("-")) {
    const option = tokens[cursor]?.toLowerCase() ?? "";
    cursor += 1;

    if (
      ["-s", "--signal", "-k", "--kill-after"].includes(option) &&
      cursor < tokens.length
    ) {
      cursor += 1;
    }
  }

  if (cursor < tokens.length) {
    cursor += 1;
  }

  return cursor;
}

function getAutocompleteContext(command: string): TerminalAutocompleteContext {
  return normalizeTerminalAutocompleteInput(command);
}

function normalizeTerminalAutocompleteInput(
  command: string,
): TerminalAutocompleteContext {
  const typedCommand = command.trim();
  const tokens = typedCommand.split(/\s+/).filter(Boolean);
  const hasTrailingSpace = /\s$/.test(command);
  let cursor = 0;
  let strippedWrapper = false;

  while (cursor < tokens.length) {
    const token = tokens[cursor]?.toLowerCase();
    let nextCursor = cursor;

    if (token === "sudo" || token === "doas") {
      nextCursor = scanPrivilegeWrapper(tokens, cursor);
    } else if (
      token === "command" ||
      token === "builtin" ||
      token === "nohup" ||
      token === "time"
    ) {
      nextCursor = scanSimpleWrapper(tokens, cursor);
    } else if (token === "env") {
      nextCursor = scanEnvWrapper(tokens, cursor);
    } else if (token === "nice") {
      nextCursor = scanNiceWrapper(tokens, cursor);
    } else if (token === "timeout") {
      nextCursor = scanTimeoutWrapper(tokens, cursor);
    }

    if (nextCursor <= cursor || nextCursor >= tokens.length) {
      if (
        hasTrailingSpace &&
        nextCursor > cursor &&
        nextCursor >= tokens.length &&
        (token === "sudo" || token === "doas") &&
        tokens.length === cursor + 1
      ) {
        strippedWrapper = true;
        cursor = nextCursor;
      }
      break;
    }

    strippedWrapper = true;
    cursor = nextCursor;
  }

  const matchTokens = tokens.slice(cursor);
  const matchCommand = `${matchTokens.join(" ")}${
    hasTrailingSpace && matchTokens.length > 0 ? " " : ""
  }`;

  if (
    !strippedWrapper ||
    matchCommand.startsWith("-")
  ) {
    return {
      typedCommand,
      matchCommand: `${typedCommand}${hasTrailingSpace ? " " : ""}`,
      prefix: "",
    };
  }

  return {
    typedCommand,
    matchCommand,
    prefix: `${tokens.slice(0, cursor).join(" ")} `,
  };
}

function getEffectiveCandidate(
  candidate: string,
  context: TerminalAutocompleteContext,
) {
  if (
    context.prefix &&
    candidate.toLowerCase().startsWith(context.prefix.toLowerCase())
  ) {
    return candidate.slice(context.prefix.length);
  }

  return candidate;
}

function getPrivilegeUnwrappedCommand(command: string) {
  const candidateContext = getAutocompleteContext(command);
  const wrapperToken =
    candidateContext.prefix.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";

  if (
    !candidateContext.prefix ||
    !DUPLICATE_PRIVILEGE_WRAPPERS.has(wrapperToken)
  ) {
    return null;
  }

  const unwrappedCandidate = candidateContext.matchCommand.trim();
  return unwrappedCandidate ? unwrappedCandidate : null;
}

function getKnownCommandTokenCount(command: string) {
  const tokens = splitCommandTokens(command);

  for (let size = Math.min(tokens.length, 3); size >= 1; size -= 1) {
    const candidate = tokens.slice(0, size).join(" ").toLowerCase();
    if (TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.has(candidate)) {
      return size;
    }
  }

  return tokens.length > 0 ? 1 : 0;
}

function getKnownCommandName(command: string) {
  const tokens = splitCommandTokens(command);
  const tokenCount = getKnownCommandTokenCount(command);

  return tokens.slice(0, tokenCount).join(" ").toLowerCase();
}

function getEffectiveExecutable(command: string) {
  const context = getAutocompleteContext(command);
  return (context.prefix ? context.matchCommand : command)
    .trim()
    .split(/\s+/, 1)[0];
}

function getEffectiveCommandTokens(command: string) {
  const context = getAutocompleteContext(command);
  const effectiveCommand = context.prefix ? context.matchCommand : command;
  return effectiveCommand.trim().split(/\s+/).filter(Boolean);
}

function getSystemctlUnitTarget(command: string) {
  const tokens = getEffectiveCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "systemctl") {
    return null;
  }

  let index = 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    index += 1;
  }

  const subcommand = tokens[index]?.toLowerCase();
  if (!subcommand || !SYSTEMCTL_UNIT_SUBCOMMANDS.has(subcommand)) {
    return null;
  }

  index += 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    index += 1;
  }

  return tokens[index] ?? null;
}

function getSystemctlUnitSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "systemctl") {
    return null;
  }

  let index = 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    index += 1;
  }

  const subcommand = tokens[index]?.toLowerCase();
  if (!subcommand || !SYSTEMCTL_UNIT_VALUE_SUBCOMMANDS.has(subcommand)) {
    return null;
  }

  const unitIndex = index + 1;
  if (tokens.length > unitIndex + 1) {
    return null;
  }

  return `${tokens.slice(0, unitIndex).join(" ")} `;
}

function getJournalctlUnitSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "journalctl") {
    return null;
  }

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]?.toLowerCase() ?? "";

    if (token === "-u" || token === "--unit") {
      if (tokens.length > index + 2) {
        return null;
      }

      if (/\s$/.test(command) && tokens[index + 1]) {
        return null;
      }

      return `${tokens.slice(0, index + 1).join(" ")} `;
    }

    if (token.startsWith("--unit=")) {
      if (tokens.length > index + 1) {
        return null;
      }

      if (/\s$/.test(command)) {
        return null;
      }

      return `${tokens.slice(0, index).join(" ")}${
        index > 0 ? " " : ""
      }--unit=`;
    }
  }

  return null;
}

function getOptionValueSuggestionPrefix(
  command: string,
  executable: string,
  options: string[],
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable) {
    return null;
  }

  const normalizedOptions = options.map((option) => option.toLowerCase());
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]?.toLowerCase() ?? "";

    if (normalizedOptions.includes(token)) {
      if (tokens.length > index + 2) {
        return null;
      }

      return `${tokens.slice(0, index + 1).join(" ")} `;
    }
  }

  return null;
}

function getExactOptionValueSuggestionPrefix(
  command: string,
  executable: string,
  options: string[],
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0] !== executable) {
    return null;
  }

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";

    if (options.includes(token)) {
      if (tokens.length > index + 2) {
        return null;
      }

      return `${tokens.slice(0, index + 1).join(" ")} `;
    }
  }

  return null;
}

function hasPendingRemoteCopyOptionValue(
  executable: string,
  lastToken: string,
) {
  if (executable === "rsync") {
    const normalizedToken = lastToken.toLowerCase();
    return ["--exclude", "--include", "-e", "--rsh"].some(
      (option) =>
        normalizedToken === option || normalizedToken.startsWith(`${option}=`),
    );
  }

  if (executable === "scp") {
    return ["-P", "-i", "-o", "-c", "-F", "-J", "-l", "-S"].some(
      (option) => lastToken === option || lastToken.startsWith(`${option}=`),
    );
  }

  return false;
}

function getLongOptionAssignmentSuggestionPrefix(
  command: string,
  executable: string,
  options: string[],
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable) {
    return null;
  }

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]?.toLowerCase() ?? "";
    const option = options.find((candidate) =>
      token.startsWith(`${candidate}=`),
    );

    if (!option) {
      continue;
    }

    if (tokens.length > index + 1) {
      return null;
    }

    return `${tokens.slice(0, index).join(" ")}${
      index > 0 ? " " : ""
    }${option}=`;
  }

  return null;
}

function getAptPackageSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  const executable = tokens[0]?.toLowerCase();
  if (executable === "apt" || executable === "apt-get") {
    const subcommand = tokens[1]?.toLowerCase();
    if (
      !subcommand ||
      !["install", "remove", "purge", "reinstall", "search", "show"].includes(
        subcommand,
      )
    ) {
      return null;
    }

    if (tokens.length > 3) {
      return null;
    }

    return `${tokens.slice(0, 2).join(" ")} `;
  }

  if (executable === "apt-cache") {
    const subcommand = tokens[1]?.toLowerCase();
    if (
      !subcommand ||
      !["search", "show", "policy", "depends", "rdepends"].includes(
        subcommand,
      )
    ) {
      return null;
    }

    if (tokens.length > 3) {
      return null;
    }

    return `${tokens.slice(0, 2).join(" ")} `;
  }

  if (executable === "dpkg") {
    const option = tokens[1]?.toLowerCase();
    if (
      !option ||
      ![
        "-l",
        "--list",
        "-s",
        "--status",
        "-l",
        "-L",
        "--listfiles",
        "-S",
        "--search",
      ].some(
        (candidate) => candidate.toLowerCase() === option,
      )
    ) {
      return null;
    }

    if (tokens.length > 3) {
      return null;
    }

    return `${tokens.slice(0, 2).join(" ")} `;
  }

  return null;
}

function getLiteralArgumentSuggestionPrefix(
  command: string,
  executable: string,
  argument: string,
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable) {
    return null;
  }

  const argumentIndex = tokens.findIndex(
    (token, index) => index > 0 && token.toLowerCase() === argument,
  );
  if (argumentIndex === -1 || tokens.length > argumentIndex + 2) {
    return null;
  }

  return `${tokens.slice(0, argumentIndex + 1).join(" ")} `;
}

function getFirstValueSuggestionPrefix(
  command: string,
  executable: string,
  subcommands: string[] = [],
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable) {
    return null;
  }

  if (subcommands.length === 0) {
    if (tokens.length > 2) {
      return null;
    }

    return `${tokens.slice(0, 1).join(" ")} `;
  }

  const subcommand = tokens[1]?.toLowerCase();
  if (!subcommand || !subcommands.includes(subcommand) || tokens.length > 3) {
    return null;
  }

  return `${tokens.slice(0, 2).join(" ")} `;
}

function getNetworkTargetSuggestionPrefix(
  command: string,
  executable: string,
  optionsWithArguments: Set<string>,
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable) {
    return null;
  }

  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? "";
    const normalizedToken = token.toLowerCase();

    if (token === "--") {
      index += 1;
      break;
    }

    if (
      executable === "dig" &&
      (token.startsWith("+") || token.startsWith("@"))
    ) {
      index += 1;
      continue;
    }

    if (!token.startsWith("-")) {
      if (index < tokens.length - 1 || /\s$/.test(command)) {
        return null;
      }

      return `${tokens.slice(0, index).join(" ")} `;
    }

    index += 1;
    if (optionsWithArguments.has(normalizedToken)) {
      if (index >= tokens.length) {
        return null;
      }
      index += 1;
    } else if (
      [...optionsWithArguments].some((option) =>
        normalizedToken.startsWith(`${option.toLowerCase()}=`),
      )
    ) {
      continue;
    }
  }

  if (!/\s$/.test(command)) {
    return null;
  }

  return `${tokens.slice(0, index).join(" ")} `;
}

function getGitRefSuggestionPrefix(command: string) {
  return getFirstValueSuggestionPrefix(command, "git", [
    "checkout",
    "switch",
    "merge",
    "rebase",
    "diff",
    "log",
  ]);
}

function getGitPullPushRemoteSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "git" ||
    !["pull", "push"].includes(tokens[1]?.toLowerCase() ?? "") ||
    tokens.length > 3 ||
    (tokens.length === 3 && /\s$/.test(command))
  ) {
    return null;
  }

  return `${tokens.slice(0, 2).join(" ")} `;
}

function getDockerContainerSuggestionPrefix(command: string) {
  return getFirstValueSuggestionPrefix(command, "docker", [
    "logs",
    "exec",
    "inspect",
    "stop",
    "start",
    "restart",
    "rm",
  ]);
}

function getDockerComposeServiceSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "docker" ||
    tokens[1]?.toLowerCase() !== "compose"
  ) {
    return null;
  }

  const subcommand = tokens[2]?.toLowerCase();
  if (
    !subcommand ||
    !["logs", "exec", "restart", "stop", "start", "rm", "up"].includes(
      subcommand,
    ) ||
    tokens.length > 4
  ) {
    return null;
  }

  return `${tokens.slice(0, 3).join(" ")} `;
}

function getDockerExecCommandSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() === "docker" &&
    tokens[1]?.toLowerCase() === "exec" &&
    tokens.length === 3
  ) {
    return `${tokens.join(" ")} `;
  }

  return null;
}

function getDockerComposeExecCommandSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "docker" ||
    tokens[1]?.toLowerCase() !== "compose" ||
    tokens[2]?.toLowerCase() !== "exec" ||
    tokens.length !== 4
  ) {
    return null;
  }

  return `${tokens.join(" ")} `;
}

function getGitPushBranchSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "git" ||
    tokens[1]?.toLowerCase() !== "push" ||
    !COMMON_GIT_REMOTES.includes(tokens[2]?.toLowerCase() ?? "") ||
    tokens.length > 4
  ) {
    return null;
  }

  return `${tokens.slice(0, 3).join(" ")} `;
}

function getGitBranchTargetSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "git" ||
    tokens[1]?.toLowerCase() !== "branch" ||
    !["-d", "-D", "--delete"].includes(tokens[2] ?? "") ||
    tokens.length > 4
  ) {
    return null;
  }

  return `${tokens.slice(0, 3).join(" ")} `;
}

function getLogFileSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  const executable = tokens[0]?.toLowerCase();
  if (!executable) {
    return null;
  }

  if (["less", "cat"].includes(executable) && tokens.length <= 2) {
    return `${tokens.slice(0, 1).join(" ")} `;
  }

  if (executable === "tail" && tokens[1]?.toLowerCase() === "-f") {
    if (tokens.length > 3) {
      return null;
    }

    return "tail -f ";
  }

  return null;
}

function getEditorFileSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  const executable = tokens[0]?.toLowerCase();

  if (!executable || !TEXT_EDITOR_COMMANDS.has(executable)) {
    return null;
  }

  if (tokens.length > 2) {
    return null;
  }

  return `${tokens.slice(0, 1).join(" ")} `;
}

function getSinglePathValueSuggestionPrefix(
  command: string,
  executables: Set<string>,
  optionsWithArguments = PATH_OPTION_ARGUMENTS,
) {
  const tokens = splitCommandTokens(command);
  const executable = tokens[0]?.toLowerCase();
  if (!executable || !executables.has(executable)) {
    return null;
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  if (lastToken.startsWith("-") && !/\s$/.test(command)) {
    return null;
  }

  let cursor = 1;
  while (cursor < tokens.length) {
    const token = tokens[cursor] ?? "";
    const normalizedToken = token.toLowerCase();

    if (token === "--") {
      cursor += 1;
      break;
    }

    if (normalizedToken.startsWith("--") && normalizedToken.includes("=")) {
      cursor += 1;
      continue;
    }

    if (optionsWithArguments.has(token) || optionsWithArguments.has(normalizedToken)) {
      cursor += 2;
      continue;
    }

    if (token.startsWith("-")) {
      cursor += 1;
      continue;
    }

    break;
  }

  if (tokens.length - cursor > 1) {
    return null;
  }

  return `${tokens.slice(0, cursor).join(" ")} `;
}

function getDirectoryPathSuggestionPrefix(command: string) {
  return getSinglePathValueSuggestionPrefix(command, DIRECTORY_VALUE_COMMANDS);
}

function getFilePathSuggestionPrefix(command: string) {
  return getSinglePathValueSuggestionPrefix(command, FILE_VALUE_COMMANDS);
}

function getFileSourceSuggestionPrefix(command: string) {
  return getSinglePathValueSuggestionPrefix(command, FILE_SOURCE_COMMANDS);
}

function getPermissionTargetSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  const executable = tokens[0]?.toLowerCase() ?? "";
  if (!FILE_TARGET_COMMANDS.has(executable) || tokens.length < 2 || tokens.length > 3) {
    return null;
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  if (lastToken.startsWith("-") && !/\s$/.test(command)) {
    return null;
  }

  return `${tokens.slice(0, 2).join(" ")} `;
}

function getDirectoryTargetSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  const executable = tokens[0]?.toLowerCase() ?? "";
  if (!FILE_SOURCE_COMMANDS.has(executable) || tokens.length < 2 || tokens.length > 3) {
    return null;
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  if (lastToken.startsWith("-") && !/\s$/.test(command)) {
    return null;
  }

  return `${tokens.slice(0, 2).join(" ")} `;
}

function getSystemctlFollowupSuggestions(command: string) {
  if (!/\s$/.test(command)) {
    return [];
  }

  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "systemctl") {
    return [];
  }

  let index = 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    index += 1;
  }

  const subcommand = tokens[index]?.toLowerCase();
  const unit = tokens[index + 1];
  if (!subcommand || !unit) {
    return [];
  }

  const prefix = `${command.trim()} `;
  if (["status", "show", "cat", "list-dependencies"].includes(subcommand)) {
    return COMMON_SYSTEMCTL_STATUS_FLAGS.map((flag) => `${prefix}${flag}`);
  }

  if (
    ["start", "stop", "restart", "reload", "try-restart"].includes(subcommand)
  ) {
    return COMMON_SYSTEMCTL_JOB_FLAGS.map((flag) => `${prefix}${flag}`);
  }

  return [];
}

function getJournalctlFollowupSuggestions(command: string) {
  if (!/\s$/.test(command)) {
    return [];
  }

  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "journalctl") {
    return [];
  }

  const hasUnit = tokens.some((token, index) => {
    const normalizedToken = token.toLowerCase();
    return (
      normalizedToken.startsWith("--unit=") ||
      ((normalizedToken === "-u" || normalizedToken === "--unit") &&
        Boolean(tokens[index + 1]))
    );
  });

  if (!hasUnit) {
    return [];
  }

  const prefix = `${command.trim()} `;
  return [
    "-f",
    "-n 100",
    "--since today",
    "--since '1 hour ago'",
    "-p err",
    "--no-pager",
    "-o cat",
  ].map((suffix) => `${prefix}${suffix}`);
}

function getDockerRunImageSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "docker" ||
    tokens[1]?.toLowerCase() !== "run"
  ) {
    return null;
  }

  const lastToken = tokens[tokens.length - 1]?.toLowerCase() ?? "";
  const valueOptions = new Set([
    "-p",
    "--publish",
    "--name",
    "-v",
    "--volume",
    "-e",
    "--env",
    "--restart",
    "--network",
  ]);
  if (valueOptions.has(lastToken)) {
    return null;
  }

  return /\s$/.test(command) ? `${command.trim()} ` : null;
}

function getDockerComposeLogsFollowupPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "docker" ||
    tokens[1]?.toLowerCase() !== "compose" ||
    tokens[2]?.toLowerCase() !== "logs" ||
    tokens.length !== 4 ||
    !/\s$/.test(command)
  ) {
    return null;
  }

  return `${tokens.join(" ")} `;
}

function getRemoteDestinationPrefix(command: string, executable: string) {
  if (!/\s$/.test(command)) {
    return null;
  }

  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable || tokens.length < 2) {
    return null;
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  if (hasPendingRemoteCopyOptionValue(executable, lastToken)) {
    return null;
  }

  return `${command.trim()} `;
}

function getSshHostSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "ssh") {
    return null;
  }

  const optionsWithArguments = new Set([
    "-b",
    "-c",
    "-D",
    "-E",
    "-F",
    "-i",
    "-J",
    "-L",
    "-l",
    "-m",
    "-o",
    "-p",
    "-R",
    "-S",
    "-W",
    "-w",
  ]);

  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? "";
    const normalizedToken = token.toLowerCase();

    if (token === "--") {
      index += 1;
      break;
    }

    if (!token.startsWith("-")) {
      if (index === tokens.length - 1 && !/\s$/.test(command)) {
        return `${tokens.slice(0, index).join(" ")} `;
      }

      return null;
    }

    index += 1;
    if (optionsWithArguments.has(token) && index >= tokens.length) {
      return null;
    }

    if (optionsWithArguments.has(token) && index < tokens.length) {
      index += 1;
    } else if (
      [...optionsWithArguments].some((option) =>
        normalizedToken.startsWith(`${option.toLowerCase()}=`),
      )
    ) {
      continue;
    }
  }

  if (!/\s$/.test(command) || index < tokens.length) {
    return null;
  }

  return `${command.trim()} `;
}

function getServiceActionSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "service" ||
    tokens.length !== 2 ||
    !/\s$/.test(command)
  ) {
    return null;
  }

  return `${tokens.join(" ")} `;
}

function getServiceNameSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "service" || tokens.length > 2) {
    return null;
  }

  if (tokens[1]?.startsWith("-")) {
    return null;
  }

  return "service ";
}

function getSubcommandValueSuggestionPrefix(
  command: string,
  executable: string,
  subcommands: string[],
) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== executable) {
    return null;
  }

  for (const subcommand of subcommands) {
    const subcommandTokens = subcommand.split(/\s+/);
    const matchesSubcommand = subcommandTokens.every(
      (token, index) => tokens[index + 1]?.toLowerCase() === token,
    );
    if (!matchesSubcommand) {
      continue;
    }

    const prefixLength = subcommandTokens.length + 1;
    if (tokens.length > prefixLength + 1) {
      return null;
    }

    return `${tokens.slice(0, prefixLength).join(" ")} `;
  }

  return null;
}

function getIpValueSuggestions(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "ip") {
    return [];
  }

  const object = tokens[1]?.toLowerCase();
  const action = tokens[2]?.toLowerCase();
  const suggestions: string[] = [];

  if (["addr", "address"].includes(object ?? "")) {
    if (
      tokens[3]?.toLowerCase() === "dev" ||
      (tokens[3]?.toLowerCase() === "show" &&
        tokens[4]?.toLowerCase() === "dev")
    ) {
      if (tokens.length > (tokens[3]?.toLowerCase() === "show" ? 6 : 5)) {
        return [];
      }

      const prefix = `${tokens
        .slice(0, tokens[3]?.toLowerCase() === "show" ? 5 : 4)
        .join(" ")} `;
      COMMON_DEVICE_INTERFACES.forEach((interfaceName) => {
        suggestions.push(`${prefix}${interfaceName}`);
      });
      return suggestions;
    }
  }

  if (object === "link" && action === "set") {
    if (tokens.length === 3) {
      const prefix = `${tokens.join(" ")} `;
      COMMON_DEVICE_INTERFACES.forEach((interfaceName) => {
        suggestions.push(`${prefix}${interfaceName}`);
      });
      return suggestions;
    }

    if (tokens.length === 4) {
      const prefix = `${tokens.join(" ")} `;
      COMMON_IP_LINK_ACTIONS.forEach((actionName) => {
        suggestions.push(`${prefix}${actionName}`);
      });
      return suggestions;
    }
  }

  if (object === "route" && action === "get") {
    if (tokens.length > 4) {
      return [];
    }

    const prefix = `${tokens.slice(0, 3).join(" ")} `;
    COMMON_ROUTE_TARGETS.forEach((target) => {
      suggestions.push(`${prefix}${target}`);
    });
    return suggestions;
  }

  if (object === "route" && action === "add") {
    if (tokens.length > 4) {
      return [];
    }

    const prefix = `${tokens.slice(0, 3).join(" ")} `;
    COMMON_IP_ROUTE_ADDS.forEach((route) => {
      suggestions.push(`${prefix}${route}`);
    });
    return suggestions;
  }

  return [];
}

function getFindValueSuggestionPrefix(command: string, options: string[]) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "find") {
    return null;
  }

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]?.toLowerCase() ?? "";
    if (!options.includes(token)) {
      continue;
    }

    if (tokens.length > index + 2) {
      return null;
    }

    if (tokens.length === index + 2 && /\s$/.test(command)) {
      return null;
    }

    return `${tokens.slice(0, index + 1).join(" ")} `;
  }

  return null;
}

function getFindOptionSuggestionPrefix(command: string) {
  if (/\s$/.test(command)) {
    return null;
  }

  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "find" || tokens.length < 2) {
    return null;
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  if (!lastToken.startsWith("-")) {
    return null;
  }

  return `${tokens.slice(0, -1).join(" ")} `;
}

function getLsofPortSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "lsof") {
    return null;
  }

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    if (!token.startsWith(":")) {
      continue;
    }

    if (tokens.length > index + 1) {
      return null;
    }

    return `${tokens.slice(0, index).join(" ")} :`;
  }

  return null;
}

function getTrailingCommandSuggestionPrefix(command: string, commands: string[]) {
  const trimmedCommand = command.trim().toLowerCase();
  return commands.includes(trimmedCommand) ? `${command.trim()} ` : null;
}

function getJqFilterSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "jq") {
    return null;
  }

  let index = 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    const option = tokens[index]?.toLowerCase() ?? "";
    if (["--arg", "--argjson", "--slurpfile", "--rawfile", "-f"].includes(option)) {
      return null;
    }
    index += 1;
  }

  if (tokens.length > index + 1) {
    return null;
  }

  return `${tokens.slice(0, index).join(" ")} `;
}

function getUfwRuleSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "ufw") {
    return null;
  }

  const subcommand = tokens[1]?.toLowerCase();
  if (["allow", "deny", "reject", "limit"].includes(subcommand ?? "")) {
    if (tokens.length > 3) {
      return null;
    }

    return `${tokens.slice(0, 2).join(" ")} `;
  }

  if (
    subcommand === "delete" &&
    ["allow", "deny", "reject", "limit"].includes(
      tokens[2]?.toLowerCase() ?? "",
    )
  ) {
    if (tokens.length > 4) {
      return null;
    }

    return `${tokens.slice(0, 3).join(" ")} `;
  }

  return null;
}

function getOpenSslConnectSuggestionPrefix(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "openssl" ||
    tokens[1]?.toLowerCase() !== "s_client"
  ) {
    return null;
  }

  for (let index = 2; index < tokens.length; index += 1) {
    const token = tokens[index]?.toLowerCase() ?? "";
    if (token !== "-connect") {
      continue;
    }

    if (tokens.length > index + 2) {
      return null;
    }

    if (tokens.length === index + 2 && /\s$/.test(command)) {
      return null;
    }

    return `${tokens.slice(0, index + 1).join(" ")} `;
  }

  return null;
}

function getTlsHostFromEndpoint(endpoint: string) {
  const normalizedEndpoint = stripShellQuotes(endpoint).trim();
  const closingBracketIndex = normalizedEndpoint.lastIndexOf("]:");

  if (normalizedEndpoint.startsWith("[") && closingBracketIndex > 0) {
    return normalizedEndpoint.slice(1, closingBracketIndex);
  }

  const portSeparatorIndex = normalizedEndpoint.lastIndexOf(":");
  return portSeparatorIndex > 0
    ? normalizedEndpoint.slice(0, portSeparatorIndex)
    : normalizedEndpoint;
}

function getOpenSslPostConnectSuggestionContext(command: string) {
  const tokens = splitCommandTokens(command);
  if (
    tokens[0]?.toLowerCase() !== "openssl" ||
    tokens[1]?.toLowerCase() !== "s_client"
  ) {
    return null;
  }

  const connectIndex = tokens.findIndex(
    (token, index) => index > 1 && token.toLowerCase() === "-connect",
  );
  const endpoint = connectIndex === -1 ? "" : (tokens[connectIndex + 1] ?? "");
  if (!endpoint || !isLikelyTlsEndpoint(endpoint)) {
    return null;
  }

  const afterEndpointTokens = tokens.slice(connectIndex + 2);
  if (afterEndpointTokens.length > 1) {
    return null;
  }

  if (
    afterEndpointTokens.length === 1 &&
    !afterEndpointTokens[0]?.startsWith("-")
  ) {
    return null;
  }

  return {
    endpoint,
    host: getTlsHostFromEndpoint(endpoint),
    prefix: `${tokens.slice(0, connectIndex + 2).join(" ")} `,
  };
}

function buildContextualCatalogSuggestions(
  context: TerminalAutocompleteContext,
  systemdUnits: string[] = [],
) {
  const suggestions: string[] = [];
  const availableSystemdUnits = uniqueDerivedValues(
    systemdUnits.filter(isLikelySystemdUnitTarget),
  );
  const systemdUnitTargets = availableSystemdUnits;
  const runtimeServiceNames = uniqueDerivedValues(
    availableSystemdUnits
      .map(getServiceNameFromSystemdUnit)
      .filter(isLikelyServiceName),
  );
  const serviceNames =
    runtimeServiceNames.length > 0
      ? runtimeServiceNames
      : COMMON_SERVICE_NAMES;
  const isBarePrivilegeWrapperContext =
    context.prefix &&
    !context.matchCommand.trim() &&
    DUPLICATE_PRIVILEGE_WRAPPERS.has(
      context.prefix.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "",
    );
  const privilegeWrapperPartial = isBarePrivilegeWrapperContext
    ? ""
    : context.prefix &&
        !context.matchCommand.trim().includes(" ") &&
        DUPLICATE_PRIVILEGE_WRAPPERS.has(
          context.prefix.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "",
        )
      ? context.matchCommand.trim().toLowerCase()
      : "";
  const systemctlUnitPrefix = getSystemctlUnitSuggestionPrefix(
    context.matchCommand,
  );
  const journalctlUnitPrefix = getJournalctlUnitSuggestionPrefix(
    context.matchCommand,
  );
  const journalctlPriorityPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "journalctl",
    ["-p", "--priority"],
  );
  const journalctlSincePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "journalctl",
    ["--since", "-S"],
  );
  const journalctlUntilPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "journalctl",
    ["--until", "-U"],
  );
  const journalctlLinesPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "journalctl",
    ["-n", "--lines"],
  );
  const journalctlOutputPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "journalctl",
    ["-o", "--output"],
  );
  const systemctlTypePrefix =
    getOptionValueSuggestionPrefix(context.matchCommand, "systemctl", [
      "-t",
      "--type",
    ]) ??
    getLongOptionAssignmentSuggestionPrefix(context.matchCommand, "systemctl", [
      "--type",
    ]);
  const systemctlStatePrefix =
    getOptionValueSuggestionPrefix(context.matchCommand, "systemctl", [
      "--state",
    ]) ??
    getLongOptionAssignmentSuggestionPrefix(context.matchCommand, "systemctl", [
      "--state",
    ]);
  const systemctlFollowupSuggestions = getSystemctlFollowupSuggestions(
    context.matchCommand,
  );
  const journalctlFollowupSuggestions = getJournalctlFollowupSuggestions(
    context.matchCommand,
  );
  const sshOptionPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh",
    ["-o"],
  );
  const sshPortPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh",
    ["-p"],
  );
  const sshIdentityFilePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh",
    ["-i"],
  );
  const sshLocalForwardPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh",
    ["-L"],
  );
  const sshRemoteForwardPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh",
    ["-R"],
  );
  const sshDynamicForwardPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh",
    ["-D"],
  );
  const sshKeyTypePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh-keygen",
    ["-t"],
  );
  const sshKeyBitsPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ssh-keygen",
    ["-b"],
  );
  const scpPortPrefix = getExactOptionValueSuggestionPrefix(
    context.matchCommand,
    "scp",
    ["-P"],
  );
  const scpIdentityFilePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "scp",
    ["-i"],
  );
  const aptPackagePrefix = getAptPackageSuggestionPrefix(context.matchCommand);
  const serviceActionPrefix = getServiceActionSuggestionPrefix(
    context.matchCommand,
  );
  const serviceNamePrefix = getServiceNameSuggestionPrefix(
    context.matchCommand,
  );
  const loginctlSessionPrefix = getSubcommandValueSuggestionPrefix(
    context.matchCommand,
    "loginctl",
    ["session-status", "show-session", "terminate-session"],
  );
  const loginctlUserPrefix = getSubcommandValueSuggestionPrefix(
    context.matchCommand,
    "loginctl",
    ["show-user"],
  );
  const systemdAnalyzeUnitPrefix = getSubcommandValueSuggestionPrefix(
    context.matchCommand,
    "systemd-analyze",
    ["verify", "critical-chain"],
  );
  const nmcliConnectionPrefix = getSubcommandValueSuggestionPrefix(
    context.matchCommand,
    "nmcli",
    ["connection up", "connection down"],
  );
  const nmcliDevicePrefix = getSubcommandValueSuggestionPrefix(
    context.matchCommand,
    "nmcli",
    ["device show"],
  );
  const nmapPortPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "nmap",
    ["-p"],
  );
  const nmapTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "nmap",
    NMAP_TARGET_OPTION_ARGUMENTS,
  );
  const pingCountPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ping",
    ["-c"],
  );
  const pingInterfacePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ping",
    ["-I"],
  );
  const pingTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "ping",
    PING_TARGET_OPTION_ARGUMENTS,
  );
  const tracerouteTargetPrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "traceroute",
  );
  const digTargetPrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "dig",
  );
  const hostTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "host",
    HOST_TARGET_OPTION_ARGUMENTS,
  );
  const hostRecordTypePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "host",
    ["-t"],
  );
  const tcpdumpInterfacePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "tcpdump",
    ["-i", "--interface"],
  );
  const resolvectlQueryPrefix = getLiteralArgumentSuggestionPrefix(
    context.matchCommand,
    "resolvectl",
    "query",
  );
  const opensslConnectPrefix = getOpenSslConnectSuggestionPrefix(
    context.matchCommand,
  );
  const opensslPostConnectContext = getOpenSslPostConnectSuggestionContext(
    context.matchCommand,
  );
  const gitRefPrefix = getGitRefSuggestionPrefix(context.matchCommand);
  const gitPullPushPrefix = getGitPullPushRemoteSuggestionPrefix(
    context.matchCommand,
  );
  const gitPushBranchPrefix = getGitPushBranchSuggestionPrefix(
    context.matchCommand,
  );
  const gitRemotePrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "git",
    ["remote"],
  );
  const gitResetPrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "git",
    ["reset"],
  );
  const dockerContainerPrefix = getDockerContainerSuggestionPrefix(
    context.matchCommand,
  );
  const dockerComposeServicePrefix = getDockerComposeServiceSuggestionPrefix(
    context.matchCommand,
  );
  const dockerImagePrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["pull", "run"],
  );
  const dockerRunImagePrefix = getDockerRunImageSuggestionPrefix(
    context.matchCommand,
  );
  const dockerBuildTagPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["-t", "--tag"],
  );
  const dockerPortPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["-p", "--publish"],
  );
  const dockerNamePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["--name"],
  );
  const dockerVolumePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["-v", "--volume"],
  );
  const dockerEnvPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["-e", "--env"],
  );
  const dockerRestartPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["--restart"],
  );
  const dockerNetworkPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "docker",
    ["--network"],
  );
  const dockerExecCommandPrefix = getDockerExecCommandSuggestionPrefix(
    context.matchCommand,
  );
  const dockerComposeExecCommandPrefix =
    getDockerComposeExecCommandSuggestionPrefix(context.matchCommand);
  const dockerComposeLogsFollowupPrefix = getDockerComposeLogsFollowupPrefix(
    context.matchCommand,
  );
  const ipValueSuggestions = getIpValueSuggestions(context.matchCommand);
  const findOptionPrefix = getFindOptionSuggestionPrefix(context.matchCommand);
  const findTypePrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-type",
  ]);
  const findNamePrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-name",
    "-iname",
  ]);
  const chmodModePrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "chmod",
  );
  const chownOwnerPrefix = getFirstValueSuggestionPrefix(
    context.matchCommand,
    "chown",
  );
  const jqFilterPrefix = getJqFilterSuggestionPrefix(context.matchCommand);
  const rsyncExcludePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "rsync",
    ["--exclude", "--include"],
  );
  const rsyncSshPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "rsync",
    ["-e", "--rsh"],
  );
  const curlHeaderPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "curl",
    ["-H", "--header"],
  );
  const curlMethodPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "curl",
    ["-X", "--request"],
  );
  const curlOutputPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "curl",
    ["-o", "--output"],
  );
  const tarDirectoryPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "tar",
    ["-C", "--directory"],
  );
  const opensslServerNamePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "openssl",
    ["-servername"],
  );
  const psSortPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "ps",
    ["--sort"],
  );
  const lsofPortPrefix = getLsofPortSuggestionPrefix(context.matchCommand);
  const ssFilterPrefix = getTrailingCommandSuggestionPrefix(
    context.matchCommand,
    ["ss -tulpn", "ss -ltnp", "ss -tunap"],
  );
  const grepIncludePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "grep",
    ["--include", "--exclude"],
  );
  const grepContextPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "grep",
    ["-A", "-B", "-C", "--after-context", "--before-context", "--context"],
  );
  const headLinePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "head",
    ["-n", "--lines"],
  );
  const tailLinePrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "tail",
    ["-n", "--lines"],
  );
  const findMtimePrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-mtime",
  ]);
  const findSizePrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-size",
  ]);
  const findDepthPrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-maxdepth",
    "-mindepth",
  ]);
  const findPermPrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-perm",
  ]);
  const findUserPrefix = getFindValueSuggestionPrefix(context.matchCommand, [
    "-user",
  ]);
  const ufwRulePrefix = getUfwRuleSuggestionPrefix(context.matchCommand);
  const logFilePrefix = getLogFileSuggestionPrefix(context.matchCommand);
  const editorFilePrefix = getEditorFileSuggestionPrefix(context.matchCommand);
  const directoryPathPrefix = getDirectoryPathSuggestionPrefix(
    context.matchCommand,
  );
  const filePathPrefix = getFilePathSuggestionPrefix(context.matchCommand);
  const fileSourcePrefix = getFileSourceSuggestionPrefix(context.matchCommand);
  const directoryTargetPrefix = getDirectoryTargetSuggestionPrefix(
    context.matchCommand,
  );
  const permissionTargetPrefix = getPermissionTargetSuggestionPrefix(
    context.matchCommand,
  );
  const scpRemotePrefix = getRemoteDestinationPrefix(context.matchCommand, "scp");
  const rsyncRemotePrefix = getRemoteDestinationPrefix(
    context.matchCommand,
    "rsync",
  );

  if (systemctlUnitPrefix) {
    systemdUnitTargets.forEach((unit) => {
      suggestions.push(`${systemctlUnitPrefix}${unit}`);
    });
  }

  if (journalctlUnitPrefix) {
    systemdUnitTargets.forEach((unit) => {
      suggestions.push(`${journalctlUnitPrefix}${unit}`);
    });
  }

  if (journalctlPriorityPrefix) {
    JOURNALCTL_PRIORITIES.forEach((priority) => {
      suggestions.push(`${journalctlPriorityPrefix}${priority}`);
    });
  }

  if (journalctlSincePrefix) {
    COMMON_TIME_EXPRESSIONS.forEach((value) => {
      suggestions.push(`${journalctlSincePrefix}${value}`);
    });
  }

  if (journalctlUntilPrefix) {
    COMMON_TIME_EXPRESSIONS.forEach((value) => {
      suggestions.push(`${journalctlUntilPrefix}${value}`);
    });
  }

  if (journalctlLinesPrefix) {
    COMMON_LINE_COUNTS.forEach((count) => {
      suggestions.push(`${journalctlLinesPrefix}${count}`);
    });
  }

  if (journalctlOutputPrefix) {
    ["short", "short-iso", "short-precise", "cat", "json", "json-pretty"].forEach(
      (format) => {
        suggestions.push(`${journalctlOutputPrefix}${format}`);
      },
    );
  }

  if (systemctlTypePrefix) {
    SYSTEMD_UNIT_TYPES.forEach((type) => {
      suggestions.push(`${systemctlTypePrefix}${type}`);
    });
  }

  if (systemctlStatePrefix) {
    SYSTEMD_UNIT_STATES.forEach((state) => {
      suggestions.push(`${systemctlStatePrefix}${state}`);
    });
  }

  systemctlFollowupSuggestions.forEach((suggestion) => {
    suggestions.push(suggestion);
  });

  journalctlFollowupSuggestions.forEach((suggestion) => {
    suggestions.push(suggestion);
  });

  if (sshOptionPrefix) {
    COMMON_SSH_OPTION_VALUES.forEach((value) => {
      suggestions.push(`${sshOptionPrefix}${value}`);
    });
  }

  if (sshPortPrefix) {
    COMMON_SSH_PORT_VALUES.forEach((port) => {
      suggestions.push(`${sshPortPrefix}${port}`);
    });
  }

  if (sshIdentityFilePrefix) {
    COMMON_SSH_KEY_FILES.forEach((keyFile) => {
      suggestions.push(`${sshIdentityFilePrefix}${keyFile}`);
    });
  }

  if (sshLocalForwardPrefix) {
    COMMON_SSH_LOCAL_FORWARDS.forEach((forward) => {
      suggestions.push(`${sshLocalForwardPrefix}${forward}`);
    });
  }

  if (sshRemoteForwardPrefix) {
    COMMON_SSH_REMOTE_FORWARDS.forEach((forward) => {
      suggestions.push(`${sshRemoteForwardPrefix}${forward}`);
    });
  }

  if (sshDynamicForwardPrefix) {
    COMMON_SSH_DYNAMIC_FORWARDS.forEach((forward) => {
      suggestions.push(`${sshDynamicForwardPrefix}${forward}`);
    });
  }

  if (sshKeyTypePrefix) {
    COMMON_SSH_KEY_TYPES.forEach((keyType) => {
      suggestions.push(`${sshKeyTypePrefix}${keyType}`);
    });
  }

  if (sshKeyBitsPrefix) {
    COMMON_SSH_KEY_BITS.forEach((bits) => {
      suggestions.push(`${sshKeyBitsPrefix}${bits}`);
    });
  }

  if (scpPortPrefix) {
    COMMON_SSH_PORT_VALUES.forEach((port) => {
      suggestions.push(`${scpPortPrefix}${port}`);
    });
  }

  if (scpIdentityFilePrefix) {
    COMMON_SSH_KEY_FILES.forEach((keyFile) => {
      suggestions.push(`${scpIdentityFilePrefix}${keyFile}`);
    });
  }

  if (aptPackagePrefix) {
    COMMON_APT_PACKAGES.forEach((packageName) => {
      suggestions.push(`${aptPackagePrefix}${packageName}`);
    });
  }

  if (serviceActionPrefix) {
    COMMON_SERVICE_ACTIONS.forEach((action) => {
      suggestions.push(`${serviceActionPrefix}${action}`);
    });
  }

  if (serviceNamePrefix) {
    serviceNames.forEach((service) => {
      suggestions.push(`${serviceNamePrefix}${service}`);
    });
  }

  if (loginctlSessionPrefix) {
    COMMON_LOGINCTL_SESSION_IDS.forEach((sessionId) => {
      suggestions.push(`${loginctlSessionPrefix}${sessionId}`);
    });
  }

  if (loginctlUserPrefix) {
    COMMON_USERS.forEach((user) => {
      suggestions.push(`${loginctlUserPrefix}${user}`);
    });
  }

  if (systemdAnalyzeUnitPrefix) {
    systemdUnitTargets.forEach((unit) => {
      suggestions.push(`${systemdAnalyzeUnitPrefix}${unit}`);
    });
  }

  if (nmcliConnectionPrefix) {
    COMMON_NMCLI_CONNECTIONS.forEach((connection) => {
      suggestions.push(`${nmcliConnectionPrefix}${connection}`);
    });
  }

  if (nmcliDevicePrefix) {
    COMMON_DEVICE_INTERFACES.forEach((interfaceName) => {
      suggestions.push(`${nmcliDevicePrefix}${interfaceName}`);
    });
  }

  if (nmapPortPrefix) {
    COMMON_NMAP_PORTS.forEach((ports) => {
      suggestions.push(`${nmapPortPrefix}${ports}`);
    });
  }

  if (pingCountPrefix) {
    COMMON_SMALL_COUNTS.forEach((count) => {
      suggestions.push(`${pingCountPrefix}${count}`);
    });
  }

  if (pingInterfacePrefix) {
    COMMON_DEVICE_INTERFACES.forEach((interfaceName) => {
      suggestions.push(`${pingInterfacePrefix}${interfaceName}`);
    });
  }

  if (pingTargetPrefix) {
    COMMON_HOST_TARGETS.forEach((target) => {
      suggestions.push(`${pingTargetPrefix}${target}`);
    });
  }

  if (nmapTargetPrefix) {
    COMMON_HOST_TARGETS.forEach((target) => {
      suggestions.push(`${nmapTargetPrefix}${target}`);
    });
  }

  if (tracerouteTargetPrefix) {
    COMMON_HOST_TARGETS.forEach((target) => {
      suggestions.push(`${tracerouteTargetPrefix}${target}`);
    });
  }

  if (digTargetPrefix) {
    COMMON_HOST_TARGETS.forEach((target) => {
      suggestions.push(`${digTargetPrefix}${target}`);
    });
  }

  if (hostRecordTypePrefix) {
    COMMON_DNS_RECORD_TYPES.forEach((recordType) => {
      suggestions.push(`${hostRecordTypePrefix}${recordType}`);
    });
  }

  if (hostTargetPrefix) {
    COMMON_HOST_TARGETS.forEach((target) => {
      suggestions.push(`${hostTargetPrefix}${target}`);
    });
  }

  if (tcpdumpInterfacePrefix) {
    COMMON_NETWORK_INTERFACES.forEach((interfaceName) => {
      suggestions.push(`${tcpdumpInterfacePrefix}${interfaceName}`);
    });
  }

  if (resolvectlQueryPrefix) {
    COMMON_DNS_QUERY_NAMES.forEach((name) => {
      suggestions.push(`${resolvectlQueryPrefix}${name}`);
    });
  }

  if (opensslConnectPrefix) {
    COMMON_TLS_ENDPOINTS.forEach((endpoint) => {
      suggestions.push(`${opensslConnectPrefix}${endpoint}`);
    });
  }

  if (opensslPostConnectContext) {
    [
      `-servername ${opensslPostConnectContext.host}`,
      "-showcerts",
      "-brief",
      "-tls1_3",
      "-tls1_2",
      "-verify_return_error",
    ].forEach((option) => {
      suggestions.push(`${opensslPostConnectContext.prefix}${option}`);
    });
  }

  if (gitRefPrefix) {
    COMMON_GIT_REFS.forEach((ref) => {
      suggestions.push(`${gitRefPrefix}${ref}`);
    });
  }

  if (gitPullPushPrefix) {
    COMMON_GIT_REMOTES.forEach((remote) => {
      suggestions.push(`${gitPullPushPrefix}${remote}`);
    });
    COMMON_GIT_REMOTES.forEach((remote) => {
      COMMON_GIT_REFS.slice(0, 4).forEach((ref) => {
        suggestions.push(`${gitPullPushPrefix}${remote} ${ref}`);
      });
    });
  }

  if (gitPushBranchPrefix) {
    COMMON_GIT_REFS.slice(0, 7).forEach((ref) => {
      suggestions.push(`${gitPushBranchPrefix}${ref}`);
    });
  }

  if (gitRemotePrefix) {
    COMMON_GIT_REMOTE_COMMANDS.forEach((command) => {
      suggestions.push(`${gitRemotePrefix}${command}`);
    });
  }

  if (gitResetPrefix) {
    COMMON_GIT_RESET_MODES.forEach((mode) => {
      suggestions.push(`${gitResetPrefix}${mode}`);
    });
  }

  if (dockerContainerPrefix) {
    COMMON_DOCKER_TARGETS.forEach((container) => {
      suggestions.push(`${dockerContainerPrefix}${container}`);
    });
  }

  if (dockerComposeServicePrefix) {
    COMMON_DOCKER_TARGETS.forEach((service) => {
      suggestions.push(`${dockerComposeServicePrefix}${service}`);
    });
  }

  if (dockerImagePrefix) {
    COMMON_DOCKER_IMAGES.forEach((image) => {
      suggestions.push(`${dockerImagePrefix}${image}`);
    });
  }

  if (dockerRunImagePrefix) {
    COMMON_DOCKER_IMAGES.forEach((image) => {
      suggestions.push(`${dockerRunImagePrefix}${image}`);
    });
  }

  if (dockerBuildTagPrefix) {
    COMMON_DOCKER_TAGS.forEach((tag) => {
      suggestions.push(`${dockerBuildTagPrefix}${tag}`);
    });
  }

  if (dockerPortPrefix) {
    COMMON_DOCKER_PORT_MAPS.forEach((portMap) => {
      suggestions.push(`${dockerPortPrefix}${portMap}`);
    });
  }

  if (dockerNamePrefix) {
    COMMON_DOCKER_TARGETS.forEach((name) => {
      suggestions.push(`${dockerNamePrefix}${name}`);
    });
  }

  if (dockerVolumePrefix) {
    COMMON_DOCKER_VOLUMES.forEach((volume) => {
      suggestions.push(`${dockerVolumePrefix}${volume}`);
    });
  }

  if (dockerEnvPrefix) {
    COMMON_DOCKER_ENV.forEach((envValue) => {
      suggestions.push(`${dockerEnvPrefix}${envValue}`);
    });
  }

  if (dockerRestartPrefix) {
    COMMON_DOCKER_RESTART_POLICIES.forEach((policy) => {
      suggestions.push(`${dockerRestartPrefix}${policy}`);
    });
  }

  if (dockerNetworkPrefix) {
    COMMON_DOCKER_NETWORKS.forEach((network) => {
      suggestions.push(`${dockerNetworkPrefix}${network}`);
    });
  }

  if (dockerExecCommandPrefix) {
    COMMON_CONTAINER_COMMANDS.forEach((command) => {
      suggestions.push(`${dockerExecCommandPrefix}${command}`);
    });
  }

  if (dockerComposeExecCommandPrefix) {
    COMMON_CONTAINER_COMMANDS.forEach((command) => {
      suggestions.push(`${dockerComposeExecCommandPrefix}${command}`);
    });
  }

  if (dockerComposeLogsFollowupPrefix) {
    COMMON_DOCKER_COMPOSE_LOG_FLAGS.forEach((flag) => {
      suggestions.push(`${dockerComposeLogsFollowupPrefix}${flag}`);
    });
  }

  ipValueSuggestions.forEach((suggestion) => {
    suggestions.push(suggestion);
  });

  if (findOptionPrefix) {
    COMMON_FIND_OPTIONS.forEach((option) => {
      suggestions.push(`${findOptionPrefix}${option}`);
    });
  }

  if (findTypePrefix) {
    COMMON_FIND_TYPES.forEach((type) => {
      suggestions.push(`${findTypePrefix}${type}`);
    });
  }

  if (findNamePrefix) {
    COMMON_FIND_NAME_PATTERNS.forEach((pattern) => {
      suggestions.push(`${findNamePrefix}${pattern}`);
    });
  }

  if (findMtimePrefix) {
    COMMON_FIND_MTIME_VALUES.forEach((value) => {
      suggestions.push(`${findMtimePrefix}${value}`);
    });
  }

  if (findSizePrefix) {
    COMMON_FIND_SIZE_VALUES.forEach((value) => {
      suggestions.push(`${findSizePrefix}${value}`);
    });
  }

  if (findDepthPrefix) {
    COMMON_FIND_DEPTH_VALUES.forEach((value) => {
      suggestions.push(`${findDepthPrefix}${value}`);
    });
  }

  if (findPermPrefix) {
    COMMON_FIND_PERM_VALUES.forEach((value) => {
      suggestions.push(`${findPermPrefix}${value}`);
    });
  }

  if (findUserPrefix) {
    COMMON_USERS.forEach((user) => {
      suggestions.push(`${findUserPrefix}${user}`);
    });
  }

  if (chmodModePrefix) {
    COMMON_CHMOD_MODES.forEach((mode) => {
      suggestions.push(`${chmodModePrefix}${mode}`);
    });
  }

  if (chownOwnerPrefix) {
    COMMON_CHOWN_OWNERS.forEach((owner) => {
      suggestions.push(`${chownOwnerPrefix}${owner}`);
    });
  }

  if (jqFilterPrefix) {
    COMMON_JQ_FILTERS.forEach((filter) => {
      suggestions.push(`${jqFilterPrefix}${filter}`);
    });
  }

  if (rsyncExcludePrefix) {
    COMMON_RSYNC_EXCLUDES.forEach((pattern) => {
      suggestions.push(`${rsyncExcludePrefix}${pattern}`);
    });
  }

  if (rsyncSshPrefix) {
    COMMON_RSYNC_SSH_COMMANDS.forEach((command) => {
      suggestions.push(`${rsyncSshPrefix}${command}`);
    });
  }

  if (curlHeaderPrefix) {
    COMMON_CURL_HEADERS.forEach((header) => {
      suggestions.push(`${curlHeaderPrefix}${header}`);
    });
  }

  if (curlMethodPrefix) {
    COMMON_HTTP_METHODS.forEach((method) => {
      suggestions.push(`${curlMethodPrefix}${method}`);
    });
  }

  if (curlOutputPrefix) {
    COMMON_CURL_OUTPUTS.forEach((output) => {
      suggestions.push(`${curlOutputPrefix}${output}`);
    });
  }

  if (tarDirectoryPrefix) {
    COMMON_TAR_DIRECTORIES.forEach((directory) => {
      suggestions.push(`${tarDirectoryPrefix}${directory}`);
    });
  }

  if (opensslServerNamePrefix) {
    COMMON_TLS_SERVER_NAMES.forEach((serverName) => {
      suggestions.push(`${opensslServerNamePrefix}${serverName}`);
    });
  }

  if (psSortPrefix) {
    COMMON_PS_SORT_FIELDS.forEach((field) => {
      suggestions.push(`${psSortPrefix}${field}`);
    });
  }

  if (lsofPortPrefix) {
    COMMON_PORTS.forEach((port) => {
      suggestions.push(`${lsofPortPrefix}${port}`);
    });
  }

  if (ssFilterPrefix) {
    COMMON_SS_FILTERS.forEach((filter) => {
      suggestions.push(`${ssFilterPrefix}${filter}`);
    });
  }

  if (grepIncludePrefix) {
    COMMON_GREP_GLOBS.forEach((glob) => {
      suggestions.push(`${grepIncludePrefix}${glob}`);
    });
  }

  if (grepContextPrefix) {
    COMMON_CONTEXT_LINE_COUNTS.forEach((count) => {
      suggestions.push(`${grepContextPrefix}${count}`);
    });
  }

  if (headLinePrefix) {
    COMMON_LINE_COUNTS.forEach((count) => {
      suggestions.push(`${headLinePrefix}${count}`);
    });
  }

  if (tailLinePrefix) {
    COMMON_LINE_COUNTS.forEach((count) => {
      suggestions.push(`${tailLinePrefix}${count}`);
    });
  }

  if (ufwRulePrefix) {
    COMMON_UFW_PORTS.forEach((port) => {
      suggestions.push(`${ufwRulePrefix}${port}`);
    });
  }

  if (logFilePrefix) {
    COMMON_LOG_FILES.forEach((logFile) => {
      suggestions.push(`${logFilePrefix}${logFile}`);
    });
  }

  if (editorFilePrefix) {
    COMMON_EDITABLE_FILES.forEach((filePath) => {
      suggestions.push(`${editorFilePrefix}${filePath}`);
    });
  }

  if (directoryPathPrefix || directoryTargetPrefix) {
    COMMON_DIRECTORIES.forEach((directory) => {
      if (directoryPathPrefix) {
        suggestions.push(`${directoryPathPrefix}${directory}`);
      }
      if (directoryTargetPrefix) {
        suggestions.push(`${directoryTargetPrefix}${directory}`);
      }
    });
  }

  if (filePathPrefix || fileSourcePrefix || permissionTargetPrefix) {
    COMMON_FILE_PATHS.forEach((filePath) => {
      if (filePathPrefix) {
        suggestions.push(`${filePathPrefix}${filePath}`);
      }
      if (fileSourcePrefix) {
        suggestions.push(`${fileSourcePrefix}${filePath}`);
      }
      if (permissionTargetPrefix) {
        suggestions.push(`${permissionTargetPrefix}${filePath}`);
      }
    });
  }

  if (scpRemotePrefix) {
    COMMON_REMOTE_DESTINATIONS.forEach((destination) => {
      suggestions.push(`${scpRemotePrefix}${destination}`);
    });
  }

  if (rsyncRemotePrefix) {
    COMMON_REMOTE_DESTINATIONS.forEach((destination) => {
      suggestions.push(`${rsyncRemotePrefix}${destination}`);
    });
  }

  if (isBarePrivilegeWrapperContext) {
    COMMON_PRIVILEGED_COMMAND_STARTERS.forEach((starter) => {
      suggestions.push(`${context.prefix}${starter}`);
    });
  }

  if (privilegeWrapperPartial) {
    COMMON_PRIVILEGED_COMMAND_STARTERS.forEach((starter) => {
      if (starter.toLowerCase().startsWith(privilegeWrapperPartial)) {
        suggestions.push(`${context.prefix}${starter}`);
      }
    });
  }

  return suggestions;
}

function uniqueDerivedValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = stripShellQuotes(value).trim();
    const normalizedKey = normalizedValue.toLowerCase();
    if (!normalizedValue || seen.has(normalizedKey)) {
      return false;
    }

    seen.add(normalizedKey);
    return true;
  });
}

function withAutocompleteContextPrefix(
  context: TerminalAutocompleteContext,
  suggestion: string,
) {
  return context.prefix ? `${context.prefix}${suggestion}` : suggestion;
}

function isLikelyHistoryValue(value: string) {
  const normalizedValue = stripShellQuotes(value).trim();
  return (
    Boolean(normalizedValue) &&
    normalizedValue.length <= 160 &&
    !normalizedValue.startsWith("-") &&
    !CONTROL_CHARS_RE.test(normalizedValue) &&
    !PLACEHOLDER_RE.test(normalizedValue)
  );
}

function isLikelySshHost(value: string) {
  const host = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(host) &&
    !host.includes("://") &&
    !host.includes("/") &&
    /^[a-z0-9_.@:%+-]+$/i.test(host)
  );
}

function isLikelyRemoteDestination(value: string) {
  const destination = stripShellQuotes(value).trim();
  const colonIndex = destination.indexOf(":");
  const host = colonIndex >= 0 ? destination.slice(0, colonIndex) : "";
  const path = colonIndex >= 0 ? destination.slice(colonIndex + 1) : "";

  return (
    isLikelyHistoryValue(destination) &&
    colonIndex > 0 &&
    Boolean(path) &&
    !destination.includes("://") &&
    !/^[A-Za-z]:[\\/]/.test(destination) &&
    isLikelySshHost(host)
  );
}

function getRemoteDestinationHost(destination: string) {
  const normalizedDestination = stripShellQuotes(destination).trim();
  const colonIndex = normalizedDestination.indexOf(":");
  return colonIndex > 0 ? normalizedDestination.slice(0, colonIndex) : "";
}

function extractUsefulHistoryTokens(history: string[]) {
  return history
    .filter((command) => isUsefulAutocompleteHistoryCommand(command))
    .map((command) => splitCommandTokens(getAutocompleteContext(command).matchCommand));
}

function getFirstNonOptionToken(
  tokens: string[],
  startIndex: number,
  optionsWithArguments: Set<string>,
) {
  let index = startIndex;
  while (index < tokens.length) {
    const token = tokens[index] ?? "";
    const normalizedToken = token.toLowerCase();

    if (token === "--") {
      index += 1;
      break;
    }

    if (!token.startsWith("-")) {
      return token;
    }

    index += 1;
    if (
      optionsWithArguments.has(normalizedToken) ||
      [...optionsWithArguments].some((option) =>
        normalizedToken.startsWith(`${option}=`),
      )
    ) {
      if (!normalizedToken.includes("=") && index < tokens.length) {
        index += 1;
      }
    }
  }

  return tokens[index] ?? "";
}

function extractSshHostsFromHistory(history: string[]) {
  const hosts: string[] = [];
  const sshOptionsWithArguments = new Set([
    "-b",
    "-c",
    "-d",
    "-e",
    "-f",
    "-i",
    "-j",
    "-l",
    "-m",
    "-o",
    "-p",
    "-q",
    "-r",
    "-s",
    "-w",
  ]);

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() === "ssh") {
      const host = getFirstNonOptionToken(tokens, 1, sshOptionsWithArguments);
      if (isLikelySshHost(host)) {
        hosts.push(stripShellQuotes(host));
      }
    }

    tokens.forEach((token) => {
      if (isLikelyRemoteDestination(token)) {
        const host = getRemoteDestinationHost(token);
        if (isLikelySshHost(host)) {
          hosts.push(host);
        }
      }
    });
  });

  return uniqueDerivedValues(hosts);
}

function isLikelyGitRef(value: string) {
  const ref = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(ref) &&
    !ref.startsWith("-") &&
    !ref.includes(":") &&
    !ref.includes("..") &&
    /^[a-z0-9][a-z0-9._/@+-]*$/i.test(ref)
  );
}

function isLikelyGitRemote(value: string) {
  const remote = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(remote) &&
    !remote.startsWith("-") &&
    !remote.includes("/") &&
    !remote.includes(":") &&
    /^[a-z0-9][a-z0-9._-]*$/i.test(remote)
  );
}

function isLikelyLocalGitBranch(value: string) {
  const ref = stripShellQuotes(value).trim().toLowerCase();
  return (
    isLikelyGitRef(ref) &&
    !COMMON_GIT_REMOTES.some((remote) => ref.startsWith(`${remote}/`))
  );
}

function addGitRef(refs: string[], value: string | undefined) {
  const ref = stripShellQuotes(value ?? "");
  if (isLikelyGitRef(ref)) {
    refs.push(ref);
  }
}

function extractGitRefsFromHistory(history: string[]) {
  const refs: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "git") {
      return;
    }

    const subcommand = tokens[1]?.toLowerCase() ?? "";
    if (["checkout", "switch"].includes(subcommand)) {
      const createFlagIndex = tokens.findIndex((token, index) =>
        index > 1 && ["-b", "-c", "--create"].includes(token),
      );
      addGitRef(
        refs,
        createFlagIndex !== -1 ? tokens[createFlagIndex + 1] : tokens[2],
      );
      return;
    }

    if (["merge", "rebase", "log", "show"].includes(subcommand)) {
      addGitRef(refs, tokens[2]);
      return;
    }

    if (subcommand === "branch") {
      const deleteFlagIndex = tokens.findIndex((token, index) =>
        index > 1 && ["-d", "-D", "--delete"].includes(token),
      );
      addGitRef(
        refs,
        deleteFlagIndex !== -1 ? tokens[deleteFlagIndex + 1] : tokens[2],
      );
      return;
    }

    if (["pull", "push"].includes(subcommand)) {
      addGitRef(refs, tokens[3] ?? tokens[2]);
      return;
    }

    if (subcommand === "diff") {
      const refExpression = tokens[2] ?? "";
      const [leftRef, rightRef] = refExpression.split(/\.{2,3}/);
      addGitRef(refs, leftRef);
      addGitRef(refs, rightRef);
    }
  });

  return uniqueDerivedValues(refs);
}

function extractGitRemotesFromHistory(history: string[]) {
  const remotes: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "git") {
      return;
    }

    const subcommand = tokens[1]?.toLowerCase() ?? "";
    const remote =
      ["pull", "push", "fetch"].includes(subcommand)
        ? tokens[2]
        : subcommand === "remote" &&
            ["add", "set-url", "remove", "rename"].includes(
              tokens[2]?.toLowerCase() ?? "",
            )
          ? tokens[3]
          : "";

    if (isLikelyGitRemote(remote ?? "")) {
      remotes.push(stripShellQuotes(remote ?? ""));
    }
  });

  return uniqueDerivedValues(remotes);
}

function extractRemoteDestinationsFromHistory(history: string[]) {
  const destinations: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    tokens.forEach((token) => {
      if (isLikelyRemoteDestination(token)) {
        destinations.push(stripShellQuotes(token));
      }
    });
  });

  return uniqueDerivedValues(destinations);
}

function getNetworkHostFromSshTarget(target: string) {
  const normalizedTarget = stripShellQuotes(target).trim();
  const host = normalizedTarget.includes("@")
    ? normalizedTarget.slice(normalizedTarget.lastIndexOf("@") + 1)
    : normalizedTarget;
  const endpointMatch = host.match(/^\[?([^\]]+)\]?:(\d+)$/);
  return endpointMatch ? endpointMatch[1] : host;
}

function isLikelyNetworkTarget(value: string) {
  const target = getNetworkHostFromSshTarget(value);
  return (
    isLikelyHistoryValue(target) &&
    !target.includes("/") &&
    !target.includes("@") &&
    /^[a-z0-9][a-z0-9_.:-]*$/i.test(target)
  );
}

function isLikelyTlsEndpoint(value: string) {
  const endpoint = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(endpoint) &&
    !endpoint.includes("/") &&
    /^\[?[a-z0-9][a-z0-9_.:-]*\]?:\d+$/i.test(endpoint)
  );
}

function getOpenSslConnectEndpoint(tokens: string[]) {
  if (
    tokens[0]?.toLowerCase() !== "openssl" ||
    tokens[1]?.toLowerCase() !== "s_client"
  ) {
    return "";
  }

  const connectIndex = tokens.findIndex(
    (token, index) => index > 1 && token.toLowerCase() === "-connect",
  );
  return connectIndex === -1 ? "" : (tokens[connectIndex + 1] ?? "");
}

function extractNetworkTargetsFromHistory(history: string[]) {
  const targets: string[] = [];

  extractSshHostsFromHistory(history).forEach((host) => {
    targets.push(getNetworkHostFromSshTarget(host));
  });
  extractRemoteDestinationsFromHistory(history).forEach((destination) => {
    targets.push(getNetworkHostFromSshTarget(getRemoteDestinationHost(destination)));
  });

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    const executable = tokens[0]?.toLowerCase() ?? "";
    let target = "";

    if (executable === "ping") {
      target = getFirstNonOptionToken(tokens, 1, PING_TARGET_OPTION_ARGUMENTS);
    } else if (executable === "traceroute") {
      target = getFirstNonOptionToken(
        tokens,
        1,
        TRACEROUTE_TARGET_OPTION_ARGUMENTS,
      );
    } else if (executable === "nmap") {
      target = getFirstNonOptionToken(tokens, 1, NMAP_TARGET_OPTION_ARGUMENTS);
    } else if (executable === "host") {
      target = getFirstNonOptionToken(tokens, 1, HOST_TARGET_OPTION_ARGUMENTS);
    } else if (executable === "dig") {
      target =
        tokens.find(
          (token, index) =>
            index > 0 &&
            !token.startsWith("-") &&
            !token.startsWith("+") &&
            !token.startsWith("@"),
        ) ?? "";
    } else if (
      executable === "resolvectl" &&
      tokens[1]?.toLowerCase() === "query"
    ) {
      target = tokens[2] ?? "";
    } else if (executable === "openssl") {
      target = getNetworkHostFromSshTarget(getOpenSslConnectEndpoint(tokens));
    }

    const networkTarget = getNetworkHostFromSshTarget(target);
    if (isLikelyNetworkTarget(networkTarget)) {
      targets.push(networkTarget);
    }
  });

  return uniqueDerivedValues(targets);
}

function extractTlsEndpointsFromHistory(history: string[]) {
  const endpoints: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    const endpoint = getOpenSslConnectEndpoint(tokens);
    if (isLikelyTlsEndpoint(endpoint)) {
      endpoints.push(stripShellQuotes(endpoint));
    }
  });

  return uniqueDerivedValues(endpoints);
}

function isLikelyPathValue(value: string) {
  const pathValue = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(pathValue) &&
    pathValue.length <= 180 &&
    !pathValue.startsWith("-") &&
    !pathValue.includes("://") &&
    !/[;&|<>`]/.test(pathValue) &&
    !isLikelyRemoteDestination(pathValue) &&
    (/^(?:~|\/|\.\.?\/)/.test(pathValue) ||
      /^[A-Za-z0-9._+-]+\.[A-Za-z0-9._+-]+$/.test(pathValue))
  );
}

function extractLogFilePathsFromHistory(history: string[]) {
  const paths: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    const executable = tokens[0]?.toLowerCase() ?? "";

    if (executable === "tail" && tokens[1]?.toLowerCase() === "-f") {
      const pathValue = tokens[2] ?? "";
      if (isLikelyPathValue(pathValue)) {
        paths.push(stripShellQuotes(pathValue));
      }
      return;
    }

    if (executable === "less" || executable === "cat") {
      const pathValue = getFirstNonOptionToken(tokens, 1, new Set());
      if (isLikelyPathValue(pathValue)) {
        paths.push(stripShellQuotes(pathValue));
      }
    }
  });

  return uniqueDerivedValues(paths);
}

function isLikelyFollowableLogPathValue(value: string) {
  const pathValue = stripShellQuotes(value).trim().toLowerCase();
  return (
    isLikelyPathValue(pathValue) &&
    (/\/var\/log\//.test(pathValue) ||
      /(?:^|[/._-])log(?:[/._-]|$)/.test(pathValue) ||
      /\.(?:log|out|err|trace)$/i.test(pathValue))
  );
}

function getPathBasename(value: string) {
  const pathValue = stripShellQuotes(value).trim().replace(/[\\/]+$/, "");
  const slashIndex = Math.max(pathValue.lastIndexOf("/"), pathValue.lastIndexOf("\\"));
  return slashIndex >= 0 ? pathValue.slice(slashIndex + 1) : pathValue;
}

function getPathParentDirectory(value: string) {
  const pathValue = stripShellQuotes(value).trim().replace(/[\\/]+$/, "");
  const slashIndex = Math.max(pathValue.lastIndexOf("/"), pathValue.lastIndexOf("\\"));

  if (slashIndex <= 0) {
    return slashIndex === 0 ? "/" : "";
  }

  return pathValue.slice(0, slashIndex);
}

function isLikelyFilePathValue(value: string) {
  const pathValue = stripShellQuotes(value).trim();
  const basename = getPathBasename(pathValue);
  return (
    isLikelyPathValue(pathValue) &&
    !/[\\/]$/.test(pathValue) &&
    (basename.includes(".") ||
      COMMON_SUFFIXLESS_FILE_NAMES.has(basename.toLowerCase()))
  );
}

function getPathOperands(
  tokens: string[],
  startIndex: number,
  optionsWithArguments = PATH_OPTION_ARGUMENTS,
) {
  const operands: string[] = [];
  let cursor = startIndex;

  while (cursor < tokens.length) {
    const token = tokens[cursor] ?? "";
    const normalizedToken = token.toLowerCase();

    if (token === "--") {
      cursor += 1;
      continue;
    }

    if (normalizedToken.startsWith("--") && normalizedToken.includes("=")) {
      cursor += 1;
      continue;
    }

    if (optionsWithArguments.has(token) || optionsWithArguments.has(normalizedToken)) {
      cursor += 2;
      continue;
    }

    if (token.startsWith("-")) {
      cursor += 1;
      continue;
    }

    operands.push(token);
    cursor += 1;
  }

  return operands;
}

function extractFollowableLogFilePathsFromHistory(history: string[]) {
  const paths: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "tail" || tokens[1]?.toLowerCase() !== "-f") {
      return;
    }

    const pathValue = tokens[2] ?? "";
    if (isLikelyFollowableLogPathValue(pathValue)) {
      paths.push(stripShellQuotes(pathValue));
    }
  });

  return uniqueDerivedValues(paths);
}

function extractEditorFilePathsFromHistory(history: string[]) {
  const paths: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (!TEXT_EDITOR_COMMANDS.has(tokens[0]?.toLowerCase() ?? "")) {
      return;
    }

    const pathValue = getFirstNonOptionToken(tokens, 1, new Set());
    if (isLikelyPathValue(pathValue)) {
      paths.push(stripShellQuotes(pathValue));
    }
  });

  return uniqueDerivedValues(paths);
}

function extractFilePathsFromHistory(history: string[]) {
  const paths: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    const executable = tokens[0]?.toLowerCase() ?? "";

    if (TEXT_EDITOR_COMMANDS.has(executable) || FILE_VALUE_COMMANDS.has(executable)) {
      getPathOperands(tokens, 1).forEach((pathValue) => {
        if (isLikelyFilePathValue(pathValue)) {
          paths.push(stripShellQuotes(pathValue));
        }
      });
      return;
    }

    if (executable === "tail" && tokens[1]?.toLowerCase() === "-f") {
      const pathValue = tokens[2] ?? "";
      if (isLikelyFilePathValue(pathValue)) {
        paths.push(stripShellQuotes(pathValue));
      }
      return;
    }

    if (FILE_SOURCE_COMMANDS.has(executable)) {
      getPathOperands(tokens, 1).forEach((pathValue) => {
        if (isLikelyFilePathValue(pathValue)) {
          paths.push(stripShellQuotes(pathValue));
        }
      });
      return;
    }

    if (FILE_TARGET_COMMANDS.has(executable)) {
      getPathOperands(tokens, 2).forEach((pathValue) => {
        if (isLikelyFilePathValue(pathValue)) {
          paths.push(stripShellQuotes(pathValue));
        }
      });
    }
  });

  return uniqueDerivedValues(paths);
}

function extractDirectoryPathsFromHistory(history: string[]) {
  const directories: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    const executable = tokens[0]?.toLowerCase() ?? "";

    if (DIRECTORY_VALUE_COMMANDS.has(executable)) {
      getPathOperands(tokens, 1).forEach((pathValue) => {
        if (isLikelyPathValue(pathValue)) {
          directories.push(stripShellQuotes(pathValue));
        }
      });
    }

    if (executable === "tar") {
      extractTarDirectoriesFromHistory([tokens.join(" ")]).forEach((directory) => {
        directories.push(directory);
      });
    }

    getPathOperands(tokens, 1).forEach((pathValue) => {
      if (isLikelyFilePathValue(pathValue)) {
        const parentDirectory = getPathParentDirectory(pathValue);
        if (parentDirectory) {
          directories.push(parentDirectory);
        }
      }
    });
  });

  return uniqueDerivedValues(directories);
}

function extractTarDirectoriesFromHistory(history: string[]) {
  const directories: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "tar") {
      return;
    }

    tokens.forEach((token, index) => {
      const normalizedToken = token.toLowerCase();
      const directory =
        token === "-C" || normalizedToken === "--directory"
            ? tokens[index + 1]
            : normalizedToken.startsWith("--directory=")
              ? token.slice("--directory=".length)
              : "";

      if (directory && isLikelyPathValue(directory)) {
        directories.push(stripShellQuotes(directory));
      }
    });
  });

  return uniqueDerivedValues(directories);
}

function extractCurlOutputPathsFromHistory(history: string[]) {
  const paths: string[] = [];

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "curl") {
      return;
    }

    tokens.forEach((token, index) => {
      const normalizedToken = token.toLowerCase();
      const outputPath =
        normalizedToken === "-o" || normalizedToken === "--output"
          ? tokens[index + 1]
          : normalizedToken.startsWith("--output=")
            ? token.slice("--output=".length)
            : "";

      if (outputPath && isLikelyPathValue(outputPath)) {
        paths.push(stripShellQuotes(outputPath));
      }
    });
  });

  return uniqueDerivedValues(paths);
}

function extractSystemdUnitsFromHistory(history: string[]) {
  const units: string[] = [];

  history
    .filter((command) => isUsefulAutocompleteHistoryCommand(command))
    .forEach((command) => {
      const systemctlTarget = getSystemctlUnitTarget(command);
      if (
        systemctlTarget &&
        isLikelySystemdUnitTarget(systemctlTarget) &&
        systemdUnitHasExplicitSuffix(systemctlTarget)
      ) {
        units.push(stripShellQuotes(systemctlTarget));
      }

      const tokens = splitCommandTokens(getAutocompleteContext(command).matchCommand);
      if (tokens[0]?.toLowerCase() !== "journalctl") {
        return;
      }

      tokens.forEach((token, index) => {
        const normalizedToken = token.toLowerCase();
        const unit =
          normalizedToken === "-u" || normalizedToken === "--unit"
            ? tokens[index + 1]
            : normalizedToken.startsWith("--unit=")
              ? token.slice("--unit=".length)
              : "";

        if (unit && isLikelySystemdUnitTarget(unit)) {
          units.push(stripShellQuotes(unit));
        }
      });
    });

  return uniqueDerivedValues(units);
}

export function extractSystemdUnitsFromTerminalOutput(output: string) {
  const units: string[] = [];
  const normalizedOutput = output.replace(ANSI_ESCAPE_RE, " ");
  const suffixPattern = [...SYSTEMD_UNIT_SUFFIXES].join("|");
  const unitPattern = new RegExp(
    `\\b([A-Za-z0-9][A-Za-z0-9@_.:+-]*\\.(?:${suffixPattern}))\\b`,
    "gi",
  );

  for (const line of normalizedOutput.split(/\r?\n/)) {
    if (lineLooksLikeMissingSystemdUnit(line)) {
      continue;
    }

    for (const match of line.matchAll(unitPattern)) {
      const unit = match[1] ?? "";
      if (isLikelySystemdUnitTarget(unit)) {
        units.push(unit);
      }
    }
  }

  return uniqueDerivedValues(units);
}

function lineLooksLikeMissingSystemdUnit(line: string) {
  const normalizedLine = line.toLowerCase();
  return (
    normalizedLine.includes("could not be found") ||
    normalizedLine.includes("unit not found") ||
    normalizedLine.includes("unit file not found") ||
    normalizedLine.includes("loaded: not-found") ||
    normalizedLine.includes("not loaded")
  );
}

function getServiceNameFromSystemdUnit(unit: string) {
  const normalizedUnit = stripShellQuotes(unit).trim();
  if (!normalizedUnit || normalizedUnit.startsWith("-")) {
    return "";
  }

  const dotIndex = normalizedUnit.lastIndexOf(".");
  if (dotIndex === -1) {
    return isLikelySystemdUnitTarget(normalizedUnit) ? normalizedUnit : "";
  }

  const suffix = normalizedUnit.slice(dotIndex + 1).toLowerCase();
  if (suffix !== "service") {
    return "";
  }

  return normalizedUnit.slice(0, dotIndex);
}

function isLikelyServiceName(value: string) {
  const serviceName = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(serviceName) &&
    !serviceName.includes("/") &&
    !serviceName.includes(":") &&
    /^[a-z0-9][a-z0-9@_.+-]*$/i.test(serviceName)
  );
}

function extractServiceNamesFromHistory(history: string[]) {
  const serviceNames: string[] = [];

  extractSystemdUnitsFromHistory(history).forEach((unit) => {
    const serviceName = getServiceNameFromSystemdUnit(unit);
    if (isLikelyServiceName(serviceName)) {
      serviceNames.push(serviceName);
    }
  });

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "service") {
      return;
    }

    const serviceName = tokens[1] ?? "";
    if (isLikelyServiceName(serviceName)) {
      serviceNames.push(stripShellQuotes(serviceName));
    }
  });

  return uniqueDerivedValues(serviceNames);
}

function isLikelyPackageName(value: string) {
  const packageName = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(packageName) &&
    packageName.length <= 80 &&
    !packageName.includes("/") &&
    /^[a-z0-9][a-z0-9+.-]*$/i.test(packageName)
  );
}

function extractPackageNamesFromHistory(history: string[]) {
  const packageNames: string[] = [];
  const aptPackageSubcommands = new Set([
    "install",
    "remove",
    "purge",
    "reinstall",
    "show",
    "search",
  ]);
  const aptCachePackageSubcommands = new Set([
    "depends",
    "policy",
    "rdepends",
    "search",
    "show",
  ]);
  const dpkgPackageOptions = new Set([
    "-l",
    "--list",
    "-s",
    "--status",
    "-L",
    "--listfiles",
    "-S",
    "--search",
  ]);

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    const executable = tokens[0]?.toLowerCase() ?? "";

    if (executable === "apt" || executable === "apt-get") {
      const subcommand = tokens[1]?.toLowerCase() ?? "";
      if (!aptPackageSubcommands.has(subcommand)) {
        return;
      }

      tokens.slice(2).forEach((token) => {
        if (isLikelyPackageName(token)) {
          packageNames.push(stripShellQuotes(token));
        }
      });
      return;
    }

    if (executable === "apt-cache") {
      const subcommand = tokens[1]?.toLowerCase() ?? "";
      if (!aptCachePackageSubcommands.has(subcommand)) {
        return;
      }

      tokens.slice(2).forEach((token) => {
        if (isLikelyPackageName(token)) {
          packageNames.push(stripShellQuotes(token));
        }
      });
      return;
    }

    if (executable === "dpkg") {
      const option = tokens[1] ?? "";
      if (!dpkgPackageOptions.has(option)) {
        return;
      }

      tokens.slice(2).forEach((token) => {
        if (isLikelyPackageName(token)) {
          packageNames.push(stripShellQuotes(token));
        }
      });
    }
  });

  return uniqueDerivedValues(packageNames);
}

function isLikelyDockerTarget(value: string) {
  const target = stripShellQuotes(value).trim();
  return (
    isLikelyHistoryValue(target) &&
    !target.includes("/") &&
    !target.includes(":") &&
    /^[a-z0-9][a-z0-9_.-]*$/i.test(target)
  );
}

function extractDockerTargetsFromHistory(history: string[]) {
  const containers: string[] = [];
  const composeServices: string[] = [];
  const dockerTargetCommands = new Set([
    "logs",
    "exec",
    "inspect",
    "stop",
    "start",
    "restart",
  ]);
  const dockerOptionsWithArguments = new Set([
    "--env",
    "--user",
    "--workdir",
    "--detach-keys",
  ]);
  const composeTargetCommands = new Set([
    "logs",
    "exec",
    "restart",
    "stop",
    "start",
    "rm",
    "up",
  ]);

  extractUsefulHistoryTokens(history).forEach((tokens) => {
    if (tokens[0]?.toLowerCase() !== "docker") {
      return;
    }

    if (tokens[1]?.toLowerCase() === "compose") {
      const subcommand = tokens[2]?.toLowerCase() ?? "";
      if (!composeTargetCommands.has(subcommand)) {
        return;
      }

      const service = getFirstNonOptionToken(
        tokens,
        3,
        dockerOptionsWithArguments,
      );
      if (isLikelyDockerTarget(service)) {
        composeServices.push(stripShellQuotes(service));
      }
      return;
    }

    const subcommand = tokens[1]?.toLowerCase() ?? "";
    if (!dockerTargetCommands.has(subcommand)) {
      return;
    }

    const container = getFirstNonOptionToken(
      tokens,
      2,
      dockerOptionsWithArguments,
    );
    if (isLikelyDockerTarget(container)) {
      containers.push(stripShellQuotes(container));
    }
  });

  return {
    containers: uniqueDerivedValues(containers),
    composeServices: uniqueDerivedValues(composeServices),
  };
}

function buildContextualHistorySuggestions(
  context: TerminalAutocompleteContext,
  history: string[],
) {
  const suggestions: string[] = [];
  const systemctlUnitPrefix = getSystemctlUnitSuggestionPrefix(
    context.matchCommand,
  );
  const journalctlUnitPrefix = getJournalctlUnitSuggestionPrefix(
    context.matchCommand,
  );
  const sshHostPrefix = getSshHostSuggestionPrefix(context.matchCommand);
  const scpRemotePrefix = getRemoteDestinationPrefix(context.matchCommand, "scp");
  const rsyncRemotePrefix = getRemoteDestinationPrefix(
    context.matchCommand,
    "rsync",
  );
  const dockerContainerPrefix = getDockerContainerSuggestionPrefix(
    context.matchCommand,
  );
  const dockerComposeServicePrefix = getDockerComposeServiceSuggestionPrefix(
    context.matchCommand,
  );
  const aptPackagePrefix = getAptPackageSuggestionPrefix(context.matchCommand);
  const serviceNamePrefix = getServiceNameSuggestionPrefix(context.matchCommand);
  const pingTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "ping",
    PING_TARGET_OPTION_ARGUMENTS,
  );
  const tracerouteTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "traceroute",
    TRACEROUTE_TARGET_OPTION_ARGUMENTS,
  );
  const digTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "dig",
    DIG_TARGET_OPTION_ARGUMENTS,
  );
  const hostTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "host",
    HOST_TARGET_OPTION_ARGUMENTS,
  );
  const nmapTargetPrefix = getNetworkTargetSuggestionPrefix(
    context.matchCommand,
    "nmap",
    NMAP_TARGET_OPTION_ARGUMENTS,
  );
  const resolvectlQueryPrefix = getLiteralArgumentSuggestionPrefix(
    context.matchCommand,
    "resolvectl",
    "query",
  );
  const opensslConnectPrefix = getOpenSslConnectSuggestionPrefix(
    context.matchCommand,
  );
  const gitRefPrefix = getGitRefSuggestionPrefix(context.matchCommand);
  const gitPullPushPrefix = getGitPullPushRemoteSuggestionPrefix(
    context.matchCommand,
  );
  const gitPushBranchPrefix = getGitPushBranchSuggestionPrefix(
    context.matchCommand,
  );
  const gitBranchTargetPrefix = getGitBranchTargetSuggestionPrefix(
    context.matchCommand,
  );
  const logFilePrefix = getLogFileSuggestionPrefix(context.matchCommand);
  const editorFilePrefix = getEditorFileSuggestionPrefix(context.matchCommand);
  const directoryPathPrefix = getDirectoryPathSuggestionPrefix(
    context.matchCommand,
  );
  const filePathPrefix = getFilePathSuggestionPrefix(context.matchCommand);
  const fileSourcePrefix = getFileSourceSuggestionPrefix(context.matchCommand);
  const directoryTargetPrefix = getDirectoryTargetSuggestionPrefix(
    context.matchCommand,
  );
  const permissionTargetPrefix = getPermissionTargetSuggestionPrefix(
    context.matchCommand,
  );
  const tarDirectoryPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "tar",
    ["-C", "--directory"],
  );
  const curlOutputPrefix = getOptionValueSuggestionPrefix(
    context.matchCommand,
    "curl",
    ["-o", "--output"],
  );

  if (systemctlUnitPrefix || journalctlUnitPrefix) {
    extractSystemdUnitsFromHistory(history).forEach((unit) => {
      if (systemctlUnitPrefix) {
        suggestions.push(`${systemctlUnitPrefix}${unit}`);
      }
      if (journalctlUnitPrefix) {
        suggestions.push(`${journalctlUnitPrefix}${unit}`);
      }
    });
  }

  if (sshHostPrefix) {
    extractSshHostsFromHistory(history).forEach((host) => {
      suggestions.push(`${sshHostPrefix}${host}`);
    });
  }

  if (scpRemotePrefix || rsyncRemotePrefix) {
    extractRemoteDestinationsFromHistory(history).forEach((destination) => {
      if (scpRemotePrefix) {
        suggestions.push(`${scpRemotePrefix}${destination}`);
      }
      if (rsyncRemotePrefix) {
        suggestions.push(`${rsyncRemotePrefix}${destination}`);
      }
    });
  }

  if (dockerContainerPrefix || dockerComposeServicePrefix) {
    const { containers, composeServices } =
      extractDockerTargetsFromHistory(history);

    if (dockerContainerPrefix) {
      containers.forEach((container) => {
        suggestions.push(`${dockerContainerPrefix}${container}`);
      });
    }

    if (dockerComposeServicePrefix) {
      composeServices.forEach((service) => {
        suggestions.push(`${dockerComposeServicePrefix}${service}`);
      });
    }
  }

  if (aptPackagePrefix) {
    extractPackageNamesFromHistory(history).forEach((packageName) => {
      suggestions.push(`${aptPackagePrefix}${packageName}`);
    });
  }

  if (serviceNamePrefix) {
    extractServiceNamesFromHistory(history).forEach((serviceName) => {
      suggestions.push(`${serviceNamePrefix}${serviceName}`);
    });
  }

  if (
    pingTargetPrefix ||
    tracerouteTargetPrefix ||
    digTargetPrefix ||
    hostTargetPrefix ||
    nmapTargetPrefix ||
    resolvectlQueryPrefix
  ) {
    extractNetworkTargetsFromHistory(history).forEach((target) => {
      if (pingTargetPrefix) {
        suggestions.push(`${pingTargetPrefix}${target}`);
      }
      if (tracerouteTargetPrefix) {
        suggestions.push(`${tracerouteTargetPrefix}${target}`);
      }
      if (digTargetPrefix) {
        suggestions.push(`${digTargetPrefix}${target}`);
      }
      if (hostTargetPrefix) {
        suggestions.push(`${hostTargetPrefix}${target}`);
      }
      if (nmapTargetPrefix) {
        suggestions.push(`${nmapTargetPrefix}${target}`);
      }
      if (resolvectlQueryPrefix) {
        suggestions.push(`${resolvectlQueryPrefix}${target}`);
      }
    });
  }

  if (opensslConnectPrefix) {
    extractTlsEndpointsFromHistory(history).forEach((endpoint) => {
      suggestions.push(`${opensslConnectPrefix}${endpoint}`);
    });
  }

  if (gitRefPrefix || gitPushBranchPrefix || gitBranchTargetPrefix) {
    const gitRefs = extractGitRefsFromHistory(history);
    const localGitBranches = gitRefs.filter(isLikelyLocalGitBranch);

    gitRefs.forEach((ref) => {
      if (gitRefPrefix) {
        suggestions.push(`${gitRefPrefix}${ref}`);
      }
    });

    localGitBranches.forEach((ref) => {
      if (gitPushBranchPrefix) {
        suggestions.push(`${gitPushBranchPrefix}${ref}`);
      }
      if (gitBranchTargetPrefix) {
        suggestions.push(`${gitBranchTargetPrefix}${ref}`);
      }
    });
  }

  if (gitPullPushPrefix) {
    extractGitRemotesFromHistory(history).forEach((remote) => {
      suggestions.push(`${gitPullPushPrefix}${remote}`);
    });
  }

  if (logFilePrefix) {
    const historyPaths = context.matchCommand
      .trimStart()
      .toLowerCase()
      .startsWith("tail -f")
      ? extractFollowableLogFilePathsFromHistory(history)
      : extractLogFilePathsFromHistory(history);

    historyPaths.forEach((pathValue) => {
      suggestions.push(`${logFilePrefix}${pathValue}`);
    });
  }

  if (editorFilePrefix) {
    extractEditorFilePathsFromHistory(history).forEach((pathValue) => {
      suggestions.push(`${editorFilePrefix}${pathValue}`);
    });
  }

  if (directoryPathPrefix || directoryTargetPrefix) {
    extractDirectoryPathsFromHistory(history).forEach((directory) => {
      if (directoryPathPrefix) {
        suggestions.push(`${directoryPathPrefix}${directory}`);
      }
      if (directoryTargetPrefix) {
        suggestions.push(`${directoryTargetPrefix}${directory}`);
      }
    });
  }

  if (filePathPrefix || fileSourcePrefix || permissionTargetPrefix) {
    extractFilePathsFromHistory(history).forEach((pathValue) => {
      if (filePathPrefix) {
        suggestions.push(`${filePathPrefix}${pathValue}`);
      }
      if (fileSourcePrefix) {
        suggestions.push(`${fileSourcePrefix}${pathValue}`);
      }
      if (permissionTargetPrefix) {
        suggestions.push(`${permissionTargetPrefix}${pathValue}`);
      }
    });
  }

  if (tarDirectoryPrefix) {
    extractTarDirectoriesFromHistory(history).forEach((directory) => {
      suggestions.push(`${tarDirectoryPrefix}${directory}`);
    });
  }

  if (curlOutputPrefix) {
    extractCurlOutputPathsFromHistory(history).forEach((outputPath) => {
      suggestions.push(`${curlOutputPrefix}${outputPath}`);
    });
  }

  return uniqueDerivedValues(suggestions).map((suggestion) =>
    withAutocompleteContextPrefix(context, suggestion),
  );
}

function isSystemctlUnitCommandPrefix(command: string) {
  const tokens = getEffectiveCommandTokens(command);
  if (tokens[0]?.toLowerCase() !== "systemctl") {
    return false;
  }

  let index = 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    index += 1;
  }

  const subcommand = tokens[index]?.toLowerCase();
  return Boolean(subcommand && SYSTEMCTL_UNIT_SUBCOMMANDS.has(subcommand));
}

export function isSystemdUnitAutocompleteContext(command: string) {
  const context = getAutocompleteContext(command);
  return Boolean(
    getSystemctlUnitSuggestionPrefix(context.matchCommand) ||
      getJournalctlUnitSuggestionPrefix(context.matchCommand) ||
      getServiceNameSuggestionPrefix(context.matchCommand) ||
      getSubcommandValueSuggestionPrefix(context.matchCommand, "systemd-analyze", [
        "verify",
        "critical-chain",
      ]),
  );
}

function systemdUnitHasExplicitSuffix(target: string) {
  const normalizedTarget = stripShellQuotes(target).toLowerCase();
  const dotIndex = normalizedTarget.lastIndexOf(".");
  if (dotIndex === -1) {
    return false;
  }

  return SYSTEMD_UNIT_SUFFIXES.has(normalizedTarget.slice(dotIndex + 1));
}

function shouldSuppressCatalogSystemctlUnitCandidate(
  candidate: string,
  context: TerminalAutocompleteContext,
  availableSystemdUnits: string[],
) {
  const contextTokens = getEffectiveCommandTokens(context.matchCommand);
  if (contextTokens[0]?.toLowerCase() !== "systemctl") {
    return false;
  }

  const unitTarget = getSystemctlUnitTarget(candidate);
  if (!unitTarget || hasPlaceholder(candidate)) {
    return false;
  }

  const currentUnitTarget = getSystemctlUnitTarget(context.matchCommand);
  if (
    currentUnitTarget &&
    normalizeAutocompleteCommand(candidate).startsWith(
      `${normalizeAutocompleteCommand(context.matchCommand.trim())} `,
    )
  ) {
    return false;
  }

  const normalizedUnitTarget = stripShellQuotes(unitTarget).toLowerCase();
  const availableUnitNames = new Set(
    availableSystemdUnits.map((unit) => stripShellQuotes(unit).toLowerCase()),
  );

  return !availableUnitNames.has(normalizedUnitTarget);
}

function stripShellQuotes(value: string) {
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

function isLikelySystemdUnitTarget(target: string) {
  const normalizedTarget = stripShellQuotes(target).toLowerCase();
  if (!normalizedTarget || normalizedTarget.startsWith("-")) {
    return false;
  }

  const dotIndex = normalizedTarget.lastIndexOf(".");
  if (dotIndex !== -1) {
    const suffix = normalizedTarget.slice(dotIndex + 1);
    return SYSTEMD_UNIT_SUFFIXES.has(suffix);
  }

  if (COMMON_SUFFIXLESS_SYSTEMD_UNITS.has(normalizedTarget)) {
    return true;
  }

  if (normalizedTarget.length < MIN_SUFFIXLESS_SYSTEMD_UNIT_LENGTH) {
    return false;
  }

  if (isKnownCommandToken(normalizedTarget)) {
    return false;
  }

  return /^[a-z0-9][a-z0-9@_:+-]*$/i.test(normalizedTarget);
}

function isPathlessScriptExecutable(command: string) {
  const executable = stripShellQuotes(
    getEffectiveCommandTokens(command)[0] ?? "",
  );
  return (
    PATHLESS_SCRIPT_EXECUTABLE_RE.test(executable) &&
    !executable.includes("/") &&
    !executable.includes("\\") &&
    !executable.startsWith("./") &&
    !executable.startsWith("../") &&
    !executable.startsWith("~")
  );
}

export function isUsefulAutocompleteHistoryCommand(command: string) {
  if (
    !isValidAutocompleteCommand(command) ||
    !isSafeAutocompleteSuggestion(command) ||
    isPathlessScriptExecutable(command)
  ) {
    return false;
  }

  const systemctlTarget = getSystemctlUnitTarget(command);
  if (systemctlTarget) {
    return (
      isLikelySystemdUnitTarget(systemctlTarget) &&
      systemdUnitHasExplicitSuffix(systemctlTarget)
    );
  }

  return true;
}

function hasSuspiciousGhostCompletion(
  currentCommand: string,
  selectedCommand: string,
) {
  if (/\s$/.test(currentCommand)) {
    return false;
  }

  const completion = getTerminalAutocompleteCompletion(
    currentCommand,
    selectedCommand,
  );
  const lastTypedToken = currentCommand.trimEnd().match(/\S+$/)?.[0] ?? "";
  const firstCompletionToken = completion.trimStart().split(/\s+/, 1)[0] ?? "";
  const joinedToken = `${lastTypedToken}${firstCompletionToken}`.toLowerCase();

  return (
    (lastTypedToken.length >= 2 &&
      DUPLICATE_PRIVILEGE_WRAPPERS.has(joinedToken)) ||
    (lastTypedToken.length >= MIN_KNOWN_COMMAND_SUFFIX_LENGTH &&
      /^[A-Za-z0-9._+-]$/.test(lastTypedToken.slice(-1)) &&
      /^[A-Za-z0-9._+-]/.test(firstCompletionToken) &&
      (isKnownCommandToken(firstCompletionToken) ||
        hasSuspiciousKnownCommandSuffix(joinedToken)))
  );
}

function readBooleanSetting(
  key: string,
  fallback: boolean,
  storage = typeof window === "undefined" ? undefined : window.localStorage,
) {
  if (!storage) {
    return fallback;
  }

  const value = storage.getItem(key);
  return value === null ? fallback : value === "true";
}

function legacyAutocompleteEnabled(
  storage = typeof window === "undefined" ? undefined : window.localStorage,
) {
  return readBooleanSetting(LEGACY_AUTOCOMPLETE_KEY, false, storage);
}

function readGhostAutocompleteSetting(
  storage = typeof window === "undefined" ? undefined : window.localStorage,
) {
  if (!storage) {
    return false;
  }

  const existingGhostValue = storage.getItem(GHOST_AUTOCOMPLETE_KEY);
  if (existingGhostValue !== null) {
    return existingGhostValue === "true";
  }

  const legacyInlineValue = storage.getItem(INLINE_AUTOCOMPLETE_KEY);
  if (legacyInlineValue !== null) {
    storage.setItem(GHOST_AUTOCOMPLETE_KEY, legacyInlineValue);
    return legacyInlineValue === "true";
  }

  const legacyEnabled = legacyAutocompleteEnabled(storage);
  storage.setItem(GHOST_AUTOCOMPLETE_KEY, legacyEnabled.toString());
  return legacyEnabled;
}

export function getTerminalAutocompleteSettings(): TerminalAutocompleteSettings {
  if (typeof window === "undefined") {
    return {
      ghost: false,
      popup: false,
      popupAuto: false,
      help: false,
      inline: false,
    };
  }

  const legacyEnabled = legacyAutocompleteEnabled();
  const ghostEnabled = readGhostAutocompleteSetting();

  return {
    ghost: ghostEnabled,
    popup: readBooleanSetting(POPUP_AUTOCOMPLETE_KEY, legacyEnabled),
    popupAuto: readBooleanSetting(POPUP_AUTO_AUTOCOMPLETE_KEY, false),
    help: readBooleanSetting(HELP_AUTOCOMPLETE_KEY, false),
    inline: ghostEnabled,
  };
}

export function setTerminalAutocompleteSetting(
  key: keyof TerminalAutocompleteSettings,
  value: boolean,
) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey =
    key === "ghost" || key === "inline"
      ? GHOST_AUTOCOMPLETE_KEY
      : key === "popup"
        ? POPUP_AUTOCOMPLETE_KEY
        : key === "popupAuto"
          ? POPUP_AUTO_AUTOCOMPLETE_KEY
          : HELP_AUTOCOMPLETE_KEY;

  window.localStorage.setItem(storageKey, value.toString());
  if (key === "ghost" || key === "inline") {
    window.localStorage.setItem(INLINE_AUTOCOMPLETE_KEY, value.toString());
  }
  window.dispatchEvent(new Event("terminalAutocompleteSettingsChanged"));

  if (
    key === "ghost" ||
    key === "inline" ||
    key === "popup" ||
    key === "popupAuto"
  ) {
    const settings = getTerminalAutocompleteSettings();
    window.localStorage.setItem(
      LEGACY_AUTOCOMPLETE_KEY,
      (settings.ghost || settings.popup).toString(),
    );
    window.dispatchEvent(new Event("commandAutocompleteChanged"));
  }
}

export function isValidAutocompleteCommand(command: string) {
  const trimmedCommand = command.trim();

  if (
    trimmedCommand.length === 0 ||
    trimmedCommand.length > MAX_AUTOCOMPLETE_COMMAND_LENGTH
  ) {
    return false;
  }

  if (
    CONTROL_CHARS_RE.test(trimmedCommand) ||
    trimmedCommand.includes("\ufffd") ||
    PROMPT_PREFIX_RE.test(trimmedCommand) ||
    OPTION_SMEAR_RE.test(trimmedCommand)
  ) {
    return false;
  }

  const executable = getEffectiveExecutable(trimmedCommand) ?? "";
  return (
    !EXECUTABLE_REPEAT_RE.test(executable) &&
    !hasRepeatedPrivilegeWrapper(trimmedCommand) &&
    !hasSuspiciousKnownCommandSuffix(executable)
  );
}

function isSafeAutocompleteSuggestion(command: string) {
  return !UNSAFE_AUTOCOMPLETE_RE.test(command);
}

export function isCommandAutocompleteEnabled() {
  const settings = getTerminalAutocompleteSettings();
  return settings.ghost || settings.popup;
}

function getSingleValueHistorySuggestionPrefix(command: string) {
  return (
    getLogFileSuggestionPrefix(command) ??
    getEditorFileSuggestionPrefix(command) ??
    getDirectoryPathSuggestionPrefix(command) ??
    getFilePathSuggestionPrefix(command) ??
    getFileSourceSuggestionPrefix(command) ??
    getDirectoryTargetSuggestionPrefix(command) ??
    getPermissionTargetSuggestionPrefix(command) ??
    getSshHostSuggestionPrefix(command) ??
    getGitRefSuggestionPrefix(command) ??
    getGitPullPushRemoteSuggestionPrefix(command) ??
    getGitPushBranchSuggestionPrefix(command) ??
    getGitBranchTargetSuggestionPrefix(command) ??
    getOptionValueSuggestionPrefix(command, "tar", ["-C", "--directory"]) ??
    getOptionValueSuggestionPrefix(command, "curl", ["-o", "--output"]) ??
    getOpenSslConnectSuggestionPrefix(command) ??
    getDockerContainerSuggestionPrefix(command) ??
    getDockerComposeServiceSuggestionPrefix(command)
  );
}

function isOverlongSingleValueCandidate(
  candidate: string,
  context: TerminalAutocompleteContext,
) {
  const valuePrefix = getSingleValueHistorySuggestionPrefix(
    context.matchCommand,
  );

  if (!valuePrefix) {
    return false;
  }

  const effectiveCandidate = getEffectiveCandidate(candidate, context).trim();
  if (
    !normalizeAutocompleteCommand(effectiveCandidate).startsWith(
      normalizeAutocompleteCommand(valuePrefix),
    )
  ) {
    return false;
  }

  const expectedTokenCount = splitCommandTokens(valuePrefix).length + 1;
  return (
    splitCommandTokens(getTerminalAutocompleteInsertCommand(effectiveCandidate))
      .length > expectedTokenCount
  );
}

function isOverlongOpenSslConnectCatalogCandidate(
  candidate: string,
  context: TerminalAutocompleteContext,
) {
  return Boolean(
    getOpenSslConnectSuggestionPrefix(context.matchCommand) &&
      isOverlongSingleValueCandidate(candidate, context),
  );
}

export function buildTerminalAutocompleteMatchItems(
  currentCommand: string,
  history: string[],
  options: TerminalAutocompleteMatchOptions = {},
): TerminalAutocompleteMatch[] {
  const trimmedCommand = currentCommand.trim();
  if (!trimmedCommand) {
    return [];
  }

  const mode = options.mode ?? "popup";
  const context = getAutocompleteContext(currentCommand);
  if (
    mode === "ghost" &&
    (isBareWrapperCommand(currentCommand) ||
      isCompleteKnownEffectiveCommand(currentCommand))
  ) {
    return [];
  }

  const normalizedCurrentCommand = normalizeAutocompleteCommand(
    context.typedCommand,
  );
  const normalizedMatchCommand = normalizeAutocompleteCommand(
    context.matchCommand,
  );
  const matches: TerminalAutocompleteMatch[] = [];
  const seen = new Set<string>();
  const availableSystemdUnits = options.systemdUnits ?? [];
  const historyCommands = new Set(
    history.flatMap((command) => {
      const normalizedCommand = normalizeAutocompleteCommand(command);
      const unwrappedCommand = getPrivilegeUnwrappedCommand(command);

      return unwrappedCommand
        ? [normalizedCommand, normalizeAutocompleteCommand(unwrappedCommand)]
        : [normalizedCommand];
    }),
  );

  const appendMatchVariant = (
    candidate: string,
    matchCandidate: string,
    source: TerminalAutocompleteSource,
    allowContextMatch = false,
  ) => {
    const trimmedCandidate = candidate.trim();
    const trimmedMatchCandidate = matchCandidate.trim();
    const candidateHasPlaceholder = hasPlaceholder(trimmedCandidate);
    if (
      (candidateHasPlaceholder && (source === "history" || mode === "ghost")) ||
      (source === "history" &&
        isOverlongSingleValueCandidate(trimmedCandidate, context)) ||
      (source === "catalog" &&
        isOverlongOpenSslConnectCatalogCandidate(trimmedCandidate, context)) ||
      (source === "catalog" &&
        shouldSuppressCatalogSystemctlUnitCandidate(
          trimmedCandidate,
          context,
          availableSystemdUnits,
        )) ||
      (source === "history"
        ? !isUsefulAutocompleteHistoryCommand(trimmedCandidate)
        : !isValidAutocompleteCommand(trimmedCandidate)) ||
      !isSafeAutocompleteSuggestion(trimmedCandidate)
    ) {
      return;
    }

    const normalizedCandidate = normalizeAutocompleteCommand(trimmedCandidate);
    const normalizedMatchCandidate = normalizeAutocompleteCommand(
      trimmedMatchCandidate,
    );
    const normalizedInsertCommand = normalizeAutocompleteCommand(
      getTerminalAutocompleteInsertCommand(trimmedCandidate),
    );
    const sameKnownCommandContext =
      source !== "catalog" ||
      !isKnownCommandBoundary(currentCommand, context) ||
      getKnownCommandName(context.matchCommand) ===
        getKnownCommandName(trimmedMatchCandidate);
    const matchesTypedCommand = /\s$/.test(currentCommand)
      ? normalizedCandidate.startsWith(`${normalizedCurrentCommand} `)
      : normalizedCandidate.startsWith(normalizedCurrentCommand);
    const matchesContextCommand =
      allowContextMatch &&
      Boolean(context.prefix) &&
      normalizedMatchCandidate.startsWith(normalizedMatchCommand);

    if (
      !sameKnownCommandContext ||
      normalizedInsertCommand === normalizedCurrentCommand ||
      normalizedCandidate === normalizedCurrentCommand ||
      (!matchesTypedCommand && !matchesContextCommand) ||
      seen.has(normalizedCandidate)
    ) {
      return;
    }

    seen.add(normalizedCandidate);
    matches.push({ command: trimmedCandidate, source });
  };

  const appendMatch = (
    candidate: string,
    source: TerminalAutocompleteSource,
  ) => {
    const trimmedCandidate = candidate.trim();

    appendMatchVariant(trimmedCandidate, trimmedCandidate, source);

    if (source === "catalog" && !context.prefix) {
      const unwrappedCandidate =
        getPrivilegeUnwrappedCommand(trimmedCandidate);

      if (unwrappedCandidate) {
        appendMatchVariant(unwrappedCandidate, unwrappedCandidate, source);
      }
    }

    if (source === "history" && shouldPreferContextualHistoryValues(context)) {
      if (!context.prefix) {
        const unwrappedCandidate =
          getPrivilegeUnwrappedCommand(trimmedCandidate);

        if (unwrappedCandidate) {
          appendMatchVariant(unwrappedCandidate, unwrappedCandidate, source);
        }
      } else if (shouldUseContextPrefixVariant(trimmedCandidate, context)) {
        appendMatchVariant(
          `${context.prefix}${trimmedCandidate}`,
          trimmedCandidate,
          source,
          true,
        );
      }
    }

    if (
      source === "catalog" &&
      context.prefix &&
      shouldUseContextPrefixVariant(trimmedCandidate, context)
    ) {
      appendMatchVariant(
        `${context.prefix}${trimmedCandidate}`,
        trimmedCandidate,
        source,
        true,
      );
    }
  };

  buildContextualCatalogSuggestions(context, availableSystemdUnits).forEach(
    (candidate) => appendMatch(candidate, "catalog"),
  );
  TERMINAL_AUTOCOMPLETE_COMMANDS.forEach((candidate) =>
    appendMatch(candidate, "catalog"),
  );
  buildContextualHistorySuggestions(context, history).forEach((candidate) =>
    appendMatch(candidate, "history"),
  );
  history.forEach((candidate) => appendMatch(candidate, "history"));

  const originalIndexes = new Map<string, number>(
    matches.map((match, index) => [match.command, index]),
  );

  const sortedMatches = [...matches].sort((a, b) => {
    return (
      scoreAutocompleteMatch(
        currentCommand,
        a.command,
        originalIndexes.get(a.command) ?? 0,
        context,
        mode,
        a.source,
      ) -
      scoreAutocompleteMatch(
        currentCommand,
        b.command,
        originalIndexes.get(b.command) ?? 0,
        context,
        mode,
        b.source,
      )
    );
  });

  const historyMatches = sortedMatches.filter(
    (match) =>
      match.source === "history" ||
      historyCommands.has(normalizeAutocompleteCommand(match.command)),
  );
  const catalogMatches = sortedMatches.filter(
    (match) => match.source === "catalog",
  );
  const preferHistoryOnly = shouldPreferHistoryOnly(
    currentCommand,
    context,
    historyMatches,
  );
  const preferContextualHistoryValues =
    shouldPreferContextualHistoryValues(context);
  const preferCurrentSystemdUnits =
    availableSystemdUnits.length > 0 &&
    Boolean(
      getSystemctlUnitSuggestionPrefix(context.matchCommand) ||
        getJournalctlUnitSuggestionPrefix(context.matchCommand),
    );
  const rankedMatches = preferHistoryOnly
    ? historyMatches.map((match) => ({ ...match, source: "history" as const }))
    : preferCurrentSystemdUnits
      ? uniqueAutocompleteMatches([...catalogMatches, ...historyMatches])
    : preferContextualHistoryValues
      ? uniqueAutocompleteMatches([...historyMatches, ...catalogMatches])
      : mode === "popup" &&
        shouldGroupCatalogBeforeHistory(
          currentCommand,
          context,
          catalogMatches,
        )
      ? uniqueAutocompleteMatches([...catalogMatches, ...historyMatches])
      : sortedMatches;
  const visibleMatches =
    mode === "ghost"
      ? rankedMatches.filter(
          (match) =>
            !hasSuspiciousGhostCompletion(currentCommand, match.command),
        )
      : rankedMatches;

  const suggestionLimit =
    options.limit ??
    (mode === "ghost"
      ? MAX_GHOST_AUTOCOMPLETE_SUGGESTIONS
      : MAX_POPUP_AUTOCOMPLETE_SUGGESTIONS);

  return visibleMatches.slice(0, suggestionLimit);
}

export function buildTerminalAutocompleteMatches(
  currentCommand: string,
  history: string[],
  options: TerminalAutocompleteMatchOptions = {},
) {
  return buildTerminalAutocompleteMatchItems(
    currentCommand,
    history,
    options,
  ).map((match) => match.command);
}

export function getTerminalAutocompleteCompletion(
  currentCommand: string,
  selectedCommand: string,
) {
  const commandToInsert = getTerminalAutocompleteInsertCommand(selectedCommand);
  const typedCommand = currentCommand.trimStart();
  if (!typedCommand) {
    return commandToInsert;
  }

  const normalizedTypedCommand = typedCommand.toLowerCase();
  const normalizedSelectedCommand = commandToInsert.toLowerCase();

  if (normalizedSelectedCommand.startsWith(normalizedTypedCommand)) {
    return commandToInsert.substring(typedCommand.length);
  }

  const trimmedTypedCommand = typedCommand.trimEnd();
  const normalizedTrimmedTypedCommand = trimmedTypedCommand.toLowerCase();

  if (!normalizedSelectedCommand.startsWith(normalizedTrimmedTypedCommand)) {
    return "";
  }

  const completion = commandToInsert.substring(trimmedTypedCommand.length);
  if (typedCommand.endsWith(" ") && completion.startsWith(" ")) {
    return completion.substring(1);
  }

  return completion;
}

export function getTerminalAutocompleteInsertCommand(command: string) {
  return command.replace(/\s+(?:<[^>\n]+>|\{\{[^}\n]+\}\})/g, "").trimEnd();
}

export function getTerminalAutocompleteCatalogDisplayLabel(
  currentCommand: string,
  suggestion: string,
) {
  const context = getAutocompleteContext(currentCommand);
  const effectiveSuggestion = getEffectiveCandidate(suggestion, context).trim();
  const suggestionTokens = splitCommandTokens(effectiveSuggestion);
  const commandTokenCount = getKnownCommandTokenCount(effectiveSuggestion);

  if (
    commandTokenCount === 0 ||
    suggestionTokens.length <= commandTokenCount
  ) {
    return effectiveSuggestion;
  }

  return suggestionTokens.slice(commandTokenCount).join(" ");
}

export function getTerminalAutocompleteCatalogDisplayQuery(
  currentCommand: string,
) {
  const context = getAutocompleteContext(currentCommand);
  const effectiveCurrent = context.matchCommand.trim();

  if (!effectiveCurrent || /\s$/.test(context.matchCommand)) {
    return "";
  }

  const currentTokens = splitCommandTokens(effectiveCurrent);
  const commandTokenCount = getKnownCommandTokenCount(effectiveCurrent);

  if (
    commandTokenCount === 0 ||
    currentTokens.length <= commandTokenCount
  ) {
    return "";
  }

  return currentTokens.slice(commandTokenCount).join(" ");
}

const TERMINAL_AUTOCOMPLETE_SUGGESTION_DETAILS: Record<
  string,
  Record<string, string>
> = {
  alias: {
    "ll='ls -lah'": "Alias fuer lange Liste inklusive versteckter Dateien",
    "gs='git status'": "Alias fuer Git-Arbeitsbaumstatus",
    "ga='git add'": "Alias fuer Dateien zum Git-Index hinzufuegen",
    "gp='git pull'": "Alias fuer aktuellen Branch aktualisieren",
    "dc='docker compose'": "Alias fuer Docker-Compose-Kommandos",
    "grep='grep --color=auto'": "Alias fuer farbige grep-Treffer",
    "ports='ss -tulpn'": "Alias fuer lauschende Ports mit Prozessen",
    "..='cd ..'": "Alias fuer ein Verzeichnis nach oben",
    "path='printf %s\\n \"$PATH\"'": "Alias fuer PATH lesbar ausgeben",
    "serve='python -m http.server'": "Alias fuer einfachen HTTP-Server",
    "k='kubectl'": "Alias fuer kubectl",
    "-p": "Alias-Definitionen wiederverwendbar ausgeben",
  },
  basename: {
    "/var/log/syslog": "Dateiname syslog aus Pfad extrahieren",
    "/path/file.txt .txt": "Dateiname ausgeben und Suffix .txt entfernen",
    "-s .log /var/log/syslog": "Suffix .log beim Dateinamen entfernen",
    "-a /etc/passwd /etc/hosts": "mehrere Pfade in einem Aufruf verarbeiten",
    "--suffix=.tar.gz archive.tar.gz": "Suffix .tar.gz entfernen",
    "-z /tmp/file": "Dateiname NUL-getrennt ausgeben",
    "/srv/app/releases/current": "Release-Name aus Pfad extrahieren",
    "-a /var/log/syslog /var/log/auth.log": "mehrere Log-Dateinamen ausgeben",
    "--multiple /etc/passwd /etc/group": "mehrere Pfade mit Langoption verarbeiten",
    "--zero /tmp/file": "Dateiname NUL-getrennt ausgeben",
    "-a": "mehrere Pfade nacheinander verarbeiten",
    "--multiple": "mehrere Pfade nacheinander verarbeiten",
    "-s": "Suffix beim Ausgeben entfernen",
    "--suffix": "Suffix beim Ausgeben entfernen",
    "-z": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--zero": "Ausgabe mit NUL statt Zeilenumbruch trennen",
  },
  bzip2: {
    "-d": "bzip2-Datei entpacken",
    "--decompress": "bzip2-Datei entpacken",
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "Ausgabe auf stdout schreiben",
    "--stdout": "Ausgabe auf stdout schreiben",
    "-t": "komprimierte Datei prüfen",
    "--test": "komprimierte Datei prüfen",
    "-f": "vorhandene Ausgabedatei überschreiben",
    "--force": "vorhandene Ausgabedatei überschreiben",
    "-1": "schnellste Kompression verwenden",
    "-9": "stärkste Kompression verwenden",
    "-v": "Kompressionsdetails anzeigen",
    "--verbose": "Kompressionsdetails anzeigen",
  },
  bunzip2: {
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "entpackten Inhalt auf stdout schreiben",
    "--stdout": "entpackten Inhalt auf stdout schreiben",
    "-f": "vorhandene Ausgabedatei überschreiben",
    "--force": "vorhandene Ausgabedatei überschreiben",
    "-t": "komprimierte Datei prüfen",
    "--test": "komprimierte Datei prüfen",
    "-v": "Entpackdetails anzeigen",
    "--verbose": "Entpackdetails anzeigen",
  },
  base64: {
    "file.bin": "Datei als Base64 ausgeben",
    "-d encoded.txt": "Base64-Datei dekodieren",
    "--decode encoded.txt": "Base64-Datei dekodieren",
    "-w 0 file.bin": "Base64 ohne Zeilenumbruch ausgeben",
    "--wrap 76 file.bin": "Base64-Ausgabe nach 76 Zeichen umbrechen",
    "-i dirty.txt": "ungueltige Zeichen beim Dekodieren ignorieren",
    "-d encoded.txt > decoded.bin": "Base64-Datei in binaere Ausgabe dekodieren",
    "--ignore-garbage -d dirty.txt": "ungueltige Zeichen beim Dekodieren ignorieren",
    "--wrap 0 file.bin": "Base64 ohne Zeilenumbrueche ausgeben",
    "-d": "Base64 dekodieren",
    "--decode": "Base64 dekodieren",
    "-w": "Zeilenbreite fuer Ausgabe setzen",
    "--wrap": "Zeilenbreite fuer Ausgabe setzen",
    "-i": "ungueltige Zeichen ignorieren",
    "--ignore-garbage": "ungueltige Zeichen ignorieren",
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  cat: {
    "-n": "alle Ausgabezeilen nummerieren",
    "-b": "nichtleere Ausgabezeilen nummerieren",
    "-A": "nicht druckbare Zeichen sichtbar machen",
    "-E": "Zeilenenden sichtbar machen",
    "-T": "Tabulatoren sichtbar machen",
    "-s": "mehrere Leerzeilen zusammenfassen",
  },
  column: {
    "-t table.txt": "Datei als Tabelle ausrichten",
    "-t -s ':' /etc/passwd": "Doppelpunkt-getrennte Spalten ausrichten",
    "-N USER,UID,SHELL -t users.tsv": "Spaltennamen setzen und Tabelle ausrichten",
    "-o ' | ' -t table.txt": "Tabelle mit sichtbarem Trenner ausgeben",
    "-s, -t": "CSV-Text am Komma trennen und ausrichten",
    "-t": "Eingabe als Tabelle ausrichten",
    "--table": "Eingabe als Tabelle ausrichten",
    "-s": "Eingabetrenner setzen",
    "--separator": "Eingabetrenner setzen",
    "-N": "Spaltennamen setzen",
    "--table-columns": "Spaltennamen setzen",
    "-o": "Ausgabetrenner setzen",
    "--output-separator": "Ausgabetrenner setzen",
    "-R": "Spalten rechtsbuendig ausrichten",
    "--table-right": "Spalten rechtsbuendig ausrichten",
    "-J": "Tabellen-Ausgabe als JSON erzeugen",
    "--json": "Tabellen-Ausgabe als JSON erzeugen",
  },
  cmp: {
    "file-a file-b": "zwei Dateien bytegenau vergleichen",
    "-s file-a file-b": "nur Exit-Code fuer Vergleich verwenden",
    "-l file-a file-b": "alle abweichenden Bytes ausgeben",
    "-b file-a file-b": "abweichende Bytes als Zeichen ausgeben",
    "--quiet file-a file-b": "nur Exit-Code fuer Vergleich verwenden",
    "--print-bytes file-a file-b": "abweichende Bytes als Zeichen ausgeben",
    "-i": "Bytes am Dateianfang ueberspringen",
    "--ignore-initial": "Bytes am Dateianfang ueberspringen",
    "-n": "nur bestimmte Byteanzahl vergleichen",
    "--bytes": "nur bestimmte Byteanzahl vergleichen",
    "-s": "stille Ausgabe, nur Exit-Code",
    "--quiet": "stille Ausgabe, nur Exit-Code",
    "-l": "alle Byte-Unterschiede ausgeben",
    "--verbose": "alle Byte-Unterschiede ausgeben",
  },
  command: {
    "-v docker": "Pfad zu docker anzeigen",
    "-v systemctl": "Pfad zu systemctl anzeigen",
    "-V cd": "Shell-Aufloesung fuer cd erklaeren",
    "-V history": "Shell-Aufloesung fuer history erklaeren",
    "-p env": "env mit Standard-PATH suchen",
    "ls -la": "ls ohne Alias oder Shell-Funktion ausfuehren",
    "-v bash": "Pfad zu bash anzeigen",
    "-v node": "Pfad zu node anzeigen",
    "-v npm": "Pfad zu npm anzeigen",
    "-v": "Pfad oder Command-Name ausgeben",
    "-V": "ausfuehrliche Shell-Aufloesung anzeigen",
    "-p": "Standard-PATH fuer die Suche verwenden",
    "--help": "Hilfe anzeigen",
  },
  cut: {
    "-d ':' -f 1 /etc/passwd": "Benutzernamen aus passwd ausgeben",
    "-d ':' -f 1,3 /etc/passwd": "Benutzername und UID aus passwd ausgeben",
    "-d ',' -f 1,2 data.csv": "erste zwei CSV-Felder ausgeben",
    "-f 1 file.tsv": "erstes Tab-getrenntes Feld ausgeben",
    "-c 1-10 file.txt": "erste zehn Zeichen je Zeile ausgeben",
    "-b 1-16 file.bin": "erste 16 Bytes je Zeile ausgeben",
    "--complement -d ':' -f 2 /etc/passwd": "ausgewaehltes Feld ausschliessen",
    "-d": "Feldtrenner setzen",
    "--delimiter": "Feldtrenner setzen",
    "-f": "Felder auswählen",
    "-c": "Zeichenpositionen auswählen",
    "-b": "Bytepositionen auswählen",
    "--complement": "Auswahl invertieren",
    "--output-delimiter": "Ausgabetrenner setzen",
  },
  blkid: {
    "/dev/sda1": "Dateisystemdaten für /dev/sda1 anzeigen",
    "-o export /dev/sda1": "Blockgerätedaten als Key-Value ausgeben",
    "-s UUID /dev/sda1": "nur UUID für /dev/sda1 anzeigen",
    "-L data": "Gerät mit Label data finden",
    "-U <uuid>": "Gerät mit dieser UUID finden",
    "-p /dev/sda1": "Low-Level-Probe für /dev/sda1 ausführen",
    "-t TYPE=ext4": "Geräte mit ext4-Dateisystem suchen",
    "-o": "Ausgabeformat setzen",
    "-s": "bestimmtes Tag anzeigen",
    "-p": "Low-Level-Probe verwenden",
    "-L": "Gerät per Label finden",
    "-U": "Gerät per UUID finden",
    "-t": "nach Token wie TYPE=ext4 suchen",
    "-l": "nur erstes passendes Gerät anzeigen",
    "-c": "Cache-Datei setzen",
    "-c /dev/null": "Cache ignorieren",
    "-g": "blkid-Cache bereinigen",
  },
  df: {
    "-h": "Größen menschenlesbar anzeigen",
    "-hT": "Größen menschenlesbar mit Dateisystemtyp anzeigen",
    "-h /var/log": "Speicherplatz für /var/log anzeigen",
    "-T": "Dateisystemtyp anzeigen",
    "-i": "Inode-Nutzung anzeigen",
    "-ih": "Inode-Nutzung menschenlesbar anzeigen",
    "-a": "auch Pseudo-/Spezialdateisysteme anzeigen",
    "-x": "Dateisystemtyp ausschließen",
    "-x tmpfs -x devtmpfs": "temporäre Dateisysteme ausblenden",
    "--total": "Gesamtsumme ausgeben",
    "--total -h": "Gesamtsumme menschenlesbar anzeigen",
    "--output": "Ausgabespalten wählen",
    "--local": "nur lokale Dateisysteme anzeigen",
    "-P": "portable POSIX-Ausgabe verwenden",
    "--portability": "portable POSIX-Ausgabe verwenden",
  },
  diff: {
    "-u": "Unified-Diff ausgeben",
    "--unified": "Unified-Diff ausgeben",
    "-r": "Verzeichnisse rekursiv vergleichen",
    "--recursive": "Verzeichnisse rekursiv vergleichen",
    "-q": "nur melden, ob Dateien abweichen",
    "--brief": "nur melden, ob Dateien abweichen",
    "-y": "Side-by-side-Vergleich anzeigen",
    "--side-by-side": "Side-by-side-Vergleich anzeigen",
    "-w": "Whitespace ignorieren",
    "--ignore-all-space": "Whitespace ignorieren",
    "-B": "leere Zeilen ignorieren",
    "--ignore-blank-lines": "leere Zeilen ignorieren",
  },
  dig: {
    "+short": "nur kurze Antwort ausgeben",
    "+trace": "Delegationspfad verfolgen",
    "+noall": "Standardausgabe deaktivieren",
    "+answer": "Answer-Sektion anzeigen",
    "@<server>": "DNS-Server direkt ansprechen",
    "-x": "Reverse-DNS für IP-Adresse abfragen",
  },
  dirname: {
    "/var/log/syslog": "Verzeichnis /var/log aus Pfad extrahieren",
    "./path/to/file.txt": "relativen Verzeichnisteil ausgeben",
    "/etc/nginx/nginx.conf": "Konfigurationsverzeichnis aus Pfad ausgeben",
    "~/.ssh/config": "SSH-Konfigurationsverzeichnis ausgeben",
    "/srv/app/releases/current": "Release-Verzeichnis aus Pfad extrahieren",
    "/tmp/archive.tar.gz": "temporaeres Verzeichnis aus Pfad ausgeben",
    "-- /path/with-dash": "Pfad nach Optionsende verarbeiten",
    "-z /tmp/file": "Verzeichnisteil NUL-getrennt ausgeben",
    "--zero /tmp/file": "Verzeichnisteil NUL-getrennt ausgeben",
    "/etc/systemd/system/ssh.service": "systemd-Unit-Verzeichnis aus Pfad extrahieren",
    "-z /tmp/file | xargs -0 printf '%s\\n'": "NUL-Ausgabe lesbar weiterverarbeiten",
    "-z": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--zero": "Ausgabe mit NUL statt Zeilenumbruch trennen",
  },
  dmesg: {
    "-T": "Zeitstempel lesbar anzeigen",
    "--ctime": "Zeitstempel lesbar anzeigen",
    "-w": "Kernel-Meldungen live verfolgen",
    "--follow": "Kernel-Meldungen live verfolgen",
    "-T --level=err,warn": "Fehler und Warnungen mit lesbarer Zeit anzeigen",
    "-H": "menschenlesbare Ausgabe mit Pager",
    "--human": "menschenlesbare Ausgabe mit Pager",
    "-l": "nach Log-Level filtern",
    "--level": "nach Log-Level filtern",
    "--level=err,warn": "nur Fehler und Warnungen anzeigen",
    "--facility": "nach Facility filtern",
    "--facility=kern": "Kernel-Facility anzeigen",
    "-x": "Facility und Level dekodieren",
    "--decode": "Facility und Level dekodieren",
    "-e": "relative Zeiten anzeigen",
    "--reltime": "relative Zeiten anzeigen",
    "-P": "Pager deaktivieren",
    "--nopager": "Pager deaktivieren",
    "-k": "Kernel-Meldungen auswählen",
    "--kernel": "Kernel-Meldungen auswählen",
  },
  du: {
    "-h": "Größen menschenlesbar anzeigen",
    "-s": "nur Gesamtsumme anzeigen",
    "-sh": "Gesamtsumme menschenlesbar anzeigen",
    "-sh *": "Größe aller Einträge im aktuellen Verzeichnis anzeigen",
    "-sh /var/log": "Größe von /var/log anzeigen",
    "-h --max-depth=1 /var": "erste Ebene unter /var auswerten",
    "-ah /var/log | sort -h": "Dateien in /var/log nach Größe sortieren",
    "-xhd1 /": "Root-Dateisystem auf erster Ebene auswerten",
    "--exclude node_modules -sh .": "Projektgröße ohne node_modules anzeigen",
    "-a": "auch Dateien einzeln anzeigen",
    "-c": "Gesamtsumme ergänzen",
    "-d": "Tiefe begrenzen",
    "--max-depth": "Tiefe begrenzen",
    "--exclude": "Muster ausschließen",
    "-x": "auf einem Dateisystem bleiben",
    "--one-file-system": "auf einem Dateisystem bleiben",
    "--apparent-size": "scheinbare Größe statt belegter Blöcke zählen",
    "--time": "Änderungszeit anzeigen",
    "-B": "Blockgröße setzen",
  },
  file: {
    "-b": "Dateiname in Ausgabe ausblenden",
    "-i": "MIME-Typ ausgeben",
    "-L": "symbolischen Links folgen",
    "-z": "komprimierte Dateien untersuchen",
    "-s": "auch Spezialdateien lesen",
  },
  export: {
    "VAR=value": "Variable setzen und an Kindprozesse exportieren",
    "PATH=$PATH:/opt/bin": "PATH um /opt/bin erweitern",
    "EDITOR=nano": "Standardeditor auf nano setzen",
    "NODE_ENV=production": "Node-Umgebung auf production setzen",
    "LANG=C.UTF-8": "Locale fuer Prozesse setzen",
    "TERM=xterm-256color": "Terminaltyp mit 256 Farben setzen",
    "PAGER=less": "Standard-Pager auf less setzen",
    "DEBUG=1": "Debug-Variable aktivieren",
    "TZ=UTC": "Zeitzone fuer Prozesse setzen",
    "HISTCONTROL=ignoredups": "doppelte History-Eintraege vermeiden",
    "-p": "exportierte Variablen anzeigen",
    "-n": "Export-Markierung einer Variable entfernen",
    "--help": "Hilfe anzeigen",
  },
  findmnt: {
    "/": "Mountpoint fuer Root-Dateisystem anzeigen",
    "-t ext4": "ext4-Mounts anzeigen",
    "-R /": "Submounts unter Root rekursiv anzeigen",
    "-T /var/log": "Mountpoint fuer /var/log finden",
    "-S /dev/sda1": "Mounts der Quelle /dev/sda1 anzeigen",
    "-o TARGET,SOURCE,FSTYPE,OPTIONS": "ausgewaehlte Mount-Spalten anzeigen",
    "--df": "df-aehnliche Ausgabe anzeigen",
    "--fstab": "fstab-Eintraege anzeigen",
    "-o": "Ausgabespalten waehlen",
    "--output": "Ausgabespalten waehlen",
    "-D": "df-aehnliche Ausgabe anzeigen",
    "-s": "fstab statt aktueller Mounts lesen",
    "-m": "mtab statt aktueller Mounts lesen",
    "--mtab": "mtab statt aktueller Mounts lesen",
    "-n": "Kopfzeile ausblenden",
    "--noheadings": "Kopfzeile ausblenden",
    "-t": "nach Dateisystemtyp filtern",
    "--types": "nach Dateisystemtyp filtern",
    "-S": "nach Quelle filtern",
    "--source": "nach Quelle filtern",
    "-T": "Mountpoint für Zielpfad finden",
    "--target": "Mountpoint für Zielpfad finden",
    "-J": "Ausgabe als JSON erzeugen",
    "--json": "Ausgabe als JSON erzeugen",
    "-R": "Submounts rekursiv anzeigen",
    "--submounts": "Submounts rekursiv anzeigen",
  },
  free: {
    "-h": "Speichergrößen menschenlesbar anzeigen",
    "--human": "Speichergrößen menschenlesbar anzeigen",
    "-m": "Speicher in MiB anzeigen",
    "--mebi": "Speicher in MiB anzeigen",
    "-g": "Speicher in GiB anzeigen",
    "--gibi": "Speicher in GiB anzeigen",
    "--mega": "Speicher in MB anzeigen",
    "--giga": "Speicher in GB anzeigen",
    "-s": "Ausgabe regelmäßig aktualisieren",
    "--seconds": "Ausgabe regelmäßig aktualisieren",
    "-c": "Anzahl Aktualisierungen begrenzen",
    "--count": "Anzahl Aktualisierungen begrenzen",
    "-t": "Gesamtsumme anzeigen",
    "--total": "Gesamtsumme anzeigen",
    "-w": "Wide-Ausgabe mit Buffers und Cache trennen",
    "--wide": "Wide-Ausgabe mit Buffers und Cache trennen",
    "--si": "SI-Einheiten verwenden",
    "-h -s 2": "Speicher alle 2 Sekunden menschenlesbar anzeigen",
    "-w -h": "Speicher breit und menschenlesbar anzeigen",
  },
  gzip: {
    "-d": "gzip-Datei entpacken",
    "--decompress": "gzip-Datei entpacken",
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "Ausgabe auf stdout schreiben",
    "--stdout": "Ausgabe auf stdout schreiben",
    "-f": "vorhandene Ausgabedatei überschreiben",
    "--force": "vorhandene Ausgabedatei überschreiben",
    "-v": "Kompressionsdetails anzeigen",
    "--verbose": "Kompressionsdetails anzeigen",
    "-r": "Verzeichnisse rekursiv verarbeiten",
    "--recursive": "Verzeichnisse rekursiv verarbeiten",
    "-1": "schnellste Kompression verwenden",
    "-9": "stärkste Kompression verwenden",
  },
  gunzip: {
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "entpackten Inhalt auf stdout schreiben",
    "--stdout": "entpackten Inhalt auf stdout schreiben",
    "-f": "vorhandene Ausgabedatei überschreiben",
    "--force": "vorhandene Ausgabedatei überschreiben",
    "-v": "Entpackdetails anzeigen",
    "--verbose": "Entpackdetails anzeigen",
    "-r": "Verzeichnisse rekursiv verarbeiten",
    "--recursive": "Verzeichnisse rekursiv verarbeiten",
    "-l": "komprimierte Dateigrößen anzeigen",
    "--list": "komprimierte Dateigrößen anzeigen",
  },
  head: {
    "-n": "Anzahl auszugebender Zeilen setzen",
    "-c": "Anzahl auszugebender Bytes setzen",
    "-q": "Dateinamen-Header ausblenden",
    "-v": "Dateinamen-Header immer anzeigen",
  },
  hexdump: {
    "-C file.bin": "Datei im kanonischen Hex+ASCII-Format anzeigen",
    "-C -n 128 file.bin": "erste 128 Bytes im kanonischen Format anzeigen",
    "-C -s 512 file.bin": "ab Offset 512 im kanonischen Format anzeigen",
    "-n 64 file.bin": "nur die ersten 64 Bytes anzeigen",
    "-v file.bin": "alle Zeilen ohne Zusammenfassung anzeigen",
    "-x file.bin": "Datei als 16-Bit-Hexwerte anzeigen",
    "-e '16/1 \"%02x \" \"\\n\"' file.bin": "Bytes mit eigenem Format ausgeben",
    "-C": "kanonisches Hex+ASCII-Format verwenden",
    "--canonical": "kanonisches Hex+ASCII-Format verwenden",
    "-b": "Bytes oktal anzeigen",
    "-c": "Bytes als Zeichen anzeigen",
    "-d": "Dezimalwerte anzeigen",
    "-o": "Oktalwerte anzeigen",
    "-x": "Hexwerte anzeigen",
    "-n": "Ausgabe auf Byteanzahl begrenzen",
    "--length": "Ausgabe auf Byteanzahl begrenzen",
    "-s": "vor Ausgabe Bytes ueberspringen",
    "--skip": "vor Ausgabe Bytes ueberspringen",
    "-v": "wiederholte Zeilen nicht zusammenfassen",
    "--no-squeezing": "wiederholte Zeilen nicht zusammenfassen",
    "-e": "Formatstring fuer Ausgabe setzen",
    "--format": "Formatstring fuer Ausgabe setzen",
    "-f": "Format aus Datei lesen",
    "--format-file": "Format aus Datei lesen",
  },
  md5sum: {
    "file.iso": "MD5-Pruefsumme fuer file.iso berechnen",
    "-c checksums.txt": "MD5-Pruefsummen aus Datei pruefen",
    "--tag file.iso": "BSD-artige Pruefsummenausgabe erzeugen",
    "--status -c checksums.txt": "Pruefung ohne Ausgabe, nur Exit-Code",
    "--ignore-missing -c checksums.txt": "fehlende Dateien beim Pruefen ignorieren",
    "--binary file.iso": "Datei im Binaermodus pruefen",
    "-c": "Pruefsummen aus Datei pruefen",
    "--check": "Pruefsummen aus Datei pruefen",
    "-b": "Binaermodus verwenden",
    "--binary": "Binaermodus verwenden",
    "-t": "Textmodus verwenden",
    "--text": "Textmodus verwenden",
    "--quiet": "OK-Meldungen unterdruecken",
    "--status": "keine Ausgabe, nur Exit-Code",
    "--tag": "BSD-artige Pruefsummenausgabe erzeugen",
    "--ignore-missing": "fehlende Dateien beim Pruefen ignorieren",
    "--strict": "streng formatierte Pruefsummendatei erwarten",
    "--warn": "bei falsch formatierten Zeilen warnen",
    "-z": "Ausgabe NUL-getrennt erzeugen",
    "--zero": "Ausgabe NUL-getrennt erzeugen",
  },
  sha1sum: {
    "file.iso": "SHA-1-Pruefsumme fuer file.iso berechnen",
    "-c checksums.txt": "SHA-1-Pruefsummen aus Datei pruefen",
    "--tag file.iso": "BSD-artige Pruefsummenausgabe erzeugen",
    "--status -c checksums.txt": "Pruefung ohne Ausgabe, nur Exit-Code",
    "--ignore-missing -c checksums.txt": "fehlende Dateien beim Pruefen ignorieren",
    "--binary file.iso": "Datei im Binaermodus pruefen",
    "-c": "Pruefsummen aus Datei pruefen",
    "--check": "Pruefsummen aus Datei pruefen",
    "-b": "Binaermodus verwenden",
    "--binary": "Binaermodus verwenden",
    "-t": "Textmodus verwenden",
    "--text": "Textmodus verwenden",
    "--quiet": "OK-Meldungen unterdruecken",
    "--status": "keine Ausgabe, nur Exit-Code",
    "--tag": "BSD-artige Pruefsummenausgabe erzeugen",
    "--ignore-missing": "fehlende Dateien beim Pruefen ignorieren",
    "--strict": "streng formatierte Pruefsummendatei erwarten",
    "--warn": "bei falsch formatierten Zeilen warnen",
    "-z": "Ausgabe NUL-getrennt erzeugen",
    "--zero": "Ausgabe NUL-getrennt erzeugen",
  },
  sha256sum: {
    "file.iso": "SHA-256-Pruefsumme fuer file.iso berechnen",
    "-c checksums.txt": "SHA-256-Pruefsummen aus Datei pruefen",
    "find . -type f -print0 | xargs -0 sha256sum":
      "alle Dateien NUL-sicher hashen",
    "--tag file.iso": "BSD-artige Pruefsummenausgabe erzeugen",
    "--status -c checksums.txt": "Pruefung ohne Ausgabe, nur Exit-Code",
    "--ignore-missing -c checksums.txt": "fehlende Dateien beim Pruefen ignorieren",
    "--quiet -c checksums.txt": "nur fehlerhafte Pruefungen melden",
    "--binary file.iso": "Datei im Binaermodus pruefen",
    "-c": "Pruefsummen aus Datei pruefen",
    "--check": "Pruefsummen aus Datei pruefen",
    "-b": "Binaermodus verwenden",
    "--binary": "Binaermodus verwenden",
    "-t": "Textmodus verwenden",
    "--text": "Textmodus verwenden",
    "--quiet": "OK-Meldungen unterdruecken",
    "--status": "keine Ausgabe, nur Exit-Code",
    "--tag": "BSD-artige Pruefsummenausgabe erzeugen",
    "--ignore-missing": "fehlende Dateien beim Pruefen ignorieren",
    "--strict": "streng formatierte Pruefsummendatei erwarten",
    "--warn": "bei falsch formatierten Zeilen warnen",
    "-z": "Ausgabe NUL-getrennt erzeugen",
    "--zero": "Ausgabe NUL-getrennt erzeugen",
  },
  host: {
    "-t": "DNS-Record-Typ wählen",
    "-a": "alle verfügbaren Informationen anzeigen",
    "-v": "ausführlichere DNS-Ausgabe",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
  },
  htop: {
    "-u root": "Prozesse des Benutzers root anzeigen",
    "-u www-data": "Prozesse des Webserver-Benutzers anzeigen",
    "-p 1": "Prozess mit PID 1 fokussieren",
    "-d 10": "Aktualisierung alle 10 Zehntelsekunden",
    "-s PERCENT_CPU": "nach CPU-Auslastung sortieren",
    "-s PERCENT_MEM": "nach Speicherverbrauch sortieren",
    "-u": "Prozesse eines Benutzers anzeigen",
    "--user": "Prozesse eines Benutzers anzeigen",
    "-p": "bestimmte Prozess-IDs anzeigen",
    "--pid": "bestimmte Prozess-IDs anzeigen",
    "-d": "Aktualisierungsdelay setzen",
    "--delay": "Aktualisierungsdelay setzen",
    "-s": "Sortierspalte setzen",
    "--sort-key": "Sortierspalte setzen",
    "-t": "Baumansicht starten",
    "--tree": "Baumansicht starten",
    "-C": "Farbausgabe deaktivieren",
    "--no-color": "Farbausgabe deaktivieren",
  },
  history: {
    "20": "letzte 20 History-Eintraege anzeigen",
    "100": "letzte 100 History-Eintraege anzeigen",
    "| grep ssh": "History nach ssh durchsuchen",
    "| grep systemctl": "History nach systemctl durchsuchen",
    "| tail -n 50": "letzte 50 History-Zeilen anzeigen",
    "| less": "History im Pager anzeigen",
    "-w": "aktuelle History-Datei schreiben",
    "-r": "History-Datei erneut einlesen",
    "-d": "History-Eintrag an Position entfernen",
    "-d <offset>": "History-Eintrag an Position entfernen",
    "-a": "neue History-Zeilen anhaengen",
    "-n": "neue History-Zeilen einlesen",
    "-p": "History-Expansion ausgeben",
    "-p <arg>": "History-Expansion ausgeben",
    "-s": "Eintrag zur History hinzufuegen",
    "-s <arg>": "Eintrag zur History hinzufuegen",
  },
  iftop: {
    "-i eth0": "Interface eth0 beobachten",
    "-P -n": "Ports anzeigen und DNS-Aufloesung vermeiden",
    "-i wlan0 -B": "wlan0 mit Byte-Einheiten beobachten",
    "-F 192.168.1.0/24": "Traffic fuer Netzbereich filtern",
    "-f 'port 443'": "Traffic per pcap-Filter auf Port 443 begrenzen",
    "-t -s 10": "Textausgabe nach 10 Sekunden beenden",
    "-nN": "Host- und Portnamen nicht aufloesen",
    "-i": "Interface auswählen",
    "-P": "Ports anzeigen",
    "-n": "Hostnamen nicht auflösen",
    "-N": "Portnamen nicht auflösen",
    "-B": "Bandbreite in Bytes anzeigen",
    "-b": "Balkenanzeige ausblenden",
    "-t": "Textmodus ohne interaktive Anzeige",
    "-s": "nach Sekunden automatisch beenden",
    "-F": "auf Netzbereich filtern",
    "-f": "pcap-Filter setzen",
  },
  iperf3: {
    "-s": "Servermodus starten",
    "--server": "Servermodus starten",
    "-c": "Client zu Host starten",
    "--client": "Client zu Host starten",
    "-p": "Port setzen",
    "--port": "Port setzen",
    "-t": "Testdauer setzen",
    "--time": "Testdauer setzen",
    "-P": "parallele Streams setzen",
    "--parallel": "parallele Streams setzen",
    "-R": "Reverse-Test vom Server zum Client",
    "--reverse": "Reverse-Test vom Server zum Client",
    "-u": "UDP-Test verwenden",
    "--udp": "UDP-Test verwenden",
    "-b": "Ziel-Bitrate setzen",
    "--bitrate": "Ziel-Bitrate setzen",
    "-J": "Ergebnis als JSON ausgeben",
    "--json": "Ergebnis als JSON ausgeben",
  },
  tmux: {
    "new -s": "neue benannte tmux-Sitzung starten",
    "attach -t": "an bestehende tmux-Sitzung anhängen",
    ls: "tmux-Sitzungen auflisten",
    "kill-session -t": "tmux-Sitzung beenden",
    "split-window": "aktuelles Fenster teilen",
    "new-window": "neues Fenster in der Sitzung öffnen",
    "send-keys": "Tasteneingaben an Pane oder Sitzung senden",
    "-2": "256-Farben-Modus erzwingen",
    "-f": "alternative tmux-Konfigurationsdatei laden",
    "-L": "Socket-Namen auswählen",
    "-S": "Socket-Pfad auswählen",
    "-u": "UTF-8-Terminalmodus erzwingen",
  },
  screen: {
    "-S work": "neue Screen-Sitzung work starten",
    "-r work": "Screen-Sitzung work wieder anhaengen",
    "-x work": "Sitzung work gemeinsam anhaengen",
    "-d -r work": "Sitzung work abtrennen und hier anhaengen",
    "-dmS worker": "Sitzung worker im Hintergrund starten",
    "-S work -X quit": "Sitzung work beenden",
    "-S work -X hardcopy": "Hardcopy der Sitzung work schreiben",
    "-S": "neue benannte Screen-Sitzung starten",
    "-r": "Screen-Sitzung wieder anhängen",
    "-ls": "Screen-Sitzungen auflisten",
    "-dmS": "Screen-Sitzung getrennt im Hintergrund starten",
    "-X": "Kommando an laufende Screen-Sitzung senden",
    "-wipe": "tote Screen-Sessions aus der Liste entfernen",
    "-L": "Session-Logging aktivieren",
    "-Logfile": "Logdatei fuer Screen setzen",
  },
  nohup: {
    "npm start > app.log 2>&1 &": "npm start mit Logdatei vom Terminal loesen",
    "python app.py > app.log 2>&1 &": "Python-App mit Logdatei weiterlaufen lassen",
    "node server.js > server.log 2>&1 &": "Node-Server mit Logdatei weiterlaufen lassen",
    "./worker.sh > worker.log 2>&1 &": "Worker-Skript mit Logdatei weiterlaufen lassen",
    "rsync -av /src /dst > rsync.log 2>&1 &": "rsync-Job mit Logdatei weiterlaufen lassen",
    "sleep 3600 &": "Sleep-Prozess gegen Terminalende schuetzen",
    "java -jar app.jar > app.log 2>&1 &": "Java-App mit Logdatei weiterlaufen lassen",
    "./backup.sh >> backup.log 2>&1 &": "Backup-Skript an Logdatei anhaengen",
    "tail -f /var/log/syslog > syslog.follow 2>&1 &": "Log-Follower im Hintergrund weiterlaufen lassen",
    "command &": "Befehl gegen HUP schuetzen und im Hintergrund starten",
    "./server.sh &": "Befehl nach Logout weiterlaufen lassen",
    "long-command > output.log 2>&1 &": "Ausgabe umleiten und Befehl weiterlaufen lassen",
    "--help": "Hilfe zu nohup anzeigen",
    "--version": "nohup-Version anzeigen",
  },
  jobs: {
    "%1": "Status von Job 1 anzeigen",
    "%%": "Status des aktuellen Jobs anzeigen",
    "%+": "Status des aktuellen Jobs anzeigen",
    "%-": "Status des vorherigen Jobs anzeigen",
    "-l %1": "Job 1 mit Prozess-ID anzeigen",
    "-p %1": "nur Prozess-ID von Job 1 anzeigen",
    "-l %%": "aktuellen Job mit Prozess-ID anzeigen",
    "-p %%": "nur Prozess-ID des aktuellen Jobs anzeigen",
    "-x echo %1": "Jobspec in Kommando ersetzen und ausfuehren",
    "-x": "Jobspecs in einem Kommando ersetzen",
    "-l": "Jobs mit Prozess-IDs anzeigen",
    "-p": "nur Prozess-IDs der Jobs anzeigen",
    "-r": "nur laufende Jobs anzeigen",
    "-s": "nur gestoppte Jobs anzeigen",
  },
  fg: {
    "%3": "Job 3 in den Vordergrund holen",
    "%2": "Job 2 in den Vordergrund holen",
    "%%": "aktuellen Job in den Vordergrund holen",
    "%+": "aktuellen Job in den Vordergrund holen",
    "%-": "vorherigen Job in den Vordergrund holen",
    "%?ssh": "Job mit ssh im Kommando in den Vordergrund holen",
    "%?python": "Job mit python im Kommando in den Vordergrund holen",
    "%vim": "Job mit Namen vim in den Vordergrund holen",
    "%nano": "Job mit Namen nano in den Vordergrund holen",
    "%1": "Job 1 in den Vordergrund holen",
    "%<job>": "ausgewählten Job in den Vordergrund holen",
  },
  bg: {
    "%3": "Job 3 im Hintergrund fortsetzen",
    "%2": "Job 2 im Hintergrund fortsetzen",
    "%%": "aktuellen Job im Hintergrund fortsetzen",
    "%+": "aktuellen Job im Hintergrund fortsetzen",
    "%-": "vorherigen Job im Hintergrund fortsetzen",
    "%?ssh": "Job mit ssh im Kommando im Hintergrund fortsetzen",
    "%?python": "Job mit python im Kommando im Hintergrund fortsetzen",
    "%vim": "Job mit Namen vim im Hintergrund fortsetzen",
    "%nano": "Job mit Namen nano im Hintergrund fortsetzen",
    "%1": "Job 1 im Hintergrund fortsetzen",
    "%<job>": "ausgewählten Job im Hintergrund fortsetzen",
  },
  disown: {
    "%2": "Job 2 aus der Shell-Jobtabelle entfernen",
    "%%": "aktuellen Job aus der Shell-Jobtabelle entfernen",
    "%+": "aktuellen Job aus der Shell-Jobtabelle entfernen",
    "%-": "vorherigen Job aus der Shell-Jobtabelle entfernen",
    "-h %%": "aktuellen Job vor SIGHUP schuetzen",
    "-h %+": "aktuellen Job vor SIGHUP schuetzen",
    "-h %-": "vorherigen Job vor SIGHUP schuetzen",
    "%?ssh": "Job mit ssh im Kommando aus der Jobtabelle entfernen",
    "-a": "alle Jobs aus der Shell-Jobtabelle entfernen",
    "-h": "Job vor SIGHUP beim Logout schützen",
    "-r": "nur laufende Jobs aus der Jobtabelle entfernen",
    "%1": "Job 1 aus der Shell-Jobtabelle entfernen",
    "-h %1": "Job 1 vor SIGHUP schützen",
  },
  kill: {
    "-15": "TERM-Signal senden",
    "-TERM": "TERM-Signal senden",
    "-9": "KILL-Signal senden",
    "-KILL": "KILL-Signal senden",
    "-1": "HUP-Signal senden",
    "-HUP": "HUP-Signal senden",
    "-2": "INT-Signal senden",
    "-INT": "INT-Signal senden",
    "-l": "verfügbare Signale anzeigen",
  },
  killall: {
    "-e": "nur exakte Programmnamen treffen",
    "--exact": "nur exakte Programmnamen treffen",
    "-i": "vor dem Beenden nachfragen",
    "--interactive": "vor dem Beenden nachfragen",
    "-I": "Groß-/Kleinschreibung ignorieren",
    "--ignore-case": "Groß-/Kleinschreibung ignorieren",
    "-u": "nur Prozesse dieses Benutzers treffen",
    "--user": "nur Prozesse dieses Benutzers treffen",
    "-v": "beendete Prozesse anzeigen",
    "--verbose": "beendete Prozesse anzeigen",
    "-w": "auf Prozessende warten",
    "--wait": "auf Prozessende warten",
    "-TERM": "TERM-Signal senden",
    "-KILL": "KILL-Signal senden",
    "-HUP": "HUP-Signal senden",
  },
  less: {
    "-N": "Zeilennummern anzeigen",
    "-S": "lange Zeilen nicht umbrechen",
    "-R": "ANSI-Farben anzeigen",
    "-i": "Suche ohne Groß-/Kleinschreibung",
    "+F": "Dateiende verfolgen",
  },
  more: {
    "file.txt": "Datei seitenweise anzeigen",
    "/var/log/syslog": "Systemlog seitenweise anzeigen",
    "-d file.txt": "Hilfetext fuer more-Steuerung anzeigen",
    "-f file.txt": "lange Zeilen zaehlen, statt umzubrechen",
    "-20 file.txt": "20 Zeilen pro Seite verwenden",
    "+20 file.txt": "bei Zeile 20 starten",
    "+/error /var/log/syslog": "bei erstem Treffer fuer error starten",
    "| more": "Pipeline-Ausgabe seitenweise anzeigen",
    "-d": "Hilfetext fuer more-Steuerung anzeigen",
    "-f": "logische statt umbrochene Zeilen zaehlen",
    "-s": "mehrere Leerzeilen zusammenfassen",
    "-u": "Unterstreichung nicht speziell behandeln",
    "-<number>": "Zeilen pro Seite setzen",
    "+<line>": "bei bestimmter Zeile starten",
    "+/<pattern>": "bei erstem Suchtreffer starten",
  },
  loginctl: {
    "list-sessions": "aktive Login-Sessions auflisten",
    "session-status": "Details zu einer Session anzeigen",
    "show-session": "Session-Eigenschaften anzeigen",
    "list-users": "angemeldete Benutzer auflisten",
    "show-user": "Benutzer-Eigenschaften anzeigen",
    "terminate-session": "Session beenden",
    "--no-pager": "ohne Pager ausgeben",
    "--no-legend": "Legende ausblenden",
    "--property": "Eigenschaft auswählen",
    "--value": "nur Werte ausgeben",
    "--user": "User-Manager-Kontext verwenden",
  },
  localectl: {
    status: "aktuelle Locale- und Tastatureinstellungen anzeigen",
    "list-locales": "verfügbare Locales auflisten",
    "set-locale": "System-Locale setzen",
    "list-keymaps": "verfügbare Konsolen-Keymaps auflisten",
    "set-keymap": "Konsolen-Keymap setzen",
    "set-x11-keymap": "X11-Tastaturlayout setzen",
    "--no-pager": "ohne Pager ausgeben",
    "--no-legend": "Legende ausblenden",
    "--property": "nur bestimmte Eigenschaft anzeigen",
    "--value": "nur Werte ausgeben",
  },
  networkctl: {
    list: "Netzwerklinks auflisten",
    status: "Status aller Links oder eines Links anzeigen",
    lldp: "LLDP-Nachbarn anzeigen",
    label: "Adresslabels anzeigen",
    delete: "virtuellen Netzwerklink löschen",
    up: "Link aktivieren",
    down: "Link deaktivieren",
    renew: "DHCP-Lease erneuern",
    reconfigure: "Link-Konfiguration neu laden",
    "--no-pager": "ohne Pager ausgeben",
    "--no-legend": "Legende ausblenden",
    "--all": "auch inaktive Links anzeigen",
    "--json": "Ausgabe als JSON erzeugen",
    "--type": "nach Link-Typ filtern",
  },
  busctl: {
    list: "D-Bus Services auflisten",
    tree: "Objektbaum eines Services anzeigen",
    introspect: "Interfaces und Methoden eines Objekts anzeigen",
    monitor: "D-Bus Nachrichten live beobachten",
    status: "Status eines D-Bus Services anzeigen",
    call: "D-Bus Methode aufrufen",
    "get-property": "D-Bus Eigenschaft lesen",
    "set-property": "D-Bus Eigenschaft setzen",
    "--system": "System-Bus verwenden",
    "--user": "User-Bus verwenden",
    "--no-pager": "ohne Pager ausgeben",
    "--json": "Ausgabe als JSON erzeugen",
    "--xml-interface": "Introspection als XML ausgeben",
  },
  coredumpctl: {
    list: "Coredumps auflisten",
    info: "Details zu einem Coredump anzeigen",
    dump: "Coredump-Datei ausgeben",
    debug: "Coredump im Debugger öffnen",
    "--no-pager": "ohne Pager ausgeben",
    "--json": "Ausgabe als JSON erzeugen",
    "--since": "Startzeit für Suche setzen",
    "--until": "Endzeit für Suche setzen",
    "-1": "nur neuesten passenden Coredump verwenden",
    "--reverse": "Sortierung umkehren",
  },
  "systemd-cgls": {
    "--unit ssh.service": "Control-Group von ssh.service anzeigen",
    "--unit dbus.service": "Control-Group von dbus.service anzeigen",
    "/system.slice/ssh.service": "Control-Group-Pfad fuer ssh.service anzeigen",
    "--machine <name>": "Control-Groups einer Maschine anzeigen",
    "--machine .host": "Control-Groups des lokalen Hosts anzeigen",
    "--full": "Eintraege nicht kuerzen",
    "--no-legend": "Legende ausblenden",
    "--user": "User-Control-Groups anzeigen",
    "--system": "System-Control-Groups anzeigen",
    "--all": "auch leere Control-Groups anzeigen",
    "--no-pager": "ohne Pager ausgeben",
    "--unit": "Control-Group einer Unit anzeigen",
    "--machine": "Control-Groups einer Maschine anzeigen",
  },
  "systemd-cgtop": {
    "--depth=2": "Control-Group-Baum auf Tiefe 2 begrenzen",
    "--order=memory": "nach Speicherverbrauch sortieren",
    "--order=cpu": "nach CPU-Verbrauch sortieren",
    "--iterations=5 --batch": "fuenf Batch-Messungen ausgeben",
    "--recursive": "Untergruppen rekursiv zusammenrechnen",
    "--delay": "Aktualisierungsintervall setzen",
    "--cpu": "CPU-Anzeigeformat setzen",
    "--machine": "Maschine auswaehlen",
    "--user": "User-Control-Groups beobachten",
    "--system": "System-Control-Groups beobachten",
    "--depth": "Baumtiefe begrenzen",
    "--order": "Sortierspalte wählen",
    "--iterations": "Anzahl der Aktualisierungen begrenzen",
    "--batch": "Batch-Ausgabe ohne interaktive Steuerung",
  },
  machinectl: {
    list: "laufende Maschinen auflisten",
    status: "Status einer Maschine anzeigen",
    show: "Eigenschaften einer Maschine anzeigen",
    shell: "Shell in einer Maschine öffnen",
    login: "Login in einer Maschine starten",
    terminate: "Maschine beenden",
    kill: "Signal an Maschinenprozesse senden",
    "list-images": "lokale Maschinen-Images auflisten",
    "image-status": "Image-Details anzeigen",
    clone: "Image klonen",
    remove: "Image entfernen",
    "--no-pager": "ohne Pager ausgeben",
    "--no-legend": "Legende ausblenden",
    "--all": "auch versteckte Einträge anzeigen",
    "--full": "Werte nicht kürzen",
    "--kill-whom": "Zielprozesse für kill wählen",
    "--signal": "Signal für kill setzen",
  },
  logrotate: {
    "-d": "Konfiguration prüfen, ohne Rotation auszuführen",
    "--debug": "Konfiguration prüfen, ohne Rotation auszuführen",
    "-f": "Rotation erzwingen, auch wenn sie noch nicht fällig ist",
    "--force": "Rotation erzwingen, auch wenn sie noch nicht fällig ist",
    "-v": "ausführlich anzeigen, welche Logs bearbeitet werden",
    "--verbose": "ausführlich anzeigen, welche Logs bearbeitet werden",
    "-s": "Statusdatei für Rotationszustand setzen",
    "--state": "Statusdatei für Rotationszustand setzen",
    "-m": "Mail-Kommando für Benachrichtigungen setzen",
    "--mail": "Mail-Kommando für Benachrichtigungen setzen",
  },
  lsblk: {
    "-f": "Dateisysteme, Labels und UUIDs anzeigen",
    "-o NAME,SIZE,FSTYPE,MOUNTPOINT,UUID": "wichtige Blockgerätedaten als Spalten anzeigen",
    "-J": "Ausgabe als JSON erzeugen",
    "-p": "vollständige Gerätepfade anzeigen",
    "-d -o NAME,MODEL,SIZE,ROTA": "nur Platten mit Modell, Größe und Rotation anzeigen",
    "-o": "Ausgabespalten wählen",
    "-a": "auch leere Geräte anzeigen",
    "-b": "Größen in Bytes anzeigen",
    "-d": "nur Blockgeräte ohne Partitionen anzeigen",
    "-n": "Kopfzeile ausblenden",
    "-r": "rohe Ausgabe erzeugen",
    "-S": "SCSI-Geräte anzeigen",
    "-D": "Discard-Fähigkeiten anzeigen",
    "-x": "nach Spalte sortieren",
    "-e": "Geräte nach Major-Nummer ausschließen",
  },
  mount: {
    "| column -t": "aktuelle Mounts als Tabelle anzeigen",
    "| grep /mnt": "Mounts unter /mnt filtern",
    "/dev/sdb1 /mnt": "Gerät /dev/sdb1 nach /mnt einhängen",
    "-t nfs server:/share /mnt": "NFS-Share nach /mnt einhängen",
    "-o ro /dev/sdb1 /mnt": "Gerät nur lesend einhängen",
    "-o remount,rw /": "Root-Dateisystem schreibbar remounten",
    "--bind /srv/data /mnt/data": "Verzeichnis per Bind-Mount einhängen",
    "-t tmpfs tmpfs /mnt": "tmpfs nach /mnt einhängen",
    "-t": "Dateisystemtyp setzen",
    "-a": "alle fstab-Einträge einhängen",
    "-o": "Mount-Optionen setzen",
    "-o ro": "nur lesend einhängen",
    "-o rw": "schreibbar einhängen",
    "-o remount": "bestehenden Mount neu einhängen",
    "-o bind": "Bind-Mount verwenden",
    "-o loop": "Loop-Datei einhängen",
    "-o noatime": "Access-Time-Aktualisierung deaktivieren",
    "--bind": "Bind-Mount verwenden",
    "--move": "Mountpoint verschieben",
    "-r": "nur lesend einhängen",
    "-w": "schreibbar einhängen",
    "-L": "Gerät per Label auswählen",
    "-U": "Gerät per UUID auswählen",
    "-v": "ausführlich ausgeben",
  },
  umount: {
    "/mnt": "Mountpoint /mnt aushängen",
    "-l /mnt": "Mountpoint /mnt lazy aushängen",
    "-v /mnt": "Mountpoint /mnt ausführlich aushängen",
    "/dev/sdb1": "Gerät /dev/sdb1 aushängen",
    "--recursive /mnt": "Submounts unter /mnt rekursiv aushängen",
    "-l": "lazy aushängen",
    "--lazy": "lazy aushängen",
    "-v": "ausführlich ausgeben",
    "--verbose": "ausführlich ausgeben",
    "-R": "rekursiv aushängen",
    "--recursive": "rekursiv aushängen",
    "-f": "Aushängen erzwingen",
    "--force": "Aushängen erzwingen",
    "-t": "nach Dateisystemtyp filtern",
  },
  nslookup: {
    "example.com": "A/AAAA-Records für example.com abfragen",
    "example.com 1.1.1.1": "Abfrage gegen DNS-Server 1.1.1.1 senden",
    "-type=MX example.com": "Mailserver-Records abfragen",
    "-type=TXT example.com": "TXT-Records abfragen",
    "-type=AAAA example.com": "IPv6-Records abfragen",
    "-type=NS example.com": "Nameserver-Records abfragen",
    "-debug example.com": "DNS-Abfrage mit Debug-Ausgabe ausführen",
    "-port=5353 example.com 127.0.0.1": "DNS-Abfrage gegen lokalen Port 5353 senden",
    "-type=A": "A-Records abfragen",
    "-type=AAAA": "AAAA-Records abfragen",
    "-type=MX": "MX-Records abfragen",
    "-type=TXT": "TXT-Records abfragen",
    "-type=NS": "Nameserver-Records abfragen",
    "-type=SOA": "SOA-Record abfragen",
    "-timeout": "DNS-Timeout setzen",
    "-retry": "Anzahl Wiederholungen setzen",
    "-debug": "Debug-Ausgabe aktivieren",
    "-port": "DNS-Server-Port setzen",
  },
  tracepath: {
    "example.com": "Pfad zu example.com verfolgen",
    "-n 8.8.8.8": "Route numerisch zu 8.8.8.8 verfolgen",
    "-b example.com": "Hop-Adressen und Hostnamen anzeigen",
    "-m 20 example.com": "maximal 20 Hops prüfen",
    "-l 1200 example.com": "Paketlänge auf 1200 Bytes setzen",
    "-n": "Hostnamen nicht auflösen",
    "-b": "Hop-Adresse und Hostname anzeigen",
    "-l": "Paketlänge setzen",
    "-m": "maximale Hop-Anzahl setzen",
    "-4": "IPv4 erzwingen",
    "-6": "IPv6 erzwingen",
    "-V": "Version anzeigen",
  },
  iw: {
    dev: "WLAN-Interfaces anzeigen",
    "dev wlan0 link": "Verbindungsstatus von wlan0 anzeigen",
    "dev wlan0 scan": "WLAN-Netze mit wlan0 scannen",
    "dev wlan0 station dump": "verbundene Stationen anzeigen",
    "dev wlan0 info": "Details zu wlan0 anzeigen",
    "dev wlan0 set power_save off": "WLAN-Energiesparen deaktivieren",
    "reg get": "Regulatory-Domain anzeigen",
    "reg set DE": "Regulatory-Domain auf DE setzen",
    list: "PHY-Fähigkeiten anzeigen",
    event: "WLAN-Events beobachten",
    phy: "PHY-Geräte anzeigen",
    "dev wlan0 survey dump": "Kanal-/Survey-Daten anzeigen",
  },
  nft: {
    "list ruleset": "komplettes nftables-Regelwerk anzeigen",
    "list tables": "nftables-Tabellen anzeigen",
    "list table inet filter": "Tabelle inet filter anzeigen",
    "list chain inet filter input": "Input-Chain in inet filter anzeigen",
    "list counters": "nftables-Counter anzeigen",
    "--check -f rules.nft": "Regeldatei validieren, ohne sie anzuwenden",
    "-a list ruleset": "Regelwerk mit Handles anzeigen",
    "-n list ruleset": "Regelwerk numerisch anzeigen",
    monitor: "nftables-Ereignisse beobachten",
    "monitor trace": "nftables-Trace-Ereignisse beobachten",
    "-a": "Handles in Ausgabe anzeigen",
    "--handle": "Handles in Ausgabe anzeigen",
    "-n": "Adressen und Ports numerisch anzeigen",
    "--numeric": "Adressen und Ports numerisch anzeigen",
    "-c": "Regeldatei nur prüfen",
    "--check": "Regeldatei nur prüfen",
    "-f": "Regeln aus Datei lesen",
  },
  lsof: {
    "-i": "Netzwerkdateien und Ports anzeigen",
    "-i :80": "Prozesse auf Port 80 anzeigen",
    "-i :443": "Prozesse auf Port 443 anzeigen",
    "-iTCP": "TCP-Verbindungen anzeigen",
    "-sTCP:LISTEN": "nur lauschende TCP-Sockets anzeigen",
    "-p": "nach Prozess-ID filtern",
    "-p 1234": "offene Dateien von PID 1234 anzeigen",
    "-u": "nach Benutzer filtern",
    "-u www-data": "offene Dateien von www-data anzeigen",
    "-n": "Hostnamen nicht auflösen",
    "-P": "Portnamen nicht auflösen",
    "-nP": "Host- und Portnamen nicht auflösen",
    "+D": "Verzeichnis rekursiv durchsuchen",
    "+D /var/log": "offene Dateien unter /var/log suchen",
    "-a": "Filter logisch verknüpfen",
    "-c": "nach Prozessnamen-Präfix filtern",
    "-t": "nur PIDs ausgeben",
    "-t -i :443": "nur PIDs auf Port 443 ausgeben",
    "-iTCP -sTCP:LISTEN": "lauschende TCP-Sockets anzeigen",
    "-nP -iTCP": "TCP-Ports numerisch anzeigen",
    "-nP -iTCP -sTCP:LISTEN": "lauschende TCP-Ports numerisch anzeigen",
  },
  lscpu: {
    "-J": "CPU-Informationen als JSON ausgeben",
    "--json": "CPU-Informationen als JSON ausgeben",
    "-e": "CPU-Threads als Tabelle anzeigen",
    "--extended": "CPU-Threads als Tabelle anzeigen",
    "-e=CPU,CORE,SOCKET,NODE,ONLINE": "ausgewaehlte CPU-Spalten anzeigen",
    "-p": "parsebare CPU-Liste ausgeben",
    "--parse": "parsebare CPU-Liste ausgeben",
    "-C": "CPU-Cache-Informationen anzeigen",
    "--caches": "CPU-Cache-Informationen anzeigen",
    "-b": "nur Online-CPUs anzeigen",
    "--online": "nur Online-CPUs anzeigen",
    "-c": "nur Offline-CPUs anzeigen",
    "--offline": "nur Offline-CPUs anzeigen",
    "-a": "alle CPUs anzeigen",
    "--all": "alle CPUs anzeigen",
    "-x": "CPU-Masken hexadezimal anzeigen",
    "--hex": "CPU-Masken hexadezimal anzeigen",
    "-y": "physische IDs anzeigen",
    "--physical": "physische IDs anzeigen",
  },
  lsmod: {
    "| grep usb": "geladene USB-Module filtern",
    "| grep bluetooth": "geladene Bluetooth-Module filtern",
    "| sort -k3 -nr": "Module nach Nutzungszaehler sortieren",
    "| head": "erste geladene Module anzeigen",
    "| less": "Modulliste im Pager oeffnen",
    "| awk '{print $1}'": "nur Modulnamen ausgeben",
    "| grep '^snd'": "Sound-Module filtern",
    "| column -t": "Modulliste als Tabelle ausrichten",
    "| wc -l": "Anzahl geladener Module zaehlen",
    "| sort": "Modulliste alphabetisch sortieren",
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  lspci: {
    "-nn": "Hersteller- und Geraete-IDs numerisch anzeigen",
    "-k": "Kernel-Treiber und Module je Geraet anzeigen",
    "-tv": "PCI-Geraete als ausfuehrlichen Baum anzeigen",
    "-s 00:1f.3": "nur Geraet am Slot 00:1f.3 anzeigen",
    "-d 8086:": "nur Geraete des Herstellers 8086 anzeigen",
    "-mm": "maschinenlesbare Ausgabe erzeugen",
    "-vvv": "maximal ausfuehrliche PCI-Geraetedetails anzeigen",
    "-D": "Domain-Nummern immer anzeigen",
    "-q": "PCI-ID-Datenbank online abfragen",
    "-xxxx": "erweiterten Konfigurationsraum hexadezimal anzeigen",
    "-v": "ausführliche PCI-Gerätedetails anzeigen",
    "-vv": "sehr ausführliche PCI-Gerätedetails anzeigen",
    "-k": "Kernel-Treiber und Module je Gerät anzeigen",
    "-nn": "Hersteller- und Geräte-IDs numerisch mit anzeigen",
    "-s": "auf einen Slot oder Bus filtern",
    "-d": "nach Hersteller- oder Geräte-ID filtern",
    "-t": "PCI-Geräte als Baum anzeigen",
  },
  lsusb: {
    "-d 1d6b:": "USB-Geraete mit Vendor-ID 1d6b anzeigen",
    "-d 1d6b:0002": "genau dieses Vendor/Product-Paar anzeigen",
    "-s 001:002": "USB-Geraet an Bus 001, Device 002 anzeigen",
    "-D /dev/bus/usb/001/002": "bestimmte USB-Geraetedatei auslesen",
    "-v | less": "ausfuehrliche USB-Details im Pager anzeigen",
    "-V": "Version anzeigen",
    "--version": "Version anzeigen",
    "-t": "USB-Geräte als Bus-Baum anzeigen",
    "-v": "ausführliche USB-Deskriptoren anzeigen",
    "-d": "nach Vendor- und Product-ID filtern",
    "-s": "nach Bus und Gerätenummer filtern",
    "-D": "bestimmte Geräte-Datei auslesen",
  },
  netstat: {
    "-t": "TCP-Verbindungen anzeigen",
    "-u": "UDP-Verbindungen anzeigen",
    "-l": "lauschende Sockets anzeigen",
    "-n": "Adressen und Ports numerisch anzeigen",
    "-p": "Prozessinformationen anzeigen",
    "-a": "alle Sockets anzeigen",
    "-r": "Routing-Tabelle anzeigen",
    "-i": "Interface-Statistiken anzeigen",
    "-s": "Protokollstatistiken anzeigen",
    "-plant": "lauschende TCP-Ports mit Prozessen anzeigen",
    "-tulpn": "lauschende TCP/UDP-Ports mit Prozessen anzeigen",
    "-rn": "Routing-Tabelle numerisch anzeigen",
  },
  nl: {
    "file.txt": "Datei mit Standard-Zeilennummern ausgeben",
    "-ba file.txt": "alle Zeilen in Datei nummerieren",
    "-bt file.txt": "nur nichtleere Zeilen nummerieren",
    "-n rz -w3 file.txt": "rechtsbuendige dreistellige Zeilennummern ausgeben",
    "-v 100 file.txt": "Zeilennummern bei 100 starten",
    "-i 10 file.txt": "Zeilennummern in Zehnerschritten erhoehen",
    "-n": "Format der Zeilennummer setzen",
    "--number-format": "Format der Zeilennummer setzen",
    "-v": "Startnummer setzen",
    "--starting-line-number": "Startnummer setzen",
    "-i": "Zeilennummer-Inkrement setzen",
    "--line-increment": "Zeilennummer-Inkrement setzen",
    "-ba": "alle Zeilen nummerieren",
    "-b": "Zeilennummerierung für Body setzen",
    "--body-numbering": "Zeilennummerierung für Body setzen",
    "-w1": "Zeilennummernbreite auf 1 setzen",
    "-w": "Breite der Zeilennummern setzen",
    "--number-width": "Breite der Zeilennummern setzen",
    "-s": "Trenner nach Zeilennummer setzen",
    "--number-separator": "Trenner nach Zeilennummer setzen",
  },
  nmap: {
    "-p": "Ports oder Portbereich setzen",
    "-sV": "Service- und Versionsscan ausführen",
    "-sS": "TCP-SYN-Scan ausführen",
    "-A": "OS-, Version- und Script-Erkennung aktivieren",
    "-O": "Betriebssystemerkennung aktivieren",
    "-Pn": "Host-Discovery überspringen",
    "-n": "DNS-Auflösung deaktivieren",
  },
  vmstat: {
    "1": "Systemstatistiken jede Sekunde anzeigen",
    "1 5": "fuenf Messungen im Sekundentakt anzeigen",
    "-s": "Speicher- und Ereigniszaehler anzeigen",
    "-d": "Disk-Statistiken anzeigen",
    "-w 1": "breite Live-Ausgabe jede Sekunde anzeigen",
    "-S M 1": "Speicherwerte in MiB anzeigen",
    "-a": "aktive und inaktive Speicherseiten anzeigen",
    "-t 1": "Zeitstempel in Live-Ausgabe anzeigen",
    "--stats": "Statistikzaehler anzeigen",
    "--disk": "Disk-Statistiken anzeigen",
    "-w": "breite Ausgabe verwenden",
    "--wide": "breite Ausgabe verwenden",
    "-t": "Zeitstempel anzeigen",
    "--timestamp": "Zeitstempel anzeigen",
    "--active": "aktive und inaktive Speicherseiten anzeigen",
    "-S": "Einheit fuer Speicherwerte setzen",
    "--unit": "Einheit fuer Speicherwerte setzen",
    "-f": "Fork-Zaehler anzeigen",
    "--forks": "Fork-Zaehler anzeigen",
    "-m": "Slab-Informationen anzeigen",
    "--slabs": "Slab-Informationen anzeigen",
  },
  vnstat: {
    "-i": "Interface auswählen",
    "--iface": "Interface auswählen",
    "-l": "Live-Verkehr anzeigen",
    "--live": "Live-Verkehr anzeigen",
    "-d": "Tagesstatistik anzeigen",
    "--days": "Tagesstatistik anzeigen",
    "-m": "Monatsstatistik anzeigen",
    "--months": "Monatsstatistik anzeigen",
    "-h": "Stundenstatistik anzeigen",
    "--hours": "Stundenstatistik anzeigen",
    "-5": "5-Minuten-Statistik anzeigen",
    "--fiveminutes": "5-Minuten-Statistik anzeigen",
    "--json": "Ausgabe als JSON erzeugen",
  },
  nc: {
    "-l": "auf eingehende Verbindungen lauschen",
    "-p": "lokalen Port setzen",
    "-v": "Verbindungsdetails anzeigen",
    "-z": "nur Port prüfen, keine Daten senden",
    "-u": "UDP statt TCP verwenden",
    "-w": "Timeout in Sekunden setzen",
    "-n": "DNS-Auflösung deaktivieren",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
  },
  patch: {
    "-p1": "einen führenden Pfadbestandteil entfernen",
    "-p": "Pfadbestandteile beim Anwenden entfernen",
    "--strip": "Pfadbestandteile beim Anwenden entfernen",
    "--dry-run": "Patch nur testen",
    "-R": "Patch rückwärts anwenden",
    "--reverse": "Patch rückwärts anwenden",
    "-i": "Patch-Datei auswählen",
    "--input": "Patch-Datei auswählen",
    "-d": "vorher in Verzeichnis wechseln",
    "--directory": "vorher in Verzeichnis wechseln",
  },
  paste: {
    "names.txt values.txt": "Dateien zeilenweise nebeneinander ausgeben",
    "-d ',' a.txt b.txt": "Dateien mit Komma als Trenner zusammenfuehren",
    "-s file.txt": "Zeilen einer Datei seriell zusammenfuehren",
    "-d ':' users.txt shells.txt": "Dateien mit Doppelpunkt als Trenner verbinden",
    "-d '\\t' col1.txt col2.txt": "Dateien mit Tabulator als Trenner verbinden",
    "-s -d ',' file.txt": "Dateizeilen mit Komma in eine Zeile schreiben",
    "-z names.txt values.txt": "NUL-getrennte Eingabe verarbeiten",
    "-d": "Trennerliste setzen",
    "--delimiters": "Trennerliste setzen",
    "-s": "jede Datei seriell statt parallel ausgeben",
    "--serial": "jede Datei seriell statt parallel ausgeben",
    "-z": "NUL-getrennte Zeilen verwenden",
    "--zero-terminated": "NUL-getrennte Zeilen verwenden",
  },
  pgrep: {
    nginx: "PIDs von nginx suchen",
    "-u www-data": "Prozesse des Benutzers www-data suchen",
    "-x sshd": "nur exakt sshd passende Prozesse suchen",
    "-n node": "neuesten passenden node-Prozess anzeigen",
    "-o bash": "aeltesten passenden bash-Prozess anzeigen",
    "-P 1": "Prozesse mit Parent-PID 1 suchen",
    "-d ',' nginx": "PIDs durch Komma getrennt ausgeben",
    "-c sshd": "Anzahl passender sshd-Prozesse ausgeben",
    "-l systemd": "PID und Namen fuer systemd anzeigen",
    "-P": "nach Parent-PID filtern",
    "-g": "nach Prozessgruppe filtern",
    "-t": "nach Terminal filtern",
    "-d": "Ausgabetrenner setzen",
    "-c": "nur Anzahl passender Prozesse ausgeben",
    "-i": "Gross-/Kleinschreibung ignorieren",
    "-v": "Treffer invertieren",
    "-r": "nach Prozesszustand filtern",
    "-af": "PID und komplette Kommandozeile durchsuchen und anzeigen",
    "-f": "gesamte Kommandozeile durchsuchen",
    "-u": "nach Benutzer filtern",
    "-x": "nur exakten Namen treffen",
    "-a": "PID und Kommandozeile ausgeben",
    "-l": "PID und Prozessnamen ausgeben",
    "-n": "neuesten passenden Prozess wählen",
    "-o": "ältesten passenden Prozess wählen",
  },
  ping: {
    "-c": "Anzahl der Pakete begrenzen",
    "-i": "Intervall zwischen Paketen setzen",
    "-s": "Paketgröße setzen",
    "-t": "TTL setzen",
    "-W": "Antwort-Timeout setzen",
    "-4": "IPv4 erzwingen",
    "-6": "IPv6 erzwingen",
  },
  pkill: {
    "-f": "gesamte Kommandozeile durchsuchen",
    "-f 'python app.py'": "Python-App per kompletter Kommandozeile beenden",
    "-u": "nach Benutzer filtern",
    "-u www-data php": "PHP-Prozesse von www-data beenden",
    "-x": "nur exakten Namen treffen",
    "-x nginx": "nur exakt nginx treffende Prozesse beenden",
    "-9": "KILL-Signal senden",
    "-TERM": "TERM-Signal senden",
    "-TERM nginx": "nginx mit TERM-Signal beenden",
    "-HUP": "HUP-Signal senden",
    "-HUP nginx": "nginx per HUP neu laden lassen",
    "-e": "beendete Prozesse ausgeben",
    "-e -TERM nginx": "beendete nginx-Prozesse ausgeben",
    "-n": "nur neuesten passenden Prozess treffen",
    "-n nginx": "neuesten nginx-Prozess treffen",
    "-o": "nur ältesten passenden Prozess treffen",
    "-o nginx": "ältesten nginx-Prozess treffen",
    "-P": "nach Parent-PID filtern",
    "-g": "nach Prozessgruppe filtern",
    "-t": "nach Terminal filtern",
  },
  readlink: {
    "symlink": "Ziel des symbolischen Links anzeigen",
    "-f ./path": "Pfad kanonisch und absolut aufloesen",
    "-e /etc/alternatives/editor": "Pfad nur bei existierenden Bestandteilen aufloesen",
    "-m missing/path": "Pfad auch mit fehlenden Bestandteilen aufloesen",
    "-n symlink": "Linkziel ohne abschliessenden Zeilenumbruch ausgeben",
    "/proc/self/exe": "Pfad der aktuellen Executable anzeigen",
    "--canonicalize": "Pfad kanonisch und absolut aufloesen",
    "--canonicalize-existing": "Pfad nur bei existierenden Bestandteilen aufloesen",
    "--canonicalize-missing": "Pfad auch mit fehlenden Bestandteilen aufloesen",
    "--no-newline": "keinen Zeilenumbruch ausgeben",
    "--verbose": "Fehler ausfuehrlicher melden",
    "-q": "Fehlerausgaben unterdruecken",
    "--quiet": "Fehlerausgaben unterdruecken",
    "-f": "kanonischen Pfad auflösen",
    "-e": "Pfad nur ausgeben, wenn alles existiert",
    "-m": "Pfad auch mit fehlenden Teilen kanonisieren",
    "-n": "keinen Zeilenumbruch ausgeben",
    "-v": "Fehler ausführlicher melden",
  },
  realpath: {
    ".": "aktuelles Verzeichnis absolut aufloesen",
    "file.txt": "Dateipfad absolut aufloesen",
    "-e /etc/passwd": "existierenden Pfad absolut aufloesen",
    "-m missing/path": "fehlende Pfadbestandteile trotzdem kanonisieren",
    "--relative-to /var /var/log/syslog": "Pfad relativ zu /var ausgeben",
    "--relative-base=/srv /srv/app/config.yml": "nur unter /srv relativ ausgeben",
    "-s symlink": "Symlinks nicht expandieren",
    "-z file.txt": "Ausgabe NUL-getrennt erzeugen",
    "-e": "alle Pfadbestandteile muessen existieren",
    "--canonicalize-existing": "alle Pfadbestandteile muessen existieren",
    "-m": "fehlende Pfadbestandteile erlauben",
    "--canonicalize-missing": "fehlende Pfadbestandteile erlauben",
    "-L": "Symlinks logisch vor .. aufloesen",
    "--logical": "Symlinks logisch vor .. aufloesen",
    "-P": "Symlinks physisch nach .. aufloesen",
    "--physical": "Symlinks physisch nach .. aufloesen",
    "-s": "Symlinks nicht expandieren",
    "--strip": "Symlinks nicht expandieren",
    "-z": "Ausgabe NUL-getrennt erzeugen",
    "--zero": "Ausgabe NUL-getrennt erzeugen",
    "--relative-to": "Pfad relativ zu diesem Verzeichnis ausgeben",
    "--relative-base": "nur unter Basis relativ ausgeben",
  },
  service: {
    "--status-all": "Status aller SysV-Dienste anzeigen",
    "--help": "Hilfe zu service anzeigen",
    "--version": "service-Version anzeigen",
    status: "Dienststatus anzeigen",
    start: "Dienst starten",
    stop: "Dienst stoppen",
    restart: "Dienst neu starten",
    reload: "Dienstkonfiguration neu laden",
    "force-reload": "Konfiguration neu laden oder Dienst neu starten",
  },
  sort: {
    "-n": "numerisch sortieren",
    "-nr": "numerisch absteigend sortieren",
    "-r": "Sortierung umkehren",
    "-u": "doppelte Zeilen entfernen",
    "-k": "Sortierschlüssel setzen",
    "-t": "Feldtrenner setzen",
    "-h": "menschenlesbare Größen sortieren",
    "-V": "Versionsnummern sortieren",
    "-f": "Groß-/Kleinschreibung ignorieren",
    "-o": "Ausgabe in Datei schreiben",
  },
  split: {
    "-l 1000 big.log part-": "Logdatei in Teile zu je 1000 Zeilen aufteilen",
    "-b 100M archive.tar archive.part.": "Archiv in 100-MB-Teile aufteilen",
    "-d -a 3 file chunk-": "numerische dreistellige Suffixe verwenden",
    "-n 4 bigfile chunk-": "Datei in vier Chunks aufteilen",
    "-C 10M access.log access.part.": "Zeilenbasiert bis etwa 10 MB pro Teil aufteilen",
    "--filter='gzip > $FILE.gz' big.log part-": "Teile direkt durch gzip filtern",
    "--additional-suffix=.txt -l 500 file part-": "Suffix .txt an Ausgabeteile haengen",
    "-x -a 2 file chunk-": "hexadezimale zweistellige Suffixe verwenden",
    "-x": "hexadezimale Suffixe verwenden",
    "--hex-suffixes": "hexadezimale Suffixe verwenden",
    "-n": "Anzahl Chunks setzen",
    "--number": "Anzahl Chunks setzen",
    "-C": "Zeilenbasiert nach Bytegroesse aufteilen",
    "--line-bytes": "Zeilenbasiert nach Bytegroesse aufteilen",
    "--additional-suffix": "zusatzliches Suffix anhaengen",
    "--filter": "jeden Ausgabeteil durch Kommando filtern",
    "-l": "nach Zeilenanzahl aufteilen",
    "--lines": "nach Zeilenanzahl aufteilen",
    "-b": "nach Byte-Größe aufteilen",
    "--bytes": "nach Byte-Größe aufteilen",
    "-d": "numerische Suffixe verwenden",
    "--numeric-suffixes": "numerische Suffixe verwenden",
    "-a": "Suffixlänge setzen",
    "--suffix-length": "Suffixlänge setzen",
  },
  stat: {
    "-c": "Ausgabeformat setzen",
    "-f": "Dateisystemstatus statt Dateistatus anzeigen",
    "-L": "symbolischen Links folgen",
    "-t": "knappe Ausgabe erzeugen",
  },
  sysctl: {
    "-a": "alle Kernel-Parameter anzeigen",
    "--all": "alle Kernel-Parameter anzeigen",
    "net.ipv4.ip_forward": "IP-Forwarding-Parameter anzeigen",
    "vm.swappiness": "Swappiness-Parameter anzeigen",
    "-n kernel.hostname": "nur Hostname-Wert ausgeben",
    "-w": "Kernel-Parameter setzen",
    "--write": "Kernel-Parameter setzen",
    "-w net.ipv4.ip_forward=1": "IP-Forwarding zur Laufzeit aktivieren",
    "-p": "Parameter aus Datei laden",
    "-p /etc/sysctl.conf": "Parameter aus /etc/sysctl.conf laden",
    "--load": "Parameter aus Datei laden",
    "-n": "nur Werte ausgeben",
    "--values": "nur Werte ausgeben",
    "-e": "unbekannte Schlüssel ignorieren",
    "--ignore": "unbekannte Schlüssel ignorieren",
    "-N": "nur Parameternamen ausgeben",
    "--names": "nur Parameternamen ausgeben",
    "-q": "Ausgabe reduzieren",
    "--quiet": "Ausgabe reduzieren",
    "-r": "Parameternamen per Muster filtern",
    "--pattern": "Parameternamen per Muster filtern",
  },
  "update-alternatives": {
    "--display editor": "Alternative editor anzeigen",
    "--config java": "interaktive Java-Alternative auswählen",
    "--list editor": "Pfade für editor auflisten",
    "--set editor /usr/bin/vim": "editor auf vim setzen",
    "--auto editor": "editor wieder automatisch wählen lassen",
    "--query editor": "Alternative editor maschinenlesbar anzeigen",
    "--get-selections": "alle Alternative-Auswahlen anzeigen",
    "--install /usr/bin/editor editor /usr/bin/vim 100":
      "vim als editor-Alternative registrieren",
    "--display": "Alternative anzeigen",
    "--config": "Alternative interaktiv auswählen",
    "--list": "Alternativenpfade auflisten",
    "--install": "neue Alternative registrieren",
    "--remove": "Alternative entfernen",
    "--auto": "automatischen Modus aktivieren",
    "--set": "Alternative direkt setzen",
    "--query": "Alternative maschinenlesbar anzeigen",
    "--set-selections": "Auswahlen aus stdin übernehmen",
    "--remove-all": "alle Alternativen eines Namens entfernen",
    "--all": "alle Alternativen konfigurieren",
    "--verbose": "ausführlicher ausgeben",
  },
  "systemd-analyze": {
    "plot > boot.svg": "Boot-Timeline als SVG speichern",
    "dot --order > boot.dot": "Abhaengigkeitsgraph als DOT speichern",
    "verify /etc/systemd/system/app.service": "Unit-Datei app.service pruefen",
    "security ssh.service": "Sicherheitsprofil von ssh.service bewerten",
    "calendar 'Mon *-*-* 09:00'": "Kalenderausdruck auswerten",
    "--man": "Manpage-Referenzen anzeigen",
    "--generators": "Generatoren bei Analyse beruecksichtigen",
    "--recursive-errors": "rekursive Fehlerbehandlung setzen",
    "--offline": "Offline-Sicherheitsanalyse verwenden",
    time: "Bootzeit grob zusammenfassen",
    blame: "Units nach Startdauer sortieren",
    "critical-chain": "kritische Boot-Abhängigkeitskette anzeigen",
    plot: "Boot-Timeline als SVG erzeugen",
    dot: "Abhängigkeitsgraph ausgeben",
    verify: "Unit-Datei prüfen",
    "--user": "User-Manager analysieren",
    "--system": "System-Manager analysieren",
    "--no-pager": "ohne Pager ausgeben",
    "--json": "Ausgabe als JSON erzeugen",
    "--order": "Abhängigkeiten nach Reihenfolge darstellen",
  },
  touch: {
    "file.txt": "Datei anlegen oder Zeitstempel aktualisieren",
    "-c existing.txt": "nur existierende Datei anfassen",
    "-a access.log": "nur Zugriffszeit aktualisieren",
    "-m modified.log": "nur Aenderungszeit aktualisieren",
    "-t 202606030900 release.txt": "Zeitstempel per numerischem Datum setzen",
    "-r reference.txt target.txt": "Zeitstempel von Referenzdatei uebernehmen",
    "--date='1 hour ago' file.txt": "Zeitstempel relativ setzen",
    "-a": "nur Zugriffszeit aktualisieren",
    "-m": "nur Aenderungszeit aktualisieren",
    "-c": "keine Datei neu anlegen",
    "--no-create": "keine Datei neu anlegen",
    "-d": "Zeitstempel per lesbarem Datum setzen",
    "--date": "Zeitstempel per lesbarem Datum setzen",
    "-t": "Zeitstempel per numerischem Datum setzen",
    "-r": "Zeitstempel von Referenzdatei uebernehmen",
    "--reference": "Zeitstempel von Referenzdatei uebernehmen",
    "--time": "auswaehlen, welche Zeit geaendert wird",
  },
  tail: {
    "file.txt": "Ende von file.txt anzeigen",
    "-n 100 /var/log/syslog": "letzte 100 Zeilen des Systemlogs anzeigen",
    "-f /var/log/app.log": "App-Log live verfolgen",
    "-F /var/log/app.log": "App-Log live verfolgen und Reopen versuchen",
    "-n +20 file.txt": "Datei ab Zeile 20 ausgeben",
    "-c 1K file.bin": "letztes KiB einer Datei anzeigen",
    "--pid 1234 -f /var/log/app.log": "Log verfolgen bis PID 1234 endet",
    "--retry -F /var/log/app.log": "Datei beim Folgen erneut oeffnen",
    "-q file1.log file2.log": "mehrere Dateien ohne Header ausgeben",
    "-v file1.log file2.log": "mehrere Dateien mit Header ausgeben",
    "--lines": "Anzahl der letzten Zeilen setzen",
    "--bytes": "Anzahl der letzten Bytes setzen",
    "-q": "Dateinamen-Header ausblenden",
    "--quiet": "Dateinamen-Header ausblenden",
    "-v": "Dateinamen-Header immer anzeigen",
    "--verbose": "Dateinamen-Header immer anzeigen",
    "-n": "Anzahl der letzten Zeilen setzen",
    "-c": "Anzahl der letzten Bytes setzen",
    "-f": "Dateiende live verfolgen",
    "-F": "Dateiende live verfolgen und Reopen versuchen",
    "--pid": "Folgen beenden, wenn Prozess endet",
    "--retry": "Datei beim Folgen erneut öffnen",
  },
  pidof: {
    sshd: "PIDs von sshd anzeigen",
    nginx: "PIDs von nginx anzeigen",
    systemd: "PID von systemd anzeigen",
    "-s nginx": "nur eine nginx-PID ausgeben",
    "-x script.sh": "auch Shell-Skripte mit diesem Namen finden",
    "-o %PPID sshd": "aufrufenden Parent-Prozess ausschliessen",
    "--single-shot nginx": "nur eine nginx-PID ausgeben",
    "--scripts script.sh": "auch Skripte mit diesem Namen finden",
    "-s": "nur eine PID ausgeben",
    "--single-shot": "nur eine PID ausgeben",
    "-x": "Skripte ebenfalls beruecksichtigen",
    "--scripts": "Skripte ebenfalls beruecksichtigen",
    "-o": "bestimmte PID auslassen",
    "--omit-pid": "bestimmte PID auslassen",
    "-q": "keine Ausgabe, nur Exit-Code verwenden",
    "--quiet": "keine Ausgabe, nur Exit-Code verwenden",
  },
  pstree: {
    "-p": "Prozess-IDs im Baum anzeigen",
    "--show-pids": "Prozess-IDs im Baum anzeigen",
    "-u": "Benutzerwechsel im Prozessbaum anzeigen",
    "--uid-changes": "Benutzerwechsel im Prozessbaum anzeigen",
    "-a": "Kommandoargumente anzeigen",
    "--arguments": "Kommandoargumente anzeigen",
    "-h": "aktuellen Prozesszweig hervorheben",
    "--highlight-all": "aktuellen Prozesszweig hervorheben",
    "-T": "Threads ausblenden",
    "--hide-threads": "Threads ausblenden",
    "-s": "Elternkette eines Prozesses anzeigen",
    "-s <pid>": "Elternkette dieser PID anzeigen",
    "-p systemd": "Prozessbaum um systemd mit PIDs anzeigen",
    "-u www-data": "Prozessbaum mit Benutzerwechseln fuer www-data anzeigen",
  },
  top: {
    "-u www-data": "Prozesse des Webserver-Benutzers anzeigen",
    "-u root": "Prozesse des Benutzers root anzeigen",
    "-p 1": "Prozess mit PID 1 beobachten",
    "-b -n 1": "einmalige Batch-Ausgabe erzeugen",
    "-b -n 1 -o %CPU": "einmalige Batch-Ausgabe nach CPU sortieren",
    "-d 1": "jede Sekunde aktualisieren",
    "-o %MEM": "nach Speicherverbrauch sortieren",
    "-u": "Prozesse eines Benutzers anzeigen",
    "-p": "bestimmte Prozess-IDs anzeigen",
    "-d": "Aktualisierungsdelay setzen",
    "-n": "Anzahl Aktualisierungen setzen",
    "-b": "Batch-Modus verwenden",
    "-H": "Threads anzeigen",
    "-o": "Sortierspalte setzen",
    "-c": "komplette Kommandozeilen anzeigen",
    "-i": "idle Prozesse ausblenden",
    "-w": "Ausgabebreite setzen",
  },
  tr: {
    "a-z A-Z": "kleine Buchstaben in grosse umwandeln",
    "-d '\\r' < windows.txt > unix.txt": "Windows-Zeilenenden entfernen",
    "-s ' ' < file.txt": "mehrfache Leerzeichen zusammenfassen",
    "'[:lower:]' '[:upper:]' < file.txt": "Text in Grossbuchstaben umwandeln",
    "-d '[:digit:]' < file.txt": "Ziffern aus Eingabe entfernen",
    "-cd '[:print:]\\n' < file.txt": "nur druckbare Zeichen und Zeilenumbrueche behalten",
    "-s '\\n' < file.txt": "mehrfache Leerzeilen zusammenfassen",
    "'\\t' ',' < table.tsv": "Tabs in Kommas umwandeln",
    "-C": "Zeichenauswahl byteweise invertieren",
    "--truncate-set1": "erstes Zeichenset auf Laenge des zweiten kuerzen",
    "-d": "Zeichen löschen",
    "--delete": "Zeichen löschen",
    "-s": "wiederholte Zeichen zusammenfassen",
    "--squeeze-repeats": "wiederholte Zeichen zusammenfassen",
    "-c": "Zeichenauswahl invertieren",
    "--complement": "Zeichenauswahl invertieren",
  },
  traceroute: {
    "-n": "Adressen nicht auflösen",
    "-I": "ICMP Echo verwenden",
    "-T": "TCP-Pakete verwenden",
    "-p": "Zielport setzen",
    "-m": "maximale Hop-Anzahl setzen",
    "-w": "Antwort-Timeout setzen",
    "-q": "Queries pro Hop setzen",
  },
  uniq: {
    "file.txt": "benachbarte Duplikate aus Datei entfernen",
    "-i names.txt": "Namen ohne Gross-/Kleinschreibung vergleichen",
    "-c access.log | sort -nr": "Haeufigkeiten zaehlen und absteigend sortieren",
    "-f 1 data.txt": "erstes Feld beim Vergleich ignorieren",
    "-s 4 data.txt": "erste vier Zeichen beim Vergleich ignorieren",
    "--count": "Wiederholungen zaehlen",
    "--repeated": "nur doppelte Zeilen ausgeben",
    "--unique": "nur eindeutige Zeilen ausgeben",
    "--ignore-case": "Gross-/Kleinschreibung ignorieren",
    "-w": "nur diese Zeichenanzahl vergleichen",
    "-c": "Wiederholungen zählen",
    "-d": "nur doppelte Zeilen ausgeben",
    "-u": "nur eindeutige Zeilen ausgeben",
    "-i": "Groß-/Kleinschreibung ignorieren",
    "-f": "Felder am Zeilenanfang überspringen",
    "-s": "Zeichen am Zeilenanfang überspringen",
  },
  wc: {
    "file.txt": "Zeilen, Wörter oder Bytes für Datei zählen",
    "-l file.txt": "Zeilen in Datei zaehlen",
    "-w file.txt": "Woerter in Datei zaehlen",
    "-c file.txt": "Bytes in Datei zaehlen",
    "-m file.txt": "Zeichen in Datei zaehlen",
    "-L file.txt": "laengste Zeile in Datei messen",
    "-l *.log": "Zeilen ueber Logdateien zaehlen",
    "--lines": "Zeilen zaehlen",
    "--words": "Woerter zaehlen",
    "--bytes": "Bytes zaehlen",
    "--chars": "Zeichen zaehlen",
    "--max-line-length": "Laenge der laengsten Zeile anzeigen",
    "-l": "Zeilen zählen",
    "-w": "Wörter zählen",
    "-c": "Bytes zählen",
    "-m": "Zeichen zählen",
    "-L": "Länge der längsten Zeile anzeigen",
  },
  which: {
    python: "Pfad zu python suchen",
    node: "Pfad zu node suchen",
    docker: "Pfad zu docker suchen",
    systemctl: "Pfad zu systemctl suchen",
    bash: "Pfad zu bash suchen",
    npm: "Pfad zu npm suchen",
    ssh: "Pfad zu ssh suchen",
    "-a sh": "alle sh-Fundstellen anzeigen",
    "-a python": "alle python-Fundstellen anzeigen",
    "-a": "alle passenden Fundstellen anzeigen",
    "--all": "alle passenden Fundstellen anzeigen",
    "-s": "keine Ausgabe, nur Exit-Code verwenden",
    "--skip-dot": "Eintraege im aktuellen Verzeichnis ueberspringen",
    "--skip-tilde": "Tilde-Pfade ueberspringen",
  },
  awk: {
    "'{print $1}' file.txt": "erste Spalte aus Datei ausgeben",
    "-F ':' '{print $1}' /etc/passwd": "Benutzernamen aus passwd ausgeben",
    "'NF {print}' file.txt": "nur nichtleere Zeilen ausgeben",
    "'{sum += $1} END {print sum}' numbers.txt": "erste Spalte aufsummieren",
    "-F, 'NR>1 {print $2}' data.csv": "zweite CSV-Spalte ohne Header ausgeben",
    "length($0) > 120 file.txt": "Zeilen laenger als 120 Zeichen anzeigen",
    "-f script.awk data.txt": "awk-Programm aus Datei ausfuehren",
    "--sandbox": "Dateizugriffe im awk-Programm beschraenken",
    "--traditional": "traditionellen awk-Modus verwenden",
    "-W version": "awk-Version anzeigen",
    "-W help": "awk-Hilfe anzeigen",
    "-F": "Feldtrenner setzen",
    "--field-separator": "Feldtrenner setzen",
    "-v": "Variable vor Programmausführung setzen",
    "--assign": "Variable vor Programmausführung setzen",
    "-f": "awk-Programm aus Datei lesen",
    "--file": "awk-Programm aus Datei lesen",
    "--posix": "POSIX-Kompatibilität erzwingen",
    "--lint": "Warnungen für fragwürdige awk-Konstrukte ausgeben",
  },
  clear: {
    "-x": "Scrollback-Puffer nicht löschen",
    "-T": "Terminaltyp explizit setzen",
    "-V": "Version anzeigen",
  },
  apt: {
    update: "Paketlisten aktualisieren",
    upgrade: "installierte Pakete aktualisieren",
    "full-upgrade": "Pakete mit Abhängigkeitsänderungen aktualisieren",
    install: "Paket installieren",
    remove: "Paket entfernen",
    purge: "Paket inklusive Konfiguration entfernen",
    autoremove: "nicht mehr benötigte Pakete entfernen",
    autoclean: "alte Paketdateien bereinigen",
    search: "Pakete suchen",
    show: "Paketdetails anzeigen",
    list: "Paketliste anzeigen",
    "-y": "Rückfragen automatisch bestätigen",
    "--no-install-recommends": "empfohlene Zusatzpakete auslassen",
    "--reinstall": "Paket erneut installieren",
    "--only-upgrade": "nur vorhandene Pakete aktualisieren",
  },
  "apt-cache": {
    policy: "Installationskandidat und Quellen anzeigen",
    search: "Paketindex durchsuchen",
    show: "Paketdetails anzeigen",
    depends: "Abhängigkeiten anzeigen",
    rdepends: "Reverse-Abhängigkeiten anzeigen",
    "--names-only": "nur Paketnamen durchsuchen",
    "--no-all-versions": "nur die relevante Paketversion anzeigen",
    "-q": "Ausgabe reduzieren",
    "--quiet": "Ausgabe reduzieren",
  },
  "apt-get": {
    update: "Paketlisten aktualisieren",
    upgrade: "installierte Pakete aktualisieren",
    "dist-upgrade": "Pakete mit Abhängigkeitsänderungen aktualisieren",
    install: "Paket installieren",
    remove: "Paket entfernen",
    purge: "Paket inklusive Konfiguration entfernen",
    autoremove: "nicht mehr benötigte Pakete entfernen",
    autoclean: "alte Paketdateien bereinigen",
    "-y": "Rückfragen automatisch bestätigen",
    "--yes": "Rückfragen automatisch bestätigen",
    "--no-install-recommends": "empfohlene Zusatzpakete auslassen",
    "--reinstall": "Paket erneut installieren",
    "--only-upgrade": "nur vorhandene Pakete aktualisieren",
    "-s": "Aktion nur simulieren",
    "--simulate": "Aktion nur simulieren",
  },
  npm: {
    install: "Dependencies installieren",
    "install <package>": "Paket als Dependency installieren",
    ci: "Dependencies exakt aus package-lock installieren",
    "run <script>": "package.json-Skript ausführen",
    "run dev": "Entwicklungs-Skript starten",
    "run build": "Build-Skript ausführen",
    "run start": "Start-Skript ausführen",
    dev: "Entwicklungs-Skript starten",
    build: "Build-Skript ausführen",
    start: "Start-Skript ausführen",
    test: "Test-Skript ausführen",
    init: "neues package.json anlegen",
    "init -y": "package.json mit Standardwerten anlegen",
    outdated: "veraltete Dependencies anzeigen",
    audit: "Dependency-Sicherheitsbericht anzeigen",
    "audit fix": "automatische Audit-Fixes anwenden",
    list: "installierte Pakete anzeigen",
    "list --depth=0": "direkte Dependencies anzeigen",
    view: "Paket-Metadaten anzeigen",
    exec: "Paket-Binary ausführen",
    "cache verify": "npm-Cache prüfen",
    "--save-dev": "Paket als Dev-Dependency speichern",
    "--global": "Paket global installieren",
    "--prefix": "Projektpfad für npm setzen",
    "--production": "nur Produktionsdependencies verwenden",
    "--omit": "Dependency-Gruppen auslassen",
    "--legacy-peer-deps": "Peer-Dependency-Konflikte lockerer behandeln",
    "--dry-run": "Aktion nur anzeigen",
    "--json": "Ausgabe als JSON erzeugen",
  },
  pnpm: {
    install: "Dependencies installieren",
    add: "Paket hinzufügen",
    "add <package>": "Paket als Dependency hinzufügen",
    "add -D": "Paket als Dev-Dependency hinzufügen",
    "add -D <package>": "Paket als Dev-Dependency hinzufügen",
    remove: "Paket entfernen",
    "run <script>": "package.json-Skript ausführen",
    "run dev": "Entwicklungs-Skript starten",
    "run build": "Build-Skript ausführen",
    dev: "Entwicklungs-Skript starten",
    build: "Build-Skript ausführen",
    test: "Test-Skript ausführen",
    start: "Start-Skript ausführen",
    exec: "Command im Projektkontext ausführen",
    dlx: "Paket temporär ausführen",
    outdated: "veraltete Dependencies anzeigen",
    list: "installierte Pakete anzeigen",
    workspace: "Workspace-Kommando ausführen",
    "-D": "als Dev-Dependency speichern",
    "--save-dev": "als Dev-Dependency speichern",
    "-w": "Workspace-Root verwenden",
    "--workspace-root": "Workspace-Root verwenden",
    "-r": "rekursiv in Workspaces ausführen",
    "--recursive": "rekursiv in Workspaces ausführen",
    "--filter": "Workspace-Auswahl filtern",
    "--frozen-lockfile": "Lockfile unverändert erzwingen",
    "--offline": "nur lokalen Store verwenden",
  },
  yarn: {
    install: "Dependencies installieren",
    add: "Paket hinzufügen",
    "add <package>": "Paket als Dependency hinzufügen",
    "add -D": "Paket als Dev-Dependency hinzufügen",
    "add -D <package>": "Paket als Dev-Dependency hinzufügen",
    remove: "Paket entfernen",
    "run <script>": "package.json-Skript ausführen",
    dev: "Entwicklungs-Skript starten",
    build: "Build-Skript ausführen",
    test: "Test-Skript ausführen",
    start: "Start-Skript ausführen",
    dlx: "Paket temporär ausführen",
    outdated: "veraltete Dependencies anzeigen",
    "workspaces list": "Workspaces auflisten",
    workspace: "Kommando in Workspace ausführen",
    "-D": "als Dev-Dependency speichern",
    "--dev": "als Dev-Dependency speichern",
    "--production": "Produktionsmodus verwenden",
    "--frozen-lockfile": "Lockfile unverändert erzwingen",
    "--immutable": "Yarn-Install ohne Lockfile-Änderung erzwingen",
    "--cwd": "Arbeitsverzeichnis setzen",
    "--json": "Ausgabe als JSON erzeugen",
  },
  node: {
    "server.js": "Server-Skript starten",
    "-e": "JavaScript direkt ausführen",
    "-p": "Ausdruck auswerten und ausgeben",
    "-r": "Modul vorab laden",
    "--watch": "Skript bei Dateiänderungen neu starten",
    "--inspect": "Debugger-Port öffnen",
    "--inspect-brk": "Debugger öffnen und vor Start pausieren",
    "--env-file": "Umgebungsvariablen aus Datei laden",
    "--test": "Node-Test-Runner starten",
    "--version": "Node.js-Version anzeigen",
    "--help": "Node.js-Hilfe anzeigen",
  },
  python: {
    "script.py": "Python-Skript ausführen",
    "-m": "Python-Modul ausführen",
    "-m venv": "virtuelle Umgebung erstellen",
    "-m pip": "pip über diesen Python ausführen",
    "-m pip install": "Python-Paket installieren",
    "-m pip install -r requirements.txt": "Requirements-Datei installieren",
    "-m pip list": "installierte Python-Pakete anzeigen",
    "-m pip show": "Paketdetails anzeigen",
    "-m http.server": "einfachen HTTP-Server starten",
    "-m pytest": "pytest-Testlauf starten",
    "-m unittest": "unittest-Testlauf starten",
    "-m json.tool": "JSON formatieren und prüfen",
    "-c": "Python-Code direkt ausführen",
    "-V": "Python-Version anzeigen",
    "--version": "Python-Version anzeigen",
    "-u": "ungepufferte Ausgabe verwenden",
    "-i": "nach Skript interaktiv bleiben",
  },
  pip: {
    install: "Python-Paket installieren",
    "install <package>": "Python-Paket installieren",
    "install -r requirements.txt": "Requirements-Datei installieren",
    "install --upgrade": "Paket aktualisieren",
    list: "installierte Pakete anzeigen",
    show: "Paketdetails anzeigen",
    freeze: "installierte Versionen pinnen",
    "freeze > requirements.txt": "Requirements-Datei erzeugen",
    check: "Dependency-Konflikte prüfen",
    "cache dir": "pip-Cache-Pfad anzeigen",
    "cache purge": "pip-Cache leeren",
    "-r": "Requirements-Datei verwenden",
    "--user": "ins Benutzerprofil installieren",
    "--upgrade": "Paket aktualisieren",
    "--editable": "lokales Paket editierbar installieren",
    "--break-system-packages": "System-Python-Schutz bewusst übergehen",
    "--no-cache-dir": "Cache nicht verwenden",
    "--index-url": "Paketindex setzen",
    "--extra-index-url": "zusätzlichen Paketindex setzen",
  },
  make: {
    build: "Build-Target ausführen",
    test: "Test-Target ausführen",
    install: "Install-Target ausführen",
    clean: "Clean-Target ausführen",
    lint: "Lint-Target ausführen",
    run: "Run-Target ausführen",
    help: "verfügbare Make-Targets anzeigen",
    "-j": "parallele Jobs setzen",
    "-C": "vorher in Verzeichnis wechseln",
    "-f": "Makefile-Datei auswählen",
    "-n": "Befehle nur anzeigen",
    "--dry-run": "Befehle nur anzeigen",
    "-B": "Targets immer neu bauen",
    "--always-make": "Targets immer neu bauen",
    "-k": "nach Fehlern weitere unabhängige Targets versuchen",
    "--keep-going": "nach Fehlern weitere unabhängige Targets versuchen",
  },
  kubectl: {
    get: "Kubernetes-Ressourcen auflisten",
    "get pods": "Pods im aktuellen Namespace anzeigen",
    "get pods -A": "Pods in allen Namespaces anzeigen",
    "get services": "Services im aktuellen Namespace anzeigen",
    "get deployments": "Deployments im aktuellen Namespace anzeigen",
    "get namespaces": "Namespaces anzeigen",
    "get nodes": "Cluster-Nodes anzeigen",
    "get ingress": "Ingress-Ressourcen anzeigen",
    "get configmaps": "ConfigMaps anzeigen",
    "get secrets": "Secrets anzeigen",
    describe: "Details zu einer Ressource anzeigen",
    "describe pod": "Pod-Events und Details anzeigen",
    "describe deployment": "Deployment-Status und Events anzeigen",
    logs: "Pod- oder Deployment-Logs anzeigen",
    "logs -f": "Logs live verfolgen",
    "logs deployment": "Logs eines Deployments anzeigen",
    exec: "Befehl in Pod ausführen",
    "exec -it": "interaktive Shell in Pod öffnen",
    "port-forward": "lokalen Port zu Service oder Pod weiterleiten",
    apply: "Manifest anwenden",
    "apply -f": "Manifest-Datei oder Verzeichnis anwenden",
    diff: "Manifest gegen Cluster-Zustand vergleichen",
    "diff -f": "Manifest-Datei gegen Cluster vergleichen",
    "rollout status": "Rollout-Fortschritt beobachten",
    "rollout restart": "Deployment neu ausrollen",
    top: "Ressourcenverbrauch anzeigen",
    "top pods": "Pod-Ressourcenverbrauch anzeigen",
    "top nodes": "Node-Ressourcenverbrauch anzeigen",
    "config get-contexts": "Kubeconfig-Kontexte auflisten",
    "config current-context": "aktuellen Kubeconfig-Kontext anzeigen",
    "config use-context": "Kubeconfig-Kontext wechseln",
    "api-resources": "verfügbare Kubernetes-Ressourcentypen anzeigen",
    version: "Client- und Server-Version anzeigen",
    "-n": "Namespace setzen",
    "--namespace": "Namespace setzen",
    "-A": "alle Namespaces einbeziehen",
    "--all-namespaces": "alle Namespaces einbeziehen",
    "-o": "Ausgabeformat wählen",
    "-o wide": "erweiterte Tabellenansicht ausgeben",
    "-o yaml": "Ressource als YAML ausgeben",
    "-o json": "Ressource als JSON ausgeben",
    "-w": "Änderungen live verfolgen",
    "--watch": "Änderungen live verfolgen",
    "--selector": "per Label-Selector filtern",
    "--field-selector": "per Feld-Selector filtern",
    "-k": "Kustomize-Verzeichnis auswählen",
    "--dry-run": "Änderung nur simulieren",
    "--dry-run=server": "Änderung serverseitig validieren",
    "--server-side": "serverseitiges Apply verwenden",
    "--prune": "nicht mehr definierte Objekte entfernen",
    "--tail": "Anzahl der letzten Logzeilen begrenzen",
    "--since": "Logs ab relativer Zeit anzeigen",
    "--follow": "Logs live verfolgen",
    "-c": "Container im Pod auswählen",
    "--container": "Container im Pod auswählen",
    "--previous": "Logs des vorherigen Container-Laufs anzeigen",
    "--context": "Kubeconfig-Kontext setzen",
    "--kubeconfig": "Kubeconfig-Datei setzen",
  },
  helm: {
    list: "Releases im Namespace auflisten",
    "list -A": "Releases in allen Namespaces auflisten",
    status: "Release-Status anzeigen",
    history: "Release-Historie anzeigen",
    install: "Release aus Chart installieren",
    upgrade: "Release auf neue Chart-Version aktualisieren",
    "upgrade --install": "Release aktualisieren oder installieren",
    rollback: "Release auf frühere Revision zurücksetzen",
    uninstall: "Release entfernen",
    repo: "Helm-Repositorys verwalten",
    "repo add": "Chart-Repository hinzufügen",
    "repo update": "Chart-Repository-Index aktualisieren",
    "repo list": "konfigurierte Chart-Repositorys anzeigen",
    "search repo": "Charts in Repositorys suchen",
    "show values": "Standardwerte eines Charts anzeigen",
    "dependency update": "Chart-Abhängigkeiten herunterladen",
    template: "Chart lokal rendern",
    lint: "Chart auf Fehler prüfen",
    "-n": "Namespace setzen",
    "--namespace": "Namespace setzen",
    "-A": "alle Namespaces einbeziehen",
    "--all-namespaces": "alle Namespaces einbeziehen",
    "-f": "Values-Datei verwenden",
    "--values": "Values-Datei verwenden",
    "--set": "Chart-Wert direkt setzen",
    "--dry-run": "Release nur simulieren",
    "--debug": "Debug-Ausgabe aktivieren",
    "--wait": "auf fertige Kubernetes-Ressourcen warten",
    "--atomic": "bei Fehler automatisch zurückrollen",
    "--create-namespace": "Namespace bei Bedarf erstellen",
    "--kube-context": "Kubeconfig-Kontext setzen",
    "--kubeconfig": "Kubeconfig-Datei setzen",
    "--deployed": "nur deployte Releases anzeigen",
    "--failed": "nur fehlgeschlagene Releases anzeigen",
    "--pending": "nur wartende Releases anzeigen",
    "--output": "Ausgabeformat wählen",
    "--show-resources": "zugehörige Kubernetes-Ressourcen anzeigen",
    "--max": "Anzahl Historieneinträge begrenzen",
    "--keep-history": "Release-Historie beim Entfernen behalten",
    "--strict": "Lint-Warnungen als Fehler behandeln",
    "--versions": "alle Chart-Versionen anzeigen",
    "--devel": "auch Entwicklungs-Versionen anzeigen",
  },
  terraform: {
    init: "Arbeitsverzeichnis und Provider initialisieren",
    "init -upgrade": "Provider und Module beim Initialisieren aktualisieren",
    plan: "geplante Infrastrukturänderungen anzeigen",
    "plan -out": "Plan in Datei speichern",
    "plan -out tfplan": "Plan in tfplan-Datei speichern",
    apply: "Terraform-Plan oder Änderungen anwenden",
    "apply tfplan": "gespeicherten Plan anwenden",
    validate: "Konfiguration syntaktisch und semantisch prüfen",
    fmt: "Terraform-Dateien formatieren",
    "fmt -check": "Formatierung prüfen, ohne Dateien zu ändern",
    output: "Terraform-Outputs anzeigen",
    "output -json": "Outputs als JSON ausgeben",
    show: "State oder Plan menschenlesbar anzeigen",
    "show -json": "State oder Plan als JSON ausgeben",
    state: "Terraform-State untersuchen",
    "state list": "Ressourcen im State auflisten",
    "state show": "Ressource aus dem State anzeigen",
    workspace: "Terraform-Workspaces verwalten",
    "workspace list": "Workspaces auflisten",
    "workspace show": "aktuellen Workspace anzeigen",
    "workspace select": "Workspace wechseln",
    providers: "benötigte Provider anzeigen",
    version: "Terraform-Version anzeigen",
    "-chdir": "vor Ausführung in Verzeichnis wechseln",
    "-help": "Hilfe anzeigen",
    "-version": "Version anzeigen",
    "-no-color": "ANSI-Farben deaktivieren",
    "-input=false": "interaktive Eingaben deaktivieren",
    "-lock=false": "State-Locking deaktivieren",
    "-lock-timeout": "Timeout für State-Lock setzen",
    "-out": "Plan-Datei schreiben",
    "-var": "Variable direkt setzen",
    "-var-file": "Variablen aus Datei laden",
    "-target": "Plan oder Apply auf Adresse begrenzen",
    "-refresh=false": "State-Refresh überspringen",
    "-detailed-exitcode": "Exitcode für Plan-Änderungen differenzieren",
    "-auto-approve": "Apply ohne Rückfrage ausführen",
    "-recursive": "Unterverzeichnisse einbeziehen",
    "-diff": "Formatierungsdiff anzeigen",
    "-write=false": "Formatierung nicht schreiben",
    "-json": "JSON-Ausgabe erzeugen",
    "-raw": "Output-Wert ohne Formatierung ausgeben",
  },
  ansible: {
    "all -m ping": "Erreichbarkeit aller Hosts testen",
    "all --list-hosts": "Hosts für Pattern anzeigen",
    "web -a uptime": "uptime auf Web-Hosts ausführen",
    "all -m shell -a 'df -h'": "Shell-Modul mit df -h auf allen Hosts ausführen",
    "-i": "Inventory-Datei oder Hostliste setzen",
    "--inventory": "Inventory-Datei oder Hostliste setzen",
    "-m": "Ansible-Modul auswählen",
    "--module-name": "Ansible-Modul auswählen",
    "-a": "Modulargumente setzen",
    "--args": "Modulargumente setzen",
    "-u": "SSH-Benutzer setzen",
    "--user": "SSH-Benutzer setzen",
    "-b": "Privilege Escalation aktivieren",
    "--become": "Privilege Escalation aktivieren",
    "-K": "Become-Passwort abfragen",
    "--ask-become-pass": "Become-Passwort abfragen",
    "-l": "Host-Pattern einschränken",
    "--limit": "Host-Pattern einschränken",
    "--check": "Dry-Run ohne Änderungen ausführen",
    "--diff": "Änderungsdiff anzeigen",
    "--list-hosts": "betroffene Hosts anzeigen",
    "-v": "ausführlicher ausgeben",
    "-vvv": "sehr ausführliche Debug-Ausgabe",
  },
  "ansible-playbook": {
    "site.yml": "Playbook site.yml ausführen",
    "site.yml --check": "Playbook als Dry-Run prüfen",
    "site.yml --diff": "Playbook mit Änderungsdiff prüfen",
    "site.yml --syntax-check": "Playbook-Syntax prüfen",
    "site.yml -i inventory.ini": "Playbook mit Inventory ausführen",
    "site.yml --limit web": "Playbook auf Hostgruppe begrenzen",
    "-i": "Inventory-Datei setzen",
    "--inventory": "Inventory-Datei setzen",
    "-u": "SSH-Benutzer setzen",
    "--user": "SSH-Benutzer setzen",
    "-b": "Privilege Escalation aktivieren",
    "--become": "Privilege Escalation aktivieren",
    "-K": "Become-Passwort abfragen",
    "--ask-become-pass": "Become-Passwort abfragen",
    "-l": "Host-Pattern einschränken",
    "--limit": "Host-Pattern einschränken",
    "-t": "Tags auswählen",
    "--tags": "Tags auswählen",
    "--skip-tags": "Tags überspringen",
    "--check": "Dry-Run ohne Änderungen ausführen",
    "--diff": "Änderungsdiff anzeigen",
    "--syntax-check": "Playbook-Syntax prüfen",
    "--list-hosts": "betroffene Hosts anzeigen",
    "--list-tasks": "Tasks anzeigen, ohne sie auszuführen",
    "--list-tags": "Tags anzeigen, ohne Tasks auszuführen",
    "--start-at-task": "bei bestimmtem Task starten",
    "-e": "Extra-Variablen setzen",
    "--extra-vars": "Extra-Variablen setzen",
    "-v": "ausführlicher ausgeben",
    "-vvv": "sehr ausführliche Debug-Ausgabe",
  },
  "ansible-inventory": {
    "--list": "Inventory als JSON-Struktur ausgeben",
    "--graph": "Inventory-Gruppen als Baum anzeigen",
    "--host": "Variablen für Host anzeigen",
    "--yaml": "Inventory als YAML ausgeben",
    "--toml": "Inventory als TOML ausgeben",
    "--vars": "Variablen im Graph anzeigen",
    "--export": "Inventory für Export statt Runtime optimieren",
    "-i": "Inventory-Datei oder Quelle setzen",
    "--inventory": "Inventory-Datei oder Quelle setzen",
    "-v": "ausführlicher ausgeben",
  },
  aws: {
    sts: "AWS-Identität prüfen",
    "sts get-caller-identity": "aktiven AWS-Account und Benutzer anzeigen",
    configure: "AWS-CLI-Konfiguration verwalten",
    "configure list": "wirksame AWS-Konfiguration anzeigen",
    "configure sso": "AWS SSO Profil einrichten",
    s3: "S3-Buckets und Objekte verwalten",
    "s3 ls": "S3-Buckets oder Prefixe auflisten",
    "s3 cp": "Datei zu oder von S3 kopieren",
    "s3 sync": "Verzeichnis mit S3 synchronisieren",
    ec2: "EC2-Ressourcen abfragen",
    "ec2 describe-instances": "EC2-Instanzen anzeigen",
    "ec2 describe-security-groups": "Security Groups anzeigen",
    "ec2 describe-volumes": "EBS-Volumes anzeigen",
    "ec2 describe-vpcs": "VPCs anzeigen",
    logs: "CloudWatch Logs abfragen",
    "logs tail": "CloudWatch-Loggruppe verfolgen",
    "logs describe-log-groups": "CloudWatch-Loggruppen auflisten",
    eks: "EKS-Cluster verwalten",
    "eks list-clusters": "EKS-Cluster auflisten",
    "eks update-kubeconfig": "Kubeconfig für EKS-Cluster aktualisieren",
    "eks update-kubeconfig --name": "Kubeconfig für EKS-Cluster aktualisieren",
    "eks update-kubeconfig --name <cluster>": "Kubeconfig für EKS-Cluster aktualisieren",
    "eks update-kubeconfig --name cluster": "Kubeconfig für EKS-Cluster aktualisieren",
    ecr: "ECR-Registry verwenden",
    "ecr get-login-password": "ECR Login-Passwort ausgeben",
    iam: "IAM-Identitäten abfragen",
    "iam get-user": "aktuellen IAM-Benutzer anzeigen",
    "iam list-roles": "IAM-Rollen auflisten",
    lambda: "Lambda-Funktionen abfragen",
    "lambda list-functions": "Lambda-Funktionen auflisten",
    "lambda get-function": "Lambda-Funktion anzeigen",
    cloudformation: "CloudFormation-Stacks abfragen",
    "cloudformation describe-stacks": "CloudFormation-Stackdetails anzeigen",
    "cloudformation list-stacks": "CloudFormation-Stacks auflisten",
    "--profile": "AWS-Profil auswählen",
    "--region": "AWS-Region setzen",
    "--output": "Ausgabeformat wählen",
    "--query": "JMESPath-Abfrage anwenden",
    "--no-cli-pager": "Pager deaktivieren",
    "--endpoint-url": "alternativen Service-Endpunkt setzen",
    "--recursive": "S3-Prefix rekursiv durchlaufen",
    "--human-readable": "S3-Größen menschenlesbar anzeigen",
    "--summarize": "S3-Summe am Ende ausgeben",
    "--dryrun": "S3-Änderungen nur simulieren",
    "--exclude": "S3-Muster ausschließen",
    "--include": "S3-Muster einbeziehen",
    "--exact-timestamps": "Zeitstempel beim Sync exakt vergleichen",
    "--filters": "AWS-Filter setzen",
    "--follow": "Logs live verfolgen",
    "--since": "Logs ab relativer Zeit anzeigen",
    "--filter-pattern": "CloudWatch-Logs filtern",
    "--name": "Ressourcenname setzen",
    "--alias": "Kubeconfig-Kontextalias setzen",
    "--stack-name": "CloudFormation-Stack auswählen",
  },
  gcloud: {
    auth: "Google-Cloud-Authentifizierung verwalten",
    "auth list": "aktive Google-Cloud-Konten anzeigen",
    "auth login": "interaktive Anmeldung starten",
    "auth application-default login": "Application-Default-Credentials einrichten",
    config: "gcloud-Konfiguration verwalten",
    "config list": "aktive gcloud-Konfiguration anzeigen",
    "config set project": "Standardprojekt setzen",
    projects: "Google-Cloud-Projekte abfragen",
    "projects list": "Projekte auflisten",
    compute: "Compute-Engine-Ressourcen abfragen",
    "compute instances list": "Compute-Instanzen auflisten",
    "compute ssh": "SSH zu Compute-Instanz öffnen",
    "compute scp": "Dateien zu oder von Compute-Instanz kopieren",
    "compute zones list": "Compute-Zonen auflisten",
    container: "GKE-Cluster und Container-Ressourcen abfragen",
    "container clusters list": "GKE-Cluster auflisten",
    "container clusters get-credentials": "Kubeconfig für GKE-Cluster aktualisieren",
    "container clusters get-credentials cluster": "Kubeconfig für GKE-Cluster aktualisieren",
    "container images list": "Container-Images auflisten",
    logging: "Cloud Logging abfragen",
    "logging read": "Logeinträge lesen",
    "logging read 'severity>=ERROR' --limit 50": "Fehlerlogs mit Limit lesen",
    "logging tail": "Logeinträge live verfolgen",
    services: "Google-Cloud-Services abfragen",
    "services list": "aktivierte Services auflisten",
    iam: "IAM-Ressourcen abfragen",
    "iam service-accounts list": "Service Accounts auflisten",
    version: "gcloud-Version anzeigen",
    "--project": "Google-Cloud-Projekt setzen",
    "--account": "Google-Cloud-Konto setzen",
    "--configuration": "gcloud-Konfiguration wählen",
    "--format": "Ausgabeformat wählen",
    "--filter": "Ausgabe filtern",
    "--limit": "Anzahl Ergebnisse begrenzen",
    "--quiet": "Rückfragen unterdrücken",
    "--verbosity": "Log-Level setzen",
    "--zones": "Compute-Zonen filtern",
    "--zone": "Compute-Zone setzen",
    "--region": "Region setzen",
    "--tunnel-through-iap": "SSH über Identity-Aware Proxy tunneln",
    "--freshness": "Logging-Zeitfenster setzen",
    "--buffer-window": "Logging-Tail-Puffer setzen",
  },
  az: {
    account: "Azure-Konto und Subscription verwalten",
    "account show": "aktive Azure-Subscription anzeigen",
    "account list": "Azure-Subscriptions auflisten",
    "account list -o table": "Azure-Subscriptions als Tabelle auflisten",
    "account set": "aktive Subscription setzen",
    group: "Resource Groups abfragen",
    "group list": "Resource Groups auflisten",
    "group list -o table": "Resource Groups als Tabelle auflisten",
    "group show": "Resource Group anzeigen",
    vm: "Azure-VMs abfragen",
    "vm list": "Azure-VMs auflisten",
    "vm list -o table": "Azure-VMs als Tabelle auflisten",
    "vm show": "Azure-VM anzeigen",
    "vm list-ip-addresses": "VM-IP-Adressen anzeigen",
    aks: "AKS-Cluster abfragen",
    "aks list": "AKS-Cluster auflisten",
    "aks get-credentials": "Kubeconfig für AKS-Cluster aktualisieren",
    "aks get-credentials --resource-group <group> --name <cluster>": "Kubeconfig für AKS-Cluster aktualisieren",
    "aks get-credentials --resource-group rg --name cluster": "Kubeconfig für AKS-Cluster aktualisieren",
    acr: "Azure Container Registry abfragen",
    "acr list": "Container Registries auflisten",
    "acr login": "bei Container Registry anmelden",
    storage: "Azure Storage abfragen",
    "storage account list": "Storage Accounts auflisten",
    webapp: "Azure Web Apps abfragen",
    "webapp list": "Web Apps auflisten",
    "webapp log tail": "Web-App-Logs live verfolgen",
    "webapp log tail --name <app> --resource-group <group>": "Web-App-Logs live verfolgen",
    "webapp log tail --name app --resource-group rg": "Web-App-Logs live verfolgen",
    role: "Azure-Rollen und Zuweisungen abfragen",
    "role assignment list": "Rollenzuweisungen auflisten",
    version: "Azure-CLI-Version anzeigen",
    "--subscription": "Subscription setzen",
    "--output": "Ausgabeformat wählen",
    "-o": "Ausgabeformat wählen",
    "--query": "JMESPath-Abfrage anwenden",
    "--only-show-errors": "nur Fehler ausgeben",
    "--name": "Ressourcenname setzen",
    "--resource-group": "Resource Group setzen",
    "--show-details": "zusätzliche VM-Details anzeigen",
    "--admin": "Admin-Kubeconfig abrufen",
    "--overwrite-existing": "bestehenden Kubeconfig-Kontext überschreiben",
    "--assignee": "Principal für Rollenzuweisung filtern",
    "--scope": "Scope für Rollenzuweisung setzen",
  },
  psql: {
    "-h": "PostgreSQL-Host setzen",
    "--host": "PostgreSQL-Host setzen",
    "-p": "PostgreSQL-Port setzen",
    "--port": "PostgreSQL-Port setzen",
    "-U": "PostgreSQL-Benutzer setzen",
    "--username": "PostgreSQL-Benutzer setzen",
    "-d": "Datenbank auswählen",
    "--dbname": "Datenbank auswählen",
    "-c": "SQL- oder psql-Kommando ausführen",
    "--command": "SQL- oder psql-Kommando ausführen",
    "-f": "SQL-Datei ausführen",
    "--file": "SQL-Datei ausführen",
    "-l": "Datenbanken auflisten",
    "--list": "Datenbanken auflisten",
    "-A": "unalignierte Ausgabe verwenden",
    "--no-align": "unalignierte Ausgabe verwenden",
    "-t": "nur Tupel ohne Header ausgeben",
    "--tuples-only": "nur Tupel ohne Header ausgeben",
    "-v": "psql-Variable setzen",
    "--set": "psql-Variable setzen",
    "\\dt": "Tabellen auflisten",
    "\\d": "Relation oder Tabelle beschreiben",
    "\\l": "Datenbanken auflisten",
    "\\conninfo": "aktuelle Verbindung anzeigen",
    "-h localhost -U postgres -d app": "als postgres mit Datenbank app verbinden",
    "-d app -c '\\dt'": "Tabellen in Datenbank app auflisten",
    "-d app -f migration.sql": "SQL-Datei gegen Datenbank app ausführen",
    "postgres://user@host:5432/db": "per Connection-URL verbinden",
  },
  pg_dump: {
    "-h": "PostgreSQL-Host setzen",
    "-p": "PostgreSQL-Port setzen",
    "-U": "PostgreSQL-Benutzer setzen",
    "-d": "Datenbank auswählen",
    "-f": "Dump-Datei schreiben",
    "-F": "Dump-Format wählen",
    "-Fc": "Custom-Format-Dump erzeugen",
    "--format": "Dump-Format wählen",
    "--schema-only": "nur Schema sichern",
    "--data-only": "nur Daten sichern",
    "--no-owner": "Owner-Informationen auslassen",
    "--no-acl": "Rechteinformationen auslassen",
    "-v": "ausführlicher ausgeben",
    "--verbose": "ausführlicher ausgeben",
  },
  pg_restore: {
    "-l": "Inhaltsverzeichnis des Dumps anzeigen",
    "--list": "Inhaltsverzeichnis des Dumps anzeigen",
    "-d": "Zieldatenbank auswählen",
    "--dbname": "Zieldatenbank auswählen",
    "-h": "PostgreSQL-Host setzen",
    "-p": "PostgreSQL-Port setzen",
    "-U": "PostgreSQL-Benutzer setzen",
    "-j": "parallele Restore-Jobs setzen",
    "--jobs": "parallele Restore-Jobs setzen",
    "--schema-only": "nur Schema wiederherstellen",
    "--data-only": "nur Daten wiederherstellen",
    "--no-owner": "Owner-Änderungen auslassen",
    "--no-acl": "Rechteänderungen auslassen",
    "-v": "ausführlicher ausgeben",
    "--verbose": "ausführlicher ausgeben",
  },
  mysql: {
    "-h": "MySQL-Host setzen",
    "--host": "MySQL-Host setzen",
    "-P": "MySQL-Port setzen",
    "--port": "MySQL-Port setzen",
    "-u": "MySQL-Benutzer setzen",
    "--user": "MySQL-Benutzer setzen",
    "-p": "Passwort abfragen",
    "--password": "Passwort abfragen",
    "-D": "Datenbank auswählen",
    "--database": "Datenbank auswählen",
    "-e": "SQL-Statement ausführen",
    "--execute": "SQL-Statement ausführen",
    "SHOW DATABASES": "Datenbanken auflisten",
    "-e 'SHOW DATABASES;'": "Datenbanken auflisten",
    "-h localhost -u root -p": "als root zu lokalem MySQL verbinden",
    "-u app -p appdb": "als app-Benutzer zur Datenbank appdb verbinden",
    "-u root -p": "als root mit Passwortabfrage verbinden",
    "--ssl-mode": "TLS-Modus setzen",
    "--batch": "Batch-Ausgabe verwenden",
    "--table": "Tabellenausgabe verwenden",
    "--default-character-set": "Zeichensatz setzen",
  },
  mysqldump: {
    "-h": "MySQL-Host setzen",
    "--host": "MySQL-Host setzen",
    "-P": "MySQL-Port setzen",
    "--port": "MySQL-Port setzen",
    "-u": "MySQL-Benutzer setzen",
    "--user": "MySQL-Benutzer setzen",
    "-p": "Passwort abfragen",
    "--password": "Passwort abfragen",
    "--databases": "mehrere Datenbanken sichern",
    "--single-transaction": "konsistenten InnoDB-Dump ohne Lock erzeugen",
    "--routines": "Stored Procedures und Functions mitsichern",
    "--triggers": "Trigger mitsichern",
    "--events": "Events mitsichern",
    "--no-data": "nur Schema sichern",
    "--quick": "Zeilen streamen statt puffern",
    "--default-character-set": "Zeichensatz setzen",
  },
  sqlite3: {
    "app.db": "SQLite-Datenbankdatei öffnen",
    "app.db '.tables'": "Tabellen in app.db auflisten",
    "app.db '.schema users'": "Schema der Tabelle users anzeigen",
    "app.db '.dump'": "app.db als SQL dumpen",
    "app.db 'select count(*) from users;'": "Anzahl Datensätze in users zählen",
    "-readonly": "Datenbank nur lesend öffnen",
    "-header": "Spaltenüberschriften anzeigen",
    "-column": "Spaltenausgabe verwenden",
    "-csv": "CSV-Ausgabe verwenden",
    "-json": "JSON-Ausgabe verwenden",
    "-line": "eine Spalte je Zeile ausgeben",
    "-cmd": "Kommando vor dem Öffnen ausführen",
    ".tables": "Tabellen auflisten",
    ".schema": "Schema anzeigen",
    ".indexes": "Indizes auflisten",
    ".dump": "Datenbank als SQL dumpen",
    ".backup": "Datenbank in Datei sichern",
  },
  "redis-cli": {
    ping: "Redis-Verbindung testen",
    info: "Redis-Serverinformationen anzeigen",
    dbsize: "Anzahl Keys in aktueller DB anzeigen",
    monitor: "Redis-Kommandos live beobachten",
    "slowlog get": "langsame Redis-Kommandos anzeigen",
    "-h localhost -p 6379": "zu lokalem Redis auf Port 6379 verbinden",
    "-h": "Redis-Host setzen",
    "--host": "Redis-Host setzen",
    "-p": "Redis-Port setzen",
    "--port": "Redis-Port setzen",
    "-a": "Redis-Passwort setzen",
    "--pass": "Redis-Passwort setzen",
    "-n": "Redis-Datenbanknummer auswählen",
    "--raw": "rohe Ausgabe verwenden",
    "--scan": "Keys per SCAN iterieren",
    "--pattern": "SCAN-Muster setzen",
    "--tls": "TLS-Verbindung verwenden",
  },
  mongosh: {
    "mongodb://localhost:27017/app": "MongoDB-Verbindung per URI öffnen",
    "--eval 'db.runCommand({ ping: 1 })'": "MongoDB-Ping per JavaScript ausführen",
    "--host localhost --port 27017": "zu lokalem MongoDB-Server verbinden",
    "--host": "MongoDB-Host setzen",
    "--port": "MongoDB-Port setzen",
    "-u": "MongoDB-Benutzer setzen",
    "--username": "MongoDB-Benutzer setzen",
    "-p": "MongoDB-Passwort setzen",
    "--password": "MongoDB-Passwort setzen",
    "--authenticationDatabase": "Auth-Datenbank setzen",
    "--eval": "JavaScript-Ausdruck ausführen",
    "--file": "JavaScript-Datei ausführen",
    "--quiet": "Startmeldungen ausblenden",
    "--norc": "mongosh-Startdatei nicht laden",
    "--tls": "TLS-Verbindung verwenden",
  },
  crontab: {
    "-l": "Cronjobs auflisten",
    "-e": "Cronjobs im Editor bearbeiten",
    "-i": "vor dem Entfernen nachfragen",
    "-r": "Cronjobs entfernen",
    "-u": "Crontab eines Benutzers auswählen",
    "-T": "Crontab-Datei syntaktisch prüfen",
    "crontab.backup": "Crontab aus Backup-Datei installieren",
    "-l > crontab.backup": "Crontab in Datei sichern",
    "-u www-data -l": "Cronjobs von www-data auflisten",
    "-u root -e": "Root-Crontab bearbeiten",
    "-T crontab.backup": "Backup-Datei vor Installation prüfen",
    "-u root -l": "Root-Cronjobs auflisten",
    "-": "Crontab aus Standardeingabe installieren",
  },
  nginx: {
    "-t": "Nginx-Konfiguration prüfen",
    "-T": "Konfiguration prüfen und komplett ausgeben",
    "-s": "Signal an Nginx-Masterprozess senden",
    "-s reload": "Nginx-Konfiguration neu laden",
    "-s reopen": "Nginx-Logdateien neu öffnen",
    "-s quit": "Nginx sauber beenden",
    "-s stop": "Nginx sofort stoppen",
    "-c": "alternative nginx.conf verwenden",
    "-g": "globale Direktive setzen",
    "-g \"daemon off;\"": "Nginx im Vordergrund starten",
    "-p": "Prefix-Pfad für Nginx setzen",
    "-e": "Fehlerlog-Datei setzen",
    "-V": "Version und Build-Optionen anzeigen",
    "-v": "Nginx-Version anzeigen",
    "-q": "nur Fehler bei Konfigurationsprüfung anzeigen",
    "-q -t": "Konfiguration leise prüfen",
    "-c /etc/nginx/nginx.conf -t": "bestimmte nginx.conf prüfen",
  },
  apachectl: {
    configtest: "Apache-Konfiguration prüfen",
    graceful: "Apache ohne harte Verbindungsabbrüche neu laden",
    restart: "Apache neu starten",
    status: "kurzen Apache-Status anzeigen",
    fullstatus: "ausführlichen Apache-Status anzeigen",
    "-t": "Apache-Konfiguration prüfen",
    "-S": "VirtualHost-Konfiguration anzeigen",
    "-M": "geladene Apache-Module anzeigen",
    "-V": "Apache-Build-Optionen anzeigen",
    "-k": "Apache-Signal senden",
    "-k graceful": "Apache graceful neu laden",
    "-k restart": "Apache neu starten",
    "-f": "alternative httpd.conf verwenden",
  },
  certbot: {
    certificates: "installierte Zertifikate anzeigen",
    renew: "fällige Zertifikate erneuern",
    "renew --dry-run": "Zertifikatserneuerung testen",
    plugins: "verfügbare Certbot-Plugins anzeigen",
    install: "bestehendes Zertifikat installieren",
    "install --nginx": "Zertifikat in Nginx installieren",
    certonly: "Zertifikat nur beziehen, nicht installieren",
    "certonly --nginx": "Zertifikat per Nginx-Plugin beziehen",
    "certonly --nginx -d": "Zertifikat per Nginx für Domain beziehen",
    "certonly --nginx -d example.com": "Zertifikat per Nginx für example.com beziehen",
    "certonly --apache": "Zertifikat per Apache-Plugin beziehen",
    "certonly --apache -d": "Zertifikat per Apache für Domain beziehen",
    "certonly --webroot": "Zertifikat über Webroot-Challenge beziehen",
    "certonly --webroot -w": "Webroot-Pfad für Challenge setzen",
    "certonly --webroot -w /var/www/html -d example.com":
      "Zertifikat über Webroot für example.com beziehen",
    "--nginx": "Nginx-Authenticator oder Installer verwenden",
    "--apache": "Apache-Authenticator oder Installer verwenden",
    "--webroot": "Webroot-Authenticator verwenden",
    "-d": "Domain für Zertifikat setzen",
    "-w": "Webroot-Pfad setzen",
    "--email": "Kontakt-E-Mail setzen",
    "--dry-run": "Aktion nur gegen Test-Erneuerung prüfen",
    "--staging": "Let's-Encrypt-Staging-Umgebung verwenden",
    "--deploy-hook": "Hook nach erfolgreicher Erneuerung ausführen",
  },
  supervisorctl: {
    status: "Supervisor-Programme anzeigen",
    "status <program>": "Status eines Programms anzeigen",
    tail: "letzte Logzeilen eines Programms anzeigen",
    "tail <program>": "Log eines Programms anzeigen",
    "tail -f": "Programmlog live verfolgen",
    "tail -f <program>": "Programmlog live verfolgen",
    restart: "Programm neu starten",
    "restart <program>": "Programm neu starten",
    start: "Programm starten",
    "start <program>": "Programm starten",
    reread: "Supervisor-Konfiguration neu einlesen",
    update: "geänderte Supervisor-Programme übernehmen",
    "-c": "Supervisor-Konfigurationsdatei setzen",
    "-s": "Supervisor-Server-URL setzen",
    "-u": "Supervisor-Benutzer setzen",
    "-p": "Supervisor-Passwort setzen",
  },
  pm2: {
    list: "PM2-Prozesse auflisten",
    status: "PM2-Prozessstatus anzeigen",
    logs: "PM2-Logs anzeigen",
    "logs <app>": "Logs einer App anzeigen",
    "logs --lines": "Anzahl Logzeilen begrenzen",
    monit: "PM2-Monitor öffnen",
    describe: "Details einer PM2-App anzeigen",
    "describe <app>": "Details einer PM2-App anzeigen",
    start: "Datei oder Prozess mit PM2 starten",
    "start <file>": "Datei mit PM2 starten",
    "start app.js --name": "app.js mit Namen starten",
    "start app.js --name app": "app.js als PM2-App app starten",
    restart: "PM2-App neu starten",
    "restart <app>": "PM2-App neu starten",
    reload: "PM2-App ohne Downtime neu laden",
    "reload <app>": "PM2-App ohne Downtime neu laden",
    save: "aktuelle PM2-Prozessliste speichern",
    startup: "Autostart-Integration erzeugen",
    "--name": "PM2-App-Namen setzen",
    "--watch": "Dateiänderungen beobachten",
    "--time": "Zeitstempel in Logs anzeigen",
    "--lines": "Anzahl Logzeilen begrenzen",
  },
  date: {
    "-u": "Zeit in UTC anzeigen",
    "--utc": "Zeit in UTC anzeigen",
    "-R": "RFC-5322-Zeitformat ausgeben",
    "--rfc-email": "RFC-5322-Zeitformat ausgeben",
    "-I": "ISO-8601-Datum oder Zeit ausgeben",
    "--iso-8601": "ISO-8601-Datum oder Zeit ausgeben",
    "-d": "angegebenen Zeitpunkt auswerten",
    "--date": "angegebenen Zeitpunkt auswerten",
    "-r": "Zeitstempel einer Datei anzeigen",
    "--reference": "Zeitstempel einer Datei anzeigen",
    "+<format>": "Ausgabe mit Format-String steuern",
  },
  env: {
    "-i": "mit leerer Umgebung starten",
    "--ignore-environment": "mit leerer Umgebung starten",
    "-u": "Variable aus Umgebung entfernen",
    "--unset": "Variable aus Umgebung entfernen",
    "-C": "vor Ausführung in Verzeichnis wechseln",
    "--chdir": "vor Ausführung in Verzeichnis wechseln",
    "-S": "Argument-String wie Shell-Wörter aufteilen",
    "--split-string": "Argument-String wie Shell-Wörter aufteilen",
    "VAR=value": "Variable für den gestarteten Befehl setzen",
  },
  hostname: {
    "-f": "voll qualifizierten Hostnamen anzeigen",
    "--fqdn": "voll qualifizierten Hostnamen anzeigen",
    "-s": "kurzen Hostnamen ohne Domain anzeigen",
    "--short": "kurzen Hostnamen ohne Domain anzeigen",
    "-I": "alle Netzwerkadressen des Hosts anzeigen",
    "--all-ip-addresses": "alle Netzwerkadressen des Hosts anzeigen",
    "-i": "Adresse des Hostnamens anzeigen",
    "--ip-address": "Adresse des Hostnamens anzeigen",
    "-A": "alle voll qualifizierten Hostnamen anzeigen",
    "--all-fqdns": "alle voll qualifizierten Hostnamen anzeigen",
    "-d": "DNS-Domain des Hosts anzeigen",
    "--domain": "DNS-Domain des Hosts anzeigen",
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  hostnamectl: {
    status: "Hostnamen und Host-Metadaten anzeigen",
    hostname: "statischen Hostnamen anzeigen",
    "icon-name": "Icon-Namen anzeigen",
    chassis: "Chassis-Typ anzeigen",
    deployment: "Deployment-Umgebung anzeigen",
    location: "Standort-Metadatum anzeigen",
    "--json pretty status": "Hostname-Status als lesbares JSON ausgeben",
    "--no-pager status": "Hostname-Status ohne Pager anzeigen",
    "set-hostname server01": "Hostname auf server01 setzen",
    "set-hostname <hostname>": "statischen Hostnamen setzen",
    "set-icon-name <name>": "Icon-Namen setzen",
    "set-chassis <type>": "Chassis-Typ setzen",
    "set-deployment <environment>": "Deployment-Umgebung setzen",
    "set-location <location>": "Standort-Metadatum setzen",
    "--static": "statischen Hostnamen verwenden",
    "--transient": "transienten Hostnamen verwenden",
    "--pretty": "Pretty-Hostname verwenden",
    "--no-pager": "ohne Pager ausgeben",
    "--json": "Ausgabe als JSON erzeugen",
    "--no-ask-password": "nicht interaktiv nach Passwort fragen",
    "-H": "Remote-Host per SSH ansprechen",
    "--host": "Remote-Host per SSH ansprechen",
    "-M": "lokale Maschine ansprechen",
    "--machine": "lokale Maschine ansprechen",
  },
  id: {
    "-u": "nur User-ID anzeigen",
    "--user": "nur User-ID anzeigen",
    "-g": "nur primäre Gruppen-ID anzeigen",
    "--group": "nur primäre Gruppen-ID anzeigen",
    "-G": "alle Gruppen-IDs anzeigen",
    "--groups": "alle Gruppen-IDs anzeigen",
    "-n": "Namen statt numerischer IDs anzeigen",
    "--name": "Namen statt numerischer IDs anzeigen",
    "-r": "reale statt effektive IDs anzeigen",
    "--real": "reale statt effektive IDs anzeigen",
    "-z": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--zero": "Ausgabe mit NUL statt Zeilenumbruch trennen",
  },
  ip: {
    address: "IP-Adressen und Interface-Adressen anzeigen",
    addr: "IP-Adressen und Interface-Adressen anzeigen",
    a: "Kurzform für IP-Adressen anzeigen",
    link: "Netzwerkinterfaces und Link-Status anzeigen",
    l: "Kurzform für Netzwerkinterfaces anzeigen",
    route: "Routing-Tabelle anzeigen oder ändern",
    r: "Kurzform für Routing-Tabelle anzeigen",
    neighbor: "ARP-/Neighbor-Einträge anzeigen",
    neigh: "ARP-/Neighbor-Einträge anzeigen",
    n: "Kurzform für Neighbor-Einträge anzeigen",
    rule: "Policy-Routing-Regeln anzeigen",
    tunnel: "IP-Tunnel anzeigen oder verwalten",
    monitor: "Netzwerkänderungen live verfolgen",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
    "-br": "kompakte Ausgabe anzeigen",
    "-json": "Ausgabe als JSON erzeugen",
  },
  ipcalc: {
    "-n": "Netzadresse aus Adresse und Prefix berechnen",
    "--network": "Netzadresse aus Adresse und Prefix berechnen",
    "-b": "Broadcast-Adresse berechnen",
    "--broadcast": "Broadcast-Adresse berechnen",
    "-m": "Netzmaske anzeigen",
    "--netmask": "Netzmaske anzeigen",
    "-p": "Prefix-Länge anzeigen",
    "--prefix": "Prefix-Länge anzeigen",
    "-s": "Subnetze nach gewünschter Hostanzahl aufteilen",
    "--split": "Subnetze nach gewünschter Hostanzahl aufteilen",
  },
  iostat: {
    "-xz 1": "erweiterte I/O-Statistiken jede Sekunde anzeigen",
    "-p ALL": "Statistiken fuer alle Partitionen anzeigen",
    "-m 1 5": "Werte in MiB, fuenf Messungen anzeigen",
    "-d sda 1": "Disk-Statistiken fuer sda jede Sekunde anzeigen",
    "-c 1": "CPU-Statistiken jede Sekunde anzeigen",
    "-h": "menschenlesbare Werte anzeigen",
    "-y 1": "erste Statistik seit Boot ueberspringen",
    "-x": "erweiterte I/O-Statistiken anzeigen",
    "--extended": "erweiterte I/O-Statistiken anzeigen",
    "-z": "Geraete ohne Aktivitaet ausblenden",
    "--omit": "Geraete ohne Aktivitaet ausblenden",
    "-d": "nur Geraeteauslastung anzeigen",
    "--device": "nur Geraeteauslastung anzeigen",
    "-p": "Partitionen fuer Geraet anzeigen",
    "-m": "Werte in MiB anzeigen",
    "--megabytes": "Werte in MiB anzeigen",
    "-c": "nur CPU-Auslastung anzeigen",
    "--compact": "kompaktere Ausgabe verwenden",
    "--human": "menschenlesbare Werte anzeigen",
    "-k": "Werte in KiB anzeigen",
    "--kilobytes": "Werte in KiB anzeigen",
    "-N": "Device-Mapper-Namen anzeigen",
    "--device-name": "Device-Mapper-Namen anzeigen",
    "-t": "Zeitstempel anzeigen",
    "--timestamp": "Zeitstempel anzeigen",
    "-y": "erste Statistik seit Boot ueberspringen",
    "--skip-first": "erste Statistik seit Boot ueberspringen",
  },
  iotop: {
    "-o": "nur Prozesse mit aktueller I/O-Aktivität anzeigen",
    "--only": "nur Prozesse mit aktueller I/O-Aktivität anzeigen",
    "-P": "nach Prozessen statt Threads gruppieren",
    "--processes": "nach Prozessen statt Threads gruppieren",
    "-a": "I/O über die Laufzeit aufsummieren",
    "--accumulated": "I/O über die Laufzeit aufsummieren",
    "-b": "Batch-Ausgabe für Logs oder Skripte verwenden",
    "--batch": "Batch-Ausgabe für Logs oder Skripte verwenden",
    "-n": "Anzahl der Aktualisierungen begrenzen",
    "-d": "Aktualisierungsintervall in Sekunden setzen",
    "-u": "auf einen Benutzer filtern",
    "-k": "Werte in KiB anzeigen",
    "--kilobytes": "Werte in KiB anzeigen",
  },
  ncdu: {
    "-x": "auf einem Dateisystem bleiben",
    "--one-file-system": "auf einem Dateisystem bleiben",
    "-q": "ruhigere Ausgabe beim Scannen",
    "--quiet": "ruhigere Ausgabe beim Scannen",
    "-r": "nur lesend öffnen",
    "--read-only": "nur lesend öffnen",
    "-o": "Scan-Ergebnis in Datei schreiben",
    "--output": "Scan-Ergebnis in Datei schreiben",
    "-f": "Scan-Ergebnis aus Datei laden",
    "--file": "Scan-Ergebnis aus Datei laden",
    "--exclude": "Pfade per Muster ausschließen",
  },
  modinfo: {
    overlay: "Informationen zum Modul overlay anzeigen",
    "-F filename overlay": "Dateipfad des Moduls overlay anzeigen",
    "-p module_name": "Parameter eines Moduls anzeigen",
    "-d overlay": "Beschreibung des Moduls overlay anzeigen",
    "-n overlay": "Dateiname des Moduls overlay anzeigen",
    "-a overlay": "Autor des Moduls overlay anzeigen",
    "-l overlay": "Lizenz des Moduls overlay anzeigen",
    "--field vermagic overlay": "vermagic-Feld eines Moduls anzeigen",
    "-F": "bestimmtes Modinfo-Feld ausgeben",
    "--field": "bestimmtes Modinfo-Feld ausgeben",
    "-p": "Modulparameter anzeigen",
    "--parameters": "Modulparameter anzeigen",
    "-n": "Moduldateiname anzeigen",
    "--filename": "Moduldateiname anzeigen",
    "-d": "Modulbeschreibung anzeigen",
    "--description": "Modulbeschreibung anzeigen",
    "-a": "Modulautor anzeigen",
    "--author": "Modulautor anzeigen",
    "-l": "Modullizenz anzeigen",
    "--license": "Modullizenz anzeigen",
    "-V": "Version anzeigen",
    "--version": "Version anzeigen",
  },
  mtr: {
    "example.com": "Route und Paketverlust zu example.com live messen",
    "-rw -c 100 example.com": "100-Hop-Messungen als breiten Report ausgeben",
    "-T -P 443 example.com": "TCP-Messung zu Port 443 ausfuehren",
    "-n 8.8.8.8": "Route numerisch ohne DNS-Aufloesung messen",
    "-6 example.com": "IPv6-Route messen",
    "-u -P 53 example.com": "UDP-Messung zu Port 53 ausfuehren",
    "--json example.com": "MTR-Ergebnis als JSON ausgeben",
    "--csv example.com": "MTR-Ergebnis als CSV ausgeben",
    "--report-cycles 20 example.com": "20 Messzyklen im Report verwenden",
    "-r": "Report-Modus verwenden",
    "--report": "Report-Modus verwenden",
    "-w": "breiten Report ausgeben",
    "--report-wide": "breiten Report ausgeben",
    "-c": "Anzahl Messzyklen setzen",
    "--report-cycles": "Anzahl Messzyklen setzen",
    "-n": "DNS-Aufloesung deaktivieren",
    "--no-dns": "DNS-Aufloesung deaktivieren",
    "-T": "TCP statt ICMP verwenden",
    "--tcp": "TCP statt ICMP verwenden",
    "-u": "UDP statt ICMP verwenden",
    "--udp": "UDP statt ICMP verwenden",
    "-P": "Zielport setzen",
    "--port": "Zielport setzen",
    "--json": "Ausgabe als JSON erzeugen",
    "--csv": "Ausgabe als CSV erzeugen",
  },
  nload: {
    eth0: "Durchsatz fuer eth0 anzeigen",
    wlan0: "Durchsatz fuer wlan0 anzeigen",
    "-u M -t 500 eth0": "eth0 in MBit/s mit 500-ms-Refresh anzeigen",
    "-U M eth0": "Datenmengen fuer eth0 in MByte anzeigen",
    "-a 30 eth0": "30-Sekunden-Durchschnitt fuer eth0 anzeigen",
    "-i 10000 -o 10000 eth0": "Skala fuer eth0 auf 10 MBit/s setzen",
    "-h": "Hilfe anzeigen",
    "--help": "Hilfe anzeigen",
    "-v": "Version anzeigen",
    "--version": "Version anzeigen",
    "-m": "mehrere Interfaces gleichzeitig anzeigen",
    "-u": "Einheit für aktuellen Durchsatz setzen",
    "-U": "Einheit für Datenmenge setzen",
    "-t": "Aktualisierungsintervall setzen",
    "-a": "Durchschnittsfenster setzen",
    "-i": "eingehende Maximalrate für Skala setzen",
    "-o": "ausgehende Maximalrate für Skala setzen",
  },
  printenv: {
    PATH: "PATH-Variable anzeigen",
    HOME: "Home-Verzeichnisvariable anzeigen",
    SHELL: "Login-Shell-Variable anzeigen",
    USER: "Benutzername aus Umgebung anzeigen",
    LANG: "Locale-Variable anzeigen",
    "HOME SHELL": "mehrere Umgebungsvariablen anzeigen",
    "| sort": "Umgebung sortiert anzeigen",
    "| grep PATH": "Umgebung nach PATH filtern",
    "-0": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--null": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  groups: {
    "$USER": "Gruppen des aktuellen Benutzers anzeigen",
    username: "Gruppen dieses Benutzers anzeigen",
    "www-data": "Gruppen des Webserver-Benutzers anzeigen",
    deploy: "Gruppen des Deploy-Benutzers anzeigen",
    docker: "Gruppen des Docker-Benutzers anzeigen",
    root: "Gruppen des Root-Benutzers anzeigen",
    git: "Gruppen des Git-Benutzers anzeigen",
    nginx: "Gruppen des Nginx-Benutzers anzeigen",
    apache: "Gruppen des Apache-Benutzers anzeigen",
    postgres: "Gruppen des PostgreSQL-Benutzers anzeigen",
    mysql: "Gruppen des MySQL-Benutzers anzeigen",
    redis: "Gruppen des Redis-Benutzers anzeigen",
  },
  useradd: {
    "-m": "Home-Verzeichnis anlegen",
    "-m -s /bin/bash username": "Benutzer mit Home und Bash erstellen",
    "-m -G sudo username": "Benutzer mit sudo-Gruppe erstellen",
    "-m -d /home/deploy deploy": "Deploy-Benutzer mit eigenem Home erstellen",
    "-r -s /usr/sbin/nologin app": "Systembenutzer ohne Login-Shell erstellen",
    "-s": "Login-Shell setzen",
    "-G": "sekundäre Gruppen setzen",
    "-g": "primäre Gruppe setzen",
    "-d": "Home-Verzeichnis setzen",
    "-u": "User-ID setzen",
    "-c": "Kommentar oder GECOS-Feld setzen",
    "-r": "Systembenutzer erstellen",
    "--system": "Systembenutzer erstellen",
    "-U": "gleichnamige Benutzergruppe anlegen",
    "--user-group": "gleichnamige Benutzergruppe anlegen",
    "-N": "keine gleichnamige Benutzergruppe anlegen",
    "--no-user-group": "keine gleichnamige Benutzergruppe anlegen",
  },
  usermod: {
    "-aG sudo username": "Benutzer zur sudo-Gruppe hinzufügen",
    "-aG docker username": "Benutzer zur docker-Gruppe hinzufügen",
    "-s /bin/bash username": "Login-Shell auf Bash setzen",
    "-d /home/deploy -m deploy": "Home-Verzeichnis ändern und Inhalte verschieben",
    "-L username": "Benutzerpasswort sperren",
    "-U username": "Benutzerpasswort entsperren",
    "-e 2026-12-31 username": "Kontoablaufdatum setzen",
    "-aG": "Gruppen anhängen statt ersetzen",
    "--append --groups": "Gruppen anhängen statt ersetzen",
    "-G": "sekundäre Gruppen setzen",
    "--groups": "sekundäre Gruppen setzen",
    "-s": "Login-Shell ändern",
    "--shell": "Login-Shell ändern",
    "-d": "Home-Verzeichnis ändern",
    "--home": "Home-Verzeichnis ändern",
    "-m": "Home-Inhalt in neues Verzeichnis verschieben",
    "--move-home": "Home-Inhalt in neues Verzeichnis verschieben",
    "-L": "Benutzerpasswort sperren",
    "--lock": "Benutzerpasswort sperren",
    "-U": "Benutzerpasswort entsperren",
    "--unlock": "Benutzerpasswort entsperren",
    "-e": "Kontoablaufdatum setzen",
    "--expiredate": "Kontoablaufdatum setzen",
    "-c": "Kommentar oder GECOS-Feld ändern",
    "--comment": "Kommentar oder GECOS-Feld ändern",
  },
  chage: {
    "-l username": "Passwortalterung für Benutzer anzeigen",
    "-d 0 username": "Passwortwechsel beim nächsten Login erzwingen",
    "-M 90 -W 14 username": "Passwort nach 90 Tagen mit 14 Tagen Warnung ablaufen lassen",
    "-E 2026-12-31 username": "Kontoablaufdatum setzen",
    "-I 30 username": "Konto 30 Tage nach Passwortablauf deaktivieren",
    "-l": "Passwortalterung anzeigen",
    "--list": "Passwortalterung anzeigen",
    "-d": "Datum der letzten Passwortänderung setzen",
    "--lastday": "Datum der letzten Passwortänderung setzen",
    "-E": "Kontoablaufdatum setzen",
    "--expiredate": "Kontoablaufdatum setzen",
    "-M": "maximale Passwortgültigkeit setzen",
    "--maxdays": "maximale Passwortgültigkeit setzen",
    "-m": "Mindesttage zwischen Passwortänderungen setzen",
    "--mindays": "Mindesttage zwischen Passwortänderungen setzen",
    "-W": "Warnfrist vor Passwortablauf setzen",
    "--warndays": "Warnfrist vor Passwortablauf setzen",
    "-I": "Inaktivitätstage nach Passwortablauf setzen",
    "--inactive": "Inaktivitätstage nach Passwortablauf setzen",
  },
  groupadd: {
    developers: "Gruppe developers anlegen",
    "-g 1500 app": "Gruppe app mit fester GID anlegen",
    "-r servicegroup": "Systemgruppe servicegroup anlegen",
    "-f developers": "keinen Fehler melden, wenn Gruppe existiert",
    "-g": "Gruppen-ID setzen",
    "--gid": "Gruppen-ID setzen",
    "-r": "Systemgruppe anlegen",
    "--system": "Systemgruppe anlegen",
    "-f": "bei vorhandener Gruppe erfolgreich beenden",
    "--force": "bei vorhandener Gruppe erfolgreich beenden",
    "-K": "login.defs-Wert überschreiben",
    "--key": "login.defs-Wert überschreiben",
  },
  groupmod: {
    "-n newname oldname": "Gruppe oldname in newname umbenennen",
    "--new-name app app-old": "Gruppe app-old in app umbenennen",
    "-g 1501 developers": "GID der Gruppe developers setzen",
    "-o -g 1501 legacy": "nicht eindeutige GID erlauben",
    "-n": "Gruppennamen ändern",
    "--new-name": "Gruppennamen ändern",
    "-g": "Gruppen-ID ändern",
    "--gid": "Gruppen-ID ändern",
    "-o": "nicht eindeutige GID erlauben",
    "--non-unique": "nicht eindeutige GID erlauben",
    "-p": "verschlüsseltes Gruppenpasswort setzen",
    "--password": "verschlüsseltes Gruppenpasswort setzen",
  },
  visudo: {
    "-c": "sudoers-Dateien prüfen",
    "-c -f /etc/sudoers.d/app": "sudoers-Drop-in app prüfen",
    "-f /etc/sudoers.d/app": "sudoers-Drop-in app bearbeiten",
    "-f": "sudoers-Datei auswählen",
    "-s": "strikte sudoers-Prüfung aktivieren",
    "-q -c": "sudoers leise prüfen",
    "-q": "weniger Ausgabe erzeugen",
    "--check": "sudoers-Dateien prüfen",
    "--file": "sudoers-Datei auswählen",
    "--quiet": "weniger Ausgabe erzeugen",
    "--strict": "strikte sudoers-Prüfung aktivieren",
    "-V": "visudo-Version anzeigen",
    "--version": "visudo-Version anzeigen",
    "-h": "Hilfe anzeigen",
    "--help": "Hilfe anzeigen",
  },
  passwd: {
    username: "Passwort dieses Benutzers ändern",
    "-S username": "Passwortstatus dieses Benutzers anzeigen",
    "-S": "Passwortstatus eines Benutzers anzeigen",
    "--status": "Passwortstatus eines Benutzers anzeigen",
    "-l": "Benutzerpasswort sperren",
    "--lock": "Benutzerpasswort sperren",
    "-u": "Benutzerpasswort entsperren",
    "--unlock": "Benutzerpasswort entsperren",
    "-d": "Passwort eines Benutzers löschen",
    "--delete": "Passwort eines Benutzers löschen",
    "-e": "Passwort beim nächsten Login ablaufen lassen",
    "--expire": "Passwort beim nächsten Login ablaufen lassen",
    "-n": "Mindesttage bis zur nächsten Passwortänderung setzen",
    "--mindays": "Mindesttage bis zur nächsten Passwortänderung setzen",
    "-x": "maximale Gültigkeit des Passworts setzen",
    "--maxdays": "maximale Gültigkeit des Passworts setzen",
    "-w": "Warnfrist vor Ablauf des Passworts setzen",
    "--warndays": "Warnfrist vor Ablauf des Passworts setzen",
  },
  pwd: {
    "| cat": "aktuellen Pfad ueber Pipe ausgeben",
    "| tr -d '\\n'": "aktuellen Pfad ohne Zeilenumbruch ausgeben",
    "| xargs basename": "letzten Verzeichnisnamen des aktuellen Pfads ausgeben",
    "| xargs dirname": "Elternpfad des aktuellen Pfads ausgeben",
    "| tee cwd.txt": "aktuellen Pfad anzeigen und in cwd.txt schreiben",
    "| awk -F/ '{print $NF}'": "letztes Pfadsegment mit awk ausgeben",
    "> cwd.txt": "aktuellen Pfad in cwd.txt schreiben",
    "-P | tee cwd.txt": "physischen Pfad anzeigen und in cwd.txt schreiben",
    "&& ls": "aktuellen Pfad anzeigen und danach auflisten",
    "; ls -la": "aktuellen Pfad anzeigen und danach detailliert auflisten",
    "-L": "logischen Pfad mit Symlinks anzeigen",
    "--logical": "logischen Pfad mit Symlinks anzeigen",
    "-P": "physischen Pfad ohne Symlinks anzeigen",
    "--physical": "physischen Pfad ohne Symlinks anzeigen",
  },
  printf: {
    "'%s\\n'": "String je Zeile ausgeben",
    "'%04d\\n'": "Zahl mit führenden Nullen ausgeben",
    "'%s=%s\\n'": "Schlüssel-Wert-Paar formatiert ausgeben",
    "'%q\\n'": "Shell-escaped Ausgabe erzeugen",
    "'%b\\n'": "Backslash-Sequenzen auswerten",
    "'%(%F %T)T\\n'": "aktuellen Zeitstempel formatiert ausgeben",
    "'%s\\0'": "Strings NUL-getrennt ausgeben",
    "'%-20s %s\\n'": "linksbuendige Spalte mit Wert ausgeben",
    "%s": "String formatiert ausgeben",
    "%d": "Ganzzahl formatiert ausgeben",
    "%04d": "Zahl mit führenden Nullen ausgeben",
    "%q": "Shell-escaped Ausgabe erzeugen",
    "%b": "Backslash-Sequenzen auswerten",
    "%-20s": "String linksbuendig in fester Breite ausgeben",
    "%(%F %T)T": "Zeitstempel formatiert ausgeben",
    "\\n": "Zeilenumbruch ausgeben",
    "\\0": "NUL-Zeichen ausgeben",
  },
  ps: {
    aux: "alle Prozesse mit Benutzer und Ressourcen anzeigen",
    ef: "alle Prozesse im Full-Format anzeigen",
    elf: "alle Prozesse mit erweiterten Details anzeigen",
    "-e": "alle Prozesse anzeigen",
    "-f": "Full-Format ausgeben",
    "-u": "nach Benutzer filtern",
    "-p": "nach Prozess-ID filtern",
    "-C": "nach Befehlsname filtern",
    "-o": "Ausgabespalten festlegen",
    "--forest": "Prozessbaum anzeigen",
    "--sort": "Prozesse nach Spalte sortieren",
    "--no-headers": "Spaltenüberschriften ausblenden",
  },
  sed: {
    "-E 's/[0-9]+/NUM/g' file.txt": "Zahlen per erweitertem Regex ersetzen",
    "-n '/error/p' /var/log/syslog": "nur Zeilen mit error ausgeben",
    "-n '10,20p' file.txt": "Zeilen 10 bis 20 ausgeben",
    "'/^#/d' config.conf": "Kommentarzeilen aus Konfiguration entfernen",
    "-e 's/foo/bar/' -e 's/baz/qux/' file.txt": "mehrere sed-Ausdruecke anwenden",
    "-f script.sed file.txt": "sed-Skriptdatei auf Datei anwenden",
    "--follow-symlinks": "beim direkten Bearbeiten Symlinks folgen",
    "--sandbox": "sed im Sandbox-Modus ausfuehren",
    "--posix": "GNU-Erweiterungen deaktivieren",
    "-n": "automatische Ausgabe unterdrücken",
    "-i": "Dateien direkt bearbeiten",
    "-E": "erweiterte reguläre Ausdrücke verwenden",
    "-r": "erweiterte reguläre Ausdrücke verwenden",
    "-e": "Sed-Skript direkt angeben",
    "-f": "Sed-Skript aus Datei lesen",
    "'s/foo/bar/g'": "Text global ersetzen",
    "'s/foo/bar/g' file.txt": "Text in Datei ersetzen und ausgeben",
    "-i 's/foo/bar/g'": "Ersetzung direkt in Datei schreiben",
    "-n '1,20p'": "nur Zeilenbereich ausgeben",
  },
  seq: {
    "5": "Zahlen 1 bis 5 ausgeben",
    "1 10": "Zahlen 1 bis 10 ausgeben",
    "1 2 10": "Zahlen von 1 bis 10 in Zweierschritten ausgeben",
    "-w 001 010": "Zahlen mit fuehrenden Nullen ausgeben",
    "-s ',' 1 5": "Zahlen mit Komma trennen",
    "-f 'host%02g' 1 5": "Zahlen in Hostnamenformat einsetzen",
    "10 -1 1": "absteigende Zahlenfolge ausgeben",
    "0 .5 2": "Dezimal-Schritte ausgeben",
    "--equal-width 1 12": "Zahlen gleich breit mit fuehrenden Nullen ausgeben",
    "-f": "Ausgabeformat setzen",
    "--format": "Ausgabeformat setzen",
    "-s": "Trennzeichen setzen",
    "--separator": "Trennzeichen setzen",
    "-w": "Zahlen gleich breit ausgeben",
    "--equal-width": "Zahlen gleich breit ausgeben",
  },
  su: {
    "-": "Login-Shell als Zielbenutzer starten",
    "-l": "Login-Shell als Zielbenutzer starten",
    "-c": "einzelnen Befehl als Zielbenutzer ausführen",
    "-s": "Shell für die Sitzung setzen",
    "-m": "Umgebung möglichst beibehalten",
    "-p": "Umgebung möglichst beibehalten",
    "--login": "Login-Shell als Zielbenutzer starten",
    "--command": "einzelnen Befehl als Zielbenutzer ausführen",
    "--shell": "Shell für die Sitzung setzen",
    "--preserve-environment": "Umgebung möglichst beibehalten",
  },
  tee: {
    "file.txt": "Ausgabe anzeigen und in file.txt schreiben",
    "-a file.txt": "Ausgabe an file.txt anhaengen",
    "/tmp/check.txt": "Ausgabe in temporaere Check-Datei schreiben",
    "status.txt": "Statusausgabe in status.txt mitschreiben",
    "file1.log file2.log": "Ausgabe in mehrere Logdateien schreiben",
    "-a": "an Dateien anhängen statt überschreiben",
    "--append": "an Dateien anhängen statt überschreiben",
    "-i": "Interrupt-Signale ignorieren",
    "--ignore-interrupts": "Interrupt-Signale ignorieren",
    "-p": "Pipe-Fehler robuster behandeln",
    "--output-error": "Verhalten bei Schreibfehlern steuern",
    "--output-error=warn": "Schreibfehler melden und fortfahren",
    "--output-error=exit": "bei Schreibfehlern abbrechen",
  },
  timedatectl: {
    status: "Systemzeit, Zeitzone und NTP-Status anzeigen",
    show: "Zeit-Eigenschaften maschinenlesbar anzeigen",
    "list-timezones": "verfuegbare Zeitzonen auflisten",
    "timesync-status": "Status von systemd-timesyncd anzeigen",
    "show-timesync": "Timesync-Eigenschaften anzeigen",
    "--property Timezone --value show": "nur den aktuellen Zeitzonenwert ausgeben",
    "set-timezone Europe/Berlin": "Zeitzone auf Europe/Berlin setzen",
    "set-timezone <timezone>": "Zeitzone setzen",
    "set-time <time>": "Systemzeit setzen",
    "set-ntp true": "NTP-Zeitsynchronisierung aktivieren",
    "set-ntp <true|false>": "NTP-Zeitsynchronisierung ein- oder ausschalten",
    "set-local-rtc <0|1>": "RTC-Modus setzen",
    "--no-pager": "ohne Pager ausgeben",
    "--property": "Eigenschaft fuer show auswaehlen",
    "--value": "nur Werte ausgeben",
    "--all": "alle Eigenschaften anzeigen",
    "--monitor": "Aenderungen beobachten",
    "--adjust-system-clock": "Systemuhr beim RTC-Wechsel anpassen",
    "--no-ask-password": "nicht interaktiv nach Passwort fragen",
    "-H": "Remote-Host per SSH ansprechen",
    "--host": "Remote-Host per SSH ansprechen",
    "-M": "lokale Maschine ansprechen",
    "--machine": "lokale Maschine ansprechen",
  },
  timeout: {
    "10s ping 8.8.8.8": "Ping nach 10 Sekunden abbrechen",
    "5s curl https://example.com": "curl-Aufruf nach 5 Sekunden abbrechen",
    "-k 5s 1m long-command": "nach Timeout zuerst TERM, dann KILL senden",
    "--preserve-status 30s script.sh": "Exit-Code des Befehls erhalten",
    "--signal=TERM 10s command": "Signal fuer Timeout-Abbruch setzen",
    "--foreground 30s ssh host": "interaktives Kommando im Vordergrund lassen",
    "-v 5s command": "Timeout-Aktion ausfuehrlich melden",
    "1m make test": "Tests nach einer Minute abbrechen",
    "-k": "KILL-Verzoegerung nach Timeout setzen",
    "--kill-after": "KILL-Verzoegerung nach Timeout setzen",
    "-s": "Signal fuer Timeout-Abbruch setzen",
    "--signal": "Signal fuer Timeout-Abbruch setzen",
    "--preserve-status": "Exit-Code des Befehls erhalten",
    "--foreground": "interaktives Kommando im Vordergrund lassen",
    "-v": "Timeout-Aktion ausfuehrlich melden",
    "--verbose": "Timeout-Aktion ausfuehrlich melden",
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  type: {
    cd: "anzeigen, dass cd ein Shell-Builtin ist",
    alias: "anzeigen, wie alias in der Shell aufgeloest wird",
    export: "anzeigen, wie export in der Shell aufgeloest wird",
    history: "anzeigen, wie history in der Shell aufgeloest wird",
    "-a python": "alle python-Fundstellen und Aliase anzeigen",
    "-t systemctl": "nur den Typ von systemctl ausgeben",
    "-p bash": "Pfad zu bash ausgeben",
    "-P sh": "Pfad zu sh erzwingen",
    "-a": "alle passenden Befehlsaufloesungen anzeigen",
    "-t": "nur Befehlstyp ausgeben",
    "-p": "Pfad ausgeben, wenn auffindbar",
    "-P": "PATH-Suche erzwingen",
    "--help": "Hilfe anzeigen",
  },
  unalias: {
    ll: "Alias ll entfernen",
    gs: "Alias gs entfernen",
    ga: "Alias ga entfernen",
    gp: "Alias gp entfernen",
    dc: "Alias dc entfernen",
    grep: "Alias grep entfernen",
    ports: "Alias ports entfernen",
    k: "Alias k entfernen",
    serve: "Alias serve entfernen",
    path: "Alias path entfernen",
    "-a": "alle Aliase entfernen",
    "--help": "Hilfe anzeigen",
  },
  unset: {
    VAR: "Variable VAR aus Shell-Umgebung entfernen",
    NODE_ENV: "Node-Umgebungsvariable entfernen",
    SSH_AUTH_SOCK: "SSH-Agent-Socket-Variable entfernen",
    DEBUG: "Debug-Variable entfernen",
    EDITOR: "Editor-Variable entfernen",
    PAGER: "Pager-Variable entfernen",
    GPG_TTY: "GPG-Terminalvariable entfernen",
    HISTFILE: "History-Dateipfad fuer aktuelle Shell entfernen",
    "-v VAR": "Shell-Variable VAR entfernen",
    "-f function_name": "Shell-Funktion entfernen",
    "-v": "Variable entfernen",
    "-f": "Funktion entfernen",
    "--help": "Hilfe anzeigen",
  },
  uname: {
    "-a": "alle Systeminformationen anzeigen",
    "--all": "alle Systeminformationen anzeigen",
    "-s": "Kernel-Namen anzeigen",
    "--kernel-name": "Kernel-Namen anzeigen",
    "-n": "Netzwerk-Hostnamen anzeigen",
    "--nodename": "Netzwerk-Hostnamen anzeigen",
    "-r": "Kernel-Release anzeigen",
    "--kernel-release": "Kernel-Release anzeigen",
    "-v": "Kernel-Version anzeigen",
    "--kernel-version": "Kernel-Version anzeigen",
    "-m": "Maschinenarchitektur anzeigen",
    "--machine": "Maschinenarchitektur anzeigen",
    "-p": "Prozessortyp anzeigen",
    "--processor": "Prozessortyp anzeigen",
    "-o": "Betriebssystem anzeigen",
    "--operating-system": "Betriebssystem anzeigen",
  },
  uptime: {
    "| awk -F'load average:' '{print $2}'": "nur Load-Average-Werte ausgeben",
    "| cut -d, -f1": "Uptime-Teil vor dem ersten Komma anzeigen",
    "| sed 's/.*load average: //'": "Load-Average-Teil per sed extrahieren",
    "| tr -s ' '": "Leerzeichen in uptime-Ausgabe zusammenfassen",
    "| awk '{print $3,$4,$5}'": "Uptime-Dauerfelder ausgeben",
    "-p": "Laufzeit menschenlesbar anzeigen",
    "--pretty": "Laufzeit menschenlesbar anzeigen",
    "-s": "Startzeit des Systems anzeigen",
    "--since": "Startzeit des Systems anzeigen",
    "-h": "Hilfe anzeigen",
    "--help": "Hilfe anzeigen",
    "-V": "Version anzeigen",
    "--version": "Version anzeigen",
  },
  who: {
    "-a": "alle verfügbaren Informationen anzeigen",
    "--all": "alle verfügbaren Informationen anzeigen",
    "-b": "Zeit des letzten Systemstarts anzeigen",
    "--boot": "Zeit des letzten Systemstarts anzeigen",
    "-d": "tote Prozesse anzeigen",
    "--dead": "tote Prozesse anzeigen",
    "-H": "Spaltenüberschrift anzeigen",
    "--heading": "Spaltenüberschrift anzeigen",
    "-m": "nur aktuellen Terminal-Benutzer anzeigen",
    "-q": "Login-Namen und Anzahl anzeigen",
    "--count": "Login-Namen und Anzahl anzeigen",
    "-r": "aktuelles Runlevel anzeigen",
    "--runlevel": "aktuelles Runlevel anzeigen",
    "-u": "Benutzer mit Idle-Zeit anzeigen",
    "--users": "Benutzer mit Idle-Zeit anzeigen",
  },
  whoami: {
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  xargs: {
    "-0": "Eingabe mit NUL-Trennung lesen",
    "--null": "Eingabe mit NUL-Trennung lesen",
    "-n": "maximale Argumentanzahl pro Aufruf setzen",
    "--max-args": "maximale Argumentanzahl pro Aufruf setzen",
    "-I": "Platzhalter in Kommando ersetzen",
    "--replace": "Platzhalter in Kommando ersetzen",
    "-r": "ohne Eingabe nichts ausführen",
    "--no-run-if-empty": "ohne Eingabe nichts ausführen",
    "-t": "ausgeführte Kommandos anzeigen",
    "--verbose": "ausgeführte Kommandos anzeigen",
    "-P": "mehrere Prozesse parallel starten",
    "--max-procs": "mehrere Prozesse parallel starten",
    "-L": "Zeilenanzahl pro Kommando setzen",
    "-s": "maximale Kommandozeilenlänge setzen",
    "-a": "Argumente aus Datei lesen",
    "--arg-file": "Argumente aus Datei lesen",
  },
  chmod: {
    "+x": "Ausführungsrecht hinzufügen",
    "755": "typische Rechte für Verzeichnisse/Skripte setzen",
    "644": "typische Rechte für Dateien setzen",
    "-R": "Rechte rekursiv ändern",
    "--reference": "Rechte von Referenzdatei übernehmen",
  },
  chown: {
    "-R": "Besitzer rekursiv ändern",
    "--reference": "Besitzer von Referenzdatei übernehmen",
    "www-data:www-data": "Besitzer und Gruppe auf Webserver-User setzen",
  },
  chgrp: {
    "-R": "Gruppe rekursiv ändern",
    "--reference": "Gruppe von Referenzdatei übernehmen",
  },
  cp: {
    "-r": "Verzeichnisse rekursiv kopieren",
    "-R": "Verzeichnisse rekursiv kopieren",
    "-a": "Archivmodus mit Rechten und Zeiten",
    "-v": "kopierte Dateien anzeigen",
    "-i": "vor Überschreiben nachfragen",
    "-f": "Ziel überschreiben",
    "-n": "bestehende Ziele nicht überschreiben",
    "-u": "nur neuere Quelldateien kopieren",
    "-p": "Rechte, Besitzer und Zeitstempel erhalten",
    "-L": "symbolischen Links folgen",
    "-P": "symbolische Links nicht auflösen",
    "-s": "symbolische Links statt Kopien erstellen",
    "--target-directory": "Zielverzeichnis explizit setzen",
    "--force": "Ziel überschreiben",
    "--update": "nur neuere Quelldateien kopieren",
  },
  curl: {
    "-H": "HTTP-Header setzen",
    "-X": "HTTP-Methode setzen",
    "-d": "Request-Body senden",
    "-o": "Antwort in Datei schreiben",
    "-O": "Dateiname vom Server übernehmen",
    "-L": "Redirects folgen",
    "-I": "nur Header abrufen",
    "-s": "stille Ausgabe",
    "-S": "Fehler auch im Silent-Modus anzeigen",
    "-k": "TLS-Zertifikatsprüfung überspringen",
    "-v": "ausführliche Verbindungsdetails anzeigen",
    "-u": "Benutzername und Passwort setzen",
    "--connect-timeout": "Verbindungs-Timeout setzen",
    "--retry": "fehlgeschlagene Requests erneut versuchen",
    "--http2": "HTTP/2 verwenden",
    "--http1.1": "HTTP/1.1 erzwingen",
    "--max-time": "maximale Laufzeit begrenzen",
    "--compressed": "komprimierte Antwort anfordern",
  },
  docker: {
    ps: "Container auflisten",
    images: "Images auflisten",
    pull: "Image herunterladen",
    push: "Image hochladen",
    build: "Image aus Dockerfile bauen",
    run: "Container aus Image starten",
    start: "gestoppten Container starten",
    stop: "laufenden Container stoppen",
    restart: "Container neu starten",
    rm: "Container entfernen",
    rmi: "Image entfernen",
    logs: "Container-Logs anzeigen",
    exec: "Befehl in Container ausführen",
    inspect: "Objektdetails als JSON anzeigen",
    stats: "Live-Ressourcen anzeigen",
    top: "Prozesse im Container anzeigen",
    cp: "Dateien zwischen Host und Container kopieren",
    compose: "Compose-Projekt verwalten",
    system: "Docker-Systeminformationen und Wartung",
    "-a": "auch gestoppte Container anzeigen",
    "--all": "auch gestoppte Container anzeigen",
    "-q": "nur Container-IDs ausgeben",
    "--quiet": "nur Container-IDs ausgeben",
    "--filter": "Containerliste filtern",
    "--format": "Ausgabeformat setzen",
    "--no-trunc": "Ausgabe nicht kürzen",
    "--size": "Containergrößen anzeigen",
    "-d": "Container im Hintergrund starten",
    "-it": "interaktive TTY-Sitzung öffnen",
    "--name": "Container-Namen setzen",
    "-p": "Port veröffentlichen",
    "-v": "Volume oder Bind-Mount setzen",
    "-e": "Umgebungsvariable setzen",
    "--restart": "Restart-Policy setzen",
  },
  "docker compose": {
    up: "Services erstellen und starten",
    down: "Services stoppen und Ressourcen entfernen",
    ps: "Compose-Container auflisten",
    logs: "Service-Logs anzeigen",
    exec: "Befehl in Service-Container ausführen",
    run: "einmaligen Service-Befehl ausführen",
    build: "Service-Images bauen",
    pull: "Service-Images herunterladen",
    restart: "Services neu starten",
    stop: "Services stoppen",
    start: "Services starten",
    rm: "gestoppte Service-Container entfernen",
    config: "Compose-Konfiguration prüfen",
    images: "verwendete Images anzeigen",
    "-d": "im Hintergrund starten",
    "-f": "Compose-Datei auswählen",
    "-p": "Projektname setzen",
    "--profile": "Profil aktivieren",
    "--env-file": "Env-Datei laden",
  },
  git: {
    clone: "Repository in neues Verzeichnis kopieren",
    init: "leeres Git-Repository erstellen oder neu initialisieren",
    add: "Dateiinhalte zum Index hinzufügen",
    mv: "Datei oder Verzeichnis verschieben oder umbenennen",
    restore: "Dateien im Arbeitsbaum wiederherstellen",
    rm: "Dateien aus Arbeitsbaum und Index entfernen",
    bisect: "fehlerhaften Commit per Binärsuche finden",
    diff: "Änderungen zwischen Commits oder Arbeitsbaum anzeigen",
    grep: "Zeilen suchen, die ein Muster enthalten",
    log: "Commit-Historie anzeigen",
    show: "Objekte wie Commits oder Tags anzeigen",
    status: "Arbeitsbaumstatus anzeigen",
    branch: "Branches auflisten, erstellen oder löschen",
    commit: "Änderungen als Commit speichern",
    merge: "Entwicklungsstände zusammenführen",
    rebase: "Commits auf neue Basis anwenden",
    reset: "HEAD oder Index auf Zustand zurücksetzen",
    switch: "Branch wechseln",
    checkout: "Branch wechseln oder Dateien auschecken",
    tag: "Tags erstellen, prüfen oder löschen",
    revert: "neuen Commit erzeugen, der einen Commit rückgängig macht",
    "cherry-pick": "einzelnen Commit auf aktuellen Branch anwenden",
    worktree: "zusätzliche Arbeitsbäume verwalten",
    submodule: "eingebundene Repositories verwalten",
    config: "Git-Konfiguration lesen oder setzen",
    clean: "unversionierte Dateien bereinigen",
    blame: "letzte Änderung je Zeile anzeigen",
    describe: "Namen anhand naher Tags erzeugen",
    "ls-files": "Index- und Arbeitsbaumdateien auflisten",
    "ls-remote": "Refs eines Remote-Repositories anzeigen",
    reflog: "lokale HEAD-/Branch-Bewegungen anzeigen",
    "rev-parse": "Revisionen und Repository-Pfade auswerten",
    shortlog: "Commit-Log nach Autoren zusammenfassen",
    archive: "Archiv aus einem Git-Tree erstellen",
    fetch: "Objekte und Refs herunterladen",
    pull: "fetch plus Integration in aktuellen Branch",
    push: "lokale Refs zum Remote übertragen",
    stash: "uncommitted Änderungen zwischenspeichern",
    remote: "Remote-Repositories verwalten",
    "status --short": "Kurzformat des Arbeitsbaumstatus anzeigen",
    "status --branch": "Branch-Info im Status anzeigen",
    "status --porcelain": "skriptfreundliches Statusformat ausgeben",
    "status --ignored": "ignorierte Dateien im Status anzeigen",
    "clone --branch": "bestimmten Branch klonen",
    "clone --depth": "flachen Clone mit begrenzter Historie erstellen",
    "clone --recurse-submodules": "Submodule direkt mitklonen",
    "init --bare": "Bare Repository ohne Arbeitsbaum erstellen",
    "add -A": "alle Änderungen zum Index hinzufügen",
    "add -p": "Änderungen interaktiv stagen",
    "add --all": "alle Änderungen zum Index hinzufügen",
    "add --patch": "Änderungen interaktiv stagen",
    "restore --staged": "Dateien aus dem Index entfernen",
    "commit --amend": "letzten Commit ersetzen",
    "commit --no-edit": "Commit-Message unverändert behalten",
    "log --oneline": "Historie kompakt einzeilig anzeigen",
    "log --graph": "Branch-Verlauf als Graph anzeigen",
    "diff --staged": "gestagte Änderungen anzeigen",
    "diff --stat": "Änderungsstatistik anzeigen",
    "diff --name-only": "nur geänderte Dateinamen anzeigen",
    "branch -a": "lokale und Remote-Branches auflisten",
    "branch --merged": "bereits gemergte Branches anzeigen",
    "checkout -b": "neuen Branch erstellen und wechseln",
    "switch -c": "neuen Branch erstellen und wechseln",
    "reset --soft": "Commits zurücksetzen, Änderungen gestaged lassen",
    "reset --mixed": "Index zurücksetzen, Arbeitsbaum behalten",
    "reset --keep": "zurücksetzen und lokale Änderungen behalten",
    "stash list": "gespeicherte Stashes auflisten",
    "stash pop": "letzten Stash anwenden und entfernen",
    "stash apply": "Stash anwenden und behalten",
    "stash drop": "Stash löschen",
    "stash push": "Änderungen als neuen Stash speichern",
    "merge --no-ff": "Merge-Commit erzwingen",
    "merge --squash": "Änderungen ohne Merge-Commit zusammenfassen",
    "merge --abort": "laufenden Merge abbrechen",
    "rebase --continue": "Rebase nach Konfliktlösung fortsetzen",
    "rebase --abort": "laufenden Rebase abbrechen",
    "rebase --interactive": "Commits interaktiv bearbeiten",
    "revert --no-edit": "Revert ohne Editor mit Standardnachricht erstellen",
    "revert --continue": "Revert nach Konfliktlösung fortsetzen",
    "revert --abort": "laufenden Revert abbrechen",
    "cherry-pick --continue": "Cherry-pick nach Konfliktlösung fortsetzen",
    "cherry-pick --abort": "laufenden Cherry-pick abbrechen",
    "cherry-pick --no-commit": "Commit anwenden, aber nicht direkt committen",
    "tag -a": "annotierten Tag erstellen",
    "tag -d": "Tag löschen",
    "remote -v": "Remote-URLs anzeigen",
    "remote add": "Remote-Repository hinzufügen",
    "remote set-url": "Remote-URL ändern",
    "worktree list": "zusätzliche Arbeitsbäume anzeigen",
    "worktree add": "neuen Arbeitsbaum für Branch oder Commit anlegen",
    "worktree remove": "Arbeitsbaum aus der Verwaltung entfernen",
    "worktree prune": "verwaiste Worktree-Einträge bereinigen",
    "submodule status": "Submodule und aktuelle Commits anzeigen",
    "submodule init": "Submodule aus .gitmodules initialisieren",
    "submodule update": "Submodule auschecken oder aktualisieren",
    "submodule foreach": "Befehl in allen Submodulen ausführen",
    "config --list": "wirksame Git-Konfiguration auflisten",
    "config --global": "globale Benutzer-Konfiguration bearbeiten",
    "config --get": "einzelnen Konfigurationswert ausgeben",
    "config user.name": "Git-Autornamen anzeigen",
    "config user.email": "Git-Autor-E-Mail anzeigen",
    "clean -n": "nur anzeigen, was entfernt würde",
    "clean -i": "interaktive Bereinigung starten",
    "clean -d": "auch unversionierte Verzeichnisse berücksichtigen",
    "blame -L": "Blame auf Zeilenbereich begrenzen",
    "blame -w": "Whitespace-Änderungen ignorieren",
    "describe --tags": "auch leichte Tags für Beschreibung nutzen",
    "describe --always": "falls kein Tag passt, abgekürzten Commit ausgeben",
    "describe --dirty": "Arbeitsbaumstatus in Beschreibung markieren",
    "ls-files --stage": "Index-Modus und Objekt-IDs anzeigen",
    "ls-files --others": "unversionierte Dateien anzeigen",
    "ls-files --ignored": "ignorierte Dateien anzeigen",
    "ls-files --exclude-standard": "Standard-Ignore-Regeln anwenden",
    "ls-remote --heads": "nur Branch-Refs vom Remote anzeigen",
    "ls-remote --tags": "nur Tag-Refs vom Remote anzeigen",
    "reflog show": "Bewegungen von HEAD oder Branch anzeigen",
    "reflog expire": "Reflog-Ablauf testen oder anwenden",
    "rev-parse --show-toplevel": "Wurzelverzeichnis des Repositories ausgeben",
    "rev-parse --abbrev-ref": "symbolischen Branchnamen ausgeben",
    "shortlog -sn": "Commit-Anzahl je Autor kompakt anzeigen",
    "shortlog --all": "alle Refs in Zusammenfassung einbeziehen",
    "archive --format=tar": "Tar-Archiv erzeugen",
    "archive --format=zip": "Zip-Archiv erzeugen",
    "archive --output": "Archivdatei festlegen",
    "fetch --all": "alle Remotes abrufen",
    "fetch --prune": "gelöschte Remote-Refs entfernen",
    "pull --rebase": "Änderungen per Rebase integrieren",
    "pull --ff-only": "nur Fast-Forward-Pull erlauben",
    "push --set-upstream": "Upstream-Branch setzen und pushen",
    "push --tags": "Tags pushen",
    "push --force-with-lease": "geschützteres Force-Push verwenden",
    "-v": "Git-Version anzeigen",
    "--version": "Git-Version anzeigen",
    "-h": "kurze Hilfe direkt im Terminal anzeigen",
    "--help": "Hilfe anzeigen",
    "-C": "Befehl in anderem Pfad ausführen",
    "-c": "Konfigurationswert nur für diesen Aufruf setzen",
    "--exec-path": "Pfad der Git-Hilfsprogramme anzeigen oder setzen",
    "--html-path": "Pfad zur HTML-Dokumentation anzeigen",
    "--man-path": "Pfad zu den Manpages anzeigen",
    "--info-path": "Pfad zu den Info-Dokumenten anzeigen",
    "-p": "Ausgabe durch Pager leiten",
    "--paginate": "Ausgabe durch Pager leiten",
    "-P": "Pager deaktivieren",
    "--no-pager": "Pager deaktivieren",
    "--bare": "Repository als bare Repository behandeln",
    "--git-dir": "Pfad zum .git-Verzeichnis setzen",
    "--work-tree": "Arbeitsbaum-Pfad setzen",
    "--namespace": "Git-Namespace setzen",
    "--no-optional-locks": "optionale Locks vermeiden",
  },
  journalctl: {
    "-u": "Logs einer Unit anzeigen",
    "-f": "neue Logzeilen live verfolgen",
    "-n": "Anzahl der letzten Zeilen begrenzen",
    "-e": "ans Ende springen",
    "-b": "Logs seit aktuellem Boot anzeigen",
    "-k": "Kernel-Logs anzeigen",
    "-p": "nach Priorität filtern",
    "--since": "Startzeit setzen",
    "--until": "Endzeit setzen",
    "--no-pager": "ohne Pager ausgeben",
    "--no-hostname": "Hostname in Logzeilen ausblenden",
    "--utc": "Zeitstempel in UTC ausgeben",
    "-o": "Ausgabeformat wählen",
  },
  dpkg: {
    "-i": "Debian-Paket installieren",
    "--install": "Debian-Paket installieren",
    "--unpack": "Paket entpacken, aber noch nicht konfigurieren",
    "-r": "Paket entfernen",
    "-s": "Paketstatus anzeigen",
    "--status": "Paketstatus anzeigen",
    "-L": "installierte Dateien eines Pakets anzeigen",
    "--listfiles": "installierte Dateien eines Pakets anzeigen",
    "-l": "Pakete auflisten",
    "--list": "Pakete auflisten",
    "-S": "Datei oder Muster einem Paket zuordnen",
    "--search": "Datei oder Muster einem Paket zuordnen",
    "-c": "Inhalt eines .deb-Pakets anzeigen",
    "--contents": "Inhalt eines .deb-Pakets anzeigen",
    "-I": "Metadaten eines .deb-Pakets anzeigen",
    "--info": "Metadaten eines .deb-Pakets anzeigen",
    "--configure": "unfertig konfigurierte Pakete einrichten",
    "--audit": "unvollständig installierte Pakete finden",
    "--verify": "installierte Paketdateien prüfen",
    "--get-selections": "Paket-Auswahlstatus ausgeben",
    "--print-architecture": "Systemarchitektur ausgeben",
  },
  find: {
    "-type": "nach Dateityp filtern",
    "-name": "nach Dateiname suchen",
    "-iname": "ohne Groß-/Kleinschreibung suchen",
    "-mtime": "nach Änderungszeit filtern",
    "-size": "nach Dateigröße filtern",
    "-maxdepth": "Suchtiefe begrenzen",
    "-mindepth": "Mindest-Suchtiefe setzen",
    "-perm": "nach Rechten filtern",
    "-user": "nach Besitzer filtern",
    "-group": "nach Gruppe filtern",
    "-exec": "Befehl für Treffer ausführen",
    "-print": "Treffer ausgeben",
  },
  grep: {
    "-R": "rekursiv suchen",
    "-r": "rekursiv suchen",
    "-n": "Zeilennummern anzeigen",
    "-i": "Groß-/Kleinschreibung ignorieren",
    "-v": "nicht passende Zeilen anzeigen",
    "-E": "erweiterte reguläre Ausdrücke verwenden",
    "-F": "Suchmuster als festen Text behandeln",
    "-w": "nur ganze Wörter treffen",
    "-c": "Trefferzeilen zählen",
    "-l": "nur Dateinamen mit Treffern ausgeben",
    "-A": "Zeilen nach Treffer anzeigen",
    "-B": "Zeilen vor Treffer anzeigen",
    "-C": "Kontext um Treffer anzeigen",
    "--include": "nur passende Dateinamen durchsuchen",
    "--exclude": "Dateinamen ausschließen",
  },
  rg: {
    "-n": "Zeilennummern anzeigen",
    "--line-number": "Zeilennummern anzeigen",
    "-i": "Groß-/Kleinschreibung ignorieren",
    "--ignore-case": "Groß-/Kleinschreibung ignorieren",
    "-S": "Groß-/Kleinschreibung bei Großbuchstaben beachten",
    "--smart-case": "Groß-/Kleinschreibung bei Großbuchstaben beachten",
    "-g": "Dateien per Glob einschließen oder ausschließen",
    "--glob": "Dateien per Glob einschließen oder ausschließen",
    "-t": "nur Dateien dieses Typs durchsuchen",
    "--type": "nur Dateien dieses Typs durchsuchen",
    "--files": "Dateipfade statt Treffer ausgeben",
    "--hidden": "auch versteckte Dateien durchsuchen",
    "--no-ignore": "Ignore-Dateien ignorieren",
    "-C": "Kontext um Treffer anzeigen",
    "--context": "Kontext um Treffer anzeigen",
    "-A": "Zeilen nach Treffer anzeigen",
    "-B": "Zeilen vor Treffer anzeigen",
    "--json": "Treffer als JSON-Ereignisse ausgeben",
    "--stats": "Suchstatistik anzeigen",
    TODO: "Suchmuster rekursiv in Dateien finden",
  },
  jq: {
    "-r": "Strings roh ohne JSON-Anführungszeichen ausgeben",
    "--raw-output": "Strings roh ohne JSON-Anführungszeichen ausgeben",
    "-c": "kompakte JSON-Ausgabe",
    "--compact-output": "kompakte JSON-Ausgabe",
    "-e": "Exit-Code anhand Ergebnis setzen",
    "-s": "Eingaben als Array einlesen",
    ".": "JSON unverändert formatiert ausgeben",
    ".[]": "Array-Elemente einzeln ausgeben",
    ".name": "Feld name aus Objekt ausgeben",
    ".[].name": "Feld name aus jedem Array-Element ausgeben",
    "keys": "Objektschlüssel ausgeben",
    length: "Länge von Array, Objekt oder String ausgeben",
    "map(.name)": "Array auf name-Felder abbilden",
    "select(.enabled)": "nur Objekte mit enabled auswählen",
    to_entries: "Objekt in Key-Value-Einträge umwandeln",
  },
  yq: {
    "-o": "Ausgabeformat wählen",
    "--output-format": "Ausgabeformat wählen",
    "-p": "Eingabeformat wählen",
    "--input-format": "Eingabeformat wählen",
    "-r": "skalare Werte ohne Quotes ausgeben",
    "--unwrapScalar": "skalare Werte ohne Quotes ausgeben",
    "-P": "YAML lesbar formatiert ausgeben",
    "--prettyPrint": "YAML lesbar formatiert ausgeben",
    "-I": "Einrückung setzen",
    "--indent": "Einrückung setzen",
    "-i": "Datei direkt bearbeiten",
    "--inplace": "Datei direkt bearbeiten",
    "-N": "Farben deaktivieren",
    "--no-colors": "Farben deaktivieren",
    "--no-doc": "YAML-Dokumenttrenner ausblenden",
    ".metadata.name": "Feld metadata.name ausgeben",
    ".items[].name": "name aus allen items ausgeben",
  },
  ls: {
    "-a": "auch versteckte Einträge anzeigen",
    "-A": "fast alle versteckten Einträge anzeigen",
    "-l": "lange Listenansicht anzeigen",
    "-la": "lange Liste inklusive versteckter Einträge",
    "-h": "Größen menschenlesbar anzeigen",
    "-R": "rekursiv auflisten",
    "-t": "nach Änderungszeit sortieren",
    "-r": "Sortierung umkehren",
    "-S": "nach Größe sortieren",
    "-X": "nach Erweiterung sortieren",
    "-d": "Verzeichnisse selbst statt Inhalt anzeigen",
    "-i": "Inode-Nummern anzeigen",
    "-n": "numerische UID/GID anzeigen",
    "-F": "Typ-Indikator an Namen anhängen",
  },
  mkdir: {
    "-p": "fehlende Elternverzeichnisse erstellen",
    "-v": "erstellte Verzeichnisse anzeigen",
    "-m": "Rechte beim Erstellen setzen",
    "--mode": "Rechte beim Erstellen setzen",
    "--parents": "fehlende Elternverzeichnisse erstellen",
    "--verbose": "erstellte Verzeichnisse anzeigen",
  },
  mv: {
    "-v": "verschobene Dateien anzeigen",
    "-i": "vor Überschreiben nachfragen",
    "-f": "Ziel überschreiben",
    "-n": "bestehende Ziele nicht überschreiben",
    "-u": "nur neuere Quelldateien verschieben",
    "-T": "Ziel als normale Datei behandeln",
    "--target-directory": "Zielverzeichnis explizit setzen",
    "--force": "Ziel überschreiben",
    "--interactive": "vor Überschreiben nachfragen",
    "--update": "nur neuere Quelldateien verschieben",
    "--backup": "Backup vor Überschreiben erstellen",
    "--suffix": "Backup-Suffix setzen",
    "--verbose": "verschobene Dateien anzeigen",
    "--no-clobber": "bestehende Ziele nicht überschreiben",
  },
  "openssl s_client": {
    "-connect": "TLS-Ziel als host:port setzen",
    "-connect example.com:443": "TLS-Verbindung zu example.com:443 testen",
    "-connect example.com:443 -servername example.com": "TLS-Verbindung mit SNI testen",
    "-servername": "SNI-Hostname setzen",
    "-showcerts": "Zertifikatskette anzeigen",
    "-showcerts -connect example.com:443": "Zertifikatskette von example.com anzeigen",
    "-brief": "kurze Verbindungszusammenfassung anzeigen",
    "-brief -connect example.com:443": "kurze TLS-Zusammenfassung anzeigen",
    "-tls1_2": "TLS 1.2 erzwingen",
    "-tls1_3": "TLS 1.3 erzwingen",
    "-CAfile": "CA-Datei für Prüfung verwenden",
    "-verify_return_error": "bei Zertifikatsfehlern abbrechen",
    "-verify_return_error -connect example.com:443": "Zertifikatsfehler als Fehler behandeln",
    "-alpn": "ALPN-Protokolle anbieten",
    "-starttls": "STARTTLS-Protokoll auswählen",
    "-ign_eof": "Verbindung nach EOF offen halten",
  },
  resolvectl: {
    status: "DNS-Konfiguration anzeigen",
    query: "DNS-Namen auflösen",
    dns: "DNS-Server anzeigen oder setzen",
    domain: "Suchdomains anzeigen oder setzen",
    statistics: "DNS-Statistiken anzeigen",
    "flush-caches": "DNS-Cache leeren",
    "--type": "DNS-Record-Typ wählen",
    "--no-pager": "ohne Pager ausgeben",
    "--legend": "Legende in der Ausgabe ein- oder ausblenden",
    "--interface": "Abfrage auf Interface beschränken",
    "-4": "nur IPv4 abfragen",
    "-6": "nur IPv6 abfragen",
  },
  rsync: {
    "-a": "Archivmodus verwenden",
    "-v": "übertragene Dateien anzeigen",
    "-r": "Verzeichnisse rekursiv übertragen",
    "-z": "Übertragung komprimieren",
    "--delete": "Ziel löschen, was Quelle nicht hat",
    "--exclude": "Muster ausschließen",
    "--dry-run": "Änderungen nur simulieren",
    "--progress": "Fortschritt anzeigen",
    "-n": "Änderungen nur simulieren",
    "-P": "Partial- und Progress-Modus aktivieren",
    "--partial": "teilweise übertragene Dateien behalten",
    "--checksum": "Dateien per Prüfsumme vergleichen",
    "--archive": "Archivmodus verwenden",
    "--recursive": "Verzeichnisse rekursiv übertragen",
    "--compress": "Übertragung komprimieren",
    "--human-readable": "Zahlen und Größen menschenlesbar ausgeben",
    "-h": "Größen menschenlesbar anzeigen",
    "--include": "Muster ausdrücklich einschließen",
    "--filter": "Filterregel setzen",
    "--files-from": "Dateiliste aus Datei lesen",
    "--itemize-changes": "Änderungen einzeln markieren",
    "--stats": "Übertragungsstatistik anzeigen",
    "--bwlimit": "Bandbreite begrenzen",
    "--chmod": "Rechte am Ziel setzen",
    "--chown": "Besitzer am Ziel setzen",
    "-e": "Remote-Shell wie SSH-Optionen setzen",
    "--rsync-path": "rsync-Pfad auf dem Zielhost setzen",
    "--protect-args": "Argumente vor Remote-Shell-Escaping schützen",
  },
  scp: {
    "-P": "SSH-Port setzen",
    "-P 2222 file.txt user@host:/tmp/": "Datei über SSH-Port 2222 kopieren",
    "-p": "Zeitstempel und Rechte beim Kopieren erhalten",
    "-i": "Identity-Datei auswählen",
    "-i ~/.ssh/id_ed25519 file.txt user@host:/tmp/": "Datei mit bestimmtem SSH-Schlüssel kopieren",
    "-r": "Verzeichnisse rekursiv kopieren",
    "-r ./dir user@host:/var/www/": "Verzeichnis rekursiv auf Server kopieren",
    "-v": "ausführliche SSH-Logs anzeigen",
    "-C": "Übertragung komprimieren",
    "-J": "Jump-Host verwenden",
    "-J bastion file.txt user@host:/tmp/": "Datei über Bastion-Host kopieren",
    "-o": "SSH-Option setzen",
    "-F": "SSH-Konfigurationsdatei auswählen",
    "-l": "Bandbreite begrenzen",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
    "-q": "stille Ausgabe",
    "file.txt user@host:/tmp/": "Datei auf entfernten Host kopieren",
  },
  ss: {
    "-t": "TCP-Sockets anzeigen",
    "-u": "UDP-Sockets anzeigen",
    "-l": "lauschende Sockets anzeigen",
    "-n": "Adressen und Ports numerisch ausgeben",
    "-p": "zugehörige Prozesse anzeigen",
    "-a": "alle Sockets anzeigen",
    "-s": "Socket-Statistik anzeigen",
    "-4": "nur IPv4-Sockets anzeigen",
    "-6": "nur IPv6-Sockets anzeigen",
    "-H": "Header ausblenden",
    "-o": "Timer-Informationen anzeigen",
    "-m": "Speicherinformationen anzeigen",
    "-r": "Namen auflösen",
    "-x": "Unix-Domain-Sockets anzeigen",
  },
  "ssh-add": {
    "-l": "Fingerprints der geladenen Schlüssel anzeigen",
    "-L": "öffentliche Schlüssel des Agents ausgeben",
    "-D": "alle Identitäten aus dem Agent entfernen",
    "-d": "angegebene Identität aus dem Agent entfernen",
    "-t": "Lebensdauer für geladene Identität setzen",
    "-K": "Passphrase im Schlüsselbund speichern, falls verfügbar",
    "-q": "Ausgabe reduzieren",
    "-v": "ausführlichere Ausgabe anzeigen",
    "-c": "Bestätigung vor Schlüsselverwendung verlangen",
    "-k": "nur einfache Private Keys verarbeiten",
    "-x": "Agent mit Passwort sperren",
    "-X": "gesperrten Agent wieder entsperren",
    "-s": "PKCS#11-Provider hinzufügen",
    "-e": "PKCS#11-Provider entfernen",
    "-T": "Signaturtest mit Public-Key-Datei ausführen",
  },
  "ssh-agent": {
    "eval $(ssh-agent)": "Agent starten und Umgebungsvariablen in die Shell übernehmen",
    bash: "Agent starten und Bash darunter ausführen",
    "-s": "Shell-Kommandos für sh-kompatible Shells ausgeben",
    "-c": "Shell-Kommandos für csh-kompatible Shells ausgeben",
    "-k": "laufenden Agent beenden",
    "-a": "Socket-Adresse des Agents setzen",
    "-a /tmp/ssh-agent.sock": "Agent-Socket an festem Pfad erstellen",
    "-t 1h": "Standard-Lebensdauer fuer Keys auf 1 Stunde setzen",
    sh: "sh mit neuem SSH-Agent starten",
    "-s > agent.env": "Agent-Umgebung in Datei schreiben",
    "-t 8h bash": "Bash mit 8-Stunden-Key-Lebensdauer starten",
    "-E sha256 bash": "Bash mit SHA256-Fingerprintformat starten",
    "-E": "Fingerprint-Hashformat setzen",
    "-O": "Agent-Option setzen",
    "-t": "Standard-Lebensdauer für Identitäten setzen",
    "-D": "Agent im Vordergrund starten",
    "-d": "Debug-Ausgabe im Vordergrund aktivieren",
  },
  ssh: {
    "-p": "Port setzen",
    "-i": "Identity-Datei auswählen",
    "-l": "Login-Benutzer setzen",
    "-L": "lokalen Port weiterleiten",
    "-R": "Remote-Port weiterleiten",
    "-D": "SOCKS-Proxy öffnen",
    "-o": "SSH-Option setzen",
    "-J": "Jump-Host verwenden",
    "-N": "keinen Remote-Befehl ausführen",
    "-T": "Pseudo-TTY deaktivieren",
    "-X": "X11-Forwarding aktivieren",
    "-A": "SSH-Agent-Forwarding aktivieren",
    "-v": "ausführliche Logs anzeigen",
    "-vv": "noch ausführlichere SSH-Logs anzeigen",
    "-vvv": "maximale SSH-Debug-Ausgabe anzeigen",
    "StrictHostKeyChecking=accept-new": "neue Hostkeys automatisch akzeptieren",
    "ServerAliveInterval=60": "Keepalive-Intervall setzen",
    "ServerAliveCountMax=3": "maximale unbeantwortete Keepalives setzen",
    "ConnectTimeout=10": "Verbindungs-Timeout setzen",
    "IdentitiesOnly=yes": "nur angegebene Schlüssel verwenden",
    "Compression=yes": "SSH-Kompression aktivieren",
    "ForwardAgent=no": "Agent-Forwarding deaktivieren",
    "UserKnownHostsFile=~/.ssh/known_hosts": "known_hosts-Datei auswählen",
    "LogLevel=ERROR": "nur Fehler ausgeben",
  },
  "ssh-keygen": {
    "-t": "Schlüsseltyp wählen",
    "-b": "Schlüssellänge setzen",
    "-f": "Ausgabedatei wählen",
    "-C": "Kommentar setzen",
    "-N": "Passphrase setzen",
    "-F": "Host in known_hosts suchen",
    "-p": "Passphrase eines Schlüssels ändern",
    "-R": "Host aus known_hosts entfernen",
    "-l": "Fingerprint anzeigen",
    "-lf": "Fingerprint einer Public-Key-Datei anzeigen",
    "-y": "Public Key aus Private Key ausgeben",
  },
  "ssh-copy-id": {
    "-i": "Public-Key-Datei auswählen",
    "-p": "SSH-Port setzen",
    "-f": "Schlüssel ohne vorherigen Login-Test kopieren",
    "-n": "nur anzeigen, was kopiert würde",
    "-s": "sftp statt Shell-Kommandos verwenden",
    "-o": "SSH-Option weitergeben",
    "-h": "Hilfe anzeigen",
    "--help": "Hilfe anzeigen",
    "user@host": "Public Key für diesen Login installieren",
  },
  "ssh-keyscan": {
    "github.com": "Host-Key von github.com anzeigen",
    "-H github.com": "github.com gehasht für known_hosts ausgeben",
    "-t ed25519,rsa github.com": "nur ed25519- und RSA-Keys abfragen",
    "-p 2222 host": "Host-Key über Port 2222 abfragen",
    "-T 5 -4 host": "IPv4-Abfrage mit 5 Sekunden Timeout",
    "-H host >> ~/.ssh/known_hosts": "gehashten Host-Key an known_hosts anhängen",
    "-p": "SSH-Port setzen",
    "-t": "Key-Typen auswählen",
    "-H": "Hostnamen in Ausgabe hashen",
    "-T": "Timeout in Sekunden setzen",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
    "-v": "ausführlichere Ausgabe anzeigen",
    "-f": "Hosts aus Datei lesen",
  },
  sftp: {
    "-P": "Port setzen",
    "-i": "Identity-Datei auswählen",
    "-b": "Batch-Datei ausführen",
    "-o": "SSH-Option setzen",
    "-F": "SSH-Konfigurationsdatei auswählen",
    "-J": "Jump-Host verwenden",
    "-l": "Bandbreite begrenzen",
    "-B": "Puffergröße setzen",
    "-R": "Anzahl paralleler Requests setzen",
    "-S": "SSH-Programm auswählen",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
    "-q": "stille Ausgabe",
    "-v": "ausführliche SSH-Logs anzeigen",
    "-r": "Verzeichnisse rekursiv übertragen",
    "-C": "SSH-Kompression aktivieren",
  },
  sshfs: {
    "-p": "SSH-Port setzen",
    "-o": "FUSE- oder SSH-Option setzen",
    "-o reconnect": "Verbindung bei Abbruch automatisch neu aufbauen",
    "-o IdentityFile=<path>": "SSH-Schlüsseldatei auswählen",
    "-o ServerAliveInterval=<seconds>": "Keepalive-Intervall setzen",
    "-o ServerAliveCountMax=<count>": "maximale unbeantwortete Keepalives setzen",
    "-o allow_other": "Mount auch für andere lokale Benutzer freigeben",
    "-o ro": "Remote-Verzeichnis nur lesend einhängen",
    "-o follow_symlinks": "symbolischen Links auf dem Remote-System folgen",
    "-C": "SSH-Kompression aktivieren",
  },
  systemctl: {
    status: "Status einer Unit anzeigen",
    start: "Unit starten",
    stop: "Unit stoppen",
    restart: "Unit neu starten",
    reload: "Konfiguration neu laden",
    "try-restart": "nur aktive Unit neu starten",
    "reload-or-restart": "neu laden oder neu starten",
    enable: "Unit beim Boot aktivieren",
    disable: "Autostart deaktivieren",
    "is-enabled": "Autostart-Status prüfen",
    "is-active": "Aktivstatus prüfen",
    mask: "Unit hart sperren",
    unmask: "Sperre entfernen",
    "list-units": "geladene Units auflisten",
    "list-unit-files": "installierte Unit-Dateien anzeigen",
    "list-timers": "Timer anzeigen",
    "list-sockets": "Socket-Units anzeigen",
    "list-jobs": "laufende systemd-Jobs anzeigen",
    "list-dependencies": "Unit-Abhängigkeiten anzeigen",
    "daemon-reload": "systemd Unit-Dateien neu laden",
    "daemon-reexec": "systemd Manager neu ausführen",
    show: "Unit-Eigenschaften anzeigen",
    "show-environment": "systemd-Manager-Umgebung anzeigen",
    cat: "Unit-Datei anzeigen",
    edit: "Unit-Override bearbeiten",
    "set-environment": "systemd-Manager-Variable setzen",
    "unset-environment": "systemd-Manager-Variable entfernen",
    "import-environment": "Variable aus Shell übernehmen",
    "service-watchdogs": "Watchdog-Verhalten konfigurieren",
    "switch-root": "Root-Dateisystem wechseln",
    "set-property": "Unit-Eigenschaft zur Laufzeit setzen",
    "is-failed": "Fehlerstatus prüfen",
    kill: "Signal an Unit-Prozesse senden",
    clean: "Runtime-/Cache-Daten einer Unit löschen",
    "reset-failed": "Fehlerstatus zurücksetzen",
    reenable: "Unit neu aktivieren",
    link: "Unit-Datei verlinken",
    revert: "Overrides einer Unit entfernen",
    "get-default": "Standard-Target anzeigen",
    "set-default": "Standard-Target setzen",
    "--type": "Unit-Typ filtern",
    "--state": "Unit-Zustand filtern",
    "--failed": "fehlgeschlagene Units anzeigen",
    "--user": "User-Manager verwenden",
    "--system": "System-Manager verwenden",
    "--now": "zusätzlich sofort starten/stoppen",
    "--no-pager": "ohne Pager ausgeben",
    "--all": "auch inaktive oder sonst ausgeblendete Units anzeigen",
    "--plain": "Ausgabe ohne Baum-/Bullets formatieren",
    "--quiet": "nur knappe Ausgabe oder Statuscode verwenden",
    "--property": "nur bestimmte Eigenschaften anzeigen",
    "--value": "nur Eigenschaftswerte ohne Namen ausgeben",
    "--since": "Startzeit für zeitraumbezogene Ausgabe setzen",
    "--until": "Endzeit für zeitraumbezogene Ausgabe setzen",
  },
  tar: {
    "-c": "Archiv erstellen",
    "-x": "Archiv entpacken",
    "-t": "Archivinhalt anzeigen",
    "-z": "gzip-Kompression verwenden",
    "-f": "Archivdatei setzen",
    "-v": "verarbeitete Dateien anzeigen",
    "-C": "vor Aktion in Verzeichnis wechseln",
    "-j": "bzip2-Kompression verwenden",
    "-J": "xz-Kompression verwenden",
    "-tf": "Archivinhalt anzeigen",
    "--create": "Archiv erstellen",
    "--extract": "Archiv entpacken",
    "--list": "Archivinhalt anzeigen",
    "--file": "Archivdatei setzen",
    "--gzip": "gzip-Kompression verwenden",
    "--bzip2": "bzip2-Kompression verwenden",
    "--xz": "xz-Kompression verwenden",
    "--directory": "vor Aktion in Verzeichnis wechseln",
    "--exclude": "Muster ausschließen",
    "--strip-components": "führende Pfadbestandteile entfernen",
    "--wildcards": "Shell-Wildcards beim Mustervergleich verwenden",
    "--numeric-owner": "Besitzer numerisch speichern oder ausgeben",
    "--same-owner": "Besitzer beim Entpacken wiederherstellen",
    "--keep-old-files": "vorhandene Dateien nicht überschreiben",
    "--overwrite": "vorhandene Dateien überschreiben",
    "--one-file-system": "Dateisystemgrenzen nicht überschreiten",
  },
  tree: {
    "-a": "auch versteckte Dateien anzeigen",
    "-d": "nur Verzeichnisse anzeigen",
    "-f": "vollständige Pfade ausgeben",
    "-h": "Dateigrößen menschenlesbar anzeigen",
    "-L": "Baumtiefe begrenzen",
    "-I": "Dateien oder Verzeichnisse per Muster ausschließen",
    "-P": "nur passende Dateien oder Verzeichnisse anzeigen",
    "--dirsfirst": "Verzeichnisse vor Dateien sortieren",
    "--noreport": "Zusammenfassung am Ende ausblenden",
  },
  vim: {
    "-R": "Datei nur lesend öffnen",
    "-M": "Änderungen deaktivieren",
    "-n": "Swap-Datei deaktivieren",
    "-p": "Dateien in Tabs öffnen",
    "-O": "Dateien vertikal geteilt öffnen",
    "-o": "Dateien horizontal geteilt öffnen",
    "+<line>": "direkt zu einer Zeile springen",
  },
  tcpdump: {
    "-i": "Interface auswählen",
    "-n": "Namen nicht auflösen",
    "-nn": "Namen und Ports nicht auflösen",
    "-v": "ausführlichere Ausgabe",
    "-vv": "sehr ausführliche Ausgabe",
    "-w": "Pakete in Datei schreiben",
    "-r": "Pakete aus Datei lesen",
    "-c": "Anzahl Pakete begrenzen",
    "-s": "Snaplength setzen",
  },
  watch: {
    "-n 1 date": "date jede Sekunde neu ausfuehren",
    "-d 'df -h'": "Aenderungen in df -h hervorheben",
    "-n 2 'systemctl status ssh'": "SSH-Status alle 2 Sekunden anzeigen",
    "-c 'systemctl --failed'": "fehlgeschlagene Units farbig beobachten",
    "-t 'uptime'": "uptime ohne watch-Header beobachten",
    "-n 5 'free -h'": "Speicher alle 5 Sekunden anzeigen",
    "-x date": "date direkt ohne Shell ausfuehren",
    "--differences=cumulative 'ss -tulpn'": "Socket-Aenderungen kumulativ hervorheben",
    "--exec": "Befehl direkt ohne Shell ausfuehren",
    "-b": "bei Fehler piepen",
    "--beep": "bei Fehler piepen",
    "-e": "bei Fehler beenden",
    "--errexit": "bei Fehler beenden",
    "-g": "bei Aenderung beenden",
    "--chgexit": "bei Aenderung beenden",
    "-n": "Intervall in Sekunden setzen",
    "--interval": "Intervall in Sekunden setzen",
    "-d": "Änderungen hervorheben",
    "--differences": "Änderungen hervorheben",
    "-t": "Header ausblenden",
    "--no-title": "Header ausblenden",
    "-x": "Befehl direkt ausführen",
    "-c": "ANSI-Farben interpretieren",
    "--color": "ANSI-Farben interpretieren",
  },
  xxd: {
    "file.bin": "Datei als Hexdump anzeigen",
    "-l 64 file.bin": "nur die ersten 64 Bytes anzeigen",
    "-g 1 file.bin": "Bytes einzeln gruppieren",
    "-c 16 file.bin": "16 Bytes pro Zeile anzeigen",
    "-s 128 file.bin": "ab Offset 128 lesen",
    "-p file.bin": "Plain-Hex ohne Adressspalte ausgeben",
    "-i file.bin": "C-Include-Array erzeugen",
    "-r dump.hex file.bin": "Hexdump zurueck in binaere Datei wandeln",
    "-r": "Hexdump zurueckwandeln",
    "-p": "Plain-Hex-Modus verwenden",
    "-i": "C-Include-Ausgabe erzeugen",
    "-u": "Grossbuchstaben fuer Hexwerte verwenden",
    "-l": "Ausgabe auf Laenge begrenzen",
    "-s": "Startoffset setzen",
    "-c": "Bytes pro Zeile setzen",
    "-g": "Gruppengroesse setzen",
    "-o": "Offset-Anzeige verschieben",
    "-E": "Zeichensatz fuer rechte Spalte setzen",
  },
  xz: {
    "-d": "xz-Datei entpacken",
    "--decompress": "xz-Datei entpacken",
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "Ausgabe auf stdout schreiben",
    "--stdout": "Ausgabe auf stdout schreiben",
    "-t": "komprimierte Datei prüfen",
    "--test": "komprimierte Datei prüfen",
    "-f": "vorhandene Ausgabedatei überschreiben",
    "--force": "vorhandene Ausgabedatei überschreiben",
    "-T": "Anzahl Kompressionsthreads setzen",
    "--threads": "Anzahl Kompressionsthreads setzen",
    "-0": "schnellste Kompression verwenden",
    "-9": "stärkste Kompression verwenden",
    "-v": "Kompressionsdetails anzeigen",
    "--verbose": "Kompressionsdetails anzeigen",
  },
  unxz: {
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "entpackten Inhalt auf stdout schreiben",
    "--stdout": "entpackten Inhalt auf stdout schreiben",
    "-f": "vorhandene Ausgabedatei überschreiben",
    "--force": "vorhandene Ausgabedatei überschreiben",
    "-t": "komprimierte Datei prüfen",
    "--test": "komprimierte Datei prüfen",
    "-v": "Entpackdetails anzeigen",
    "--verbose": "Entpackdetails anzeigen",
  },
  wget: {
    "-O": "Ausgabedatei festlegen",
    "-q": "stille Ausgabe aktivieren",
    "-c": "abgebrochenen Download fortsetzen",
    "-r": "rekursiv herunterladen",
    "-np": "nicht in übergeordnete Verzeichnisse wechseln",
    "-N": "nur neuere Dateien herunterladen",
    "--timeout": "Netzwerk-Timeout setzen",
    "--tries": "Anzahl Wiederholungen setzen",
    "--no-check-certificate": "TLS-Zertifikatsprüfung überspringen",
    "--user": "HTTP/FTP-Benutzer setzen",
    "--password": "HTTP/FTP-Passwort setzen",
    "https://example.com/file.tar.gz": "Datei von URL herunterladen",
  },
  zip: {
    "archive.zip file.txt": "einzelne Datei in ZIP-Archiv schreiben",
    "-r archive.zip ./dir": "Verzeichnis rekursiv archivieren",
    "-r archive.zip ./dir -x '*.git*'": "Verzeichnis ohne Git-Dateien archivieren",
    "-9 archive.zip large-file.bin": "Archiv mit maximaler Kompression erstellen",
    "-u archive.zip changed.txt": "geaenderte Datei im Archiv aktualisieren",
    "-d archive.zip old.txt": "Datei old.txt aus Archiv entfernen",
    "-r -q archive.zip ./dir": "Verzeichnis rekursiv und leise archivieren",
    "-r encrypted.zip ./secrets -e": "verschluesseltes Archiv erstellen",
    "-r archive.zip ./dir -i '*.txt'": "nur passende Textdateien archivieren",
    "-i": "nur passende Muster einschliessen",
    "-j": "Pfade im Archiv weglassen",
    "-T": "Archiv nach Erstellung testen",
    "-F": "Archiv reparieren",
    "-FS": "Archiv mit Dateisystem synchronisieren",
    "--move": "Dateien nach Archivierung verschieben",
    "-r": "Verzeichnisse rekursiv einpacken",
    "-q": "stille Ausgabe aktivieren",
    "-v": "Details anzeigen",
    "-e": "Archiv verschlüsseln",
    "-9": "stärkste Kompression verwenden",
    "-u": "vorhandenes Archiv aktualisieren",
    "-d": "Einträge aus Archiv entfernen",
    "-x": "Muster vom Archiv ausschließen",
  },
  unzip: {
    "archive.zip": "ZIP-Archiv entpacken",
    "archive.zip -d /tmp": "Archiv nach /tmp entpacken",
    "-l archive.zip": "Archivinhalt anzeigen",
    "-t archive.zip": "Archivintegritaet testen",
    "-q archive.zip -d /tmp/out": "Archiv leise in Zielverzeichnis entpacken",
    "-n archive.zip": "vorhandene Dateien nicht ueberschreiben",
    "-o archive.zip": "vorhandene Dateien ueberschreiben",
    "archive.zip '*.txt'": "nur Textdateien aus Archiv entpacken",
    "-p archive.zip file.txt": "Datei aus Archiv auf stdout ausgeben",
    "-Z1 archive.zip": "Archivinhalt mit einem Namen pro Zeile anzeigen",
    "-p": "Dateien auf stdout ausgeben",
    "-j": "Pfade beim Entpacken ignorieren",
    "-v": "ausfuehrliche Archivliste anzeigen",
    "-Z1": "Namen zeilenweise auflisten",
    "-x": "Muster vom Entpacken ausschliessen",
    "-l": "Archivinhalt anzeigen",
    "-t": "Archiv testen",
    "-d": "Zielverzeichnis setzen",
    "-o": "Dateien ohne Rückfrage überschreiben",
    "-n": "vorhandene Dateien nicht überschreiben",
    "-q": "stille Ausgabe aktivieren",
  },
  zcat: {
    "file.log.gz": "gzip-Datei auf stdout ausgeben",
    "file.log.gz | less": "komprimiertes Log im Pager lesen",
    "file.log.gz | grep error": "komprimiertes Log nach error filtern",
    "-f maybe.log": "Datei auch ohne gzip-Suffix ausgeben",
    "-l file.log.gz": "komprimierte Groessen anzeigen",
    "file.log.gz | head": "Anfang eines komprimierten Logs anzeigen",
    "file.log.gz | tail": "Ende eines komprimierten Logs anzeigen",
    "file.log.gz | wc -l": "Zeilen in komprimiertem Log zaehlen",
    "*.log.gz | grep -i error": "mehrere komprimierte Logs durchsuchen",
    "-f": "auch nicht-gzip-Dateien ausgeben",
    "--force": "auch nicht-gzip-Dateien ausgeben",
    "-l": "komprimierte Dateigrößen anzeigen",
    "--list": "komprimierte Dateigrößen anzeigen",
    "-q": "Warnungen unterdrücken",
    "--quiet": "Warnungen unterdrücken",
    "-v": "Details anzeigen",
    "--verbose": "Details anzeigen",
  },
  zgrep: {
    "-i": "Groß-/Kleinschreibung ignorieren",
    "--ignore-case": "Groß-/Kleinschreibung ignorieren",
    "-n": "Zeilennummern anzeigen",
    "--line-number": "Zeilennummern anzeigen",
    "-E": "erweiterte reguläre Ausdrücke verwenden",
    "--extended-regexp": "erweiterte reguläre Ausdrücke verwenden",
    "-F": "Suchmuster als festen Text behandeln",
    "--fixed-strings": "Suchmuster als festen Text behandeln",
    "-l": "nur Dateinamen mit Treffern ausgeben",
    "--files-with-matches": "nur Dateinamen mit Treffern ausgeben",
    "-C": "Kontext um Treffer anzeigen",
    "-A": "Zeilen nach Treffer anzeigen",
    "-B": "Zeilen vor Treffer anzeigen",
  },
  zstd: {
    "-d": "Zstandard-Datei entpacken",
    "--decompress": "Zstandard-Datei entpacken",
    "-k": "Originaldatei behalten",
    "--keep": "Originaldatei behalten",
    "-c": "Ausgabe auf stdout schreiben",
    "--stdout": "Ausgabe auf stdout schreiben",
    "-T": "Anzahl Threads setzen",
    "--threads": "Anzahl Threads setzen",
    "-q": "stille Ausgabe aktivieren",
    "--quiet": "stille Ausgabe aktivieren",
    "-v": "Details anzeigen",
    "--verbose": "Details anzeigen",
    "-1": "schnellste Kompression verwenden",
    "-19": "sehr starke Kompression verwenden",
    "--long": "Long-Range-Modus für große Dateien nutzen",
  },
};

const TERMINAL_AUTOCOMPLETE_CONTEXTUAL_SUGGESTION_DETAILS: Record<
  string,
  Record<string, Record<string, string>>
> = {
  docker: {
    logs: {
      "-f": "Logs live verfolgen",
      "--follow": "Logs live verfolgen",
      "--tail": "Anzahl der letzten Logzeilen begrenzen",
    },
    exec: {
      "-i": "STDIN offen halten",
      "-t": "Pseudo-TTY zuweisen",
      "-it": "interaktive TTY-Sitzung öffnen",
    },
  },
  "docker compose": {
    logs: {
      "-f": "Logs live verfolgen",
      "--follow": "Logs live verfolgen",
      "--tail": "Anzahl der letzten Logzeilen begrenzen",
    },
    exec: {
      "-i": "STDIN offen halten",
      "-t": "Pseudo-TTY zuweisen",
      "-it": "interaktive TTY-Sitzung öffnen",
    },
  },
  kubectl: {
    get: {
      "get pods -A": "Pods in allen Namespaces anzeigen",
      "-A": "alle Namespaces einbeziehen",
      "--all-namespaces": "alle Namespaces einbeziehen",
      "-n": "Namespace setzen",
      "-o": "Ausgabeformat wählen",
      "-w": "Änderungen live verfolgen",
      "--watch": "Änderungen live verfolgen",
      "--selector": "per Label-Selector filtern",
    },
    logs: {
      "-f": "Logs live verfolgen",
      "--follow": "Logs live verfolgen",
      "--tail": "Anzahl der letzten Logzeilen begrenzen",
      "--since": "Logs ab relativer Zeit anzeigen",
      "-c": "Container im Pod auswählen",
      "--container": "Container im Pod auswählen",
      "--previous": "Logs des vorherigen Container-Laufs anzeigen",
      "-n": "Namespace setzen",
    },
    apply: {
      "-f": "Manifest-Datei oder Verzeichnis anwenden",
      "-k": "Kustomize-Verzeichnis anwenden",
      "--dry-run": "Änderung nur simulieren",
      "--dry-run=server": "Änderung serverseitig validieren",
      "--server-side": "serverseitiges Apply verwenden",
    },
    diff: {
      "-f": "Manifest-Datei gegen Cluster vergleichen",
      "-k": "Kustomize-Verzeichnis gegen Cluster vergleichen",
      "--server-side": "serverseitigen Vergleich verwenden",
    },
    exec: {
      "-it": "interaktive Shell in Pod öffnen",
      "-n": "Namespace setzen",
      "-c": "Container im Pod auswählen",
    },
  },
  helm: {
    list: {
      "-A": "Releases in allen Namespaces auflisten",
      "--all-namespaces": "Releases in allen Namespaces auflisten",
      "-n": "Namespace setzen",
      "--deployed": "nur deployte Releases anzeigen",
      "--failed": "nur fehlgeschlagene Releases anzeigen",
      "--pending": "nur wartende Releases anzeigen",
    },
    upgrade: {
      "--install": "Release aktualisieren oder installieren",
      "--atomic": "bei Fehler automatisch zurückrollen",
      "--wait": "auf fertige Kubernetes-Ressourcen warten",
      "--dry-run": "Release nur simulieren",
      "-f": "Values-Datei verwenden",
      "--values": "Values-Datei verwenden",
      "--set": "Chart-Wert direkt setzen",
    },
    install: {
      "--create-namespace": "Namespace bei Bedarf erstellen",
      "--wait": "auf fertige Kubernetes-Ressourcen warten",
      "--dry-run": "Release nur simulieren",
      "-f": "Values-Datei verwenden",
      "--values": "Values-Datei verwenden",
      "--set": "Chart-Wert direkt setzen",
    },
    repo: {
      "repo add": "Chart-Repository hinzufügen",
      "repo update": "Chart-Repository-Index aktualisieren",
      "repo list": "konfigurierte Chart-Repositorys anzeigen",
    },
    search: {
      "search repo": "Charts in Repositorys suchen",
      "--versions": "alle Chart-Versionen anzeigen",
      "--devel": "auch Entwicklungs-Versionen anzeigen",
    },
  },
};

function getSuggestionDetailLookupKeys(label: string) {
  const normalized = label.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return [];
  }

  const withoutPlaceholders = normalized
    .replace(/\s+<[^>]+>/g, "")
    .replace(/=<[^>]+>/g, "")
    .trim();
  const tokens = normalized.split(/\s+/);
  const sshOptionValue =
    tokens[0] === "-o" && tokens.length > 1 ? tokens.slice(1).join(" ") : "";
  const optionIndexes = tokens
    .map((token, index) => (token.startsWith("-") ? index : -1))
    .filter((index) => index !== -1);
  const optionIndex = optionIndexes[0] ?? -1;
  const lastOptionIndex = optionIndexes[optionIndexes.length - 1] ?? -1;
  const lastOptionValue =
    lastOptionIndex !== -1
      ? tokens.slice(lastOptionIndex, lastOptionIndex + 2).join(" ")
      : "";
  const lastOptionName =
    lastOptionIndex !== -1 ? tokens[lastOptionIndex] : "";
  const lastOptionAssignmentName = lastOptionName.includes("=")
    ? lastOptionName.split("=", 1)[0]
    : "";
  const optionValue =
    optionIndex !== -1
      ? tokens.slice(optionIndex, optionIndex + 2).join(" ")
      : "";
  const optionName = optionIndex !== -1 ? tokens[optionIndex] : "";
  const optionAssignmentName = optionName.includes("=")
    ? optionName.split("=", 1)[0]
    : "";

  return [
    normalized,
    withoutPlaceholders,
    sshOptionValue,
    lastOptionValue,
    lastOptionName,
    lastOptionAssignmentName,
    optionValue,
    optionName,
    optionAssignmentName,
    tokens.slice(0, 2).join(" "),
    tokens[0] ?? "",
  ].filter(Boolean);
}

function getValueSuggestionDescription(command: string, label: string) {
  const normalizedLabel = label.trim();
  if (
    !normalizedLabel ||
    normalizedLabel.startsWith("-") ||
    PLACEHOLDER_RE.test(normalizedLabel)
  ) {
    return "";
  }

  const valueDescriptions: Record<string, string> = {
    alias: "Alias-Namen oder Alias-Definition auswaehlen",
    basename: "Dateiname aus Pfad extrahieren",
    ansible: "Host-Pattern, Modul oder Option auswählen",
    "ansible-inventory": "Inventory-Quelle oder Ausgabeoption auswählen",
    "ansible-playbook": "Playbook-Datei oder Option auswählen",
    apachectl: "Apache-Aktion oder Option auswählen",
    aws: "AWS-Service, Ressource oder Option auswählen",
    az: "Azure-Ressource oder Option auswählen",
    bg: "Job im Hintergrund fortsetzen",
    blkid: "Blockgerät, UUID oder Ausgabeformat auswählen",
    bzip2: "Datei mit bzip2 komprimieren",
    bunzip2: "bzip2-Datei entpacken",
    cat: "Dateiinhalt ausgeben",
    cd: "in dieses Verzeichnis wechseln",
    chage: "Konto- oder Passwortablauf auswählen",
    chgrp: "Gruppe für diesen Pfad ändern",
    chmod: "Rechte für diesen Pfad ändern",
    chown: "Besitzer für diesen Pfad ändern",
    cp: "Quelldatei oder Quellpfad auswählen",
    certbot: "Zertifikatsaktion, Domain oder Option auswählen",
    crontab: "Crontab-Aktion, Benutzer oder Datei auswählen",
    df: "Dateisystembelegung für Pfad anzeigen",
    dig: "DNS-Namen oder IP abfragen",
    disown: "Job aus der Shell-Jobtabelle lösen",
    dirname: "Verzeichnisteil aus Pfad extrahieren",
    du: "Speicherverbrauch für diesen Pfad anzeigen",
    export: "Umgebungsvariable oder Export-Option auswaehlen",
    file: "Dateityp dieses Pfads erkennen",
    fg: "Job in den Vordergrund holen",
    findmnt: "Mountpoint oder Dateisystem auswählen",
    groupadd: "Gruppe, GID oder Option auswählen",
    groupmod: "Gruppenname, GID oder Option auswählen",
    groups: "Benutzer für Gruppenanzeige auswählen",
    gzip: "Datei mit gzip komprimieren",
    gcloud: "Google-Cloud-Ressource oder Option auswählen",
    gunzip: "gzip-Datei entpacken",
    head: "Anfang dieser Datei anzeigen",
    host: "DNS-Namen oder IP auflösen",
    iftop: "Bandbreite für dieses Interface anzeigen",
    iperf3: "Netzwerkziel für Durchsatztest verwenden",
    iw: "WLAN-Gerät, Scan oder Regulatory-Domain auswählen",
    history: "History-Bereich, Filter oder Speicheraktion auswaehlen",
    htop: "Prozessfilter, PID oder Sortierung auswaehlen",
    jobs: "Shell-Jobs anzeigen",
    helm: "Helm-Release, Chart oder Option auswählen",
    kubectl: "Kubernetes-Ressource oder Option auswählen",
    less: "Datei im Pager öffnen",
    lsof: "offene Dateien für dieses Ziel anzeigen",
    ls: "Einträge für diesen Pfad anzeigen",
    lsblk: "Blockgeräte-Spalten, Format oder Filter auswählen",
    make: "Make-Target oder Option auswählen",
    mkdir: "dieses Verzeichnis erstellen",
    mount: "Mountpoint, Gerät oder Mount-Option auswählen",
    more: "Datei oder Pager-Startposition auswaehlen",
    mongosh: "MongoDB-URI, Datenbank oder Option auswählen",
    mv: "Quelldatei oder Quellpfad auswählen",
    mysql: "MySQL-Datenbank, Host oder Option auswählen",
    mysqldump: "MySQL-Datenbank oder Dump-Ziel auswählen",
    ncdu: "Speicherverbrauch für diesen Pfad analysieren",
    nginx: "Nginx-Aktion, Konfiguration oder Option auswählen",
    nload: "Durchsatz für dieses Interface anzeigen",
    nmap: "Zielhost oder Netz scannen",
    nl: "Datei mit Zeilennummern ausgeben",
    nohup: "Befehl vom Terminal lösen",
    node: "Node.js-Skript oder Option ausführen",
    nft: "nftables-Tabelle, Chain oder Prüfoption auswählen",
    nslookup: "DNS-Name, Server oder Record-Typ auswählen",
    npm: "npm-Paket oder Skript auswählen",
    "openssl s_client": "TLS-Ziel, SNI oder Prüfoption auswählen",
    patch: "Patch-Datei oder Arbeitsverzeichnis auswählen",
    pgrep: "Prozessmuster suchen",
    pidof: "Programmname oder pidof-Option auswaehlen",
    pip: "Python-Paket oder pip-Kommando auswählen",
    ping: "Erreichbarkeit dieses Hosts testen",
    pkill: "Prozessmuster als Ziel verwenden",
    pm2: "PM2-App, Prozessdatei oder Option auswählen",
    pnpm: "pnpm-Paket oder Skript auswählen",
    pg_dump: "PostgreSQL-Datenbank oder Dump-Ziel auswählen",
    pg_restore: "PostgreSQL-Dump oder Zieldatenbank auswählen",
    psql: "PostgreSQL-Datenbank, Host oder Option auswählen",
    pwd: "aktuelles Arbeitsverzeichnis anzeigen oder weiterreichen",
    pstree: "Prozessbaum-Option oder Prozessziel auswaehlen",
    python: "Python-Skript oder Modul ausführen",
    printf: "Formatstring oder Ausgabeform auswaehlen",
    readlink: "Link-Ziel oder Pfad auflösen",
    "redis-cli": "Redis-Host, Kommando oder Option auswählen",
    scp: "SSH-Ziel, Datei oder Kopieroption auswählen",
    service: "Dienst auswählen",
    screen: "Screen-Sitzung auswählen",
    supervisorctl: "Supervisor-Programm oder Option auswählen",
    ssh: "SSH-Login zu diesem Host starten",
    "ssh-copy-id": "Public Key auf diesen Host kopieren",
    "ssh-keyscan": "Host-Key-Ziel oder Keyscan-Option auswählen",
    sort: "Datei zeilenweise sortieren",
    stat: "Dateistatus dieses Pfads anzeigen",
    sysctl: "Kernel-Parameter auswählen",
    "systemd-cgls": "Control-Group-Pfad als Baum anzeigen",
    tail: "Ende dieser Datei anzeigen",
    top: "Prozessfilter, PID oder Sortierung auswaehlen",
    terraform: "Terraform-Kommando, State-Adresse oder Option auswählen",
    tee: "Ausgabeziel oder Schreibmodus auswaehlen",
    tmux: "tmux-Sitzung oder Ziel auswählen",
    tracepath: "Netzwerkziel oder Trace-Option auswählen",
    traceroute: "Route zu diesem Host verfolgen",
    type: "Shell-Aufloesung oder Befehlstyp auswaehlen",
    unalias: "Alias zum Entfernen auswaehlen",
    umount: "Mountpoint oder Aushängeoption auswählen",
    unset: "Variable, Funktion oder unset-Option auswaehlen",
    "update-alternatives": "Alternative, Modus oder Programmpfad auswählen",
    useradd: "Benutzer, Shell oder Gruppe auswählen",
    usermod: "Benutzer, Gruppe oder Kontooption auswählen",
    uniq: "benachbarte Duplikate in Datei filtern",
    visudo: "sudoers-Datei oder Prüfoption auswählen",
    vim: "Datei im Editor öffnen",
    vnstat: "Traffic-Statistik für dieses Interface anzeigen",
    wc: "Zeilen, Wörter oder Bytes für Datei zählen",
    which: "Befehlspfad oder Suchoption auswaehlen",
    xz: "Datei mit xz komprimieren",
    unxz: "xz-Datei entpacken",
    unzip: "ZIP-Archiv entpacken",
    yarn: "Yarn-Paket oder Skript auswählen",
    zip: "ZIP-Archiv erstellen",
    zcat: "komprimierte Datei ausgeben",
    zgrep: "in komprimierter Datei suchen",
    zstd: "Datei mit Zstandard verarbeiten",
  };

  return valueDescriptions[command] ?? "";
}

function getServiceActionSuggestionDescription(
  label: string,
  detailMap: Record<string, string>,
) {
  const tokens = label.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return "";
  }

  const action = tokens[tokens.length - 1] ?? "";
  return detailMap[action] ?? "";
}

function getContextualSuggestionDescription(command: string, label: string) {
  const tokens = label.trim().split(/\s+/).filter(Boolean);
  const subcommand = tokens[0] ?? "";
  const contextualDetails =
    TERMINAL_AUTOCOMPLETE_CONTEXTUAL_SUGGESTION_DETAILS[command]?.[subcommand];

  if (!contextualDetails) {
    return "";
  }

  for (const key of getSuggestionDetailLookupKeys(label)) {
    const detail = contextualDetails[key];
    if (detail) {
      return detail;
    }
  }

  return "";
}

function getDirectTerminalAutocompleteHelp(
  command: string,
): TerminalAutocompleteHelp | null {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return null;
  }

  const parts = trimmedCommand.split(/\s+/);
  const twoPartCommand = parts.slice(0, 2).join(" ").toLowerCase();
  const baseCommand = parts[0]?.toLowerCase();

  return (
    TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.get(twoPartCommand) ??
    (baseCommand
      ? TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.get(baseCommand)
      : undefined) ??
    null
  );
}

export type TerminalAutocompleteDescriptionKey =
  | "terminalAutocomplete.descriptions.command"
  | "terminalAutocomplete.descriptions.example"
  | "terminalAutocomplete.descriptions.option"
  | "terminalAutocomplete.descriptions.subcommand";

export interface TerminalAutocompleteDescriptionInfo {
  defaultValue: string;
  key: TerminalAutocompleteDescriptionKey;
  values: Record<string, string>;
}

export interface TerminalAutocompleteDescriptionOptions {
  language?: string;
}

function shouldUseDetailedAutocompleteDescriptions(language?: string) {
  return language?.toLowerCase().startsWith("de") ?? false;
}

function getDefaultAutocompleteDescriptionInfo(
  currentCommand: string,
  suggestion: string,
): TerminalAutocompleteDescriptionInfo | null {
  const help =
    getDirectTerminalAutocompleteHelp(suggestion) ??
    getTerminalAutocompleteHelp(suggestion);

  if (!help) {
    return null;
  }

  const displayLabel = getTerminalAutocompleteCatalogDisplayLabel(
    currentCommand,
    suggestion,
  ).trim();
  const tokens = displayLabel.split(/\s+/).filter(Boolean);

  if (displayLabel.includes("=")) {
    return {
      key: "terminalAutocomplete.descriptions.example",
      values: {
        command: help.command,
        suggestion: displayLabel,
      },
      defaultValue: `Example for ${help.command}`,
    };
  }

  const option = tokens.find((token) => token.startsWith("-"));

  if (option) {
    return {
      key: "terminalAutocomplete.descriptions.option",
      values: {
        command: help.command,
        option,
        suggestion: displayLabel,
      },
      defaultValue: `Use ${option} with ${help.command}`,
    };
  }

  const subcommand =
    tokens.find(
      (token) =>
        token !== help.command &&
        !token.includes("=") &&
        !token.includes("/") &&
        !token.includes("\\"),
    ) ?? "";

  if (subcommand) {
    return {
      key: "terminalAutocomplete.descriptions.subcommand",
      values: {
        command: help.command,
        subcommand,
        suggestion: displayLabel,
      },
      defaultValue: `Use ${subcommand} with ${help.command}`,
    };
  }

  if (displayLabel && displayLabel !== help.command) {
    return {
      key: "terminalAutocomplete.descriptions.example",
      values: {
        command: help.command,
        suggestion: displayLabel,
      },
      defaultValue: `Example for ${help.command}`,
    };
  }

  return {
    key: "terminalAutocomplete.descriptions.command",
    values: {
      command: help.command,
      suggestion: displayLabel || help.command,
    },
    defaultValue: `Run ${help.command}`,
  };
}

export function getTerminalAutocompleteSuggestionDescriptionInfo(
  currentCommand: string,
  suggestion: string,
): TerminalAutocompleteDescriptionInfo | null {
  return getDefaultAutocompleteDescriptionInfo(currentCommand, suggestion);
}

export function getTerminalAutocompleteHelpDescriptionInfo(
  help: TerminalAutocompleteHelp,
): TerminalAutocompleteDescriptionInfo {
  return {
    key: "terminalAutocomplete.descriptions.command",
    values: {
      command: help.command,
      suggestion: help.command,
    },
    defaultValue: `Run ${help.command}`,
  };
}

export function getTerminalAutocompleteHelpDescription(
  help: TerminalAutocompleteHelp,
  options: TerminalAutocompleteDescriptionOptions = {},
) {
  if (shouldUseDetailedAutocompleteDescriptions(options.language)) {
    return help.description;
  }

  return getTerminalAutocompleteHelpDescriptionInfo(help).defaultValue;
}

export function getTerminalAutocompleteSuggestionDescription(
  currentCommand: string,
  suggestion: string,
  options: TerminalAutocompleteDescriptionOptions = {},
) {
  if (!shouldUseDetailedAutocompleteDescriptions(options.language)) {
    return (
      getDefaultAutocompleteDescriptionInfo(currentCommand, suggestion)
        ?.defaultValue ?? ""
    );
  }

  const directHelp = getDirectTerminalAutocompleteHelp(suggestion);
  if (
    directHelp?.command === "command" ||
    directHelp?.command === "nohup" ||
    directHelp?.command === "timeout"
  ) {
    const displayLabel = getTerminalAutocompleteCatalogDisplayLabel(
      currentCommand,
      suggestion,
    );
    const detailMap =
      TERMINAL_AUTOCOMPLETE_SUGGESTION_DETAILS[directHelp.command];

    for (const key of getSuggestionDetailLookupKeys(displayLabel)) {
      const detail = detailMap?.[key];
      if (detail) {
        return detail;
      }
    }
  }

  const help = getTerminalAutocompleteHelp(suggestion);
  if (!help) {
    return "";
  }

  const displayLabel = getTerminalAutocompleteCatalogDisplayLabel(
    currentCommand,
    suggestion,
  );
  const detailMap = TERMINAL_AUTOCOMPLETE_SUGGESTION_DETAILS[help.command];

  if (detailMap) {
    const contextualDescription = getContextualSuggestionDescription(
      help.command,
      displayLabel,
    );
    if (contextualDescription) {
      return contextualDescription;
    }

    if (help.command === "service") {
      const serviceActionDescription = getServiceActionSuggestionDescription(
        displayLabel,
        detailMap,
      );
      if (serviceActionDescription) {
        return serviceActionDescription;
      }
    }

    for (const key of getSuggestionDetailLookupKeys(displayLabel)) {
      const detail = detailMap[key];
      if (detail) {
        return detail;
      }
    }
  }

  const valueDescription = getValueSuggestionDescription(
    help.command,
    displayLabel,
  );
  if (valueDescription) {
    return valueDescription;
  }

  return help.description;
}

export function getTerminalAutocompleteHelp(
  command: string,
): TerminalAutocompleteHelp | null {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return null;
  }

  const context = getAutocompleteContext(trimmedCommand);
  const lookupCommand = context.prefix
    ? context.matchCommand.trim()
    : trimmedCommand;
  const parts = lookupCommand.split(/\s+/);
  const twoPartCommand = parts.slice(0, 2).join(" ").toLowerCase();
  const baseCommand = parts[0]?.toLowerCase();
  const fallbackBaseCommand = trimmedCommand.split(/\s+/, 1)[0]?.toLowerCase();

  return (
    TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.get(twoPartCommand) ??
    (baseCommand
      ? TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.get(baseCommand)
      : undefined) ??
    (fallbackBaseCommand
      ? TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND.get(fallbackBaseCommand)
      : undefined) ??
    null
  );
}
