"""
Механики боссов
"""
import json
import os
from typing import Dict, Any, Optional, List


class BossesManager:
    """Менеджер боссов"""
    
    def __init__(self, bosses_path: str = "scenarios/bosses.json"):
        self.bosses_path = bosses_path
        self.bosses = {}
        self.load_bosses()
    
    def load_bosses(self):
        """Загружает данные о боссах"""
        if os.path.exists(self.bosses_path):
            with open(self.bosses_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.bosses = {boss['boss_id']: boss for boss in data.get('bosses', [])}
    
    def check_boss_spawn(self, player_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Проверяет, должен ли появиться босс"""
        active_bosses = player_data.get('active_bosses', [])
        
        for boss_id, boss in self.bosses.items():
            # Пропускаем уже активных боссов
            if boss_id in active_bosses:
                continue
            
            trigger = boss.get('trigger', {})
            trigger_type = trigger.get('type')
            
            # Проверяем условие появления
            if trigger_type == 'pattern':
                condition = trigger.get('condition')
                threshold = trigger.get('threshold', 3)
                
                if condition == 'sessions_without_rest':
                    count = player_data.get('sessions_without_rest', 0)
                    if count >= threshold:
                        return boss
                
                elif condition == 'tasks_not_done_perfectionism':
                    count = player_data.get('perfectionism_blocks', 0)
                    if count >= threshold:
                        return boss
                
                elif condition == 'sessions_without_numbers':
                    count = player_data.get('sessions_without_concrete_numbers', 0)
                    if count >= threshold:
                        return boss
                
                elif condition == 'comparison_thoughts':
                    count = player_data.get('comparison_thoughts_count', 0)
                    if count >= threshold:
                        return boss
            
            elif trigger_type == 'milestone':
                condition = trigger.get('condition')
                
                if condition == 'all_districts_level_3_plus':
                    districts = player_data.get('districts', {})
                    all_high_level = all(
                        dist.get('level', 0) >= 3 
                        for dist in districts.values()
                    )
                    acts_done = trigger.get('acts_completed', 0)
                    if all_high_level and player_data.get('acts_completed', 0) >= acts_done:
                        return boss
        
        return None
    
    def spawn_boss(self, boss_id: str, player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Активирует босса"""
        boss = self.bosses.get(boss_id)
        if not boss:
            return {'success': False, 'error': 'Босс не найден'}
        
        if 'active_bosses' not in player_data:
            player_data['active_bosses'] = []
        
        player_data['active_bosses'].append(boss_id)
        
        # Применяем эффекты босса
        self.apply_boss_effects(boss, player_data)
        
        return {
            'success': True,
            'boss': boss,
            'message': boss.get('dialogue', {}).get('appearance', '')
        }
    
    def apply_boss_effects(self, boss: Dict[str, Any], player_data: Dict[str, Any]):
        """Применяет эффекты босса"""
        effects = boss.get('effects', {})
        
        # Штраф к наградам
        if 'penalty' in effects:
            if 'boss_penalties' not in player_data:
                player_data['boss_penalties'] = {}
            player_data['boss_penalties'][boss['boss_id']] = effects['penalty']
        
        # Увеличение тумана
        if 'fog_increase' in effects:
            for district_key in player_data.get('districts', {}).keys():
                if district_key in effects.get('districts_affected', [district_key]):
                    # Увеличиваем туман (уменьшаем brightness)
                    player_data['districts'][district_key]['fog'] = effects['fog_increase']
        
        # Блокировки
        if 'blocks' in effects:
            if 'blocked_options' not in player_data:
                player_data['blocked_options'] = []
            player_data['blocked_options'].extend(effects['blocks'])
    
    def check_defeat_conditions(self, boss_id: str, player_data: Dict[str, Any]) -> bool:
        """Проверяет условия победы над боссом"""
        boss = self.bosses.get(boss_id)
        if not boss:
            return False
        
        defeat_conditions = boss.get('defeat_conditions', [])
        
        # Проверяем каждое условие (достаточно одного выполненного)
        for condition in defeat_conditions:
            cond_type = condition.get('type')
            
            if cond_type == 'series':
                action = condition.get('action')
                required_count = condition.get('count')
                actual_count = player_data.get(f'{action}_series', 0)
                if actual_count >= required_count:
                    return True
            
            elif cond_type == 'card':
                card_id = condition.get('card_id')
                # Проверяем использование карты
                if player_data.get('last_card_used') == card_id:
                    return True
            
            elif cond_type == 'full_session':
                # Полная сессия в определённом квартале
                district = condition.get('district')
                if player_data.get('last_session_district') == district:
                    return True
        
        return False
    
    def defeat_boss(self, boss_id: str, player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Побеждает босса"""
        boss = self.bosses.get(boss_id)
        if not boss:
            return {'success': False, 'error': 'Босс не найден'}
        
        # Удаляем из активных
        if boss_id in player_data.get('active_bosses', []):
            player_data['active_bosses'].remove(boss_id)
        
        # Убираем эффекты
        if 'boss_penalties' in player_data and boss_id in player_data['boss_penalties']:
            del player_data['boss_penalties'][boss_id]
        
        # Убираем блокировки
        if 'blocked_options' in player_data:
            player_data['blocked_options'] = []
        
        # Награда за победу
        reward = {
            'stability_points': 20,
            'effort': 5,
            'achievement': f'defeated_{boss_id}'
        }
        
        # Разблокируем режим ГУРУ если это финальный босс
        if boss.get('finale'):
            player_data['guru_mode_unlocked'] = True
        
        return {
            'success': True,
            'boss': boss,
            'message': boss.get('dialogue', {}).get('defeat', ''),
            'rewards': reward
        }

