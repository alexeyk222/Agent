"""
Конфигурация игры InnerQuest
"""
import os

# OpenAI API ключ
OPENAI_API_KEY = ""

# Флаг использования LLM
LLM_ENABLED = False

# Модель OpenAI для диалогов
# Рекомендуемые модели OpenRouter (бесплатные):
# - "qwen/qwen-2.5-7b-instruct:free" - отличная поддержка русского, быстрая
# - "meta-llama/llama-3.2-3b-instruct:free" - хорошая поддержка русского
# - "google/gemini-flash-1.5:free" - отличное качество, хороший русский
# - "microsoft/phi-3-mini-128k-instruct:free" - быстрая, компактная
# 
# Платные модели (лучшее качество):
# - "openai/gpt-4o-mini" - недорогая, отличное качество
# - "anthropic/claude-3-haiku" - быстрая и качественная
# - "openai/gpt-3.5-turbo" - классика, недорогая
OPENAI_MODEL = "openai/gpt-oss-20b:free"  # Рекомендуется для русского языка

# Base URL для альтернативных API провайдеров (например, OpenRouter)
# Если используется стандартный OpenAI API, оставьте None
OPENAI_BASE_URL = "https://openrouter.ai/api/v1"  # Для OpenRouter
# OPENAI_BASE_URL = None  # Для стандартного OpenAI API

# Настройки игры
SESSION_COOLDOWN_HOURS = 0  # Время между сессиями в часах
POINTS_PER_SESSION = 15  # Базовые очки за сессию
UNLOCK_THRESHOLD = 50  # Очки для разблокировки новых кварталов

# Пути к данным
DATA_DIR = "data"
SAVES_DIR = os.path.join(DATA_DIR, "saves")
DEFAULT_SAVE_FILE = os.path.join(SAVES_DIR, "player.json")

# Настройки Flask
FLASK_HOST = "127.0.0.1"
FLASK_PORT = 5001  # Изменено с 5000, т.к. 5000 часто занят AirPlay на macOS
FLASK_DEBUG = True
