const statusEl = document.querySelector('#status');
const buttonEl = document.querySelector('#load-prayer-times');
const timesEl = document.querySelector('#times');

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function renderTimes(timings) {
  timesEl.innerHTML = '';

  PRAYER_ORDER.forEach((name) => {
    const value = timings[name];
    if (!value) return;

    const li = document.createElement('li');
    li.textContent = `${name}: ${value}`;
    timesEl.appendChild(li);
  });
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

async function loadPrayerTimes() {
  statusEl.textContent = 'Getting location...';

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    statusEl.textContent = 'Fetching prayer times...';

    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const endpoint = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=2`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const timings = data?.data?.timings;

    if (!timings) {
      throw new Error('No prayer timing data available.');
    }

    renderTimes(timings);
    statusEl.textContent = 'Prayer times loaded.';

    chrome.runtime.sendMessage({
      type: 'PRAYER_TIMES_UPDATED',
      payload: {
        fetchedAt: Date.now(),
        timings,
        coords: { latitude, longitude }
      }
    });
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  }
}

buttonEl.addEventListener('click', () => {
  loadPrayerTimes();
});
