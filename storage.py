"""
Система хранения данных игрока в JSON
"""
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
import config


class Storage:
    """Класс для работы с сохранениями игрока"""
    
    def __init__(self, player_id: str = "default"):
        self.player_id = player_id
        self.save_file = os.path.join(
            config.SAVES_DIR, 
            f"{player_id}.json"
        )
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Создает необходимые директории если их нет"""
        os.makedirs(config.SAVES_DIR, exist_ok=True)
    
    def load_player(self) -> Dict[str, Any]:
        """Загружает данные игрока из JSON"""
        if not os.path.exists(self.save_file):
            return self._create_default_player()
        
        try:
            with open(self.save_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Обновляем структуру если нужно
                return self._migrate_player_data(data)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Ошибка загрузки сохранения: {e}")
            return self._create_default_player()
    
    def save_player(self, player_data: Dict[str, Any]) -> bool:
        """Сохраняет данные игрока в JSON"""
        try:
            # Добавляем метаданные
            player_data['last_save'] = datetime.now().isoformat()
            player_data['player_id'] = self.player_id
            
            with open(self.save_file, 'w', encoding='utf-8') as f:
                json.dump(player_data, f, ensure_ascii=False, indent=2)
            return True
        except IOError as e:
            print(f"Ошибка сохранения: {e}")
            return False
    
    def _create_default_player(self) -> Dict[str, Any]:
        """Создает структуру нового игрока"""
        return {
            'player_id': self.player_id,
            'created_at': datetime.now().isoformat(),
            'stability_points': 0,
            'effort': 0,
            'session_streak': 0,
            'districts': {
                'oasis': {'level': 0, 'unlocked': True, 'name': 'Оазис', 'theme': 'health', 'sessions_count': 0},
                'forum': {'level': 0, 'unlocked': False, 'name': 'Форум', 'theme': 'relationships', 'sessions_count': 0},
                'citadel': {'level': 0, 'unlocked': True, 'name': 'Цитадель', 'theme': 'work', 'sessions_count': 0},
                'arsenal': {'level': 0, 'unlocked': True, 'name': 'Арсенал', 'theme': 'finance', 'sessions_count': 0},
                'garden': {'level': 0, 'unlocked': True, 'name': 'Сад', 'theme': 'personal', 'sessions_count': 0}
            },
            'session_history': [],
            'agent_memory': [],
            'rituals': [],
            'goals': [],
            'last_session_time': None,
            'achievements': [],
            'owned_cards': [],
            'equipped_card': None,
            'completed_levels': [],
            'active_bosses': [],
            'actions_history': {},
            'district_sessions': {},
            'acts_completed': 0,
            'guru_mode_unlocked': False
        }
    
    def _migrate_player_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Миграция данных при обновлении структуры"""
        default = self._create_default_player()
        
        # Объединяем существующие данные с дефолтными
        for key in default:
            if key not in data:
                data[key] = default[key]
        
        return data
    
    def add_session(self, session_data: Dict[str, Any]) -> bool:
        """Добавляет сессию в историю"""
        player = self.load_player()
        session_data['timestamp'] = datetime.now().isoformat()
        player['session_history'].append(session_data)
        
        # Ограничиваем историю последними 50 сессиями
        if len(player['session_history']) > 50:
            player['session_history'] = player['session_history'][-50:]
        
        return self.save_player(player)
    
    def add_agent_memory(self, memory: str) -> bool:
        """Добавляет запись в память агента"""
        player = self.load_player()
        player['agent_memory'].append({
            'text': memory,
            'timestamp': datetime.now().isoformat()
        })
        
        # Ограничиваем память последними 100 записями
        if len(player['agent_memory']) > 100:
            player['agent_memory'] = player['agent_memory'][-100:]
        
        return self.save_player(player)
    
    def update_points(self, points: int) -> bool:
        """Обновляет очки устойчивости"""
        player = self.load_player()
        player['stability_points'] += points
        return self.save_player(player)
    
    def unlock_district(self, district_key: str) -> bool:
        """Разблокирует квартал"""
        player = self.load_player()
        if district_key in player['districts']:
            player['districts'][district_key]['unlocked'] = True
            return self.save_player(player)
        return False
    
    def level_up_district(self, district_key: str) -> bool:
        """Повышает уровень квартала"""
        player = self.load_player()
        if district_key in player['districts']:
            player['districts'][district_key]['level'] += 1
            return self.save_player(player)
        return False

