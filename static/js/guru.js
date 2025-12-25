/**
 * Режим ГУРУ — финальный экран свободных вопросов к Айре
 * Только здесь используется LLM для открытого диалога
 */

class GuruMode {
    constructor() {
        this.messages = [];
        this.unlocked = false;
    }
    
    async checkUnlock() {
        // Проверяем, разблокирован ли режим ГУРУ
        try {
            const response = await fetch('/api/progress');
            const data = await response.json();
            
            if (data.success) {
                this.unlocked = data.guru_mode_unlocked || false;
                
                // Показываем кнопку если разблокирован
                if (this.unlocked) {
                    this.showGuruButton();
                }
            }
        } catch (error) {
            console.error('Ошибка проверки ГУРУ-режима:', error);
        }
    }
    
    showGuruButton() {
        // Добавляем кнопку на экран результатов
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen) {
            let guruBtn = document.getElementById('guru-mode-btn');
            if (!guruBtn) {
                guruBtn = document.createElement('button');
                guruBtn.id = 'guru-mode-btn';
                guruBtn.className = 'btn btn-guru';
                guruBtn.textContent = '✨ Вопросы к Айре';
                guruBtn.onclick = () => this.enterGuruMode();
                
                const actionsContainer = resultsScreen.querySelector('.results-actions');
                if (actionsContainer) {
                    actionsContainer.appendChild(guruBtn);
                }
            }
        }
    }
    
    enterGuruMode() {
        if (!this.unlocked) {
            alert('Режим ГУРУ ещё не разблокирован. Завершите все акты.');
            return;
        }
        
        if (window.game) {
            window.game.showScreen('guru-mode');
        }
        
        this.initializeGuruScreen();
    }
    
    initializeGuruScreen() {
        const container = document.getElementById('guru-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Портрет Айры в полный рост
        const airaPortrait = document.createElement('div');
        airaPortrait.className = 'guru-aira-portrait';
        airaPortrait.style.backgroundImage = "url('/static/images/aira/aira_fullbody.jpg')";
        container.appendChild(airaPortrait);
        
        // Приветствие
        const greeting = document.createElement('div');
        greeting.className = 'guru-greeting';
        greeting.innerHTML = `
            <h2>Сессия завершена. Молодец.</h2>
            <p>Хочешь задать мне что-то? Я здесь.</p>
            <p class="guru-note">Это пространство без таймеров и заданий. Просто поддержка.</p>
        `;
        container.appendChild(greeting);
        
        // Окно чата
        const chatContainer = document.createElement('div');
        chatContainer.className = 'guru-chat';
        chatContainer.id = 'guru-chat-messages';
        container.appendChild(chatContainer);
        
        // Поле ввода
        const inputContainer = document.createElement('div');
        inputContainer.className = 'guru-input-container';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'guru-input';
        textarea.placeholder = 'Задай любой вопрос Айре...';
        textarea.rows = 3;
        textarea.id = 'guru-input';
        
        const sendBtn = document.createElement('button');
        sendBtn.className = 'btn btn-primary';
        sendBtn.textContent = 'Спросить';
        sendBtn.onclick = () => this.askQuestion();
        
        inputContainer.appendChild(textarea);
        inputContainer.appendChild(sendBtn);
        container.appendChild(inputContainer);
        
        // Кнопки действий
        const actions = document.createElement('div');
        actions.className = 'guru-actions';
        
        const codexBtn = document.createElement('button');
        codexBtn.className = 'btn btn-secondary';
        codexBtn.textContent = '📖 Открыть Кодекс';
        codexBtn.onclick = () => this.openCodex();
        
        const cityBtn = document.createElement('button');
        cityBtn.className = 'btn btn-secondary';
        cityBtn.textContent = '🏙️ Вернуться в город';
        cityBtn.onclick = () => {
            if (window.game) {
                window.game.showScreen('city-map');
            }
        };
        
        actions.appendChild(codexBtn);
        actions.appendChild(cityBtn);
        container.appendChild(actions);
        
        // Enter для отправки
        textarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.askQuestion();
            }
        });
    }
    
    async askQuestion() {
        const input = document.getElementById('guru-input');
        if (!input) return;
        
        const question = input.value.trim();
        if (!question) return;
        
        // Добавляем вопрос игрока
        this.addMessage(question, 'player');
        input.value = '';
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        try {
            // Отправляем на сервер (здесь используется LLM!)
            const response = await fetch('/api/guru/ask', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    question: question
                })
            });
            
            const data = await response.json();
            
            this.hideLoading();
            
            if (data.success) {
                // Добавляем ответ Айры
                this.addMessage(data.response, 'aira');
            } else {
                this.addMessage('Произошла ошибка. Попробуй ещё раз.', 'aira');
            }
        } catch (error) {
            console.error('Ошибка ГУРУ-режима:', error);
            this.hideLoading();
            this.addMessage('Ошибка соединения.', 'aira');
        }
    }
    
    addMessage(text, sender) {
        const chatContainer = document.getElementById('guru-chat-messages');
        if (!chatContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `guru-message guru-message-${sender}`;
        messageEl.textContent = text;
        
        chatContainer.appendChild(messageEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        this.messages.push({text, sender, timestamp: Date.now()});
    }
    
    showLoading() {
        const chatContainer = document.getElementById('guru-chat-messages');
        if (!chatContainer) return;
        
        const loadingEl = document.createElement('div');
        loadingEl.className = 'guru-message guru-message-aira';
        loadingEl.id = 'guru-loading';
        loadingEl.innerHTML = 'Айра думает<span class="loading-dots">...</span>';
        
        chatContainer.appendChild(loadingEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('guru-loading');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
    
    openCodex() {
        // Показываем Кодекс (все Lore-карты)
        if (window.game) {
            window.game.showScreen('diary-screen');
            
            // Переключаемся на вкладку Lore
            const loreTab = document.querySelector('[data-tab="achievements"]');
            if (loreTab) {
                loreTab.click();
            }
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.guruMode = new GuruMode();
    
    // Проверяем разблокировку при загрузке
    setTimeout(() => {
        if (window.guruMode) {
            window.guruMode.checkUnlock();
        }
    }, 1000);
});

