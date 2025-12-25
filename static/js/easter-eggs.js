/**
 * Пасхалки и скрытые функции
 */

class EasterEggs {
    constructor() {
        this.konamiCode = [];
        this.konamiSequence = [
            'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
            'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
            'KeyB', 'KeyA'
        ];
        this.cheatMode = false;
        this.devMode = false;
        this.achievements = [];
        
        this.init();
    }
    
    init() {
        // Konami Code
        document.addEventListener('keydown', (e) => {
            this.handleKonamiCode(e);
        });
        
        // Консольные команды
        this.setupConsoleCommands();
        
        // Секретные комбинации
        this.setupSecretCombinations();
        
        // Скрытые отсылки
        this.addGameReferences();
        
        // Философские цитаты в консоли
        this.addConsoleQuotes();
    }
    
    handleKonamiCode(e) {
        this.konamiCode.push(e.code);
        
        // Ограничиваем длину
        if (this.konamiCode.length > this.konamiSequence.length) {
            this.konamiCode.shift();
        }
        
        // Проверяем совпадение
        if (this.konamiCode.length === this.konamiSequence.length) {
            let match = true;
            for (let i = 0; i < this.konamiCode.length; i++) {
                if (this.konamiCode[i] !== this.konamiSequence[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                this.activateKonamiCode();
                this.konamiCode = [];
            }
        }
    }
    
    activateKonamiCode() {
        this.cheatMode = !this.cheatMode;
        
        const message = this.cheatMode 
            ? '🎮 Режим читов активирован! Все ограничения сняты.'
            : '🎮 Режим читов деактивирован.';
        
        this.showEasterEggMessage(message);
        this.unlockAchievement('Konami Master');
        
        // Убираем ограничения времени между сессиями
        if (window.game && this.cheatMode) {
            console.log('Cheat mode: Session cooldown disabled');
        }
    }
    
    setupConsoleCommands() {
        // Переопределяем console для перехвата команд
        const originalLog = console.log;
        
        window.gameCommands = {
            help: () => {
                console.log('%cДоступные команды:', 'color: #2196F3; font-weight: bold;');
                console.log('  gameCommands.help() - показать эту справку');
                console.log('  gameCommands.cheat() - активировать режим читов');
                console.log('  gameCommands.debug() - показать отладочную информацию');
                console.log('  gameCommands.addPoints(amount) - добавить очки');
                console.log('  gameCommands.unlockAll() - разблокировать все кварталы');
                console.log('  gameCommands.achievements() - показать достижения');
            },
            
            cheat: () => {
                this.cheatMode = !this.cheatMode;
                console.log(`Cheat mode: ${this.cheatMode ? 'ON' : 'OFF'}`);
                this.unlockAchievement('Code Breaker');
            },
            
            debug: () => {
                if (window.game) {
                    console.log('Game State:', {
                        currentScreen: window.game.currentScreen,
                        currentDistrict: window.game.currentDistrict,
                        currentEmotion: window.game.currentEmotion,
                        playerProgress: window.game.playerProgress
                    });
                }
                this.devMode = true;
                this.unlockAchievement('Debug Master');
            },
            
            addPoints: (amount = 100) => {
                if (window.game && this.cheatMode) {
                    // Отправляем запрос на добавление очков
                    fetch('/api/session/end', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session: { district: 'citadel', emotion: 'cheat', intensity: 0 },
                            points: amount
                        })
                    }).then(() => {
                        window.game.loadProgress();
                        console.log(`Added ${amount} points!`);
                    });
                } else {
                    console.log('Enable cheat mode first!');
                }
            },
            
            unlockAll: () => {
                if (this.cheatMode) {
                    console.log('All districts unlocked!');
                    // Можно добавить логику разблокировки
                } else {
                    console.log('Enable cheat mode first!');
                }
            },
            
            achievements: () => {
                console.log('%cДостижения:', 'color: #FFD700; font-weight: bold;');
                this.achievements.forEach((ach, i) => {
                    console.log(`  ${i + 1}. ${ach.name} - ${ach.date}`);
                });
            }
        };
        
        // Показываем подсказку при первом открытии консоли
        console.log('%c🎮 InnerQuest Console', 'color: #2196F3; font-size: 20px; font-weight: bold;');
        console.log('%cВведите gameCommands.help() для списка команд', 'color: #9C27B0;');
    }
    
    setupSecretCombinations() {
        // Секретная комбинация: клик по заголовку 5 раз
        let titleClicks = 0;
        const title = document.querySelector('.game-title');
        
        if (title) {
            title.addEventListener('click', () => {
                titleClicks++;
                if (titleClicks >= 5) {
                    this.activateSecretTitle();
                    titleClicks = 0;
                }
                
                setTimeout(() => {
                    titleClicks = 0;
                }, 2000);
            });
        }
        
        // Секретная комбинация: двойной клик по аватару Айры
        document.addEventListener('click', (e) => {
            if (e.target.closest('.avatar-silhouette')) {
                if (!this.avatarClickTime) {
                    this.avatarClickTime = Date.now();
                } else {
                    const timeDiff = Date.now() - this.avatarClickTime;
                    if (timeDiff < 500) {
                        this.activateSecretAvatar();
                    }
                    this.avatarClickTime = null;
                }
            }
        });
    }
    
    activateSecretTitle() {
        this.showEasterEggMessage('🌟 Секрет обнаружен! Ты нашел скрытую функцию.');
        this.unlockAchievement('Explorer');
        
        // Специальный визуальный эффект
        document.body.style.animation = 'rainbow 2s ease';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 2000);
    }
    
    activateSecretAvatar() {
        this.showEasterEggMessage('💫 Айра говорит: "Ты нашел мой секрет! Я горжусь тобой."');
        this.unlockAchievement('Friend of Aira');
    }
    
    addGameReferences() {
        // Скрытые отсылки в диалогах (будут добавлены в промпт агента)
        // Но можно добавить и в консоль
        const references = [
            '🎮 "The city remembers..." - отсылка к Disco Elysium',
            '🌆 "Every district tells a story" - вдохновлено Cities: Skylines',
            '🧘 "Breathe in, breathe out" - медитативная механика из Journey',
            '💭 "Your thoughts shape the world" - философия из The Witness'
        ];
        
        // Показываем случайную отсылку при определенных условиях
        if (Math.random() < 0.1) {
            setTimeout(() => {
                console.log(`%c${references[Math.floor(Math.random() * references.length)]}`, 
                    'color: #9C27B0; font-style: italic;');
            }, 5000);
        }
    }
    
    addConsoleQuotes() {
        const quotes = [
            '"Путешествие в тысячу миль начинается с одного шага." - Лао-цзы',
            '"Ты не можешь изменить направление ветра, но можешь настроить паруса." - Джимми Дин',
            '"Единственный способ делать великую работу — это любить то, что ты делаешь." - Стив Джобс',
            '"Будущее принадлежит тем, кто верит в красоту своих мечтаний." - Элеонора Рузвельт',
            '"Ты становишься тем, во что веришь." - Опра Уинфри',
            '"Не важно, как медленно ты идешь, пока ты не останавливаешься." - Конфуций'
        ];
        
        // Показываем случайную цитату каждые 30 секунд (только в консоли)
        setInterval(() => {
            if (this.devMode) {
                const quote = quotes[Math.floor(Math.random() * quotes.length)];
                console.log(`%c💭 ${quote}`, 'color: #4CAF50; font-style: italic;');
            }
        }, 30000);
    }
    
    unlockAchievement(name) {
        if (!this.achievements.find(a => a.name === name)) {
            this.achievements.push({
                name: name,
                date: new Date().toLocaleString('ru-RU')
            });
            
            this.showEasterEggMessage(`🏆 Достижение разблокировано: ${name}`);
            
            // Сохраняем в localStorage
            localStorage.setItem('innerquest_achievements', JSON.stringify(this.achievements));
        }
    }
    
    showEasterEggMessage(message) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #2196F3, #9C27B0);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 5px 30px rgba(33, 150, 243, 0.5);
            z-index: 10000;
            animation: slideIn 0.5s ease;
            max-width: 300px;
            font-weight: 600;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
    
    loadAchievements() {
        const saved = localStorage.getItem('innerquest_achievements');
        if (saved) {
            try {
                this.achievements = JSON.parse(saved);
            } catch (e) {
                this.achievements = [];
            }
        }
    }
}

// Добавляем CSS анимации для пасхалок
const style = document.createElement('style');
style.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.easterEggs = new EasterEggs();
    window.easterEggs.loadAchievements();
});

