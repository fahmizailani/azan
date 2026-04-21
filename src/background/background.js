const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const ALARM_PREFIX = 'prayer:';
const PRE_ALARM_PREFIX = 'preprayer:';
const SNOOZE_PREFIX = 'snooze:';
const JUMUAH_PREFIX = 'jumuah:';
const JUMUAH_REMINDER_MINUTES = 30;

const DEFAULT_SETTINGS = {
  calculationMethod: 2,
  notifications: true,
  notificationSound: 'sound1',
  alertBeforeMinutes: 15,
  overlayEnabled: true,
  fridayModeEnabled: true
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

async function clearAlarmsByPrefixes(prefixes) {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => prefixes.some((prefix) => alarm.name.startsWith(prefix)))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );
}

function parseAlarmPrayerName(name, prefix) {
  return String(name || '').replace(prefix, '');
}

function buildPreAlarmName(prayerName) {
  return `${PRE_ALARM_PREFIX}${prayerName}`;
}

function buildPrayerAlarmName(prayerName) {
  return `${ALARM_PREFIX}${prayerName}`;
}

function buildJumuahAlarmName() {
  return `${JUMUAH_PREFIX}reminder`;
}

function getTimeZoneWeekday(timeZone) {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      weekday: 'long'
    }).format(new Date());
    return weekday;
  } catch (_error) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  }
}

async function schedulePrayerAndPrePrayerAlarms(prayerPayload) {
  const timings = prayerPayload?.timings;
  if (!timings) return;

  const settings = await getSettings();
  const beforeMinutes = Number(settings.alertBeforeMinutes || 0);

  await clearAlarmsByPrefixes([ALARM_PREFIX, PRE_ALARM_PREFIX, JUMUAH_PREFIX]);

  const now = Date.now();
  await Promise.all(
    PRAYER_ORDER.map(async (prayerName) => {
      const whenDate = parseTimeToDateToday(timings[prayerName]);
      if (!whenDate) return;
      const when = whenDate.getTime();
      if (when <= now) return;

      await chrome.alarms.create(buildPrayerAlarmName(prayerName), { when });

      if (beforeMinutes > 0) {
        const preWhen = when - beforeMinutes * 60 * 1000;
        if (preWhen > now) {
          await chrome.alarms.create(buildPreAlarmName(prayerName), { when: preWhen });
        }
      }
    })
  );

  if (settings.fridayModeEnabled !== false) {
    const timezone = prayerPayload?.timezone || prayerPayload?.source?.timezone || 'UTC';
    const isFriday = getTimeZoneWeekday(timezone) === 'Friday';
    const dhuhrDate = parseTimeToDateToday(timings.Dhuhr);
    if (isFriday && dhuhrDate) {
      const jumuahWhen = dhuhrDate.getTime() - JUMUAH_REMINDER_MINUTES * 60 * 1000;
      if (jumuahWhen > now) {
        await chrome.alarms.create(buildJumuahAlarmName(), { when: jumuahWhen });
      }
    }
  }
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
  if (soundKey === 'none') return;
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

function toQuery(params) {
  return new URLSearchParams(params).toString();
}

async function openPrePrayerToast(prayerName, prayerTime, minutesBefore) {
  let [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab?.id) {
    const fallbackTabs = await chrome.tabs.query({ active: true });
    activeTab = fallbackTabs.find((tab) => tab.id);
  }
  if (!activeTab?.id) return;

  await chrome.tabs.sendMessage(activeTab.id, {
    type: 'SHOW_PRE_PRAYER_TOAST',
    payload: {
      prayerName,
      prayerTime,
      minutesBefore
    }
  }).catch(() => {
    // Some pages (e.g. chrome://) cannot run content scripts.
  });
}

async function openPrayerOverlay(prayerName, prayerTime) {
  const query = toQuery({
    prayer: prayerName,
    time: prayerTime
  });

  await chrome.tabs.create({
    url: chrome.runtime.getURL(`src/alerts/prayer_overlay.html?${query}`),
    active: true
  });
}

async function getLatestPrayerData() {
  const { latestPrayerData } = await chrome.storage.local.get('latestPrayerData');
  return latestPrayerData || null;
}

async function rescheduleFromLatestData() {
  const latestPrayerData = await getLatestPrayerData();
  if (!latestPrayerData?.timings) return;
  await schedulePrayerAndPrePrayerAlarms(latestPrayerData);
}

chrome.runtime.onInstalled.addListener(async () => {
  await saveSettings({});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.settings || changes.latestPrayerData) {
    rescheduleFromLatestData();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PRAYER_TIMES_UPDATED') {
    (async () => {
      try {
        await chrome.storage.local.set({
          latestPrayerData: message.payload
        });
        await schedulePrayerAndPrePrayerAlarms(message.payload);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === 'SETTINGS_UPDATED') {
    (async () => {
      try {
        await rescheduleFromLatestData();
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === 'TEST_PRE_PRAYER_TOAST') {
    (async () => {
      try {
        const settings = await getSettings();
        await playPrayerSound(settings.notificationSound || 'sound1');
        await openPrePrayerToast('Asr', '4:10 PM', Number(settings.alertBeforeMinutes ?? 15));
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === 'TEST_PRAYER_OVERLAY') {
    (async () => {
      try {
        const settings = await getSettings();
        await playPrayerSound(settings.notificationSound || 'sound1');
        await openPrayerOverlay('Maghrib', '6:52 PM');
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === 'SNOOZE_PRAYER') {
    (async () => {
      try {
        const prayerName = String(message?.payload?.prayerName || '').trim();
        if (prayerName) {
          await chrome.alarms.create(`${SNOOZE_PREFIX}${prayerName}`, { when: Date.now() + 5 * 60 * 1000 });
        }
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const settings = await getSettings();
  if (settings.notifications === false) return;

  if (alarm?.name?.startsWith(PRE_ALARM_PREFIX)) {
    const prayerName = parseAlarmPrayerName(alarm.name, PRE_ALARM_PREFIX);
    const latestPrayerData = await getLatestPrayerData();
    const prayerTime = latestPrayerData?.timings?.[prayerName] || '--:--';
    await playPrayerSound(settings.notificationSound || 'sound1');
    await openPrePrayerToast(prayerName, prayerTime, Number(settings.alertBeforeMinutes ?? 0));
    return;
  }

  if (alarm?.name?.startsWith(JUMUAH_PREFIX)) {
    const latestPrayerData = await getLatestPrayerData();
    const prayerTime = latestPrayerData?.timings?.Dhuhr || '--:--';
    await playPrayerSound(settings.notificationSound || 'sound1');
    await openPrePrayerToast('Jumu’ah', prayerTime, JUMUAH_REMINDER_MINUTES);
    return;
  }

  if (alarm?.name?.startsWith(SNOOZE_PREFIX)) {
    const prayerName = parseAlarmPrayerName(alarm.name, SNOOZE_PREFIX);
    const latestPrayerData = await getLatestPrayerData();
    const prayerTime = latestPrayerData?.timings?.[prayerName] || '--:--';

    await playPrayerSound(settings.notificationSound || 'sound1');

    // Snooze always re-notifies after 5 minutes with the toast.
    await openPrePrayerToast(prayerName, prayerTime, 0);
    return;
  }

  if (alarm?.name?.startsWith(ALARM_PREFIX)) {
    const prayerName = parseAlarmPrayerName(alarm.name, ALARM_PREFIX);
    const latestPrayerData = await getLatestPrayerData();
    const prayerTime = latestPrayerData?.timings?.[prayerName] || '--:--';

    await playPrayerSound(settings.notificationSound || 'sound1');

    if (settings.overlayEnabled !== false) {
      await openPrayerOverlay(prayerName, prayerTime);
    }
  }
});
