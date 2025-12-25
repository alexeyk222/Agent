/**
 * Логика взаимодействия с агентом Айра
 */

class AgentDialog {
    constructor() {
        this.messages = [];
        this.currentDistrict = null;
        this.currentEmotion = null;
        this.sessionContext = null;
    }
    
    startDialog(greeting, districtInfo) {
        console.log('🚀 startDialog вызван', {greeting, districtInfo});
        
        const messagesContainer = document.getElementById('dialog-messages');
        if (!messagesContainer) {
            console.error('❌ Контейнер сообщений не найден, повтор через 200мс');
            setTimeout(() => this.startDialog(greeting, districtInfo), 200);
            return;
        }
        
        console.log('✅ Контейнер найден, очищаю...');
        messagesContainer.innerHTML = '';
        this.messages = [];
        
        // Добавляем приветствие (дефолтное, если нет от сервера)
        const defaultGreeting = greeting || 
            `Привет! Я Айра, твой навигатор в Городе Сфер.

Я помогу тебе разобраться с тем, что происходит, и найти опоры. Расскажи мне, что ты чувствуешь сейчас, или опиши ситуацию, которая тебя беспокоит.

Мы вместе найдём микрошаги, которые помогут тебе двигаться вперёд.`;

        console.log('Добавляю приветствие...');
        this.addMessage(defaultGreeting, 'agent');
        
        // Если есть информация о квартале, добавляем её
        if (districtInfo) {
            this.addMessage(`Мы в квартале: ${districtInfo.name || 'неизвестно'}. ${districtInfo.description || ''}`, 'agent');
        }
        
        // Устанавливаем фокус на поле ввода
        setTimeout(() => {
            const input = document.getElementById('dialog-input');
            if (input) {
                input.focus();
                console.log('✅ Фокус установлен');
            }
        }, 100);
        
        // Перепривязываем обработчики при старте диалога
        setupAgentDialogHandlers();
        
        console.log('✅ Диалог начат');
    }
    
    addMessage(text, sender) {
        const messagesContainer = document.getElementById('dialog-messages');
        if (!messagesContainer) {
            console.error('Контейнер сообщений не найден! Проверяю DOM...');
            console.log('Экран диалога:', document.getElementById('agent-dialog'));
            console.log('Контейнер:', document.querySelector('.dialog-messages'));
            // Пытаемся найти снова через 100мс
            setTimeout(() => {
                const retry = document.getElementById('dialog-messages');
                if (retry) {
                    this.addMessage(text, sender);
                }
            }, 100);
            return;
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        
        const textEl = document.createElement('div');
        textEl.className = 'message-text';
        // Сохраняем переносы строк
        textEl.innerHTML = text.replace(/\n/g, '<br>');
        
        messageEl.appendChild(textEl);
        messagesContainer.appendChild(messageEl);
        
        // Прокрутка вниз
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
        
        // Сохраняем сообщение
        this.messages.push({ text, sender });
        
        console.log('✅ Сообщение добавлено:', sender, text.substring(0, 30) + '...');
    }
    
    async sendMessage() {
        console.log('sendMessage called');
        const input = document.getElementById('dialog-input');
        if (!input) {
            console.error('Input field not found');
            return;
        }
        
        const message = input.value.trim();
        if (!message) {
            console.log('Empty message, ignoring');
            return;
        }
        
        console.log('Sending message:', message);
        
        // Добавляем сообщение игрока
        this.addMessage(message, 'player');
        
        // Очищаем поле ввода
        input.value = '';
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        // Блокируем кнопку отправки
        const sendBtn = document.getElementById('send-message-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Отправка...';
        }
        
        try {
            // Отправляем на сервер
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    district: this.currentDistrict,
                    emotion: this.currentEmotion,
                    session_context: this.sessionContext
                })
            });
            
            const data = await response.json();
            
            this.hideLoading();
            
            // Разблокируем кнопку
            const sendBtn = document.getElementById('send-message-btn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Отправить';
            }
            
            if (data.success) {
                // Проверяем кризисную ситуацию
                if (data.is_crisis) {
                    this.handleCrisis(data);
                    return;
                }
                
                // Добавляем ответ агента
                this.addMessage(data.response, 'agent');
                
                // Проверяем, нужно ли переходить к мини-играм
                this.checkForMinigameTransition(data.response);
            } else {
                this.addMessage('Произошла ошибка. Попробуй еще раз.', 'agent');
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            this.hideLoading();
            
            // Разблокируем кнопку при ошибке
            const sendBtn = document.getElementById('send-message-btn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Отправить';
            }
            
            this.addMessage('Ошибка соединения. Проверь интернет.', 'agent');
        }
    }
    
    showLoading() {
        const messagesContainer = document.getElementById('dialog-messages');
        if (!messagesContainer) return;
        
        const loadingEl = document.createElement('div');
        loadingEl.className = 'message agent';
        loadingEl.id = 'agent-loading';
        loadingEl.innerHTML = '<div class="message-text">Айра печатает<span class="loading-dots">...</span></div>';
        
        messagesContainer.appendChild(loadingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('agent-loading');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
    
    handleCrisis(data) {
        // Показываем кризисный экран
        const crisisScreen = document.getElementById('crisis-screen');
        const crisisMessage = document.getElementById('crisis-message');
        const helplinesList = document.getElementById('helplines-list');
        
        if (crisisScreen && crisisMessage) {
            crisisMessage.textContent = data.response;
            
            // Добавляем горячие линии
            if (helplinesList && data.helplines) {
                helplinesList.innerHTML = data.helplines.map(helpline => `
                    <div class="helpline-item">
                        <div class="helpline-name">${helpline.name}</div>
                        <div class="helpline-phone">${helpline.phone}</div>
                        <div class="helpline-description">${helpline.description}</div>
                    </div>
                `).join('');
            }
            
            if (window.game) {
                window.game.showScreen('crisis-screen');
            }
        }
    }
    
    checkForMinigameTransition(response) {
        // Проверяем ключевые слова для перехода к мини-играм
        const lowerResponse = response.toLowerCase();
        
        if (lowerResponse.includes('опор') || 
            lowerResponse.includes('сфер') || 
            lowerResponse.includes('действие') ||
            lowerResponse.includes('комфорт')) {
            
            // Переходим к мини-игре сферы через 3 секунды
            setTimeout(() => {
                if (window.game) {
                    window.game.showScreen('sphere-minigame');
                }
            }, 3000);
        } else if (lowerResponse.includes('дыхан') || 
                   lowerResponse.includes('заземл') ||
                   lowerResponse.includes('пауз')) {
            
            // Переходим к дыханию через 3 секунды
            setTimeout(() => {
                if (window.game) {
                    window.game.showScreen('breathing-minigame');
                    if (window.minigames) {
                        window.minigames.initBreathingGame();
                    }
                }
            }, 3000);
        }
    }
    
    skipDialog() {
        // Пропускаем диалог и переходим к мини-играм
        if (window.game) {
            window.game.showScreen('sphere-minigame');
        }
    }
}

// Флаг для предотвращения множественных обработчиков
let dialogHandlersSetup = false;

// Функция для привязки обработчиков событий
function setupAgentDialogHandlers() {
    if (dialogHandlersSetup) {
        console.log('Обработчики уже установлены, пропускаю');
        return;
    }
    
    console.log('Настройка обработчиков диалога...');
    
    // Используем делегирование на уровне document для надёжности
    document.addEventListener('click', function(e) {
        // Проверяем кнопку отправки
        if (e.target && (e.target.id === 'send-message-btn' || e.target.closest('#send-message-btn'))) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Кнопка отправки нажата!');
            if (window.agentDialog) {
                window.agentDialog.sendMessage();
            } else {
                console.error('❌ agentDialog не инициализирован');
                alert('Диалог не инициализирован. Перезагрузите страницу.');
            }
            return false;
        }
        
        // Проверяем кнопку пропуска
        if (e.target && (e.target.id === 'skip-dialog-btn' || e.target.closest('#skip-dialog-btn'))) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Кнопка пропуска нажата!');
            if (window.agentDialog) {
                window.agentDialog.skipDialog();
            }
            return false;
        }
    }, true); // Используем capture phase для надёжности
    
    // Обработка Enter в поле ввода - используем делегирование
    document.addEventListener('keypress', function(e) {
        const input = document.getElementById('dialog-input');
        if (input && document.activeElement === input && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('✅ Enter нажат в поле ввода!');
            if (window.agentDialog) {
                window.agentDialog.sendMessage();
            } else {
                console.error('❌ agentDialog не инициализирован');
            }
            return false;
        }
    }, true);
    
    dialogHandlersSetup = true;
    console.log('✅ Обработчики диалога установлены');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.agentDialog = new AgentDialog();
    
    // Привязываем обработчики сразу
    setupAgentDialogHandlers();
    
    // Также привязываем обработчики при показе экрана диалога
    const dialogScreen = document.getElementById('agent-dialog');
    if (dialogScreen) {
        // Используем MutationObserver для отслеживания появления экрана
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    // Экран стал активным, перепривязываем обработчики
                    setTimeout(() => {
                        setupAgentDialogHandlers();
                    }, 100);
                }
            });
        });
        observer.observe(dialogScreen, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Обновляем контекст при начале сессии
    // Это будет выполнено позже, когда game.js загрузится
    setTimeout(() => {
        if (window.game && window.agentDialog) {
            const originalStartSession = window.game.startSession;
            if (originalStartSession) {
                window.game.startSession = async function(districtKey) {
                    await originalStartSession.call(this, districtKey);
                    
                    if (window.agentDialog) {
                        window.agentDialog.currentDistrict = districtKey;
                        window.agentDialog.currentEmotion = this.currentEmotion;
                        window.agentDialog.sessionContext = {
                            district: districtKey,
                            emotion: this.currentEmotion,
                            intensity: this.currentIntensity
                        };
                    }
                };
            }
        }
    }, 500);
});

// Добавляем стили для точек загрузки
const style = document.createElement('style');
style.textContent = `
    .loading-dots {
        display: inline-block;
        animation: loadingDots 1.5s steps(4, end) infinite;
    }
    
    @keyframes loadingDots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60%, 100% { content: '...'; }
    }
`;
document.head.appendChild(style);

