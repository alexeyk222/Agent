import { updateIntensityLabel, setStatusBadge } from './ui.js';
import { bindSessionHandlers } from './session.js';
import { bindChatHandlers, pushAgentGreeting } from './chat.js';
import { fetchProgress, renderPlaceholderProgress, renderProgress } from './progress.js';
import { loadCards } from './cards.js';
import { state } from './state.js';

async function refreshProgress() {
  try {
    const data = await fetchProgress();
    renderProgress(data);
    state.progress = data;
    await loadCards(data);
  } catch (err) {
    setStatusBadge('Офлайн: нет данных', 'muted');
    renderPlaceholderProgress(err.message);
  }
}

function bindInteractions() {
  const intensityInput = document.getElementById('intensityInput');
  if (intensityInput) {
    intensityInput.addEventListener('input', updateIntensityLabel);
  }
}

function init() {
  bindInteractions();
  bindChatHandlers();
  bindSessionHandlers({ refreshProgress, onGreeting: pushAgentGreeting });
  updateIntensityLabel();
  refreshProgress();
}

document.addEventListener('DOMContentLoaded', init);
