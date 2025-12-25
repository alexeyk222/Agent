function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function districtCard(districtKey, data) {
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
    <article class="district" data-key="${districtKey}" role="listitem">
      <div class="district__header">
        <div>
          <div class="district__name">${data.name || districtKey}</div>
          <div class="muted">Уровень ${data.level || 0}</div>
        </div>
        <div class="district__badge" ${badgeStyle}>${badge}</div>
      </div>
      <div class="district__visual" style="filter: brightness(${brightness}%);" aria-hidden="true">
        <div class="district__lights">${lights}</div>
        <div class="district__fog" style="opacity:${fog};"></div>
      </div>
    </article>
  `;
}

export function message(role, text) {
  const isAgent = role === 'agent';
  const meta = isAgent ? 'Айра' : 'Вы';
  const roleClass = isAgent ? 'message message--agent' : 'message';
  const safeText = escapeHtml(text).replace(/\n/g, '<br>');
  return `<div class="${roleClass}"><div class="message__meta">${meta}</div>${safeText}</div>`;
}

export function card(card, owned, effort) {
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
