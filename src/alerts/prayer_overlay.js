const titleEl = document.querySelector('#overlay-title');
const timeEl = document.querySelector('#overlay-time');
const snoozeEl = document.querySelector('#overlay-snooze');
const dismissEl = document.querySelector('#overlay-dismiss');
const iconEl = document.querySelector('.overlay-icon');

const params = new URLSearchParams(window.location.search);
const prayer = params.get('prayer') || 'Prayer';
const time = params.get('time') || '--:--';

const ICON_CLASS_BY_PRAYER = {
  Fajr: 'overlay-icon-fajr',
  Dhuhr: 'overlay-icon-dhuhr',
  Asr: 'overlay-icon-asr',
  Maghrib: 'overlay-icon-maghrib',
  Isha: 'overlay-icon-isha'
};

titleEl.textContent = `${prayer} has begun`;
timeEl.textContent = time;
if (iconEl) {
  const cls = ICON_CLASS_BY_PRAYER[prayer] || 'overlay-icon-dhuhr';
  iconEl.classList.add(cls);
}

snoozeEl.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    type: 'SNOOZE_PRAYER',
    payload: { prayerName: prayer }
  });
  window.close();
});

dismissEl.addEventListener('click', () => {
  window.close();
});
