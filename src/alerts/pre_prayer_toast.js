const titleEl = document.querySelector('#toast-title');
const subEl = document.querySelector('#toast-sub');
const snoozeEl = document.querySelector('#toast-snooze');
const dismissEl = document.querySelector('#toast-dismiss');
const iconEl = document.querySelector('.toast-icon');

const params = new URLSearchParams(window.location.search);
const prayer = params.get('prayer') || 'Prayer';
const time = params.get('time') || '--:--';
const minutes = params.get('minutes') || '15';

const ICON_CLASS_BY_PRAYER = {
  Fajr: 'toast-icon-fajr',
  Dhuhr: 'toast-icon-dhuhr',
  Asr: 'toast-icon-asr',
  Maghrib: 'toast-icon-maghrib',
  Isha: 'toast-icon-isha'
};

titleEl.textContent = `${prayer} ${time}`;
subEl.textContent = `in ${minutes} minutes`;
if (iconEl) {
  const cls = ICON_CLASS_BY_PRAYER[prayer] || 'toast-icon-dhuhr';
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
