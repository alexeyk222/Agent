/**
 * Мини-игры: перетаскивание сферы и дыхание
 */

class Minigames {
    constructor() {
        this.sphereDragging = false;
        this.spherePointerId = null;
        this.sphereGameInitialized = false;
        this.sphereMoveScheduled = false;
        this.sphereLastPointer = null;
        this.sphereDragBounds = null;
        this.breathingCount = 0;
        this.breathingInterval = null;
        this.breathingPhase = 'inhale'; // inhale, hold, exhale
        this.breathingPhaseTime = 0;
    }
    
    initSphereGame() {
        const sphereInput = document.getElementById('sphere-input');
        const createSphereBtn = document.getElementById('create-sphere-btn');
        const sphereSource = document.getElementById('sphere-source');
        const sphereTarget = document.getElementById('sphere-target');
        
        if (!sphereInput || !createSphereBtn || !sphereSource || !sphereTarget) return;
        if (this.sphereGameInitialized) return;
        this.sphereGameInitialized = true;
        
        // Создание сферы
        createSphereBtn.addEventListener('click', () => {
            const text = sphereInput.value.trim();
            if (text) {
                this.createSphere(text);
            } else {
                alert('Введи действие, которое принесло тебе комфорт');
            }
        });
        
        // Enter для создания сферы
        sphereInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createSphereBtn.click();
            }
        });
        
        // Перетаскивание сферы
        this.setupDragAndDrop(sphereSource, sphereTarget);
    }
    
    createSphere(text) {
        const sphereSource = document.getElementById('sphere-source');
        if (!sphereSource) return;
        
        // Обновляем текст сферы
        sphereSource.textContent = text.substring(0, 20);
        sphereSource.title = text;
        
        // Анимация появления
        sphereSource.style.animation = 'sphereAppear 0.5s ease';
        
        // Сохраняем текст для отправки
        sphereSource.dataset.text = text;
    }
    
    setupDragAndDrop(source, target) {
        if (!source || !target) return;
        
        const handlePointerDown = (e) => {
            if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
            
            this.sphereDragging = true;
            this.spherePointerId = e.pointerId;
            this.sphereDragBounds = this.computeSphereDragBounds(source, target);
            source.style.cursor = 'grabbing';
            source.classList.add('is-dragging');
            source.setPointerCapture?.(e.pointerId);
            this.queueSphereMove(source, target, e.clientX, e.clientY);
            e.preventDefault();
        };
        
        const handlePointerMove = (e) => {
            if (!this.sphereDragging || e.pointerId !== this.spherePointerId) return;
            this.queueSphereMove(source, target, e.clientX, e.clientY);
        };
        
        const handlePointerUp = (e) => {
            if (!this.sphereDragging || e.pointerId !== this.spherePointerId) return;
            
            this.sphereDragging = false;
            this.spherePointerId = null;
            this.sphereMoveScheduled = false;
            this.sphereLastPointer = null;
            source.style.cursor = 'grab';
            source.classList.remove('is-dragging');
            source.releasePointerCapture?.(e.pointerId);
            
            const targetRect = this.sphereDragBounds?.targetRect || target.getBoundingClientRect();
            const isDroppedOnTarget = this.isPointInsideRect(e.clientX, e.clientY, targetRect);
            this.sphereDragBounds = null;
            
            if (isDroppedOnTarget) {
                // Успешное завершение
                this.completeSphereGame(source.dataset.text);
            } else {
                // Возвращаем на место
                this.resetSpherePosition(source);
            }
            
            target.classList.remove('drag-over');
        };
        
        source.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('pointermove', handlePointerMove, { passive: true });
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    }
    
    computeSphereDragBounds(source, target) {
        const parentRect = source.parentElement?.getBoundingClientRect();
        if (!parentRect) return null;
        
        return {
            parentRect,
            targetRect: target.getBoundingClientRect(),
            halfWidth: source.offsetWidth / 2,
            halfHeight: source.offsetHeight / 2
        };
    }
    
    queueSphereMove(source, target, clientX, clientY) {
        this.sphereLastPointer = { clientX, clientY };
        if (this.sphereMoveScheduled) return;
        
        this.sphereMoveScheduled = true;
        requestAnimationFrame(() => this.applySphereMove(source, target));
    }
    
    applySphereMove(source, target) {
        this.sphereMoveScheduled = false;
        if (!this.sphereLastPointer) return;
        
        if (!this.sphereDragBounds) {
            this.sphereDragBounds = this.computeSphereDragBounds(source, target);
        }
        
        const bounds = this.sphereDragBounds;
        if (!bounds) return;
        
        const { parentRect, targetRect, halfWidth, halfHeight } = bounds;
        const x = Math.min(parentRect.width, Math.max(0, this.sphereLastPointer.clientX - parentRect.left));
        const y = Math.min(parentRect.height, Math.max(0, this.sphereLastPointer.clientY - parentRect.top));
        
        source.style.left = `${x}px`;
        source.style.top = `${y}px`;
        source.style.transform = 'translate(-50%, -50%)';
        
        const sourceRect = {
            left: this.sphereLastPointer.clientX - halfWidth,
            right: this.sphereLastPointer.clientX + halfWidth,
            top: this.sphereLastPointer.clientY - halfHeight,
            bottom: this.sphereLastPointer.clientY + halfHeight
        };
        target.classList.toggle('drag-over', this.isOverlapping(sourceRect, targetRect));
    }
    
    resetSpherePosition(source) {
        source.style.left = '20%';
        source.style.top = '50%';
        source.style.transform = 'translate(-50%, -50%)';
        this.sphereDragBounds = null;
        this.sphereLastPointer = null;
        this.sphereMoveScheduled = false;
    }
    
    isPointInsideRect(x, y, rect) {
        return (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        );
    }
    
    isOverlapping(rect1, rect2) {
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    }
    
    async completeSphereGame(sphereText) {
        if (!sphereText) {
            alert('Сначала создай сферу, используя поле ввода над площадкой');
            const source = document.getElementById('sphere-source');
            if (source) {
                this.resetSpherePosition(source);
            }
            return;
        }
        
        // Анимация успеха
        const target = document.getElementById('sphere-target');
        if (target) {
            target.innerHTML = '<div style="color: #4CAF50; font-size: 1.5rem;">✓ Сфера размещена!</div>';
            target.style.borderColor = '#4CAF50';
        }
        
        // Отправляем на сервер
        try {
            await fetch('/api/minigame/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'sphere',
                    result: {
                        completed: true,
                        text: sphereText
                    }
                })
            });
        } catch (error) {
            console.error('Ошибка завершения мини-игры:', error);
        }
        
        // Переходим к дыханию через 2 секунды
        setTimeout(() => {
            if (window.game) {
                window.game.showScreen('breathing-minigame');
                this.initBreathingGame();
            }
        }, 2000);
    }
    
    initBreathingGame() {
        const breathingCircle = document.getElementById('breathing-circle');
        const breathingInstruction = document.getElementById('breathing-instruction');
        const breathingCount = document.getElementById('breathing-count');
        const timerBar = document.getElementById('timer-bar');
        
        if (!breathingCircle || !breathingInstruction) return;
        
        this.breathingCount = 0;
        this.breathingPhase = 'inhale';
        this.breathingPhaseTime = 0;
        
        // Сбрасываем таймер
        if (timerBar) {
            timerBar.style.width = '0%';
        }
        
        // Запускаем цикл дыхания
        this.startBreathingCycle();
    }
    
    startBreathingCycle() {
        const breathingCircle = document.getElementById('breathing-circle');
        const breathingInstruction = document.getElementById('breathing-instruction');
        const timerBar = document.getElementById('timer-bar');
        
        if (!breathingCircle || !breathingInstruction) return;
        
        const phases = [
            { name: 'Вдох', duration: 4000, scale: 1.3 },
            { name: 'Задержка', duration: 4000, scale: 1.3 },
            { name: 'Выдох', duration: 4000, scale: 1.0 }
        ];
        
        let currentPhaseIndex = 0;
        let phaseStartTime = Date.now();
        
        const updateBreathing = () => {
            const now = Date.now();
            const elapsed = now - phaseStartTime;
            const currentPhase = phases[currentPhaseIndex];
            const progress = Math.min(elapsed / currentPhase.duration, 1);
            
            // Обновляем инструкцию
            breathingInstruction.textContent = currentPhase.name;
            
            // Обновляем анимацию круга
            const scale = currentPhase.scale;
            breathingCircle.style.transform = `scale(${1 + (scale - 1) * progress})`;
            
            // Обновляем таймер
            if (timerBar) {
                timerBar.style.width = (progress * 100) + '%';
            }
            
            if (progress >= 1) {
                // Переходим к следующей фазе
                currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
                phaseStartTime = now;
                
                // Если завершили цикл (все 3 фазы)
                if (currentPhaseIndex === 0) {
                    this.breathingCount++;
                    const countEl = document.getElementById('breathing-count');
                    if (countEl) {
                        countEl.textContent = this.breathingCount;
                    }
                    
                    // Проверяем завершение (3 цикла)
                    if (this.breathingCount >= 3) {
                        this.completeBreathingGame();
                        return;
                    }
                }
            }
            
            if (this.breathingCount < 3) {
                requestAnimationFrame(updateBreathing);
            }
        };
        
        updateBreathing();
    }
    
    async completeBreathingGame() {
        // Анимация успеха
        const breathingCircle = document.getElementById('breathing-circle');
        if (breathingCircle) {
            breathingCircle.style.animation = 'breathingComplete 1s ease';
        }
        
        // Отправляем на сервер
        try {
            await fetch('/api/minigame/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'breathing',
                    result: {
                        completed: true,
                        cycles: this.breathingCount
                    }
                })
            });
        } catch (error) {
            console.error('Ошибка завершения дыхания:', error);
        }
        
        // Завершаем сессию
        setTimeout(() => {
            if (window.game) {
                window.game.endSession(15);
            }
        }, 2000);
    }
}

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes sphereAppear {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
    
    @keyframes breathingComplete {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); box-shadow: 0 0 50px rgba(76, 175, 80, 0.8); }
    }
`;
document.head.appendChild(style);

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.minigames = new Minigames();
    
    // Инициализируем мини-игру сферы когда экран показывается
    const sphereScreen = document.getElementById('sphere-minigame');
    if (sphereScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    window.minigames.initSphereGame();
                }
            });
        });
        observer.observe(sphereScreen, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Кнопки пропуска
    const skipSphereBtn = document.getElementById('skip-sphere-btn');
    if (skipSphereBtn) {
        skipSphereBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.showScreen('breathing-minigame');
                window.minigames.initBreathingGame();
            }
        });
    }
    
    const skipBreathingBtn = document.getElementById('skip-breathing-btn');
    if (skipBreathingBtn) {
        skipBreathingBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.endSession(10); // Меньше очков за пропуск
            }
        });
    }
});
