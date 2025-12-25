/**
 * Логика визуализации города
 */

class CityVisualizer {
    constructor() {
        this.districts = {};
    }
    
    updateDistrict(districtKey, data) {
        this.districts[districtKey] = data;
        this.renderDistrict(districtKey);
    }
    
    renderDistrict(districtKey) {
        const districtEl = document.querySelector(`[data-district="${districtKey}"]`);
        if (!districtEl) return;
        
        const data = this.districts[districtKey];
        if (!data) return;
        
        // Применяем визуальные эффекты
        if (data.visual) {
            const brightness = data.visual.brightness || 0.3;
            const lightsCount = data.visual.lights_count || 0;
            const fogDensity = data.visual.fog_density || 0.8;
            
            // Яркость
            districtEl.style.opacity = Math.max(brightness, 0.3);
            districtEl.style.filter = `brightness(${brightness})`;
            
            // Добавляем эффект огней в окнах
            this.addWindowLights(districtEl, lightsCount);
            
            // Эффект тумана
            this.addFogEffect(districtEl, fogDensity);
        }
    }
    
    addWindowLights(districtEl, count) {
        // Удаляем старые огни
        const oldLights = districtEl.querySelectorAll('.window-light');
        oldLights.forEach(light => light.remove());
        
        // Добавляем новые огни
        for (let i = 0; i < count; i++) {
            const light = document.createElement('div');
            light.className = 'window-light';
            light.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: #FFD700;
                border-radius: 50%;
                box-shadow: 0 0 6px #FFD700;
                left: ${Math.random() * 80 + 10}%;
                top: ${Math.random() * 60 + 20}%;
                animation: lightFlicker ${2 + Math.random() * 2}s ease-in-out infinite;
            `;
            districtEl.style.position = 'relative';
            districtEl.appendChild(light);
        }
    }
    
    addFogEffect(districtEl, density) {
        // Удаляем старый туман
        const oldFog = districtEl.querySelector('.district-fog');
        if (oldFog) oldFog.remove();
        
        if (density > 0.5) {
            const fog = document.createElement('div');
            fog.className = 'district-fog';
            fog.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(100, 100, 150, ${density * 0.3});
                border-radius: 20px;
                pointer-events: none;
                animation: fogDrift 10s ease-in-out infinite;
            `;
            districtEl.style.position = 'relative';
            districtEl.appendChild(fog);
        }
    }
    
    animateDistrictUnlock(districtKey) {
        const districtEl = document.querySelector(`[data-district="${districtKey}"]`);
        if (!districtEl) return;
        
        // Анимация разблокировки
        districtEl.style.animation = 'districtUnlock 1s ease';
        
        setTimeout(() => {
            districtEl.style.animation = '';
            districtEl.classList.remove('locked');
        }, 1000);
    }
    
    showPointsAnimation(points, element) {
        const pointsEl = document.createElement('div');
        pointsEl.className = 'points-animation';
        pointsEl.textContent = `+${points}`;
        pointsEl.style.cssText = `
            position: absolute;
            color: #4CAF50;
            font-size: 2rem;
            font-weight: bold;
            pointer-events: none;
            animation: pointsFloat 2s ease-out forwards;
            z-index: 1000;
        `;
        
        if (element) {
            const rect = element.getBoundingClientRect();
            pointsEl.style.left = (rect.left + rect.width / 2) + 'px';
            pointsEl.style.top = (rect.top + rect.height / 2) + 'px';
        } else {
            pointsEl.style.left = '50%';
            pointsEl.style.top = '50%';
        }
        
        document.body.appendChild(pointsEl);
        
        setTimeout(() => {
            pointsEl.remove();
        }, 2000);
    }
}

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes lightFlicker {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
    
    @keyframes fogDrift {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(10px); }
    }
    
    @keyframes districtUnlock {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); box-shadow: 0 0 50px rgba(33, 150, 243, 0.8); }
        100% { transform: scale(1); }
    }
    
    @keyframes pointsFloat {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5);
        }
    }
`;
document.head.appendChild(style);

// Экспортируем
window.cityVisualizer = new CityVisualizer();

