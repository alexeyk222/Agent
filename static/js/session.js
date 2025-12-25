import { request } from './api.js';
import { ui, showToast, setStatusBadge } from './ui.js';
import { state } from './state.js';
import { renderProgress } from './progress.js';

export function bindSessionHandlers({ refreshProgress, onGreeting }) {
  const sessionForm = document.getElementById('sessionForm');

  if (sessionForm) {
    sessionForm.addEventListener('submit', (event) => handleSessionStart(event, refreshProgress, onGreeting));
  }

  if (ui.completeSession) {
    ui.completeSession.addEventListener('click', () => handleCompleteSession(refreshProgress));
  }

  if (ui.logMicrostep) {
    ui.logMicrostep.addEventListener('click', () => handleMicrostep(refreshProgress));
  }

  if (ui.saveButton) {
    ui.saveButton.addEventListener('click', handleSave);
  }
}

async function handleSessionStart(event, refreshProgress, onGreeting) {
  event.preventDefault();
  const payload = {
    district: ui.districtSelect?.value,
    emotion: ui.emotionInput?.value.trim(),
    intensity: Number(ui.intensityInput?.value || 5)
  };

  if (!payload.emotion) {
    showToast('Опишите эмоцию перед стартом', 'error');
    return;
  }

  try {
    const data = await request('/api/session/start', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.session = { ...data.session, district: payload.district, emotion: payload.emotion };
    setStatusBadge('Сессия активна', 'active');
    updateSessionSummary(data);
    renderProgress(data.progress || state.progress || {});
    await refreshProgress();
    if (data.agent_greeting && onGreeting) {
      onGreeting(data.agent_greeting);
    }
    showToast('Сессия запущена');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCompleteSession(refreshProgress) {
  if (!state.session) return;
  try {
    const data = await request('/api/session/end', {
      method: 'POST',
      body: JSON.stringify({ session: state.session })
    });
    state.session = null;
    setStatusBadge('Готов к запуску', 'ready');
    updateSessionSummary(null);
    await refreshProgress();
    showToast(`Сессия завершена: +${data.points_earned} очков`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleMicrostep(refreshProgress) {
  try {
    const data = await request('/api/task/complete', {
      method: 'POST',
      body: JSON.stringify({
        task: {
          type: 'microstep',
          action_key: 'microstep',
          description: 'Отмечен микрошаг из интерфейса'
        },
        result: { completed: true }
      })
    });
    showToast(`+${data.effort_earned} Effort`);
    await refreshProgress();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSave() {
  try {
    await request('/api/save', { method: 'POST' });
    showToast('Прогресс сохранён');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateSessionSummary(payload) {
  if (!ui.sessionSummary) return;

  if (!payload) {
    ui.sessionSummary.hidden = true;
    if (ui.completeSession) {
      ui.completeSession.disabled = true;
    }
    return;
  }

  const { session, district_info, agent_greeting } = payload;
  const lines = [
    `<strong>Квартал:</strong> ${district_info?.name || session?.district}`,
    `<strong>Эмоция:</strong> ${session?.emotion} (${session?.intensity}/10)`,
    session?.level_id ? `<strong>Уровень:</strong> ${session.level_id}` : null,
    session?.act ? `<strong>Акт:</strong> ${session.act}` : null,
    agent_greeting ? `<strong>Приветствие Айры:</strong> ${agent_greeting}` : null
  ].filter(Boolean);

  ui.sessionSummary.innerHTML = lines.join('<br>');
  ui.sessionSummary.hidden = false;
  if (ui.completeSession) {
    ui.completeSession.disabled = false;
  }
}
