import { state } from './state.js';
import { ui } from './ui.js';
import { populateDistrictSelect, renderDistricts, updateSparkline } from './districts.js';

function renderHistory(progress) {
  const sessions = progress.district_sessions || {};
  const actions = progress.actions_history || {};
  const lines = [];
  Object.entries(sessions).forEach(([key, value]) => {
    lines.push(`• ${key}: ${value} сессий`);
  });
  Object.entries(actions).forEach(([key, value]) => {
    lines.push(`• ${key}: ${value} действий`);
  });
  ui.history.textContent = lines.length ? lines.join('\n') : 'История появится после первых шагов.';
}

export function renderEffort(effort) {
  ui.effortValue.textContent = effort;
  const pct = Math.min(100, (effort / 10) * 100);
  ui.effortBar.style.width = `${pct}%`;
  ui.effortHint.textContent = effort > 0 ? 'Можно открывать новые карты' : 'Сделайте микрошаги, чтобы накопить Effort';
}

export function renderProgress(progress) {
  state.progress = progress;
  ui.stabilityValue.textContent = progress.stability_points ?? '—';
  ui.effortValue.textContent = progress.effort ?? '—';
  ui.actsValue.textContent = progress.acts_completed ?? '—';
  ui.sessionState.textContent = state.session ? 'Идёт сессия' : 'Нет активной сессии';

  const last = progress.last_session ? new Date(progress.last_session) : null;
  ui.lastSession.textContent = last ? `Последняя сессия: ${last.toLocaleString()}` : 'Сессии ещё не запускались';

  renderDistricts(progress.districts || {});
  populateDistrictSelect(progress.districts || {});
  updateSparkline(progress.districts || {});
  renderHistory(progress);
  renderEffort(progress.effort ?? 0);
}
