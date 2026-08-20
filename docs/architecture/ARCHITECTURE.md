# معماری هدف Aria Lab Physics

## اصل طراحی

محصول باید از چند موتور تخصصی فیزیک تشکیل شود که روی یک مدل شیء/Property مشترک سوار هستند. UI نباید منطق فیزیک را در خود نگه دارد.

## لایه‌ها

1. **Physics Core** — کمیت، واحد، Property، Constraint، زمان شبیه‌سازی و Event Bus.
2. **Domain Engines** — Mechanics, Circuits, Optics, Waves و دامنه‌های بعدی.
3. **Experiment Runtime** — Scene، Component Instance، Binding، کنترل، سناریو، Step Guide.
4. **Measurement & Graph** — Probe، Meter، Trace، Data Series، Export.
5. **Content Layer** — Experiment Definition، Tutorial، Lesson، Assessment.
6. **Applications** — Web Lab، Teacher/Admin Studio و Mobile/PWA.
7. **AI Layer** — راهنمای آزمایش، توضیح خطا، تولید سناریو، تحلیل داده و پیشنهاد فعالیت؛ بدون دخالت مستقیم در solver علمی.

## اصل علمی

هر موتور باید تست مرجع داشته باشد. خروجی علمی قابل مشاهده نباید وابسته به UI باشد. برای هر قطعه باید مشخص شود:

- inputs
- state
- parameters
- observables
- equations / solver contract
- units
- validation bounds
- rendering hints
- reference tests
