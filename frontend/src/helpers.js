/**
 * Helpers / Utilities — POS ร้านไก่ทอดช้างแดง Vue 3 SPA
 */
import { reactive } from 'vue';

// ─── Reactive Global UI State ───
export const uiState = reactive({
  loading: false,
  toasts: [],
  confirm: null, // { title, message, resolve }
});

export const ui = {
  showLoading() {
    uiState.loading = true;
  },
  hideLoading() {
    uiState.loading = false;
  },
  showToast(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random();
    uiState.toasts.push({ id, message, type });
    setTimeout(() => {
      uiState.toasts = uiState.toasts.filter(t => t.id !== id);
    }, duration);
  },
  showConfirm(title, message) {
    return new Promise((resolve) => {
      uiState.confirm = {
        title,
        message,
        resolve: (result) => {
          uiState.confirm = null;
          resolve(result);
        }
      };
    });
  }
};

// ─── Formatting Helpers ───
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '฿' + num.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  let d;
  if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const isoStr = dateStr.replace(' ', 'T') + '+07:00';
    d = new Date(isoStr);
  } else {
    d = new Date(dateStr);
  }
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '-';
  let d;
  if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const isoStr = dateStr.replace(' ', 'T') + '+07:00';
    d = new Date(isoStr);
  } else {
    d = new Date(dateStr);
  }
  return d.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return formatDate(dateStr) + ' ' + formatTime(dateStr);
}

export function getToday() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

export function getCurrentMonth() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit'
  });
  return formatter.format(new Date());
}

// ─── Session Helpers ───
export function getUser() {
  try {
    const raw = sessionStorage.getItem('pos_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

// ─── Confetti (Uses Theme Colors) ───
export function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  // colors
  const colors = ['#8b0313', '#ad281e', '#ffab2b', '#fff7df', '#2a9d8f'];

  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-10px';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1 + Math.random() * 1) + 's';
    piece.style.width = (4 + Math.random() * 6) + 'px';
    piece.style.height = (4 + Math.random() * 6) + 'px';
    container.appendChild(piece);
  }

  setTimeout(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  }, 2500);
}

export function roundUp(amount, to) {
  return Math.ceil(amount / to) * to;
}

export default {
  ui,
  uiState,
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  getToday,
  getCurrentMonth,
  getUser,
  isAdmin,
  showConfetti,
  roundUp,
};
