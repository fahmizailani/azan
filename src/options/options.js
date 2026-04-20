const notificationsEl = document.querySelector('#notifications');
const saveEl = document.querySelector('#save');
const statusEl = document.querySelector('#status');

async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  notificationsEl.checked = settings?.notifications ?? true;
}

async function saveSettings() {
  await chrome.storage.local.set({
    settings: {
      notifications: notificationsEl.checked,
      calculationMethod: 2
    }
  });

  statusEl.textContent = 'Saved';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 1500);
}

saveEl.addEventListener('click', saveSettings);
loadSettings();
