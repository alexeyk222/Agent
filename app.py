"""
Flask приложение для игры InnerQuest: Город Сфер
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import game_engine
import agent
import config
import scenarios
import cards
import bosses
import binary_trees

app = Flask(__name__)
CORS(app)

# Инициализация менеджеров
scenarios_manager = scenarios.ScenariosManager()
cards_manager = cards.CardsManager()
bosses_manager = bosses.BossesManager()
trees_manager = binary_trees.BinaryTreesManager()

# Глобальный объект игрока (в продакшене лучше использовать сессии)
current_player = None


def get_player():
    """Получает или создает объект игрока"""
    global current_player
    if current_player is None:
        current_player = game_engine.Player("default")
    return current_player


def build_districts_overview(player: game_engine.Player) -> dict:
    """Формирует данные по кварталам с визуалом"""
    districts = {}
    for key, district_data in player.data.get('districts', {}).items():
        districts[key] = {
            'name': district_data.get('name'),
            'level': district_data.get('level', 0),
            'unlocked': district_data.get('unlocked', False),
            'theme': district_data.get('theme'),
            'visual': game_engine.City.get_visual_state(district_data)
        }
    return districts


def build_progress_payload(player: game_engine.Player, include_districts: bool = False) -> dict:
    """Возвращает данные прогресса, включая доступные карты"""
    payload = {
        'stability_points': player.get_stability_points(),
        'effort': player.data.get('effort', 0),
        'available_cards': cards_manager.get_available_cards(player.data),
        'owned_cards': player.data.get('owned_cards', []),
        'district_sessions': player.data.get('district_sessions', {}),
        'completed_levels': player.data.get('completed_levels', []),
        'acts_completed': player.data.get('acts_completed', 0),
        'actions_history': player.data.get('actions_history', {})
    }

    if include_districts:
        payload['districts'] = build_districts_overview(player)
        payload['last_session'] = player.data.get('last_session_time')

    return payload


@app.route('/')
def index():
    """Главная страница игры"""
    return render_template('index.html')


@app.route('/api/progress', methods=['GET'])
def get_progress():
    """Получает прогресс игрока"""
    player = get_player()
    
    return jsonify({
        'success': True,
        **build_progress_payload(player, include_districts=True)
    })


@app.route('/api/session/start', methods=['POST'])
def start_session():
    """Начинает новую игровую сессию"""
    player = get_player()
    
    data = request.get_json()
    district_key = data.get('district')
    emotion = data.get('emotion')
    intensity = data.get('intensity', 5)
    
    if not district_key or not emotion:
        return jsonify({
            'success': False,
            'error': 'Не указаны район или эмоция'
        }), 400
    
    # Проверяем доступность квартала
    if not player.can_access_district(district_key):
        return jsonify({
            'success': False,
            'error': 'Этот квартал еще не разблокирован'
        }), 403
    
    # Проверяем временное ограничение
    result = player.start_session(district_key, emotion, intensity)
    
    if not result.get('success'):
        return jsonify(result), 400

    # Определяем сценарный уровень для фиксации прогресса
    current_sessions = player.data.get('district_sessions', {}).get(district_key, 0)
    level_data = scenarios_manager.get_current_level(district_key, current_sessions + 1)

    if level_data:
        result['session']['level_id'] = level_data.get('level_id')
        if level_data.get('act'):
            result['session']['act'] = level_data.get('act')
        rewards = level_data.get('rewards', {})
        if rewards.get('unlocks'):
            result['session']['unlocks'] = rewards.get('unlocks')
    
    # Получаем информацию о квартале для контекста
    district_info = game_engine.City.get_district_info(district_key)
    
    # Генерируем приветствие от Айры
    aira = agent.AgentAira(player)
    greeting_context = {
        'district': district_key,
        'emotion': emotion,
        'intensity': intensity
    }
    
    # Создаем приветственное сообщение
    greeting = aira.generate_response(
        f"Начал сессию в {district_info['name']} с эмоцией {emotion} ({intensity}/10)",
        district=district_key,
        emotion=emotion,
        session_context=greeting_context
    )
    
    return jsonify({
        'success': True,
        'session': result['session'],
        'agent_greeting': greeting.get('response', 'Привет! Я Айра, твой наставник. Как дела?'),
        'district_info': district_info,
        'progress': build_progress_payload(player)
    })


@app.route('/api/agent/chat', methods=['POST'])
def agent_chat():
    """Общение с агентом Айра"""
    player = get_player()
    aira = agent.AgentAira(player)
    
    data = request.get_json()
    message = data.get('message', '')
    district = data.get('district')
    emotion = data.get('emotion')
    session_context = data.get('session_context', {})
    
    if not message:
        return jsonify({
            'success': False,
            'error': 'Сообщение не может быть пустым'
        }), 400
    
    # Генерируем ответ
    response = aira.generate_response(
        message,
        district=district,
        emotion=emotion,
        session_context=session_context
    )
    
    return jsonify({
        'success': True,
        'response': response['response'],
        'is_crisis': response.get('is_crisis', False),
        'block_game': response.get('block_game', False),
        'helplines': response.get('helplines', [])
    })


@app.route('/api/minigame/complete', methods=['POST'])
def complete_minigame():
    """Завершение мини-игры"""
    player = get_player()
    
    data = request.get_json()
    minigame_type = data.get('type')  # 'sphere' или 'breathing'
    result = data.get('result', {})
    
    # Можно добавить бонусные очки за мини-игры
    bonus_points = 0
    if minigame_type == 'sphere' and result.get('completed'):
        bonus_points = 5
    elif minigame_type == 'breathing' and result.get('completed'):
        bonus_points = 3
    
    return jsonify({
        'success': True,
        'bonus_points': bonus_points,
        'message': 'Мини-игра завершена!'
    })


@app.route('/api/session/end', methods=['POST'])
def end_session():
    """Завершает игровую сессию"""
    player = get_player()
    
    data = request.get_json()
    session_data = data.get('session', {})
    points = data.get('points', config.POINTS_PER_SESSION)
    
    result = player.complete_session(session_data, points)
    
    # Получаем обновленную информацию о квартале
    district_key = session_data.get('district')
    district_data = player.get_district(district_key) if district_key else None
    district_visual = game_engine.City.get_visual_state(district_data) if district_data else {}
    
    return jsonify({
        'success': True,
        'points_earned': result['points'],
        'total_points': result['total_points'],
        'district_level': result['district_level'],
        'district_visual': district_visual,
        'unlocked_districts': [
            key for key, dist in player.data.get('districts', {}).items()
            if dist.get('unlocked', False)
        ],
        'progress': build_progress_payload(player)
    })


@app.route('/api/save', methods=['POST'])
def save_game():
    """Сохранение игры"""
    player = get_player()
    success = player.storage.save_player(player.data)
    
    return jsonify({
        'success': success,
        'message': 'Игра сохранена' if success else 'Ошибка сохранения'
    })


@app.route('/api/history', methods=['GET'])
def get_history():
    """Получает историю сессий"""
    player = get_player()
    limit = request.args.get('limit', 10, type=int)
    
    history = player.get_session_history(limit)
    memory = player.get_agent_memory(limit)
    
    return jsonify({
        'success': True,
        'sessions': history,
        'agent_memory': memory
    })


@app.route('/api/ritual/add', methods=['POST'])
def add_ritual():
    """Добавляет ритуал"""
    player = get_player()
    
    data = request.get_json()
    ritual = {
        'name': data.get('name'),
        'description': data.get('description'),
        'district': data.get('district')
    }
    
    success = player.add_ritual(ritual)
    
    return jsonify({
        'success': success,
        'ritual': ritual
    })


# === НОВЫЕ API ДЛЯ РАСШИРЕННЫХ МЕХАНИК ===

@app.route('/api/tree/start', methods=['GET'])
def start_tree():
    """Начинает бинарное дерево вопросов"""
    tree_id = request.args.get('tree_id')
    district = request.args.get('district')
    
    root = trees_manager.get_root_question(tree_id)
    
    if root:
        return jsonify({
            'success': True,
            'root': root,
            'tree_id': tree_id
        })
    
    return jsonify({'success': False, 'error': 'Дерево не найдено'}), 404


@app.route('/api/tree/traverse', methods=['POST'])
def traverse_tree():
    """Обходит дерево на основе ответа"""
    data = request.get_json()
    tree_id = data.get('tree_id')
    node_id = data.get('node_id')
    answer = data.get('answer')
    
    next_node = trees_manager.traverse(tree_id, node_id, answer)
    
    if next_node:
        if next_node.get('type') == 'task_trigger':
            return jsonify({
                'success': True,
                'task_triggered': True,
                'task': next_node
            })
        elif next_node.get('type') == 'end':
            return jsonify({
                'success': True,
                'completed': True
            })
        else:
            return jsonify({
                'success': True,
                'next_node': next_node
            })
    
    return jsonify({'success': False, 'error': 'Узел не найден'}), 404


@app.route('/api/task/complete', methods=['POST'])
def complete_task():
    """Завершает задание"""
    player = get_player()
    data = request.get_json()
    
    task_data = data.get('task')
    result = data.get('result')
    
    player.data.setdefault('actions_history', {})
    player.data.setdefault('completed_levels', [])
    
    # Фиксируем выполнение задачи/микрошагов для разблокировок карт
    task_key = (
        (task_data or {}).get('action_key') or
        (task_data or {}).get('task_type') or
        (task_data or {}).get('type') or
        'task_completed'
    )
    player.data['actions_history'][task_key] = player.data['actions_history'].get(task_key, 0) + 1

    if (task_data or {}).get('type') == 'microstep' or (task_data or {}).get('task_type') == 'microstep':
        player.data['actions_history']['microstep'] = player.data['actions_history'].get('microstep', 0) + 1

    level_id = (task_data or {}).get('level_id')
    if level_id and level_id not in player.data['completed_levels']:
        player.data['completed_levels'].append(level_id)

    if (task_data or {}).get('act'):
        player.data['acts_completed'] = max(
            player.data.get('acts_completed', 0),
            task_data.get('act')
        )
    
    # Начисляем Effort за выполнение
    effort_earned = 1  # Базовый Effort за микрошаг
    player.data['effort'] = player.data.get('effort', 0) + effort_earned
    
    # Сохраняем
    player.storage.save_player(player.data)
    
    return jsonify({
        'success': True,
        'effort_earned': effort_earned,
        'total_effort': player.data.get('effort', 0),
        'rewards': {
            'stability_points': 5,
            'effort': effort_earned
        },
        'progress': build_progress_payload(player)
    })


@app.route('/api/cards/owned', methods=['GET'])
def get_owned_cards():
    """Получает карты игрока"""
    player = get_player()
    
    owned_ids = player.data.get('owned_cards', [])
    owned_cards = [cards_manager.get_card(cid) for cid in owned_ids]
    owned_cards = [c for c in owned_cards if c]  # Фильтруем None
    
    return jsonify({
        'success': True,
        'cards': owned_cards,
        'equipped': player.data.get('equipped_card'),
        'effort': player.data.get('effort', 0)
    })


@app.route('/api/cards/available', methods=['GET'])
def get_available_cards():
    """Получает доступные для открытия карты"""
    player = get_player()
    
    available = cards_manager.get_available_cards(player.data)
    
    return jsonify({
        'success': True,
        'cards': available,
        'effort': player.data.get('effort', 0)
    })


@app.route('/api/cards/unlock', methods=['POST'])
def unlock_card():
    """Открывает карту за Effort"""
    player = get_player()
    data = request.get_json()
    card_id = data.get('card_id')
    
    result = cards_manager.unlock_card(card_id, player.data)
    
    if result.get('success'):
        player.storage.save_player(player.data)
    
    return jsonify(result)


@app.route('/api/cards/equip', methods=['POST'])
def equip_card():
    """Экипирует карту"""
    player = get_player()
    data = request.get_json()
    card_id = data.get('card_id')
    
    result = cards_manager.equip_card(card_id, player.data)
    
    if result.get('success'):
        player.storage.save_player(player.data)
        card = cards_manager.get_card(card_id)
        result['card_name'] = card.get('name') if card else ''
    
    return jsonify(result)


@app.route('/api/cards/activate', methods=['POST'])
def activate_card():
    """Активирует экипированную карту"""
    player = get_player()
    data = request.get_json()
    card_id = data.get('card_id')
    
    result = cards_manager.activate_card(card_id, player.data)
    
    if result.get('success'):
        player.storage.save_player(player.data)
    
    return jsonify(result)


@app.route('/api/boss/check', methods=['GET'])
def check_boss():
    """Проверяет появление босса"""
    player = get_player()
    
    boss = bosses_manager.check_boss_spawn(player.data)
    
    if boss:
        return jsonify({
            'success': True,
            'boss_spawned': True,
            'boss': boss
        })
    
    return jsonify({
        'success': True,
        'boss_spawned': False
    })


@app.route('/api/boss/defeat', methods=['POST'])
def defeat_boss():
    """Побеждает босса"""
    player = get_player()
    data = request.get_json()
    boss_id = data.get('boss_id')
    
    result = bosses_manager.defeat_boss(boss_id, player.data)
    
    if result.get('success'):
        player.storage.save_player(player.data)
    
    return jsonify(result)


@app.route('/api/guru/ask', methods=['POST'])
def guru_ask():
    """Вопрос в режиме ГУРУ (используется LLM)"""
    player = get_player()
    
    # Проверяем разблокировку
    if not player.data.get('guru_mode_unlocked', False):
        return jsonify({
            'success': False,
            'error': 'Режим ГУРУ ещё не разблокирован'
        }), 403
    
    data = request.get_json()
    question = data.get('question', '')
    
    if not question:
        return jsonify({
            'success': False,
            'error': 'Вопрос не может быть пустым'
        }), 400
    
    # Используем агента для ответа (LLM)
    aira = agent.AgentAira(player)
    
    # Специальный промпт для ГУРУ-режима
    guru_context = {
        'mode': 'guru',
        'no_tasks': True,
        'no_pressure': True,
        'style': 'supportive_wisdom'
    }
    
    response = aira.generate_response(
        question,
        session_context=guru_context
    )
    
    # Сохраняем в память как ГУРУ-вопрос
    player.storage.add_agent_memory(f"[ГУРУ] Вопрос: {question[:100]}... Ответ: {response.get('response', '')[:100]}...")
    
    return jsonify({
        'success': True,
        'response': response.get('response', ''),
        'is_crisis': response.get('is_crisis', False)
    })


if __name__ == '__main__':
    app.run(
        host=config.FLASK_HOST,
        port=config.FLASK_PORT,
        debug=config.FLASK_DEBUG
    )
