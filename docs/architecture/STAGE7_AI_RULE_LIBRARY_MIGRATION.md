# Stage 7 — AI Coach, Visual Rule Builder, Experiment Library & Crocodile Migration

## هدف

Stage 7 لایه آموزشی Stage 6 را به یک چرخه کامل ساخت، اجرا، راهنمایی، نگهداری و مهاجرت آزمایش تبدیل می‌کند. اصل معماری این مرحله این است که **هوش مصنوعی جای Solver و Measurement را نمی‌گیرد**؛ مدل فقط روی شواهدی که Runtime و Experiment Package فراهم می‌کنند کار می‌کند.

## 1. Grounded AI Coach

مسیر درخواست:

```text
Web Editor
  -> GroundedAIClient
  -> POST /api/ai/coach
  -> server-side Gemini adapter
  -> structured JSON response
  -> response validation
  -> Guide UI
```

کلید API هرگز در JavaScript مرورگر قرار نمی‌گیرد. Dev Server فقط از متغیرهای زیر استفاده می‌کند:

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

نام مدل hard-code نشده است تا پروژه بتواند بدون تغییر Source به مدل در دسترس پروژه ارتقا پیدا کند.

### قرارداد پاسخ Coach

```json
{
  "answerFa": "...",
  "nextActionFa": "...",
  "evidence": ["..."],
  "confidence": 0.8
}
```

قبل از نمایش، پاسخ validate و محدود می‌شود. Context شامل مرحله جاری، نتیجه Checkها، Scene و Runtime evidence است. آرایه‌های بزرگ مانند Wave Field به summary آماری تبدیل می‌شوند تا Context کنترل‌شده بماند.

### Guardrailها

- Measurement یا وضعیت قطعه اختراع نشود.
- ادعای عددی فقط از Runtime/Measurement موجود ساخته شود.
- اگر Evidence کافی نیست، عدم کفایت داده صریح گفته شود.
- پاسخ AI جای نتیجه Solver را نمی‌گیرد.
- پاسخ Authoring فقط از Check Typeهای allow-list عبور می‌کند.

اگر AI تنظیم نشده باشد، Guided Experiment همچنان با `ExperimentCoach` قطعی Stage 6 کار می‌کند.

## 2. AI Experiment Draft

Endpoint دوم:

```text
POST /api/ai/experiment-draft
```

Scene فعلی + metadata آزمایش + هدف آموزشی به مدل داده می‌شود. خروجی فقط می‌تواند این بخش‌ها را پیشنهاد دهد:

- summaryFa
- learningObjectives
- steps
- checks از allow-list
- hints
- assessmentRules

خروجی پس از validation وارد `ExperimentAuthoringDocument` می‌شود و در Rule Builder قابل بازبینی است.

## 3. Visual Rule / Step Builder

Stage 7 ویرایش raw JSON را برای کار روزمره ضروری نمی‌داند. برای هر Step می‌توان از UI:

- عنوان، دستور و دلیل علمی را ویرایش کرد.
- Step را بالا/پایین برد.
- Check اضافه/حذف/ویرایش کرد.
- Hint اضافه/حذف/ویرایش کرد.

Checkهای پشتیبانی‌شده در Builder:

- `runtime-no-error`
- `part-exists`
- `connection-exists`
- `property-range`
- `property-equals`
- `simulation-time`
- `measurement-range`
- `measurement-sample-count`
- `measurement-peak-absolute-min`
- `scene-domain`

## 4. Experiment Library Manager

کتابخانه سه Source را یکجا مدیریت می‌کند:

1. `aria` — آزمایش‌های هدایت‌شده رسمی آریا.
2. `crocodile-605` — رکوردهای مهاجرت Crocodile.
3. `local` — آزمایش‌های ساخته یا ویرایش‌شده کاربر در Browser Local Storage.

قابلیت‌ها:

- Search
- Domain filter
- Source filter
- باز کردن آزمایش
- ساخت Migration Draft
- ذخیره آزمایش authored در کتابخانه محلی
- باز کردن مجدد
- حذف رکورد محلی
- کنترل version regression در Library API

در نسخه Production، Source محلی باید با Backend/Database و حساب کاربری جایگزین شود.

## 5. Crocodile Physics 605 Migration

Snapshot فعلی Stage 7 شامل `.cxp` خام نیست، اما دیتاست پژوهشی 209 آزمایش را دارد. بنابراین دو مسیر مهاجرت وجود دارد.

### سطح A — Metadata-only migration

```bash
npm run migrate:crocodile
```

خروجی:

```text
content/library/crocodile-605-index.json
```

تمام 209 آزمایش به Library Entry تبدیل می‌شوند. عنوان، category، file، تعداد scene/part/instruction page، top classes و intro حفظ می‌شود. Scene یا متن راهنما ساخته نمی‌شود.

وضعیت:

```text
migration-draft / metadata-only
```

### سطح B — Extracted content migration

اگر خروجی استخراج‌شده از CXP شامل Scene Model v1 و/یا instruction page body در دسترس باشد:

```bash
npm run migrate:crocodile:extracted -- extracted.json output.json
```

Importer متن instruction را بدون بازنویسی وارد Guide می‌کند و وضعیت مهاجرت را به یکی از موارد زیر ارتقا می‌دهد:

- `guide-imported`
- `scene-imported`
- `scene-and-guide-imported`

تا وقتی فایل خام یا Extract کامل موجود نباشد، Importer هیچ مرحله یا Scene جعلی تولید نمی‌کند.

## 6. AI Server API

Dev Server مسیرهای زیر را دارد:

```text
GET  /api/ai/status
POST /api/ai/coach
POST /api/ai/experiment-draft
```

`/api/ai/status` فقط enabled/provider/model را برمی‌گرداند و API key را افشا نمی‌کند.

برای Production باید این Dev API با API Route/Server Function دارای authentication، rate limit، logging و secret management جایگزین شود.

## 7. آزمون Stage 7

Stage 7 شامل تست‌های مستقل برای:

- CSV parsing 209 records
- metadata migration fidelity
- extracted guide import fidelity
- library search/filter/version
- visual authoring APIs
- nested assessment rules
- context compression
- grounded request contract
- AI response validation
- allow-list AI checks
- browser-to-server AI client
- server-to-Gemini proxy integration با mock upstream
- عدم افشای API key
- web smoke برای Library و AI API safeguards

## محدودیت‌های باقی‌مانده

- Raw `.cxp` parser در این Snapshot فعال نیست چون فایل‌های خام Stage 7 در ورودی موجود نیستند.
- AI live call بدون API key واقعی قابل اجرا نیست؛ مسیر کامل با mock upstream integration test شده است.
- Local Library فقط برای نسخه تک‌کاربره/Development است.
- AI-generated guide باید قبل از انتشار آموزشی توسط نویسنده/معلم بازبینی شود.
- Stage 7 هنوز LMS، حساب کاربری، همگام‌سازی Cloud و نسخه‌بندی Server-side ندارد.
