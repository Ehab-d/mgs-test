/* الأساسيات: الاتصال، أدوات مساعدة، نموذج الإدخال، الطباعة */
const CFG = window.MGS_CONFIG;
const sb = supabase.createClient(CFG.url, CFG.key);
const $ = (s, r = document) => r.querySelector(s);
const GRADES = ['KG1', 'KG2', ...Array.from({ length: 12 }, (_, i) => 'G' + (i + 1))];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), type ? 5000 : 2500);
}
function errMsg(e) {
  const c = e && e.code, m = (e && e.message) || '';
  if (c === '23505') return m.includes('plate') ? 'رقم اللوحة مسجل قبل كده' : m.includes('num') ? 'رقم الخط مستخدم قبل كده' : 'القيمة دي مكررة';
  if (c === '23514') return m.includes('plate') ? 'رقم اللوحة لازم يكون 4 أرقام' : 'قيمة غير صالحة';
  if (c === '42501') return 'مفيش صلاحية لتنفيذ العملية دي';
  return m || 'حصل خطأ غير متوقع';
}
async function run(p) { const { data, error, count } = await p; if (error) throw error; return { data, count }; }

/* بيانات مرجعية (خطوط/سائقين/مشرفات/باصات) */
const REF = { routes: [], drivers: [], supervisors: [], buses: [] };
async function loadRef() {
  const [r, d, s, b] = await Promise.all([
    run(sb.from('routes').select('*').order('num')),
    run(sb.from('drivers').select('*').order('name')),
    run(sb.from('supervisors').select('*').order('name')),
    run(sb.from('buses').select('*').order('plate'))
  ]);
  REF.routes = r.data; REF.drivers = d.data; REF.supervisors = s.data; REF.buses = b.data;
}
const byId = (list, id) => list.find(x => x.id === id);
const routeLabel = r => `${r.num} – ${r.name}`;
/* خيارات القوائم: النشطين فقط + القيمة الحالية لو غير نشطة */
const optsOf = (list, label, cur) => list.filter(x => x.active !== false || x.id === cur).map(x => [x.id, label(x)]);

/* نموذج إدخال عام */
function fieldHtml(f, v) {
  const id = 'f_' + f.k, cls = f.full ? ' full' : '';
  if (f.type === 'checkbox') return `<label class="chk${cls}"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
  if (f.type === 'select') {
    const o = (f.opts || []).map(([val, t]) => `<option value="${esc(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('');
    return `<label class="${cls.trim()}">${esc(f.label)}<select name="${f.k}" ${f.req ? 'required' : ''}>${o}</select></label>`;
  }
  const extra = [f.type === 'tel' ? 'inputmode="tel" dir="ltr"' : '', f.type === 'number' ? 'inputmode="numeric" min="1"' : '', f.pattern ? `pattern="${f.pattern}" title="${esc(f.hint || '')}" maxlength="4" inputmode="numeric" dir="ltr"` : '', f.ph ? `placeholder="${esc(f.ph)}"` : ''].join(' ');
  return `<label class="${cls.trim()}">${esc(f.label)}<input name="${f.k}" type="${f.type === 'number' ? 'number' : 'text'}" value="${esc(v ?? '')}" ${f.req ? 'required' : ''} ${extra}></label>`;
}
function openForm({ title, fields, values = {}, onSave, onDelete }) {
  const d = document.createElement('dialog');
  d.innerHTML = `<form><h3>${esc(title)}</h3>${fields.map(f => fieldHtml(f, values[f.k])).join('')}
  <div class="acts"><button class="btn red" type="submit">حفظ</button><button type="button" class="btn ghost" data-x>إلغاء</button>
  ${onDelete ? '<span class="sp"></span><button type="button" class="btn ghost" data-del>حذف</button>' : ''}</div></form>`;
  document.body.append(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  const form = d.firstElementChild;
  d.querySelector('[data-x]').onclick = () => d.close();
  if (onDelete) d.querySelector('[data-del]').onclick = async () => { try { if (await onDelete()) d.close(); } catch (e) { toast(errMsg(e), 'err'); } };
  form.onsubmit = async e => {
    e.preventDefault();
    const v = {};
    for (const f of fields) {
      const el = form.elements[f.k];
      if (f.type === 'checkbox') v[f.k] = el.checked;
      else { let x = el.value.trim(); if (f.type === 'number') x = x === '' ? null : Number(x); else if (x === '') x = f.req ? x : null; v[f.k] = x; }
    }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try { await onSave(v); d.close(); } catch (err) { toast(errMsg(err), 'err'); btn.disabled = false; }
  };
  return d;
}

/* الطباعة */
async function fetchAll(build) {
  const out = []; const step = 1000;
  for (let from = 0; ; from += step) {
    const { data } = await run(build().range(from, from + step - 1));
    out.push(...data); if (data.length < step) break;
  }
  return out;
}
function printSheet({ title, meta = [], rows, showRoute = false }) {
  const head = `<div class="ph-head"><img src="logo.png" alt=""><div><h1>المدرسة المصرية الألمانية للغات – المنيا الجديدة</h1><p>${esc(title)} | خطوط السير ${esc(CFG.schoolYear)}</p></div></div>`;
  const m = meta.length ? `<div class="ph-meta">${meta.map(([k, v]) => `<span>${esc(k)}: <b>${esc(v || '—')}</b></span>`).join('')}<span>عدد الطلبة: <b>${rows.length}</b></span></div>` : `<div class="ph-meta"><span>عدد الطلبة: <b>${rows.length}</b></span></div>`;
  const body = rows.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td>${esc(s.grade)}</td><td>${esc(s.address)}</td><td dir="ltr">${[s.phone1, s.phone2].filter(Boolean).map(esc).join('<br>')}</td>${showRoute ? `<td>${s.route_num ? esc(s.route_num + ' – ' + s.route_name) : '—'}</td>` : ''}<td style="width:14mm"></td><td style="width:14mm"></td></tr>`).join('');
  $('#printArea').innerHTML = `${head}${m}<table><thead><tr><th>م</th><th>اسم الطالب</th><th>الصف</th><th>العنوان</th><th>الهاتف</th>${showRoute ? '<th>الخط</th>' : ''}<th>ذهاب</th><th>عودة</th></tr></thead><tbody>${body}</tbody></table>`;
  setTimeout(() => window.print(), 150);
}
