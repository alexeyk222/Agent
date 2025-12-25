import { api } from './api.js';

const DISTRICTS = {
  oasis: { icon: '🌿', name: 'Оазис', description: 'Здоровье и благополучие', color: '#4d8b6f' },
  citadel: { icon: '🏛️', name: 'Цитадель', description: 'Работа и учеба', color: '#4a7ba7' },
  arsenal: { icon: '⚔️', name: 'Арсенал', description: 'Финансы и ресурсы', color: '#7b5ba1' },
  forum: { icon: '🤝', name: 'Форум', description: 'Отношения и связи', color: '#d97942' },
  garden: { icon: '🌱', name: 'Сад', description: 'Личное развитие', color: '#b36f8c' }
};

const EMOTIONS = ['Тревога', 'Выгорание', 'Радость', 'Растерянность', 'Грусть', 'Злость', 'Спокойствие'];

const state = {
  progress: null,
  session: null,
  sessionContext: null,
  messages: [],
  ownedCardsDetailed: [],
  availableCardsDetailed: []
};

const el = {};

function $(id) {
  return document.getElementById(id);
}

function cacheElements() {
  Object.assign(el, {
    districtGrid: $('district-grid'),
    districtSummary: $('district-summary'),
    heroRefresh: $('refresh-progress'),
    scrollSession: $('scroll-to-session'),
    statStability: $('stat-stability'),
    statEffort: $('stat-effort'),
    statActs: $('stat-acts'),
    metaLastSession: $('meta-last-session'),
    metaLastDistrict: $('meta-last-district'),
    sessionState: $('session-state'),
    sessionForm: $('session-form'),
    fieldDistrict: $('field-district'),
    fieldEmotion: $('field-emotion'),
    fieldIntensity: $('field-intensity'),
    intensityValue: $('intensity-value'),
    endSession: $('end-session'),
    startSession: $('start-session'),
    fieldPoints: $('field-points'),
    sessionInfo: $('session-info'),
    chatWindow: $('chat-window'),
    chatForm: $('chat-form'),
    chatMessage: $('chat-message'),
    sendMessage: $('send-message'),
    chatPanel: $('chat-panel'),
    ownedCards: $('owned-cards'),
    availableCards: $('available-cards'),
    effortBalance: $('effort-balance'),
    historySessions: $('history-sessions'),
    historyMemory: $('history-memory'),
    refreshHistory: $('refresh-history'),
    toast: $('toast')
  });
}

function bindEvents() {
  el.heroRefresh.addEventListener('click', () => loadProgress());
  el.scrollSession.addEventListener('click', () => {
    document.getElementById('session-panel').scrollIntoView({ behavior: 'smooth' });
  });

  el.fieldIntensity.addEventListener('input', (e) => {
    el.intensityValue.textContent = e.target.value;
  });

  el.sessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleStartSession();
  });

  el.endSession.addEventListener('click', async () => {
    await handleEndSession();
  });

  el.chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSendMessage();
  });

  el.refreshHistory.addEventListener('click', () => loadHistory());

  el.availableCards.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="unlock"]');
    if (!button) return;
    const cardId = button.dataset.card;
    button.disabled = true;
    try {
      await api.unlockCard(cardId);
      showToast('Карта открыта');
      await loadProgress();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  el.ownedCards.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const cardId = button.dataset.card;
    const action = button.dataset.action;
    button.disabled = true;
    try {
      if (action === 'equip') {
        await api.equipCard(cardId);
        showToast('Карта экипирована');
      }
      if (action === 'activate') {
        await api.activateCard(cardId);
        showToast('Карта активирована');
      }
      await loadProgress();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
}

function showToast(message, tone = 'info') {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.style.borderColor = tone === 'error' ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 255, 255, 0.08)';
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 3200);
}

function setSessionState(text, tone = 'idle') {
  el.sessionState.textContent = text;
  if (tone === 'active') {
    el.sessionState.style.color = 'var(--accent)';
  } else if (tone === 'done') {
    el.sessionState.style.color = 'var(--success)';
  } else {
    el.sessionState.style.color = 'var(--muted)';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function renderSelects() {
  const districts = state.progress?.districts || {};
  el.fieldDistrict.innerHTML = '';
  Object.keys(districts).forEach((key) => {
    const option = document.createElement('option');
    const meta = DISTRICTS[key];
    option.value = key;
    option.textContent = meta ? `${meta.icon} ${meta.name}` : key;
    option.disabled = !districts[key].unlocked;
    el.fieldDistrict.appendChild(option);
  });

  el.fieldEmotion.innerHTML = '';
  EMOTIONS.forEach((emotion) => {
    const option = document.createElement('option');
    option.value = emotion;
    option.textContent = emotion;
    el.fieldEmotion.appendChild(option);
  });
}

function renderStats() {
  const progress = state.progress;
  el.statStability.textContent = progress?.stability_points ?? '0';
  el.statEffort.textContent = progress?.effort ?? '0';
  el.statActs.textContent = progress?.acts_completed ?? '0';
  el.metaLastSession.textContent = formatDate(progress?.last_session);
  const lastDistrict = progress?.last_session_district || '—';
  const meta = DISTRICTS[lastDistrict];
  el.metaLastDistrict.textContent = meta ? `${meta.icon} ${meta.name}` : lastDistrict;
  el.effortBalance.textContent = `Effort: ${progress?.effort ?? '0'}`;
}

function renderDistrictSummary() {
  const districts = state.progress?.districts;
  if (!districts) {
    el.districtSummary.textContent = 'Обновление требуется';
    return;
  }
  const total = Object.keys(districts).length;
  const unlocked = Object.values(districts).filter((d) => d.unlocked).length;
  el.districtSummary.textContent = `Открыто ${unlocked} из ${total}`;
}

function renderDistricts() {
  const districts = state.progress?.districts;
  if (!districts) {
    el.districtGrid.innerHTML = '<p class="meta">Нет данных, обновите прогресс.</p>';
    return;
  }

  el.districtGrid.innerHTML = '';

  Object.entries(districts).forEach(([key, district]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'district-card';
    card.dataset.district = key;

    const meta = DISTRICTS[key];
    const unlocked = district.unlocked;
    const level = district.level || 0;
    const progressWidth = Math.min(level * 25, 100);

    card.innerHTML = `
      <header>
        <div class="district-icon">${meta?.icon || '🏙️'}</div>
        <div>
          <p class="district-name">${meta?.name || district.name || key}</p>
          <p class="district-meta">${meta?.description || ''}</p>
        </div>
      </header>
      <div class="badges">
        <span class="badge ${unlocked ? 'success' : ''}">${unlocked ? 'Доступен' : 'Закрыт'}</span>
        <span class="badge">Уровень ${level}</span>
      </div>
      <div class="progress" aria-label="Прогресс района">
        <span style="width:${progressWidth}%"></span>
      </div>
    `;

    card.addEventListener('click', () => {
      el.fieldDistrict.value = key;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    el.districtGrid.appendChild(card);
  });
}

function renderCards() {
  const owned = state.ownedCardsDetailed?.length ? state.ownedCardsDetailed : state.progress?.owned_cards || [];
  const available = state.availableCardsDetailed?.length ? state.availableCardsDetailed : state.progress?.available_cards || [];
  const equipped = state.progress?.equipped_card;

  el.ownedCards.innerHTML = owned.length ? '' : '<p class="meta">Пока нет открытых карт.</p>';
  el.availableCards.innerHTML = available.length ? '' : '<p class="meta">Нет доступных для открытия карт.</p>';

  owned.forEach((cardOrId) => {
    const card = typeof cardOrId === 'string' ? { card_id: cardOrId, name: cardOrId, rarity: 'common', description: 'Детали карты будут загружены.' } : cardOrId;
    const item = document.createElement('div');
    item.className = 'card';
    item.innerHTML = `
      <div class="tag ${card.rarity}">${card.rarity || '—'}</div>
      <h4>${card.name}</h4>
      <p class="meta">${card.description || 'Эффект карты будет отображён здесь.'}</p>
      <div class="card-actions">
        <button class="btn ghost" data-action="equip" data-card="${card.card_id}">${equipped === card.card_id ? 'Экипирована' : 'Экипировать'}</button>
        <button class="btn" data-action="activate" data-card="${card.card_id}" ${equipped === card.card_id ? '' : 'disabled'}>Активировать</button>
      </div>
    `;
    el.ownedCards.appendChild(item);
  });

  available.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'card';
    item.innerHTML = `
      <div class="tag ${card.rarity}">${card.rarity || '—'}</div>
      <h4>${card.name}</h4>
      <p class="meta">${card.description || ''}</p>
      <div class="card-actions">
        <button class="btn primary" data-action="unlock" data-card="${card.card_id}">Открыть за ${card.effort_cost || 1} Effort</button>
      </div>
    `;
    el.availableCards.appendChild(item);
  });
}

function renderSessionInfo(session, districtInfo) {
  if (!session) {
    el.sessionInfo.hidden = true;
    el.sessionInfo.innerHTML = '';
    return;
  }
  const districtMeta = DISTRICTS[session.district];
  el.sessionInfo.hidden = false;
  el.sessionInfo.innerHTML = `
    <strong>Активная сессия:</strong> ${districtMeta ? `${districtMeta.icon} ${districtMeta.name}` : session.district}<br>
    Эмоция: ${session.emotion} (${session.intensity}/10)<br>
    ${session.level_id ? `Уровень сценария: ${session.level_id}` : ''}
    ${districtInfo?.description ? `<br>${districtInfo.description}` : ''}
  `;
}

async function hydrateCards() {
  try {
    const owned = await api.getOwnedCards();
    state.ownedCardsDetailed = owned.cards || [];
    state.progress = {
      ...state.progress,
      owned_cards: owned.cards?.map((c) => c.card_id) || state.progress?.owned_cards,
      equipped_card: owned.equipped ?? state.progress?.equipped_card,
      effort: owned.effort ?? state.progress?.effort
    };
  } catch (err) {
    console.warn('Не удалось загрузить открытые карты', err);
  }

  try {
    const available = await api.getAvailableCards();
    state.availableCardsDetailed = available.cards || [];
    state.progress = {
      ...state.progress,
      available_cards: available.cards || state.progress?.available_cards,
      effort: available.effort ?? state.progress?.effort
    };
  } catch (err) {
    console.warn('Не удалось загрузить доступные карты', err);
  }

  renderStats();
  renderCards();
}

function appendMessage(role, text) {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  const title = document.createElement('div');
  title.className = 'label';
  title.textContent = role === 'aira' ? 'Айра' : 'Вы';
  const body = document.createElement('div');
  body.textContent = text;
  message.append(title, body);
  el.chatWindow.appendChild(message);
  el.chatWindow.scrollTop = el.chatWindow.scrollHeight;
}

async function handleStartSession() {
  const district = el.fieldDistrict.value;
  const emotion = el.fieldEmotion.value;
  const intensity = Number(el.fieldIntensity.value);

  el.startSession.disabled = true;
  setSessionState('Запускаем сессию...', 'active');

  try {
    const response = await api.startSession({ district, emotion, intensity });
    state.session = response.session;
    state.sessionContext = { district, emotion, intensity };

    renderSessionInfo(response.session, response.district_info);
    appendMessage('aira', response.agent_greeting || 'Айра готова помочь.');
    setSessionState('Сессия активна', 'active');
    el.endSession.disabled = false;
    await updateProgressWithFallback(response.progress);
    showToast('Сессия начата');
  } catch (err) {
    setSessionState('Сессия не начата');
    showToast(err.message, 'error');
  } finally {
    el.startSession.disabled = false;
  }
}

async function handleEndSession() {
  if (!state.session) {
    showToast('Сначала начните сессию', 'error');
    return;
  }

  el.endSession.disabled = true;
  setSessionState('Завершаем...', 'done');

  const payload = {
    session: state.session,
    points: Number(el.fieldPoints.value) || undefined
  };

  try {
    const response = await api.endSession(payload);
    appendMessage('aira', `Сессия завершена. Получено ${response.points_earned} очков устойчивости.`);
    state.session = null;
    state.sessionContext = null;
    setSessionState('Сессия завершена', 'done');
    renderSessionInfo(null);
    await updateProgressWithFallback(response.progress);
    showToast('Прогресс обновлён');
  } catch (err) {
    showToast(err.message, 'error');
    el.endSession.disabled = false;
  }
}

async function handleSendMessage() {
  const text = el.chatMessage.value.trim();
  if (!text) return;

  appendMessage('user', text);
  el.chatMessage.value = '';
  el.sendMessage?.setAttribute('disabled', 'disabled');

  try {
    const payload = {
      message: text,
      district: state.sessionContext?.district,
      emotion: state.sessionContext?.emotion,
      session_context: state.sessionContext || {}
    };
    const response = await api.sendMessage(payload);
    appendMessage('aira', response.response);
  } catch (err) {
    appendMessage('aira', `Ошибка: ${err.message}`);
  } finally {
    el.sendMessage?.removeAttribute('disabled');
  }
}

async function loadProgress() {
  try {
    const progress = await api.getProgress();
    updateProgress(progress);
    await hydrateCards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateProgressWithFallback(progress) {
  if (progress?.districts) {
    updateProgress(progress);
    await hydrateCards();
    return;
  }
  await loadProgress();
}

function updateProgress(progress) {
  state.progress = progress;
  renderStats();
  renderDistrictSummary();
  renderDistricts();
  renderSelects();
  renderCards();
}

async function loadHistory() {
  try {
    const history = await api.getHistory();
    renderHistory(history);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderHistory(history) {
  el.historySessions.innerHTML = '';
  (history.sessions || []).forEach((item) => {
    const meta = DISTRICTS[item.district];
    const li = document.createElement('li');
    li.textContent = `${formatDate(item.timestamp || item.completed_at)} · ${meta ? meta.name : item.district} · ${item.emotion || '—'}`;
    el.historySessions.appendChild(li);
  });

  el.historyMemory.innerHTML = '';
  (history.agent_memory || []).forEach((memory) => {
    const li = document.createElement('li');
    li.textContent = memory.text || memory;
    el.historyMemory.appendChild(li);
  });
}

async function bootstrap() {
  cacheElements();
  bindEvents();
  renderSelects();
  await loadProgress();
  await loadHistory();
}

document.addEventListener('DOMContentLoaded', bootstrap);
