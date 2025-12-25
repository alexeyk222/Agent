export const ui = {
  stabilityValue: document.getElementById('stabilityValue'),
  effortValue: document.getElementById('effortValue'),
  actsValue: document.getElementById('actsValue'),
  districtGrid: document.getElementById('districtGrid'),
  lastSession: document.getElementById('lastSession'),
  districtSelect: document.getElementById('districtSelect'),
  emotionInput: document.getElementById('emotionInput'),
  intensityInput: document.getElementById('intensityInput'),
  intensityValue: document.getElementById('intensityValue'),
  sessionSummary: document.getElementById('sessionSummary'),
  sessionState: document.getElementById('sessionState'),
  chatLog: document.getElementById('chatLog'),
  chatInput: document.getElementById('chatInput'),
  crisisFlag: document.getElementById('crisisFlag'),
  statusBadge: document.getElementById('statusBadge'),
  effortBar: document.querySelector('#effortBar .progress__bar span'),
  effortHint: document.getElementById('effortHint'),
  history: document.getElementById('history'),
  cards: document.getElementById('cards'),
  equippedCard: document.getElementById('equippedCard'),
  toast: document.getElementById('toast'),
  heroMeta: document.getElementById('heroMeta'),
  sparkline: document.getElementById('sparkline'),
  saveButton: document.getElementById('saveButton'),
  logMicrostep: document.getElementById('logMicrostep'),
  completeSession: document.getElementById('completeSession')
};

export function showToast(message, tone = 'default') {
  if (!ui.toast || !message) return;
  ui.toast.textContent = message;
  ui.toast.style.borderColor = tone === 'error' ? 'rgba(248,113,113,0.7)' : 'var(--border)';
  ui.toast.hidden = false;
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    ui.toast.hidden = true;
  }, 3200);
}

export function updateIntensityLabel() {
  if (ui.intensityValue && ui.intensityInput) {
    ui.intensityValue.textContent = ui.intensityInput.value;
  }
}

export function setStatusBadge(text, tone = 'ready') {
  if (!ui.statusBadge) return;
  ui.statusBadge.textContent = text;
  const colors = {
    active: 'rgba(102,217,232,0.14)',
    ready: 'rgba(52,211,153,0.14)',
    muted: 'rgba(255,255,255,0.06)'
  };
  ui.statusBadge.style.background = colors[tone] || colors.ready;
}

export function setCrisisFlag(isCrisis) {
  if (!ui.crisisFlag) return;
  ui.crisisFlag.textContent = isCrisis ? 'Кризис! Контент заблокирован' : 'Без кризиса';
  ui.crisisFlag.style.background = isCrisis ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)';
}

export function setHeroPlaceholder(message) {
  if (!ui.heroMeta) return;
  const safeMessage = String(message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  ui.heroMeta.innerHTML = `<div class="meta-item"><div class="meta-item__label">Статус</div><div class="meta-item__value">${safeMessage}</div></div>`;
}
