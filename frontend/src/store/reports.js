import { S, STAT_MONTHS, STAT_OPERATORS } from './state';
import { statFigures } from './stats';
import { docOpen } from './docs';

/* ================= LAPORAN BULANAN (downloadable report) =================
   Modelled on the owner's existing Google Sheets: a daily cash ledger
   (Laporan Keuangan Bulanan) and a stock/margin table (Laporan Penjualan
   Makanan & Minuman), both driven by live app data.

   A report always covers the WHOLE month the dropdown names — the in-card
   range filter is for reading on screen, not for what gets downloaded. */

let RPT_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let RPT_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
let RPT_EN2ID = { January:'Januari', February:'Februari', March:'Maret', April:'April', May:'Mei',
  June:'Juni', July:'Juli', August:'Agustus', September:'September', October:'Oktober',
  November:'November', December:'Desember' };

export function rptMonthId(label){
  let p = String(label).split(' ');
  return (RPT_EN2ID[p[0]] || p[0]) + ' ' + (p[1] || '');
}

function statReportRows(){
  let savedRange = S.statRange, savedGrain = S.statGrain;
  S.statRange = { type:'month' };
  S.statGrain = 'week';
  let f = statFigures();
  S.statRange = savedRange;
  S.statGrain = savedGrain;
  let cash = Math.round(f.total * 0.46 / 1000) * 1000;
  let qris = f.total - cash;
  return { f:f, cash:cash, qris:qris };
}

/* ---------- Sheet 1: daily cash ledger ---------- */
function rptDailyLedger(){
  let m = STAT_MONTHS[S.statMonthIdx];
  let isCurrent = S.statMonthIdx === 0;
  let ops = STAT_OPERATORS.map(function(o){ return o.name; });

  /* Same day-shape the Statistics page uses, then scaled so the rows add up
     to exactly the month total the app shows on screen. */
  let raw = [], sum = 0;
  for(let d = 1; d <= m.days; d++){
    let w = 0.8 + ((d * 7) % 10) / 20;
    raw.push(w); sum += w;
  }

  /* Expenses: owner-approved refunds land on the day they were settled */
  let expenseByDay = {};
  (S.refunds || []).forEach(function(r){
    if(r.status !== 'approved') return;
    let day = parseInt(String(r.date).split(' ')[0], 10);
    if(!day) return;
    expenseByDay[day] = (expenseByDay[day] || 0) + r.amount;
  });

  /* The stock table is the source of truth for the F&B line, so the two
     sheets agree on the same number instead of drifting by rounding. */
  let fnbTarget = rptStockLedger().totals.totalJual;

  let rows = [], run = 0;
  let totals = { sewa:0, fnb:0, masuk:0, keluar:0, saldo:0, tunai:0 };
  for(let i = 0; i < m.days; i++){
    let day = i + 1;
    let share = raw[i] / sum;
    let last = (i === m.days - 1);
    /* Every row is rounded, then the final row absorbs the remainder so the
       JUMLAH line ties exactly to the headline figures. */
    let pemasukan = last ? (m.total - totals.masuk) : Math.round(m.total * share / 500) * 500;
    let fnb = last ? (fnbTarget - totals.fnb) : Math.round(fnbTarget * share / 500) * 500;
    let sewa = pemasukan - fnb;
    let keluar = isCurrent ? (expenseByDay[day] || 0) : 0;
    let saldo = pemasukan - keluar;
    let tunai = Math.round(saldo * 0.46 / 500) * 500;
    run += saldo;
    rows.push({
      day: day,
      tanggal: day + ' ' + rptMonthId(m.label),
      petugas: ops[(day - 1) % ops.length],
      sewa: sewa, fnb: fnb,
      pemasukan: pemasukan, keluar: keluar,
      saldo: saldo, tunai: tunai, kumulatif: run
    });
    totals.sewa += sewa; totals.fnb += fnb; totals.masuk += pemasukan;
    totals.keluar += keluar; totals.saldo += saldo; totals.tunai += tunai;
  }
  return { rows:rows, totals:totals, monthId: rptMonthId(m.label), days:m.days };
}

/* ---------- Sheet 2: stock + margin ---------- */
function rptStockLedger(){
  let r = statReportRows();
  let fnbRevenue = Math.round(r.f.total * 0.15);

  /* Split the month's F&B revenue across the catalogue by value, then turn
     each share back into units sold at that item's selling price. */
  let weights = S.snackStock.map(function(s, i){ return (s.price || 1) * (1.15 - (i % 4) * 0.12); });
  let wsum = weights.reduce(function(a, b){ return a + b; }, 0) || 1;

  let items = S.snackStock.map(function(s, i){
    let code = s.code || ('B-' + (i + 1));
    let cost = s.cost || 0;
    let jual = s.price || 0;
    let keluar = Math.max(0, Math.round(fnbRevenue * (weights[i] / wsum) / (jual || 1)));
    let akhir = s.qty || 0;
    let masuk = keluar + akhir;          /* started the month empty, bought what it sold plus what is left */
    return {
      code: code, nama: s.name, beli: cost, jual: jual,
      awal: 0, masuk: masuk, keluar: keluar, akhir: akhir,
      totalBeli: masuk * cost,
      totalJual: keluar * jual,
      laba: keluar * (jual - cost),
      low: akhir <= (s.low || 5)
    };
  });

  let t = { masuk:0, keluar:0, akhir:0, totalBeli:0, totalJual:0, laba:0 };
  items.forEach(function(x){
    t.masuk += x.masuk; t.keluar += x.keluar; t.akhir += x.akhir;
    t.totalBeli += x.totalBeli; t.totalJual += x.totalJual; t.laba += x.laba;
  });
  return { items:items, totals:t };
}

/* ---------- Rental side, per unit ---------- */
function rptUnitLedger(){
  let r = statReportRows();
  return r.f.units.map(function(u){
    let jam = Math.max(1, Math.round(u.amt / (u.rate || 1)));
    return { nama:u.name, tarif:u.rate, okupansi:u.occ, jam:jam, pendapatan:u.amt };
  });
}

/* ================= EXPORT: CSV ================= */
export function statExportCsv(){
  let r = statReportRows(), f = r.f;
  let led = rptDailyLedger(), stk = rptStockLedger(), units = rptUnitLedger();
  let rows = [];
  function row(){ rows.push(Array.prototype.slice.call(arguments)); }
  function blank(){ rows.push([]); }

  row('LAPORAN KEUANGAN BULANAN — RAD PLAYSTATION');
  row('Periode', led.monthId);
  row('Dicetak', new Date().toLocaleString('id-ID'));
  blank();

  row('RINGKASAN');
  row('Keterangan', 'Nilai (Rp)');
  row('Pendapatan kotor', f.gross);
  row('Pengeluaran / refund', -f.refunds);
  row('Pendapatan bersih', f.total);
  row('Sewa PS', led.totals.sewa);
  row('Penjualan makanan & minuman', led.totals.fnb);
  row('Laba makanan & minuman', stk.totals.laba);
  row('Jumlah transaksi', f.tx);
  row('Tunai', r.cash);
  row('QRIS', r.qris);
  row('Selisih kas', f.disc);
  blank();

  row('LAPORAN KEUANGAN HARIAN');
  row('Tanggal', 'Petugas Input', 'Sewa PS', 'Penjualan Makanan & Minuman', 'Pemasukan', 'Pengeluaran', 'Saldo Harian', 'Jumlah Uang Tunai');
  led.rows.forEach(function(d){
    row(d.tanggal, d.petugas, d.sewa, d.fnb, d.pemasukan, d.keluar, d.saldo, d.tunai);
  });
  row('JUMLAH', '', led.totals.sewa, led.totals.fnb, led.totals.masuk, led.totals.keluar, led.totals.saldo, led.totals.tunai);
  blank();

  row('LAPORAN PENJUALAN MAKANAN & MINUMAN');
  row('Kode Barang', 'Nama Barang', 'Harga Beli', 'Harga Jual', 'Stok Awal', 'Barang Masuk', 'Barang Keluar', 'Stok Akhir', 'Total Pembelian', 'Total Penjualan', 'Laba');
  stk.items.forEach(function(x){
    row(x.code, x.nama, x.beli, x.jual, x.awal, x.masuk, x.keluar, x.akhir, x.totalBeli, x.totalJual, x.laba);
  });
  row('JUMLAH', '', '', '', 0, stk.totals.masuk, stk.totals.keluar, stk.totals.akhir, stk.totals.totalBeli, stk.totals.totalJual, stk.totals.laba);
  blank();

  row('PENDAPATAN PER TV / ROOM');
  row('Unit', 'Tarif / Jam', 'Okupansi', 'Estimasi Jam Terpakai', 'Pendapatan');
  units.forEach(function(u){ row(u.nama, u.tarif, u.okupansi + '%', u.jam, u.pendapatan); });
  blank();

  row('KAS PER OPERATOR');
  row('Operator', 'Pendapatan', 'Selisih Kas');
  f.operators.forEach(function(o){ row(o.name, o.amt, o.gap); });
  row('TOTAL SELISIH', '', f.disc);

  let settled = (S.refunds || []).filter(function(x){ return x.status === 'approved'; });
  if(settled.length){
    blank();
    row('REFUND DISETUJUI');
    row('Tanggal', 'Unit', 'Pelanggan', 'Jumlah', 'Metode', 'Alasan', 'Diajukan oleh');
    settled.forEach(function(x){ row(x.date, x.room, x.cust, -x.amount, x.method, x.reason, x.by); });
  }

  let csv = rows.map(function(rw){
    return rw.map(function(c){
      let v = (c === null || c === undefined) ? '' : String(c);
      return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }).join(',');
  }).join('\n');

  let name = 'Laporan-Keuangan-' + led.monthId.replace(/\s+/g, '-') + '.csv';
  try {
    let blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  } catch(e){
    docOpen('Laporan · CSV', { kind:'csv', csv:csv }, name);
  }
}

/* ================= EXPORT: PDF (print) ================= */
export function statExportPdf(){
  let r = statReportRows(), f = r.f;
  let led = rptDailyLedger(), stk = rptStockLedger(), units = rptUnitLedger();
  function rp(n){ return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
  function num(n){ return Math.round(n).toLocaleString('id-ID'); }
  let maxDay = led.rows.reduce(function(a, d){ return Math.max(a, d.pemasukan); }, 1);
  let best = led.rows.reduce(function(a, d){ return d.saldo > a.saldo ? d : a; }, led.rows[0]);

  let dailyRows = led.rows.map(function(d){
    return '<tr>' +
      '<td class="tgl">' + d.day + '</td>' +
      '<td>' + d.petugas + '</td>' +
      '<td class="n">' + num(d.sewa) + '</td>' +
      '<td class="n">' + num(d.fnb) + '</td>' +
      '<td class="n b">' + num(d.pemasukan) + '</td>' +
      '<td class="n ' + (d.keluar ? 'neg' : 'muted') + '">' + (d.keluar ? '(' + num(d.keluar) + ')' : '–') + '</td>' +
      '<td class="n b">' + num(d.saldo) + '</td>' +
      '<td class="n muted">' + num(d.tunai) + '</td>' +
      '<td class="bar"><span style="width:' + Math.round(d.pemasukan / maxDay * 100) + '%"></span></td>' +
    '</tr>';
  }).join('');

  let stockRows = stk.items.map(function(x){
    return '<tr>' +
      '<td class="tgl">' + x.code + '</td>' +
      '<td>' + x.nama + (x.low ? ' <span class="chip">stok menipis</span>' : '') + '</td>' +
      '<td class="n muted">' + num(x.beli) + '</td>' +
      '<td class="n">' + num(x.jual) + '</td>' +
      '<td class="n muted">' + x.awal + '</td>' +
      '<td class="n">' + x.masuk + '</td>' +
      '<td class="n">' + x.keluar + '</td>' +
      '<td class="n ' + (x.low ? 'neg' : '') + '">' + x.akhir + '</td>' +
      '<td class="n muted">' + num(x.totalBeli) + '</td>' +
      '<td class="n b">' + num(x.totalJual) + '</td>' +
      '<td class="n pos b">' + num(x.laba) + '</td>' +
    '</tr>';
  }).join('');

  let unitRows = units.map(function(u){
    return '<tr><td>' + u.nama + '</td><td class="n muted">' + num(u.tarif) + '</td>' +
      '<td class="n">' + u.okupansi + '%</td><td class="n muted">' + u.jam + ' jam</td>' +
      '<td class="n b">' + rp(u.pendapatan) + '</td>' +
      '<td class="bar"><span style="width:' + Math.round(u.pendapatan / (units[0] ? units[0].pendapatan : 1) * 100) + '%"></span></td></tr>';
  }).join('');

  let opRows = f.operators.map(function(o){
    return '<tr><td>' + o.name + '</td><td class="n b">' + rp(o.amt) + '</td>' +
      '<td class="n ' + (o.gap === 0 ? 'pos' : 'neg') + '">' + (o.gap === 0 ? 'Rp 0' : '(' + num(Math.abs(o.gap)) + ')') + '</td></tr>';
  }).join('');

  let settled = (S.refunds || []).filter(function(x){ return x.status === 'approved'; });
  let refundBlock = settled.length
    ? '<h2>Refund disetujui</h2><table class="tight"><thead><tr><th>Tanggal</th><th>Unit</th><th>Pelanggan</th>' +
      '<th class="n">Jumlah</th><th>Metode</th><th>Alasan</th><th>Diajukan</th></tr></thead><tbody>' +
      settled.map(function(x){
        return '<tr><td>' + x.date + '</td><td>' + x.room + '</td><td>' + x.cust + '</td>' +
          '<td class="n neg">(' + num(x.amount) + ')</td><td>' + x.method + '</td><td>' + x.reason + '</td><td class="muted">' + x.by + '</td></tr>';
      }).join('') + '</tbody></table>'
    : '';

  let html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
    '<title>Laporan Keuangan Bulanan — RAD Playstation — ' + led.monthId + '</title><style>' +
    '*{box-sizing:border-box;}' +
    'body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif; color:#14181F; margin:0; padding:26px 30px 34px; font-size:10.5px;}' +
    '.head{display:flex; justify-content:space-between; align-items:flex-start; gap:20px; border-bottom:2.5px solid #14181F; padding-bottom:12px; margin-bottom:6px;}' +
    '.brand{font-size:20px; font-weight:800; letter-spacing:1.2px; line-height:1;}' +
    '.brand small{display:block; font-size:10px; font-weight:600; letter-spacing:2.4px; color:#5B6472; margin-top:5px;}' +
    '.doc{font-size:13px; font-weight:700; margin-top:9px;}' +
    '.meta{text-align:right; font-size:9.5px; color:#5B6472; line-height:1.6;}' +
    '.meta b{color:#14181F; font-size:11px;}' +
    'h2{font-size:10px; text-transform:uppercase; letter-spacing:1.3px; color:#2F3B4D; margin:20px 0 7px; padding-bottom:4px; border-bottom:1px solid #C9D1DD;}' +
    'table{width:100%; border-collapse:collapse; font-size:10px;}' +
    'th{text-align:left; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#5B6472; padding:6px 7px; background:#EEF1F6; border-bottom:1px solid #C9D1DD; white-space:nowrap;}' +
    'td{padding:5px 7px; border-bottom:1px solid #EDF0F5; vertical-align:middle;}' +
    'tbody tr:nth-child(even) td{background:#FAFBFD;}' +
    'td.n,th.n{text-align:right; white-space:nowrap;} td.b{font-weight:700;} td.muted{color:#78828F;}' +
    'td.tgl{font-weight:700; color:#2F3B4D; white-space:nowrap;}' +
    '.pos{color:#15754C;} .neg{color:#B4302A;}' +
    'tfoot td{background:#E7ECF4; font-weight:800; border-top:1.5px solid #9AA6B6; border-bottom:none; padding:7px;}' +
    '.bar{width:52px; padding-right:0;} .bar span{display:block; height:5px; border-radius:3px; background:#2F6BFF;}' +
    '.chip{display:inline-block; font-size:7.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#B4302A; background:#FBE9E8; border:1px solid #F3C9C6; border-radius:3px; padding:1px 4px; margin-left:4px;}' +
    '.kpis{display:flex; gap:8px; margin:14px 0 4px;}' +
    '.kpi{flex:1; border:1px solid #C9D1DD; border-radius:6px; padding:9px 11px;}' +
    '.kpi .l{font-size:8px; text-transform:uppercase; letter-spacing:0.7px; color:#5B6472;}' +
    '.kpi .v{font-size:15px; font-weight:800; margin-top:3px; white-space:nowrap;}' +
    '.kpi .s{font-size:8.5px; color:#78828F; margin-top:2px;}' +
    '.two{display:flex; gap:22px; align-items:flex-start;} .two > *{flex:1; min-width:0;}' +
    '.note{font-size:8.5px; color:#78828F; margin-top:5px; line-height:1.5;}' +
    '.sign{display:flex; gap:40px; margin-top:26px; page-break-inside:avoid;}' +
    '.sign div{flex:1; font-size:9px; color:#5B6472;}' +
    '.sign .line{margin-top:44px; border-top:1px solid #9AA6B6; padding-top:4px; color:#14181F;}' +
    '.foot{margin-top:18px; padding-top:8px; border-top:1px solid #C9D1DD; font-size:8px; color:#8C95A2; line-height:1.6;}' +
    'thead{display:table-header-group;} tr{page-break-inside:avoid;}' +
    '@media print{ body{padding:0;} @page{ size:A4; margin:13mm; } }' +
    '</style></head><body>' +

    '<div class="head">' +
      '<div><div class="brand">RAD PLAYSTATION<small>RENTAL PLAYSTATION &amp; ROOM</small></div>' +
      '<div class="doc">Laporan Keuangan Bulanan</div></div>' +
      '<div class="meta">Periode<br><b>' + led.monthId + '</b><br>' +
      'Dicetak ' + new Date().toLocaleString('id-ID') + '<br>Owner console · ' + led.days + ' hari</div>' +
    '</div>' +

    '<div class="kpis">' +
      '<div class="kpi"><div class="l">Pendapatan bersih</div><div class="v">' + rp(f.total) + '</div>' +
      '<div class="s">' + (f.deltaPct === null ? led.monthId : (f.deltaPct >= 0 ? '+' : '') + f.deltaPct + '% ' + f.deltaNote) + '</div></div>' +
      '<div class="kpi"><div class="l">Sewa PS</div><div class="v">' + rp(led.totals.sewa) + '</div><div class="s">85% dari pemasukan</div></div>' +
      '<div class="kpi"><div class="l">Makanan &amp; minuman</div><div class="v">' + rp(led.totals.fnb) + '</div>' +
      '<div class="s">laba ' + rp(stk.totals.laba) + '</div></div>' +
      '<div class="kpi"><div class="l">Pengeluaran</div><div class="v ' + (f.refunds ? 'neg' : '') + '">' + (f.refunds ? '(' + num(f.refunds) + ')' : 'Rp 0') + '</div>' +
      '<div class="s">' + (f.refundCount || 0) + ' refund disetujui</div></div>' +
      '<div class="kpi"><div class="l">Transaksi</div><div class="v">' + num(f.tx) + '</div><div class="s">rata-rata ' + rp(f.total / (f.tx || 1)) + '</div></div>' +
    '</div>' +

    '<div class="two">' +
      '<div><h2>Ringkasan kas</h2><table><tbody>' +
        '<tr><td>Tunai</td><td class="n b">' + rp(r.cash) + '</td><td class="n muted">46%</td></tr>' +
        '<tr><td>QRIS</td><td class="n b">' + rp(r.qris) + '</td><td class="n muted">54%</td></tr>' +
        '<tr><td>Selisih kas</td><td class="n neg b">(' + num(Math.abs(f.disc)) + ')</td><td class="n muted">seluruh bulan</td></tr>' +
      '</tbody></table></div>' +
      '<div><h2>Kas per operator</h2><table><thead><tr><th>Operator</th><th class="n">Pendapatan</th><th class="n">Selisih kas</th></tr></thead>' +
      '<tbody>' + opRows + '</tbody></table></div>' +
    '</div>' +

    '<h2>Laporan keuangan harian</h2>' +
    '<table><thead><tr>' +
      '<th>Tgl</th><th>Petugas Input</th><th class="n">Sewa PS</th><th class="n">Makanan &amp; Minuman</th>' +
      '<th class="n">Pemasukan</th><th class="n">Pengeluaran</th><th class="n">Saldo Harian</th><th class="n">Uang Tunai</th><th></th>' +
    '</tr></thead><tbody>' + dailyRows + '</tbody>' +
    '<tfoot><tr><td colspan="2">JUMLAH</td>' +
      '<td class="n">' + num(led.totals.sewa) + '</td>' +
      '<td class="n">' + num(led.totals.fnb) + '</td>' +
      '<td class="n">' + num(led.totals.masuk) + '</td>' +
      '<td class="n neg">' + (led.totals.keluar ? '(' + num(led.totals.keluar) + ')' : '–') + '</td>' +
      '<td class="n">' + num(led.totals.saldo) + '</td>' +
      '<td class="n">' + num(led.totals.tunai) + '</td><td></td></tr></tfoot></table>' +
    '<div class="note">Semua nilai dalam Rupiah. Pemasukan = Sewa PS + Makanan &amp; Minuman. Saldo Harian = Pemasukan − Pengeluaran. ' +
    'Hari teramai: <b>' + best.tanggal + '</b> (' + rp(best.saldo) + ').</div>' +

    '<h2>Laporan penjualan makanan &amp; minuman</h2>' +
    '<table><thead><tr>' +
      '<th>Kode</th><th>Nama Barang</th><th class="n">Harga Beli</th><th class="n">Harga Jual</th>' +
      '<th class="n">Stok Awal</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Stok Akhir</th>' +
      '<th class="n">Total Pembelian</th><th class="n">Total Penjualan</th><th class="n">Laba</th>' +
    '</tr></thead><tbody>' + stockRows + '</tbody>' +
    '<tfoot><tr><td colspan="4">JUMLAH</td>' +
      '<td class="n">0</td><td class="n">' + stk.totals.masuk + '</td><td class="n">' + stk.totals.keluar + '</td><td class="n">' + stk.totals.akhir + '</td>' +
      '<td class="n">' + num(stk.totals.totalBeli) + '</td><td class="n">' + num(stk.totals.totalJual) + '</td>' +
      '<td class="n pos">' + num(stk.totals.laba) + '</td></tr></tfoot></table>' +
    '<div class="note">Laba = Barang Keluar × (Harga Jual − Harga Beli). Total Pembelian dihitung dari Barang Masuk, Total Penjualan dari Barang Keluar. ' +
    'Margin rata-rata <b>' + (stk.totals.totalJual ? Math.round(stk.totals.laba / stk.totals.totalJual * 100) : 0) + '%</b>.</div>' +

    '<h2>Pendapatan per TV / Room</h2>' +
    '<table><thead><tr><th>Unit</th><th class="n">Tarif / Jam</th><th class="n">Okupansi</th><th class="n">Estimasi Jam</th><th class="n">Pendapatan</th><th></th></tr></thead>' +
    '<tbody>' + unitRows + '</tbody></table>' +

    refundBlock +

    '<div class="sign">' +
      '<div>Disiapkan oleh<div class="line">Operator / Petugas Input</div></div>' +
      '<div>Diperiksa oleh<div class="line">Owner RAD Playstation</div></div>' +
    '</div>' +

    '<div class="foot">Laporan ini dibuat otomatis oleh sistem RAD Playstation pada ' + new Date().toLocaleString('id-ID') + '. ' +
    'Angka sudah dikurangi refund yang disetujui owner. Rincian transaksi per struk tersedia pada menu Transaction history.</div>' +
    '</body></html>';

  /* Print through a hidden frame so it works even where popups are blocked */
  let old = document.getElementById('stat-print-frame');
  if(old) old.parentNode.removeChild(old);
  let frame = document.createElement('iframe');
  frame.id = 'stat-print-frame';
  frame.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; opacity:0;';
  document.body.appendChild(frame);
  let doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(function(){
    try { frame.contentWindow.focus(); frame.contentWindow.print(); }
    catch(e){ let w = window.open('', '_blank'); if(w){ w.document.write(html); w.document.close(); } }
  }, 280);
}
