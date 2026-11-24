/**
 * ============================================================
 *  🧸 DERANGED TOYBOX — Toy Registry & Loader
 *  toys/toybox.js
 *
 *  How to add a new toy:
 *  1. Drop its folder inside /toys/
 *  2. The toy folder must expose a default export from a file
 *     named <folder>/<folder>-toy.js  (the "toy adapter")
 *  3. Add an entry to TOY_REGISTRY below.
 *  4. That's literally it. The toybox handles the rest.
 *
 *  Toy adapter contract:
 *    export default {
 *      id:          'unique-id',          // matches registry entry
 *      mount(container),                  // inject toy into container el
 *      unmount(),                         // clean up EVERYTHING
 *    }
 * ============================================================
 */

"use strict";

// ── Anchor paths to the extension root ───────────────────────────────────────
// This file lives at <ext-root>/toys/toybox.js, so one level up = ext root.
const _extRoot = new URL('../', new URL(import.meta.url)).href;

// ── Registry ─────────────────────────────────────────────────────────────────
// Add new toys here. Order = display order in the panel.
// scriptPath is relative to the EXTENSION ROOT (not to this file).
export const TOY_REGISTRY = [
  {
    id:          'king-harkinian-desktop-pet',
    label:       'King Harkinian Desktop Pet',
    description: "The iconic King who demands dinner.",
    iconPath:    'toys/king-harkinian-desktop-pet/harkinian-icon.png',
    scriptPath:  'toys/king-harkinian-desktop-pet/king-harkinian-toy.js',
  },
  {
    id:          'linux-terminal',
    label:       'Deranged Linux Terminal',
    description: 'A fake Comic Sans Linux terminal.',
    iconPath:    'toys/linux-terminal/linux-icon.png',
    scriptPath:  'toys/linux-terminal/linux-terminal-toy.js',
  },
  // ← drop future toys here, they'll auto-appear in the panel
];

// ── State ─────────────────────────────────────────────────────────────────────
const activeToys   = new Map();   // id → toy module instance
const loadedScripts= new Set();   // avoid double-importing

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Launch a toy by id.
 * If it's already running, this is a no-op (idempotent).
 */
export async function launchToy(id) {
  if (activeToys.has(id)) return;

  const entry = TOY_REGISTRY.find(t => t.id === id);
  if (!entry) { console.warn(`[Toybox] Unknown toy: ${id}`); return; }

  try {
    const absPath = new URL(entry.scriptPath, _extRoot).href;
    const mod = await import(absPath);
    const toy  = mod.default;

    // Create a full-screen container the toy can render into
    const container = document.createElement('div');
    container.id            = `toy-container-${id}`;
    container.dataset.toyId = id;
    container.style.cssText =
      'position:fixed;inset:0;z-index:200;pointer-events:none;';
    document.body.appendChild(container);

    // Pass a killCallback so the toy can self-terminate via killToy(),
    // which correctly removes it from activeToys AND updates the panel UI.
    toy.mount(container, () => killToy(id));
    activeToys.set(id, { toy, container });

    console.log(`[Toybox] 🎉 Launched toy: ${id}`);
    _updateToyboxUI();
  } catch (err) {
    console.error(`[Toybox] Failed to launch toy "${id}":`, err);
  }
}

/**
 * Kill a toy by id. Cleans up DOM + internal state.
 */
export function killToy(id) {
  const entry = activeToys.get(id);
  if (!entry) return;

  try { entry.toy.unmount(); } catch (e) { console.warn(e); }
  entry.container.remove();
  activeToys.delete(id);

  console.log(`[Toybox] 💀 Killed toy: ${id}`);
  _updateToyboxUI();
}

/**
 * Toggle a toy on/off.
 */
export function toggleToy(id) {
  activeToys.has(id) ? killToy(id) : launchToy(id);
}

/** Is a toy currently active? */
export function isToyActive(id) {
  return activeToys.has(id);
}

// ── Toybox panel UI renderer ──────────────────────────────────────────────────

export function renderToyboxContent(panelEl) {
  // Replace whatever placeholder is in there
  panelEl.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'toybox-grid';

  for (const entry of TOY_REGISTRY) {
    const card = _makeToyCard(entry);
    grid.appendChild(card);
  }

  panelEl.appendChild(grid);
}

function _makeToyCard(entry) {
  const card = document.createElement('div');
  card.className   = 'toy-card';
  card.dataset.toyId = entry.id;
  _syncCardState(card, entry.id);

  card.innerHTML = `
    <img class="toy-card-icon" src="${new URL(entry.iconPath, _extRoot).href}" alt="">
    <div class="toy-card-info">
      <div class="toy-card-label">${entry.label}</div>
      <div class="toy-card-desc">${entry.description}</div>
    </div>
    <button class="toy-card-btn" data-action="toggle" data-id="${entry.id}">
      ${activeToys.has(entry.id) ? '🛑 Deactivate' : '▶ Launch'}
    </button>
  `;

  card.querySelector('.toy-card-btn').addEventListener('click', async e => {
    e.stopPropagation();
    const id  = e.currentTarget.dataset.id;
    await toggleToy(id);
    // button re-renders via _updateToyboxUI
  });

  return card;
}

function _syncCardState(card, id) {
  const active = activeToys.has(id);
  card.classList.toggle('active', active);
}

/** Re-sync the toybox panel buttons after any state change */
function _updateToyboxUI() {
  const panel = document.querySelector('.toybox-panel');
  if (!panel) return;

  // Only update cards, don't nuke header
  const cards = panel.querySelectorAll('.toy-card');
  cards.forEach(card => {
    const id  = card.dataset.toyId;
    const btn = card.querySelector('.toy-card-btn');
    if (!btn) return;

    const active = activeToys.has(id);
    card.classList.toggle('active', active);
    btn.textContent = active ? '🛑 Deactivate' : '▶ Launch';
  });
}