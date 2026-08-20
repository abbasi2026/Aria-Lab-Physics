# گزارش تست Stage 8

نتیجه نهایی: PASS

- Part validator: 203 canonical / 206 palette / 7534 properties / 235 ports
- Experiment validator: 12 legacy + 4 v2
- Stage 2: PASS
- Stage 3: 19/19
- Stage 4: 12/12
- Stage 5: 15/15
- Stage 6: 19/19
- Stage 7: 22/22
- Stage 8: 10/10
- Web Smoke Stage 8: PASS

Taxonomy:
- 5 شاخه اصلی قطعات
- 39 مسیر نهایی Crocodile
- 8 شاخه آزمایش/مبحث
- 209 آزمایش Crocodile migration

یادداشت: Visual E2E خودکار به‌دلیل نبود agent-browser و محدودیت DBus Chromium در محیط Container اجرا نشد؛ HTTP/DOM Smoke و تمام Regressionها پاس شدند.
