# Установка изображений

## Обнаружены сгенерированные изображения!

В папке `pictures/` найдены изображения. Для корректной работы игры переместите их в правильную структуру:

### Шаг 1: Создайте структуру папок

```bash
cd "untitled folder"
mkdir -p static/images/{aira,city,districts,cards,bosses,icons,ui,emotions}
```

### Шаг 2: Переместите изображения

Из папки `pictures/` в соответствующие подпапки `static/images/`:

#### Айра
```bash
# Файл с "A warm, gentle AI guide character named Aira"
mv "pictures/A warm, gentle AI guide character named Aira,.jpg" static/images/aira/aira_portrait.jpg
```

#### Город
```bash
# Файл с "Bird's eye view of a mystical city"
mv "pictures/Bird's eye view of a mystical city divided into 5 districts, covered in soft mist. .jpg" static/images/city/city_map.jpg
```

#### Кварталы
```bash
# Цитадель
mv "pictures/Majestic library-fortress interior with tall bookshelves, warm desk lamp lighting. .jpg" static/images/districts/citadel_bg.jpg

# Арсенал
mv "pictures/Elegant treasury room with organized ledgers, soft purple ambient light. .jpg" static/images/districts/arsenal_bg.jpg

# Форум
mv "pictures/Warm gathering plaza at golden hour, people in soft focus connecting. .jpg" static/images/districts/forum_bg.jpg

# Сад
mv "pictures/Secret meditation garden at twilight, soft lavender and pink sky. .jpg" static/images/districts/garden_bg.jpg
```

#### Карточки
```bash
# Кофейная опора
mv "pictures/Card design with soft glowing border, hand-painted icon of a coffee cup with steam. .jpg" static/images/cards/skill_coffee.jpg

# Линза Фокуса
mv "pictures/Mystical artifact card showing a lens_magnifier glowing softly. .jpg" static/images/cards/relic_lens.jpg

# Картограф Линий
mv "pictures/Character portrait card of a wise cartographer NPC with warm smile. .jpg" static/images/cards/companion_cartographer.jpg
```

#### Боссы
```bash
# Шепот Пинга
mv "pictures/Abstract swarm of floating notification icons and pings forming a chaotic cloud. .jpg" static/images/bosses/boss_ping.jpg

# Счётовод Дедлайнов
mv "pictures/Stern figure made of calendars and checklists, holding a perfect schedule. .jpg" static/images/bosses/boss_accountant.jpg

# Архивариус Шума
mv "pictures/Massive ethereal figure of swirling static and noise, containing all previous hazards. .jpg" static/images/bosses/boss_archivist.jpg
```

#### UI элементы
```bash
# Card Rail
mv "pictures/Vertical magical shelf_rack with soft glowing slots. .jpg" static/images/ui/card_rail.jpg

# Fog
mv "pictures/Soft misty overlay for locked_unexplored areas. .jpg" static/images/ui/fog_overlay.jpg
```

### Шаг 3: Конвертируйте в WebP (опционально, для оптимизации)

```bash
# Если установлен ImageMagick
for file in static/images/**/*.jpg; do
    convert "$file" -quality 85 "${file%.jpg}.webp"
done
```

### Шаг 4: Обновите пути в CSS

Откройте `static/css/style.css` и убедитесь, что пути указывают на `static/images/`:

```css
.agent-photo {
    background-image: url('../images/aira/aira_portrait.jpg');
}
```

---

## Быстрая установка (скрипт)

Создайте файл `setup_images.sh`:

```bash
#!/bin/bash

# Создаём структуру
mkdir -p static/images/{aira,city,districts,cards,bosses,ui}

# Перемещаем (если имена файлов точно такие)
mv "pictures/A warm, gentle AI guide character named Aira,.jpg" static/images/aira/aira_portrait.jpg 2>/dev/null
mv "pictures/Bird's eye view of a mystical city"*.jpg static/images/city/city_map.jpg 2>/dev/null
mv "pictures/Majestic library-fortress"*.jpg static/images/districts/citadel_bg.jpg 2>/dev/null
mv "pictures/Elegant treasury room"*.jpg static/images/districts/arsenal_bg.jpg 2>/dev/null
mv "pictures/Warm gathering plaza"*.jpg static/images/districts/forum_bg.jpg 2>/dev/null
mv "pictures/Secret meditation garden"*.jpg static/images/districts/garden_bg.jpg 2>/dev/null
mv "pictures/Card design with soft glowing border"*.jpg static/images/cards/skill_coffee.jpg 2>/dev/null
mv "pictures/Mystical artifact card"*.jpg static/images/cards/relic_lens.jpg 2>/dev/null
mv "pictures/Character portrait card"*.jpg static/images/cards/companion_cartographer.jpg 2>/dev/null
mv "pictures/Abstract swarm"*.jpg static/images/bosses/boss_ping.jpg 2>/dev/null
mv "pictures/Stern figure"*.jpg static/images/bosses/boss_accountant.jpg 2>/dev/null
mv "pictures/Massive ethereal figure"*.jpg static/images/bosses/boss_archivist.jpg 2>/dev/null
mv "pictures/Vertical magical"*.jpg static/images/ui/card_rail.jpg 2>/dev/null
mv "pictures/Soft misty overlay"*.jpg static/images/ui/fog_overlay.jpg 2>/dev/null

echo "✅ Изображения перемещены в static/images/"
```

Запустите:
```bash
chmod +x setup_images.sh
./setup_images.sh
```

---

## Fallback: Игра работает без изображений

Если изображения не установлены, игра использует:
- Градиентные placeholders
- Эмодзи вместо иконок
- CSS-анимации вместо фонов

Но для полного погружения рекомендуется установить хотя бы **изображения Приоритета 1** (Айра + город + кварталы).

---

## Где взять недостающие изображения

Используйте промпты из `IMAGE_PROMPTS.md`:
- Midjourney (платно, лучшее качество)
- DALL-E 3 (ChatGPT Plus)
- Stable Diffusion (бесплатно, локально)

Или наймите художника на Fiverr/ArtStation с референсом на `VISUAL_GUIDE.md`.

