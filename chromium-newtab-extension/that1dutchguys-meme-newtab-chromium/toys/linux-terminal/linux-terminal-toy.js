/**
 * ============================================================
 *  🐧 DERANGED LINUX TERMINAL — Toy Adapter
 *  toys/linux-terminal/linux-terminal-toy.js
 *
 *  Implements the toybox toy adapter contract:
 *    export default { id, mount(container), unmount() }
 *
 *  Drops a draggable, resizable fake Linux terminal window
 *  onto the page. Supports rickroll (with real MP3 + synced
 *  lyrics), neofetch, cowsay, sudo, rm -rf, and more meme
 *  Linux commands.
 *
 *  The MP3 lives at:
 *    toys/linux-terminal/audio/never-gonna-give-you-up.mp3
 *  (no base64 — it's loaded via a relative URL at runtime)
 * ============================================================
 */

"use strict";

import {
  COMMANDS,
  RICKROLL_LYRICS,
  escHtml,
  rainbowSpan,
  cwdDisplay,
} from './linux-terminal.js';

// ── Toybox kill callback (injected on mount so exit/close deactivates panel) ─
let _killSelf = null;

// ── Resolve paths relative to this file's location (extension root anchor) ──
const _toyRoot = new URL('./', import.meta.url).href;
const MP3_URL  = new URL('audio/never-gonna-give-you-up.mp3', _toyRoot).href;
const CSS_URL  = new URL('linux-terminal.css', _toyRoot).href;

// ── Module-level state (cleaned up on unmount) ───────────────────────────────
let _styleEl    = null;
let _wrapper    = null;
let _window     = null;
let _outputEl   = null;
let _inputEl    = null;
let _promptEl   = null;
let _audio      = null;
let _lyricTimer = null;
let _rickrolling = false;
let _history    = [];
let _histIdx    = -1;

// ── Helpers ──────────────────────────────────────────────────────────────────

function _injectCSS() {
  if (document.querySelector(`link[data-linux-terminal-css]`)) return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = CSS_URL;
  link.dataset.linuxTerminalCss = '1';
  document.head.appendChild(link);
  _styleEl = link;
}

function _removeCSS() {
  if (_styleEl) { _styleEl.remove(); _styleEl = null; }
}

/** Append a line to the terminal output */
function _writeLine(lineObj) {
  const el = document.createElement('span');
  el.className = 'term-line' + (lineObj.cls ? ` ${lineObj.cls}` : '');

  if (lineObj.rainbow) {
    el.innerHTML = rainbowSpan(lineObj.text);
  } else if (lineObj.html) {
    el.innerHTML = lineObj.html;
  } else {
    el.textContent = lineObj.text ?? '';
  }

  _outputEl.appendChild(el);
  _scrollToBottom();
}

/** Write the prompt echo line (user input, greyed) */
function _writePrompt(cmd) {
  const el = document.createElement('span');
  el.className = 'term-line';
  el.innerHTML =
    `<span class="term-prompt">${escHtml(_promptString())}</span>` +
    `<span class="term-cmd"> ${escHtml(cmd)}</span>`;
  _outputEl.appendChild(el);
}

function _promptString() {
  return `user@mememachine:${cwdDisplay()}$`;
}

function _updatePromptLabel() {
  if (_promptEl) _promptEl.textContent = _promptString() + ' ';
}

function _scrollToBottom() {
  _outputEl.scrollTop = _outputEl.scrollHeight;
}

/** Clear all output */
function _clearOutput() {
  _outputEl.innerHTML = '';
}

// ── Rickroll sequence ────────────────────────────────────────────────────────

function _stopRickroll() {
  _rickrolling = false;
  if (_lyricTimer !== null) { clearInterval(_lyricTimer); _lyricTimer = null; }
  if (_audio) {
    _audio.pause();
    _audio.currentTime = 0;
  }
  _setInputEnabled(true);
}

function _startRickroll() {
  _rickrolling = true;
  _setInputEnabled(false);

  _writeLine({ rainbow: true, text: '' });
  _writeLine({ rainbow: true, text: '  🎵  NEVER GONNA GIVE YOU UP  🎵  ' });
  _writeLine({ rainbow: true, text: '          Rick Astley (1987)           ' });
  _writeLine({ text: '' });
  _writeLine({ text: 'Loading audio...', cls: 'term-dim' });

  // Create audio element (no base64, just the MP3 URL)
  _audio = new Audio(MP3_URL);
  _audio.volume = 0.6;

  _audio.addEventListener('canplaythrough', () => {
    // Remove the "Loading audio..." line visually by replacing it
    const dimLines = _outputEl.querySelectorAll('.term-dim');
    dimLines.forEach(l => l.remove());

    _writeLine({ text: 'mpv --no-video --really-quiet never-gonna-give-you-up.mp3', cls: 'term-cyan' });
    _writeLine({ text: '(+) Audio --aid=1 (mp3 2ch 44100Hz)', cls: 'term-dim' });
    _writeLine({ text: '' });

    _audio.play().catch(err => {
      _writeLine({ text: `Audio error: ${err.message} (try clicking the page first)`, cls: 'term-red' });
      _writeLine({ text: 'Showing lyrics anyway...', cls: 'term-yellow' });
    });

    const startTime = Date.now();
    let lyricIdx = 0;

    _lyricTimer = setInterval(() => {
      if (!_rickrolling) return;
      const elapsed = (Date.now() - startTime) / 1000;

      while (lyricIdx < RICKROLL_LYRICS.length && elapsed >= RICKROLL_LYRICS[lyricIdx][0]) {
        const lyric = RICKROLL_LYRICS[lyricIdx][1];
        const el = document.createElement('span');
        el.className = 'term-line rickroll-lyric';
        el.innerHTML = rainbowSpan(lyric);
        _outputEl.appendChild(el);
        lyricIdx++;
        _scrollToBottom();
      }

      if (lyricIdx >= RICKROLL_LYRICS.length) {
        clearInterval(_lyricTimer);
        _lyricTimer = null;
      }
    }, 100);
  }, { once: true });

  _audio.addEventListener('ended', () => {
    _rickrolling = false;
    _setInputEnabled(true);
    if (_lyricTimer !== null) { clearInterval(_lyricTimer); _lyricTimer = null; }
    _writeLine({ text: '' });
    _writeLine({ rainbow: true, text: '  🎵  u just got rickrolled. classic. 🎵  ' });
    _writeLine({ rainbow: true, text: '             - Rick Astley, 1987             ' });
    _writeLine({ text: '' });
    _updatePromptLabel();
  }, { once: true });

  _audio.addEventListener('error', () => {
    _writeLine({ text: `ERROR: could not load MP3. Is the file at toys/linux-terminal/audio/?`, cls: 'term-red' });
    _rickrolling = false;
    _setInputEnabled(true);
  }, { once: true });

  _audio.load();
}

function _setInputEnabled(enabled) {
  if (!_inputEl) return;
  _inputEl.disabled = !enabled;
  if (enabled) {
    _inputEl.placeholder = '';
    _inputEl.focus();
  } else {
    _inputEl.placeholder = 'playing... type "stop" to kill it';
    _inputEl.disabled = false; // keep enabled so "stop" can be typed
  }
}

// ── Command execution ────────────────────────────────────────────────────────

function _runCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  // Track history
  if (_history[_history.length - 1] !== trimmed) _history.push(trimmed);
  _histIdx = _history.length;

  _writePrompt(trimmed);

  const parts = trimmed.split(/\s+/);
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);

  // Special handling while rickrolling
  if (_rickrolling && (cmd === 'stop' || cmd === 'exit' || cmd === 'quit' || cmd === 'q')) {
    _stopRickroll();
    _writeLine({ text: 'mpv: Exiting... (stop)', cls: 'term-dim' });
    _writeLine({ text: 'lmao u got rickrolled. have a nice day 🎵', cls: 'term-yellow' });
    _updatePromptLabel();
    return;
  }

  if (!(cmd in COMMANDS)) {
    _writeLine({ text: `bash: ${cmd}: command not found`, cls: 'term-red' });
    _writeLine({ text: `Did you mean something else? Type 'help' for available commands.`, cls: 'term-dim' });
    _updatePromptLabel();
    return;
  }

  const result = COMMANDS[cmd](args);

  for (const line of result) {
    if (line.special === 'rickroll') {
      _startRickroll();
      return; // don't update prompt yet — rickroll takes over
    }
    if (line.special === 'clear') {
      _clearOutput();
      _updatePromptLabel();
      return;
    }
    if (line.special === 'exit') {
      _writeLine({ text: 'logout', cls: 'term-dim' });
      setTimeout(() => _killSelf ? _killSelf() : terminalToy.unmount(), 600);
      return;
    }
    _writeLine(line);
  }

  _updatePromptLabel();
}

// ── Drag logic ───────────────────────────────────────────────────────────────

function _makeDraggable(winEl, titleBar) {
  let startX, startY, startLeft, startTop;

  // Initial centered position
  winEl.style.left = `${Math.round((window.innerWidth  - winEl.offsetWidth)  / 2)}px`;
  winEl.style.top  = `${Math.round((window.innerHeight - winEl.offsetHeight) / 2)}px`;

  titleBar.addEventListener('mousedown', onDown);

  function onDown(e) {
    if (e.target.classList.contains('linux-terminal-btn')) return;
    e.preventDefault();
    startX    = e.clientX;
    startY    = e.clientY;
    startLeft = winEl.offsetLeft;
    startTop  = winEl.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp,   { once: true });
  }

  function onMove(e) {
    winEl.style.left = `${startLeft + e.clientX - startX}px`;
    winEl.style.top  = `${startTop  + e.clientY - startY}px`;
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
  }
}

// ── Build the DOM ────────────────────────────────────────────────────────────

function _buildTerminal(container) {
  // Full-screen transparent wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'toy-linux-terminal-wrapper';

  // The window
  const win = document.createElement('div');
  win.className = 'linux-terminal-window';

  // Title bar
  const titleBar = document.createElement('div');
  titleBar.className = 'linux-terminal-titlebar';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'linux-terminal-btn close';
  closeBtn.title = 'Close';
  closeBtn.addEventListener('click', () => _killSelf ? _killSelf() : terminalToy.unmount());

  const minBtn = document.createElement('button');
  minBtn.className = 'linux-terminal-btn min';
  minBtn.title = 'Minimise (nope)';
  minBtn.addEventListener('click', () => {
    _writeLine({ text: 'minimise: not implemented (comic sans terminals don\'t minimise)', cls: 'term-yellow' });
    _inputEl.focus();
  });

  const maxBtn = document.createElement('button');
  maxBtn.className = 'linux-terminal-btn max';
  maxBtn.title = 'Maximise';
  maxBtn.addEventListener('click', () => {
    if (win.style.width === '100vw') {
      win.style.width  = '';
      win.style.height = '';
      win.style.left   = `${Math.round((window.innerWidth  - win.offsetWidth)  / 2)}px`;
      win.style.top    = `${Math.round((window.innerHeight - win.offsetHeight) / 2)}px`;
    } else {
      win.style.width  = '100vw';
      win.style.height = '100vh';
      win.style.left   = '0';
      win.style.top    = '0';
    }
  });

  const titleText = document.createElement('span');
  titleText.className  = 'linux-terminal-title-text';
  titleText.textContent = '🐧 user@mememachine: ~ — Comic Sans Terminal v4.20.69';

  titleBar.append(closeBtn, minBtn, maxBtn, titleText);

  // Output area
  const output = document.createElement('div');
  output.className = 'linux-terminal-output';

  // Input row
  const inputRow = document.createElement('div');
  inputRow.className = 'linux-terminal-inputrow';

  const promptLabel = document.createElement('span');
  promptLabel.className   = 'linux-terminal-prompt-label';
  promptLabel.textContent = `${_promptString()} `;

  const input = document.createElement('input');
  input.type        = 'text';
  input.className   = 'linux-terminal-input';
  input.autocomplete = 'off';
  input.spellcheck  = false;
  input.setAttribute('autocorrect',    'off');
  input.setAttribute('autocapitalize', 'off');

  inputRow.append(promptLabel, input);
  win.append(titleBar, output, inputRow);
  wrapper.appendChild(win);
  container.appendChild(wrapper);

  // Store refs
  _wrapper   = wrapper;
  _window    = win;
  _outputEl  = output;
  _inputEl   = input;
  _promptEl  = promptLabel;

  // Draggable
  _makeDraggable(win, titleBar);

  // Input events
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = input.value;
      input.value = '';
      _runCommand(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (_histIdx > 0) {
        _histIdx--;
        input.value = _history[_histIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (_histIdx < _history.length - 1) {
        _histIdx++;
        input.value = _history[_histIdx];
      } else {
        _histIdx = _history.length;
        input.value = '';
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      _clearOutput();
      _updatePromptLabel();
    } else if (e.key === 'c' && e.ctrlKey) {
      if (_rickrolling) {
        _stopRickroll();
        _writeLine({ text: '^C', cls: 'term-dim' });
        _writeLine({ text: 'lmao u got rickrolled. have a nice day 🎵', cls: 'term-yellow' });
        _updatePromptLabel();
      } else {
        _writeLine({ text: `${_promptString()} ^C`, cls: 'term-dim' });
        _updatePromptLabel();
        input.value = '';
      }
    }
  });

  // Welcome banner
  _writeLine({ rainbow: true, text: '  🐧  DERANGED COMIC SANS LINUX TERMINAL v4.20.69  🐧  ' });
  _writeLine({ text: 'Kernel: 6.9.0-meme-generic  |  Distro: MemOS  |  Shell: meme-sh 5.2.15', cls: 'term-dim' });
  _writeLine({ text: 'Type \'help\' for a list of commands. Try \'rickroll\' for a good time.', cls: 'term-cyan' });
  _writeLine({ text: 'Type \'neofetch\' to feel like you have your life together.', cls: 'term-cyan' });
  _writeLine({ text: '' });
  _updatePromptLabel();
  input.focus();
}

// ── Toy adapter export ───────────────────────────────────────────────────────

const terminalToy = {
  id: 'linux-terminal',

  mount(container, killCallback) {
    _killSelf = killCallback || null;
    _injectCSS();
    _buildTerminal(container);
  },

  unmount() {
    _stopRickroll();
    if (_wrapper) { _wrapper.remove(); _wrapper = null; }
    _window   = null;
    _outputEl = null;
    _inputEl  = null;
    _promptEl = null;
    _audio    = null;
    _history  = [];
    _histIdx  = -1;
    _removeCSS();
  },
};

export default terminalToy;