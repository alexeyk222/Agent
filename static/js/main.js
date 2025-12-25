import { getProgress } from './api.js';
import { loadCards } from './cards.js';
import { handleChatSubmit, renderChat } from './chat.js';
import { renderProgress } from './progress.js';
import {
  handleCompleteSession,
  handleMicrostep,
  handleSave,
  handleSessionStart,
  updateIntensityLabel
} from './session.js';
import { showToast } from './notifications.js';
import { state } from './state.js';
import { ui } from './ui.js';

function addAgentGreeting(greeting) {
  state.chat.push({ role: 'agent', text: greeting });
  renderChat();
}

function showOfflinePlaceholder() {
  ui.districtGrid.innerHTML = '<div class="muted">Прогресс пока недоступен. Проверьте подключение к серверу.</div>';
  ui.history.textContent = 'Режим офлайн: подключите API, чтобы увидеть сессии и микрошаги.';
  ui.cards.innerHTML = '<div class="muted">Карты будут доступны при подключении к API.</div>';
  ui.lastSession.textContent = 'Данные прогресса недоступны офлайн';
}

async function loadProgress() {
  try {
    const data = await getProgress();
    state.offline = false;
    renderProgress(data);
    await loadCards();
  } catch (err) {
    console.warn('Прогресс недоступен:', err);
    state.offline = true;
    showOfflinePlaceholder();
  }
}

function bindEvents() {
  ui.sessionForm.addEventListener('submit', (event) =>
    handleSessionStart(event, { reloadProgress: loadProgress, onGreeting: addAgentGreeting })
  );
  ui.chatForm.addEventListener('submit', handleChatSubmit);
  ui.intensityInput.addEventListener('input', updateIntensityLabel);
  ui.logMicrostep.addEventListener('click', () => handleMicrostep({ reloadProgress: loadProgress }));
  ui.completeSession.addEventListener('click', () => handleCompleteSession({ reloadProgress: loadProgress }));
  ui.saveButton.addEventListener('click', handleSave);
}

function init() {
  bindEvents();
  updateIntensityLabel();
  loadProgress();
  showToast('Загружаем прогресс и карты…');
}

document.addEventListener('DOMContentLoaded', init);
