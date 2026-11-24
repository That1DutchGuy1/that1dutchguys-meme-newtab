/**
 * ============================================================
 *  👑 King Harkinian Desktop Pet — Toy Adapter
 *  toys/king-harkinian-desktop-pet/king-harkinian-toy.js
 *
 *  Strategy: load the pet's JS directly as a <script src="">
 *  (no blob:, no inline handlers — MV3 CSP compliant).
 *
 *  Key insight: the pet script runs top-to-bottom on load and
 *  immediately caches DOM references as module-level `const`s:
 *    const desktop   = document.getElementById("desktop");
 *    const mainC     = document.getElementById("mainCanvas");
 *    const ctx       = mainC.getContext("2d");
 *    … and so on.
 *
 *  These consts CANNOT be reassigned. If we destroy and recreate
 *  the DOM on unmount, the pet script's cached refs point to
 *  detached/dead elements on remount → invisible King, broken buttons.
 *
 *  FIX: Create the pet's required DOM ONCE (first mount), then on
 *  unmount merely DETACH it from the live document (keeping it in
 *  memory), and on remount RE-ATTACH it. The pet's cached pointers
 *  stay valid forever.
 *
 *  Other fixes baked in:
 *  - Shim patches (document.addEventListener, setInterval) now stay
 *    active until window.__kingShimRelease() is called explicitly,
 *    so init() on remount is captured correctly.
 *  - Clock interval is re-captured on each init() call and cleared
 *    on each unmount.
 *  - The document 'click' handler is tracked per-mount and removed
 *    per-unmount so it can't fire against a detached ctxMenu.
 * ============================================================
 */

"use strict";

const _selfUrl   = new URL(import.meta.url);
const _extRoot   = new URL('../../', _selfUrl).href;
const BASE       = new URL('toys/king-harkinian-desktop-pet/', _extRoot).href;
const TOYBOX_URL = new URL('toys/toybox.js', _extRoot).href;
const PET_JS_URL = new URL('toys/king-harkinian-desktop-pet/king-harkinian-desktop-pet.js', _extRoot).href;
const PET_CSS_URL= new URL('toys/king-harkinian-desktop-pet/king-harkinian-desktop-pet.css', _extRoot).href;
const SHIM_JS_URL= new URL('toys/king-harkinian-desktop-pet/king-harkinian-shim.js', _extRoot).href;

// ── Persistent DOM refs (created once, kept alive between mounts) ─────────────
// The pet script caches these as `const` at parse time and can never change them.
// We must keep the SAME nodes across unmount/remount cycles.
let _gameLayer    = null;   // #gameLayer  (goes into the toybox container)
let _fakeDesktop  = null;   // #desktop    (goes into document.body)
let _taskbar      = null;   // #taskbar    (goes into document.body, hidden)
let _ctxMenu      = null;   // #ctxMenu    (goes into document.body)
let _fistCursor   = null;   // #fistCursor (goes into document.body)
let _spongeCursor = null;   // #spongeCursor (goes into document.body)

// ── Per-mount state ───────────────────────────────────────────────────────────
let _styleEl      = null;   // <link> for pet CSS
let _overrideEl   = null;   // <style> for positioning overrides
let _container    = null;   // the toybox container div

let _docClickHandler     = null;  // pet's document 'click' fn (captured per init)
let _windowCtxMenuHandler= null;  // our window contextmenu forwarder

// Whether the pet script (and shim) have EVER been injected.
let _petScriptLoaded = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detach an element from the DOM without destroying it. */
function _detach(el) { el?.parentNode?.removeChild(el); }

/** Build all the DOM nodes the pet script needs (called only once). */
function _buildPetDom() {
  // #desktop — pet attaches contextmenu listener + mouse listeners here
  _fakeDesktop    = document.createElement('div');
  _fakeDesktop.id = 'desktop';
  _fakeDesktop.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;background:transparent;z-index:-1;';

  // #taskbar — pet attaches contextmenu listener to #trayIcon inside it
  _taskbar = document.createElement('div');
  _taskbar.id = 'taskbar';
  _taskbar.style.display = 'none';

  const trayIcon = document.createElement('div');
  trayIcon.id = 'trayIcon';
  const trayImg = document.createElement('img');
  trayImg.alt = 'King';
  trayImg.src = BASE + 'assets/sprites/king-harkinian/King-Harkinian-CD-i.png';
  trayImg.addEventListener('error', () => { trayImg.style.display = 'none'; });
  trayIcon.appendChild(trayImg);

  const taskbarClock = document.createElement('span');
  taskbarClock.id = 'taskbarClock';

  _taskbar.appendChild(trayIcon);
  _taskbar.appendChild(taskbarClock);

  // #gameLayer + canvases + buttons + combo
  _gameLayer    = document.createElement('div');
  _gameLayer.id = 'gameLayer';

  for (const id of ['poopCanvas','particleCanvas','mainCanvas','foodCanvas']) {
    const c = document.createElement('canvas');
    c.id = id;
    _gameLayer.appendChild(c);
  }

  const dm = document.createElement('div');
  dm.id = 'dinnerMachine';
  const dmImg = document.createElement('img');
  dmImg.alt = 'Dinner Machine';
  dmImg.src = BASE + 'assets/sprites/components/dinner-machine.png';
  dmImg.addEventListener('error', () => {
    dm.style.cssText = 'background:#8B4513;display:flex;align-items:center;justify-content:center;color:gold;font-size:14px;text-align:center;';
    dm.textContent = '🍖 DINNER MACHINE';
  });
  dm.appendChild(dmImg);
  _gameLayer.appendChild(dm);

  const hitBtn = document.createElement('button');
  hitBtn.id = 'hitBtn'; hitBtn.className = 'ctrl-btn';
  hitBtn.textContent = 'HIT MODE';
  _gameLayer.appendChild(hitBtn);

  const spongeBtn = document.createElement('button');
  spongeBtn.id = 'spongeBtn'; spongeBtn.className = 'ctrl-btn';
  spongeBtn.textContent = 'SPONGE MODE';
  spongeBtn.style.display = 'flex';
  _gameLayer.appendChild(spongeBtn);

  const combo = document.createElement('div');
  combo.id = 'comboScore';
  const cl = document.createElement('div');
  cl.className = 'label'; cl.id = 'comboLabel'; cl.textContent = 'COMBO HIT!';
  const cn = document.createElement('div');
  cn.className = 'score'; cn.id = 'comboScoreNum'; cn.textContent = '0';
  combo.appendChild(cl); combo.appendChild(cn);
  _gameLayer.appendChild(combo);

  // #ctxMenu
  _ctxMenu    = document.createElement('div');
  _ctxMenu.id = 'ctxMenu';
  for (const [id, text] of [
    ['ctxSpeak',    '🗣 Speak!'],
    ['ctxToggle',   '👑 Toggle King'],
    ['ctxShitting', '💩 Desktop Shitting: ON'],
  ]) {
    const d = document.createElement('div');
    d.id = id; d.textContent = text;
    _ctxMenu.appendChild(d);
  }
  _ctxMenu.appendChild(document.createElement('hr'));
  const quitItem = document.createElement('div');
  quitItem.id = 'ctxQuit';
  quitItem.textContent = '✖ Quit (deactivate toy)';
  _ctxMenu.appendChild(quitItem);

  // Cursors
  _fistCursor = document.createElement('div');
  _fistCursor.id = 'fistCursor';
  _fistCursor.style.display = 'none';
  const fi = document.createElement('img');
  fi.alt = 'FIST'; fi.src = BASE + 'assets/sprites/components/fist.png';
  fi.addEventListener('error', () => { _fistCursor.textContent = '👊'; _fistCursor.style.fontSize = '72px'; });
  _fistCursor.appendChild(fi);

  _spongeCursor = document.createElement('div');
  _spongeCursor.id = 'spongeCursor';
  _spongeCursor.style.display = 'none';
  const si = document.createElement('img');
  si.alt = '🧽'; si.src = BASE + 'assets/sprites/components/Sponge.png';
  si.addEventListener('error', () => { _spongeCursor.textContent = '🧽'; _spongeCursor.style.fontSize = '96px'; });
  _spongeCursor.appendChild(si);
}

/** Attach all persistent DOM nodes into the live document. */
function _attachPetDom(container) {
  document.body.appendChild(_fakeDesktop);
  document.body.appendChild(_taskbar);
  document.body.appendChild(_ctxMenu);
  document.body.appendChild(_fistCursor);
  document.body.appendChild(_spongeCursor);
  container.appendChild(_gameLayer);
}

/** Detach all persistent DOM nodes from the live document (keeps them in memory). */
function _detachPetDom() {
  _detach(_fakeDesktop);
  _detach(_taskbar);
  _detach(_ctxMenu);
  _detach(_fistCursor);
  _detach(_spongeCursor);
  _detach(_gameLayer);
}

// ─────────────────────────────────────────────────────────────────────────────

const KingHarkinianToy = {
  id: 'king-harkinian-desktop-pet',

  async mount(container) {
    _container = container;

    // ── 1. CSS ────────────────────────────────────────────────────────────────
    _styleEl      = document.createElement('link');
    _styleEl.rel  = 'stylesheet';
    _styleEl.href = PET_CSS_URL;
    document.head.appendChild(_styleEl);

    _overrideEl = document.createElement('style');
    _overrideEl.id = '__king-pet-override';
    _overrideEl.textContent = `
      body {
        background: unset !important; overflow: hidden !important;
        font-family: 'Comic Sans MS', cursive, sans-serif !important;
      }
      #desktop {
        position: fixed !important; inset: 0 !important;
        width: 100vw !important; height: 100vh !important;
        pointer-events: auto !important; background: transparent !important;
        z-index: -1 !important; display: block !important;
      }
      #taskbar { display: none !important; }
      #gameLayer {
        position: fixed !important; inset: 0 !important;
        z-index: 200 !important; pointer-events: none !important;
      }
      #poopCanvas     { position:absolute!important; inset:0!important; z-index:201!important; pointer-events:none!important; }
      #particleCanvas { position:absolute!important; inset:0!important; z-index:202!important; pointer-events:none!important; }
      #mainCanvas     { position:absolute!important; inset:0!important; z-index:203!important; pointer-events:none!important; }
      #dinnerMachine  { z-index:204!important; pointer-events:auto!important; }
      #foodCanvas     { position:absolute!important; inset:0!important; z-index:205!important; pointer-events:none!important; }
      .ctrl-btn       { z-index:206!important; pointer-events:auto!important; }
      #comboScore     { z-index:207!important; pointer-events:none!important; }
      #fistCursor, #spongeCursor { z-index:500!important; pointer-events:none!important; }
      #ctxMenu        { z-index:9999!important; pointer-events:auto!important; }
    `;
    document.head.appendChild(_overrideEl);

    // ── 2. Build or reuse persistent DOM ──────────────────────────────────────
    if (!_gameLayer) {
      // First ever mount: create all the DOM nodes the pet script will cache.
      _buildPetDom();
    }
    // Attach them all into the live document (safe on first mount AND remount).
    _attachPetDom(container);

    // ── 3. Load & run pet script ──────────────────────────────────────────────
    if (!_petScriptLoaded) {
      // First mount: inject shim THEN pet script.
      // The shim patches document.addEventListener + setInterval and stays
      // patched until __kingShimRelease() is called below.
      await _loadScript(SHIM_JS_URL);
      await _loadScript(PET_JS_URL);
      _petScriptLoaded = true;
      // __kingInit is set asynchronously by the shim's setTimeout(0) —
      // it will be ready by next mount.
    } else {
      // Remount: re-run the shim (safe IIFE) so its patches are live again,
      // then call init() to restart the game loop.
      // The shim will stay patched (capturing the new click handler and
      // clock interval that init() registers) until we call __kingShimRelease().
      await _loadScript(SHIM_JS_URL);

      // Re-size canvases now that the DOM is back in the live document.
      // resizeCanvases() ran at pet-script parse time when the DOM was detached
      // (clientWidth/Height = 0), so all four canvases are 0×0.
      // Call it again before init() so the game loop draws to full-size canvases.
      if (typeof resizeCanvases === 'function') resizeCanvases(); // eslint-disable-line no-undef

      // Reset the pet's death/visibility state. When the King dies, the pet sets
      // `visible = false` and leaves `dying` true if killed mid-animation.
      // Both are module-level `let`s that persist across unmount/remount.
      // Without this reset, drawKing() bails immediately → invisible King forever.
      try {
        // eslint-disable-next-line no-undef
        if (typeof visible  !== 'undefined') visible  = true;  // eslint-disable-line no-undef
        // eslint-disable-next-line no-undef
        if (typeof dying    !== 'undefined') dying    = false; // eslint-disable-line no-undef
        // eslint-disable-next-line no-undef
        if (typeof dieAlpha !== 'undefined') dieAlpha = 1.0;  // eslint-disable-line no-undef
      } catch (_) {}  // read-only guard (shouldn't happen, but safe)

      if (typeof window.__kingInit === 'function') {
        window.__kingInit();
      } else if (typeof init === 'function') { // eslint-disable-line no-undef
        init(); // eslint-disable-line no-undef
      }

      // Now that init() has run and registered its click + interval handlers,
      // we can release the shim's patches.
      // Use setTimeout(0) to let any sync code in init() finish first.
      setTimeout(() => window.__kingShimRelease?.(), 0);
    }

    // ── 4. Forward window contextmenu → #desktop ──────────────────────────────
    _windowCtxMenuHandler = (e) => {
      const desktop = document.getElementById('desktop');
      if (!desktop) return;
      e.preventDefault();
      const synth = new MouseEvent('contextmenu', {
        bubbles:    false,
        cancelable: true,
        clientX:    e.clientX,
        clientY:    e.clientY,
        screenX:    e.screenX,
        screenY:    e.screenY,
      });
      desktop.dispatchEvent(synth);
    };
    window.addEventListener('contextmenu', _windowCtxMenuHandler);

    // ── 5. Capture the pet's document 'click' handler ─────────────────────────
    //    On first load: set by shim's setTimeout(0) — we grab it after a tick.
    //    On remount:    set during init() above, shim is still patched at that
    //                   point, so __kingDocClickHandler is already updated.
    //    Either way, grab it after a tick to be safe.
    setTimeout(() => {
      if (window.__kingDocClickHandler) {
        _docClickHandler = window.__kingDocClickHandler;
      }
      // For first-load: also release shim patches now that init has settled.
      window.__kingShimRelease?.();
    }, 0);

    // ── 6. Expose killToy for the shim's death intercept ──────────────────────
    window.__kingKillToy = () => {
      import(TOYBOX_URL).then(mod => mod.killToy('king-harkinian-desktop-pet'));
    };

    // ── 7. Wire Quit → pet's death sequence ───────────────────────────────────
    setTimeout(() => {
      const q = document.getElementById('ctxQuit');
      if (q) {
        const fresh = q.cloneNode(true);
        q.replaceWith(fresh);
        fresh.textContent = '✖ Quit (deactivate toy)';
        fresh.addEventListener('click', () => {
          const m = document.getElementById('ctxMenu');
          if (m) m.style.display = 'none';
          if (typeof window.__kingStartDeath === 'function') {
            window.__kingStartDeath();
          }
        });
      }
    }, 300);
  },

  unmount() {
    // ── Cancel rAF game loop ──────────────────────────────────────────────────
    if (window.__kingRafId) {
      cancelAnimationFrame(window.__kingRafId);
      delete window.__kingRafId;
    }

    // ── Stop audio ────────────────────────────────────────────────────────────
    if (window.__kingHarkinianCleanup) {
      try { window.__kingHarkinianCleanup(); } catch (e) {}
      delete window.__kingHarkinianCleanup;
    }

    // ── Remove the pet's document click handler ───────────────────────────────
    //    Without this it fires after unmount and crashes accessing detached ctxMenu.
    if (_docClickHandler) {
      document.removeEventListener('click', _docClickHandler);
      _docClickHandler = null;
      delete window.__kingDocClickHandler;
    }

    // ── Remove our window contextmenu forwarder ───────────────────────────────
    if (_windowCtxMenuHandler) {
      window.removeEventListener('contextmenu', _windowCtxMenuHandler);
      _windowCtxMenuHandler = null;
    }

    // ── Clear the pet's clock interval ───────────────────────────────────────
    //    updateClock() crashes writing to #taskbarClock if it fires while
    //    the DOM is detached.
    if (window.__kingClockIntervalId) {
      clearInterval(window.__kingClockIntervalId);
      delete window.__kingClockIntervalId;
    }

    // ── Release shim patches (belt-and-suspenders) ────────────────────────────
    window.__kingShimRelease?.();

    // ── Housekeeping ──────────────────────────────────────────────────────────
    delete window.__kingKillToy;
    delete window.__kingStartDeath;

    // ── Reset pet game state so remount always starts fresh ───────────────────
    //    fatPoints / fatScale persist across unmount because they're module-level
    //    `let`s in the pet script. Same for defecation scheduling and poop stains.
    //    Reset them here so the King spawns at normal size with an empty bowel.
    try {
      /* eslint-disable no-undef */
      if (typeof fatPoints          !== 'undefined') fatPoints          = 0;
      if (typeof fatScale           !== 'undefined') fatScale           = 1.0;
      if (typeof explodeArmed       !== 'undefined') explodeArmed       = false;
      if (typeof exploding          !== 'undefined') exploding          = false;
      if (typeof defecationPending  !== 'undefined') defecationPending  = false;
      if (typeof defecationDueAt    !== 'undefined') defecationDueAt    = null;
      if (typeof defecating         !== 'undefined') defecating         = false;
      if (typeof poopStains         !== 'undefined') poopStains.length  = 0;
      if (typeof eating             !== 'undefined') eating             = false;
      if (typeof foodDragging       !== 'undefined') foodDragging       = false;
      if (typeof foodPlaced         !== 'undefined') foodPlaced         = false;
      if (typeof foodImg            !== 'undefined') foodImg            = null;
      if (typeof hitMode            !== 'undefined') hitMode            = false;
      if (typeof spongeMode         !== 'undefined') spongeMode         = false;
      /* eslint-enable no-undef */
    } catch (_) {}

    // Clear the poop canvas so stains don't survive a remount visually either
    try {
      const dc = document.getElementById('poopCanvas');
      if (dc) dc.getContext('2d').clearRect(0, 0, dc.width, dc.height);
    } catch (_) {}

    // ── Detach (NOT destroy) persistent DOM nodes ─────────────────────────────
    //    We keep _gameLayer, _fakeDesktop, _taskbar, _ctxMenu, _fistCursor,
    //    _spongeCursor alive in memory so the pet script's cached const refs
    //    remain valid on the next mount.
    _detachPetDom();

    // ── Remove per-mount CSS ──────────────────────────────────────────────────
    _styleEl?.remove();   _styleEl   = null;
    _overrideEl?.remove(); _overrideEl = null;

    document.body.style.cursor = '';
    _container = null;

    console.log('[KingToy] 👑 The King has left the building.');
  },
};

// ── Script loader ─────────────────────────────────────────────────────────────
function _loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = (e) => { console.error('[KingToy] Failed to load', url, e); reject(e); };
    document.head.appendChild(s);
  });
}

export default KingHarkinianToy;