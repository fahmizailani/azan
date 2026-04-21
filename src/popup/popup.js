const currentLocationButtonEl = document.querySelector('#load-prayer-times');
const locationInputEl = document.querySelector('#location');
const locationSuggestionsEl = document.querySelector('#location-suggestions');
const prayerTimeEls = document.querySelectorAll('.prayer-time[data-prayer-time]');
const prayerItemEls = document.querySelectorAll('.prayer-item[data-prayer-item]');
const prayerDotEls = document.querySelectorAll('.prayer-dot[data-prayer-dot]');
const prayerCountdownEls = document.querySelectorAll('.prayer-countdown[data-prayer-countdown]');
const mapEl = document.querySelector('#location-map');
const mainTopbarEl = document.querySelector('#main-topbar');
const openSettingsEl = document.querySelector('#open-settings');
const backDashboardEl = document.querySelector('#back-dashboard');
const dashboardPageEl = document.querySelector('#dashboard-page');
const settingsPageEl = document.querySelector('#settings-page');
const settingsTabLocationEl = document.querySelector('#settings-tab-location');
const settingsTabNotificationEl = document.querySelector('#settings-tab-notification');
const settingsTabFormatsEl = document.querySelector('#settings-tab-formats');
const settingsPanelLocationEl = document.querySelector('#settings-panel-location');
const settingsPanelNotificationEl = document.querySelector('#settings-panel-notification');
const settingsPanelFormatsEl = document.querySelector('#settings-panel-formats');
const timeFormat12El = document.querySelector('#time-format-12hr');
const timeFormat24El = document.querySelector('#time-format-24hr');
const alertMinNoneEl = document.querySelector('#alert-min-none');
const alertMin5El = document.querySelector('#alert-min-5');
const alertMin10El = document.querySelector('#alert-min-10');
const alertMin15El = document.querySelector('#alert-min-15');
const dndToggleEl = document.querySelector('#dnd-toggle');
const overlayToggleEl = document.querySelector('#overlay-toggle');
const fridayModeToggleEl = document.querySelector('#friday-mode-toggle');
const testPrePrayerToastEl = document.querySelector('#test-pre-prayer-toast');
const testPrayerOverlayEl = document.querySelector('#test-prayer-overlay');
const soundSelectEl = document.querySelector('#notification-sound-select');
const previewSelectedSoundEl = document.querySelector('#preview-selected-sound');
const gregorianDateTimeEl = document.querySelector('#gregorian-datetime');
const hijriDateEl = document.querySelector('#hijri-date');
const dashboardLocationEl = document.querySelector('#dashboard-location');
const quranArabicEl = document.querySelector('#quran-arabic');
const quranPronunciationEl = document.querySelector('#quran-pronunciation');
const quranMeaningEl = document.querySelector('#quran-meaning');
const quranReferenceEl = document.querySelector('#quran-reference');

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const CALC_METHOD = 2;
const MIN_CHARS_FOR_SUGGESTIONS = 2;
const SUGGESTION_LIMIT = 6;
const DEFAULT_CURRENT_LOCATION_LABEL = 'Use Current Location';
const FALLBACK_LOCATION_LABEL = 'Singapore, Singapore';
const DEFAULT_SETTINGS = {
  calculationMethod: 2,
  notifications: true,
  notificationSound: 'sound1',
  alertBeforeMinutes: 15,
  overlayEnabled: true,
  fridayModeEnabled: true
};
const DAILY_QURAN_QUOTES = [
  {
    arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    pronunciation: 'Inna ma‘a al-‘usri yusra',
    meaning: 'Indeed, with hardship comes ease.',
    reference: 'Quran 94:6'
  },
  {
    arabic: 'وَاللَّهُ مَعَ الصَّابِرِينَ',
    pronunciation: 'Wallahu ma‘a as-sabirin',
    meaning: 'And Allah is with the patient.',
    reference: 'Quran 2:153'
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    pronunciation: 'Fadhkuruni adhkurkum',
    meaning: 'So remember Me; I will remember you.',
    reference: 'Quran 2:152'
  },
  {
    arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ',
    pronunciation: 'Wa huwa ma‘akum ayna ma kuntum',
    meaning: 'And He is with you wherever you are.',
    reference: 'Quran 57:4'
  },
  {
    arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    pronunciation: 'Wa qur rabbi zidni ‘ilma',
    meaning: 'And say, "My Lord, increase me in knowledge."',
    reference: 'Quran 20:114'
  },
  {
    arabic: 'إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ',
    pronunciation: 'Inna Allaha yuhibbu al-mutawakkilin',
    meaning: 'Indeed, Allah loves those who rely upon Him.',
    reference: 'Quran 3:159'
  },
  {
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي',
    pronunciation: 'Rabbi ishrah li sadri',
    meaning: 'My Lord, expand for me my chest.',
    reference: 'Quran 20:25'
  }
];

let recentLocationsCache = [];
let suggestionDebounceTimer = null;
let suggestionAbortController = null;
let defaultSourceCache = null;
let currentTimingsCache = null;
let timeFormatCache = '12h';
let mapInstance = null;
let markerInstance = null;
let pendingMapCoords = null;
const suggestionCoordsCache = new Map();
let mapViewCache = null;
let dashboardClockTimer = null;
let previewAudioEl = null;
let lastKnownLocationCache = '';
let dashboardTimeZoneCache = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let dailyQuoteKeyCache = '';

function setSettingsTab(tabName) {
  const isLocation = tabName === 'location';
  const isNotification = tabName === 'notification';
  const isFormats = tabName === 'formats';

  if (settingsTabLocationEl) {
    settingsTabLocationEl.classList.toggle('is-active', isLocation);
    settingsTabLocationEl.setAttribute('aria-selected', String(isLocation));
  }
  if (settingsTabNotificationEl) {
    settingsTabNotificationEl.classList.toggle('is-active', isNotification);
    settingsTabNotificationEl.setAttribute('aria-selected', String(isNotification));
  }
  if (settingsTabFormatsEl) {
    settingsTabFormatsEl.classList.toggle('is-active', isFormats);
    settingsTabFormatsEl.setAttribute('aria-selected', String(isFormats));
  }

  if (settingsPanelLocationEl) settingsPanelLocationEl.hidden = !isLocation;
  if (settingsPanelNotificationEl) settingsPanelNotificationEl.hidden = !isNotification;
  if (settingsPanelFormatsEl) settingsPanelFormatsEl.hidden = !isFormats;
}

function setCurrentLocationButtonLabel(label) {
  currentLocationButtonEl.textContent = label || DEFAULT_CURRENT_LOCATION_LABEL;
}

function setLocationPlaceholder(label) {
  const text = String(label || '').trim() || FALLBACK_LOCATION_LABEL;
  locationInputEl.placeholder = text;
}

function setLocationInput(label) {
  const text = String(label || '').trim();
  const lowered = text.toLowerCase();
  const isGenericCurrentLocation =
    lowered === 'current location' ||
    lowered === '[city], [country]' ||
    lowered === 'use current location';

  if (text && !isGenericCurrentLocation) {
    lastKnownLocationCache = text;
    locationInputEl.value = text;
    setLocationPlaceholder(text);
    if (dashboardLocationEl) {
      dashboardLocationEl.textContent = text;
      dashboardLocationEl.hidden = false;
    }
    chrome.storage.local.set({ manualLocation: text });
  }
}

function setPage(pageName) {
  const showSettings = pageName === 'settings';
  dashboardPageEl.hidden = showSettings;
  settingsPageEl.hidden = !showSettings;
  mainTopbarEl.hidden = showSettings;

  if (showSettings) {
    initMap();
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.resize();
        if (pendingMapCoords) {
          setMapLocation(pendingMapCoords.latitude, pendingMapCoords.longitude);
        }
      }, 0);
    }
  }
}

function renderTimes(timings) {
  currentTimingsCache = timings;
  prayerTimeEls.forEach((el) => {
    const prayerName = el.dataset.prayerTime;
    const value = timings[prayerName];
    el.textContent = formatPrayerTime(value, timeFormatCache);
  });

  const activePrayerName = getActivePrayerName(timings);
  prayerItemEls.forEach((el) => {
    const isActive = el.dataset.prayerItem === activePrayerName;
    el.classList.toggle('is-active', isActive);
  });
  prayerDotEls.forEach((el) => {
    el.classList.toggle('is-active', el.dataset.prayerDot === activePrayerName);
  });

  updatePrayerCountdown();
}

function parseRawTime(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { hour, minute };
}

function formatPrayerTime(raw, format) {
  const parsed = parseRawTime(raw);
  if (!parsed) return '--:--';

  if (format === '24h') {
    return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
  }

  const suffix = parsed.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hour % 12 || 12;
  return `${hour12}:${String(parsed.minute).padStart(2, '0')}${suffix}`;
}

function getActivePrayerName(timings) {
  const now = new Date();
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: dashboardTimeZoneCache,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const hour = Number(nowParts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(nowParts.find((part) => part.type === 'minute')?.value || 0);
  const nowMinutes = hour * 60 + minute;

  let activeName = null;
  let activeMinutes = -1;

  PRAYER_ORDER.forEach((name) => {
    const parsed = parseRawTime(timings[name]);
    if (!parsed) return;

    const minutes = parsed.hour * 60 + parsed.minute;
    if (minutes <= nowMinutes && minutes >= activeMinutes) {
      activeMinutes = minutes;
      activeName = name;
    }
  });

  if (activeName) return activeName;
  return PRAYER_ORDER[PRAYER_ORDER.length - 1];
}

function getPrayerProgress(timings) {
  const now = new Date();
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: dashboardTimeZoneCache,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const hour = Number(nowParts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(nowParts.find((part) => part.type === 'minute')?.value || 0);
  const second = Number(nowParts.find((part) => part.type === 'second')?.value || 0);
  const nowSeconds = hour * 3600 + minute * 60 + second;

  const prayerSeconds = PRAYER_ORDER.map((name) => {
    const parsed = parseRawTime(timings[name]);
    if (!parsed) return { name, seconds: null };
    return { name, seconds: parsed.hour * 3600 + parsed.minute * 60 };
  }).filter((entry) => Number.isFinite(entry.seconds));

  if (!prayerSeconds.length) return null;

  let activeName = prayerSeconds[prayerSeconds.length - 1].name;
  for (const entry of prayerSeconds) {
    if (entry.seconds <= nowSeconds) {
      activeName = entry.name;
    }
  }

  let nextEntry = prayerSeconds.find((entry) => entry.seconds > nowSeconds);
  let secondsToNext = 0;
  if (nextEntry) {
    secondsToNext = nextEntry.seconds - nowSeconds;
  } else {
    nextEntry = prayerSeconds[0];
    secondsToNext = (24 * 3600 - nowSeconds) + nextEntry.seconds;
  }

  return {
    activeName,
    nextName: nextEntry.name,
    secondsToNext
  };
}

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updatePrayerCountdown() {
  if (!currentTimingsCache) return;

  const progress = getPrayerProgress(currentTimingsCache);
  if (!progress) return;

  prayerCountdownEls.forEach((el) => {
    const isActive = el.dataset.prayerCountdown === progress.activeName;
    el.hidden = !isActive;
    if (!isActive) return;

    el.textContent = `${progress.nextName} in ${formatCountdown(progress.secondsToNext)}`;
  });
}

function getDateParam() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

async function fetchTimings(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const body = data?.data;
  const timings = body?.timings;
  if (!timings) {
    throw new Error('No prayer timing data available.');
  }

  const latitude = Number(body?.meta?.latitude);
  const longitude = Number(body?.meta?.longitude);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const timezone = String(body?.meta?.timezone || '').trim();

  return {
    timings,
    coords: hasCoords ? { latitude, longitude } : null,
    timezone: timezone || null
  };
}

function initMap() {
  if (!mapEl || mapInstance || typeof maplibregl === 'undefined') return;

  const initialCenter = mapViewCache?.center || [101.6869, 3.139];
  const initialZoom = Number.isFinite(mapViewCache?.zoom) ? mapViewCache.zoom : 6;

  mapInstance = new maplibregl.Map({
    container: mapEl,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: initialCenter,
    zoom: initialZoom,
    attributionControl: false
  });

  mapInstance.addControl(
    new maplibregl.AttributionControl({
      compact: true,
      customAttribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'
    })
  );
  mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  mapInstance.on('moveend', () => {
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    mapViewCache = {
      center: [center.lng, center.lat],
      zoom
    };
    chrome.storage.local.set({ mapView: mapViewCache });
  });
}

function setMapLocation(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  pendingMapCoords = { latitude, longitude };

  initMap();
  if (!mapInstance) return;

  const center = [longitude, latitude];
  mapInstance.jumpTo({ center, zoom: 11 });

  if (!markerInstance) {
    markerInstance = new maplibregl.Marker({ color: '#6f7d84' }).setLngLat(center).addTo(mapInstance);
  } else {
    markerInstance.setLngLat(center);
  }
}

async function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });
}

function normalizeRecentLocations(locations) {
  if (!Array.isArray(locations)) return [];
  return locations
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function countQueryChars(text) {
  return text.trim().length;
}

function renderLocationSuggestions(locations) {
  const unique = [...new Set(normalizeRecentLocations(locations))];
  locationSuggestionsEl.innerHTML = '';

  if (!unique.length) {
    locationSuggestionsEl.hidden = true;
    return;
  }

  unique.forEach((location) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-btn';
    button.textContent = location;
    button.addEventListener('click', async () => {
      locationInputEl.value = location;
      locationSuggestionsEl.hidden = true;
      const coords = suggestionCoordsCache.get(location);
      if (coords) {
        setMapLocation(coords.latitude, coords.longitude);
      }
      setLocationInput(location);
      await loadPrayerTimesByLocation(location);
    });
    li.appendChild(button);
    locationSuggestionsEl.appendChild(li);
  });

  locationSuggestionsEl.hidden = false;
}

function composeLabel(result) {
  const parts = [result.name, result.admin1, result.country]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  return parts.join(', ');
}

async function fetchLocationSuggestions(query) {
  const endpoint =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(query)}` +
    `&count=${SUGGESTION_LIMIT}` +
    `&language=en&format=json`;

  const response = await fetch(endpoint, {
    signal: suggestionAbortController?.signal
  });

  if (!response.ok) {
    throw new Error(`Suggestion request failed with status ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((result) => {
      const label = composeLabel(result);
      const latitude = Number(result?.latitude);
      const longitude = Number(result?.longitude);
      if (label && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        suggestionCoordsCache.set(label, { latitude, longitude });
      }
      return label;
    })
    .filter(Boolean);
}

async function fetchCoordsByLocationQuery(query) {
  const value = String(query || '').trim();
  if (!value) return null;

  const endpoint =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(value)}` +
    `&count=10&language=en&format=json`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Location lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) return null;

  const parts = value
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const primary = parts[0] || '';
  const secondary = parts[parts.length - 1] || '';

  const scored = results.map((item) => {
    const name = String(item?.name || '').toLowerCase();
    const country = String(item?.country || '').toLowerCase();
    const admin1 = String(item?.admin1 || '').toLowerCase();

    let score = 0;
    if (primary && name === primary) score += 6;
    if (primary && name.includes(primary)) score += 3;
    if (secondary && country === secondary) score += 6;
    if (secondary && country.includes(secondary)) score += 4;
    if (secondary && admin1.includes(secondary)) score += 2;
    if (value.toLowerCase() === [name, admin1, country].filter(Boolean).join(', ')) score += 10;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const first = scored[0]?.item || null;
  if (!first) return null;

  const latitude = Number(first.latitude);
  const longitude = Number(first.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

async function fetchCityNameFromCoordinates(latitude, longitude) {
  const endpoint =
    `https://geocoding-api.open-meteo.com/v1/reverse` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&language=en&format=json`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const data = await response.json();
  const first = Array.isArray(data?.results) ? data.results[0] : null;
  if (!first) return null;

  const city = String(first.name || '').trim();
  const country = String(first.country || '').trim();
  if (!city && !country) return null;
  if (city && country) return `${city}, ${country}`;
  return city || country;
}

async function syncMapToPrayerLocation({ coords, location }) {
  const lat = Number(coords?.latitude);
  const lon = Number(coords?.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    setMapLocation(lat, lon);
    return;
  }

  try {
    const resolved = await fetchCoordsByLocationQuery(location);
    if (resolved) {
      setMapLocation(resolved.latitude, resolved.longitude);
    }
  } catch (_error) {
    // Keep current map state if fallback lookup fails.
  }
}

function mergeWithRecent(suggestions) {
  return [...new Set([...suggestions, ...recentLocationsCache])].slice(0, 10);
}

async function updateSuggestionsForInput() {
  const query = locationInputEl.value.trim();

  if (countQueryChars(query) < MIN_CHARS_FOR_SUGGESTIONS) {
    locationSuggestionsEl.hidden = true;
    return;
  }

  if (suggestionAbortController) {
    suggestionAbortController.abort();
  }
  suggestionAbortController = new AbortController();

  try {
    const suggestions = await fetchLocationSuggestions(query);
    if (locationInputEl.value.trim() !== query) return;
    renderLocationSuggestions(mergeWithRecent(suggestions));
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderLocationSuggestions(recentLocationsCache);
  }
}

function scheduleSuggestionsUpdate() {
  if (suggestionDebounceTimer) {
    clearTimeout(suggestionDebounceTimer);
  }

  suggestionDebounceTimer = setTimeout(() => {
    updateSuggestionsForInput();
  }, 250);
}

async function saveDefaultSource(source) {
  defaultSourceCache = source;
  await chrome.storage.local.set({ defaultSource: source });
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {})
  };
}

async function updateSettings(settingsPatch) {
  const merged = {
    ...(await getSettings()),
    ...(settingsPatch || {})
  };
  await chrome.storage.local.set({ settings: merged });
  return merged;
}

async function saveManualLocation(location) {
  const trimmedLocation = location.trim();
  const { recentLocations } = await chrome.storage.local.get('recentLocations');
  const next = [trimmedLocation, ...normalizeRecentLocations(recentLocations).filter((item) => item !== trimmedLocation)];

  await chrome.storage.local.set({
    manualLocation: trimmedLocation,
    recentLocations: next.slice(0, 8)
  });

  recentLocationsCache = normalizeRecentLocations(next);
  locationSuggestionsEl.hidden = true;
}

async function saveCachedPrayerData(timings, locationLabel, source) {
  const cachedPrayerData = {
    fetchedAt: Date.now(),
    locationLabel,
    source,
    timings
  };

  await chrome.storage.local.set({ cachedPrayerData });
}

async function loadSavedPopupData() {
  const data = await chrome.storage.local.get([
    'manualLocation',
    'recentLocations',
    'defaultSource',
    'cachedPrayerData',
    'timeFormat',
    'mapView'
  ]);

  const cachedLocation =
    data.manualLocation ||
    data.cachedPrayerData?.locationLabel ||
    data.cachedPrayerData?.source?.location ||
    data.defaultSource?.location ||
    '';

  recentLocationsCache = normalizeRecentLocations(data.recentLocations);
  defaultSourceCache = data.defaultSource || null;
  timeFormatCache = data.timeFormat === '24h' ? '24h' : '12h';
  mapViewCache = data.mapView || null;
  setDashboardTimeZone(
    data.cachedPrayerData?.source?.timezone ||
    data.defaultSource?.timezone ||
    dashboardTimeZoneCache
  );
  applyTimeFormatSelection();
  locationSuggestionsEl.hidden = true;
  setCurrentLocationButtonLabel(DEFAULT_CURRENT_LOCATION_LABEL);
  setLocationPlaceholder(cachedLocation || FALLBACK_LOCATION_LABEL);
  if (cachedLocation) {
    setLocationInput(cachedLocation);
  }

  const settings = await getSettings();
  applySoundSelection(settings.notificationSound);

  if (data.cachedPrayerData?.timings) {
    renderTimes(data.cachedPrayerData.timings);
    setLocationInput(data.cachedPrayerData.locationLabel || data.cachedPrayerData?.source?.location || cachedLocation);
    await syncMapToPrayerLocation({
      coords: data.cachedPrayerData?.source?.coords,
      location: data.cachedPrayerData?.locationLabel || data.cachedPrayerData?.source?.location
    });
  }
}

async function announceLoaded(timings, locationLabel, sourcePayload) {
  setLocationInput(locationLabel);
  setDashboardTimeZone(sourcePayload?.timezone || dashboardTimeZoneCache);
  await syncMapToPrayerLocation({
    coords: sourcePayload?.coords,
    location: sourcePayload?.location || locationLabel
  });

  await saveCachedPrayerData(timings, locationLabel, sourcePayload);

  chrome.runtime.sendMessage({
    type: 'PRAYER_TIMES_UPDATED',
    payload: {
      fetchedAt: Date.now(),
      timings,
      ...sourcePayload
    }
  });
}

function applyTimeFormatSelection() {
  if (timeFormat12El) {
    timeFormat12El.classList.toggle('is-active', timeFormatCache !== '24h');
  }
  if (timeFormat24El) {
    timeFormat24El.classList.toggle('is-active', timeFormatCache === '24h');
  }
}

async function setTimeFormat(format) {
  timeFormatCache = format === '24h' ? '24h' : '12h';
  applyTimeFormatSelection();
  await chrome.storage.local.set({ timeFormat: timeFormatCache });

  if (currentTimingsCache) {
    renderTimes(currentTimingsCache);
  }
}

function applySoundSelection(soundKey) {
  const target = ['none', 'sound1', 'sound2'].includes(soundKey) ? soundKey : 'sound1';
  if (soundSelectEl) {
    soundSelectEl.value = target;
  }
}

async function setNotificationSound(soundKey) {
  const target = ['none', 'sound1', 'sound2'].includes(soundKey) ? soundKey : 'sound1';
  applySoundSelection(target);
  await updateSettings({ notificationSound: target });
}

function applyAlertBeforeSelection(minutes) {
  const value = [0, 5, 10, 15].includes(Number(minutes)) ? Number(minutes) : 15;
  if (alertMinNoneEl) alertMinNoneEl.classList.toggle('is-active', value === 0);
  if (alertMin5El) alertMin5El.classList.toggle('is-active', value === 5);
  if (alertMin10El) alertMin10El.classList.toggle('is-active', value === 10);
  if (alertMin15El) alertMin15El.classList.toggle('is-active', value === 15);
}

async function setAlertBeforeMinutes(minutes) {
  const value = [0, 5, 10, 15].includes(Number(minutes)) ? Number(minutes) : 15;
  applyAlertBeforeSelection(value);
  await updateSettings({ alertBeforeMinutes: value });
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
}

function applyOverlaySelection(enabled) {
  if (!overlayToggleEl) return;
  overlayToggleEl.classList.toggle('is-active', Boolean(enabled));
}

function applyFridayModeSelection(enabled) {
  if (!fridayModeToggleEl) return;
  fridayModeToggleEl.classList.toggle('is-active', Boolean(enabled));
}

function applyDndSelection(enabled) {
  if (!dndToggleEl) return;
  dndToggleEl.classList.toggle('is-active', Boolean(enabled));
}

function applyNotificationControlsState(isDndEnabled) {
  const disabled = Boolean(isDndEnabled);
  const controls = [
    alertMinNoneEl,
    alertMin5El,
    alertMin10El,
    alertMin15El,
    overlayToggleEl,
    fridayModeToggleEl,
    testPrePrayerToastEl,
    testPrayerOverlayEl,
    soundSelectEl,
    previewSelectedSoundEl
  ];

  controls.forEach((el) => {
    if (!el) return;
    if ('disabled' in el) {
      el.disabled = disabled;
    }
    el.classList.toggle('is-disabled', disabled);
  });
}

async function setDoNotDisturb(enabled) {
  const isEnabled = Boolean(enabled);
  applyDndSelection(isEnabled);
  applyNotificationControlsState(isEnabled);
  await updateSettings({ notifications: !isEnabled });
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
}

async function setOverlayEnabled(enabled) {
  const isEnabled = Boolean(enabled);
  applyOverlaySelection(isEnabled);
  await updateSettings({ overlayEnabled: isEnabled });
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
}

async function setFridayModeEnabled(enabled) {
  const isEnabled = Boolean(enabled);
  applyFridayModeSelection(isEnabled);
  await updateSettings({ fridayModeEnabled: isEnabled });
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
}

function getSoundAssetPath(soundKey) {
  if (soundKey === 'none') return '';
  return soundKey === 'sound2' ? '../../assets/sound-2.wav' : '../../assets/sound-1.wav';
}

function previewNotificationSound(soundKey) {
  if (soundKey === 'none') return;
  if (previewAudioEl) {
    previewAudioEl.pause();
    previewAudioEl.currentTime = 0;
  }

  const src = getSoundAssetPath(soundKey);
  if (!src) return;
  previewAudioEl = new Audio(src);
  previewAudioEl.play().catch(() => {
    // Ignore playback errors in popup context.
  });
}

function setDashboardTimeZone(timeZone) {
  const candidate = String(timeZone || '').trim();
  if (!candidate) return;

  try {
    new Intl.DateTimeFormat([], { timeZone: candidate }).format(new Date());
    dashboardTimeZoneCache = candidate;
    updateDashboardDateTime();
    updateDailyQuranQuote();
  } catch (_error) {
    // Ignore invalid timezone values.
  }
}

function getDateKeyForZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function getQuoteIndexFromDateKey(dateKey) {
  let total = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    total += dateKey.charCodeAt(i);
  }
  return total % DAILY_QURAN_QUOTES.length;
}

function updateDailyQuranQuote() {
  const dateKey = getDateKeyForZone(dashboardTimeZoneCache);
  if (dailyQuoteKeyCache === dateKey) return;
  dailyQuoteKeyCache = dateKey;

  const quote = DAILY_QURAN_QUOTES[getQuoteIndexFromDateKey(dateKey)];
  quranArabicEl.textContent = quote.arabic;
  quranPronunciationEl.textContent = quote.pronunciation;
  quranMeaningEl.textContent = `“${String(quote.meaning || '').replace(/[."]+$/, '')}”`;
  quranReferenceEl.textContent = `(${quote.reference})`;
}

function updateDashboardDateTime() {
  const now = new Date();

  hijriDateEl.textContent = new Intl.DateTimeFormat('en-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: dashboardTimeZoneCache
  }).format(now);

  gregorianDateTimeEl.textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: dashboardTimeZoneCache
  }).format(now);

  updateDailyQuranQuote();
  updatePrayerCountdown();
}

function startDashboardClock() {
  updateDashboardDateTime();
  if (dashboardClockTimer) {
    clearInterval(dashboardClockTimer);
  }
  dashboardClockTimer = setInterval(updateDashboardDateTime, 1000);
}

async function loadPrayerTimesByCoordinates() {

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    const liveCoords = { latitude, longitude };
    let resolvedLocationName = '';
    setCurrentLocationButtonLabel('Resolving location...');
    setMapLocation(latitude, longitude);

    try {
      const cityLabel = await fetchCityNameFromCoordinates(latitude, longitude);
      if (cityLabel) {
        resolvedLocationName = cityLabel;
        setLocationInput(cityLabel);
      } else {
        setCurrentLocationButtonLabel(DEFAULT_CURRENT_LOCATION_LABEL);
      }
    } catch (_error) {
      setCurrentLocationButtonLabel(DEFAULT_CURRENT_LOCATION_LABEL);
    }


    const endpoint =
      `https://api.aladhan.com/v1/timings/${getDateParam()}` +
      `?latitude=${latitude}&longitude=${longitude}&method=${CALC_METHOD}`;
    const prayerData = await fetchTimings(endpoint);
    const timings = prayerData.timings;
    const coords = prayerData.coords || liveCoords;
    setMapLocation(coords.latitude, coords.longitude);
    const resolvedFromFinalCoords = await fetchCityNameFromCoordinates(coords.latitude, coords.longitude).catch(() => null);
    const locationLabelForSave =
      resolvedFromFinalCoords ||
      resolvedLocationName ||
      lastKnownLocationCache ||
      locationInputEl.placeholder ||
      FALLBACK_LOCATION_LABEL;

    renderTimes(timings);
    setLocationInput(locationLabelForSave);

    await saveDefaultSource({
      type: 'coords',
      location: locationLabelForSave,
      coords,
      timezone: prayerData.timezone
    });
    await announceLoaded(timings, locationLabelForSave, {
      coords,
      location: locationLabelForSave,
      timezone: prayerData.timezone
    });
  } catch (error) {
    if (error?.code === 1) {
      setCurrentLocationButtonLabel(DEFAULT_CURRENT_LOCATION_LABEL);
      return false;
    }

    setCurrentLocationButtonLabel(DEFAULT_CURRENT_LOCATION_LABEL);
    return false;
  }

  return true;
}

async function loadPrayerTimesByLocation(locationValue) {
  const location = String(locationValue || locationInputEl.value || '').trim();

  if (!location) {
    return false;
  }


  try {
    const resolvedCoords = suggestionCoordsCache.get(location) || (await fetchCoordsByLocationQuery(location));
    const endpoint = resolvedCoords
      ? `https://api.aladhan.com/v1/timings/${getDateParam()}?latitude=${resolvedCoords.latitude}&longitude=${resolvedCoords.longitude}&method=${CALC_METHOD}`
      : `https://api.aladhan.com/v1/timingsByAddress/${getDateParam()}?address=${encodeURIComponent(location)}&method=${CALC_METHOD}`;
    const prayerData = await fetchTimings(endpoint);
    const timings = prayerData.timings;
    const coords = prayerData.coords || resolvedCoords || null;

    renderTimes(timings);
    await saveManualLocation(location);
    await saveDefaultSource({ type: 'manual', location, coords, timezone: prayerData.timezone });
    await announceLoaded(timings, location, { location, coords, timezone: prayerData.timezone });
  } catch (error) {
    return false;
  }

  return true;
}

async function autoLoadDefaultLocation() {
  if (defaultSourceCache?.type === 'manual' && defaultSourceCache.location) {
    await loadPrayerTimesByLocation(defaultSourceCache.location);
    return;
  }

  if (defaultSourceCache?.type === 'coords') {
    const ok = await loadPrayerTimesByCoordinates();
    if (!ok && locationInputEl.value.trim()) {
      await loadPrayerTimesByLocation(locationInputEl.value.trim());
    }
    return;
  }

  if (locationInputEl.value.trim()) {
    await loadPrayerTimesByLocation(locationInputEl.value.trim());
    return;
  }

}

async function resolveFallbackLocationLabel() {
  if (lastKnownLocationCache) return lastKnownLocationCache;

  const fromInput = String(locationInputEl.value || '').trim();
  if (fromInput) return fromInput;

  if (pendingMapCoords?.latitude && pendingMapCoords?.longitude) {
    try {
      const mapped = await fetchCityNameFromCoordinates(pendingMapCoords.latitude, pendingMapCoords.longitude);
      if (mapped) {
        lastKnownLocationCache = mapped;
        return mapped;
      }
    } catch (_error) {
      // Ignore and continue to fallback.
    }
  }

  const fromPlaceholder = String(locationInputEl.placeholder || '').trim();
  if (fromPlaceholder) return fromPlaceholder;

  return FALLBACK_LOCATION_LABEL;
}

currentLocationButtonEl.addEventListener('click', async () => {
  await loadPrayerTimesByCoordinates();
});

locationInputEl.addEventListener('input', () => {
  const typed = String(locationInputEl.value || '').trim();
  if (typed) {
    chrome.storage.local.set({ manualLocation: typed });
  }
  scheduleSuggestionsUpdate();
});

locationInputEl.addEventListener('blur', () => {
  setTimeout(() => {
    locationSuggestionsEl.hidden = true;
  }, 120);

  const typed = String(locationInputEl.value || '').trim();
  if (typed) {
    setLocationInput(typed);
    return;
  }

  resolveFallbackLocationLabel().then((fallbackLabel) => {
    setLocationInput(fallbackLabel);
  });
});

locationInputEl.addEventListener('focus', () => {
  if (countQueryChars(locationInputEl.value) >= MIN_CHARS_FOR_SUGGESTIONS) {
    scheduleSuggestionsUpdate();
  }
});

openSettingsEl.addEventListener('click', () => {
  setSettingsTab('notification');
  setPage('settings');
});

backDashboardEl.addEventListener('click', () => {
  setPage('dashboard');
});

if (timeFormat12El) {
  timeFormat12El.addEventListener('click', () => {
    setTimeFormat('12h');
  });
}

if (timeFormat24El) {
  timeFormat24El.addEventListener('click', () => {
    setTimeFormat('24h');
  });
}

if (alertMinNoneEl) {
  alertMinNoneEl.addEventListener('click', () => {
    if (alertMinNoneEl.disabled) return;
    setAlertBeforeMinutes(0);
  });
}

if (alertMin5El) {
  alertMin5El.addEventListener('click', () => {
    if (alertMin5El.disabled) return;
    setAlertBeforeMinutes(5);
  });
}

if (alertMin10El) {
  alertMin10El.addEventListener('click', () => {
    if (alertMin10El.disabled) return;
    setAlertBeforeMinutes(10);
  });
}

if (alertMin15El) {
  alertMin15El.addEventListener('click', () => {
    if (alertMin15El.disabled) return;
    setAlertBeforeMinutes(15);
  });
}

if (dndToggleEl) {
  dndToggleEl.addEventListener('click', async () => {
    const settings = await getSettings();
    await setDoNotDisturb(settings.notifications !== false);
  });
}

if (overlayToggleEl) {
  overlayToggleEl.addEventListener('click', async () => {
    if (overlayToggleEl.disabled) return;
    const settings = await getSettings();
    await setOverlayEnabled(!settings.overlayEnabled);
  });
}

if (fridayModeToggleEl) {
  fridayModeToggleEl.addEventListener('click', async () => {
    if (fridayModeToggleEl.disabled) return;
    const settings = await getSettings();
    await setFridayModeEnabled(!settings.fridayModeEnabled);
  });
}

if (testPrePrayerToastEl) {
  testPrePrayerToastEl.addEventListener('click', () => {
    if (testPrePrayerToastEl.disabled) return;
    chrome.runtime.sendMessage({ type: 'TEST_PRE_PRAYER_TOAST' });
  });
}

if (testPrayerOverlayEl) {
  testPrayerOverlayEl.addEventListener('click', () => {
    if (testPrayerOverlayEl.disabled) return;
    chrome.runtime.sendMessage({ type: 'TEST_PRAYER_OVERLAY' });
  });
}

if (soundSelectEl) {
  soundSelectEl.addEventListener('change', () => {
    if (soundSelectEl.disabled) return;
    setNotificationSound(soundSelectEl.value);
  });
}

if (previewSelectedSoundEl) {
  previewSelectedSoundEl.addEventListener('click', () => {
    if (previewSelectedSoundEl.disabled) return;
    previewNotificationSound(soundSelectEl?.value || 'sound1');
  });
}

if (settingsTabLocationEl) {
  settingsTabLocationEl.addEventListener('click', () => setSettingsTab('location'));
}

if (settingsTabNotificationEl) {
  settingsTabNotificationEl.addEventListener('click', () => setSettingsTab('notification'));
}

if (settingsTabFormatsEl) {
  settingsTabFormatsEl.addEventListener('click', () => setSettingsTab('formats'));
}

async function init() {
  setCurrentLocationButtonLabel(DEFAULT_CURRENT_LOCATION_LABEL);
  setPage('dashboard');
  setSettingsTab('notification');
  initMap();
  startDashboardClock();
  await loadSavedPopupData();
  const settings = await getSettings();
  applyAlertBeforeSelection(settings.alertBeforeMinutes);
  applyDndSelection(settings.notifications === false);
  applyNotificationControlsState(settings.notifications === false);
  applyOverlaySelection(settings.overlayEnabled !== false);
  applyFridayModeSelection(settings.fridayModeEnabled !== false);
  await autoLoadDefaultLocation();
}

init();
