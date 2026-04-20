const statusEl = document.querySelector('#status');
const timeEls = document.querySelectorAll('.time[data-prayer]');

function cleanTime(value) {
  if (!value) return '--:--';
  return value.split(' ')[0].trim();
}

function renderTimes(timings) {
  timeEls.forEach((el) => {
    const prayerName = el.dataset.prayer;
    el.textContent = cleanTime(timings[prayerName]);
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
    statusEl.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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

loadPrayerTimes();
