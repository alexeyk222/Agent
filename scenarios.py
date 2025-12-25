"""
Загрузка и обработка игровых сценариев
"""
import json
import os
from typing import Dict, Any, Optional, List


class ScenariosManager:
    """Менеджер сценариев кварталов"""
    
    def __init__(self, scenarios_dir: str = "scenarios"):
        self.scenarios_dir = scenarios_dir
        self.scenarios = {}
        self.load_all_scenarios()
    
    def load_all_scenarios(self):
        """Загружает все сценарии из JSON"""
        districts = ['oasis', 'citadel', 'arsenal', 'forum', 'garden']
        
        for district in districts:
            filepath = os.path.join(self.scenarios_dir, f"{district}_levels.json")
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    self.scenarios[district] = json.load(f)
    
    def get_current_level(self, district: str, sessions_count: int) -> Optional[Dict[str, Any]]:
        """Получает текущий уровень квартала по количеству сессий"""
        if district not in self.scenarios:
            return None
        
        levels = self.scenarios[district].get('levels', [])
        
        for level in levels:
            min_sessions, max_sessions = level['sessions_required']
            if min_sessions <= sessions_count <= max_sessions:
                return level
        
        # Если больше максимального — возвращаем последний уровень
        if levels and sessions_count > levels[-1]['sessions_required'][1]:
            return levels[-1]
        
        return None
    
    def get_level_by_id(self, level_id: str) -> Optional[Dict[str, Any]]:
        """Получает уровень по ID"""
        for district_data in self.scenarios.values():
            for level in district_data.get('levels', []):
                if level['level_id'] == level_id:
                    return level
        return None
    
    def get_district_philosophy(self, district: str) -> str:
        """Получает философию квартала"""
        if district in self.scenarios:
            return self.scenarios[district].get('philosophy', '')
        return ''
    
    def get_district_boss(self, district: str) -> Optional[Dict[str, Any]]:
        """Получает информацию о боссе квартала"""
        if district in self.scenarios:
            return self.scenarios[district].get('boss')
        return None
    
    def check_level_completion(self, level: Dict[str, Any], task_result: Dict[str, Any]) -> bool:
        """Проверяет выполнение уровня"""
        task_config = level.get('task', {})
        task_type = task_config.get('type')
        
        # Разные валидации для разных типов заданий
        if task_type == 'reflection':
            min_words = task_config.get('min_words', 10)
            text = task_result.get('text', '')
            return len(text.split()) >= min_words
        
        elif task_type == 'timer':
            # Таймер автоматически завершается
            return task_result.get('completed', False)
        
        elif task_type == 'choice':
            # Выбор сделан
            return 'choice' in task_result
        
        elif task_type == 'checklist':
            items = task_result.get('items', [])
            required = task_config.get('items', 1)
            return len(items) >= required
        
        # По умолчанию считаем завершённым
        return True
    
    def get_rewards(self, level: Dict[str, Any]) -> Dict[str, Any]:
        """Получает награды за уровень"""
        return level.get('rewards', {})

