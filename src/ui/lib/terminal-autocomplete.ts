import {
  TERMINAL_AUTOCOMPLETE_COMMANDS,
  TERMINAL_AUTOCOMPLETE_HELP_BY_COMMAND,
  type TerminalAutocompleteHelp,
} from "@/lib/terminal-command-help.ts";
import {
  getTerminalAutocompleteHelpDescriptionText,
  getTerminalAutocompleteI18nResource,
  TERMINAL_AUTOCOMPLETE_I18N_RESOURCES,
  type TerminalAutocompleteI18nResource,
} from "@/lib/terminal-autocomplete-i18n.ts";

export type { TerminalAutocompleteHelp } from "@/lib/terminal-command-help.ts";

export interface TerminalAutocompleteSettings {
  ghost: boolean;
  popup: boolean;
  popupAuto: boolean;
  help: boolean;
  /** @deprecated Use ghost. Kept so older callers can migrate without breaking. */
  inline: boolean;
}

export interface TerminalAutocompleteHostCapabilities {
  osFamily?: string;
  osId?: string;
  osIdLike?: string[];
  commands?: string[];
  initSystems?: string[];
  serviceProviders?: string[];
  packageManagers?: string[];
  commandCatalogs?: string[];
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
const BASH_BUILTIN_ECHO_OPTION_CANDIDATES = new Set([
  "echo -n",
  "echo -e",
  "echo -E",
]);
const BASH_BUILTIN_ECHO_ESCAPE_CANDIDATES = new Set([
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
]);
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
const DIG_TARGET_OPTION_ARGUMENTS = new Set(["-b", "-k", "-p", "-y"]);
const HOST_TARGET_OPTION_ARGUMENTS = new Set(["-c", "-m", "-R", "-t", "-W"]);
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
const COMMON_FIND_SIZE_VALUES = ["+1M", "+10M", "+100M", "+1G", "-1M", "0"];
const COMMON_FIND_DEPTH_VALUES = ["1", "2", "3", "4", "5"];
const COMMON_FIND_PERM_VALUES = ["644", "755", "600", "700", "/111", "-u+x"];
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
const COMMON_PORTS = [
  "22",
  "80",
  "443",
  "2222",
  "3000",
  "5432",
  "3306",
  "6379",
  "8080",
];
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
const COMMON_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];
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
const COMMON_DNS_RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "NS",
  "TXT",
  "SRV",
  "CAA",
];
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
  hostCapabilities?: TerminalAutocompleteHostCapabilities | null;
  runtimeCommands?: string[];
  serviceNames?: string[];
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
    "-lah",
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
  iostat: ["-xz 1", "-p ALL", "-m 1 5", "-d sda 1", "-c 1", "-h", "-y 1"],
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
  make: [
    "build",
    "test",
    "install",
    "clean",
    "lint",
    "run",
    "help",
    "-j",
    "-C",
  ],
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
  psql: ["-h", "-U", "-d", "-c", "-f", "-l", "\\dt", "\\d", "-A", "-t"],
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
    '-g "daemon off;"',
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
  fg: [
    "%1",
    "%2",
    "%3",
    "%%",
    "%+",
    "%-",
    "%?ssh",
    "%?python",
    "%vim",
    "%nano",
    "%<job>",
  ],
  bg: [
    "%1",
    "%2",
    "%3",
    "%%",
    "%+",
    "%-",
    "%?ssh",
    "%?python",
    "%vim",
    "%nano",
    "%<job>",
  ],
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
  return /^-[A-Za-z]+$/.test(token) || /^\\[A-Za-z0-9]+$/.test(token)
    ? token
    : token.toLowerCase();
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
    originalIndex / 10000 +
    getAutocompletePriorityAdjustment(effectiveCandidate);

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

const CAPABILITY_GATED_COMMANDS = new Set([
  "apt",
  "apt-cache",
  "apt-get",
  "busctl",
  "coredumpctl",
  "dnf",
  "dpkg",
  "journalctl",
  "localectl",
  "loginctl",
  "machinectl",
  "makepkg",
  "networkctl",
  "pacman",
  "paru",
  "pkg",
  "rc-service",
  "resolvectl",
  "service",
  "sysrc",
  "systemctl",
  "systemd-analyze",
  "ufw",
  "yay",
  "yum",
  "zypper",
]);

function getCapabilityCommandSet(
  capabilities: TerminalAutocompleteHostCapabilities | null | undefined,
) {
  const commands = capabilities?.commands ?? [];
  if (commands.length === 0) {
    return null;
  }

  return new Set(commands.map((command) => command.toLowerCase()));
}

function isCandidateAllowedByHostCapabilities(
  candidate: string,
  capabilities: TerminalAutocompleteHostCapabilities | null | undefined,
) {
  const availableCommands = getCapabilityCommandSet(capabilities);
  if (!availableCommands) {
    return true;
  }

  const executable = getEffectiveExecutable(candidate).toLowerCase();
  if (!executable || !CAPABILITY_GATED_COMMANDS.has(executable)) {
    return true;
  }

  return availableCommands.has(executable);
}

function buildRuntimeCommandSuggestions(
  context: TerminalAutocompleteContext,
  runtimeCommands: string[] = [],
) {
  const effective = context.matchCommand.trim();
  const tokens = splitCommandTokens(context.matchCommand);

  if (tokens.length > 1 || effective.includes(" ")) {
    return [];
  }

  return uniqueDerivedValues(runtimeCommands)
    .filter((command) => /^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(command))
    .map((command) => withAutocompleteContextPrefix(context, command));
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

  if (!strippedWrapper || matchCommand.startsWith("-")) {
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

function getBashBuiltinEchoLastArgument(command: string) {
  const match = command.match(/^\s*echo(?:\s+(.*))?$/i);
  if (!match) {
    return null;
  }

  const argumentsText = match[1] ?? "";
  if (!argumentsText) {
    return /\s$/.test(command) ? "" : null;
  }
  if (/\s$/.test(command)) {
    return "";
  }

  const argumentTokens = argumentsText.split(/\s+/).filter(Boolean);
  return argumentTokens[argumentTokens.length - 1] ?? "";
}

function isBashBuiltinEchoCandidateAllowed(
  candidate: string,
  context: TerminalAutocompleteContext,
) {
  if (getKnownCommandName(context.matchCommand) !== "echo") {
    return true;
  }

  const effectiveCandidate = getEffectiveCandidate(candidate, context)
    .trim()
    .replace(/\s+/g, " ");
  if (getKnownCommandName(effectiveCandidate) !== "echo") {
    return true;
  }

  const lastArgument = getBashBuiltinEchoLastArgument(context.matchCommand);
  if (lastArgument === null) {
    return true;
  }

  if (lastArgument.startsWith("\\")) {
    return BASH_BUILTIN_ECHO_ESCAPE_CANDIDATES.has(effectiveCandidate);
  }

  if (lastArgument === "" || lastArgument.startsWith("-")) {
    return BASH_BUILTIN_ECHO_OPTION_CANDIDATES.has(effectiveCandidate);
  }

  return false;
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
      !["search", "show", "policy", "depends", "rdepends"].includes(subcommand)
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
      ].some((candidate) => candidate.toLowerCase() === option)
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

    if (
      optionsWithArguments.has(token) ||
      optionsWithArguments.has(normalizedToken)
    ) {
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
  if (
    !FILE_TARGET_COMMANDS.has(executable) ||
    tokens.length < 2 ||
    tokens.length > 3
  ) {
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
  if (
    !FILE_SOURCE_COMMANDS.has(executable) ||
    tokens.length < 2 ||
    tokens.length > 3
  ) {
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

function getTrailingCommandSuggestionPrefix(
  command: string,
  commands: string[],
) {
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
    if (
      ["--arg", "--argjson", "--slurpfile", "--rawfile", "-f"].includes(option)
    ) {
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
  serviceNameCandidates: string[] = [],
) {
  const suggestions: string[] = [];
  const availableSystemdUnits = uniqueDerivedValues(
    systemdUnits.filter(isLikelySystemdUnitTarget),
  );
  const systemdUnitTargets = availableSystemdUnits;
  const runtimeServiceNames = uniqueDerivedValues(
    [
      ...serviceNameCandidates,
      ...availableSystemdUnits.map(getServiceNameFromSystemdUnit),
    ].filter(isLikelyServiceName),
  );
  const serviceNames =
    runtimeServiceNames.length > 0 ? runtimeServiceNames : COMMON_SERVICE_NAMES;
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
  const scpRemotePrefix = getRemoteDestinationPrefix(
    context.matchCommand,
    "scp",
  );
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
    [
      "short",
      "short-iso",
      "short-precise",
      "cat",
      "json",
      "json-pretty",
    ].forEach((format) => {
      suggestions.push(`${journalctlOutputPrefix}${format}`);
    });
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
    .map((command) =>
      splitCommandTokens(getAutocompleteContext(command).matchCommand),
    );
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
      const createFlagIndex = tokens.findIndex(
        (token, index) => index > 1 && ["-b", "-c", "--create"].includes(token),
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
      const deleteFlagIndex = tokens.findIndex(
        (token, index) => index > 1 && ["-d", "-D", "--delete"].includes(token),
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
    const remote = ["pull", "push", "fetch"].includes(subcommand)
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
    targets.push(
      getNetworkHostFromSshTarget(getRemoteDestinationHost(destination)),
    );
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
  const pathValue = stripShellQuotes(value)
    .trim()
    .replace(/[\\/]+$/, "");
  const slashIndex = Math.max(
    pathValue.lastIndexOf("/"),
    pathValue.lastIndexOf("\\"),
  );
  return slashIndex >= 0 ? pathValue.slice(slashIndex + 1) : pathValue;
}

function getPathParentDirectory(value: string) {
  const pathValue = stripShellQuotes(value)
    .trim()
    .replace(/[\\/]+$/, "");
  const slashIndex = Math.max(
    pathValue.lastIndexOf("/"),
    pathValue.lastIndexOf("\\"),
  );

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

    if (
      optionsWithArguments.has(token) ||
      optionsWithArguments.has(normalizedToken)
    ) {
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
    if (
      tokens[0]?.toLowerCase() !== "tail" ||
      tokens[1]?.toLowerCase() !== "-f"
    ) {
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

    if (
      TEXT_EDITOR_COMMANDS.has(executable) ||
      FILE_VALUE_COMMANDS.has(executable)
    ) {
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
      extractTarDirectoriesFromHistory([tokens.join(" ")]).forEach(
        (directory) => {
          directories.push(directory);
        },
      );
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

      const tokens = splitCommandTokens(
        getAutocompleteContext(command).matchCommand,
      );
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
  const scpRemotePrefix = getRemoteDestinationPrefix(
    context.matchCommand,
    "scp",
  );
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
  const serviceNamePrefix = getServiceNameSuggestionPrefix(
    context.matchCommand,
  );
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
    getSubcommandValueSuggestionPrefix(
      context.matchCommand,
      "systemd-analyze",
      ["verify", "critical-chain"],
    ),
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
  const hostCapabilities = options.hostCapabilities ?? null;
  const runtimeCommands = options.runtimeCommands ?? [];
  const runtimeServiceNames = options.serviceNames ?? [];
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
      !isBashBuiltinEchoCandidateAllowed(trimmedCandidate, context) ||
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
      (source === "catalog" &&
        !isCandidateAllowedByHostCapabilities(
          trimmedCandidate,
          hostCapabilities,
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
      const unwrappedCandidate = getPrivilegeUnwrappedCommand(trimmedCandidate);

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

  buildRuntimeCommandSuggestions(context, runtimeCommands).forEach(
    (candidate) => appendMatch(candidate, "catalog"),
  );
  buildContextualCatalogSuggestions(
    context,
    availableSystemdUnits,
    runtimeServiceNames,
  ).forEach((candidate) => appendMatch(candidate, "catalog"));
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

  if (commandTokenCount === 0 || suggestionTokens.length <= commandTokenCount) {
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

  if (commandTokenCount === 0 || currentTokens.length <= commandTokenCount) {
    return "";
  }

  return currentTokens.slice(commandTokenCount).join(" ");
}

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
  const lastOptionName = lastOptionIndex !== -1 ? tokens[lastOptionIndex] : "";
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

function getValueSuggestionDescription(
  command: string,
  label: string,
  resource: TerminalAutocompleteI18nResource,
) {
  const normalizedLabel = label.trim();
  if (
    !normalizedLabel ||
    normalizedLabel.startsWith("-") ||
    PLACEHOLDER_RE.test(normalizedLabel)
  ) {
    return "";
  }

  return resource.valueDescriptions[command] ?? "";
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

function getContextualSuggestionDescription(
  command: string,
  label: string,
  resource: TerminalAutocompleteI18nResource,
) {
  const tokens = label.trim().split(/\s+/).filter(Boolean);
  const subcommand = tokens[0] ?? "";
  const contextualDetails =
    resource.contextualSuggestionDetails[command]?.[subcommand];

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

export interface TerminalAutocompleteDescriptionOptions {
  language?: string;
}

export function getTerminalAutocompleteHelpDescription(
  help: TerminalAutocompleteHelp,
  options: TerminalAutocompleteDescriptionOptions = {},
) {
  return getTerminalAutocompleteHelpDescriptionText(
    help.command,
    options.language,
  );
}

export function getTerminalAutocompleteSuggestionDescription(
  currentCommand: string,
  suggestion: string,
  options: TerminalAutocompleteDescriptionOptions = {},
) {
  const resource = getTerminalAutocompleteI18nResource(options.language);
  const fallbackResource = TERMINAL_AUTOCOMPLETE_I18N_RESOURCES.en;

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
      resource.suggestionDetails[directHelp.command] ??
      fallbackResource.suggestionDetails[directHelp.command];

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
  const detailMap =
    resource.suggestionDetails[help.command] ??
    fallbackResource.suggestionDetails[help.command];

  if (detailMap) {
    const contextualDescription = getContextualSuggestionDescription(
      help.command,
      displayLabel,
      resource,
    );
    const fallbackContextualDescription =
      contextualDescription ||
      getContextualSuggestionDescription(
        help.command,
        displayLabel,
        fallbackResource,
      );
    if (fallbackContextualDescription) {
      return fallbackContextualDescription;
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
    resource,
  );
  const fallbackValueDescription =
    valueDescription ||
    getValueSuggestionDescription(help.command, displayLabel, fallbackResource);
  if (fallbackValueDescription) {
    return fallbackValueDescription;
  }

  return getTerminalAutocompleteHelpDescriptionText(
    help.command,
    options.language,
  );
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
