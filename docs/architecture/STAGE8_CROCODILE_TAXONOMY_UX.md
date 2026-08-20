# Stage 8 — Crocodile Taxonomy Browser & UX

## هدف
Stage 8 رابط Stage 7 را از یک فهرست تخت و مهندسی به یک مرورگر آزمایشگاهی سلسله‌مراتبی تبدیل می‌کند. مرجع دسته‌بندی، داده‌های Clean-room استخراج‌شده از Crocodile Physics 605 است و UI هیچ دسته‌بندی جدیدی را جایگزین ساختار مرجع نمی‌کند.

## دسته‌بندی قطعات
- 203 قطعه canonical
- 206 جایگاه palette
- 5 شاخه اصلی Crocodile:
  - Electronics / الکترونیک
  - Motion & Forces / حرکت و نیرو
  - Optics / اپتیک
  - Presentation / ارائه و کنترل آزمایش
  - Waves / موج‌ها
- 39 مسیر نهایی/زیرشاخه
- حفظ عمق واقعی درخت، از جمله Electronics > Analog/Digital و Motion > Grounds/Slopes/Balls/Blocks.

Taxonomy از `datasets/parts/palette.json` تولید می‌شود و در:

`datasets/navigation/crocodile-taxonomy.json`

ذخیره می‌شود. Generator:

`tools/taxonomy-builder/build.mjs`

## آیکون‌ها
هر Branch و هر Palette Entry یک `iconKey` دارد. UI آن را به SVG خطی تبدیل می‌کند. آیکون قطعه بر اساس شناسه canonical، legacy class و legacy icon hint تعیین می‌شود و آیکون شاخه بر اساس معنای شاخه Crocodile.

## آزمایش‌ها و مباحث
آزمایش‌های Crocodile دقیقاً در 8 شاخه مرجع نگهداری می‌شوند:
- Circuits
- Describing Motion
- Electrical Energy
- Energy and Motion
- Force and Acceleration
- Optics
- Tutorials
- Waves

209 آزمایش مهاجرتی زیر همین 8 شاخه نمایش داده می‌شوند. 4 آزمایش Guided آریا نیز در نزدیک‌ترین شاخه موضوعی Crocodile قرار می‌گیرند بدون تغییر فایل منبع آن‌ها.

تب «مباحث» همان 8 شاخه را به‌عنوان Topic Navigation نمایش می‌دهد و کاربر را به فهرست آزمایش‌های همان موضوع هدایت می‌کند.

## UX Stage 8
- Tree Browser سه‌حالته: قطعات / آزمایش‌ها / مباحث
- Collapse/Expand شاخه‌ها
- جست‌وجوی همزمان فارسی/انگلیسی/شناسه/Legacy Class
- Drag قطعه از Tree به Workspace
- Double-click برای افزودن سریع
- آیکون مستقل Branch و Part
- شمارنده روی شاخه‌ها
- وضعیت Ready/Migration برای آزمایش‌ها
- پنل‌های کناری Collapsible در دسکتاپ
- Drawer برای Library و Inspector در Tablet/Mobile
- Bottom panel قابل جمع شدن
- Status strip و Shortcut hints
- Inspector صحنه در حالت بدون انتخاب: dt، timeScale، gravity، تعداد قطعه/اتصال/Probe
- حفظ Editor/Runtime/AI/Authoring Stageهای قبلی

## محدودیت تست بصری محیط
Smoke HTTP/DOM و Regression کامل اجرا شده است. ابزار `agent-browser` در محیط حاضر نصب نبود و Chromium Headless به دلیل محدودیت DBus محیط Container به پایان نرسید؛ بنابراین Stage 8 ادعای Visual E2E خودکار روی Browser واقعی ندارد. این محدودیت مربوط به محیط تست است، نه نتیجه Regression Node/HTTP.

## تست
`npm run test:stage8`

10 تست Taxonomy:
- counts 203/206
- 5 top branches
- 39 leaf paths
- پوشش تمام 206 palette placement
- icon metadata برای تمام branch/partها
- 8 experiment categories
- 209 legacy experiments
- topic/category parity
- nested Electronics hierarchy
- nested Motion material hierarchy

`npm run ci` تمام Stageهای 2 تا 8 + Web Smoke را اجرا می‌کند.
