async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(response.statusText || 'Неизвестная ошибка');
  }

  if (!response.ok || data.success === false) {
    const error = data.error || response.statusText;
    throw new Error(error);
  }

  return data;
}

export function getProgress() {
  return request('/api/progress');
}

export function startSession(payload) {
  return request('/api/session/start', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function endSession(session) {
  return request('/api/session/end', {
    method: 'POST',
    body: JSON.stringify({ session })
  });
}

export function chatWithAgent(payload) {
  return request('/api/agent/chat', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function saveGame() {
  return request('/api/save', { method: 'POST' });
}

export function completeTask(payload) {
  return request('/api/task/complete', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getOwnedCards() {
  return request('/api/cards/owned');
}

export function getAvailableCards() {
  return request('/api/cards/available');
}

export function unlockCard(cardId) {
  return request('/api/cards/unlock', {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId })
  });
}

export function equipCard(cardId) {
  return request('/api/cards/equip', {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId })
  });
}
