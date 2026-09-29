import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useStore, bookAndPay, custIdMode, custMemberCheck, showPage, rupiah, TV_SLOTS, tvIsAvailable, selectSlot, selectMethod,
  roomIdFromParam, selectRoom, custRateFor, liveRoomById, ROOM_META,
  tvGalleryShow, custSetField, tvCalcPrice, tvAddonTotal, tvAddonCount, tvActiveConsole, tvAddonFits, tvSetAddon,
  addonFree, pointsFor, memberHeadroom, MEMBER_POINT_CAP
} from '../../store';
import { Page, Phone } from '../../components/Phone';
import { IMG } from '../../assets/images';

const GALLERY = [IMG["lounge-room.jpg"], IMG["lounge-room-2.jpg"], IMG["lounge-room-3.jpg"]];
const CHIP_ON = { cursor: "pointer", color: "#0A0D14", background: "var(--blue-bright)", borderColor: "var(--blue-bright)" };
const CHIP_OFF = { cursor: "pointer" };

/* Add-on rows: only what fits this room (and the PS 5 upgrade, once picked) */
function TvAddonRows() {
  const S = useStore();
  const active = tvActiveConsole();
  const visible = [];
  S.addOns.forEach((a, i) => { if (tvAddonFits(a, active)) visible.push({ a:a, i:i }); });
  if (!visible.length) {
    return <div style={{ padding: "14px 13px", fontSize: "12px", color: "var(--text-faint)" }}>Belum ada add-on untuk ruangan ini.</div>;
  }
  return visible.map((v, n) => {
    const a = v.a, i = v.i, q = S.tvAddonQty[i] || 0, free = addonFree(a), sold = free === 0;
    return (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 13px", borderBottom: n === visible.length - 1 ? undefined : "1px solid var(--border)", opacity: sold ? "0.55" : undefined }}>
        <div style={{ flex: "1", minWidth: "0" }}>
          <div style={{ fontSize: "13px" }}>{a.name}</div>
          <div style={{ fontSize: "10.5px", marginTop: "3px", display: "flex", gap: "8px" }}>
            <span style={{ color: "var(--text-dim)" }}>+ {rupiah(a.price)}</span>
            {sold
              ? <span style={{ color: "var(--red)" }}>Habis untuk jam ini</span>
              : <span style={{ color: free <= 2 ? "var(--amber)" : "var(--text-faint)" }}>sisa {free}</span>}
          </div>
        </div>
        {sold
          ? <span className="pill off" style={{ whiteSpace: "nowrap" }}>Habis</span>
          : (
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <span onClick={() => tvSetAddon(i, -1)} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", lineHeight: "1", color: q ? "var(--text)" : "var(--text-faint)" }}>−</span>
              <span style={{ minWidth: "13px", textAlign: "center", fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: q ? "var(--blue-bright)" : "var(--text-faint)" }}>{q}</span>
              <span onClick={() => tvSetAddon(i, 1)} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid " + (q < free ? "rgba(95,178,255,0.5)" : "var(--border)"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", lineHeight: "1", color: q < free ? "var(--blue-bright)" : "var(--text-faint)" }}>+</span>
            </div>
          )}
      </div>
    );
  });
}

function CustMemberResult() {
  const S = useStore();
  if (S.custMemberResult === 'notfound') {
    return <div style={{ border: "1px solid rgba(255,92,122,0.35)", background: "rgba(255,92,122,0.08)", borderRadius: "9px", padding: "10px 11px", fontSize: "11.5px", color: "var(--red)" }}>Nomor ini belum terdaftar. Daftar dulu di counter — booking kamu tetap bisa lanjut sebagai tamu.</div>;
  }
  if (S.custMemberResult !== 'found' || !S.custMember) return null;
  const m = S.custMember;
  const full = memberHeadroom(m) === 0;
  return (
    <div style={{ border: "1px solid rgba(53,227,156,0.4)", background: "rgba(53,227,156,0.08)", borderRadius: "9px", padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "14px", color: "var(--green)" }}>{m.name}</span>
        <span className="pill available" style={{ fontSize: "10px" }}>{m.points} / {MEMBER_POINT_CAP} poin</span>
      </div>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "5px" }}>
        {full ? 'Poin kamu penuh — tukar dulu di counter biar bisa nambah lagi.' : 'Nama & nomor terisi otomatis. Poin masuk setelah operator konfirmasi pembayaran.'}
      </div>
    </div>
  );
}

function TvPoints({ roomAmt }) {
  const S = useStore();
  if (!S.custMember || !roomAmt) return null;
  const would = pointsFor(roomAmt);
  const earn = Math.min(would, memberHeadroom(S.custMember));
  return earn
    ? <>+ {earn} poin buat {S.custMember.name} <span style={{ color: "var(--text-faint)" }}>· masuk setelah dibayar</span></>
    : <span style={{ color: "var(--amber)" }}>Poin kamu penuh ({MEMBER_POINT_CAP}) — tukar dulu di counter.</span>;
}

/* Price line: 1 jam / 2 jam / 3 jam for the room being booked, same discount rule as tvCalcPrice */
function priceLine(rate) {
  const p = (h) => rate * h - Math.min(h - 1, 2) * 5000;
  return [1, 2, 3].map((h) => ({ h: h, k: Math.round(p(h) / 1000) + 'k' }));
}

export default function CustomerTable() {
  const S = useStore();
  const { id } = useParams();
  /* /tv/3 opens the third unit — also on a refresh or a shared link */
  useEffect(() => {
    const want = roomIdFromParam(id);
    if (want && want !== S.custRoomId) selectRoom(want);
  }, [id, S.LIVE_ROOMS.length]);
  const room = liveRoomById(S.custRoomId);
  const meta = ROOM_META[S.custRoomId] || { type: 'tv' };
  const amen = room ? (room.amen || '') : '';
  const amenParts = amen.split(' · ');
  const chips = (amenParts[1] || '').split(', ').filter(Boolean);
  const locked = !!S.custMember;
  const activeConsole = tvActiveConsole();
  const addonSum = tvAddonTotal();
  const addonCount = tvAddonCount();
  const hasRange = S.tvRangeStart !== null;
  const hours = hasRange ? (S.tvRangeEnd - S.tvRangeStart) + 1 : 0;
  const startLabel = hasRange ? (10 + S.tvRangeStart) + '.00' : '';
  const endLabel = hasRange ? (10 + S.tvRangeEnd + 1) + '.00' : '';
  const roomAmt = hasRange ? tvCalcPrice(hours) : 0;
  /* Running total strip — same rules as tvRenderSlots() */
  let totalShown, addonsShown, addonsLabel = '', addonsPrice = '', hoursLabel = '', priceLabel = '';
  if (!hasRange) {
    totalShown = addonCount > 0;
    addonsShown = addonCount > 0;
    hoursLabel = 'Pilih jam booking';
    priceLabel = 'Rp ' + addonSum.toLocaleString('id-ID');
    addonsLabel = addonCount + ' add-on' + (addonCount > 1 ? 's' : '');
    addonsPrice = '+ ' + rupiah(addonSum);
  } else {
    totalShown = true;
    addonsShown = addonCount > 0;
    hoursLabel = hours + ' jam \u00b7 ' + startLabel + '\u2013' + endLabel;
    priceLabel = 'Rp ' + (roomAmt + addonSum).toLocaleString('id-ID');
    addonsLabel = 'Room ' + rupiah(roomAmt) + ' + ' + addonCount + ' add-on' + (addonCount > 1 ? 's' : '');
    addonsPrice = '+ ' + rupiah(addonSum);
  }
  const pointsShown = !!(S.custMember && roomAmt);
  return (
    <Page id="customer-table">
      <Phone>
        <div className="phone-content">
          <div className="gallery-main" style={{ position: "relative" }}>
            <div onClick={() => showPage('customer-home')} style={{ position: "absolute", top: "10px", left: "10px", zIndex: "2", width: "30px", height: "30px", borderRadius: "50%", background: "rgba(6,7,11,0.65)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EDF1FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
            <img id="tv-gallery-main" src={GALLERY[S.tvGalleryIndex]} />
          </div>
          <div className="gallery-thumbs">
            {GALLERY.map((src, i) => (
              <img key={i} className={S.tvGalleryIndex === i ? 'active' : undefined} src={src} onClick={() => tvGalleryShow(i)} />
            ))}
          </div>
          <div style={{ marginBottom: "6px" }}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="h-title" style={{ fontSize: "19px" }}>{room ? room.name : ''}</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "3px" }}>{amenParts[0]}{meta.type === 'room' ? ' · Ruangan tertutup' : ''}</div>
              </div>
              <span className={'pill ' + (S.roomMaintenance[S.custRoomId] ? 'off' : 'available')}>{S.roomMaintenance[S.custRoomId] ? 'Maintenance' : 'Available'}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
              {chips.map((c) => <span key={c} className="chip" style={{ margin: "0" }}>{c}</span>)}
            </div>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-dim)", margin: "13px 0 2px", letterSpacing: "0.2px" }}>
            {priceLine(custRateFor(S.custRoomId)).map((x, n) => (
              <span key={x.h}>{n ? "  ·  " : ""}{x.h + " Jam — "}<strong style={{ color: "var(--text)", fontFamily: "'Rajdhani',sans-serif", fontSize: "15px" }}>{x.k}</strong></span>
            ))}
          </div>
          <div className="step-head">
            <span className="step-num">1</span>
            <span className="step-title">Pilih jam main</span>
          </div>
          <div className="step-hint">Tap jam mulai, lalu tap jam selesai.</div>
          <div id="tv-slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px", marginBottom: "9px" }}>
            {TV_SLOTS.map((sl) => {
              const inRange = S.tvRangeStart !== null && sl.idx >= S.tvRangeStart && sl.idx <= S.tvRangeEnd;
              const status = tvIsAvailable(sl.idx) ? 'available' : 'booked';
              return (
                <div key={sl.idx} className={'pill ' + status + ' slot-btn' + (inRange ? ' selected' : '')} data-idx={sl.idx}
                  onClick={status === 'available' ? () => selectSlot(sl.idx) : undefined}>{sl.label}</div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "14px", fontSize: "10px", color: "var(--text-faint)", marginBottom: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: "rgba(53,227,156,0.25)", border: "1px solid rgba(53,227,156,0.5)" }} />
              Kosong
            </span>
            {" "}
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: "rgba(255,194,75,0.2)", border: "1px solid rgba(255,194,75,0.45)" }} />
              Dibooking
            </span>
            {" "}
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: "var(--blue-bright)" }} />
              Pilihan kamu
            </span>
          </div>
          <div id="tv-slot-echo" style={{ display: S.tvRangeStart === null ? "none" : "block", fontSize: "11.5px", color: "var(--blue-bright)", background: "rgba(47,143,255,0.08)", border: "1px solid rgba(95,178,255,0.25)", borderRadius: "9px", padding: "9px 11px" }}>{S.tvRangeStart === null ? '' : 'Kamu main ' + hours + ' jam · ' + startLabel + '–' + endLabel}</div>
          <div className="step-head">
            <span className="step-num">2</span>
            <span className="step-title">
              {"Tambah add-on "}
              <span style={{ color: "var(--text-faint)", fontWeight: "400", fontSize: "12px" }}>(opsional)</span>
            </span>
          </div>
          <div className="step-hint" id="tv-addon-hint">{(activeConsole === 'ps5' && S.tvVenue.console !== 'ps5')
            ? 'Upgrade PS 5 aktif – sekarang stik PS 5 yang bisa ditambah.'
            : 'Cuma yang cocok buat ruangan ini yang muncul.'}</div>
          <div className="card" style={{ padding: "0", overflow: "hidden" }}>
            <div id="tv-addon-rows"><TvAddonRows /></div>
          </div>
          <div className="step-head">
            <span className="step-num">3</span>
            <span className="step-title">Data kamu</span>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "11px" }}>
            <span className="chip" id="cust-id-chip-guest" onClick={() => custIdMode('guest')} style={S.custIdModeValue === 'guest' ? CHIP_ON : CHIP_OFF}>Tamu</span>
            {" "}
            <span className="chip" id="cust-id-chip-member" onClick={() => custIdMode('member')} style={S.custIdModeValue === 'member' ? CHIP_ON : CHIP_OFF}>Pakai member</span>
          </div>
          <div id="cust-member-lookup" style={{ display: S.custIdModeValue === "member" ? "block" : "none", marginBottom: "12px" }}>
            <label>Nomor member</label>
            <div style={{ display: "flex", gap: "7px" }}>
              <input type="text" id="cust-member-input" placeholder="08xx-xxxx-xxxx" style={{ marginBottom: "0" }} value={S.custForm.memberInput} onChange={(e) => custSetField('memberInput', e.target.value)} />
              {" "}
              <span className="btn ghost" style={{ width: "auto", padding: "11px 16px", whiteSpace: "nowrap" }} onClick={custMemberCheck}>Cek</span>
            </div>
            <div id="cust-member-result" style={{ marginTop: "9px" }}><CustMemberResult /></div>
          </div>
          <div id="cust-guest-fields" style={{ display: S.custIdModeValue === "member" ? "none" : "block" }}>
            <label>Nama</label>
            <input type="text" id="cust-name" placeholder="Nama kamu" style={{ marginBottom: "10px", opacity: locked ? "0.7" : undefined }} readOnly={locked} value={S.custForm.name} onChange={(e) => custSetField('name', e.target.value)} />
            <label>Nomor WhatsApp</label>
            <input type="text" id="cust-wa" placeholder="08xx-xxxx-xxxx" style={{ marginBottom: "10px", opacity: locked ? "0.7" : undefined }} readOnly={locked} value={S.custForm.wa} onChange={(e) => custSetField('wa', e.target.value)} />
          </div>
          <label style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Catatan</span>
            <span style={{ color: "var(--text-faint)", fontWeight: "400" }}>opsional</span>
          </label>
          <input type="text" placeholder="Contoh: mulai jam 13.30" style={{ marginBottom: "5px" }} value={S.custForm.note} onChange={(e) => custSetField('note', e.target.value)} />
          <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Jam kamu nggak ada di atas? Tulis di sini, nanti kami konfirmasi lewat WA.</div>
          <div className="step-head">
            <span className="step-num">4</span>
            <span className="step-title">Cara bayar</span>
          </div>
          <div id="tv-payment-method" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className={'btn ghost payment-method-btn' + (S.tvPaymentMethod === 'Cash di Lokasi' ? ' selected' : '')} onClick={() => selectMethod('Cash di Lokasi')}>Cash di Lokasi</div>
            <div className={'btn ghost payment-method-btn' + (S.tvPaymentMethod === 'QRIS' ? ' selected' : '')} onClick={() => selectMethod('QRIS')}>QRIS</div>
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "8px" }}>Bayar cash: datang maks. 5 menit sebelum jam main, lewat dari itu booking otomatis batal.</div>
          <div style={{ height: "6px" }} />
        </div>
        <div style={{ padding: "14px 18px 20px", borderTop: "1px solid var(--border)" }}>
          <div id="tv-total-payment" style={{ display: totalShown ? "flex" : "none", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
            <div id="tv-total-addons" style={{ display: addonsShown ? "flex" : "none", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--text-faint)" }}>
              <span id="tv-total-addons-label">{addonsLabel}</span>
              <span id="tv-total-addons-price">{addonsPrice}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <span id="tv-total-hours" style={{ fontSize: "12px", color: "var(--text-dim)" }}>{hoursLabel}</span>
              {" "}
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Total</span>
                <span id="tv-total-price" style={{ fontSize: "19px", fontWeight: "700", fontFamily: "'Rajdhani',sans-serif" }}>{priceLabel}</span>
              </span>
            </div>
            <div id="tv-total-points" style={{ display: pointsShown ? "block" : "none", fontSize: "11px", color: "var(--green)", borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "2px" }}><TvPoints roomAmt={roomAmt} /></div>
          </div>
          <div className="btn primary" onClick={bookAndPay}>Book and continue to payment</div>
        </div>
      </Phone>
    </Page>
  );
}
