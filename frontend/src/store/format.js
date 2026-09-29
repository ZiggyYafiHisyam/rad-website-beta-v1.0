export function rupiah(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

export function billingFormatClock(d) {
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function billingFormatDuration(sec) {
  if (sec < 0) sec = 0;
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return pad(h) + ':' + pad(m) + ':' + pad(s);
}

export function statShort(n) {
  if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1) + 'M';
  return 'Rp ' + Math.round(n / 1000) + 'K';
}

/* Signed money as the closing screens print it: -Rp 5.000 / +Rp 5.000 / Rp 0 */
export function signedRupiah(n) {
  return (n < 0 ? '-' : (n > 0 ? '+' : '')) + rupiah(Math.abs(n));
}
