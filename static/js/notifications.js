import { ui } from './ui.js';

export function showToast(message, tone = 'default') {
  if (!ui.toast) return;
  ui.toast.textContent = message;
  ui.toast.style.borderColor = tone === 'error' ? 'rgba(248,113,113,0.7)' : 'var(--border)';
  ui.toast.hidden = false;
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => { ui.toast.hidden = true; }, 3200);
}
