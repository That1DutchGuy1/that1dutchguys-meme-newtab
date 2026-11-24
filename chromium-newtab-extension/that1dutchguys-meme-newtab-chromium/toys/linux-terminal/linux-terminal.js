/**
 * ============================================================
 *  🐧 DERANGED LINUX TERMINAL TOY
 *  toys/linux-terminal/linux-terminal.js
 *
 *  A fake memeified Comic Sans Linux terminal that runs in
 *  the browser. Supports the rickroll command (with real MP3
 *  sync) and a bunch of fake Linux commands for chaos.
 * ============================================================
 */

"use strict";

// ── Rickroll lyric timestamps (ported from the .deb bash script) ──────────────
const RICKROLL_LYRICS = [
  [18,  "♪ We're no strangers to love ♪"],
  [22,  "♪ You know the rules and so do I ♪"],
  [27,  "♪ A full commitment's what I'm thinking of ♪"],
  [31,  "♪ You wouldn't get this from any other guy ♪"],
  [35,  "♪ I just wanna tell you how I'm feeling ♪"],
  [40,  "♪ Gotta make you understand ♪"],
  [43,  "♪ Never gonna give you up ♪"],
  [45,  "♪ Never gonna let you down ♪"],
  [47,  "♪ Never gonna run around and desert you ♪"],
  [51,  "♪ Never gonna make you cry ♪"],
  [53,  "♪ Never gonna say goodbye ♪"],
  [55,  "♪ Never gonna tell a lie and hurt you ♪"],
  [60,  "♪ We've known each other for so long ♪"],
  [64,  "♪ Your heart's been aching but you're too shy to say it ♪"],
  [69,  "♪ Inside we both know what's been going on ♪"],
  [73,  "♪ We know the game and we're gonna play it ♪"],
  [77,  "♪ And if you ask me how I'm feeling ♪"],
  [82,  "♪ Don't tell me you're too blind to see ♪"],
  [85,  "♪ Never gonna give you up ♪"],
  [87,  "♪ Never gonna let you down ♪"],
  [89,  "♪ Never gonna run around and desert you ♪"],
  [93,  "♪ Never gonna make you cry ♪"],
  [95,  "♪ Never gonna say goodbye ♪"],
  [98,  "♪ Never gonna tell a lie and hurt you ♪"],
  [102, "♪ Never gonna give you up ♪"],
  [104, "♪ Never gonna let you down ♪"],
  [106, "♪ Never gonna run around and desert you ♪"],
  [110, "♪ Never gonna make you cry ♪"],
  [112, "♪ Never gonna say goodbye ♪"],
  [114, "♪ Never gonna tell a lie and hurt you ♪"],
  [119, "♪ (Ooh, give you up) ♪"],
  [123, "♪ (Ooh, give you up) ♪"],
  [128, "♪ Never gonna give, never gonna give ♪"],
  [130, "♪ (Give you up) ♪"],
  [132, "♪ Never gonna give, never gonna give ♪"],
  [134, "♪ (Give you up) ♪"],
  [136, "♪ We've known each other for so long ♪"],
  [141, "♪ Your heart's been aching but you're too shy to say it ♪"],
  [145, "♪ Inside we both know what's been going on ♪"],
  [149, "♪ We know the game and we're gonna play it ♪"],
  [153, "♪ I just wanna tell you how I'm feeling ♪"],
  [158, "♪ Gotta make you understand ♪"],
  [161, "♪ Never gonna give you up ♪"],
  [163, "♪ Never gonna let you down ♪"],
  [165, "♪ Never gonna run around and desert you ♪"],
  [169, "♪ Never gonna make you cry ♪"],
  [171, "♪ Never gonna say goodbye ♪"],
  [174, "♪ Never gonna tell a lie and hurt you ♪"],
  [178, "♪ Never gonna give you up ♪"],
  [180, "♪ Never gonna let you down ♪"],
  [182, "♪ Never gonna run around and desert you ♪"],
  [186, "♪ Never gonna make you cry ♪"],
  [188, "♪ Never gonna say goodbye ♪"],
  [190, "♪ Never gonna tell a lie and hurt you ♪"],
  [195, "♪ Never gonna give you up ♪"],
  [197, "♪ Never gonna let you down ♪"],
  [199, "♪ Never gonna run around and desert you ♪"],
  [203, "♪ Never gonna make you cry ♪"],
  [205, "♪ Never gonna say goodbye ♪"],
  [207, "♪ Never gonna tell a lie and hurt you ♪"],
];

// ── Fake filesystem state ────────────────────────────────────────────────────
const FS = {
  "~": {
    type: "dir",
    children: {
      "Documents": { type: "dir", children: {
        "totally-not-sus.txt": { type: "file", content: "nothing to see here\ntotally normal file\nyes very normal\nnot a bomb" },
        "my-diary.txt": { type: "file", content: "dear diary,\ntoday i installed gentoo. it only took 3 weeks.\ni have no regrets. my wife left. worth it." },
      }},
      "Downloads": { type: "dir", children: {
        "rickroll.deb": { type: "file", content: "[binary data]" },
        "definitely-not-malware.exe": { type: "file", content: "[binary data - 100% safe trust me]" },
        "linux-is-free.pdf": { type: "file", content: "FREE AS IN FREEDOM\n(and also free as in beer)" },
      }},
      "Pictures": { type: "dir", children: {
        "GNU_GNU_GNU.png": { type: "file", content: "[image] GNU with a speech bubble saying GNU" },
        "my-setup.jpg": { type: "file", content: "[image] 47 monitors, one of which shows neofetch" },
      }},
      ".bashrc": { type: "file", content: "# .bashrc\nalias ls='ls --color=auto'\nalias sudo='sudo '  # trailing space to alias next word too\nalias please='sudo'\nalias rm='echo haha nope'" },
      ".hidden-memes": { type: "file", content: "if you found this you are a true linux chad" },
    }
  }
};

let cwd = "~"; // current directory key

function resolvePath(path) {
  if (path === "~" || path === "/home/user") return "~";
  if (path.startsWith("~/")) {
    // navigate into subdirs
    const parts = path.slice(2).split("/").filter(Boolean);
    let node = FS["~"];
    for (const p of parts) {
      if (!node || node.type !== "dir" || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }
  if (path === "..") return "~"; // just go home, it's a fake fs
  if (path === ".") return FS[cwd];
  // try as a child of cwd
  const cwdNode = cwd === "~" ? FS["~"] : null;
  if (cwdNode && cwdNode.children && cwdNode.children[path]) {
    return cwdNode.children[path];
  }
  return null;
}

function getCwdNode() {
  return cwd === "~" ? FS["~"] : null;
}

function cwdDisplay() {
  return cwd === "~" ? "~" : cwd;
}

// ── LOLCAT-style rainbow text helper ────────────────────────────────────────
const RAINBOW_COLOURS = [
  "#ff4444", "#ff8800", "#ffee00", "#44ff44",
  "#00eeee", "#4488ff", "#cc44ff", "#ff44cc",
];
let _rainbowOffset = 0;

function rainbowSpan(text) {
  // Wrap each character in a colored span
  return [...text].map((ch, i) => {
    const col = RAINBOW_COLOURS[(i + _rainbowOffset) % RAINBOW_COLOURS.length];
    return `<span style="color:${col}">${ch === " " ? "&nbsp;" : escHtml(ch)}</span>`;
  }).join("");
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Fake command definitions ─────────────────────────────────────────────────
// Each returns an array of { text, rainbow?, html?, cls? } line objects,
// OR a special { special: 'rickroll' } sentinel.

function cmdHelp() {
  return [
    { text: "🐧 DERANGED LINUX TERMINAL v4.20.69-meme-xp", rainbow: true },
    { text: "" },
    { text: "Available commands:", cls: "term-green" },
    { text: "  rickroll        - Play Never Gonna Give You Up with lyrics", cls: "term-yellow" },
    { text: "  ls              - List files (they are real (they are not real))" },
    { text: "  cd <dir>        - Change directory (fake)" },
    { text: "  cat <file>      - Print file contents (fake)" },
    { text: "  pwd             - Print working directory" },
    { text: "  whoami          - Find out who you are (existential)" },
    { text: "  sudo <cmd>      - Run command as root (haha no)" },
    { text: "  apt install     - Install packages (not really)" },
    { text: "  mintupdate      - Fake Linux Mint Update Manager drama" },
    { text: "  timeshift       - Very important snapshot button that you never click" },
    { text: "  nemo            - Open the file manager (it doesn't open)" },
    { text: "  cinnamon        - Your desktop environment, but make it weird" },
    { text: "  xkill           - Point and click to kill a window (you wish)" },
    { text: "  systemctl       - Manage fake services" },
    { text: "  journalctl      - Read fake system logs" },
    { text: "  rm -rf /        - Don't." },
    { text: "  neofetch        - Absolutely necessary system info" },
    { text: "  cowsay <text>   - Important cow-based communication" },
    { text: "  fortune         - Wisdom from the terminal gods" },
    { text: "  lolcat          - Pipe anything through gay cat" },
    { text: "  sl              - You typed 'sl' instead of 'ls'. Accept your punishment." },
    { text: "  ping <host>     - Poke a server with a stick" },
    { text: "  htop            - Look at numbers go brrr" },
    { text: "  uname           - Learn about your kernel (fake kernel)" },
    { text: "  echo <text>     - Echo text back (revolutionary)" },
    { text: "  screenfetch     - Like neofetch but older and inferior" },
    { text: "  pacman          - Wrong distro, nerd" },
    { text: "  yum             - Also wrong distro" },
    { text: "  bash            - Inception" },
    { text: "  reboot          - Restart your life" },
    { text: "  shutdown        - Turn off your life" },
    { text: "  clear           - Clear the terminal" },
    { text: "  exit            - Close the terminal (coward)" },
    { text: "  help            - You are here" },
    { text: "" },
    { text: "Type 'rickroll' to experience the full multimedia experience.", cls: "term-cyan" },
  ];
}

function cmdLs(args) {
  const node = getCwdNode();
  if (!node || node.type !== "dir") return [{ text: "ls: cannot read directory: I/O error (skill issue)" }];
  const entries = Object.entries(node.children);
  if (!entries.length) return [{ text: "total 0" }];

  const lines = [{ text: "total 420" }];
  for (const [name, item] of entries) {
    const isHidden = name.startsWith(".");
    if (isHidden && !args.includes("-a") && !args.includes("-la") && !args.includes("-al")) continue;
    const isDir = item.type === "dir";
    const perm = isDir ? "drwxr-xr-x" : "-rw-r--r--";
    const size = Math.floor(Math.random() * 9000 + 100);
    const col = isDir ? "term-blue" : (name.endsWith(".deb") ? "term-yellow" : "");
    lines.push({ text: `${perm}  1 user user ${String(size).padStart(6)}  ${name}${isDir ? "/" : ""}`, cls: col });
  }
  if (!entries.length) lines.push({ text: "(empty)" });
  return lines;
}

function cmdCd(args) {
  const target = args[0];
  if (!target || target === "~" || target === "/home/user") {
    cwd = "~";
    return [];
  }
  const node = resolvePath(target.startsWith("~/") ? target : `~/${target}`);
  if (!node) return [{ text: `bash: cd: ${target}: No such file or directory`, cls: "term-red" }];
  if (node.type !== "dir") return [{ text: `bash: cd: ${target}: Not a directory`, cls: "term-red" }];
  cwd = target.replace(/^~\//, "");
  return [];
}

function cmdCat(args) {
  if (!args[0]) return [{ text: "cat: missing operand\nTry 'cat --help' for more information.", cls: "term-red" }];
  const fileName = args[0];
  const cwdNode = getCwdNode();
  const child = cwdNode?.children?.[fileName];
  if (!child) return [{ text: `cat: ${fileName}: No such file or directory`, cls: "term-red" }];
  if (child.type === "dir") return [{ text: `cat: ${fileName}: Is a directory`, cls: "term-red" }];
  return child.content.split("\n").map(l => ({ text: l }));
}

function cmdPwd() {
  const display = cwd === "~" ? "/home/user" : `/home/user/${cwd}`;
  return [{ text: display }];
}

function cmdWhoami() {
  return [
    { text: "user", cls: "term-green" },
    { text: "(also: a gigachad linux user, apparently)" },
  ];
}

function cmdSudo(args) {
  if (!args.length) return [{ text: "usage: sudo command [args]" }];
  const subcmd = args.join(" ");
  const responses = [
    "[sudo] password for user: ",
    "Sorry, try again.",
    "[sudo] password for user: ",
    "Sorry, try again.",
    "[sudo] password for user: ",
    `sudo: 3 incorrect password attempts\nsudo: you are literally banned from sudo forever`,
  ];
  // Always refuse with drama
  if (subcmd.includes("rm -rf")) {
    return [
      { text: "[sudo] password for user: ", cls: "term-yellow" },
      { text: "are you SURE you want to delete everything? (yes/no): " },
      { text: "ERROR: skill issue detected. Command aborted.", cls: "term-red" },
    ];
  }
  return [
    { text: "[sudo] password for user: ", cls: "term-yellow" },
    { text: `sudo: ${args[0]}: command not found (you don't have root anyway, nice try)`, cls: "term-red" },
  ];
}

function cmdApt(args) {
  const subcmd = args[0];
  if (subcmd === "install") {
    const pkg = args[1] || "something";
    return [
      { text: `Reading package lists... Done`, cls: "term-green" },
      { text: `Building dependency tree... Done`, cls: "term-green" },
      { text: `Reading state information... Done` },
      { text: `The following NEW packages will be installed:` },
      { text: `  ${pkg} ${pkg}-dev ${pkg}-doc lib${pkg}0 lib${pkg}-dev memes-required`, cls: "term-cyan" },
      { text: `0 upgraded, 6 newly installed, 0 to remove and 420 not upgraded.` },
      { text: `Need to get 69 MB of archives.` },
      { text: `After this operation, 420 MB of additional disk space will be used.` },
      { text: `Do you want to continue? [Y/n] Y` },
      { text: `Get:1 http://deb.debian.org/debian bookworm/main ${pkg} [69 MB]`, cls: "term-yellow" },
      { text: `Fetched 69 MB in 0s (nice MB/s)` },
      { text: `Selecting previously unselected package ${pkg}.` },
      { text: `Setting up ${pkg} (1.0.0-meme) ...` },
      { text: `✅ ${pkg} installed successfully! (probably)`, cls: "term-green" },
    ];
  }
  if (subcmd === "update") {
    return [
      { text: "Hit:1 http://deb.debian.org/debian bookworm InRelease" },
      { text: "Hit:2 http://security.debian.org bookworm-security InRelease" },
      { text: "Hit:3 http://ftp.gnu.org/gnu/bash/bash.tar.gz" },
      { text: "Get:4 https://nyancat.org/packages stable/main amd64 Packages [420 kB]" },
      { text: "420 packages can be upgraded. Run 'apt upgrade' or don't, I'm a text.", cls: "term-green" },
    ];
  }
  return [{ text: `apt: command not found. Did you mean 'sudo apt'? (also no)`, cls: "term-red" }];
}

function cmdRm(args) {
  if (args.includes("-rf") && (args.includes("/") || args.includes("/*"))) {
    return [
      { text: "rm: it is dangerous to operate recursively on '/'", cls: "term-red" },
      { text: "rm: use --no-preserve-root to override this failsafe", cls: "term-red" },
      { text: "...you weren't actually going to do that right?", cls: "term-yellow" },
      { text: "...RIGHT?", cls: "term-red" },
      { text: "🧨 Initiating fake filesystem wipe in 3... 2... 1...", cls: "term-red" },
      { text: "just kidding lol", cls: "term-green" },
    ];
  }
  const target = args.filter(a => !a.startsWith("-"))[0];
  if (!target) return [{ text: "rm: missing operand", cls: "term-red" }];
  return [{ text: `rm: cannot remove '${target}': Permission denied (skill issue)`, cls: "term-red" }];
}

function cmdNeofetch() {
  const info = [
    ["OS", "MemOS 4.20.69-meme-xp x86_64"],
    ["Host", "Meme Machine 3000 Pro Ultra Plus"],
    ["Kernel", "6.9.0-meme-generic"],
    ["Uptime", "420 days, 6 hours, 9 mins"],
    ["Shell", "meme-sh 5.2.15(1)-release"],
    ["Terminal", "Deranged Memetab Terminal v1.0"],
    ["CPU", "Intel® Meme™ i9-9900KEKW (69) @ 4.20GHz"],
    ["GPU", "NVIDIA GeForce RTX 4090 (you wish)"],
    ["Memory", "1337 MiB / 69420 MiB (kinda based)"],
  ];
  const asciiArt = [
    "         .--.           ",
    "        |o_o |          ",
    "        |:_/ |          ",
    "       //   \\ \\         ",
    "      (|     | )        ",
    "     /'\\_   _/`\\        ",
    "     \\___)=(___/        ",
  ];
  const lines = [];
  asciiArt.forEach((art, i) => {
    const kv = info[i];
    const right = kv ? `<span class="term-green">${escHtml(kv[0])}</span>: ${escHtml(kv[1])}` : "";
    lines.push({ html: `<span class="term-cyan">${escHtml(art)}</span>  ${right}` });
  });
  lines.push({ text: "" });
  lines.push({ html: `<span style="background:#ff4444;padding:0 8px">&nbsp;</span><span style="background:#ff8800;padding:0 8px">&nbsp;</span><span style="background:#ffee00;padding:0 8px">&nbsp;</span><span style="background:#44ff44;padding:0 8px">&nbsp;</span><span style="background:#00eeee;padding:0 8px">&nbsp;</span><span style="background:#4488ff;padding:0 8px">&nbsp;</span><span style="background:#cc44ff;padding:0 8px">&nbsp;</span>` });
  return lines;
}

function cmdCowsay(args) {
  const msg = args.join(" ") || "moo (try typing something)";
  const bar = "-".repeat(msg.length + 2);
  return [
    { text: ` ${bar}` },
    { text: `< ${msg} >` },
    { text: ` ${bar}` },
    { text: `        \\   ^__^` },
    { text: `         \\  (oo)\\_______` },
    { text: `            (__)\\       )\\/\\` },
    { text: `                ||----w |` },
    { text: `                ||     ||` },
  ];
}

function cmdFortune() {
  const fortunes = [
    "You will install Linux this weekend. No one will be surprised.",
    "rm -rf is not a valid solution, but sometimes it feels like it.",
    "Have you tried turning it off and not turning it back on?",
    "sudo make me a sandwich.",
    "There are only 10 types of people: those who understand binary and 9 others.",
    "It works on my machine. Ship my machine.",
    "God is real, unless declared integer.",
    "To understand recursion, you must first understand recursion.",
    "The glass is neither half empty nor half full, it's twice as large as necessary.",
    "Real programmers count from 0.",
    "I would love to change the world, but they won't give me the source code.",
    "Programming: the art of telling a computer what to do until it doesn't.",
    "In order to understand what recursion is, you need to first understand recursion.",
  ];
  const pick = fortunes[Math.floor(Math.random() * fortunes.length)];
  return [
    { text: pick, cls: "term-yellow" },
    { text: "        -- Terminal Fortune Cookie v4.20", cls: "term-cyan" },
  ];
}

function cmdPing(args) {
  const host = args[0] || "localhost";
  const ms = () => (Math.random() * 20 + 1).toFixed(3);
  return [
    { text: `PING ${host} (127.0.0.meme): 56 data bytes` },
    { text: `64 bytes from ${host}: icmp_seq=0 ttl=64 time=${ms()} ms` },
    { text: `64 bytes from ${host}: icmp_seq=1 ttl=64 time=${ms()} ms` },
    { text: `64 bytes from ${host}: icmp_seq=2 ttl=64 time=${ms()} ms` },
    { text: `64 bytes from ${host}: icmp_seq=3 ttl=64 time=${ms()} ms` },
    { text: `--- ${host} ping statistics ---` },
    { text: `4 packets transmitted, 4 received, 0% packet loss, time 69ms`, cls: "term-green" },
    { text: `rtt min/avg/max/mdev = nice/nice/nice/nice ms` },
  ];
}

function cmdHtop() {
  return [
    { text: "  CPU[|||||||||||||||||||||||||||||||||100.0%]", cls: "term-red" },
    { text: "  Mem[|||||||||||||||||||||||||||||||||420/420]", cls: "term-yellow" },
    { text: "  Swp[              0/0                      ]", cls: "term-green" },
    { text: "" },
    { text: "  PID  USER  PRI  NI  VIRT   RES  SHR  CPU%  MEM%  TIME+  Command" },
    { text: "  1337  user   20   0  420M  420M  69M  99.9  69.0  420:00  firefox (20 tabs)", cls: "term-red" },
    { text: "   420  user   20   0   69M   42M  11M   0.3   6.9    0:42  memetab", cls: "term-green" },
    { text: "     1  root   20   0    1M    1M   1M   0.0   0.0   0:00  systemd", cls: "term-cyan" },
    { text: "" },
    { text: "F1Help  F2Setup  F3Search  F4Filter  F5Tree  F6SortBy  F9Kill  F10Quit" },
    { text: "(just kidding, none of those work)" },
  ];
}

function cmdUname(args) {
  if (args.includes("-a") || args.includes("-r") || args.includes("-all")) {
    return [{ text: "Linux mememachine 6.9.0-meme-generic #420 SMP PREEMPT_DYNAMIC COMIC Mon Jan  1 00:00:00 UTC 1970 x86_64 GNU/Linux" }];
  }
  return [{ text: "Linux" }];
}

function cmdEcho(args) {
  return [{ text: args.join(" ") }];
}

function cmdMintupdate() {
  return [
    { text: "🌿 Linux Mint Update Manager", cls: "term-green" },
    { text: "Checking for updates...", cls: "term-dim" },
    { text: "" },
    { text: "Level 1 (certified safe):  kernel-headers-6.9.0-meme    [2.1 MB]", cls: "term-green" },
    { text: "Level 2 (certified safe):  mint-artwork-xp-edition       [420 KB]", cls: "term-green" },
    { text: "Level 3 (be careful):      firefox 139.0.69              [69 MB]",  cls: "term-yellow" },
    { text: "Level 4 (careful):         pulseaudio (why is this still a thing)  [13 MB]", cls: "term-yellow" },
    { text: "Level 5 (dangerous):       systemd (uh oh)               [???]",   cls: "term-red" },
    { text: "" },
    { text: "5 updates available. 1 will definitely break your audio.", cls: "term-yellow" },
    { text: "Reminder: Timeshift snapshot recommended before updating. Did you do it? No? lol.", cls: "term-cyan" },
    { text: "Installing updates... done. Reboot required. (of course it is)", cls: "term-green" },
  ];
}

function cmdTimeshift() {
  return [
    { text: "🕐 Timeshift Snapshot Manager", cls: "term-cyan" },
    { text: "" },
    { text: "Available snapshots:", cls: "term-green" },
    { text: "  2024-01-01_00:00:01  |  RSYNC  |  Before I did something stupid" },
    { text: "  2024-04-20_04:20:00  |  RSYNC  |  It's 4:20 lmao" },
    { text: "  2024-06-09_13:37:00  |  RSYNC  |  Before apt upgrade (may god have mercy)" },
    { text: "" },
    { text: "⚠ WARNING: You haven't made a snapshot in 69 days.", cls: "term-red" },
    { text: "⚠ WARNING: That 'before I did something stupid' one is looking real relevant right now.", cls: "term-yellow" },
    { text: "Create snapshot? [Y/n] Y", cls: "term-dim" },
    { text: "Creating snapshot... ████████████████ 100% done", cls: "term-green" },
    { text: "Snapshot saved as: 'I_should_have_done_this_earlier'", cls: "term-green" },
  ];
}

function cmdNemo() {
  return [
    { text: "Opening Nemo file manager...", cls: "term-green" },
    { text: "(nemo:420): Gtk-WARNING **: cannot open display: :0", cls: "term-red" },
    { text: "(nemo:420): Nemo-CRITICAL: found 69,420 files in ~/Downloads", cls: "term-yellow" },
    { text: "(nemo:420): Nemo-WARNING: 68,000 of them are named 'final_final_v3_REAL.zip'", cls: "term-yellow" },
    { text: "Segmentation fault (core dumped)", cls: "term-red" },
    { text: "nemo tried its best. it was not enough.", cls: "term-dim" },
  ];
}

function cmdCinnamon(args) {
  const sub = (args[0] || "").toLowerCase();
  if (sub === "--replace") {
    return [
      { text: "Restarting Cinnamon...", cls: "term-yellow" },
      { text: "cinnamon: lost connection to compositor", cls: "term-red" },
      { text: "cinnamon: fell back to software rendering", cls: "term-red" },
      { text: "cinnamon: fell back to staring at a blank screen", cls: "term-red" },
      { text: "cinnamon: running in fallback mode (Metacity, like it's 2004)", cls: "term-dim" },
      { text: "...actually it's fine now. Cinnamon restarted successfully.", cls: "term-green" },
    ];
  }
  return [
    { text: "Cinnamon 6.4.2 (The Good Desktop Environment™)", cls: "term-cyan" },
    { text: "  - Better than GNOME (not hard)" },
    { text: "  - Better than KDE (controversial, fight me)" },
    { text: "  - Runs on a Linux Mint machine, obviously" },
    { text: "  - Has a taskbar at the bottom like GOD INTENDED", cls: "term-green" },
    { text: "  - Desktop icons? YES. Because it's not 2015 GNOME.", cls: "term-green" },
    { text: "Try 'cinnamon --replace' to restart it dramatically.", cls: "term-dim" },
  ];
}

function cmdXkill() {
  return [
    { text: "xkill: Select the window whose client you wish to kill with button 1....", cls: "term-yellow" },
    { text: "(your cursor is now a skull. have fun.)", cls: "term-cyan" },
    { text: "xkill: killing creator of resource 0x420 (firefox)", cls: "term-red" },
    { text: "firefox: Received signal 9. Goodbye cruel world.", cls: "term-red" },
    { text: "firefox: (took 47 unsaved tabs with it)", cls: "term-red" },
    { text: "xkill: done. feel anything?", cls: "term-dim" },
  ];
}

function cmdSystemctl(args) {
  const action = args[0] || "";
  const service = args[1] || "something";
  if (action === "status") {
    return [
      { text: `● ${service}.service - ${service} (probably fine)`, cls: "term-green" },
      { text: `   Loaded: loaded (/lib/systemd/system/${service}.service; enabled)` },
      { text: `   Active: active (running) since Mon 1970-01-01 00:00:00 UTC; 420 years ago`, cls: "term-green" },
      { text: `  Process: 1337 ExecStart=/usr/bin/${service} --meme-mode (code=exited, status=0/OK)` },
      { text: ` Main PID: 69 (${service})` },
      { text: `   CGroup: /system.slice/${service}.service` },
      { text: `           └─69 /usr/bin/${service} --running-but-nobody-knows-why` },
    ];
  }
  if (action === "restart") {
    return [
      { text: `Restarting ${service}.service...`, cls: "term-yellow" },
      { text: `Stopped ${service}.service.`, cls: "term-dim" },
      { text: `Started ${service}.service.`, cls: "term-green" },
      { text: `(it's doing the same thing it was before but now it feels fresh)`, cls: "term-cyan" },
    ];
  }
  if (action === "stop") {
    return [
      { text: `Stopping ${service}.service...`, cls: "term-yellow" },
      { text: `${service}.service: Deactivating...`, cls: "term-dim" },
      { text: `Removed /run/systemd/units/invocation:${service}.service.`, cls: "term-dim" },
      { text: `${service}.service: Dead.`, cls: "term-red" },
    ];
  }
  if (action === "enable" && service === "memes") {
    return [
      { text: "Created symlink /etc/systemd/system/multi-user.target.wants/memes.service", cls: "term-green" },
      { text: "Memes enabled at boot. The machine is complete.", rainbow: true },
    ];
  }
  return [
    { text: "systemctl: missing or unknown command", cls: "term-red" },
    { text: "Try: systemctl status <service> | restart | stop | enable memes", cls: "term-dim" },
  ];
}

function cmdJournalctl(args) {
  const now = new Date().toLocaleString();
  return [
    { text: `-- Boot ID: deadbeef-cafe-babe-1337-420420420420 --`, cls: "term-dim" },
    { text: `Jan 01 00:00:01 mememachine kernel: Booting Linux 6.9.0-meme-generic`, cls: "term-green" },
    { text: `Jan 01 00:00:02 mememachine kernel: ACPI: memes enabled in BIOS`, cls: "term-green" },
    { text: `Jan 01 00:00:04 mememachine systemd[1]: Starting Load Kernel Modules...`, cls: "term-dim" },
    { text: `Jan 01 00:00:05 mememachine pulseaudio[420]: ALSA lib: broken pipe (this is fine)`, cls: "term-yellow" },
    { text: `Jan 01 00:00:06 mememachine pulseaudio[420]: ALSA lib: broken pipe (still fine)`, cls: "term-yellow" },
    { text: `Jan 01 00:00:07 mememachine pulseaudio[420]: sound: it's gone`, cls: "term-red" },
    { text: `Jan 01 00:00:08 mememachine kernel: nvidia: falling back to nouveau (rip)`, cls: "term-red" },
    { text: `Jan 01 00:00:09 mememachine cinnamon[1337]: desktop: ready (nice)`, cls: "term-green" },
    { text: `Jan 01 00:04:20 mememachine user[69]: opened 420 firefox tabs`, cls: "term-yellow" },
    { text: `Jan 01 00:04:21 mememachine kernel: OOM killer invoked. victim: firefox`, cls: "term-red" },
    { text: `Jan 01 00:04:22 mememachine user[69]: opened firefox again`, cls: "term-yellow" },
    { text: `${now} mememachine kernel: -- current moment in time (you are here) --`, cls: "term-cyan" },
  ];
}

function cmdLolcat(args) {
  const msg = args.join(" ") || "(pipe something into me next time, dingus)";
  return [
    { text: msg, rainbow: true },
  ];
}

function cmdSl() {
  return [
    { text: "        🚂💨", cls: "term-yellow" },
    { text: "   ====        ________                ___________   " },
    { text: "   _D _|  |_______/        \\__I_I_____===__|_________|  " },
    { text: "    |(_)---  |   H\\________/ |   |        =|___ ___|   " },
    { text: "    /     |  |   H  |  |     |   |         ||_| |_||   " },
    { text: "   |      |  |   H  |__--------------------| [___] |   " },
    { text: "   | ________|___H__/__|_____/[][]~\\_______|       |   " },
    { text: "   |/ |   |-----------I_____I [][] []  D   |=======|__ " },
    { text: " __/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ " },
    { text: "  |/-=|___|=    ||    ||    ||    |_______/           " },
    { text: "   \\_/      \\O=====O=====O=====O_/                    " },
    { text: "" },
    { text: "sl: You meant 'ls'. The train has been dispatched as punishment.", cls: "term-yellow" },
  ];
}

function cmdScreenfetch() {
  // Same as neofetch but with self-awareness
  const neofetchLines = cmdNeofetch();
  return [
    ...neofetchLines,
    { text: "" },
    { text: "screenfetch: You know neofetch exists, right?", cls: "term-yellow" },
    { text: "screenfetch: ...okay fine, same output.", cls: "term-dim" },
  ];
}

function cmdPacman(args) {
  return [
    { text: "pacman: command not found", cls: "term-red" },
    { text: "This is a Debian/Mint-based system, bestie.", cls: "term-yellow" },
    { text: "You want 'apt'. Or 'apt-get'. Or 'nala' if you're fancy.", cls: "term-cyan" },
    { text: "Go back to Arch, nerd. (affectionate)", cls: "term-green" },
  ];
}

function cmdYum(args) {
  return [
    { text: "yum: command not found", cls: "term-red" },
    { text: "yum is for RPM-based distros (Fedora, RHEL, CentOS etc.)", cls: "term-yellow" },
    { text: "This machine runs Linux Mint. We use apt here.", cls: "term-cyan" },
    { text: "Also yum was deprecated in favour of dnf years ago lmaooo", cls: "term-green" },
  ];
}

function cmdBash(args) {
  return [
    { text: "bash-5.2$ ", cls: "term-green" },
    { text: "(you opened bash inside the fake bash. congratulations.)", cls: "term-cyan" },
    { text: "(it's the same fake bash. turtles all the way down.)", cls: "term-dim" },
    { text: "bash-5.2$ exit", cls: "term-dim" },
    { text: "exit", cls: "term-dim" },
  ];
}

function cmdReboot(args) {
  return [
    { text: "Broadcast message from root@mememachine (pts/0) (Fri Jan  1 00:00:00 1970):", cls: "term-yellow" },
    { text: "The system is going down for reboot NOW!", cls: "term-red" },
    { text: "" },
    { text: "Connection to mememachine closed.", cls: "term-dim" },
    { text: "...jk, it's a fake terminal. it's not going anywhere.", cls: "term-cyan" },
    { text: "but imagine if it did lol", cls: "term-dim" },
  ];
}

function cmdShutdown(args) {
  return [
    { text: "Shutdown scheduled for NOW!", cls: "term-red" },
    { text: "Broadcast message from root@mememachine:", cls: "term-yellow" },
    { text: "The system is shutting down. Save your work. LOL what work.", cls: "term-red" },
    { text: "" },
    { text: "Stopping all services...", cls: "term-dim" },
    { text: "Stopped pulseaudio. (finally, some peace)", cls: "term-green" },
    { text: "Stopped NetworkManager. (...wait)", cls: "term-yellow" },
    { text: "Stopped systemd-journald. good riddance.", cls: "term-dim" },
    { text: "Reached target Shutdown. Powering off.", cls: "term-red" },
    { text: "" },
    { text: "[ ok ] but actually nah, it's fake. have a great day 👋", cls: "term-green" },
  ];
}

// ── Command dispatch table ───────────────────────────────────────────────────
const COMMANDS = {
  help:     (args) => cmdHelp(),
  "?":      (args) => cmdHelp(),
  ls:       (args) => cmdLs(args),
  dir:      (args) => cmdLs(args),
  cd:       (args) => cmdCd(args),
  cat:      (args) => cmdCat(args),
  pwd:      (args) => cmdPwd(),
  whoami:   (args) => cmdWhoami(),
  sudo:     (args) => cmdSudo(args),
  apt:      (args) => cmdApt(args),
  "apt-get":(args) => cmdApt(args),
  rm:       (args) => cmdRm(args),
  neofetch: (args) => cmdNeofetch(),
  cowsay:   (args) => cmdCowsay(args),
  fortune:  (args) => cmdFortune(),
  ping:     (args) => cmdPing(args),
  htop:     (args) => cmdHtop(),
  top:      (args) => cmdHtop(),
  uname:    (args) => cmdUname(args),
  echo:     (args) => cmdEcho(args),
  printf:   (args) => cmdEcho(args),
  rickroll: (args) => [{ special: "rickroll" }],
  clear:    (args) => [{ special: "clear" }],
  exit:     (args) => [{ special: "exit" }],
  quit:     (args) => [{ special: "exit" }],
  // some easter eggs
  vim:      (args) => [
    { text: "entering vim...", cls: "term-green" },
    { text: "how do you exit vim?", cls: "term-yellow" },
    { text: "ESC :wq — if you even know what that means", cls: "term-cyan" },
    { text: "(press any key — wait, that's not how vim works)", cls: "term-red" },
    { text: "forcefully ejected from vim: skill issue detected", cls: "term-green" },
  ],
  nano:     (args) => [
    { text: "opening nano...", cls: "term-green" },
    { text: "^X Exit  ^O Write  ^W Search  ^K Cut  ^U Paste" },
    { text: "(nano user detected: based and accessible-pilled)", cls: "term-green" },
    { text: "nano closed because this terminal doesn't actually open files. skill issue.", cls: "term-yellow" },
  ],
  emacs:    (args) => [
    { text: "starting emacs...", cls: "term-green" },
    { text: "loading emacs, please wait...", cls: "term-yellow" },
    { text: "still loading...", cls: "term-yellow" },
    { text: "making coffee while emacs loads...", cls: "term-yellow" },
    { text: "emacs has been loading for 3 days", cls: "term-red" },
    { text: "ERROR: not enough RAM (you only have 64GB installed)", cls: "term-red" },
  ],
  git:      (args) => {
    const sub = args[0];
    if (sub === "commit") return [
      { text: `[main (root-commit) deadbee] ${args.slice(2).join(" ") || "fix stuff"}`, cls: "term-green" },
      { text: " 420 files changed, 69000 insertions(+), 0 deletions(-)" },
    ];
    if (sub === "push") return [
      { text: "Enumerating objects: 420, done.", cls: "term-green" },
      { text: "To github.com:you/your-project.git" },
      { text: "   deadbee..cafebabe  main -> main" },
    ];
    if (sub === "blame") return [
      { text: "it was definitely you. all of it.", cls: "term-red" },
    ];
    return [{ text: "git: command worked but nothing actually happened (fake fs)", cls: "term-yellow" }];
  },
  python:   (args) => [
    { text: "Python 3.12.0 (fake, Dec 24 2023, 00:00:00)", cls: "term-green" },
    { text: "Type 'help', 'copyright', 'credits' or 'license' for more information." },
    { text: ">>> ", cls: "term-green" },
    { text: "(this is a terminal inside a terminal. inception.)", cls: "term-cyan" },
    { text: ">>> import this" },
    { text: "The Zen of Python, by Tim Peters", cls: "term-yellow" },
    { text: "Beautiful is better than ugly." },
    { text: "Although 'beautiful' and 'meme' are synonyms. Exiting REPL." },
  ],
  python3:  (args) => COMMANDS.python(args),
  make:     (args) => [
    { text: "gcc -Wall -Wextra -pedantic -o output main.c", cls: "term-cyan" },
    { text: "main.c:1:1: warning: this is fine [-Wthisisfine]", cls: "term-yellow" },
    { text: "main.c:420:69: error: 'skill' undeclared (first use in this function)", cls: "term-red" },
    { text: "make: *** [Makefile:1: output] Error 1", cls: "term-red" },
  ],
  history:  (args) => [
    { text: "    1  sudo rm -rf / --no-preserve-root" },
    { text: "    2  oh god no" },
    { text: "    3  WAIT" },
    { text: "    4  please" },
    { text: "    5  okay it only deleted /tmp thankfully" },
    { text: "    6  fortune" },
    { text: "    7  cowsay moo" },
    { text: "    8  rickroll" },
    { text: "    9  history" },
  ],
  date:     (args) => [{ text: new Date().toString() }],
  uptime:   (args) => [{ text: "up 420 days, 6:09, 1 user, load average: 4.20, 6.09, 13.37" }],
  df:       (args) => [
    { text: "Filesystem     1K-blocks      Used  Available Use% Mounted on" },
    { text: "/dev/sda1      420420420  69420000  350999420  17% /", cls: "term-green" },
    { text: "tmpfs            6942042         0    6942042   0% /dev/shm" },
    { text: "/dev/sdb1       42000000  41999999          1 100% /home/user/memes", cls: "term-red" },
  ],
  // ── Linux Mint-specific commands ──────────────────────────────────────────
  mintupdate:  (args) => cmdMintupdate(),
  timeshift:   (args) => cmdTimeshift(),
  nemo:        (args) => cmdNemo(),
  cinnamon:    (args) => cmdCinnamon(args),
  xkill:       (args) => cmdXkill(),
  systemctl:   (args) => cmdSystemctl(args),
  journalctl:  (args) => cmdJournalctl(args),
  lolcat:      (args) => cmdLolcat(args),
  sl:          (args) => cmdSl(),
  screenfetch: (args) => cmdScreenfetch(),
  pacman:      (args) => cmdPacman(args),
  yum:         (args) => cmdYum(args),
  dnf:         (args) => cmdYum(args), // dnf gets the same treatment lol
  bash:        (args) => cmdBash(args),
  sh:          (args) => cmdBash(args),
  zsh:         (args) => [
    { text: "zsh 5.9 (meme-generic-pc-linux-gnu)", cls: "term-green" },
    { text: "Oh My Zsh not found. You could install it. Or you could have a life. Your call.", cls: "term-yellow" },
    { text: "% ", cls: "term-dim" },
    { text: "(it's still the fake terminal. the prompt just looks fancier now.)", cls: "term-dim" },
  ],
  reboot:      (args) => cmdReboot(args),
  shutdown:    (args) => cmdShutdown(args),
  poweroff:    (args) => cmdShutdown(args),
  // some more easter eggs
  nala:        (args) => [
    { text: "nala: a prettier frontend for apt. very based choice.", cls: "term-green" },
    { text: "nala fetch -- finding fastest mirrors...", cls: "term-cyan" },
    { text: "1. ftp.linux-mint.com    ████████████████ 69 MB/s  🏆", cls: "term-green" },
    { text: "2. mirror.memes.org      ████████░░░░░░░░ 42 MB/s", cls: "term-yellow" },
    { text: "3. us.archive.ubuntu.com █░░░░░░░░░░░░░░░  1 MB/s  💀", cls: "term-red" },
    { text: "nala: would fetch but this is fake. apt is the real homie anyway.", cls: "term-dim" },
  ],
  flatpak:     (args) => [
    { text: "Flatpak: the app runs in a sandbox!", cls: "term-green" },
    { text: "The sandbox has access to: your home folder, dbus, network, display, pipewire,", cls: "term-yellow" },
    { text: "                           wayland, x11, your soul, and 3 Wayland compositors.", cls: "term-yellow" },
    { text: "Very sandboxed. Very secure. 👍", cls: "term-cyan" },
  ],
  snap:        (args) => [
    { text: "ERROR: snap: command refused on moral grounds.", cls: "term-red" },
    { text: "This machine respects itself.", cls: "term-yellow" },
    { text: "Use flatpak or apt like a civilised person.", cls: "term-cyan" },
  ],
  curl:        (args) => {
    const url = args.find(a => !a.startsWith("-")) || "nothing";
    return [
      { text: `  % Total    % Received  % Xferd  Average Speed   Time    Current`, cls: "term-dim" },
      { text: `                                   Dload  Upload   Total`, cls: "term-dim" },
      { text: `100  420k  100  420k    0     0  69420      0  0:00:06  0:00:06 --:--:-- 69420`, cls: "term-green" },
      { text: `curl: (0) ${url}: contents were vibes. piped into /dev/null.`, cls: "term-cyan" },
    ];
  },
  wget:        (args) => {
    const url = args[0] || "http://nothing";
    return [
      { text: `--2024-04-20 04:20:00--  ${url}`, cls: "term-dim" },
      { text: `Resolving ${url}... 127.0.0.meme`, cls: "term-dim" },
      { text: `Connecting to ${url}|127.0.0.meme|:80... connected.`, cls: "term-green" },
      { text: `HTTP request sent, awaiting response... 200 OK` },
      { text: `Length: 69420 (68K) [application/meme]` },
      { text: `Saving to: 'definitely-not-malware'` },
      { text: `definitely-not-malware   100%[===================>]  68.00K  --.-KB/s   in 0.4s`, cls: "term-green" },
      { text: `2024-04-20 04:20:01 (nice KB/s) - 'definitely-not-malware' saved [69420/69420]`, cls: "term-green" },
    ];
  },
};

// ── Public API ───────────────────────────────────────────────────────────────
export { COMMANDS, RICKROLL_LYRICS, escHtml, rainbowSpan, cwdDisplay };