"""
Система карточек: открытие, экипировка, активация
"""
import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime


class CardsManager:
    """Менеджер системы карточек"""
    
    def __init__(self, cards_db_path: str = "scenarios/cards_database.json"):
        self.cards_db_path = cards_db_path
        self.cards_db = {}
        self.load_cards_database()
    
    def load_cards_database(self):
        """Загружает базу данных карт"""
        if os.path.exists(self.cards_db_path):
            with open(self.cards_db_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.cards_db = {card['card_id']: card for card in data.get('cards', [])}
                self.rarity_costs = data.get('rarity_costs', {})
    
    def get_card(self, card_id: str) -> Optional[Dict[str, Any]]:
        """Получает карту по ID"""
        return self.cards_db.get(card_id)
    
    def check_unlock_conditions(self, card_id: str, player_data: Dict[str, Any]) -> bool:
        """Проверяет условия открытия карты"""
        card = self.get_card(card_id)
        if not card:
            return False

        unlock = card.get('unlock_condition', {})
        return self._check_condition(unlock, player_data)

    def _check_condition(self, condition: Dict[str, Any], player_data: Dict[str, Any]) -> bool:
        """Проверяет конкретное условие (рекурсивно для combined)."""
        if not condition:
            return True

        unlock_type = condition.get('type')

        if unlock_type == 'action':
            # Проверяем количество действий
            actions = player_data.get('actions_history', {})
            action_name = condition.get('action')
            required_count = condition.get('count', 1)
            return actions.get(action_name, 0) >= required_count

        if unlock_type == 'sessions_in_district':
            # Проверяем количество сессий в квартале
            district = condition.get('district')
            required = condition.get('count')
            sessions = player_data.get('district_sessions', {})
            return sessions.get(district, 0) >= required

        if unlock_type == 'complete_level':
            # Проверяем завершение уровня
            level_id = condition.get('level')
            completed = player_data.get('completed_levels', [])
            return level_id in completed

        if unlock_type == 'stability_points':
            # Проверяем очки устойчивости
            required = condition.get('amount')
            return player_data.get('stability_points', 0) >= required

        if unlock_type == 'combined':
            # Комбинированные условия проверяются последовательно
            conditions = condition.get('conditions', [])
            return all(self._check_condition(cond, player_data) for cond in conditions)

        if unlock_type == 'contract_completion':
            # Завершение контракта
            contract_id = condition.get('contract')
            completed = player_data.get('completed_contracts', [])
            return contract_id in completed

        # Если тип условия не задан, считаем условие выполненным, чтобы не блокировать карту
        return True
    
    def calculate_effort_cost(self, card_id: str, upgrade_level: int = 0) -> int:
        """Вычисляет стоимость карты в Effort"""
        card = self.get_card(card_id)
        if not card:
            return 0
        
        base_cost = card.get('effort_cost', 1)
        
        # Увеличение стоимости при апгрейде
        if upgrade_level > 0:
            base_cost = int(base_cost * (1 + 0.5 * upgrade_level))
        
        return base_cost
    
    def get_available_cards(self, player_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Получает список доступных для открытия карт"""
        available = []
        owned_cards = player_data.get('owned_cards', [])
        
        for card_id, card in self.cards_db.items():
            if card_id not in owned_cards:
                if self.check_unlock_conditions(card_id, player_data):
                    available.append(card)
        
        return available
    
    def unlock_card(self, card_id: str, player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Открывает карту за Effort"""
        card = self.get_card(card_id)
        if not card:
            return {'success': False, 'error': 'Карта не найдена'}
        
        # Проверяем условия
        if not self.check_unlock_conditions(card_id, player_data):
            return {'success': False, 'error': 'Условия открытия не выполнены'}
        
        # Проверяем Effort
        cost = self.calculate_effort_cost(card_id)
        current_effort = player_data.get('effort', 0)
        
        if current_effort < cost:
            return {'success': False, 'error': f'Недостаточно Effort (нужно {cost}, есть {current_effort})'}
        
        # Открываем карту
        if 'owned_cards' not in player_data:
            player_data['owned_cards'] = []
        
        player_data['owned_cards'].append(card_id)
        player_data['effort'] -= cost
        
        return {
            'success': True,
            'card': card,
            'effort_spent': cost,
            'effort_remaining': player_data['effort']
        }
    
    def equip_card(self, card_id: str, player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Экипирует карту в активный слот"""
        if card_id not in player_data.get('owned_cards', []):
            return {'success': False, 'error': 'Карта не в собственности'}
        
        # Снимаем текущую экипированную
        if 'equipped_card' in player_data and player_data['equipped_card']:
            self.unequip_card(player_data)
        
        player_data['equipped_card'] = card_id
        player_data['equipped_at'] = datetime.now().isoformat()
        
        return {'success': True, 'equipped': card_id}
    
    def unequip_card(self, player_data: Dict[str, Any]):
        """Снимает экипированную карту"""
        player_data['equipped_card'] = None
        player_data['equipped_at'] = None
    
    def activate_card(self, card_id: str, player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Активирует карту (использует)"""
        card = self.get_card(card_id)
        if not card:
            return {'success': False, 'error': 'Карта не найдена'}
        
        if card_id != player_data.get('equipped_card'):
            return {'success': False, 'error': 'Карта не экипирована'}
        
        card_type = card['type']
        effect = card.get('effect', {})
        
        result = {'success': True, 'effects': []}
        
        # Применяем эффекты
        if 'stability_points' in effect:
            bonus = effect['stability_points']
            player_data['stability_points'] = player_data.get('stability_points', 0) + bonus
            result['effects'].append({'type': 'stability', 'value': bonus})
        
        if 'fog_reduction' in effect:
            fog_data = effect['fog_reduction']
            district = fog_data.get('district')
            amount = fog_data.get('amount', 1)
            result['effects'].append({'type': 'fog_reduction', 'district': district, 'amount': amount})
        
        # Для Skill карт — одноразовое использование
        if card_type == 'skill':
            player_data['owned_cards'].remove(card_id)
            player_data['equipped_card'] = None
            result['consumed'] = True
        
        # Для Relic — уменьшаем счётчик длительности
        if card_type == 'relic':
            if 'relic_uses' not in player_data:
                player_data['relic_uses'] = {}
            
            duration = card.get('duration_sessions', 3)
            if card_id not in player_data['relic_uses']:
                player_data['relic_uses'][card_id] = duration
            
            player_data['relic_uses'][card_id] -= 1
            
            if player_data['relic_uses'][card_id] <= 0:
                player_data['owned_cards'].remove(card_id)
                del player_data['relic_uses'][card_id]
                result['expired'] = True
        
        return result
    
    def add_effort(self, player_data: Dict[str, Any], amount: int):
        """Добавляет Effort"""
        if 'effort' not in player_data:
            player_data['effort'] = 0
        player_data['effort'] += amount
    
    def calculate_session_effort(self, session_data: Dict[str, Any], player_data: Dict[str, Any]) -> int:
        """Вычисляет Effort за сессию"""
        base_effort = 2  # За завершённую сессию
        
        # Бонус за микрошаги
        microsteps = session_data.get('microsteps_count', 0)
        microstep_effort = microsteps * 1
        
        # Бонус за стрик (с капом)
        streak = player_data.get('session_streak', 0)
        streak_bonus = min(1 if streak >= 2 else 0, 2)  # Максимум +2
        
        total = base_effort + microstep_effort + streak_bonus
        return total
