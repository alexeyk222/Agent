import { request } from './api.js';
import { ui, showToast } from './ui.js';
import { card as cardTemplate } from './templates.js';
import { renderEffort } from './progress.js';

export async function loadCards(progress = {}) {
  try {
    const [owned, available] = await Promise.all([
      request('/api/cards/owned'),
      request('/api/cards/available')
    ]);
    updateEquipped(owned);
    renderCardList(owned, available);
    renderEffort(owned.effort ?? progress.effort ?? 0);
  } catch (err) {
    if (ui.cards) {
      ui.cards.innerHTML = '<div class="muted">Карты недоступны без подключения к серверу.</div>';
    }
    showToast(err.message.includes('офлайн') ? 'Карты недоступны офлайн' : err.message, 'error');
  }
}

function renderCardList(ownedResponse, availableResponse) {
  if (!ui.cards) return;
  const cardsMarkup = [
    ...(availableResponse.cards || []).map((card) => cardTemplate(card, false, ownedResponse.effort ?? 0)),
    ...(ownedResponse.cards || []).map((card) => cardTemplate(card, true, ownedResponse.effort ?? 0))
  ];

  ui.cards.innerHTML = cardsMarkup.join('') || '<div class="muted">Нет доступных карт пока.</div>';

  ui.cards.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-action');
      const cardId = btn.closest('.card')?.getAttribute('data-id');
      if (!cardId) return;
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

function updateEquipped(ownedResponse) {
  if (!ui.equippedCard) return;
  ui.equippedCard.textContent = ownedResponse.equipped
    ? `Экипирована: ${ownedResponse.cards.find((c) => c.card_id === ownedResponse.equipped)?.name || ownedResponse.equipped}`
    : 'Без карты';
}
