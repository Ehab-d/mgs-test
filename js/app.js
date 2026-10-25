/* التنقل + تسجيل الدخول + الحساب */
const VIEWS = { students: showStudents, routes: showRoutes, drivers: () => showLookup('drivers'), supervisors: () => showLookup('supervisors'), buses: () => showLookup('buses') };
let curView = 'students';

/* اسم المستخدم -> بريد داخلي. الأسماء العربية بتتحول لـ hex عشان البريد يفضل ASCII صالح */
function toEmail(u) {
  u = u.trim().toLowerCase();
  if (u.includes('@')) return u;
  if (/^[a-z0-9._-]+$/.test(u)) return u + '@mgs.app';
  return 'u-' + [...new TextEncoder().encode(u)].map(b => b.toString(16).padStart(2, '0')).join('') + '@mgs.app';
}

function moveInd() {
  const a = document.querySelector('#tabs [aria-current]'), i = $('#tabs .ind');
  if (!a || !i || !a.offsetWidth) return;
  const first = !i.dataset.r;
  if (first) i.style.transition = 'none';
  i.style.width = a.offsetWidth + 'px';
  i.style.transform = `translateX(${a.offsetLeft}px)`;
  if (first) { i.offsetWidth; i.style.transition = ''; i.dataset.r = 1; }
}
/* يعيد ضبط المؤشر كلما تغيّر حجم التابات (تحميل الخط، إظهار الصفحة بعد الدخول، تغيير الشاشة) */
const tabRO = new ResizeObserver(moveInd);
tabRO.observe($('#tabs'));
document.querySelectorAll('#tabs button').forEach(b => tabRO.observe(b));
addEventListener('resize', moveInd);
if (document.fonts) document.fonts.ready.then(moveInd);

const TITLES = { students: 'الطلبة', routes: 'خطوط السير', drivers: 'السائقين', supervisors: 'المشرفات', buses: 'الباصات' };

function go(v) {
  curView = v;
  const m = $('#main'); m.onclick = m.onchange = null;
  document.querySelectorAll('#tabs button').forEach(b => b.dataset.v === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  moveInd();
  document.title = TITLES[v] + ' – إدارة الباصات';
  $('#live').textContent = 'صفحة ' + TITLES[v];
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  m.focus({ preventScroll: true });
  VIEWS[v]().catch(e => toast(errMsg(e), 'err'));
}

function showApp(on) { $('#app').hidden = !on; $('#login').hidden = on; if (on) go(curView); }

$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.v); };
$('#logout').onclick = () => sb.auth.signOut();
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button'); btn.disabled = true; $('#loginErr').textContent = '';
  const { error } = await sb.auth.signInWithPassword({ email: toEmail(f.email.value), password: f.password.value });
  btn.disabled = false;
  if (error) $('#loginErr').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
};
let wasIn = false;
sb.auth.onAuthStateChange((_ev, session) => { const on = !!session; if (on !== wasIn) { wasIn = on; showApp(on); } });
sb.auth.getSession().then(({ data }) => { if (!data.session) showApp(false); });

/* تغيير اسم المستخدم / كلمة المرور (محفوظين في قاعدة البيانات) */
$('#account').onclick = () => openForm({
  title: 'حسابي – تغيير اسم المستخدم وكلمة المرور',
  fields: [
    { k: 'cur', label: 'كلمة المرور الحالية', type: 'password', req: true, full: true },
    { k: 'u', label: 'اسم المستخدم الجديد (سيبه فاضي لو مش عايز تغيّره)', full: true },
    { k: 'p', label: 'كلمة المرور الجديدة (6 حروف على الأقل – سيبها فاضية لو مش عايز تغيّرها)', type: 'password', full: true }
  ],
  onSave: async v => {
    if (!v.u && !v.p) throw new Error('اكتب اسم مستخدم أو كلمة مرور جديدة');
    await run(sb.rpc('change_credentials', { current_password: v.cur, new_username: v.u ? toEmail(v.u) : '', new_password: v.p || '' }));
    toast('تم التغيير، سجّل دخول من جديد');
    setTimeout(() => sb.auth.signOut(), 800);
  }
});
