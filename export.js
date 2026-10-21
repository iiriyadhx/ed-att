// Builds the Excel workbook from the rows returned by the adminExport endpoint.
// Works in the browser (global XLSX from SheetJS) and in Node (for testing).

(function (root) {
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const STATUS_LABEL = { CONFIRMED: 'Confirmed', VOIDED: 'Voided' };
  const LEVEL_ORDER = { R1: 1, R2: 2, R3: 3, R4: 4 };

  function weekday(date) { return WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()]; }

  function buildWorkbook(XLSX, data) {
    const rows = data.rows || [];
    const confirmed = rows.filter(r => r.status === 'CONFIRMED');
    const period = 'Period: ' + data.from + ' to ' + data.to;
    const title = (data.hospitalName || 'Emergency Department') + ' — Resident attendance';

    // Group confirmed attendance by person (normalised name key).
    const people = new Map();
    confirmed.forEach(r => {
      const p = people.get(r.nameKey) || { name: r.fullName, level: r.level, dates: [] };
      p.name = r.fullName; p.level = r.level; // latest spelling / level wins (rows are sorted by time)
      if (p.dates.indexOf(r.date) < 0) p.dates.push(r.date);
      people.set(r.nameKey, p);
    });
    const list = Array.from(people.values()).sort((a, b) =>
      (LEVEL_ORDER[a.level] || 9) - (LEVEL_ORDER[b.level] || 9) || a.name.localeCompare(b.name));
    const dates = Array.from(new Set(confirmed.map(r => r.date))).sort();

    // Sheet 1 — summary per resident.
    const summary = [
      [title], [period], [],
      ['#', 'Full name', 'Level', 'Days attended', 'Attendance dates']
    ];
    list.forEach((p, i) => summary.push([i + 1, p.name, p.level, p.dates.length, p.dates.slice().sort().join(', ')]));
    summary.push([]);
    summary.push(['', 'Total residents', list.length, 'Total records', confirmed.length]);
    ['R1', 'R2', 'R3', 'R4'].forEach(l => summary.push(['', l + ' residents', list.filter(p => p.level === l).length]));

    // Sheet 2 — full log (every record, including voided ones, so nothing is hidden).
    const log = [
      [title], [period], [],
      ['Date', 'Day', 'Time', 'Full name', 'Level', 'Status', 'Distance (m)', 'Accuracy (m)', 'Record ID', 'Notes']
    ];
    rows.forEach(r => log.push([r.date, weekday(r.date), r.time, r.fullName, r.level, STATUS_LABEL[r.status] || r.status,
      r.distance === '' ? '' : Number(r.distance), r.accuracy === '' ? '' : Number(r.accuracy), r.attendanceId,
      [r.flags, r.correctionRef].filter(Boolean).join(' ')]));

    // Sheet 3 — resident × date grid.
    const grid = [
      [title], [period], [],
      ['Full name', 'Level'].concat(dates.map(d => d + ' ' + weekday(d).slice(0, 3))).concat(['Total'])
    ];
    list.forEach(p => grid.push([p.name, p.level].concat(dates.map(d => p.dates.indexOf(d) >= 0 ? '✓' : '')).concat([p.dates.length])));
    grid.push(['Present', ''].concat(dates.map(d => list.filter(p => p.dates.indexOf(d) >= 0).length)).concat(['']));

    const wb = XLSX.utils.book_new();
    const s1 = XLSX.utils.aoa_to_sheet(summary);
    s1['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 60 }];
    const s2 = XLSX.utils.aoa_to_sheet(log);
    s2['!cols'] = [{ wch: 12 }, { wch: 11 }, { wch: 10 }, { wch: 32 }, { wch: 8 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 28 }, { wch: 30 }];
    const s3 = XLSX.utils.aoa_to_sheet(grid);
    s3['!cols'] = [{ wch: 32 }, { wch: 8 }].concat(dates.map(() => ({ wch: 15 }))).concat([{ wch: 8 }]);
    s2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: Math.max(3, log.length - 1), c: 9 } }) };

    XLSX.utils.book_append_sheet(wb, s1, 'Summary');
    XLSX.utils.book_append_sheet(wb, s2, 'Attendance log');
    XLSX.utils.book_append_sheet(wb, s3, 'Daily grid');
    wb.Workbook = { Views: [{ RTL: false }] };
    return wb;
  }

  const api = { buildWorkbook: buildWorkbook, weekday: weekday };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AttendanceExport = api;
})(this);
