# هسته علمی Aria Lab Physics — نسخه 1

Stage 2 اولین پیاده‌سازی مستقل موتور علمی پروژه است و هیچ DLL یا کد اجرایی Crocodile را مصرف نمی‌کند.

## اصول

- SI-first: محاسبات داخلی بر مبنای SI انجام می‌شوند و تبدیل واحد در مرزهای ورودی/نمایش است.
- Deterministic stepping: ساعت شبیه‌سازی timestep ثابت دارد.
- UI-independent: Solverها هیچ وابستگی به React، Canvas یا DOM ندارند.
- Test-first: 12 Golden Experiment به Runtime متصل‌اند.
- Domain isolation: مکانیک، مدار، اپتیک و موج بسته‌های جداگانه‌اند.

## Physics Core

- تبدیل واحدهای پایه مورد نیاز MVP
- SimulationClock با dt ثابت
- ابزارهای tolerance و تبدیل زاویه

## Mechanics MVP

- F = ma
- تکانه
- سرعت از شیب مکان–زمان
- نیروی فنر Hooke
- اصطکاک جنبشی ساده
- انتگرال‌گیر نیمه‌ضمنی Euler برای حرکت 1D
- برخورد یک‌بعدی با ضریب بازگشت

## Circuits MVP

- قانون اهم
- مقاومت سری/موازی
- گذرای RC شارژ
- گذرای RL افزایش جریان

این مرحله هنوز «حل شبکه عمومی مدار» نیست. برای مدارهای چندگرهی باید Modified Nodal Analysis در Stage بعد اضافه شود.

## Optics MVP

- قانون بازتاب
- قانون اسنل
- بازتاب کلی داخلی
- معادله عدسی نازک
- زاویه بحرانی

این مرحله Ray Scene کامل و تقاطع هندسی سطوح را هنوز پیاده نمی‌کند.

## Waves MVP

- v = fλ
- برهم‌نهی دو موج سینوسی
- مینیمم پراش تک‌شکاف
- دوپلر منبع متحرک
- نمونه‌برداری موج سینوسی

## Experiment Runtime

Runtime فعلی Solverهای آزمایش مرجع را ثبت و اجرا کرده و Measurement log تولید می‌کند. این پایه برای Binding، Graph Trace، Step Guide و Assessment است.
