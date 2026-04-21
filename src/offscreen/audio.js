function playSound(soundKey) {
  const targetId = soundKey === 'sound2' ? 'sound2' : 'sound1';
  const audioEl = document.getElementById(targetId);
  if (!audioEl) return;

  audioEl.pause();
  audioEl.currentTime = 0;
  audioEl.play().catch(() => {
    // Ignore playback failures silently in offscreen context.
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'PLAY_PRAYER_SOUND') return;
  playSound(message.soundKey);
});
