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
    <div class="cells"><button class="btn ghost sm" data-a="stu" data-id="${r.id}">عرض الطلبة</button><button class="btn ghost sm" data-a="print" data-id="${r.id}">طباعة الخط</button><button class="btn ghost sm" data-a="edit" data-id="${r.id}">تعديل</button></div></div>`).join('') || '<div class="empty">لا توجد خطوط. أضف أول خط سير.</div>'}</div>`;
  $('#rAdd').onclick = () => routeForm();
  m.onchange = async e => {
    const f = e.target.dataset.field; if (!f) return;
    try { await run(sb.from('routes').update({ [f]: e.target.value || null }).eq('id', e.target.dataset.id)); toast('تم الحفظ'); await loadRef(); } catch (er) { toast(errMsg(er), 'err'); }
  };
  m.onclick = async e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    const r = byId(REF.routes, t.dataset.id);
    if (t.dataset.a === 'edit') routeForm(r);
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
