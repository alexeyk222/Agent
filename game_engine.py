"""
Игровая логика и механики InnerQuest
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
import storage
import config


class Player:
    """Класс игрока"""
    
    def __init__(self, player_id: str = "default"):
        self.storage = storage.Storage(player_id)
        self.data = self.storage.load_player()
    
    def get_stability_points(self) -> int:
        """Возвращает текущие очки устойчивости"""
        return self.data.get('stability_points', 0)
    
    def add_points(self, points: int) -> bool:
        """Добавляет очки устойчивости"""
        self.data['stability_points'] += points
        return self.storage.save_player(self.data)
    
    def get_district(self, district_key: str) -> Optional[Dict[str, Any]]:
        """Получает информацию о квартале"""
        return self.data.get('districts', {}).get(district_key)
    
    def can_access_district(self, district_key: str) -> bool:
        """Проверяет доступность квартала"""
        district = self.get_district(district_key)
        if district:
            return district.get('unlocked', False)
        return False
    
    def level_up_district(self, district_key: str) -> bool:
        """Повышает уровень квартала"""
        if self.storage.level_up_district(district_key):
            self.data = self.storage.load_player()
            return True
        return False
    
    def unlock_district(self, district_key: str) -> bool:
        """Разблокирует квартал"""
        if self.storage.unlock_district(district_key):
            self.data = self.storage.load_player()
            return True
        return False
    
    def check_unlocks(self):
        """Проверяет и разблокирует новые кварталы"""
        points = self.get_stability_points()
        
        # Разблокировка Форума при достижении порога
        if points >= config.UNLOCK_THRESHOLD:
            forum = self.get_district('forum')
            if forum and not forum.get('unlocked', False):
                self.unlock_district('forum')
    
    def can_start_session(self) -> Tuple[bool, Optional[str]]:
        """
        Проверяет возможность начала новой сессии
        
        Returns:
            (can_start, error_message)
        """
        last_session = self.data.get('last_session_time')
        
        if not last_session:
            return True, None
        
        try:
            last_time = datetime.fromisoformat(last_session)
            now = datetime.now()
            time_diff = now - last_time
            
            if time_diff < timedelta(hours=config.SESSION_COOLDOWN_HOURS):
                remaining = timedelta(hours=config.SESSION_COOLDOWN_HOURS) - time_diff
                hours = int(remaining.total_seconds() // 3600)
                minutes = int((remaining.total_seconds() % 3600) // 60)
                return False, f"Следующая сессия доступна через {hours}ч {minutes}м"
        except (ValueError, TypeError):
            # Если формат времени некорректный, разрешаем сессию
            return True, None
        
        return True, None
    
    def start_session(self, district_key: str, emotion: str, intensity: int) -> Dict[str, Any]:
        """Начинает новую игровую сессию"""
        can_start, error = self.can_start_session()
        if not can_start:
            return {'success': False, 'error': error}

        # Подготавливаем счётчики прогресса
        self.data.setdefault('district_sessions', {})
        self.data.setdefault('actions_history', {})
        self.data['last_session_district'] = district_key
        
        session_data = {
            'district': district_key,
            'emotion': emotion,
            'intensity': intensity,
            'started_at': datetime.now().isoformat(),
            'completed': False
        }
        
        self.data['last_session_time'] = datetime.now().isoformat()
        self.storage.save_player(self.data)
        
        return {'success': True, 'session': session_data}
    
    def complete_session(self, session_data: Dict[str, Any], points: int = None) -> Dict[str, Any]:
        """Завершает сессию и начисляет награды"""
        if points is None:
            points = config.POINTS_PER_SESSION

        # Загружаем актуальные данные, чтобы не потерять историю при нескольких сохранениях
        player_data = self.storage.load_player()
        player_data.setdefault('district_sessions', {})
        player_data.setdefault('actions_history', {})
        player_data.setdefault('completed_levels', [])

        session_data['completed'] = True
        session_data['completed_at'] = datetime.now().isoformat()
        session_data['points_earned'] = points

        # Добавляем сессию в историю
        session_record = dict(session_data)
        session_record['timestamp'] = datetime.now().isoformat()
        history = player_data.get('session_history', [])
        history.append(session_record)
        if len(history) > 50:
            history = history[-50:]
        player_data['session_history'] = history

        # Начисляем очки устойчивости
        player_data['stability_points'] = player_data.get('stability_points', 0) + points

        # Фиксируем прогресс по кварталу
        district_key = session_data.get('district')
        if district_key:
            district_sessions = player_data['district_sessions']
            district_sessions[district_key] = district_sessions.get(district_key, 0) + 1
            player_data['last_session_district'] = district_key

            district_info = player_data.get('districts', {}).get(district_key)
            if district_info is not None:
                district_info['sessions_count'] = district_info.get('sessions_count', 0) + 1
                district_info['level'] = district_info.get('level', 0) + 1

        # Отмечаем завершённые уровни и акты
        level_id = session_data.get('level_id')
        if level_id and level_id not in player_data['completed_levels']:
            player_data['completed_levels'].append(level_id)

        if session_data.get('act'):
            player_data['acts_completed'] = max(
                player_data.get('acts_completed', 0),
                session_data['act']
            )

        # Сохраняем обновленные данные
        self.data = player_data
        self.storage.save_player(self.data)

        # Проверяем разблокировки после обновлений
        self.check_unlocks()

        # Обновляем данные после возможной разблокировки
        self.data = self.storage.load_player()

        return {
            'success': True,
            'points': points,
            'total_points': self.get_stability_points(),
            'district_level': self.get_district(district_key).get('level', 0) if district_key else 0
        }
    
    def get_session_history(self, limit: int = 10) -> list:
        """Возвращает историю сессий"""
        history = self.data.get('session_history', [])
        return history[-limit:] if limit else history
    
    def get_agent_memory(self, limit: int = 20) -> list:
        """Возвращает память агента"""
        memory = self.data.get('agent_memory', [])
        return memory[-limit:] if limit else memory
    
    def add_ritual(self, ritual: Dict[str, Any]) -> bool:
        """Добавляет ритуал в список"""
        if 'rituals' not in self.data:
            self.data['rituals'] = []
        
        ritual['created_at'] = datetime.now().isoformat()
        self.data['rituals'].append(ritual)
        return self.storage.save_player(self.data)
    
    def add_goal(self, goal: Dict[str, Any]) -> bool:
        """Добавляет цель в список"""
        if 'goals' not in self.data:
            self.data['goals'] = []
        
        goal['created_at'] = datetime.now().isoformat()
        goal['completed'] = False
        self.data['goals'].append(goal)
        return self.storage.save_player(self.data)


class City:
    """Класс для управления состоянием города"""
    
    DISTRICT_THEMES = {
        'oasis': {
            'name': 'Оазис',
            'color': '#4CAF50',
            'description': 'Здоровье и благополучие'
        },
        'forum': {
            'name': 'Форум',
            'color': '#FF9800',
            'description': 'Отношения и связи'
        },
        'citadel': {
            'name': 'Цитадель',
            'color': '#2196F3',
            'description': 'Работа и учеба'
        },
        'arsenal': {
            'name': 'Арсенал',
            'color': '#9C27B0',
            'description': 'Финансы и ресурсы'
        },
        'garden': {
            'name': 'Сад',
            'color': '#F44336',
            'description': 'Личное развитие'
        }
    }
    
    @staticmethod
    def get_district_info(district_key: str) -> Optional[Dict[str, Any]]:
        """Получает информацию о квартале"""
        return City.DISTRICT_THEMES.get(district_key)
    
    @staticmethod
    def get_visual_state(district_data: Dict[str, Any]) -> Dict[str, Any]:
        """Генерирует визуальное состояние квартала"""
        level = district_data.get('level', 0)
        unlocked = district_data.get('unlocked', False)
        
        # Вычисляем яркость и количество огней в окнах
        brightness = min(0.3 + (level * 0.1), 1.0) if unlocked else 0.1
        lights_count = level * 2
        
        return {
            'brightness': brightness,
            'lights_count': lights_count,
            'fog_density': max(0.8 - (level * 0.1), 0.2),
            'unlocked': unlocked
        }
