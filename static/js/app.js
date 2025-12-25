(function () {
  const state = {
    progress: null,
    session: null,
    chat: []
  };

  const ui = {
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

  const templates = {
    districtCard(districtKey, data) {
      const brightness = Math.round((data.visual?.brightness || 0.6) * 100);
      const fog = data.visual?.fog_density || 0.5;
      const lightsCount = Math.max(3, data.visual?.lights_count || 0);

      const lights = Array.from({ length: Math.min(lightsCount, 8) }, (_, idx) => {
        const height = 50 + (idx % 3) * 10;
        return `<span style="opacity:${0.4 + idx * 0.05};transform:scaleY(${height / 60});"></span>`;
      }).join('');

      const badge = data.unlocked ? 'Открыт' : 'Заблокирован';
      const badgeStyle = data.unlocked ? '' : 'style="background: rgba(248,113,113,0.1); color:#fecdd3;"';

      return `
        <article class="district" data-key="${districtKey}">
          <div class="district__header">
            <div>
              <div class="district__name">${data.name || districtKey}</div>
              <div class="muted">Уровень ${data.level || 0}</div>
            </div>
            <div class="district__badge" ${badgeStyle}>${badge}</div>
          </div>
          <div class="district__visual" style="filter: brightness(${brightness}%);">
            <div class="district__lights">${lights}</div>
            <div class="district__fog" style="opacity:${fog};"></div>
          </div>
        </article>
      `;
    },

    message(role, text) {
      const isAgent = role === 'agent';
      const meta = isAgent ? 'Айра' : 'Вы';
      const roleClass = isAgent ? 'message message--agent' : 'message';
      return `<div class="${roleClass}"><div class="message__meta">${meta}</div>${text}</div>`;
    },

    card(card, owned, effort) {
      const rarity = card.rarity ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) : '—';
      const cost = card.effort_cost ?? '—';
      const actionLabel = owned ? 'Экипировать' : `Открыть за ${cost}⚡`;
      const disabled = !owned && effort < cost;
      return `
        <article class="card" data-id="${card.card_id}">
          <div>
            <div class="card__title">${card.name}</div>
            <div class="card__meta">${rarity} · ${card.type || 'card'} · Effort ${cost}</div>
            <div class="card__meta">${card.description || 'Эффект будет показан после открытия.'}</div>
          </div>
          <div>
            <button class="button button--ghost" data-action="${owned ? 'equip' : 'unlock'}" ${disabled ? 'disabled' : ''}>${actionLabel}</button>
          </div>
        </article>
      `;
    }
  };

  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      const error = data.error || response.statusText;
      throw new Error(error);
    }
    return data;
  }

  function showToast(message, tone = 'default') {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.style.borderColor = tone === 'error' ? 'rgba(248,113,113,0.7)' : 'var(--border)';
    ui.toast.hidden = false;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => { ui.toast.hidden = true; }, 3200);
  }

  function updateIntensityLabel() {
    ui.intensityValue.textContent = ui.intensityInput.value;
  }

  function renderProgress(progress) {
    state.progress = progress;
    ui.stabilityValue.textContent = progress.stability_points ?? '—';
    ui.effortValue.textContent = progress.effort ?? '—';
    ui.actsValue.textContent = progress.acts_completed ?? '—';
    ui.sessionState.textContent = state.session ? 'Идёт сессия' : 'Нет активной сессии';

    const last = progress.last_session ? new Date(progress.last_session) : null;
    ui.lastSession.textContent = last ? `Последняя сессия: ${last.toLocaleString()}` : 'Сессии ещё не запускались';

    renderDistricts(progress.districts || {});
    populateDistrictSelect(progress.districts || {});
    renderHistory(progress);
    renderEffort(progress.effort ?? 0);
  }

  function renderDistricts(districts) {
    ui.districtGrid.innerHTML = Object.entries(districts)
      .map(([key, data]) => templates.districtCard(key, data))
      .join('');

    if (ui.sparkline) {
      const levels = Object.values(districts).map((d) => d.level || 0);
      const maxLevel = Math.max(1, ...levels);
      const gradient = levels
        .map((lvl, idx) => {
          const pct = Math.round(((idx + 1) / levels.length) * 100);
          const opacity = 0.3 + (lvl / maxLevel) * 0.6;
          return `radial-gradient(circle at ${pct}% 60%, rgba(102,217,232,${opacity}), transparent 22%)`;
        })
        .join(',');
      ui.sparkline.style.backgroundImage = gradient;
    }
  }

  function populateDistrictSelect(districts) {
    ui.districtSelect.innerHTML = '';
    Object.entries(districts).forEach(([key, data]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${data.name || key}${data.unlocked ? '' : ' (закрыт)'}`;
      option.disabled = !data.unlocked;
      ui.districtSelect.appendChild(option);
    });
  }

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

  function renderEffort(effort) {
    ui.effortValue.textContent = effort;
    const pct = Math.min(100, (effort / 10) * 100);
    ui.effortBar.style.width = `${pct}%`;
    ui.effortHint.textContent = effort > 0 ? 'Можно открывать новые карты' : 'Сделайте микрошаги, чтобы накопить Effort';
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

  function renderChat() {
    ui.chatLog.innerHTML = state.chat.map((item) => templates.message(item.role, item.text)).join('');
    ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
  }

  function setCrisis(isCrisis) {
    ui.crisisFlag.textContent = isCrisis ? 'Кризис! Контент заблокирован' : 'Без кризиса';
    ui.crisisFlag.style.background = isCrisis ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)';
  }

  async function loadProgress() {
    try {
      const data = await request('/api/progress');
      renderProgress(data);
      await loadCards();
    } catch (err) {
      showToast(`Не удалось загрузить прогресс: ${err.message}`, 'error');
    }
  }

  async function loadCards() {
    try {
      const [owned, available] = await Promise.all([
        request('/api/cards/owned'),
        request('/api/cards/available')
      ]);
      ui.equippedCard.textContent = owned.equipped ? `Экипирована: ${owned.cards.find(c => c.card_id === owned.equipped)?.name || owned.equipped}` : 'Без карты';
      renderCardList(owned, available);
      renderEffort(owned.effort ?? state.progress?.effort ?? 0);
    } catch (err) {
      showToast(`Ошибка загрузки карт: ${err.message}`, 'error');
    }
  }

  function renderCardList(ownedResponse, availableResponse) {
    const ownedIds = new Set((ownedResponse.cards || []).map((c) => c.card_id));
    const cardsMarkup = [
      ...(availableResponse.cards || []).map((card) => templates.card(card, false, ownedResponse.effort ?? 0)),
      ...(ownedResponse.cards || []).map((card) => templates.card(card, true, ownedResponse.effort ?? 0))
    ];

    ui.cards.innerHTML = cardsMarkup.join('') || '<div class="muted">Нет доступных карт пока.</div>';

    ui.cards.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        const action = btn.getAttribute('data-action');
        const cardId = btn.closest('.card').getAttribute('data-id');
        btn.disabled = true;
        try {
          if (action === 'unlock') {
            await request('/api/cards/unlock', { method: 'POST', body: JSON.stringify({ card_id: cardId }) });
            showToast('Карта открыта');
          } else {
            await request('/api/cards/equip', { method: 'POST', body: JSON.stringify({ card_id: cardId }) });
            showToast('Карта экипирована');
          }
          await loadCards();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  async function handleSessionStart(event) {
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
      const data = await request('/api/session/start', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.session = { ...data.session, district: payload.district, emotion: payload.emotion };
      ui.statusBadge.textContent = 'Сессия активна';
      ui.statusBadge.style.background = 'rgba(102,217,232,0.14)';
      updateSessionSummary(data);
      await loadProgress();
      if (data.agent_greeting) {
        state.chat.push({ role: 'agent', text: data.agent_greeting });
        renderChat();
      }
      showToast('Сессия запущена');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const text = ui.chatInput.value.trim();
    if (!text) return;
    state.chat.push({ role: 'user', text });
    renderChat();
    ui.chatInput.value = '';

    try {
      const payload = {
        message: text,
        district: state.session?.district,
        emotion: state.session?.emotion,
        session_context: state.session || {}
      };
      const data = await request('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.chat.push({ role: 'agent', text: data.response });
      renderChat();
      setCrisis(data.is_crisis);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleMicrostep() {
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
      await loadProgress();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleCompleteSession() {
    if (!state.session) return;
    try {
      const data = await request('/api/session/end', {
        method: 'POST',
        body: JSON.stringify({ session: state.session })
      });
      state.session = null;
      ui.statusBadge.textContent = 'Готов к запуску';
      ui.statusBadge.style.background = 'rgba(52,211,153,0.14)';
      updateSessionSummary(null);
      await loadProgress();
      showToast(`Сессия завершена: +${data.points_earned} очков`);
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

  function bindEvents() {
    document.getElementById('sessionForm').addEventListener('submit', handleSessionStart);
    document.getElementById('chatForm').addEventListener('submit', handleChatSubmit);
    ui.intensityInput.addEventListener('input', updateIntensityLabel);
    ui.logMicrostep.addEventListener('click', handleMicrostep);
    ui.completeSession.addEventListener('click', handleCompleteSession);
    ui.saveButton.addEventListener('click', handleSave);
  }

  function init() {
    bindEvents();
    updateIntensityLabel();
    loadProgress();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
