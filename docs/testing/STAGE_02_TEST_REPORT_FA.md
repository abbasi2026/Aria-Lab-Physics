# گزارش آزمون Stage 2

فرمان مرجع:

```bash
npm test
```

نتیجه آخرین اجرای بسته Stage 2:

- Experiment schema validation: PASS — 12 فایل
- Part model validation: PASS — 203 قطعه canonical، 206 ورودی palette، 7534 رکورد property، 235 port
- Scientific solver tests: PASS
- Golden experiments: 12
- Golden numeric cases executed: 17
- Runtime measurements captured: 17

## تست‌های تکمیلی

- برخورد کشسان یک‌بعدی
- انتگرال‌گیری حرکت 1D با timestep ثابت
- مقاومت سری و موازی
- پاسخ گذرای RC
- بازتاب کلی داخلی
- تداخل مخرب کامل

## نکته کیفیت

Stage 2 یک foundation علمی است، نه ادعای شبیه‌ساز کامل. حل شبکه عمومی مدار، rigid-body دوبعدی، ray-scene کامل و wave-grid عددی عمداً در Gate بعدی قرار دارند.
