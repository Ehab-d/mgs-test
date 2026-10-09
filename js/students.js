/* شاشة الطلبة: بحث وفلاتر من السيرفر + ترقيم صفحات (تتحمل آلاف الطلبة) */
const SF = { q: '', route_id: '', grade: '', supervisor_id: '', driver_id: '', bus_paid: '' };
const SS = { page: 0, size: 50, total: 0, paid: 0, rows: [], sel: new Set() };

function applyF(q) {
  if (SF.route_id === 'none') q = q.is('route_id', null); else if (SF.route_id) q = q.eq('route_id', SF.route_id);
  for (const k of ['grade', 'supervisor_id', 'driver_id']) if (SF[k]) q = q.eq(k, SF[k]);
  if (SF.bus_paid !== '') q = q.eq('bus_paid', SF.bus_paid === '1');
  const t = SF.q.replace(/[,()%*\\]/g, ' ').trim();
  if (t) q = q.or(`name.ilike.%${t}%,phone1.ilike.%${t}%,phone2.ilike.%${t}%,address.ilike.%${t}%`);
  return q;
}
const sel = (name, label, opts, val, all) => `<label>${label}<select data-f="${name}"><option value="">${all}</option>${opts.map(([v, t]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;

async function showStudents() {
  await loadRef();
  const m = $('#main');
  m.innerHTML = `<div class="head"><h2>الطلبة</h2><span class="sp"></span>
    <button class="btn ghost" id="sPrint">طباعة الكشف</button><button class="btn red" id="sAdd">+ إضافة طالب</button></div>
  <div class="bar">
    <label>بحث (اسم / هاتف / عنوان)<input id="sQ" type="search" value="${esc(SF.q)}" placeholder="اكتب للبحث"></label>
    ${sel('route_id', 'خط السير', [['none', 'بدون خط'], ...REF.routes.map(r => [r.id, routeLabel(r)])], SF.route_id, 'كل الخطوط')}
    ${sel('grade', 'الصف', GRADES.map(g => [g, g]), SF.grade, 'كل الصفوف')}
    ${sel('supervisor_id', 'المشرفة', REF.supervisors.map(x => [x.id, x.name]), SF.supervisor_id, 'كل المشرفات')}
    ${sel('driver_id', 'السائق', REF.drivers.map(x => [x.id, x.name]), SF.driver_id, 'كل السائقين')}
    ${sel('bus_paid', 'حالة الاشتراك', [['1', 'مدفوع'], ['0', 'غير مدفوع']], SF.bus_paid, 'الكل')}
    <button class="btn ghost" id="sReset">مسح الفلاتر</button>
  </div>
  <div class="stats" id="sStats"></div><div id="sBulk"></div>
  <div class="wrap"><table><thead><tr><th class="hide-m"><input type="checkbox" id="sAll" aria-label="تحديد الكل" style="width:auto"></th><th class="hide-m">م</th><th>الطالب</th><th>الصف</th><th>العنوان</th><th>الهاتف</th><th>حالة الاشتراك</th><th>الخط / السائق / المشرفة</th><th class="hide-m"></th></tr></thead><tbody id="sBody"></tbody></table><div id="sEmpty" class="empty" hidden>لا يوجد طلاب بهذه الاختيارات.</div></div>
  <div class="pager" id="sPager"></div>`;
  let timer;
  $('#sQ').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { SF.q = e.target.value; SS.page = 0; loadStudents(); }, 300); };
  m.querySelectorAll('[data-f]').forEach(el => el.onchange = () => { SF[el.dataset.f] = el.value; SS.page = 0; loadStudents(); });
  $('#sReset').onclick = () => { Object.keys(SF).forEach(k => SF[k] = ''); SS.page = 0; showStudents(); };
  $('#sAdd').onclick = () => studentForm();
  $('#sAll').onchange = e => { SS.rows.forEach(r => e.target.checked ? SS.sel.add(r.id) : SS.sel.delete(r.id)); drawStudents(); };
  $('#sPrint').onclick = printStudents;
  $('#sBody').onclick = async e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    const s = SS.rows.find(r => r.id === t.dataset.id);
    if (t.dataset.a === 'edit') studentForm(s);
    if (t.dataset.a === 'paid') { try { await run(sb.from('students').update({ bus_paid: !s.bus_paid }).eq('id', s.id)); loadStudents(); } catch (er) { toast(errMsg(er), 'err'); } }
  };
  $('#sBody').onchange = e => { if (e.target.dataset.sel) { e.target.checked ? SS.sel.add(e.target.dataset.sel) : SS.sel.delete(e.target.dataset.sel); drawBulk(); } };
  loadStudents();
}

async function loadStudents() {
  const from = SS.page * SS.size;
  try {
    const [pg, paid] = await Promise.all([
      run(applyF(sb.from('student_details').select('*', { count: 'exact' })).order('route_num', { nullsFirst: false }).order('name').range(from, from + SS.size - 1)),
      run(applyF(sb.from('student_details').select('id', { count: 'exact', head: true })).eq('bus_paid', true))
    ]);
    SS.rows = pg.data; SS.total = pg.count; SS.paid = paid.count;
    if (!SS.rows.length && SS.page > 0) { SS.page = 0; return loadStudents(); }
    drawStudents();
  } catch (e) { toast(errMsg(e), 'err'); }
}

function drawStudents() {
  $('#sStats').innerHTML = [[SS.total, 'عدد الطلبة'], [SS.paid, 'مدفوع'], [SS.total - SS.paid, 'غير مدفوع']].map(([a, b]) => `<div class="stat"><b>${a}</b><span>${b}</span></div>`).join('');
  $('#sBody').innerHTML = SS.rows.map((s, i) => `<tr>
    <td class="hide-m"><input type="checkbox" data-sel="${s.id}" ${SS.sel.has(s.id) ? 'checked' : ''} aria-label="تحديد" style="width:auto"></td>
    <td class="hide-m">${SS.page * SS.size + i + 1}</td>
    <td class="full-m"><b>${esc(s.name)}</b></td>
    <td data-l="الصف"><span class="gr gr-${esc(s.grade)}">${esc(s.grade)}</span></td>
    <td data-l="العنوان" class="full-m">${esc(s.address) || '—'}</td>
    <td class="ph" data-l="الهاتف">${[s.phone1, s.phone2].filter(Boolean).map(p => `<a href="tel:${esc(p)}">${esc(p)}</a>`).join('<br>') || '—'}</td>
    <td data-l="حالة الاشتراك"><button class="tag ${s.bus_paid ? 'y' : 'n'}" data-a="paid" data-id="${s.id}" title="اضغط للتغيير">${s.bus_paid ? 'مدفوع' : 'غير مدفوع'}</button></td>
    <td class="full-m" data-l="الخط">${s.route_num ? `<b>${s.route_num} – ${esc(s.route_name)}</b><small>${[s.driver_name && 'سائق: ' + s.driver_name, s.supervisor_name && 'مشرفة: ' + s.supervisor_name, s.bus_plate && 'لوحة: ' + s.bus_plate].filter(Boolean).map(esc).join(' · ')}</small>` : '<span class="tag n">بدون خط</span>'}</td>
    <td class="full-m"><button class="btn ghost sm" data-a="edit" data-id="${s.id}" style="width:100%">تعديل</button></td></tr>`).join('');
  $('#sEmpty').hidden = SS.rows.length > 0;
  const pages = Math.max(1, Math.ceil(SS.total / SS.size));
  $('#sPager').innerHTML = `<button class="btn ghost sm" id="pPrev" ${SS.page === 0 ? 'disabled' : ''}>السابق</button><span>صفحة ${SS.page + 1} من ${pages}</span><button class="btn ghost sm" id="pNext" ${SS.page + 1 >= pages ? 'disabled' : ''}>التالي</button>
   <select id="pSize" aria-label="عدد الصفوف">${[25, 50, 100, 200].map(n => `<option ${n === SS.size ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  $('#pPrev').onclick = () => { SS.page--; loadStudents(); };
  $('#pNext').onclick = () => { SS.page++; loadStudents(); };
  $('#pSize').onchange = e => { SS.size = +e.target.value; SS.page = 0; loadStudents(); };
  const all = $('#sAll'); if (all) all.checked = SS.rows.length > 0 && SS.rows.every(r => SS.sel.has(r.id));
  drawBulk();
}

function drawBulk() {
  const b = $('#sBulk');
  if (!SS.sel.size) { b.innerHTML = ''; return; }
  b.innerHTML = `<div class="bulk"><b>${SS.sel.size} طالب محدد</b><select id="bRoute" aria-label="نقل إلى خط"><option value="">انقل إلى خط…</option><option value="none">بدون خط</option>${REF.routes.map(r => `<option value="${r.id}">${esc(routeLabel(r))}</option>`).join('')}</select>
  <button class="btn red" id="bGo">نقل</button><button class="btn ghost" id="bClr" style="color:inherit">إلغاء التحديد</button></div>`;
  $('#bClr').onclick = () => { SS.sel.clear(); drawStudents(); };
  $('#bGo').onclick = async () => {
    const v = $('#bRoute').value; if (!v) return toast('اختار الخط الأول', 'err');
    try { await run(sb.from('students').update({ route_id: v === 'none' ? null : v }).in('id', [...SS.sel])); toast('تم نقل ' + SS.sel.size + ' طالب'); SS.sel.clear(); loadStudents(); } catch (e) { toast(errMsg(e), 'err'); }
  };
}

function studentForm(s) {
  openForm({
    title: s ? 'تعديل بيانات الطالب' : 'إضافة طالب',
    values: s ? { ...s } : { grade: 'G1', route_id: SF.route_id && SF.route_id !== 'none' ? SF.route_id : '' },
    fields: [
      { k: 'name', label: 'اسم الطالب', req: true, full: true },
      { k: 'grade', label: 'الصف', type: 'select', req: true, opts: GRADES.map(g => [g, g]) },
      { k: 'route_id', label: 'خط السير', type: 'select', opts: [['', 'بدون خط'], ...REF.routes.map(r => [r.id, routeLabel(r)])] },
      { k: 'address', label: 'العنوان', full: true },
      { k: 'phone1', label: 'رقم الموبايل 1', type: 'tel' },
      { k: 'phone2', label: 'رقم الموبايل 2', type: 'tel' },
      { k: 'bus_paid', label: 'حالة الاشتراك: مدفوع', type: 'checkbox', full: true }
    ],
    onSave: async v => { v.route_id = v.route_id || null; await run(s ? sb.from('students').update(v).eq('id', s.id) : sb.from('students').insert(v)); toast('تم الحفظ'); loadStudents(); },
    onDelete: s && (async () => { if (!confirm('حذف الطالب ' + s.name + '؟')) return false; await run(sb.from('students').delete().eq('id', s.id)); SS.sel.delete(s.id); toast('تم الحذف'); loadStudents(); return true; })
  });
}

async function printStudents() {
  toast('جاري تجهيز الكشف…');
  try {
    const rows = await fetchAll(() => applyF(sb.from('student_details').select('*')).order('route_num', { nullsFirst: false }).order('name'));
    const r = byId(REF.routes, SF.route_id);
    printSheet(r ? routeSheetMeta(r, rows) : { title: 'كشف الطلبة', rows, showRoute: true });
  } catch (e) { toast(errMsg(e), 'err'); }
}
function routeSheetMeta(r, rows) {
  return { title: `خط سير (${r.num}) ${r.name}`, rows, meta: [['السائق', byId(REF.drivers, r.driver_id)?.name], ['المشرفة', byId(REF.supervisors, r.supervisor_id)?.name], ['رقم اللوحة', byId(REF.buses, r.bus_id)?.plate]] };
}
