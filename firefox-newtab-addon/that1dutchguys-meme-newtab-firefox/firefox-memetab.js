// ==========================================
//  CLOCK + DATE
// ==========================================

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}`;
  document.getElementById('date-display').textContent =
    `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

setInterval(updateClock, 1000);
updateClock();

// ==========================================
//  DEFAULT QUICK LINKS
// ==========================================

const DEFAULT_LINKS = [
  {
  name: "GitHub profile",
  url:  'https://github.com/That1DutchGuy1',
  icon: 'https://github.com/favicon.ico'
  },
  {
    name: "Shit Ass Toybox",
    url:  'https://that1dutchguy1.github.io/thatonedutchguys-shit-ass-toybox/index.html',
    icon: 'https://raw.githubusercontent.com/That1DutchGuy1/thatonedutchguys-shit-ass-toybox/refs/heads/main/favicons/favicon-32x32.png'
  },
];

// ==========================================
//  FAVICON PIXEL OUTLINE
//  Draws the image onto a canvas and composites
//  a solid-colour stroke that follows opaque pixels
//  (not the rectangular bounding box).
// ==========================================

/**
 * Returns a data-URL for `src` with a 1-px solid outline
 * hugging its opaque pixels.
 * Falls back to the original src if anything goes wrong.
 */
function addPixelOutline(src, strokeColor = '#000000', strokeWidth = 1.5) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const pad = Math.ceil(strokeWidth) + 1;
        const w = img.naturalWidth  + pad * 2;
        const h = img.naturalHeight + pad * 2;

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // --- Step 1: draw the image offset in every direction to build an outline mask ---
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = strokeColor;

        const offsets = [];
        for (let dx = -strokeWidth; dx <= strokeWidth; dx += 0.5) {
          for (let dy = -strokeWidth; dy <= strokeWidth; dy += 0.5) {
            if (Math.sqrt(dx * dx + dy * dy) <= strokeWidth) {
              offsets.push([dx, dy]);
            }
          }
        }

        // Draw silhouette copies in strokeColor
        // Use destination-in trick: draw image with a solid colour tint
        // by using a temporary canvas for the tinted silhouette.
        const tintCanvas = document.createElement('canvas');
        tintCanvas.width  = img.naturalWidth;
        tintCanvas.height = img.naturalHeight;
        const tCtx = tintCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = strokeColor;
        tCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

        for (const [dx, dy] of offsets) {
          ctx.drawImage(tintCanvas, pad + dx, pad + dy);
        }

        // --- Step 2: draw the real image on top ---
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, pad, pad);

        resolve(canvas.toDataURL());
      } catch (e) {
        // e.g. CORS failure on the canvas read — just use original
        resolve(src);
      }
    };

    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/**
 * Applies addPixelOutline to an <img> element once it loads.
 */
function applyOutlineToImg(imgEl) {
  const apply = async () => {
    const outlined = await addPixelOutline(imgEl.src);
    if (outlined !== imgEl.src) imgEl.src = outlined;
  };
  if (imgEl.complete && imgEl.naturalWidth > 0) {
    apply();
  } else {
    imgEl.addEventListener('load', apply, { once: true });
  }
}

// ==========================================
//  QUICK LINKS — dynamic render
// ==========================================

let currentLinks = [...DEFAULT_LINKS];

function iconForUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

function renderQuickLinks() {
  const ul = document.getElementById('quick-links');
  ul.innerHTML = '';
  currentLinks.forEach(link => {
    const li   = document.createElement('li');
    const a    = document.createElement('a');
    a.href     = link.url;

    const img  = document.createElement('img');
    img.src    = link.icon || iconForUrl(link.url);
    img.width  = 20;
    img.height = 20;
    img.alt    = '';
    applyOutlineToImg(img);

    const span = document.createElement('span');
    span.textContent = link.name;

    a.appendChild(img);
    a.appendChild(span);
    li.appendChild(a);
    ul.appendChild(li);
  });
}

async function loadLinks() {
  const data = await browser.storage.local.get('quickLinks');
  if (data.quickLinks && Array.isArray(data.quickLinks) && data.quickLinks.length > 0) {
    currentLinks = data.quickLinks;
  }
  renderQuickLinks();
}

async function saveLinks() {
  await browser.storage.local.set({ quickLinks: currentLinks });
  renderQuickLinks();
}

// ==========================================
//  WALLPAPER
// ==========================================

async function loadWallpaper() {
  const data = await browser.storage.local.get(['wallpaper', 'wallpaperName']);
  if (data.wallpaper) {
    document.body.style.backgroundImage = `url('${data.wallpaper}')`;
    const nameEl = document.getElementById('wallpaper-name');
    if (nameEl) nameEl.textContent = `Current: ${data.wallpaperName || 'custom image'} ✓`;
  }
}

async function setWallpaper(dataUrl, fileName) {
  await browser.storage.local.set({ wallpaper: dataUrl, wallpaperName: fileName });
  document.body.style.backgroundImage = `url('${dataUrl}')`;
  const nameEl = document.getElementById('wallpaper-name');
  if (nameEl) nameEl.textContent = `Current: ${fileName} ✓`;
}

async function resetWallpaper() {
  await browser.storage.local.remove(['wallpaper', 'wallpaperName']);
  document.body.style.backgroundImage = "url('Meme-Group-Photo.png')";
  const nameEl = document.getElementById('wallpaper-name');
  if (nameEl) nameEl.textContent = 'Current: Meme-Group-Photo.png (default)';
}

// ==========================================
//  HARKINIAN / MORSHU SEARCH
// ==========================================

const searchInput  = document.getElementById('search-input');
const searchBtn    = document.getElementById('search-btn');
const engineSelect = document.getElementById('engine-select');

function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  window.location.href = engineSelect.value + encodeURIComponent(query);
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

// Remember last engine across tabs
browser.storage.local.get('lastEngine').then(data => {
  if (data.lastEngine) engineSelect.value = data.lastEngine;
});
engineSelect.addEventListener('change', () => {
  browser.storage.local.set({ lastEngine: engineSelect.value });
});

// ==========================================
//  SETTINGS PANEL
// ==========================================

const settingsBtn     = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose   = document.getElementById('settings-close');
const wallpaperInput  = document.getElementById('wallpaper-input');
const wallpaperReset  = document.getElementById('wallpaper-reset');
const addLinkBtn      = document.getElementById('add-link-btn');
const newLinkNameEl   = document.getElementById('new-link-name');
const newLinkUrlEl    = document.getElementById('new-link-url');

// Open / close
settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.add('open');
  renderSettingsLinks();
});

settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', e => {
  if (e.target === settingsOverlay) closeSettings();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSettings();
});

function closeSettings() {
  settingsOverlay.classList.remove('open');
}

// Wallpaper file upload
wallpaperInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    await setWallpaper(ev.target.result, file.name);
  };
  reader.readAsDataURL(file);
  // reset input so the same file can be re-selected
  wallpaperInput.value = '';
});

wallpaperReset.addEventListener('click', resetWallpaper);

// Add a new link
addLinkBtn.addEventListener('click', addLink);
newLinkUrlEl.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

async function addLink() {
  const name    = newLinkNameEl.value.trim();
  const url     = newLinkUrlEl.value.trim();
  const iconRaw = document.getElementById('new-link-icon').value.trim();
  if (!name || !url) return;
  const icon = iconRaw || iconForUrl(url);
  currentLinks.push({ name, url, icon });
  await saveLinks();
  renderSettingsLinks();
  newLinkNameEl.value = '';
  newLinkUrlEl.value  = '';
  document.getElementById('new-link-icon').value = '';
  newLinkNameEl.focus();
}

// Render link list inside settings panel
function renderSettingsLinks() {
  const list = document.getElementById('links-list');
  list.innerHTML = '';

  currentLinks.forEach((link, idx) => {
    const item = document.createElement('div');
    item.className = 'link-item';
    item.dataset.idx = idx;

    // Icon
    const icon = document.createElement('img');
    icon.src       = link.icon || iconForUrl(link.url);
    icon.width     = 20;
    icon.height    = 20;
    icon.className = 'link-item-icon';
    icon.alt       = '';

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className   = 'link-item-name';
    nameSpan.textContent = link.name;
    nameSpan.title       = link.url;

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'link-item-actions';

    // Up
    const upBtn = makeIconBtn('⬆️', 'Move up', async () => {
      if (idx === 0) return;
      [currentLinks[idx - 1], currentLinks[idx]] = [currentLinks[idx], currentLinks[idx - 1]];
      await saveLinks();
      renderSettingsLinks();
    });

    // Down
    const downBtn = makeIconBtn('⬇️', 'Move down', async () => {
      if (idx === currentLinks.length - 1) return;
      [currentLinks[idx + 1], currentLinks[idx]] = [currentLinks[idx], currentLinks[idx + 1]];
      await saveLinks();
      renderSettingsLinks();
    });

    // Edit
    const editBtn = makeIconBtn('✏️', 'Edit', () => editLink(idx));

    // Delete
    const delBtn = makeIconBtn('🗑️', 'Delete', async () => {
      currentLinks.splice(idx, 1);
      await saveLinks();
      renderSettingsLinks();
    });

    if (idx === 0) upBtn.disabled = true;
    if (idx === currentLinks.length - 1) downBtn.disabled = true;

    actions.append(upBtn, downBtn, editBtn, delBtn);
    item.append(icon, nameSpan, actions);
    list.appendChild(item);
  });
}

function makeIconBtn(emoji, title, onClick) {
  const btn = document.createElement('button');
  btn.textContent = emoji;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}

// Inline edit for a link row
function editLink(idx) {
  const list  = document.getElementById('links-list');
  const item  = list.querySelector(`.link-item[data-idx="${idx}"]`);
  if (!item) return;

  item.classList.add('editing');
  item.innerHTML = '';

  const nameIn = document.createElement('input');
  nameIn.type        = 'text';
  nameIn.value       = currentLinks[idx].name;
  nameIn.className   = 'settings-input';
  nameIn.placeholder = 'Link name';

  const urlIn = document.createElement('input');
  urlIn.type        = 'url';
  urlIn.value       = currentLinks[idx].url;
  urlIn.className   = 'settings-input';
  urlIn.placeholder = 'https://...';

  const iconIn = document.createElement('input');
  iconIn.type        = 'url';
  iconIn.value       = currentLinks[idx].icon || '';
  iconIn.className   = 'settings-input edit-icon-input';
  iconIn.placeholder = 'Icon URL (leave blank for auto)';
  iconIn.title       = 'Custom favicon URL — leave blank to auto-fetch from the site';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾';
  saveBtn.title       = 'Save';
  saveBtn.className   = 'settings-action-btn';
  saveBtn.style.padding = '6px 10px';
  saveBtn.addEventListener('click', async () => {
    const newName    = nameIn.value.trim();
    const newUrl     = urlIn.value.trim();
    const newIconRaw = iconIn.value.trim();
    if (!newName || !newUrl) return;
    const newIcon = newIconRaw || iconForUrl(newUrl);
    currentLinks[idx] = { name: newName, url: newUrl, icon: newIcon };
    await saveLinks();
    renderSettingsLinks();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '❌';
  cancelBtn.title       = 'Cancel';
  cancelBtn.className   = 'settings-action-btn';
  cancelBtn.style.padding = '6px 10px';
  cancelBtn.addEventListener('click', renderSettingsLinks);

  [urlIn, iconIn].forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  }));

  item.append(nameIn, urlIn, iconIn, saveBtn, cancelBtn);
  nameIn.focus();
}

// ==========================================
//  WEATHER via Open-Meteo (free, no key!)
// ==========================================

function wmoToEmoji(code) {
  if (code === 0)   return '☀️';
  if (code <= 2)    return '⛅️';  // variation selector forces emoji presentation
  if (code === 3)   return '☁️';
  if (code <= 49)   return '💨';   // 🌫️ and 🌁 both render as squares on Firefox; 💨 works fine
  if (code <= 59)   return '🌦️';
  if (code <= 69)   return '🌧️';
  if (code <= 79)   return '🌨️';
  if (code <= 84)   return '🌧️';
  if (code <= 94)   return '⛈️';
  return '⛈️';
}

function shortDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

async function loadWeather(lat, lon, locationName) {
  document.getElementById('weather-location').textContent = locationName;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=celsius` +
    `&timezone=auto` +
    `&forecast_days=5`;

  const resp = await fetch(url);
  const data = await resp.json();
  const cur  = data.current;

  document.getElementById('weather-icon').textContent     = wmoToEmoji(cur.weathercode);
  document.getElementById('weather-temp').textContent     = `${Math.round(cur.temperature_2m)}°`;
  document.getElementById('weather-feels').textContent    = `Feels like ${Math.round(cur.apparent_temperature)}°`;
  document.getElementById('weather-humidity').textContent = `${cur.relative_humidity_2m}% Humidity`;

  const forecastEl = document.getElementById('weather-forecast');
  forecastEl.innerHTML = '';
  const daily = data.daily;

  for (let i = 1; i < daily.time.length; i++) {
    const div       = document.createElement('div');
    div.className   = 'forecast-day';
    div.innerHTML   =
      `<span class="forecast-day-name">${shortDay(daily.time[i])}</span>` +
      `<span class="forecast-icon">${wmoToEmoji(daily.weathercode[i])}</span>` +
      `<span class="forecast-temps">${Math.round(daily.temperature_2m_max[i])}°&thinsp;${Math.round(daily.temperature_2m_min[i])}°</span>`;
    forecastEl.appendChild(div);
  }
}

async function initWeather() {
  // Use cached location for instant display (valid 10 min)
  const cached = await browser.storage.local.get(
    ['weatherLat', 'weatherLon', 'weatherName', 'weatherTime']
  );
  if (cached.weatherLat && (Date.now() - (cached.weatherTime || 0) < 10 * 60 * 1000)) {
    loadWeather(cached.weatherLat, cached.weatherLon, cached.weatherName);
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude.toFixed(4);
    const lon = pos.coords.longitude.toFixed(4);

    let locationName = `${lat}, ${lon}`;
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geoData = await geo.json();
      const addr    = geoData.address;
      const region  = addr.state_district || addr.state || addr.county || '';
      const country = addr.country_code ? addr.country_code.toUpperCase() : (addr.country || '');
      // Only show region + country for privacy (no city/town/village)
      locationName  = region
        ? `${region}, ${country}`
        : country;
    } catch (e) { /* keep lat/lon fallback */ }

    browser.storage.local.set({
      weatherLat:  lat,
      weatherLon:  lon,
      weatherName: locationName,
      weatherTime: Date.now()
    });

    loadWeather(lat, lon, locationName);

  }, () => {
    document.getElementById('weather-location').textContent = 'Enable location for weather';
  });
}

// ==========================================
//  INIT
// ==========================================

loadLinks();
loadWallpaper();
initWeather();