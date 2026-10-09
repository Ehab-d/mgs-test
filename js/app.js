/* التنقل + تسجيل الدخول */
const VIEWS = { students: showStudents, routes: showRoutes, drivers: () => showLookup('drivers'), supervisors: () => showLookup('supervisors'), buses: () => showLookup('buses') };
let curView = 'students';

function go(v) {
  curView = v;
  const m = $('#main'); m.onclick = m.onchange = null;
  document.querySelectorAll('#tabs button').forEach(b => b.dataset.v === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  moveInd();
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  VIEWS[v]().catch(e => toast(errMsg(e), 'err'));
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

function showApp(on) { $('#app').hidden = !on; $('#login').hidden = on; if (on) go(curView); }

$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) { go(b.dataset.v); b.scrollIntoView({ inline: 'center', block: 'nearest' }); } };
$('#logout').onclick = () => sb.auth.signOut();
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button'); btn.disabled = true; $('#loginErr').textContent = '';
  const { error } = await sb.auth.signInWithPassword({ email: (u => u.includes('@') ? u : u + '@mgs.app')(f.email.value.trim().toLowerCase()), password: f.password.value });
  btn.disabled = false;
  if (error) $('#loginErr').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
};
let wasIn = false;
sb.auth.onAuthStateChange((_ev, session) => { const on = !!session; if (on !== wasIn) { wasIn = on; showApp(on); } });
sb.auth.getSession().then(({ data }) => { if (!data.session) showApp(false); });
