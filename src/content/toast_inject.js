function closeExistingToast() {
  const old = document.querySelector('#rihla-pre-prayer-toast');
  if (old) old.remove();
}

function renderToast({ prayerName, prayerTime, minutesBefore }) {
  closeExistingToast();

  const root = document.createElement('section');
  root.id = 'rihla-pre-prayer-toast';
  root.innerHTML = `
    <div class="head">
      <div class="icon-wrap">●</div>
      <div>
        <p class="title">${prayerName} ${prayerTime}</p>
        <p class="sub">in ${minutesBefore} minutes</p>
      </div>
    </div>
    <div class="actions">
      <button class="snooze" type="button">Snooze</button>
      <button class="dismiss" type="button">Dismiss</button>
    </div>
  `;

  root.querySelector('.snooze')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'SNOOZE_PRAYER',
      payload: { prayerName }
    });
    closeExistingToast();
  });

  root.querySelector('.dismiss')?.addEventListener('click', () => {
    closeExistingToast();
  });

  document.documentElement.appendChild(root);

  setTimeout(() => {
    closeExistingToast();
  }, 60000);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SHOW_PRE_PRAYER_TOAST') return;
  renderToast(message.payload || {});
});
