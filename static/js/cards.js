import { equipCard, getAvailableCards, getOwnedCards, unlockCard } from './api.js';
import { showToast } from './notifications.js';
import { state } from './state.js';
import { card as cardTemplate } from './templates.js';
import { ui } from './ui.js';
import { renderEffort } from './progress.js';

function renderCardList(ownedResponse, availableResponse) {
  const cardsMarkup = [
    ...(availableResponse.cards || []).map((card) => cardTemplate(card, false, ownedResponse.effort ?? 0)),
    ...(ownedResponse.cards || []).map((card) => cardTemplate(card, true, ownedResponse.effort ?? 0))
  ];

  ui.cards.innerHTML = cardsMarkup.join('') || '<div class="muted">Нет доступных карт пока.</div>';

  ui.cards.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-action');
      const cardId = btn.closest('.card').getAttribute('data-id');
      btn.disabled = true;
      try {
        if (action === 'unlock') {
          await unlockCard(cardId);
          showToast('Карта открыта');
        } else {
          await equipCard(cardId);
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

export async function loadCards() {
  try {
    const [owned, available] = await Promise.all([
      getOwnedCards(),
      getAvailableCards()
    ]);
    ui.equippedCard.textContent = owned.equipped
      ? `Экипирована: ${owned.cards.find((c) => c.card_id === owned.equipped)?.name || owned.equipped}`
      : 'Без карты';
    renderCardList(owned, available);
    renderEffort(owned.effort ?? state.progress?.effort ?? 0);
  } catch (err) {
    showToast(`Ошибка загрузки карт: ${err.message}`, 'error');
  }
}
