# گزارش آزمون Stage 7

نتیجه: PASS

- Stage 7 dedicated tests: 22
- Crocodile metadata records recovered: 209
- Aria guided experiments in library: 4
- Canonical parts: 203
- Palette entries: 206
- Web smoke: PASS
- Full regression Stage 2–7: PASS

نکات کلیدی آزمون:

- Importer در حالت metadata-only هیچ Step یا Part جعلی ایجاد نکرد.
- AI check allow-list تست شد و نوع ناشناخته رد می‌شود.
- Runtime evidence بزرگ قبل از ارسال به AI خلاصه می‌شود.
- Dev Server با Gemini mock upstream به‌صورت end-to-end تست شد.
- API key فقط در `x-goog-api-key` درخواست server-to-provider استفاده شد و در status response ظاهر نشد.
