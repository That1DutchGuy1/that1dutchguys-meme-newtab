/**
 * king-harkinian-shim.js — loaded BEFORE king-harkinian-desktop-pet.js
 *
 * Problems it solves:
 *
 * 1. ASSET PATHS: The pet uses `./assets/...` paths in JS (image src, fetch).
 *    When the pet script loads as <script src="toys/king-harkinian-desktop-pet/...">
 *    image `new Image(); img.src = "./assets/..."` resolves relative to the PAGE
 *    (chromium-memetab.html), not the script. So they 404.
 *    Fix: patch Image and Audio constructors + fetch to rewrite `./assets/` paths.
 *
 * 2. RAF TRACKING: We need to cancel the game loop on unmount.
 *    Fix: wrap requestAnimationFrame to track the latest id.
 *
 * 3. CLEANUP HANDLE: Expose window.__kingHarkinianCleanup for the adapter.
 *
 * 4. DOCUMENT CLICK CAPTURE: The pet sets up a document 'click' handler to
 *    dismiss the context menu. After unmount, ctxMenu is removed, but the
 *    handler still fires and crashes. We intercept addEventListener so the
 *    adapter can remove it on unmount.
 *    Fix: patch document.addEventListener to capture the handler.
 *    IMPORTANT: On remount, init() fires AFTER setTimeout(0), so we must NOT
 *    restore document.addEventListener until the toy adapter explicitly calls
 *    window.__kingShimRelease(). The shim stays patched until released.
 *
 * 5. REINIT SUPPORT: On remount (toy deactivated then reactivated), the pet
 *    script is NOT re-injected (const re-declarations would throw). Instead,
 *    the adapter calls window.__kingInit(). We expose it here after the pet
 *    script runs and sets up its globals.
 *    Note: __kingInit is set by a setTimeout below so it runs after the pet
 *    script's own top-level code finishes executing (first load only).
 *
 * 6. CLOCK INTERVAL TRACKING: The pet calls setInterval(updateClock, 10000).
 *    We capture it so the adapter can clearInterval on unmount.
 *    Same timing issue as #4 — stay patched until __kingShimRelease() is called.
 */
(function() {
  "use strict";

  const shimScript = document.currentScript;
  const BASE = shimScript
    ? shimScript.src.replace(/king-harkinian-shim\.js(\?.*)?$/, '')
    : (window.__kingBase || '');

  window.__kingBase = BASE;

  // ── 1. Patch fetch() ──────────────────────────────────────────────────────
  // Safe to re-patch every shim load — we always close over the REAL fetch.
  const _realFetch = window.__kingOrigFetch || window.fetch.bind(window);
  window.__kingOrigFetch = _realFetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('./assets/')) {
      input = BASE + input.slice(2);
    }
    return _realFetch(input, init);
  };

  // ── 2. Patch Image ────────────────────────────────────────────────────────
  const _OrigImage = window.__kingOrigImage || window.Image;
  window.__kingOrigImage = _OrigImage;
  window.Image = function(w, h) {
    const img = new _OrigImage(w, h);
    const _origSet = Object.getOwnPropertyDescriptor(_OrigImage.prototype, 'src').set;
    Object.defineProperty(img, 'src', {
      get() { return _OrigImage.prototype.src.call ? img.getAttribute('src') : ''; },
      set(val) {
        if (typeof val === 'string' && val.startsWith('./assets/')) {
          val = BASE + val.slice(2);
        }
        _origSet.call(img, val);
      },
      configurable: true,
    });
    return img;
  };
  window.Image.prototype = _OrigImage.prototype;

  // ── 3. Patch Audio ────────────────────────────────────────────────────────
  const _OrigAudio = window.__kingOrigAudio || window.Audio;
  window.__kingOrigAudio = _OrigAudio;
  window.Audio = function(src) {
    if (typeof src === 'string' && src.startsWith('./assets/')) {
      src = BASE + src.slice(2);
    }
    return new _OrigAudio(src);
  };
  window.Audio.prototype = _OrigAudio.prototype;

  // ── 4. Track rAF id ───────────────────────────────────────────────────────
  window.__kingRafId = null;
  const _origRAF = window.__kingOrigRAF || window.requestAnimationFrame.bind(window);
  window.__kingOrigRAF = _origRAF;
  window.requestAnimationFrame = function(cb) {
    const id = _origRAF(cb);
    window.__kingRafId = id;
    return id;
  };

  // ── 5. Capture document 'click' handler ───────────────────────────────────
  //    The pet registers exactly ONE document.addEventListener('click', fn).
  //    On first load it fires at parse time; on remount it fires inside init().
  //    We must stay patched until the toy adapter explicitly releases us via
  //    window.__kingShimRelease(), because init() on remount runs AFTER our
  //    setTimeout(0) would have restored the real addEventListener.
  //    We save the real one only once, so re-running the shim is safe.
  const _origDocAddListener = window.__kingOrigDocAddListener
    || document.addEventListener.bind(document);
  window.__kingOrigDocAddListener = _origDocAddListener;

  document.addEventListener = function(type, fn, opts) {
    if (type === 'click' && typeof fn === 'function') {
      window.__kingDocClickHandler = fn;  // always overwrite with newest
    }
    return _origDocAddListener(type, fn, opts);
  };

  // ── 6. Capture setInterval for the clock ──────────────────────────────────
  //    Same timing issue: stay patched until __kingShimRelease() is called.
  const _origSetInterval = window.__kingOrigSetInterval
    || window.setInterval.bind(window);
  window.__kingOrigSetInterval = _origSetInterval;

  window.setInterval = function(fn, delay, ...args) {
    const id = _origSetInterval(fn, delay, ...args);
    window.__kingClockIntervalId = id;  // capture every interval; last wins
    return id;
  };

  // ── 7. Release function — called by the toy adapter after init() runs ─────
  //    Restores document.addEventListener and setInterval to their real versions
  //    so the rest of the page isn't affected. Safe to call multiple times.
  window.__kingShimRelease = function() {
    document.addEventListener = _origDocAddListener;
    window.setInterval        = _origSetInterval;
    // Don't delete __kingShimRelease itself — the adapter may call it again
    // on a future remount before the shim re-runs.
  };

  // ── 8. Expose __kingInit for remount (first-load only) ────────────────────
  //    After this shim runs, the pet script runs and defines the global
  //    function `init`. We expose it as window.__kingInit.
  //    Use setTimeout(0) so the pet script has finished executing first.
  //    On remount the shim is re-run but the pet script is NOT re-injected,
  //    so we skip this — __kingInit is already set from the first load.
  if (!window.__kingInit) {
    setTimeout(function() {
      if (typeof init === 'function') { // eslint-disable-line no-undef
        window.__kingInit = init;        // eslint-disable-line no-undef
      }
      // Expose death trigger for the toy adapter's Quit button.
      // We deliberately keep quitAfterDeath=false so the pet never reaches
      // the window.location.href navigation (which Chrome won't let us intercept).
      // Instead we start the animation ourselves and poll for it to finish,
      // then call __kingKillToy() directly.
      window.__kingStartDeath = function() {
        if (typeof dying === 'undefined' || dying) return; // eslint-disable-line no-undef
        quitAfterDeath = false; // eslint-disable-line no-undef — keep false so no navigation fires
        dying    = true;        // eslint-disable-line no-undef
        dieTick  = 0;           // eslint-disable-line no-undef
        visible  = true;        // eslint-disable-line no-undef — ensure one last render
        if (typeof stopSpongeAudio === 'function') stopSpongeAudio(); // eslint-disable-line no-undef
        // Poll every 100 ms: once dying flips back to false the animation is done
        const poll = _origSetInterval(function() {
          if (!dying) { // eslint-disable-line no-undef
            clearInterval(poll);
            if (typeof window.__kingKillToy === 'function') window.__kingKillToy();
          }
        }, 100);
      };
    }, 0);
  }

  console.log('[KingShim] 👑 Shim loaded. BASE =', BASE);
})();