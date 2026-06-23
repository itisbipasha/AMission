// ─── Toast ──────────────────────────────────────────
function showToast(msg, duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

window.addEventListener('DOMContentLoaded', () => {
  const pending = sessionStorage.getItem('pendingToast');
  if (pending) {
    sessionStorage.removeItem('pendingToast');
    setTimeout(() => showToast(pending), 400);
  }
});

// ─── Delete toast ────────────────────────────────────
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

// ─── Motivational quotes ─────────────────────────────
const quotes = [
  "Every checked box is a small victory. Celebrate it! 🎉",
  "You're doing great. One task at a time. ✨",
  "Progress, not perfection. Keep going! 🌟",
  "Today's effort is tomorrow's success. 💪",
  "You've got this! The list is shorter than it looks. 😊",
  "Small steps every day lead to big journeys. 🗺️",
  "Believe in yourself — you're more capable than you think! 🌈",
  "Tick off one task and feel unstoppable! ⚡",
  "Your future self will thank you for today's work. 🙌",
  "Focus. You're closer to done than you think! 🔥"
];
window.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('daily-quote');
  if (el) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];
});

// ─── Notifications ────────────────────────────────────
let notifShown = JSON.parse(localStorage.getItem('notifShown') || '[]');

function requestNotifPermission() {
  if (!('Notification' in window)) {
    alert('Your browser does not support notifications. Please use Chrome.');
    return;
  }
  Notification.requestPermission().then(perm => {
    document.getElementById('notif-banner').style.display = 'none';
    if (perm === 'granted') {
      showToast('🔔 Notifications enabled! You will be reminded 1 hour before deadlines.');
      checkDueSoon();
    } else {
      showToast('⚠️ Notifications blocked. Enable them in browser settings.');
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
  try {
    new Notification('Luminara Reminder 🌟', {
      body: msg,
      requireInteraction: false,
    });
  } catch(e) {
    showToast(msg, 6000);
  }
}

async function checkDueSoon() {
  try {
    const res = await fetch('/api/due-soon');
    if (!res.ok) return;
    const tasks = await res.json();
    tasks.forEach(task => {
      const key = `notif_${task.id}`;
      if (!notifShown.includes(key)) {
        notifShown.push(key);
        localStorage.setItem('notifShown', JSON.stringify(notifShown));
        if (Notification.permission === 'granted') {
          showReminderNotification(task.title, task.minutes_left);
        } else {
          showToast(`⏰ "${task.title}" is due in ${task.minutes_left} minutes!`, 8000);
        }
      }
    });
    // Clean old keys every hour
    if (notifShown.length > 100) {
      notifShown = [];
      localStorage.setItem('notifShown', '[]');
    }
  } catch (e) {
    console.log('Reminder check failed:', e);
  }
}

function startReminderPolling() {
  checkDueSoon();
  setInterval(checkDueSoon, 2 * 60 * 1000); // every 2 minutes
}

window.addEventListener('DOMContentLoaded', () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    startReminderPolling();
  } else if (Notification.permission !== 'denied') {
    const banner = document.getElementById('notif-banner');
    if (banner) setTimeout(() => { banner.style.display = 'flex'; }, 500);
  }
});

// ─── Deadline colour coding ───────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-deadline]').forEach(el => {
    const dl = new Date(el.dataset.deadline);
    const diff = (dl - Date.now()) / 60000;
    if (diff < 0)        el.classList.add('overdue');
    else if (diff < 60)  el.classList.add('due-soon');
    else if (diff < 1440) el.classList.add('due-today');
  });
});

// ─── Mobile sidebar ───────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 768) {
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '☰';
    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.body.prepend(btn);
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !e.target.classList.contains('mobile-menu-btn')) {
        sidebar.classList.remove('open');
      }
    });
  }
});
