/* ═══════════════════════════════════════════════════
   LUMINARA · main.js
   - Toast messages
   - Browser push notifications for 1-hour reminders
   - Page-load encouragement
═══════════════════════════════════════════════════ */

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Show toast from previous page action (stored in sessionStorage)
window.addEventListener('DOMContentLoaded', () => {
  const pending = sessionStorage.getItem('pendingToast');
  if (pending) {
    sessionStorage.removeItem('pendingToast');
    setTimeout(() => showToast(pending), 400);
  }
});

// ─── Delete toast ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const deleteLink = document.getElementById('confirm-delete-link');
  if (deleteLink) {
    deleteLink.addEventListener('click', () => {
      const msgs = [
        'Task removed. On to better things! ✨',
        'Gone! Your list is a little lighter now 🎉',
        'Cleared! Sometimes letting go feels great 🙌',
        'Task deleted. Space for new adventures! 🚀'
      ];
      sessionStorage.setItem('pendingToast', msgs[Math.floor(Math.random() * msgs.length)]);
    });
  }

  // Mark done toast
  document.querySelectorAll('.task-check').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.classList.contains('checked')) {
        const doneMessages = [
          'Woohoo! Task crushed! 🎉',
          'One down, you\'re on fire! 🔥',
          'Nailed it! You should be proud 🌟',
          'Done! You\'re absolutely killing it! ✨',
          'Amazing work! Keep that momentum going 💪'
        ];
        sessionStorage.setItem('pendingToast', doneMessages[Math.floor(Math.random() * doneMessages.length)]);
      }
    });
  });
});

// ─── Browser Notifications ────────────────────────────────────────────────────
let notifShown = new Set(); // track which task IDs we've already notified

function requestNotifPermission() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(perm => {
    document.getElementById('notif-banner').style.display = 'none';
    if (perm === 'granted') {
      showToast('🔔 Notifications enabled! We\'ll remind you before deadlines.');
      startReminderPolling();
    }
  });
}

function showReminderNotification(title, minutesLeft) {
  const messages = [
    `⏰ "${title}" is due in ${minutesLeft} min! Time to shine! 🌟`,
    `🔔 Heads up! "${title}" deadline in ${minutesLeft} min. You've got this! 💪`,
    `⚡ "${title}" is almost due (${minutesLeft} min left). Let's go! 🚀`,
    `✨ Don't forget "${title}"! ${minutesLeft} minutes left. You can do it!`,
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  new Notification('Luminara Reminder', {
    body: msg,
    icon: '/static/favicon.ico',
    tag: 'luminara-reminder',
    requireInteraction: false,
  });
}

async function checkDueSoon() {
  try {
    const res = await fetch('/api/due-soon');
    if (!res.ok) return;
    const tasks = await res.json();
    tasks.forEach(task => {
      if (!notifShown.has(task.id)) {
        notifShown.add(task.id);
        showReminderNotification(task.title, task.minutes_left);
      }
    });
  } catch (e) { /* silent */ }
}

function startReminderPolling() {
  checkDueSoon(); // immediate check
  setInterval(checkDueSoon, 5 * 60 * 1000); // every 5 minutes
}

// ─── Init notifications ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    startReminderPolling();
  } else if (Notification.permission !== 'denied') {
    // Show a friendly banner if not yet asked
    const banner = document.getElementById('notif-banner');
    if (banner) {
      setTimeout(() => { banner.style.display = 'flex'; }, 1500);
    }
  }
});

// ─── Mobile sidebar toggle ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Inject mobile menu button if we're in app layout
  if (window.innerWidth <= 768) {
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '☰';
    btn.title = 'Open menu';
    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.body.prepend(btn);

    // Close sidebar on outside tap
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !e.target.classList.contains('mobile-menu-btn')) {
        sidebar.classList.remove('open');
      }
    });
  }
});
