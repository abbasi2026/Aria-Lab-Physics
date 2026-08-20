# گزارش Stage 1 — استانداردسازی کتابخانه قطعات

## خروجی نهایی

Stage 1 داده‌ی استخراج‌شده از Crocodile Physics 605 را به مدل استاندارد و مستقل Aria Lab Physics تبدیل کرده است.

### پوشش

- ۲۰۳ Canonical Part
- ۲۰۶ Palette Entry
- ۷٬۵۳۴ Property Record در سطح قطعات
- ۲۳۵ Port/Terminal قابل استخراج
- نام فارسی همه قطعات
- ۵ دامنه موجود در baseline: Circuits, Mechanics, Optics, Waves, Presentation
- Part Schema v1
- Validator ساختاری و cross-reference
- CSVهای قابل تحلیل
- ۱۲ Golden Experiment از Stage 0 همچنان معتبر

## چیزی که عمداً هنوز انجام نشده است

Solver علمی قطعات هنوز پیاده‌سازی نشده است. اطلاعات Stage 1 قرارداد ورودی/خروجی و شواهد رفتاری است، نه کپی الگوریتم عددی نرم‌افزار قدیمی. این مرزبندی برای clean-room implementation ضروری است.

## Quality Gate

اجرای زیر باید بدون خطا تمام شود:

```bash
npm run validate
```

نتیجه فعلی:

```text
Validated 12 experiment file(s).
PASS: 203 canonical parts, 206 palette entries, 7534 normalized property records, 235 extracted ports.
```

## Stage 2

مرحله بعد باید به جای افزودن UI، روی هسته علمی متمرکز شود: SI units، simulation clock، سپس Solverهای MVP مکانیک، مدار، اپتیک و موج و اتصال آن‌ها به Golden Experiments.
