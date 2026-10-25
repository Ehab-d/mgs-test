/* شاشة خطوط السير: ربط كل خط بالسائق والمشرفة والباص */
async function showRoutes() {
  await loadRef();
  const counts = {};
  try { const { data } = await run(sb.from('students').select('route_id').not('route_id', 'is', null).limit(20000)); data.forEach(x => counts[x.route_id] = (counts[x.route_id] || 0) + 1); } catch (e) { toast(errMsg(e), 'err'); }
  const m = $('#main');
  const pick = (list, label, cur, field, id, none) => `<label>${none}<select data-id="${id}" data-field="${field}"><option value="">— غير محدد —</option>${optsOf(list, label, cur).map(([v, t]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  m.innerHTML = `<div class="head"><h2>خطوط السير (${REF.routes.length})</h2><span class="sp"></span><button class="btn red" id="rAdd">+ إضافة خط سير</button></div>
  <div class="rgrid">${REF.routes.map((r, i) => `<div class="rc" style="--i:${i}">
    <div class="rt"><span class="n">${r.num}</span><div><h3>${esc(r.name)}</h3><small>${counts[r.id] || 0} طالب</small></div></div>
    ${pick(REF.drivers, d => d.name, r.driver_id, 'driver_id', r.id, 'السائق')}
    ${pick(REF.supervisors, s => s.name, r.supervisor_id, 'supervisor_id', r.id, 'المشرفة')}
    ${pick(REF.buses, b => 'لوحة ' + b.plate, r.bus_id, 'bus_id', r.id, 'الباص')}
    <div class="cells"><button class="btn red sm" data-a="open" data-id="${r.id}">فتح الخط وإضافة طلبة</button><button class="btn ghost sm" data-a="stu" data-id="${r.id}">عرض الطلبة</button><button class="btn ghost sm" data-a="print" data-id="${r.id}">طباعة الخط</button><button class="btn ghost sm" data-a="edit" data-id="${r.id}">تعديل</button></div></div>`).join('') || '<div class="empty">لا توجد خطوط. أضف أول خط سير.</div>'}</div>`;
  $('#rAdd').onclick = () => routeForm();
  m.onchange = async e => {
    const f = e.target.dataset.field; if (!f) return;
    try { await run(sb.from('routes').update({ [f]: e.target.value || null }).eq('id', e.target.dataset.id)); toast('تم الحفظ'); await loadRef(); } catch (er) { toast(errMsg(er), 'err'); }
  };
  m.onclick = async e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    const r = byId(REF.routes, t.dataset.id);
    if (t.dataset.a === 'edit') routeForm(r);
    if (t.dataset.a === 'open') openRouteView(r.id);
    if (t.dataset.a === 'stu') { Object.keys(SF).forEach(k => SF[k] = ''); SF.route_id = r.id; SS.page = 0; go('students'); }
    if (t.dataset.a === 'print') {
      try { const rows = await fetchAll(() => sb.from('student_details').select('*').eq('route_id', r.id).order('name')); printSheet(routeSheetMeta(r, rows)); } catch (er) { toast(errMsg(er), 'err'); }
    }
  };
}
function routeForm(r) {
  openForm({
    title: r ? 'تعديل خط السير' : 'إضافة خط سير',
    values: r || { num: Math.max(0, ...REF.routes.map(x => x.num)) + 1 },
    fields: [
      { k: 'num', label: 'رقم الخط', type: 'number', req: true },
      { k: 'name', label: 'اسم الخط', req: true, ph: 'مثال: عبير لاند – جنة مصر' },
      { k: 'driver_id', label: 'السائق', type: 'select', full: true, opts: [['', '— غير محدد —'], ...optsOf(REF.drivers, d => d.name, r?.driver_id)] },
      { k: 'supervisor_id', label: 'المشرفة', type: 'select', opts: [['', '— غير محدد —'], ...optsOf(REF.supervisors, s => s.name, r?.supervisor_id)] },
      { k: 'bus_id', label: 'الباص', type: 'select', opts: [['', '— غير محدد —'], ...optsOf(REF.buses, b => 'لوحة ' + b.plate, r?.bus_id)] }
    ],
    onSave: async v => { ['driver_id', 'supervisor_id', 'bus_id'].forEach(k => v[k] = v[k] || null); await run(r ? sb.from('routes').update(v).eq('id', r.id) : sb.from('routes').insert(v)); toast('تم الحفظ'); showRoutes(); },
    onDelete: r && (async () => { if (!confirm('حذف الخط؟ الطلبة هيفضلوا موجودين لكن "بدون خط".')) return false; await run(sb.from('routes').delete().eq('id', r.id)); toast('تم الحذف'); showRoutes(); return true; })
  });
}

/* ===== فتح خط: الطلبة جوا الخط + إضافة وتسكين مباشر ===== */
const RV = { id: null, rows: [], q: '' };
const rvFetch = () => fetchAll(() => sb.from('student_details').select('*').eq('route_id', RV.id).order('name'));
async function refreshRV() { try { RV.rows = await rvFetch(); drawRV(); } catch (e) { toast(errMsg(e), 'err'); } }

async function openRouteView(id) {
  RV.id = id; RV.q = '';
  await loadRef();
  const r = byId(REF.routes, id); if (!r) return showRoutes();
  const m = $('#main'); m.onclick = m.onchange = null;
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  try { RV.rows = await rvFetch(); } catch (e) { toast(errMsg(e), 'err'); return showRoutes(); }
  scrollTo({ top: 0 });
  m.innerHTML = `<div class="head"><button class="btn ghost" id="rvBack">→ كل الخطوط</button><h2>خط سير (${r.num}) ${esc(r.name)}</h2><span class="sp"></span>
    <button class="btn ghost" id="rvPrint">طباعة</button><button class="btn ghost" id="rvPick">تسكين طالب موجود</button><button class="btn red" id="rvAdd">+ إضافة طالب للخط</button></div>
  <div class="stats" id="rvInfo"></div>
  <div class="bar one"><label>بحث داخل الخط<input id="rvQ" type="search" placeholder="اسم / هاتف / عنوان"></label></div>
  <div class="wrap"><table><thead><tr><th class="hide-m">م</th><th>الطالب</th><th>الصف</th><th>العنوان</th><th>الهاتف</th><th>حالة الاشتراك</th><th></th></tr></thead><tbody id="rvBody"></tbody></table><div id="rvEmpty" class="empty" hidden>مفيش طلاب في الخط ده لسه. اضغط "إضافة طالب للخط".</div></div>`;
  $('#rvBack').onclick = showRoutes;
  $('#rvAdd').onclick = () => studentForm(null, { route_id: RV.id, after: refreshRV });
  $('#rvPick').onclick = pickStudents;
  $('#rvPrint').onclick = () => printSheet(routeSheetMeta(byId(REF.routes, RV.id), RV.rows));
  $('#rvQ').oninput = e => { RV.q = e.target.value; drawRV(); };
  $('#rvBody').onclick = async e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    const s = RV.rows.find(x => x.id === t.dataset.id);
    try {
      if (t.dataset.a === 'edit') studentForm(s, { route_id: RV.id, after: refreshRV });
      if (t.dataset.a === 'paid') { await run(sb.from('students').update({ bus_paid: !s.bus_paid }).eq('id', s.id)); refreshRV(); }
      if (t.dataset.a === 'out' && confirm('إخراج ' + s.name + ' من الخط؟ (هيفضل موجود بدون خط)')) { await run(sb.from('students').update({ route_id: null }).eq('id', s.id)); toast('تم الإخراج من الخط'); refreshRV(); }
    } catch (er) { toast(errMsg(er), 'err'); }
  };
  drawRV();
}

function drawRV() {
  const r = byId(REF.routes, RV.id); if (!r || !$('#rvBody')) return;
  const paid = RV.rows.filter(x => x.bus_paid).length;
  $('#rvInfo').innerHTML = [[RV.rows.length, 'عدد الطلبة'], [paid, 'مدفوع'], [RV.rows.length - paid, 'غير مدفوع'], [byId(REF.drivers, r.driver_id)?.name || '—', 'السائق'], [byId(REF.supervisors, r.supervisor_id)?.name || '—', 'المشرفة'], [byId(REF.buses, r.bus_id)?.plate || '—', 'لوحة الباص']]
    .map(([a, b]) => `<div class="stat"><b style="font-size:${typeof a === 'number' ? '1.35rem' : '1rem'}">${esc(a)}</b><span>${b}</span></div>`).join('');
  const t = RV.q.trim();
  const L = t ? RV.rows.filter(x => [x.name, x.phone1, x.phone2, x.address].join(' ').includes(t)) : RV.rows;
  $('#rvBody').innerHTML = L.map((s, i) => `<tr>
    <td class="hide-m">${i + 1}</td><td class="full-m"><b>${esc(s.name)}</b></td>
    <td data-l="الصف"><span class="gr gr-${esc(s.grade)}">${esc(s.grade)}</span></td>
    <td data-l="العنوان" class="full-m">${esc(s.address) || '—'}</td>
    <td class="ph" data-l="الهاتف">${[s.phone1, s.phone2].filter(Boolean).map(p => `<a href="tel:${esc(p)}">${esc(p)}</a>`).join('<br>') || '—'}</td>
    <td data-l="حالة الاشتراك"><button class="tag ${s.bus_paid ? 'y' : 'n'}" data-a="paid" data-id="${s.id}" title="اضغط للتغيير">${s.bus_paid ? 'مدفوع' : 'غير مدفوع'}</button></td>
    <td class="full-m"><div class="cells"><button class="btn ghost sm" data-a="edit" data-id="${s.id}">تعديل</button><button class="btn ghost sm" data-a="out" data-id="${s.id}">إخراج من الخط</button></div></td></tr>`).join('');
  $('#rvEmpty').hidden = L.length > 0;
}

/* تسكين طالب موجود (غير مسكّن) في الخط المفتوح */
function pickStudents() {
  const d = document.createElement('dialog');
  d.innerHTML = `<form onsubmit="return false"><h3>تسكين طالب موجود في الخط</h3>
    <label class="full">ابحث عن طالب بدون خط<input id="pkQ" type="search" placeholder="اسم / هاتف"></label>
    <div class="full" id="pkList"></div><div class="acts"><button type="button" class="btn ghost" data-x>إغلاق</button></div></form>`;
  document.body.append(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  d.querySelector('[data-x]').onclick = () => d.close();
  const list = d.querySelector('#pkList'); let timer;
  async function load() {
    const t = d.querySelector('#pkQ').value.replace(/[,()%*\\]/g, ' ').trim();
    let q = sb.from('students').select('id,name,grade').is('route_id', null).order('name').limit(30);
    if (t) q = q.or(`name.ilike.%${t}%,phone1.ilike.%${t}%,phone2.ilike.%${t}%`);
    try {
      const { data } = await run(q);
      list.innerHTML = data.map(s => `<div class="pk"><span class="gr gr-${esc(s.grade)}">${esc(s.grade)}</span><b>${esc(s.name)}</b><button class="btn red sm" data-id="${s.id}">إضافة للخط</button></div>`).join('') || '<div class="empty">مفيش طلاب بدون خط بالبحث ده</div>';
    } catch (e) { toast(errMsg(e), 'err'); }
  }
  d.querySelector('#pkQ').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 300); };
  list.onclick = async e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    b.disabled = true;
    try { await run(sb.from('students').update({ route_id: RV.id }).eq('id', b.dataset.id)); toast('تمت الإضافة للخط'); await refreshRV(); load(); } catch (er) { toast(errMsg(er), 'err'); b.disabled = false; }
  };
  load();
}
