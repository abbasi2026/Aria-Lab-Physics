# Stage 6 — Experiment Authoring, Guidance & Grounded Coach

## هدف
Stage 6 صحنه‌ی فیزیکی را به یک «بسته آزمایش» آموزشی و قابل‌ارزیابی تبدیل می‌کند. منبع حقیقت علمی همچنان Scene Model v1 و Solverهای Stage 2–5 هستند؛ لایه راهنما اجازه ندارد داده یا نتیجه‌ای خارج از Runtime بسازد.

## Experiment Package v2
نسخه `2.0.0` شامل این بخش‌هاست:
- metadata و domain
- summary و learningObjectives
- Scene Model v1
- guide.steps
- checks قابل ارزیابی ماشینی
- measurements/probes
- expectedResults
- assessment rules
- assistant context و guardrails

Schema مرجع: `datasets/experiments/experiment-schema-v2.json`.

## Check Engine
شرط‌های Stage 6:
- `part-exists`
- `connection-exists`
- `property-range`
- `property-equals`
- `simulation-time`
- `measurement-range`
- `measurement-absolute-min`
- `measurement-sample-count`
- `measurement-peak-absolute-min`
- `runtime-no-error`
- `scene-domain`

هر نتیجه شامل مقدار واقعی (`actual`) و وضعیت passed است. بنابراین Guide بر اساس شواهد واقعی صحنه و Runtime جلو می‌رود.

## GuidedExperimentSession
Session وضعیت اجرای آموزشی را نگهداری می‌کند:
- مرحله جاری
- مراحل تکمیل‌شده
- Hintهای استفاده‌شده
- progress
- event log
- assessment

`advance()` تا وقتی checks مرحله کامل نشده‌اند، جلو نمی‌رود مگر در حالت force صریح.

## Experiment Authoring
`ExperimentAuthoringDocument` و UI Editor قابلیت‌های زیر را فراهم می‌کنند:
- ویرایش عنوان/شناسه/شرح
- افزودن، حذف و ویرایش مرحله
- ثبت Scene فعلی داخل Experiment Package
- Export JSON
- undo/redo در API authoring

Stageهای بعدی می‌توانند Form Builder کامل برای ساخت Check/Measurement بدون JSON اضافه کنند.

## Grounded Coach
`ExperimentCoach` یک Coach قطعی و مبتنی بر شواهد است، نه یک LLM جعلی. این لایه:
- مرحله جاری را ارزیابی می‌کند؛
- Checkهای ناموفق را گزارش می‌کند؛
- Hint تعریف‌شده توسط نویسنده را ارائه می‌دهد؛
- Context ساخت‌یافته برای اتصال آینده به یک مدل AI تولید می‌کند.

Context مدل فقط شامل تعریف آزمایش، Scene، Runtime evidence، expected results و guardrails است. هیچ مقدار اندازه‌گیری‌نشده‌ای نباید به‌عنوان واقعیت تولید شود.

## آزمایش‌های مرجع Stage 6
1. RC charging guided experiment
2. Rotational mechanics guided experiment
3. Spherical refraction guided experiment
4. Heterogeneous wave guided experiment

همه این فایل‌ها در `content/experiments/stage6/` قرار دارند و از داخل Editor قابل بارگذاری هستند.

## محدودیت‌های آگاهانه
- Authoring UI هنوز Rule Builder گرافیکی کامل ندارد؛ API آن موجود است.
- Coach فعلی deterministic است؛ اتصال LLM باید در Stage بعد از طریق Context قراردادشده انجام شود.
- ارزیابی بر داده Solver انجام می‌شود و جایگزین قضاوت آموزشی معلم در پاسخ‌های تشریحی نیست.
