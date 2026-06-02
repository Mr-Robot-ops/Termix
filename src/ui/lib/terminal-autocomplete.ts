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
const COMMON_SYSTEMD_UNIT_TARGETS = [
  "ssh",
  "sshd",
  "nginx",
  "apache2",
  "docker",
  "cron",
  "ufw",
  "certbot.timer",
  "certbot.service",
  "pihole-FTL.service",
  "lightdm",
  "mysql",
  "mariadb",
  "postgresql",
  "redis",
  "rsyslog",
];
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
  cp: ["-r", "-R", "-a", "-v", "-i", "-n", "-u", "-p", "-L", "-P"],
  mv: ["-v", "-i", "-n", "-f", "-u", "--backup"],
  mkdir: ["-p", "-v", "-m", "--parents", "--mode"],
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
    exactPriorityKeys.includes(priority),
  );
  if (exactIndex !== -1 || !allowFirstTokenFallback) {
    return exactIndex;
  }

  const firstTokenKey = normalizePriorityKey(labelTokens[0] ?? "");
  return priorities.findIndex((priority) => priority === firstTokenKey);
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
  if (!subcommand || !SYSTEMCTL_QUERY_UNIT_SUBCOMMANDS.has(subcommand)) {
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
) {
  const suggestions: string[] = [];
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
    COMMON_SYSTEMD_UNIT_TARGETS.forEach((unit) => {
      suggestions.push(`${systemctlUnitPrefix}${unit}`);
    });
  }

  if (journalctlUnitPrefix) {
    COMMON_SYSTEMD_UNIT_TARGETS.forEach((unit) => {
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
    COMMON_SERVICE_NAMES.forEach((service) => {
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
    COMMON_SYSTEMD_UNIT_TARGETS.forEach((unit) => {
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
        isLikelySystemdUnitTarget(systemctlTarget)
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
    return isLikelySystemdUnitTarget(systemctlTarget);
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

  buildContextualCatalogSuggestions(context).forEach((candidate) =>
    appendMatch(candidate, "catalog"),
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
  const rankedMatches = preferHistoryOnly
    ? historyMatches.map((match) => ({ ...match, source: "history" as const }))
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
  basename: {
    "-a": "mehrere Pfade nacheinander verarbeiten",
    "-s": "Suffix beim Ausgeben entfernen",
    "-z": "Ausgabe mit NUL statt Zeilenumbruch trennen",
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
    "-t": "Eingabe als Tabelle ausrichten",
    "--table": "Eingabe als Tabelle ausrichten",
    "-s": "Eingabetrenner setzen",
    "--separator": "Eingabetrenner setzen",
    "-N": "Spaltennamen setzen",
    "--table-columns": "Spaltennamen setzen",
    "-o": "Ausgabetrenner setzen",
    "--output-separator": "Ausgabetrenner setzen",
  },
  cut: {
    "-d": "Feldtrenner setzen",
    "-f": "Felder auswählen",
    "-c": "Zeichenpositionen auswählen",
    "-b": "Bytepositionen auswählen",
    "--complement": "Auswahl invertieren",
    "--output-delimiter": "Ausgabetrenner setzen",
  },
  df: {
    "-h": "Größen menschenlesbar anzeigen",
    "-hT": "Größen menschenlesbar mit Dateisystemtyp anzeigen",
    "-T": "Dateisystemtyp anzeigen",
    "-i": "Inode-Nutzung anzeigen",
    "-ih": "Inode-Nutzung menschenlesbar anzeigen",
    "-a": "auch Pseudo-/Spezialdateisysteme anzeigen",
    "-x": "Dateisystemtyp ausschließen",
    "--total": "Gesamtsumme ausgeben",
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
    "-z": "Ausgabe mit NUL statt Zeilenumbruch trennen",
  },
  dmesg: {
    "-T": "Zeitstempel lesbar anzeigen",
    "--ctime": "Zeitstempel lesbar anzeigen",
    "-w": "Kernel-Meldungen live verfolgen",
    "--follow": "Kernel-Meldungen live verfolgen",
    "-H": "menschenlesbare Ausgabe mit Pager",
    "--human": "menschenlesbare Ausgabe mit Pager",
    "-l": "nach Log-Level filtern",
    "--level": "nach Log-Level filtern",
    "-k": "Kernel-Meldungen auswählen",
    "--kernel": "Kernel-Meldungen auswählen",
  },
  du: {
    "-h": "Größen menschenlesbar anzeigen",
    "-s": "nur Gesamtsumme anzeigen",
    "-sh": "Gesamtsumme menschenlesbar anzeigen",
    "-a": "auch Dateien einzeln anzeigen",
    "-c": "Gesamtsumme ergänzen",
    "-d": "Tiefe begrenzen",
    "--max-depth": "Tiefe begrenzen",
    "--exclude": "Muster ausschließen",
  },
  file: {
    "-b": "Dateiname in Ausgabe ausblenden",
    "-i": "MIME-Typ ausgeben",
    "-L": "symbolischen Links folgen",
    "-z": "komprimierte Dateien untersuchen",
    "-s": "auch Spezialdateien lesen",
  },
  findmnt: {
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
    "-m": "Speicher in MiB anzeigen",
    "-g": "Speicher in GiB anzeigen",
    "-s": "Ausgabe regelmäßig aktualisieren",
    "-t": "Gesamtsumme anzeigen",
  },
  head: {
    "-n": "Anzahl auszugebender Zeilen setzen",
    "-c": "Anzahl auszugebender Bytes setzen",
    "-q": "Dateinamen-Header ausblenden",
    "-v": "Dateinamen-Header immer anzeigen",
  },
  host: {
    "-t": "DNS-Record-Typ wählen",
    "-a": "alle verfügbaren Informationen anzeigen",
    "-v": "ausführlichere DNS-Ausgabe",
    "-4": "nur IPv4 verwenden",
    "-6": "nur IPv6 verwenden",
  },
  htop: {
    "-u": "Prozesse eines Benutzers anzeigen",
    "-p": "bestimmte Prozess-IDs anzeigen",
    "-d": "Aktualisierungsdelay setzen",
    "-s": "Sortierspalte setzen",
    "-t": "Baumansicht starten",
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
  less: {
    "-N": "Zeilennummern anzeigen",
    "-S": "lange Zeilen nicht umbrechen",
    "-R": "ANSI-Farben anzeigen",
    "-i": "Suche ohne Groß-/Kleinschreibung",
    "+F": "Dateiende verfolgen",
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
  lsof: {
    "-i": "Netzwerkdateien und Ports anzeigen",
    "-p": "nach Prozess-ID filtern",
    "-u": "nach Benutzer filtern",
    "-n": "Hostnamen nicht auflösen",
    "-P": "Portnamen nicht auflösen",
    "-nP": "Host- und Portnamen nicht auflösen",
    "+D": "Verzeichnis rekursiv durchsuchen",
    "-nP -iTCP": "TCP-Ports numerisch anzeigen",
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
  pgrep: {
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
    "-u": "nach Benutzer filtern",
    "-x": "nur exakten Namen treffen",
    "-9": "KILL-Signal senden",
    "-TERM": "TERM-Signal senden",
    "-HUP": "HUP-Signal senden",
  },
  readlink: {
    "-f": "kanonischen Pfad auflösen",
    "-e": "Pfad nur ausgeben, wenn alles existiert",
    "-m": "Pfad auch mit fehlenden Teilen kanonisieren",
    "-n": "keinen Zeilenumbruch ausgeben",
    "-v": "Fehler ausführlicher melden",
  },
  service: {
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
    "-w": "Kernel-Parameter setzen",
    "--write": "Kernel-Parameter setzen",
    "-p": "Parameter aus Datei laden",
    "--load": "Parameter aus Datei laden",
    "-n": "nur Werte ausgeben",
    "--values": "nur Werte ausgeben",
  },
  "systemd-analyze": {
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
  tail: {
    "-n": "Anzahl der letzten Zeilen setzen",
    "-c": "Anzahl der letzten Bytes setzen",
    "-f": "Dateiende live verfolgen",
    "-F": "Dateiende live verfolgen und Reopen versuchen",
    "--pid": "Folgen beenden, wenn Prozess endet",
    "--retry": "Datei beim Folgen erneut öffnen",
  },
  top: {
    "-u": "Prozesse eines Benutzers anzeigen",
    "-p": "bestimmte Prozess-IDs anzeigen",
    "-d": "Aktualisierungsdelay setzen",
    "-n": "Anzahl Aktualisierungen setzen",
    "-b": "Batch-Modus verwenden",
    "-H": "Threads anzeigen",
    "-o": "Sortierspalte setzen",
  },
  tr: {
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
    "-c": "Wiederholungen zählen",
    "-d": "nur doppelte Zeilen ausgeben",
    "-u": "nur eindeutige Zeilen ausgeben",
    "-i": "Groß-/Kleinschreibung ignorieren",
    "-f": "Felder am Zeilenanfang überspringen",
    "-s": "Zeichen am Zeilenanfang überspringen",
  },
  wc: {
    "-l": "Zeilen zählen",
    "-w": "Wörter zählen",
    "-c": "Bytes zählen",
    "-m": "Zeichen zählen",
    "-L": "Länge der längsten Zeile anzeigen",
  },
  awk: {
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
    "--no-install-recommends": "empfohlene Zusatzpakete auslassen",
    "--reinstall": "Paket erneut installieren",
    "--only-upgrade": "nur vorhandene Pakete aktualisieren",
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
  printenv: {
    "-0": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--null": "Ausgabe mit NUL statt Zeilenumbruch trennen",
    "--help": "Hilfe anzeigen",
    "--version": "Version anzeigen",
  },
  passwd: {
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
    "%s": "String formatiert ausgeben",
    "%04d": "Zahl mit führenden Nullen ausgeben",
    "%q": "Shell-escaped Ausgabe erzeugen",
    "%b": "Backslash-Sequenzen auswerten",
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
    "-a": "an Dateien anhängen statt überschreiben",
    "--append": "an Dateien anhängen statt überschreiben",
    "-i": "Interrupt-Signale ignorieren",
    "--ignore-interrupts": "Interrupt-Signale ignorieren",
    "-p": "Pipe-Fehler robuster behandeln",
    "--output-error": "Verhalten bei Schreibfehlern steuern",
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
    "--help": "Hilfe anzeigen",
    "-C": "Befehl in anderem Pfad ausführen",
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
    "--update": "nur neuere Quelldateien verschieben",
    "--backup": "Backup vor Überschreiben erstellen",
    "--suffix": "Backup-Suffix setzen",
    "--verbose": "verschobene Dateien anzeigen",
    "--no-clobber": "bestehende Ziele nicht überschreiben",
  },
  "openssl s_client": {
    "-connect": "TLS-Ziel als host:port setzen",
    "-servername": "SNI-Hostname setzen",
    "-showcerts": "Zertifikatskette anzeigen",
    "-brief": "kurze Verbindungszusammenfassung anzeigen",
    "-tls1_2": "TLS 1.2 erzwingen",
    "-tls1_3": "TLS 1.3 erzwingen",
    "-CAfile": "CA-Datei für Prüfung verwenden",
    "-verify_return_error": "bei Zertifikatsfehlern abbrechen",
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
    "-p": "Zeitstempel und Rechte beim Kopieren erhalten",
    "-i": "Identity-Datei auswählen",
    "-r": "Verzeichnisse rekursiv kopieren",
    "-v": "ausführliche SSH-Logs anzeigen",
    "-C": "Übertragung komprimieren",
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
    "-R": "Host aus known_hosts entfernen",
    "-l": "Fingerprint anzeigen",
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
    "-n": "Intervall in Sekunden setzen",
    "-d": "Änderungen hervorheben",
    "-t": "Header ausblenden",
    "-x": "Befehl direkt ausführen",
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
  const optionValue =
    optionIndex !== -1
      ? tokens.slice(optionIndex, optionIndex + 2).join(" ")
      : "";
  const optionName = optionIndex !== -1 ? tokens[optionIndex] : "";

  return [
    normalized,
    withoutPlaceholders,
    sshOptionValue,
    lastOptionValue,
    lastOptionName,
    optionValue,
    optionName,
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
    basename: "Dateiname aus Pfad extrahieren",
    cat: "Dateiinhalt ausgeben",
    cd: "in dieses Verzeichnis wechseln",
    chgrp: "Gruppe für diesen Pfad ändern",
    chmod: "Rechte für diesen Pfad ändern",
    chown: "Besitzer für diesen Pfad ändern",
    cp: "Quelldatei oder Quellpfad auswählen",
    df: "Dateisystembelegung für Pfad anzeigen",
    dig: "DNS-Namen oder IP abfragen",
    dirname: "Verzeichnisteil aus Pfad extrahieren",
    du: "Speicherverbrauch für diesen Pfad anzeigen",
    file: "Dateityp dieses Pfads erkennen",
    findmnt: "Mountpoint oder Dateisystem auswählen",
    head: "Anfang dieser Datei anzeigen",
    host: "DNS-Namen oder IP auflösen",
    less: "Datei im Pager öffnen",
    lsof: "offene Dateien für dieses Ziel anzeigen",
    ls: "Einträge für diesen Pfad anzeigen",
    mkdir: "dieses Verzeichnis erstellen",
    mv: "Quelldatei oder Quellpfad auswählen",
    nmap: "Zielhost oder Netz scannen",
    nl: "Datei mit Zeilennummern ausgeben",
    patch: "Patch-Datei oder Arbeitsverzeichnis auswählen",
    pgrep: "Prozessmuster suchen",
    ping: "Erreichbarkeit dieses Hosts testen",
    pkill: "Prozessmuster als Ziel verwenden",
    readlink: "Link-Ziel oder Pfad auflösen",
    service: "Dienst auswählen",
    ssh: "SSH-Login zu diesem Host starten",
    sort: "Datei zeilenweise sortieren",
    stat: "Dateistatus dieses Pfads anzeigen",
    sysctl: "Kernel-Parameter auswählen",
    tail: "Ende dieser Datei anzeigen",
    traceroute: "Route zu diesem Host verfolgen",
    uniq: "benachbarte Duplikate in Datei filtern",
    wc: "Zeilen, Wörter oder Bytes für Datei zählen",
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

export function getTerminalAutocompleteSuggestionDescription(
  currentCommand: string,
  suggestion: string,
) {
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
