# إدارة الباصات وتسكين الطلبة – المدرسة المصرية الألمانية للغات

موقع ثابت (HTML/CSS/JS) متصل بقاعدة بيانات Supabase. مفيش سيرفر تحتاج تديره.

## الملفات
- `index.html` الصفحة الرئيسية
- `css/style.css` التصميم (ألوان المدرسة + الموبايل + الطباعة)
- `js/config.js` رابط ومفتاح Supabase
- `js/core.js` الاتصال والنماذج والطباعة
- `js/students.js` الطلبة (بحث وفلاتر وترقيم صفحات ونقل جماعي)
- `js/routes.js` خطوط السير وربطها بالسائق والمشرفة والباص
- `js/lookups.js` السائقين والمشرفات والباصات
- `js/app.js` تسجيل الدخول والتنقل

## خطوات التشغيل
1. تم إنشاء مستخدم `emad` (البريد الداخلي emad@mgs.app). لإضافة مستخدمين: Authentication ← Users ← Add user (بريدك وكلمة مرور) وفعّل Auto Confirm.
2. **مهم:** Authentication ← Sign In / Providers ← عطّل "Allow new users to sign up" عشان محدش غريب يسجل.
3. ارفع المجلد كله على أي استضافة ثابتة (Netlify Drop أو Vercel أو GitHub Pages) أو افتح index.html مباشرة للتجربة.
4. بعد الرفع، ضيف رابط الموقع في Authentication ← URL Configuration ← Site URL.

## قاعدة البيانات
الجداول: `students`, `routes`, `drivers`, `supervisors`, `buses` + عرض `student_details`.
كل الجداول محمية بـ RLS: بس المستخدم المسجّل دخول يقدر يقرا ويعدّل.
