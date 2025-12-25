import { request } from './api.js';
import { ui, showToast, setCrisisFlag } from './ui.js';
import { state } from './state.js';
import { message as messageTemplate } from './templates.js';

export function bindChatHandlers() {
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }
}

export function renderChat() {
  if (!ui.chatLog) return;
  ui.chatLog.innerHTML = state.chat.map((item) => messageTemplate(item.role, item.text)).join('');
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

export function pushAgentGreeting(text) {
  if (!text) return;
  state.chat.push({ role: 'agent', text });
  renderChat();
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const text = ui.chatInput?.value.trim();
  if (!text) return;

  state.chat.push({ role: 'user', text });
  renderChat();
  if (ui.chatInput) {
    ui.chatInput.value = '';
  }

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
    setCrisisFlag(data.is_crisis);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
