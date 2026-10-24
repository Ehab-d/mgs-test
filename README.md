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
- `js/app.js` تسجيل الدخول والتنقل وشاشة "حسابي"

## الدخول
المستخدم الحالي: `system` / كلمة المرور `system` (غيّرهم من زر "حسابي" بعد الدخول).
اسم المستخدم محفوظ في Supabase Auth كـ `<اسم>@mgs.app`، وتغييره بيتم عبر الدالة `change_credentials`.

## التشغيل
1. ارفع المجلد كله على أي استضافة ثابتة (Netlify Drop أو Vercel أو GitHub Pages) أو افتح index.html للتجربة.
2. من Supabase: Authentication ← Sign In / Providers ← عطّل "Allow new users to sign up".
3. بعد الرفع ضيف رابط الموقع في Authentication ← URL Configuration ← Site URL.

## قاعدة البيانات
الجداول: `students`, `routes`, `drivers`, `supervisors`, `buses` + عرض `student_details`، كلها محمية بـ RLS للمستخدمين المسجّلين فقط.
