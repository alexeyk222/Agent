import { chatWithAgent } from './api.js';
import { showToast } from './notifications.js';
import { state } from './state.js';
import { message } from './templates.js';
import { ui } from './ui.js';

export function renderChat() {
  ui.chatLog.innerHTML = state.chat.map((item) => message(item.role, item.text)).join('');
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

export function setCrisis(isCrisis) {
  ui.crisisFlag.textContent = isCrisis ? 'Кризис! Контент заблокирован' : 'Без кризиса';
  ui.crisisFlag.style.background = isCrisis ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)';
}

export async function handleChatSubmit(event) {
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
    const data = await chatWithAgent(payload);
    state.chat.push({ role: 'agent', text: data.response });
    renderChat();
    setCrisis(data.is_crisis);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
