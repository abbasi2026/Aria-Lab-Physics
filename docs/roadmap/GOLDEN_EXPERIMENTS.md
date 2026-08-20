# Golden Experiments

این مجموعه معیار رگرسیون علمی Aria Lab Physics است. هدف آن بازتولید متن یا UI نرم‌افزار قدیمی نیست؛ هر آزمایش یک اصل فیزیکی مستقل را به تست عددی تبدیل می‌کند.

## مجموعه اولیه

### Circuits
- Ohm’s Law — `V = IR`
- Current–Voltage Characteristic — رفتار خطی مقاومت

### Mechanics
- Newton’s Second Law — `a = F/m`
- Conservation of Momentum — `Σp_before = Σp_after`
- Distance–Time Graph — شیب نمودار برابر سرعت

### Optics
- Law of Reflection — `θi = θr`
- Snell’s Law — `n1 sinθ1 = n2 sinθ2`
- Thin Lens — `1/f = 1/u + 1/v`

### Waves
- Two-Source Interference — superposition
- Single-Slit Diffraction — `a sinθ = mλ`
- Doppler Effect — منبع متحرک
- Wave Speed — `v = fλ`

## قاعده

هر تغییری در solver که یک Golden Case را خراب کند باید قبل از Merge توضیح علمی و تست جایگزین داشته باشد.
