# کاتالوگ پایه قطعات Aria Lab Physics — Stage 1

## وضعیت دیتاست

- ۲۰۳ تعریف canonical
- ۲۰۶ ورودی Palette
- ۷٬۵۳۴ Property نرمال‌شده در سطح قطعات
- ۲۳۵ Port/Terminal قابل استخراج
- نام فارسی برای تمام ۲۰۳ قطعه
- Schema نسخه ۱ و Validator فعال

## توزیع Canonical Partها

| دامنه | تعداد |
|---|---:|
| مدار و الکترونیک | ۹۳ |
| مکانیک | ۵۳ |
| اپتیک | ۲۱ |
| موج | ۲۰ |
| ارائه، اندازه‌گیری و کنترل فعالیت | ۱۶ |
| **جمع** | **۲۰۳** |

> Palette اپتیک ۲۴ ورودی دارد، اما Ruler، Protractor و Marker متعلق به Componentهای مشترک Presentation هستند؛ به همین دلیل تعداد canonical اپتیک ۲۱ است.

## خانواده‌های Solver/Runtime

### مدار
`analog-network`، `source`، `nonlinear-or-active-device`، `electromechanical-or-load`، `instrumentation`، `digital-logic`

### مکانیک
`rigid-body`، `static-collider`، `mechanism`، `constraint-force`، `world-environment`

### اپتیک
`ray-source`، `refractive-optic`، `reflective-optic`، `ray-obstacle`، `ray-scene-component`

### موج
`wave-medium-1d`، `wave-medium-2d`، `wave-source`، `wave-reflector`، `wave-obstacle`، `wave-aperture`، `wave-detector`

### ارائه
`presentation-control`

## فایل‌های اصلی

- `datasets/parts/canonical/` — یک JSON برای هر Canonical Part
- `datasets/parts/canonical-parts.json` — مجموعه کامل
- `datasets/parts/registry.json` — Registry سبک برای برنامه
- `datasets/parts/palette.json` — ساختار ۲۰۶ ورودی کتابخانه
- `datasets/parts/parts-catalog.csv` — نمای جدولی ۲۰۳ قطعه
- `datasets/parts/palette-catalog.csv` — نمای جدولی ۲۰۶ ورودی Palette
- `datasets/schemas/part.schema.json` — قرارداد ساختاری

## نکته علمی

این Stage «داده و قرارداد interface» را استاندارد کرده است؛ هنوز به معنی آماده بودن Solver همه قطعات نیست. برای محصول نهایی باید Solver هر خانواده به‌صورت مستقل طراحی و با Golden Experimentها راستی‌آزمایی شود.
