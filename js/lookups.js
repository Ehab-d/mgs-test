/* السائقين / المشرفات / الباصات: شاشة إدارة واحدة بإعدادات مختلفة */
const LOOK = {
  drivers: {
    table: 'drivers', title: 'السائقين', one: 'سائق', link: 'driver_id', rkey: 'driver_id',
    fields: [{ k: 'name', label: 'اسم السائق', req: true, full: true }, { k: 'phone', label: 'رقم الموبايل', type: 'tel' }, { k: 'license_no', label: 'رقم الرخصة' }, { k: 'active', label: 'يعمل حاليًا', type: 'checkbox', full: true }],
    cols: [['الاسم', x => `<b>${esc(x.name)}</b>`, 'full-m'], ['الموبايل', x => x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : '—', 'ph'], ['الرخصة', x => esc(x.license_no) || '—', '']]
  },
  supervisors: {
    table: 'supervisors', title: 'المشرفات', one: 'مشرفة', link: 'supervisor_id', rkey: 'supervisor_id',
    fields: [{ k: 'name', label: 'اسم المشرفة', req: true, full: true }, { k: 'phone', label: 'رقم الموبايل', type: 'tel' }, { k: 'active', label: 'تعمل حاليًا', type: 'checkbox', full: true }],
    cols: [['الاسم', x => `<b>${esc(x.name)}</b>`, 'full-m'], ['الموبايل', x => x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : '—', 'ph']]
  },
  buses: {
    table: 'buses', title: 'الباصات', one: 'باص', link: null, rkey: 'bus_id',
    fields: [{ k: 'plate', label: 'رقم اللوحة (4 أرقام)', req: true, pattern: '[0-9]{4}', hint: '4 أرقام فقط' }, { k: 'capacity', label: 'عدد المقاعد', type: 'number' }, { k: 'active', label: 'يعمل حاليًا', type: 'checkbox', full: true }],
    cols: [['اللوحة', x => `<b dir="ltr">${esc(x.plate)}</b>`, ''], ['المقاعد', x => x.capacity ?? '—', '']]
  }
};

async function showLookup(key) {
  const c = LOOK[key];
  await loadRef();
  const counts = {};
  try { const { data } = await run(sb.from('students').select('route_id').not('route_id', 'is', null).limit(20000)); data.forEach(s => counts[s.route_id] = (counts[s.route_id] || 0) + 1); } catch (e) { toast(errMsg(e), 'err'); }
  const list = REF[key];
  const m = $('#main');
  m.innerHTML = `<div class="head"><h2>${c.title} (${list.length})</h2><span class="sp"></span><button class="btn red" id="lAdd">+ إضافة ${c.one}</button></div>
  <div class="wrap"><table><thead><tr>${c.cols.map(x => `<th>${x[0]}</th>`).join('')}<th>الخطوط</th><th>عدد الطلبة</th><th>الحالة</th><th></th></tr></thead><tbody>
  ${list.map(x => {
    const rs = REF.routes.filter(r => r[c.rkey] === x.id), n = rs.reduce((a, r) => a + (counts[r.id] || 0), 0);
    return `<tr class="${x.active ? '' : 'off'}">${c.cols.map(([l, f, cl]) => `<td data-l="${l}" class="${cl}">${f(x)}</td>`).join('')}
    <td data-l="الخطوط">${rs.map(r => `<span class="g">${r.num}</span>`).join(' ') || '—'}</td><td data-l="عدد الطلبة">${n}</td>
    <td data-l="الحالة"><span class="tag ${x.active ? 'y' : 'n'}">${x.active ? 'نشط' : 'متوقف'}</span></td>
    <td class="full-m"><div class="cells">${c.link ? `<button class="btn ghost sm" data-a="stu" data-id="${x.id}">عرض الطلبة</button>` : ''}<button class="btn ghost sm" data-a="edit" data-id="${x.id}">تعديل</button></div></td></tr>`;
  }).join('')}</tbody></table>${list.length ? '' : `<div class="empty">لا توجد بيانات. أضف ${c.one}.</div>`}</div>`;
  $('#lAdd').onclick = () => lookupForm(key);
  m.onclick = e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    if (t.dataset.a === 'edit') lookupForm(key, byId(list, t.dataset.id));
    if (t.dataset.a === 'stu') { Object.keys(SF).forEach(k => SF[k] = ''); SF[c.link] = t.dataset.id; SS.page = 0; go('students'); }
  };
}

function lookupForm(key, x) {
  const c = LOOK[key];
  openForm({
    title: x ? `تعديل ${c.one}` : `إضافة ${c.one}`,
    values: x || { active: true }, fields: c.fields,
    onSave: async v => { await run(x ? sb.from(c.table).update(v).eq('id', x.id) : sb.from(c.table).insert(v)); toast('تم الحفظ'); showLookup(key); },
    onDelete: x && (async () => {
      if (!confirm(`حذف ${c.one}؟ الخطوط المرتبطة هتفضل موجودة لكن بدون ${c.one}. (لو مجرد توقف عن العمل، الأفضل تلغي "يعمل حاليًا")`)) return false;
      await run(sb.from(c.table).delete().eq('id', x.id)); toast('تم الحذف'); showLookup(key); return true;
    })
  });
}
