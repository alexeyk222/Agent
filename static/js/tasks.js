/**
 * Система интерактивных заданий
 */

class TaskManager {
    constructor() {
        this.currentTask = null;
        this.taskStartTime = null;
        this.timerInterval = null;
    }
    
    startTask(taskData) {
        this.currentTask = taskData;
        this.taskStartTime = Date.now();
        
        const container = document.getElementById('task-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Заголовок задания
        const titleEl = document.createElement('h2');
        titleEl.className = 'task-title';
        titleEl.textContent = 'Микрозадание';
        container.appendChild(titleEl);
        
        // Промпт
        const promptEl = document.createElement('div');
        promptEl.className = 'task-prompt';
        promptEl.textContent = taskData.prompt;
        container.appendChild(promptEl);
        
        // Рендерим по типу
        const taskType = taskData.type;
        
        if (taskType === 'reflection') {
            this.renderReflectionTask(taskData, container);
        } else if (taskType === 'timer') {
            this.renderTimerTask(taskData, container);
        } else if (taskType === 'choice') {
            this.renderChoiceTask(taskData, container);
        } else if (taskType === 'checklist') {
            this.renderChecklistTask(taskData, container);
        } else if (taskType === 'number_input') {
            this.renderNumberTask(taskData, container);
        } else if (taskType === 'habit_creation') {
            this.renderHabitTask(taskData, container);
        } else if (taskType === 'people_list') {
            this.renderPeopleTask(taskData, container);
        }
    }
    
    renderReflectionTask(task, container) {
        const textarea = document.createElement('textarea');
        textarea.className = 'task-input-large';
        textarea.placeholder = task.placeholder || 'Напиши свои мысли...';
        textarea.rows = 6;
        textarea.id = 'task-reflection-input';
        
        // Счётчик слов
        const counterEl = document.createElement('div');
        counterEl.className = 'word-counter';
        counterEl.textContent = '0 слов';
        
        textarea.oninput = () => {
            const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0);
            counterEl.textContent = `${words.length} слов`;
            
            if (task.min_words && words.length >= task.min_words) {
                counterEl.classList.add('sufficient');
            } else {
                counterEl.classList.remove('sufficient');
            }
        };
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Завершить';
        submitBtn.onclick = () => this.completeTask({text: textarea.value});
        
        container.appendChild(textarea);
        container.appendChild(counterEl);
        container.appendChild(submitBtn);
    }
    
    renderTimerTask(task, container) {
        const duration = task.duration || 30;
        
        // Guidance text
        if (task.guidance) {
            const guidanceEl = document.createElement('div');
            guidanceEl.className = 'task-guidance';
            guidanceEl.textContent = task.guidance;
            container.appendChild(guidanceEl);
        }
        
        // Таймер визуал
        const timerContainer = document.createElement('div');
        timerContainer.className = 'task-timer-container';
        
        const timerCircle = document.createElement('div');
        timerCircle.className = 'task-timer-circle';
        
        const timerText = document.createElement('div');
        timerText.className = 'task-timer-text';
        timerText.textContent = duration;
        
        timerCircle.appendChild(timerText);
        timerContainer.appendChild(timerCircle);
        container.appendChild(timerContainer);
        
        // Кнопка старта
        const startBtn = document.createElement('button');
        startBtn.className = 'btn btn-primary btn-large';
        startBtn.textContent = 'Начать';
        startBtn.onclick = () => this.startTimer(duration, timerText, startBtn);
        
        container.appendChild(startBtn);
    }
    
    startTimer(duration, displayEl, buttonEl) {
        let remaining = duration;
        buttonEl.style.display = 'none';
        
        this.timerInterval = setInterval(() => {
            remaining--;
            displayEl.textContent = remaining;
            
            // Визуальный прогресс
            const progress = (duration - remaining) / duration;
            displayEl.style.transform = `scale(${1 + progress * 0.2})`;
            
            if (remaining <= 0) {
                clearInterval(this.timerInterval);
                displayEl.textContent = '✓';
                displayEl.style.color = '#4CAF50';
                
                // Автозавершение
                setTimeout(() => {
                    this.completeTask({completed: true, duration: duration});
                }, 1000);
            }
        }, 1000);
    }
    
    renderChoiceTask(task, container) {
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'task-options';
        
        const options = task.options || [];
        options.forEach(option => {
            const optionCard = document.createElement('div');
            optionCard.className = 'task-option-card';
            
            const optionTitle = document.createElement('div');
            optionTitle.className = 'task-option-title';
            optionTitle.textContent = option.text || option;
            
            optionCard.appendChild(optionTitle);
            
            if (option.followup) {
                const followupEl = document.createElement('div');
                followupEl.className = 'task-option-followup';
                followupEl.textContent = option.followup;
                optionCard.appendChild(followupEl);
            }
            
            optionCard.onclick = () => {
                // Выделяем выбранный
                document.querySelectorAll('.task-option-card').forEach(c => 
                    c.classList.remove('selected'));
                optionCard.classList.add('selected');
                
                // Показываем кнопку подтверждения
                document.getElementById('task-confirm-btn').style.display = 'block';
                this.selectedOption = option.id || option.text;
            };
            
            optionsContainer.appendChild(optionCard);
        });
        
        container.appendChild(optionsContainer);
        
        // Кнопка подтверждения
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.id = 'task-confirm-btn';
        confirmBtn.textContent = 'Подтвердить выбор';
        confirmBtn.style.display = 'none';
        confirmBtn.onclick = () => this.completeTask({choice: this.selectedOption});
        
        container.appendChild(confirmBtn);
    }
    
    renderChecklistTask(task, container) {
        const itemsCount = task.items || 3;
        
        const checklistEl = document.createElement('div');
        checklistEl.className = 'task-checklist';
        
        const items = [];
        for (let i = 0; i < itemsCount; i++) {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'checklist-item';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'checklist-input';
            input.placeholder = `Пункт ${i + 1}...`;
            input.id = `checklist-item-${i}`;
            
            items.push(input);
            itemContainer.appendChild(input);
            checklistEl.appendChild(itemContainer);
        }
        
        container.appendChild(checklistEl);
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Завершить';
        submitBtn.onclick = () => {
            const values = items.map(input => input.value.trim()).filter(v => v);
            this.completeTask({items: values});
        };
        
        container.appendChild(submitBtn);
    }
    
    renderNumberTask(task, container) {
        if (task.guidance) {
            const guidanceEl = document.createElement('div');
            guidanceEl.className = 'task-guidance';
            guidanceEl.textContent = task.guidance;
            container.appendChild(guidanceEl);
        }
        
        const inputContainer = document.createElement('div');
        inputContainer.className = 'task-number-container';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'task-number-input';
        input.placeholder = 'Введи число...';
        input.id = 'task-number-input';
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Подтвердить';
        submitBtn.onclick = () => {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                this.completeTask({number: value});
            } else {
                alert('Введи корректное число');
            }
        };
        
        inputContainer.appendChild(input);
        inputContainer.appendChild(submitBtn);
        container.appendChild(inputContainer);
    }
    
    renderHabitTask(task, container) {
        const form = document.createElement('div');
        form.className = 'task-habit-form';
        
        // Поле для привычки
        const habitLabel = document.createElement('label');
        habitLabel.textContent = 'Новая привычка (2 минуты):';
        
        const habitInput = document.createElement('input');
        habitInput.type = 'text';
        habitInput.className = 'task-input';
        habitInput.placeholder = 'Например: написать 1 предложение в дневник';
        habitInput.id = 'habit-new';
        
        // Поле для якоря
        const anchorLabel = document.createElement('label');
        anchorLabel.textContent = 'После какого действия:';
        
        const anchorInput = document.createElement('input');
        anchorInput.type = 'text';
        anchorInput.className = 'task-input';
        anchorInput.placeholder = 'Например: после утреннего кофе';
        anchorInput.id = 'habit-anchor';
        
        // Пример
        if (task.example) {
            const exampleEl = document.createElement('div');
            exampleEl.className = 'task-example';
            exampleEl.textContent = `Пример: ${task.example}`;
            form.appendChild(exampleEl);
        }
        
        form.appendChild(habitLabel);
        form.appendChild(habitInput);
        form.appendChild(anchorLabel);
        form.appendChild(anchorInput);
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Создать привычку';
        submitBtn.onclick = () => {
            const habit = habitInput.value.trim();
            const anchor = anchorInput.value.trim();
            
            if (habit && anchor) {
                this.completeTask({habit: habit, anchor: anchor});
            } else {
                alert('Заполни оба поля');
            }
        };
        
        container.appendChild(form);
        container.appendChild(submitBtn);
    }
    
    renderPeopleTask(task, container) {
        const peopleForm = document.createElement('div');
        peopleForm.className = 'task-people-form';
        
        const fields = task.fields || [];
        const inputs = [];
        
        fields.forEach((field, index) => {
            const personContainer = document.createElement('div');
            personContainer.className = 'person-entry';
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'task-input';
            nameInput.placeholder = `Человек ${index + 1}`;
            
            const dateInput = document.createElement('input');
            dateInput.type = 'text';
            dateInput.className = 'task-input-small';
            dateInput.placeholder = 'Когда видел? (например, вчера)';
            
            personContainer.appendChild(nameInput);
            personContainer.appendChild(dateInput);
            peopleForm.appendChild(personContainer);
            
            inputs.push({name: nameInput, date: dateInput});
        });
        
        container.appendChild(peopleForm);
        
        // Action note
        if (task.action) {
            const actionEl = document.createElement('div');
            actionEl.className = 'task-action-note';
            actionEl.textContent = task.action;
            container.appendChild(actionEl);
        }
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Завершить';
        submitBtn.onclick = () => {
            const people = inputs.map(inp => ({
                name: inp.name.value.trim(),
                last_contact: inp.date.value.trim()
            })).filter(p => p.name);
            
            this.completeTask({people: people});
        };
        
        container.appendChild(submitBtn);
    }
    
    async completeTask(result) {
        // Валидация
        if (!this.validateTaskResult(result)) {
            return;
        }
        
        // Отправляем на сервер
        try {
            const response = await fetch('/api/task/complete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    task: this.currentTask,
                    result: result,
                    duration: Date.now() - this.taskStartTime
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Показываем награды
                this.showTaskRewards(data.rewards);
                
                // Переходим к следующему этапу
                setTimeout(() => {
                    if (window.game) {
                        window.game.showScreen('sphere-minigame');
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Ошибка завершения задания:', error);
        }
    }
    
    validateTaskResult(result) {
        const task = this.currentTask;
        const taskType = task.type;
        
        if (taskType === 'reflection') {
            const words = result.text?.split(/\s+/).filter(w => w.length > 0).length || 0;
            const minWords = task.min_words || 10;
            
            if (words < minWords) {
                alert(`Напиши хотя бы ${minWords} слов (сейчас ${words})`);
                return false;
            }
        } else if (taskType === 'checklist') {
            const minItems = task.items || 1;
            if (!result.items || result.items.length < minItems) {
                alert(`Заполни хотя бы ${minItems} пунктов`);
                return false;
            }
        } else if (taskType === 'people_list') {
            if (!result.people || result.people.length < 1) {
                alert('Назови хотя бы 1 человека');
                return false;
            }
        }
        
        return true;
    }
    
    showTaskRewards(rewards) {
        const container = document.getElementById('task-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const successEl = document.createElement('div');
        successEl.className = 'task-success';
        successEl.innerHTML = `
            <div class="success-icon">✓</div>
            <div class="success-title">Задание выполнено!</div>
        `;
        
        if (rewards.stability_points) {
            const pointsEl = document.createElement('div');
            pointsEl.className = 'reward-item';
            pointsEl.textContent = `+${rewards.stability_points} очков устойчивости`;
            successEl.appendChild(pointsEl);
        }
        
        if (rewards.effort) {
            const effortEl = document.createElement('div');
            pointsEl.className = 'reward-item';
            effortEl.textContent = `+${rewards.effort} Effort`;
            successEl.appendChild(effortEl);
        }
        
        container.appendChild(successEl);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});

