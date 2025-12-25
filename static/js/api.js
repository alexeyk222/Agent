const defaultHeaders = {
  'Content-Type': 'application/json'
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: defaultHeaders,
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message = data?.error || `Ошибка запроса (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  getProgress() {
    return request('/api/progress');
  },
  startSession(payload) {
    return request('/api/session/start', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  endSession(payload) {
    return request('/api/session/end', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  sendMessage(payload) {
    return request('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getHistory() {
    return request('/api/history');
  },
  getOwnedCards() {
    return request('/api/cards/owned');
  },
  getAvailableCards() {
    return request('/api/cards/available');
  },
  unlockCard(card_id) {
    return request('/api/cards/unlock', {
      method: 'POST',
      body: JSON.stringify({ card_id })
    });
  },
  equipCard(card_id) {
    return request('/api/cards/equip', {
      method: 'POST',
      body: JSON.stringify({ card_id })
    });
  },
  activateCard(card_id) {
    return request('/api/cards/activate', {
      method: 'POST',
      body: JSON.stringify({ card_id })
    });
  }
};
