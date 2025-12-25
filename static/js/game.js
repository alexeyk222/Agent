/**
 * Основная игровая логика
 */

class Game {
    constructor() {
        this.currentScreen = 'loading-screen';
        this.currentDistrict = null;
        this.currentEmotion = null;
        this.currentIntensity = 5;
        this.currentSession = null;
        this.currentTreeId = null;
        this.playerProgress = null;
        
        this.init();
    }
    
    async init() {
        // Показываем загрузочный экран
        this.showScreen('loading-screen');
        
        // Симулируем загрузку
        await this.simulateLoading();
        
        // Загружаем прогресс игрока
        await this.loadProgress();
        
        // Переходим к карте города
        this.showScreen('city-map');
    }
    
    async simulateLoading() {
        return new Promise(resolve => {
            const progressBar = document.querySelector('.loading-progress');
            let progress = 0;
            
            const interval = setInterval(() => {
                progress += 2;
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(resolve, 500);
                }
            }, 30);
        });
    }
    
    async loadProgress() {
        try {
            const response = await fetch('/api/progress');
            const data = await response.json();
            
            if (data.success) {
                this.playerProgress = data;
                this.updateCityMap(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки прогресса:', error);
        }
    }
    
    updateCityMap(progress) {
        // Обновляем очки
        const pointsEl = document.getElementById('stability-points');
        if (pointsEl) {
            pointsEl.textContent = progress.stability_points || 0;
        }
        
        // Обновляем последнюю сессию
        const lastSessionEl = document.getElementById('last-session');
        if (lastSessionEl && progress.last_session) {
            const date = new Date(progress.last_session);
            lastSessionEl.textContent = date.toLocaleString('ru-RU');
        }
        
        // Обновляем кварталы
        if (progress.districts) {
            Object.keys(progress.districts).forEach(districtKey => {
                const district = progress.districts[districtKey];
                const districtEl = document.querySelector(`[data-district="${districtKey}"]`);
                
                if (districtEl) {
                    // Обновляем уровень
                    const levelEl = districtEl.querySelector('.level-value');
                    if (levelEl) {
                        levelEl.textContent = district.level || 0;
                    }
                    
                    // Обновляем статус
                    const statusEl = districtEl.querySelector('.district-status');
                    if (statusEl) {
                        if (district.unlocked) {
                            statusEl.textContent = 'Доступен';
                            statusEl.classList.remove('locked');
                            districtEl.classList.remove('locked');
                        } else {
                            statusEl.textContent = 'Заблокирован';
                            statusEl.classList.add('locked');
                            districtEl.classList.add('locked');
                        }
                    }
                    
                    // Применяем визуальные эффекты
                    if (district.visual) {
                        const brightness = district.visual.brightness || 0.3;
                        districtEl.style.opacity = brightness;
                        districtEl.style.filter = `brightness(${brightness})`;
                    }
                }
            });
        }
    }
    
    showScreen(screenId) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показываем нужный экран
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;
        }
    }
    
    getTreeIdForDistrict(district, emotion) {
        // Определяем дерево вопросов на основе квартала и эмоции
        const treeMap = {
            'citadel': 'citadel_volume_quality',
            'oasis': 'oasis_body_check',
            'arsenal': 'arsenal_one_number',
            'forum': 'forum_connection_inventory',
            'garden': 'garden_what_feeds'
        };
        
        return treeMap[district] || null;
    }

    updateAgentContext(nodeId = null) {
        if (!window.agentDialog) return;

        window.agentDialog.setContext({
            district: this.currentDistrict,
            emotion: this.currentEmotion,
            intensity: this.currentIntensity,
            session: this.currentSession,
            treeId: this.currentTreeId,
            nodeId: nodeId
        });
    }
    
    async startSession(districtKey) {
        this.currentDistrict = districtKey;
        
        // Проверяем доступность
        if (this.playerProgress && this.playerProgress.districts) {
            const district = this.playerProgress.districts[districtKey];
            if (!district || !district.unlocked) {
                alert('Этот квартал еще не разблокирован!');
                return;
            }
        }
        
        // Переходим к выбору эмоции
        this.showScreen('emotion-select');
    }
    
    async confirmEmotion() {
        if (!this.currentEmotion) {
            alert('Выбери эмоцию');
            return;
        }
        
        // Начинаем сессию
        try {
            const response = await fetch('/api/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    district: this.currentDistrict,
                    emotion: this.currentEmotion,
                    intensity: this.currentIntensity
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentSession = data.session;
                this.updateAgentContext();
                const treeId = this.getTreeIdForDistrict(this.currentDistrict, this.currentEmotion);
                this.currentTreeId = treeId;
                
                if (treeId && window.questionTree) {
                    this.showScreen('questions-screen');
                    window.questionTree.startTree(treeId, this.currentDistrict);
                } else {
                    // Фолбек к диалогу агента, если дерево не найдено
                    this.showScreen('agent-dialog');
                    if (window.agentDialog) {
                        window.agentDialog.startDialog(data.agent_greeting, data.district_info);
                    }
                }
            } else {
                alert(data.error || 'Ошибка начала сессии');
            }
        } catch (error) {
            console.error('Ошибка начала сессии:', error);
            alert('Ошибка соединения с сервером');
        }
    }
    
    async endSession(points = 15) {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch('/api/session/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session: this.currentSession,
                    points: points
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Показываем экран результатов
                this.showScreen('results-screen');
                
                // Обновляем результаты
                const pointsEarnedEl = document.getElementById('points-earned');
                const totalPointsEl = document.getElementById('total-points');
                const districtLevelEl = document.getElementById('district-level');
                
                if (pointsEarnedEl) pointsEarnedEl.textContent = `+${data.points_earned}`;
                if (totalPointsEl) totalPointsEl.textContent = data.total_points;
                if (districtLevelEl) districtLevelEl.textContent = data.district_level;
                
                // Перезагружаем прогресс
                await this.loadProgress();
            }
        } catch (error) {
            console.error('Ошибка завершения сессии:', error);
        }
    }
    
    openDiary() {
        this.showScreen('diary-screen');
        this.loadDiary();
    }
    
    async loadDiary() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            
            if (data.success) {
                // Загружаем историю сессий
                const historyList = document.getElementById('session-history-list');
                if (historyList) {
                    historyList.innerHTML = this.renderSessionHistory(data.sessions || []);
                }
                
                // Загружаем память агента
                const memoryList = document.getElementById('agent-memory-list');
                if (memoryList) {
                    memoryList.innerHTML = this.renderAgentMemory(data.agent_memory || []);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки дневника:', error);
        }
    }
    
    renderSessionHistory(sessions) {
        if (sessions.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center;">История пуста</p>';
        }
        
        return sessions.reverse().map(session => {
            const date = new Date(session.timestamp || session.started_at);
            return `
                <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="font-weight: bold; margin-bottom: 10px;">
                        ${session.district || 'Неизвестно'} - ${session.emotion || 'Неизвестно'}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${date.toLocaleString('ru-RU')}
                    </div>
                    ${session.points_earned ? `<div style="color: var(--accent-citadel); margin-top: 5px;">+${session.points_earned} очков</div>` : ''}
                </div>
            `;
        }).join('');
    }
    
    renderAgentMemory(memory) {
        if (memory.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center;">Память пуста</p>';
        }
        
        return memory.reverse().map(mem => {
            const date = new Date(mem.timestamp);
            return `
                <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 10px;">
                        ${date.toLocaleString('ru-RU')}
                    </div>
                    <div>${mem.text || ''}</div>
                </div>
            `;
        }).join('');
    }
}

// Инициализация игры при загрузке страницы
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    window.game = game;
    
    // Обработчики событий
    setupEventHandlers();
});

function setupEventHandlers() {
    // Кнопка начала сессии
    const startSessionBtn = document.getElementById('start-session-btn');
    if (startSessionBtn) {
        startSessionBtn.addEventListener('click', () => {
            // Выбор квартала будет через клик на сам квартал
            alert('Выбери квартал на карте города');
        });
    }
    
    // Выбор квартала
    document.querySelectorAll('.district').forEach(district => {
        district.addEventListener('click', () => {
            if (!district.classList.contains('locked')) {
                const districtKey = district.dataset.district;
                if (game) {
                    game.startSession(districtKey);
                }
            }
        });
    });
    
    // Выбор эмоции
    document.querySelectorAll('.emotion-item').forEach(item => {
        item.addEventListener('click', () => {
            // Убираем выделение с других
            document.querySelectorAll('.emotion-item').forEach(i => {
                i.classList.remove('selected');
            });
            
            // Выделяем выбранную
            item.classList.add('selected');
            
            if (game) {
                game.currentEmotion = item.dataset.emotion;
                
                // Активируем кнопку подтверждения
                const confirmBtn = document.getElementById('confirm-emotion-btn');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                }
            }
        });
    });
    
    // Слайдер интенсивности
    const intensitySlider = document.getElementById('intensity-slider');
    const intensityValue = document.getElementById('intensity-value');
    
    if (intensitySlider && intensityValue) {
        intensitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            intensityValue.textContent = value;
            if (game) {
                game.currentIntensity = parseInt(value);
            }
        });
    }
    
    // Кнопка подтверждения эмоции
    const confirmEmotionBtn = document.getElementById('confirm-emotion-btn');
    if (confirmEmotionBtn) {
        confirmEmotionBtn.addEventListener('click', () => {
            if (game) {
                game.confirmEmotion();
            }
        });
    }
    
    // Кнопка назад
    const backToCityBtn = document.getElementById('back-to-city-btn');
    if (backToCityBtn) {
        backToCityBtn.addEventListener('click', () => {
            if (game) {
                game.showScreen('city-map');
            }
        });
    }
    
    // Кнопка открытия дневника
    const openDiaryBtn = document.getElementById('open-diary-btn');
    if (openDiaryBtn) {
        openDiaryBtn.addEventListener('click', () => {
            if (game) {
                game.openDiary();
            }
        });
    }
    
    // Закрытие дневника
    const closeDiaryBtn = document.getElementById('close-diary-btn');
    if (closeDiaryBtn) {
        closeDiaryBtn.addEventListener('click', () => {
            if (game) {
                game.showScreen('city-map');
            }
        });
    }
    
    // Вкладки дневника
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Убираем активность со всех вкладок
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Активируем выбранную
            btn.classList.add('active');
            const tabContent = document.getElementById(`tab-${tabId}`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
    
    // Возврат в город с экрана результатов
    const backToCityFromResults = document.getElementById('back-to-city-from-results');
    if (backToCityFromResults) {
        backToCityFromResults.addEventListener('click', () => {
            if (game) {
                game.showScreen('city-map');
                game.currentSession = null;
                game.currentDistrict = null;
                game.currentEmotion = null;
            }
        });
    }
    
    // Кризисный экран
    const crisisUnderstoodBtn = document.getElementById('crisis-understood-btn');
    if (crisisUnderstoodBtn) {
        crisisUnderstoodBtn.addEventListener('click', () => {
            if (game) {
                game.showScreen('city-map');
            }
        });
    }
}
