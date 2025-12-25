/**
 * Система бинарных вопросов
 */

class QuestionTree {
    constructor() {
        this.currentTree = null;
        this.currentNode = null;
        this.treeHistory = [];
        this.answers = {};
    }
    
    async startTree(treeId, district) {
        // Загружаем дерево вопросов
        try {
            const response = await fetch(`/api/tree/start?tree_id=${treeId}&district=${district}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentTree = treeId;
                this.currentNode = data.root;
                this.treeHistory = [];
                this.answers = {};
                
                if (window.game) {
                    window.game.updateAgentContext(this.currentNode?.node_id);
                }
                this.renderQuestion(this.currentNode);
            }
        } catch (error) {
            console.error('Ошибка загрузки дерева:', error);
        }
    }
    
    renderQuestion(node) {
        const container = document.getElementById('question-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Добавляем текст вопроса
        const questionEl = document.createElement('div');
        questionEl.className = 'question-text';
        questionEl.textContent = node.text;
        container.appendChild(questionEl);
        
        // Рендерим в зависимости от типа узла
        const nodeType = node.type;
        
        if (nodeType === 'choice') {
            this.renderChoiceOptions(node, container);
        } else if (nodeType === 'scale') {
            this.renderScale(node, container);
        } else if (nodeType === 'open_or_choice') {
            this.renderOpenWithFallback(node, container);
        } else if (nodeType === 'task_trigger') {
            this.triggerTask(node);
        } else if (nodeType === 'reflection') {
            this.renderReflection(node, container);
        }
        
        // Кнопка "Назад" если есть история
        if (this.treeHistory.length > 0) {
            const backBtn = document.createElement('button');
            backBtn.className = 'btn btn-secondary question-back';
            backBtn.textContent = '← Назад';
            backBtn.onclick = () => this.goBack();
            container.appendChild(backBtn);
        }

        if (window.game) {
            window.game.updateAgentContext(node?.node_id);
        }
    }
    
    renderChoiceOptions(node, container) {
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'question-options';
        
        const options = node.options || [];
        options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'question-option';
            optionBtn.textContent = option.text;
            optionBtn.onclick = () => this.answerQuestion(option.text, option.next);
            
            // Добавляем номер для клавиатуры
            const numberSpan = document.createElement('span');
            numberSpan.className = 'option-number';
            numberSpan.textContent = `${index + 1}`;
            optionBtn.prepend(numberSpan);
            
            optionsContainer.appendChild(optionBtn);
        });
        
        container.appendChild(optionsContainer);
    }
    
    renderScale(node, container) {
        const scaleContainer = document.createElement('div');
        scaleContainer.className = 'question-scale';
        
        const min = node.min || 1;
        const max = node.max || 10;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = Math.floor((min + max) / 2);
        slider.className = 'scale-slider';
        
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'scale-value';
        valueDisplay.textContent = slider.value;
        
        slider.oninput = () => {
            valueDisplay.textContent = slider.value;
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = 'Подтвердить';
        confirmBtn.onclick = () => this.answerQuestion(slider.value, node.next);
        
        scaleContainer.appendChild(slider);
        scaleContainer.appendChild(valueDisplay);
        scaleContainer.appendChild(confirmBtn);
        
        container.appendChild(scaleContainer);
    }
    
    renderOpenWithFallback(node, container) {
        const openContainer = document.createElement('div');
        openContainer.className = 'question-open';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'open-input';
        textarea.placeholder = 'Напиши свой ответ...';
        textarea.rows = 3;
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Ответить';
        submitBtn.onclick = () => {
            if (textarea.value.trim()) {
                this.answerQuestion(textarea.value, null);
            }
        };
        
        openContainer.appendChild(textarea);
        openContainer.appendChild(submitBtn);
        container.appendChild(openContainer);
        
        // Fallback опции
        if (node.fallback_options) {
            const divider = document.createElement('div');
            divider.className = 'question-divider';
            divider.textContent = 'или выбери:';
            container.appendChild(divider);
            
            this.renderChoiceOptions({options: node.fallback_options}, container);
        }
    }
    
    renderReflection(node, container) {
        const reflectionEl = document.createElement('div');
        reflectionEl.className = 'question-reflection';
        reflectionEl.textContent = node.text;
        
        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn btn-primary';
        continueBtn.textContent = 'Продолжить';
        continueBtn.onclick = () => this.continueToNext(node);
        
        container.appendChild(reflectionEl);
        container.appendChild(continueBtn);
    }
    
    async answerQuestion(answer, nextNodeId) {
        // Сохраняем ответ
        this.answers[this.currentNode.node_id] = answer;
        
        // Сохраняем в историю
        this.treeHistory.push({
            node: this.currentNode,
            answer: answer
        });
        
        // Отправляем на сервер
        try {
            const response = await fetch('/api/tree/traverse', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    tree_id: this.currentTree,
                    node_id: this.currentNode.node_id,
                    answer: answer
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.next_node) {
                    this.currentNode = data.next_node;
                    if (window.game) {
                        window.game.updateAgentContext(this.currentNode?.node_id);
                    }
                    this.renderQuestion(this.currentNode);
                } else if (data.task_triggered) {
                    // Переходим к заданию
                    this.triggerTask(data.task);
                } else if (data.completed) {
                    // Дерево завершено
                    this.completeTree();
                }
            }
        } catch (error) {
            console.error('Ошибка обхода дерева:', error);
        }
    }
    
    triggerTask(taskData) {
        const normalizedTask = this.normalizeTaskData(taskData);
        
        // Переходим к экрану задания
        if (window.taskManager) {
            window.taskManager.startTask(normalizedTask);
        }
        
        if (window.game) {
            window.game.showScreen('task-screen');
            window.game.updateAgentContext(this.currentNode?.node_id);
        }
    }

    normalizeTaskData(taskData = {}) {
        const taskType = taskData.type && taskData.type !== 'task_trigger' ? taskData.type : taskData.task_type;
        let normalizedType = taskType || 'reflection';
        if (normalizedType === 'text_input') {
            normalizedType = 'reflection';
        }

        return {
            type: normalizedType,
            prompt: taskData.task_text || taskData.text || 'Сделай небольшой шаг',
            duration: taskData.duration,
            guidance: taskData.guidance,
            options: taskData.options,
            items: taskData.items
        };
    }
    
    continueToNext(node) {
        const nextId = node.leads_to || node.next;
        if (nextId) {
            this.answerQuestion('continue', nextId);
        } else {
            this.completeTree();
        }
    }
    
    goBack() {
        if (this.treeHistory.length === 0) return;
        
        const previous = this.treeHistory.pop();
        this.currentNode = previous.node;
        delete this.answers[this.currentNode.node_id];
        
        this.renderQuestion(this.currentNode);
    }
    
    completeTree() {
        // Дерево завершено, переходим к финальному заданию/результату
        if (window.taskManager) {
            const emotion = window.game?.currentEmotion;
            window.taskManager.startTask({
                type: 'reflection',
                prompt: emotion ? `Запиши одну мысль о том, как ты справляешься с эмоцией «${emotion}».` : 'Запиши одну мысль о том, что ты понял из вопросов.',
                placeholder: 'Например: я заметил, что мне помогает...'
            });
        }

        if (window.game) {
            window.game.showScreen('task-screen');
            window.game.updateAgentContext(null);
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.questionTree = new QuestionTree();
});
