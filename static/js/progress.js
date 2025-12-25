import { request } from './api.js';
import { ui, setHeroPlaceholder } from './ui.js';
import { state } from './state.js';
import { renderDistricts, populateDistrictSelect } from './districts.js';

export async function fetchProgress() {
  return request('/api/progress');
}

export function renderProgress(progress) {
  state.progress = progress;
  updateHero(progress);
  updateSessionBadge();
  renderDistricts(progress.districts || {});
  populateDistrictSelect(progress.districts || {});
  renderHistory(progress);
  renderEffort(progress.effort ?? 0);
}

export function renderHistory(progress) {
  if (!ui.history) return;
  const sessions = progress.district_sessions || {};
  const actions = progress.actions_history || {};
  const lines = [];

  Object.entries(sessions).forEach(([key, value]) => {
    lines.push(`• ${key}: ${value} сессий`);
  });

  Object.entries(actions).forEach(([key, value]) => {
    lines.push(`• ${key}: ${value} действий`);
  });

  ui.history.textContent = lines.length
    ? lines.join('\n')
    : 'История появится после первых шагов.';
}

export function renderEffort(effort) {
  if (ui.effortValue) {
    ui.effortValue.textContent = effort;
  }
  if (ui.effortBar) {
    const pct = Math.min(100, (effort / 10) * 100);
    ui.effortBar.style.width = `${pct}%`;
  }
  if (ui.effortHint) {
    ui.effortHint.textContent = effort > 0
      ? 'Можно открывать новые карты'
      : 'Сделайте микрошаги, чтобы накопить Effort';
  }
}

export function renderPlaceholderProgress(message) {
  setHeroPlaceholder(message);
  if (ui.lastSession) {
    ui.lastSession.textContent = 'Данные временно недоступны';
  }
  if (ui.districtGrid) {
    ui.districtGrid.innerHTML = '<div class="muted">Нет связи с сервером. Используйте демо-данные или попробуйте позже.</div>';
  }
  if (ui.history) {
    ui.history.textContent = 'История появится после подключения к серверу.';
  }
}

function updateHero(progress) {
  if (ui.stabilityValue) {
    ui.stabilityValue.textContent = progress.stability_points ?? '—';
  }
  if (ui.effortValue) {
    ui.effortValue.textContent = progress.effort ?? '—';
  }
  if (ui.actsValue) {
    ui.actsValue.textContent = progress.acts_completed ?? '—';
  }

  const last = progress.last_session ? new Date(progress.last_session) : null;
  if (ui.lastSession) {
    ui.lastSession.textContent = last ? `Последняя сессия: ${last.toLocaleString()}` : 'Сессии ещё не запускались';
  }
}

function updateSessionBadge() {
  if (!ui.sessionState) return;
  ui.sessionState.textContent = state.session ? 'Идёт сессия' : 'Нет активной сессии';
}
