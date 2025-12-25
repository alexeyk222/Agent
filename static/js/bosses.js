/**
 * Система боссов и энкаунтеров
 */

class BossEncounter {
    constructor() {
        this.currentBoss = null;
        this.defeatProgress = {};
    }
    
    async checkForBoss() {
        try {
            const response = await fetch('/api/boss/check');
            const data = await response.json();
            
            if (data.success && data.boss_spawned) {
                this.showBossEncounter(data.boss);
            }
        } catch (error) {
            console.error('Ошибка проверки босса:', error);
        }
    }
    
    showBossEncounter(boss) {
        this.currentBoss = boss;
        
        if (window.game) {
            window.game.showScreen('boss-encounter');
        }
        
        this.renderBossScreen(boss);
    }
    
    renderBossScreen(boss) {
        const container = document.getElementById('boss-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Фон босса
        if (boss.image) {
            container.style.backgroundImage = `url('/static/images/bosses/${boss.image}')`;
            container.style.backgroundSize = 'cover';
            container.style.backgroundPosition = 'center';
        }
        
        // Overlay для читаемости
        const overlay = document.createElement('div');
        overlay.className = 'boss-overlay';
        container.appendChild(overlay);
        
        const content = document.createElement('div');
        content.className = 'boss-content';
        
        // Название босса
        const nameEl = document.createElement('h1');
        nameEl.className = 'boss-name';
        nameEl.textContent = boss.name;
        content.appendChild(nameEl);
        
        // Описание
        const descEl = document.createElement('div');
        descEl.className = 'boss-description';
        descEl.textContent = boss.description;
        content.appendChild(descEl);
        
        // Диалог появления
        if (boss.dialogue && boss.dialogue.appearance) {
            const dialogueEl = document.createElement('div');
            dialogueEl.className = 'boss-dialogue';
            dialogueEl.textContent = `"${boss.dialogue.appearance}"`;
            content.appendChild(dialogueEl);
        }
        
        // Эффекты босса
        const effectsEl = document.createElement('div');
        effectsEl.className = 'boss-effects';
        effectsEl.innerHTML = '<strong>Эффекты:</strong><br>' + this.formatBossEffects(boss.effects);
        content.appendChild(effectsEl);
        
        // Условия победы
        const conditionsEl = document.createElement('div');
        conditionsEl.className = 'boss-defeat-conditions';
        conditionsEl.innerHTML = '<strong>Как победить:</strong><br>' + this.formatDefeatConditions(boss.defeat_conditions);
        content.appendChild(conditionsEl);
        
        // Кнопки действий
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'boss-actions';
        
        const fightBtn = document.createElement('button');
        fightBtn.className = 'btn btn-primary btn-large';
        fightBtn.textContent = 'Противостоять';
        fightBtn.onclick = () => this.startBossFight(boss);
        
        const retreatBtn = document.createElement('button');
        retreatBtn.className = 'btn btn-secondary';
        retreatBtn.textContent = 'Вернуться позже';
        retreatBtn.onclick = () => {
            if (window.game) {
                window.game.showScreen('city-map');
            }
        };
        
        actionsContainer.appendChild(fightBtn);
        actionsContainer.appendChild(retreatBtn);
        content.appendChild(actionsContainer);
        
        container.appendChild(content);
    }
    
    formatBossEffects(effects) {
        let text = '';
        if (effects.penalty) {
            text += `• ${effects.penalty} к наградам<br>`;
        }
        if (effects.fog_increase) {
            text += `• Туман усиливается на ${effects.fog_increase}%<br>`;
        }
        if (effects.blocks) {
            text += `• Блокирует опции: ${effects.blocks.join(', ')}<br>`;
        }
        return text || 'Негативное влияние на город';
    }
    
    formatDefeatConditions(conditions) {
        let text = '<ul>';
        conditions.forEach(cond => {
            if (cond.type === 'series') {
                text += `<li>Серия действий "${cond.action}" (${cond.count}x)</li>`;
            } else if (cond.type === 'card') {
                text += `<li>Использовать карту (специальная)</li>`;
            } else if (cond.type === 'full_session') {
                text += `<li>Полная сессия в ${cond.district}</li>`;
            }
        });
        text += '</ul>';
        return text;
    }
    
    startBossFight(boss) {
        // Переходим к сессии с фокусом на победу над боссом
        if (window.game) {
            window.game.bossFightMode = true;
            window.game.currentBoss = boss;
            window.game.showScreen('city-map');
        }
        
        this.showNotification('Выбери квартал для противостояния боссу', 'warning');
    }
    
    async attemptDefeat(bossId) {
        try {
            const response = await fetch('/api/boss/defeat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({boss_id: bossId})
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showVictory(data.boss, data.rewards);
            } else {
                this.showNotification('Условия победы не выполнены', 'warning');
            }
        } catch (error) {
            console.error('Ошибка победы над боссом:', error);
        }
    }
    
    showVictory(boss, rewards) {
        const container = document.getElementById('boss-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const victoryEl = document.createElement('div');
        victoryEl.className = 'boss-victory';
        
        victoryEl.innerHTML = `
            <div class="victory-icon">✓</div>
            <h2>Победа!</h2>
            <div class="victory-dialogue">"${boss.dialogue?.defeat || 'Босс побеждён.'}"</div>
            <div class="victory-rewards">
                <div class="reward-item">+${rewards.stability_points} очков</div>
                <div class="reward-item">+${rewards.effort} Effort</div>
            </div>
            <button class="btn btn-primary" onclick="window.game.showScreen('city-map')">
                Вернуться в город
            </button>
        `;
        
        container.appendChild(victoryEl);
        
        // Если это финальный босс — разблокировать ГУРУ
        if (boss.finale) {
            setTimeout(() => {
                this.showNotification('Режим ГУРУ разблокирован!', 'success');
            }, 2000);
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `boss-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'warning' ? '#FF9800' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Добавляем анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.bossEncounter = new BossEncounter();
    
    // Проверяем боссов после каждой сессии
    if (window.game) {
        const originalEndSession = window.game.endSession;
        window.game.endSession = async function(points) {
            await originalEndSession.call(this, points);
            
            // Проверяем появление босса
            setTimeout(() => {
                if (window.bossEncounter) {
                    window.bossEncounter.checkForBoss();
                }
            }, 2000);
        };
    }
});

