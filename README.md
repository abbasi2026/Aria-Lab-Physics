# Aria Lab Physics

آزمایشگاه مجازی فیزیک نسل جدید آریا — وب‌محور، چندسکویی، داده‌محور و آماده برای توسعه قابلیت‌های هوش مصنوعی.

## هدف

Aria Lab Physics قرار نیست بازسازی ظاهری Crocodile Physics باشد. Crocodile Physics 605 صرفاً به‌عنوان **baseline پژوهشی** برای شناخت مدل قطعات، ویژگی‌ها، آزمایش‌ها، واحدها و معماری دامنه‌های فیزیک استفاده می‌شود. پیاده‌سازی Aria Lab Physics باید مستقل، مدرن و clean-room باشد.

## دامنه‌های اصلی نسخه هدف

- مکانیک و دینامیک
- الکتریسیته و مدار
- اپتیک هندسی
- موج و صوت
- اندازه‌گیری، نمودار و تحلیل داده
- ترمودینامیک
- الکتریسیته ساکن و میدان‌ها
- مغناطیس و الکترومغناطیس
- سیالات
- فیزیک اتمی، کوانتومی و هسته‌ای
- سازنده فعالیت و آزمایش آموزشی
- دستیار هوشمند آزمایشگاه

## ساختار مخزن

```text
apps/                 برنامه‌های کاربری
packages/             موتورهای فیزیک و کتابخانه‌های مشترک
content/              آزمایش‌ها، درس‌ها و آموزش‌ها
datasets/             مدل‌های داده و داده‌های مرجع
docs/                 معماری، پژوهش و نقشه‌راه
tests/                 آزمون‌های علمی و رگرسیون
tools/                 ابزارهای مهاجرت و اعتبارسنجی
```

## وضعیت فعلی

مرحله ۷: AI Experiment Studio + Visual Rule Builder + Experiment Library + Crocodile Migration.

- ۲۰۳ Canonical Part و ۲۰۶ Palette Entry استاندارد شده‌اند.
- Physics Core و ۱۲ Golden Experiment فعال‌اند.
- Circuit DC Network Solver بر پایه MNA پیاده‌سازی شده است.
- Mechanics World2D با برخورد، گرانش، اصطکاک ضربه‌ای، کف و فنر فعال است.
- Optics Ray Scene با تقاطع، بازتاب، شکست، TIR و thin-lens paraxial فعال است.
- WaveGrid 1D/2D بر پایه FDTD و کنترل CFL فعال است.
- Scene Model v1 برای اتصال Stage بعد به Editor تعریف شده است.
- تست خودکار Stage 3 شامل ۱۹ سناریوی شبیه‌سازی است.

گزارش پژوهش Crocodile Physics 605 در `docs/research/crocodile-physics-605/` قرار دارد. داده‌های عمومیِ مشتق‌شده و مناسب برای توسعه در `datasets/legacy/crocodile-physics-605/` نگهداری می‌شوند.

> فایل‌های اجرایی اصلی Crocodile Physics، DLLها، فایل‌های نصب و متن کامل Help در این مخزن عمومی قرار نمی‌گیرند. هدف، بازپیاده‌سازی مستقل رفتار علمی و مدل داده است.

## اعتبارسنجی

```bash
npm test
```


## Stage 4 — Scene Editor & Runtime

Stage 4 adds the first interactive editor on top of the scientific engines:

- 203-part searchable palette
- drag/drop in world coordinates (camera pixels stay outside scene data)
- canonical Property Inspector
- logical ports and wiring
- circuit MNA derived from editor topology
- Mechanics / Circuits / Optics / Waves scene runtime
- Run / Pause / Step / Reset
- Probe recording and lightweight graphing
- Scene JSON import/export and undo/redo

Run locally:

```bash
npm run dev
```

Then open `http://127.0.0.1:4173/`.

Validate all stages:

```bash
npm test
```

See `docs/architecture/STAGE4_EDITOR_RUNTIME.md` for contracts and limitations.

## Stage 5 — Advanced Solvers

Stage 5 adds transient/nonlinear circuits (RLC + diode), rotational mechanics and distance joints, spherical ray-optics surfaces, and heterogeneous/absorbing wave media. Four loadable reference scenes are available under `content/scenes/stage5/`.

Run the complete scientific + web regression suite:

```bash
npm run ci
```

## Stage 6 — Experiment Studio

Stage 6 adds Experiment Package v2, guided step-by-step execution, machine-checkable completion conditions, measurements and assessment, a grounded coaching context, and basic experiment authoring directly inside the web editor.

Reference guided experiments are under `content/experiments/stage6/`.

```bash
npm run test:stage6
npm run ci
```


## Stage 7 — AI Experiment Studio

Stage 7 adds a grounded Gemini-ready coach, server-side AI proxy, visual Rule/Step Builder, searchable experiment library, browser-local authored experiment storage, and clean-room Crocodile Physics 605 migration tooling.

AI is optional. Without credentials, deterministic Stage 6 guidance remains fully functional. To enable the server-side Gemini adapter:

```bash
cp .env.example .env
# configure GEMINI_API_KEY and GEMINI_MODEL in the server environment
npm run dev
```

The development server reads environment variables directly; it does **not** load `.env` automatically. Configure them in your shell/process manager. Never put the API key in `apps/web`.

Regenerate the 209-record Crocodile migration library:

```bash
npm run migrate:crocodile
```

Import structured content extracted from a legacy experiment:

```bash
npm run migrate:crocodile:extracted -- extracted.json output.json
```

Run Stage 7 and full CI:

```bash
npm run test:stage7
npm run ci
```

See `docs/architecture/STAGE7_AI_RULE_LIBRARY_MIGRATION.md`.

## Stage 9 — حالت اجرای دانش‌آموز

Stage 9 محیط را از Editor صرف به آزمایشگاه اجرایی تبدیل می‌کند. حالت پیش‌فرض «اجرای آزمایش» است و خروجی‌های دیداری از Solver واقعی می‌آیند: پرتو و کانون عدسی، جریان و روشنایی لامپ، حرکت/برخورد و میدان موج. چهار آزمایش اجرایی در `content/experiments/stage9/` قرار دارند.

```bash
npm run test:stage9
npm run ci
```

قطعات فاقد Solver عمداً با برچسب «در حال توسعه» نمایش داده می‌شوند و رفتار جعلی ندارند.

## Stage 10 — اپتیک اجرایی

تمام ۲۱ قطعه اپتیک Crocodile دارای نگاشت اجرایی هستند. پنج آزمایش جدید در `content/experiments/stage10/` قرار دارد.

```bash
npm run test:stage10
npm run ci
```

## Stage 11 — مدارهای اجرایی

Stage 11 قطعات پایه مدار را از آیکون به ابزار اجرایی تبدیل می‌کند. LED، موتور، بازر، فیوز، آمپرمتر، ولت‌متر، مقاومت متغیر، LDR، ترمیستور و قطعات گذرا مستقیماً از جریان و ولتاژ Solver تغذیه می‌شوند. کنترل‌های لمسی مقاومت/نور/دما روی خود برد قرار دارند و پنج آزمایش اجرایی در `content/experiments/stage11/` موجود است.

```bash
npm run test:stage11
npm run ci
```

## Stage 12 — منطق دیجیتال اجرایی

Stage 12 یک موتور Net-based مستقل برای منطق دیجیتال اضافه می‌کند. ورودی‌های منطقی و Clock روی Netها Drive می‌کنند، گیت‌های AND/OR/NOT/NAND/NOR/XOR به‌صورت واقعی ارزیابی می‌شوند و خروجی منطقی و نمایشگر هفت‌قسمتی روی برد زنده واکنش نشان می‌دهند. ورودی‌ها در حالت اجرای دانش‌آموز با لمس ۰/۱ می‌شوند.

```bash
npm run test:stage12
npm run ci
```

## Stage 13 — مدارهای دیجیتال حالت‌دار

Stage 13 منطق ترتیبی را به حالت اجرای دانش‌آموز اضافه می‌کند. فلیپ‌فلاپ‌های D/JK، لچ RS، شمارنده‌های 4017 و 4518، شمارنده/دیکودر 4026 و دیکودرهای 4511 و 4028 اکنون حافظه داخلی، لبه کلاک، Reset/Set و خروجی‌های واقعی Solver دارند. وضعیت حافظه هنگام لمس ورودی‌های منطقی در Runtime حفظ می‌شود و Reset آزمایش عمداً آن را پاک می‌کند.

شش آزمایش اجرایی Stage 13 در `content/experiments/stage13/` قرار دارند و از Library آزمایشگاه قابل بارگذاری‌اند.

```bash
npm run test:stage13
npm run ci
```

See `docs/architecture/STAGE13_STATEFUL_DIGITAL.md`.
