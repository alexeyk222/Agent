import { ui } from './ui.js';
import { districtCard } from './templates.js';

export function renderDistricts(districts) {
  if (!ui.districtGrid) return;
  ui.districtGrid.innerHTML = Object.entries(districts)
    .map(([key, data]) => districtCard(key, data))
    .join('');

  renderSparkline(districts);
}

export function populateDistrictSelect(districts) {
  if (!ui.districtSelect) return;
  ui.districtSelect.innerHTML = '';
  Object.entries(districts).forEach(([key, data]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${data.name || key}${data.unlocked ? '' : ' (закрыт)'}`;
    option.disabled = !data.unlocked;
    ui.districtSelect.appendChild(option);
  });
}

function renderSparkline(districts) {
  if (!ui.sparkline) return;
  const levels = Object.values(districts).map((d) => d.level || 0);
  if (!levels.length) {
    ui.sparkline.style.backgroundImage = 'none';
    return;
  }
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
