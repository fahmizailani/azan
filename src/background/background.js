const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const ALARM_PREFIX = 'prayer:';
const DEFAULT_SETTINGS = {
  calculationMethod: 2,
  notifications: true,
  notificationSound: 'sound1'
};

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {})
  };
}

async function saveSettings(settingsPatch) {
  const merged = {
    ...(await getSettings()),
    ...(settingsPatch || {})
  };
  await chrome.storage.local.set({ settings: merged });
  return merged;
}

function parseTimeToDateToday(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const now = new Date();
  const when = new Date(now);
  when.setHours(hours, minutes, 0, 0);
  return when;
}

async function clearPrayerAlarms() {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(ALARM_PREFIX))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );
}

async function schedulePrayerAlarms(prayerPayload) {
  const timings = prayerPayload?.timings;
  if (!timings) return;

  await clearPrayerAlarms();

  const now = Date.now();
  await Promise.all(
    PRAYER_ORDER.map(async (prayerName) => {
      const whenDate = parseTimeToDateToday(timings[prayerName]);
      if (!whenDate) return;
      const when = whenDate.getTime();
      if (when <= now) return;

      await chrome.alarms.create(`${ALARM_PREFIX}${prayerName}`, {
        when
      });
    })
  );
}

async function ensureOffscreenDocument() {
  if (!chrome.offscreen) return;

  const hasDocument = chrome.offscreen.hasDocument
    ? await chrome.offscreen.hasDocument()
    : false;

  if (hasDocument) return;

  await chrome.offscreen.createDocument({
    url: 'src/offscreen/audio.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play prayer notification sounds at alarm time.'
  });
}

async function playPrayerSound(soundKey) {
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({
      type: 'PLAY_PRAYER_SOUND',
      soundKey
    });
  } catch (_error) {
    // Keep alarm flow resilient even if audio playback setup fails.
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await saveSettings({});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'PRAYER_TIMES_UPDATED') return;

  (async () => {
    await chrome.storage.local.set({
      latestPrayerData: message.payload
    });
    await schedulePrayerAlarms(message.payload);
    sendResponse({ ok: true });
  })();

  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm?.name?.startsWith(ALARM_PREFIX)) return;

  const settings = await getSettings();
  if (settings.notifications === false) return;

  await playPrayerSound(settings.notificationSound || 'sound1');
});
