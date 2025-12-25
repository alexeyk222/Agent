/**
 * Система карточек Card Rail
 */

class CardRail {
    constructor() {
        this.ownedCards = [];
        this.equippedCard = null;
        this.selectedCard = null;
        this.draggedCard = null;
        this.pointerDrag = null;
    }
    
    async loadCards() {
        try {
            const response = await fetch('/api/cards/owned');
            const data = await response.json();
            
            if (data.success) {
                this.ownedCards = data.cards || [];
                this.equippedCard = data.equipped || null;
                this.renderCardRail();
            }
        } catch (error) {
            console.error('Ошибка загрузки карт:', error);
        }
    }
    
    renderCardRail() {
        const rail = document.getElementById('card-rail');
        if (!rail) return;
        
        rail.innerHTML = '';
        
        // Слот 0: Активная карта
        this.renderSlot(rail, 0, this.equippedCard, true);
        
        // Слоты 1-4: Открытые карты
        const unequipped = this.ownedCards.filter(c => c.card_id !== this.equippedCard);
        for (let i = 1; i < 5; i++) {
            const card = unequipped[i - 1] || null;
            this.renderSlot(rail, i, card, false);
        }
    }
    
    renderSlot(rail, slotIndex, cardData, isActive) {
        const slot = document.createElement('div');
        slot.className = `card-slot ${isActive ? 'active' : 'inactive'}`;
        slot.dataset.slot = slotIndex;
        
        if (cardData) {
            const card = this.createCardElement(cardData, isActive);
            slot.appendChild(card);
        } else {
            // Пустой слот
            const emptyIndicator = document.createElement('div');
            emptyIndicator.className = 'card-empty';
            emptyIndicator.textContent = isActive ? 'Активная' : 'Пусто';
            slot.appendChild(emptyIndicator);
        }
        
        // Drop zone для экипировки
        if (isActive) {
            this.setupDropZone(slot);
        }
        
        rail.appendChild(slot);
    }
    
    createCardElement(cardData, isActive) {
        const card = document.createElement('div');
        card.className = `card card-${cardData.rarity} ${cardData.type}`;
        card.dataset.cardId = cardData.card_id;
        card.tabIndex = 0;
        
        // Иконка типа
        const typeIcon = document.createElement('div');
        typeIcon.className = 'card-type-icon';
        typeIcon.textContent = this.getTypeIcon(cardData.type);
        card.appendChild(typeIcon);
        
        // Изображение карты (если есть)
        if (cardData.image) {
            const img = document.createElement('img');
            img.src = `/static/images/cards/${cardData.image}`;
            img.className = 'card-image';
            img.onerror = () => {
                img.style.display = 'none';
                this.addFallbackVisual(card, cardData);
            };
            card.appendChild(img);
        } else {
            this.addFallbackVisual(card, cardData);
        }
        
        // Название
        const name = document.createElement('div');
        name.className = 'card-name';
        name.textContent = cardData.name;
        card.appendChild(name);
        
        // Описание (hover)
        const description = document.createElement('div');
        description.className = 'card-description';
        description.textContent = cardData.description;
        card.appendChild(description);
        
        // Редкость
        const rarity = document.createElement('div');
        rarity.className = 'card-rarity';
        rarity.textContent = this.getRarityText(cardData.rarity);
        card.appendChild(rarity);
        
        // Кнопки действий (если не активная)
        if (!isActive) {
            const equipBtn = document.createElement('button');
            equipBtn.className = 'card-equip-btn';
            equipBtn.textContent = 'Экипировать';
            equipBtn.onclick = (e) => {
                e.stopPropagation();
                this.equipCard(cardData.card_id);
            };
            card.appendChild(equipBtn);
        } else {
            const useBtn = document.createElement('button');
            useBtn.className = 'card-use-btn';
            useBtn.textContent = 'Использовать';
            useBtn.onclick = (e) => {
                e.stopPropagation();
                this.activateCard(cardData.card_id);
            };
            card.appendChild(useBtn);
        }
        
        // Drag & Drop
        card.draggable = true;
        card.ondragstart = (e) => this.handleDragStart(e, cardData);
        card.ondragend = (e) => this.handleDragEnd(e);
        
        // Pointer Events для сенсорных устройств
        this.attachPointerHandlers(card, cardData, isActive);
        
        // Клавиатурный fallback
        card.addEventListener('keydown', (e) => this.handleCardKeydown(e, cardData, isActive));
        
        // Click для деталей
        card.onclick = () => this.showCardDetails(cardData);
        
        return card;
    }
    
    addFallbackVisual(card, cardData) {
        const fallback = document.createElement('div');
        fallback.className = 'card-visual-fallback';
        fallback.style.background = this.getRarityGradient(cardData.rarity);
        fallback.textContent = cardData.name[0]; // Первая буква
        card.appendChild(fallback);
    }
    
    getTypeIcon(type) {
        const icons = {
            'skill': '⚡',
            'relic': '🔮',
            'contract': '📜',
            'lore': '📖',
            'companion': '👤',
            'hazard': '⚠️'
        };
        return icons[type] || '✨';
    }
    
    getRarityText(rarity) {
        const texts = {
            'common': 'Обычная',
            'rare': 'Редкая',
            'epic': 'Эпическая',
            'legendary': 'Легендарная'
        };
        return texts[rarity] || rarity;
    }
    
    getRarityGradient(rarity) {
        const gradients = {
            'common': 'linear-gradient(135deg, #8b7355 0%, #6b5644 100%)',
            'rare': 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
            'epic': 'linear-gradient(135deg, #ffd89b 0%, #ff9a56 100%)',
            'legendary': 'linear-gradient(135deg, #c7b3e5 0%, #9b7ec0 100%)'
        };
        return gradients[rarity] || gradients.common;
    }
    
    handleDragStart(e, cardData) {
        this.draggedCard = cardData;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
        e.target.style.opacity = '0.5';
    }
    
    handleDragEnd(e) {
        e.target.style.opacity = '1';
        this.draggedCard = null;
    }
    
    setupDropZone(slot) {
        slot.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            slot.classList.add('drag-over');
        };
        
        slot.ondragleave = () => {
            slot.classList.remove('drag-over');
        };
        
        slot.ondrop = (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            if (this.draggedCard) {
                this.equipCard(this.draggedCard.card_id);
            }
        };
    }
    
    attachPointerHandlers(card, cardData, isActive) {
        const activeSlot = () => document.querySelector('.card-slot.active');
        
        const clearDragVisuals = () => {
            card.classList.remove('touch-dragging');
            card.style.transform = '';
            card.style.transition = '';
            activeSlot()?.classList.remove('drag-over');
            this.pointerDrag = null;
        };
        
        card.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return;
            
            this.pointerDrag = {
                pointerId: e.pointerId,
                cardData,
                cardElement: card,
                startX: e.clientX,
                startY: e.clientY,
                moved: false
            };
            
            card.setPointerCapture?.(e.pointerId);
            card.classList.add('touch-dragging');
            card.style.transition = 'none';
        });
        
        card.addEventListener('pointermove', (e) => {
            if (!this.pointerDrag || this.pointerDrag.pointerId !== e.pointerId) return;
            
            const deltaX = e.clientX - this.pointerDrag.startX;
            const deltaY = e.clientY - this.pointerDrag.startY;
            const distance = Math.abs(deltaX) + Math.abs(deltaY);
            if (distance > 6) {
                this.pointerDrag.moved = true;
            }
            
            if (this.pointerDrag.moved) {
                card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            }
            
            const slot = activeSlot();
            if (slot) {
                const rect = slot.getBoundingClientRect();
                const isOver = this.isPointInsideRect(e.clientX, e.clientY, rect);
                slot.classList.toggle('drag-over', isOver);
            }
        }, { passive: true });
        
        const pointerCleanup = (e) => {
            if (!this.pointerDrag || this.pointerDrag.pointerId !== e.pointerId) return;
            
            const slot = activeSlot();
            const droppedOnActive = slot && this.isPointInsideRect(e.clientX, e.clientY, slot.getBoundingClientRect());
            
            if (this.pointerDrag.moved && droppedOnActive) {
                this.equipCard(cardData.card_id);
            }
            
            card.releasePointerCapture?.(e.pointerId);
            clearDragVisuals();
        };
        
        card.addEventListener('pointerup', pointerCleanup);
        card.addEventListener('pointercancel', pointerCleanup);
    }
    
    handleCardKeydown(e, cardData, isActive) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isActive) {
                this.activateCard(cardData.card_id);
            } else {
                this.equipCard(cardData.card_id);
            }
        }
    }
    
    isPointInsideRect(x, y, rect) {
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
    
    async equipCard(cardId) {
        try {
            const response = await fetch('/api/cards/equip', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({card_id: cardId})
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.equippedCard = cardId;
                await this.loadCards(); // Перезагрузить
                this.showNotification(`${data.card_name} экипирована!`);
            }
        } catch (error) {
            console.error('Ошибка экипировки:', error);
        }
    }
    
    async activateCard(cardId) {
        if (!this.equippedCard || this.equippedCard !== cardId) {
            alert('Эта карта не экипирована');
            return;
        }
        
        try {
            const response = await fetch('/api/cards/activate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({card_id: cardId})
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showCardActivation(data);
                await this.loadCards(); // Обновить после использования
            }
        } catch (error) {
            console.error('Ошибка активации карты:', error);
        }
    }
    
    showCardActivation(data) {
        const effects = data.effects || [];
        let message = 'Карта активирована!\n\n';
        
        effects.forEach(effect => {
            if (effect.type === 'stability') {
                message += `+${effect.value} очков устойчивости\n`;
            } else if (effect.type === 'fog_reduction') {
                message += `Туман рассеялся в ${effect.district}\n`;
            }
        });
        
        if (data.consumed) {
            message += '\n(Карта использована)';
        }
        
        this.showNotification(message, 'success');
    }
    
    showCardDetails(cardData) {
        const modal = this.createModal();
        modal.innerHTML = `
            <div class="card-details-modal">
                <h2>${cardData.name}</h2>
                <div class="card-type">${this.getTypeIcon(cardData.type)} ${cardData.type}</div>
                <div class="card-rarity-badge ${cardData.rarity}">${this.getRarityText(cardData.rarity)}</div>
                <div class="card-description-full">${cardData.description}</div>
                
                ${cardData.effect ? `
                    <div class="card-effect">
                        <strong>Эффект:</strong><br>
                        ${this.formatEffect(cardData.effect)}
                    </div>
                ` : ''}
                
                ${cardData.effort_cost ? `
                    <div class="card-cost">Стоимость: ${cardData.effort_cost} Effort</div>
                ` : ''}
                
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">
                    Закрыть
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    formatEffect(effect) {
        let text = '';
        if (effect.stability_points) {
            text += `+${effect.stability_points} очков устойчивости<br>`;
        }
        if (effect.passive) {
            text += `Пассив: ${effect.passive}<br>`;
        }
        if (effect.fog_reduction) {
            text += `Снимает туман в квартале<br>`;
        }
        return text || 'Специальный эффект';
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'card-modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        return modal;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `card-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    async openCardShop() {
        // Показать доступные для открытия карты
        try {
            const response = await fetch('/api/cards/available');
            const data = await response.json();
            
            if (data.success) {
                this.showCardShop(data.cards, data.effort);
            }
        } catch (error) {
            console.error('Ошибка загрузки магазина:', error);
        }
    }
    
    showCardShop(availableCards, currentEffort) {
        const modal = this.createModal();
        
        let cardsHTML = availableCards.map(card => `
            <div class="shop-card card-${card.rarity}">
                <div class="shop-card-name">${card.name}</div>
                <div class="shop-card-desc">${card.description}</div>
                <div class="shop-card-cost">
                    ${card.effort_cost} Effort
                    ${currentEffort >= card.effort_cost ? 
                        `<button onclick="window.cardRail.unlockCard('${card.card_id}')" class="btn-small">Открыть</button>` :
                        `<span class="insufficient">Недостаточно</span>`
                    }
                </div>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="card-shop-modal">
                <h2>Доступные карты</h2>
                <div class="effort-display">Доступно Effort: ${currentEffort}</div>
                <div class="shop-cards-grid">${cardsHTML || '<p>Нет доступных карт</p>'}</div>
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">Закрыть</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    async unlockCard(cardId) {
        try {
            const response = await fetch('/api/cards/unlock', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({card_id: cardId})
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Карта "${data.card.name}" открыта!`, 'success');
                await this.loadCards();
                
                // Закрыть магазин и перезагрузить
                document.querySelector('.card-modal-overlay')?.remove();
            } else {
                alert(data.error || 'Ошибка открытия карты');
            }
        } catch (error) {
            console.error('Ошибка открытия карты:', error);
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.cardRail = new CardRail();
    
    // Загружаем карты при старте
    if (window.game) {
        const originalLoadProgress = window.game.loadProgress;
        window.game.loadProgress = async function() {
            await originalLoadProgress.call(this);
            if (window.cardRail) {
                await window.cardRail.loadCards();
            }
        };
    }
});
