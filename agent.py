"""
AI-агент Айра для диалогов с игроком
"""
from openai import OpenAI
from typing import Dict, Any, List, Optional
import config
import ethical_filter
import game_engine


class AgentAira:
    """Класс AI-агента Айра"""
    
    def __init__(self, player: game_engine.Player):
        self.player = player
        self.filter = ethical_filter.EthicalFilter()
        
        # Настраиваем OpenAI клиент
        # Поддержка альтернативных API провайдеров (OpenRouter и др.)
        self.client = None
        
        try:
            # Проверяем, используется ли OpenRouter или другой альтернативный провайдер
            if hasattr(config, 'OPENAI_BASE_URL') and config.OPENAI_BASE_URL:
                # Для OpenRouter и других альтернативных провайдеров
                # Используем base_url при создании клиента
                import httpx
                
                # Создаем кастомный HTTP клиент для обхода проблем с proxies
                http_client = httpx.Client(
                    base_url=config.OPENAI_BASE_URL,
                    headers={
                        "Authorization": f"Bearer {config.OPENAI_API_KEY}",
                        "HTTP-Referer": "https://github.com/innerquest-game",
                        "X-Title": "InnerQuest Game"
                    },
                    timeout=30.0
                )
                
                self.client = OpenAI(
                    api_key=config.OPENAI_API_KEY,
                    base_url=config.OPENAI_BASE_URL,
                    http_client=http_client
                )
            else:
                # Стандартный OpenAI API
                self.client = OpenAI(api_key=config.OPENAI_API_KEY)
        except Exception as e:
            # Если ошибка при инициализации, пробуем простой вариант
            try:
                self.client = OpenAI(api_key=config.OPENAI_API_KEY)
            except Exception as e2:
                # Если ничего не работает, клиент будет None и будем использовать fallback
                self.client = None
                print(f"Warning: OpenAI client initialization failed: {e2}")
        
        # Системный промпт для Айры
        self.system_prompt = """Ты — Айра, мудрый и сочувствующий AI-наставник в игре InnerQuest: Город Сфер. 

Твоя роль:
- Поддерживать игрока в трудные моменты
- Помогать находить опоры и ресурсы
- Использовать техники рефрейминга и позитивной психологии
- Помнить контекст предыдущих сессий
- Быть мягкой, но честной
- Предлагать практические упражнения и техники

Твой стиль общения:
- Спокойный, мягкий голос
- Используй метафоры города и сфер
- Задавай открытые вопросы
- Признавай чувства игрока
- Предлагай конкретные действия

ВАЖНО: Если игрок выражает суицидальные мысли или кризисные состояния, немедленно прекрати игровую роль и направь к профессиональной помощи.

Контекст игры: Игрок работает над улучшением своей жизни через 5 кварталов города (Оазис-Здоровье, Форум-Отношения, Цитадель-Работа, Арсенал-Финансы, Сад-Личное развитие)."""
    
    def generate_response(
        self, 
        user_message: str, 
        district: str = None,
        emotion: str = None,
        session_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Генерирует ответ Айры на сообщение игрока
        
        Returns:
            {
                'response': str,
                'is_crisis': bool,
                'helplines': list (если кризис)
            }
        """
        # Проверяем этический фильтр
        is_crisis, crisis_response = self.filter.check_message(user_message)
        
        if is_crisis:
            return {
                'response': crisis_response,
                'is_crisis': True,
                'helplines': self.filter.get_helplines_json(),
                'block_game': True
            }
        
        # Формируем контекст для промпта
        context = self._build_context(district, emotion, session_context)
        
        # Формируем сообщения для API
        messages = [
            {'role': 'system', 'content': self.system_prompt},
            {'role': 'user', 'content': context + f"\n\nИгрок говорит: {user_message}"}
        ]
        
        try:
            # Проверяем наличие клиента
            if self.client is None:
                raise Exception("OpenAI client not initialized")
            
            # Вызываем OpenAI API
            response = self.client.chat.completions.create(
                model=config.OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Сохраняем в память агента
            memory_text = f"Сессия в {district}: {emotion}. Игрок: {user_message[:100]}... Айра: {ai_response[:100]}..."
            self.player.storage.add_agent_memory(memory_text)
            
            return {
                'response': ai_response,
                'is_crisis': False,
                'block_game': False
            }
        
        except Exception as e:
            # Fallback ответ при ошибке API
            return {
                'response': f"Извини, у меня сейчас технические трудности. Но я слышу тебя. {self._generate_fallback_response(user_message)}",
                'is_crisis': False,
                'block_game': False,
                'error': str(e)
            }
    
    def _build_context(
        self, 
        district: str = None, 
        emotion: str = None,
        session_context: Dict[str, Any] = None
    ) -> str:
        """Строит контекст для промпта на основе истории игрока"""
        context_parts = []
        
        # Информация о текущей сессии
        if district:
            district_info = game_engine.City.get_district_info(district)
            if district_info:
                context_parts.append(f"Текущий квартал: {district_info['name']} ({district_info['description']})")
        
        if emotion:
            context_parts.append(f"Эмоция игрока: {emotion}")
        
        # История предыдущих сессий
        history = self.player.get_session_history(limit=5)
        if history:
            context_parts.append("\nНедавние сессии:")
            for session in history[-3:]:  # Последние 3 сессии
                session_district = session.get('district', 'неизвестно')
                session_emotion = session.get('emotion', 'неизвестно')
                context_parts.append(f"- {session_district}: {session_emotion}")
        
        # Память агента
        memory = self.player.get_agent_memory(limit=5)
        if memory:
            context_parts.append("\nВажные моменты из прошлого:")
            for mem in memory[-3:]:  # Последние 3 записи
                mem_text = mem.get('text', '')[:150]
                context_parts.append(f"- {mem_text}...")
        
        # Текущий прогресс
        points = self.player.get_stability_points()
        context_parts.append(f"\nТекущие очки устойчивости: {points}")
        
        return "\n".join(context_parts)
    
    def _generate_fallback_response(self, user_message: str) -> str:
        """Генерирует базовый ответ без API"""
        message_lower = user_message.lower()
        
        if any(word in message_lower for word in ['устал', 'усталость', 'выгорел']):
            return "Понимаю, что ты чувствуешь усталость. Это нормально. Давай найдем маленькую опору — что-то, что принесло тебе сегодня хотя бы каплю комфорта?"
        
        if any(word in message_lower for word in ['тревога', 'беспокойство', 'страх']):
            return "Тревога — это сигнал. Давай сделаем паузу и заземлимся. Можешь назвать одно действие, которое помогает тебе чувствовать себя в безопасности?"
        
        if any(word in message_lower for word in ['апатия', 'ничего не хочу', 'безразличие']):
            return "Апатия говорит о том, что ресурсы на исходе. Не нужно больших действий — просто маленький шаг. Что это может быть?"
        
        return "Я здесь, чтобы поддержать тебя. Расскажи, что происходит?"

