chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    settings: {
      calculationMethod: 2,
      notifications: true
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'PRAYER_TIMES_UPDATED') return;

  chrome.storage.local.set({
    latestPrayerData: message.payload
  });

  sendResponse({ ok: true });
  return true;
});
