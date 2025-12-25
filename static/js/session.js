import { completeTask, endSession, saveGame, startSession } from './api.js';
import { showToast } from './notifications.js';
import { state } from './state.js';
import { ui } from './ui.js';

export function updateIntensityLabel() {
  ui.intensityValue.textContent = ui.intensityInput.value;
}

function updateSessionSummary(payload) {
  if (!payload) {
    ui.sessionSummary.hidden = true;
    ui.completeSession.disabled = true;
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
  ui.completeSession.disabled = false;
}

export async function handleSessionStart(event, { reloadProgress, onGreeting } = {}) {
  event.preventDefault();
  const payload = {
    district: ui.districtSelect.value,
    emotion: ui.emotionInput.value.trim(),
    intensity: Number(ui.intensityInput.value)
  };

  if (!payload.emotion) {
    showToast('Опишите эмоцию перед стартом', 'error');
    return;
  }

  try {
    const data = await startSession(payload);
    state.session = { ...data.session, district: payload.district, emotion: payload.emotion };
    ui.statusBadge.textContent = 'Сессия активна';
    ui.statusBadge.style.background = 'rgba(102,217,232,0.14)';
    updateSessionSummary(data);
    if (typeof reloadProgress === 'function') {
      await reloadProgress();
    }
    if (data.agent_greeting && typeof onGreeting === 'function') {
      onGreeting(data.agent_greeting);
    }
    showToast('Сессия запущена');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function handleCompleteSession({ reloadProgress } = {}) {
  if (!state.session) return;
  try {
    const data = await endSession(state.session);
    state.session = null;
    ui.statusBadge.textContent = 'Готов к запуску';
    ui.statusBadge.style.background = 'rgba(52,211,153,0.14)';
    updateSessionSummary(null);
    if (typeof reloadProgress === 'function') {
      await reloadProgress();
    }
    showToast(`Сессия завершена: +${data.points_earned} очков`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function handleMicrostep({ reloadProgress } = {}) {
  try {
    const data = await completeTask({
      task: {
        type: 'microstep',
        action_key: 'microstep',
        description: 'Отмечен микрошаг из интерфейса'
      },
      result: { completed: true }
    });
    showToast(`+${data.effort_earned} Effort`);
    if (typeof reloadProgress === 'function') {
      await reloadProgress();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function handleSave() {
  try {
    await saveGame();
    showToast('Прогресс сохранён');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function refreshSessionSummary(payload) {
  updateSessionSummary(payload);
}
