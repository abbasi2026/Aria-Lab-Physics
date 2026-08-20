# Scene Model v1 — Aria Lab Physics

هدف Scene Model جدا کردن «تعریف آزمایش» از UI و Solver است. Editor فقط این مدل را ایجاد/ویرایش می‌کند و Runtime آن را به موتور دامنه مربوط تحویل می‌دهد.

## اجزای اصلی

- `parts`: نمونه‌های قطعات canonical با `instanceId` مستقل.
- `transform`: مکان، دوران و مقیاس نمایشی/هندسی.
- `properties`: پارامترهای قابل تنظیم همان نمونه.
- `connections`: اتصال الکتریکی، مکانیکی، اپتیکی، موجی یا Binding.
- `simulation`: timestep و پارامترهای عمومی محیط.
- `probes`: نقاط اندازه‌گیری و داده‌هایی که Graph/Assessment مصرف می‌کند.

## اصل مهم

`partId` باید به Canonical Part Registry اشاره کند؛ هیچ قطعه‌ای نباید فقط داخل UI تعریف شود. `instanceId` شناسه صحنه است و می‌تواند چند نمونه از یک `partId` را متمایز کند.

این Schema در Stage 3 قرارداد اولیه است؛ Loader/Compiler کامل Scene به solver graph در Stage 4 ساخته می‌شود.
