# مدل استاندارد قطعه — Aria Lab Physics Part Model v1

## هدف

این مدل مرز بین «داده پژوهشی نرم‌افزار قدیمی» و «پیاده‌سازی مستقل آزمایشگاه آریا» است. هیچ Solver علمی نباید مستقیماً به ساختار Crocodile وابسته باشد. داده legacy فقط برای کشف interface، تنظیمات، واحدها، ارتباطات و رفتار قابل مشاهده استفاده می‌شود.

## دو مفهوم متفاوت

- **Canonical Part**: تعریف یکتای یک قطعه در Registry آریا.
- **Palette Entry**: محل نمایش همان قطعه در یک گروه از کتابخانه کاربری.

Baseline فعلی شامل **۲۰۳ Canonical Part** و **۲۰۶ Palette Entry** است. سه ابزار `Ruler`، `Protractor` و `Marker` در دو Palette ظاهر می‌شوند، ولی فقط یک تعریف canonical دارند.

## قرارداد هر قطعه

هر فایل قطعه شامل این بخش‌ها است:

1. `id / name / nameFa / domain`
2. `categories` — یک قطعه می‌تواند در چند Palette نمایش داده شود.
3. `capabilities` — قابلیت‌های سطح بالا مثل `collision`، `ray-tracing` یا `electrical-simulation`.
4. `ports` — پایانه‌های قابل اتصال که از تعریف legacy قابل استخراج بوده‌اند.
5. `properties` — تمام Propertyهای استخراج‌شده، با نقش استاندارد.
6. `solver` — قرارداد ورودی/خروجی موتور؛ نه کپی Solver قدیمی.
7. `rendering` — قرارداد لایه نمایش.
8. `source` — شواهد پژوهشی و کلاس legacy برای traceability.
9. `migration` — وضعیت پیاده‌سازی و بازبینی علمی.

## نقش Propertyها

- `parameter`: پارامتر قابل تنظیم توسط کاربر/آزمایش.
- `state`: وضعیت هندسی یا دینامیکی صحنه.
- `observable`: خروجی قابل مشاهده/اندازه‌گیری.
- `computed`: مقدار محاسباتی داخلی که لزوماً API عمومی نیست.
- `binding`: Proxy یا اتصال به Property دیگر.
- `rendering`: داده‌ی مربوط به نمایش.
- `internal`: داده‌ی داخلی Legacy که برای traceability حفظ شده است.

## اصل Solver

وجود یک Property یا رفتار در داده‌ی legacy به معنی پذیرش مدل عددی آن نیست. برای هر قطعه باید مستقل مشخص شود:

- معادلات و فرضیات علمی؛
- محدوده اعتبار مدل؛
- روش عددی و timestep؛
- conservation/invariantها؛
- edge caseها؛
- Golden Testها؛
- tolerance عددی.

تا قبل از این بازبینی، وضعیت Solver قطعات `implementation-pending` باقی می‌ماند.
