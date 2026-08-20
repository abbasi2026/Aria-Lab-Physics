# Part Model Generator

این ابزار فقط برای بازتولید دیتاست Stage 1 از Research Workspace استفاده می‌شود. فایل‌های XML/DLL/EXE نرم‌افزار مرجع در Repository عمومی نگهداری نمی‌شوند.

برای اجرای generator باید Research Workspace محلی در کنار مخزن باشد یا مسیر آن مشخص شود:

```bash
ARIA_LAB_CROCODILE_RESEARCH_DIR=/path/to/crocodile_physics_605_analysis \
python tools/part-model-generator/generate.py
```

خروجی تولیدشده در `datasets/parts/` قرار می‌گیرد. برای استفاده معمولی از پروژه نیازی به اجرای generator نیست؛ فایل‌های canonical از قبل در Repository وجود دارند.
