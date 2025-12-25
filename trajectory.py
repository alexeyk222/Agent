"""
Движок траекторий: связывает сценарные уровни, ветвления, задания, карточки и боссов
"""
from typing import Dict, Any, Optional, List
import copy


class TrajectoryEngine:
    """Оркестратор игрового шага: вопросы → задания → награды/карты → боссов"""

    def __init__(self, scenarios_manager, trees_manager, cards_manager, bosses_manager):
        self.scenarios_manager = scenarios_manager
        self.trees_manager = trees_manager
        self.cards_manager = cards_manager
        self.bosses_manager = bosses_manager

    def start_level(self, player, district: str, path_id: Optional[str] = None) -> Dict[str, Any]:
        """Запускает траекторию для текущей сессии в квартале"""
        sessions_done = player.data.get('district_sessions', {}).get(district, 0)
        level = self.scenarios_manager.get_current_level(district, sessions_done + 1)

        if not level:
            return {'success': False, 'error': 'Нет активных уровней'}

        path = self._resolve_path(level, player, path_id)
        tree_id = (path or {}).get('binary_tree_id') or level.get('binary_tree_id')
        root_node = self.trees_manager.get_root_question(tree_id) if tree_id else None

        state = {
            'level_id': level.get('level_id'),
            'district': district,
            'tree_id': tree_id,
            'node_id': 'root',
            'path_id': (path or {}).get('path_id')
        }
        player.data['trajectory_state'] = state
        player.storage.save_player(player.data)

        return {
            'success': True,
            'level': level,
            'path': path,
            'next_node': root_node,
            'planned_cards': self._planned_cards(level, path),
            'boss_hint': self.bosses_manager.get_district_boss(district)
        }

    def choose_path(self, player, level_id: str, path_id: str) -> Dict[str, Any]:
        """Меняет выбранный путь для форка уровня"""
        level = self.scenarios_manager.get_level_by_id(level_id)
        if not level or not level.get('fork'):
            return {'success': False, 'error': 'Уровень не поддерживает выбор пути'}

        path = next((p for p in level.get('paths', []) if p.get('path_id') == path_id), None)
        if not path:
            return {'success': False, 'error': 'Путь не найден'}

        player.data.setdefault('trajectory_paths', {})
        player.data['trajectory_paths'][level_id] = path_id
        if player.data.get('trajectory_state', {}).get('level_id') == level_id:
            player.data['trajectory_state']['path_id'] = path_id
            player.data['trajectory_state']['tree_id'] = path.get('binary_tree_id') or level.get('binary_tree_id')
            player.data['trajectory_state']['node_id'] = 'root'
        player.storage.save_player(player.data)

        return {'success': True, 'path': path}

    def advance_node(self, player, answer: Any) -> Dict[str, Any]:
        """Двигается по дереву вопросов и возвращает следующий шаг"""
        state = player.data.get('trajectory_state') or {}
        tree_id = state.get('tree_id')
        node_id = state.get('node_id', 'root')

        if not tree_id:
            return {'success': False, 'error': 'Траектория не запущена'}

        next_node = self.trees_manager.traverse(tree_id, node_id, answer)
        if not next_node:
            return {'success': False, 'error': 'Узел не найден или ответ не подходит'}

        response: Dict[str, Any] = {'success': True}
        state['node_id'] = next_node.get('node_id', node_id)

        if next_node.get('type') == 'task_trigger':
            response['task_triggered'] = True
            response['task'] = self._build_task_payload(state.get('level_id'), next_node)
        elif next_node.get('final'):
            response['completed'] = True
        else:
            response['next_node'] = next_node

        response['boss_state'] = self._evaluate_bosses(player)
        player.data['trajectory_state'] = state
        player.storage.save_player(player.data)
        return response

    def handle_task_completion(self, player, task_data: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
        """Привязывает завершение задания к уровню, картам и боссам"""
        level_id = (task_data or {}).get('level_id') or player.data.get('trajectory_state', {}).get('level_id')
        level = self.scenarios_manager.get_level_by_id(level_id) if level_id else None
        completion_valid = level is None or self.scenarios_manager.check_level_completion(level, result or {})

        rewards_payload = {}
        if completion_valid and level:
            rewards_payload = self._apply_level_rewards(player, level)
            path_reward = self._apply_path_reward(player, level)
            if path_reward:
                rewards_payload.setdefault('cards', []).append(path_reward)

        boss_updates = self._evaluate_bosses(player, check_defeat=True)
        player.storage.save_player(player.data)

        return {
            'level_completed': completion_valid and bool(level),
            'rewards': rewards_payload,
            'boss_state': boss_updates
        }

    def _resolve_path(self, level: Dict[str, Any], player, path_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if not level.get('fork'):
            return None

        player.data.setdefault('trajectory_paths', {})
        chosen_id = path_id or player.data['trajectory_paths'].get(level.get('level_id'))
        paths = level.get('paths', [])

        chosen = next((p for p in paths if p.get('path_id') == chosen_id), None)
        if not chosen and paths:
            chosen = paths[0]
            player.data['trajectory_paths'][level.get('level_id')] = chosen.get('path_id')

        return chosen

    def _planned_cards(self, level: Dict[str, Any], path: Optional[Dict[str, Any]]) -> List[str]:
        rewards = level.get('rewards', {})
        cards = list(rewards.get('cards', []))
        if path and path.get('reward_card'):
            cards.append(path['reward_card'])
        return cards

    def _build_task_payload(self, level_id: Optional[str], tree_task: Dict[str, Any]) -> Dict[str, Any]:
        """Объединяет данные о задаче уровня и триггера из дерева"""
        task_payload = copy.deepcopy(tree_task)
        if level_id:
            level = self.scenarios_manager.get_level_by_id(level_id)
            if level:
                level_task = copy.deepcopy(level.get('task', {}))
                # Приоритет тексту и подсказкам из дерева, но сохраняем требования уровня
                level_task.update({
                    'tree_prompt': tree_task.get('text'),
                    'tree_guidance': tree_task.get('guidance')
                })
                level_task.setdefault('level_id', level_id)
                task_payload = level_task
        task_payload.setdefault('level_id', level_id)
        return task_payload

    def _apply_level_rewards(self, player, level: Dict[str, Any]) -> Dict[str, Any]:
        rewards = self.scenarios_manager.get_rewards(level)
        granted_cards: List[str] = []

        if rewards.get('stability_points'):
            player.data['stability_points'] = player.data.get('stability_points', 0) + rewards['stability_points']
        if rewards.get('effort'):
            player.data['effort'] = player.data.get('effort', 0) + rewards['effort']
        for card_id in rewards.get('cards', []):
            if card_id not in player.data.get('owned_cards', []):
                player.data.setdefault('owned_cards', []).append(card_id)
                granted_cards.append(card_id)

        payload: Dict[str, Any] = {}
        if rewards.get('stability_points') or rewards.get('effort'):
            payload['stats'] = {
                'stability_points': rewards.get('stability_points', 0),
                'effort': rewards.get('effort', 0)
            }
        if granted_cards:
            payload['cards'] = granted_cards
        return payload

    def _apply_path_reward(self, player, level: Dict[str, Any]) -> Optional[str]:
        path_id = player.data.get('trajectory_paths', {}).get(level.get('level_id'))
        if not path_id:
            return None
        path = next((p for p in level.get('paths', []) if p.get('path_id') == path_id), None)
        reward_card = (path or {}).get('reward_card')
        if reward_card and reward_card not in player.data.get('owned_cards', []):
            player.data.setdefault('owned_cards', []).append(reward_card)
            return reward_card
        return None

    def _evaluate_bosses(self, player, check_defeat: bool = False) -> Dict[str, Any]:
        """Проверяет появление/победу над боссами"""
        updates: Dict[str, Any] = {'spawned': None, 'defeated': []}

        boss_to_spawn = self.bosses_manager.check_boss_spawn(player.data)
        if boss_to_spawn:
            spawn_result = self.bosses_manager.spawn_boss(boss_to_spawn['boss_id'], player.data)
            updates['spawned'] = spawn_result

        if check_defeat:
            active = list(player.data.get('active_bosses', []))
            for boss_id in active:
                if self.bosses_manager.check_defeat_conditions(boss_id, player.data):
                    defeat_result = self.bosses_manager.defeat_boss(boss_id, player.data)
                    updates['defeated'].append(defeat_result)

        # Убираем пустые ключи для лаконичного ответа
        if not updates['spawned']:
            updates.pop('spawned')
        if not updates['defeated']:
            updates.pop('defeated')
        return updates
