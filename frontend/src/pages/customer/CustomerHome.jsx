import { useStore, custFilter, openRoom, rupiah, custRateFor } from '../../store';
import { Page, Phone, CustomerTabs } from '../../components/Phone';
import { IMG } from '../../assets/images';

export default function CustomerHome() {
  const S = useStore();
  const f = S.custFilterValue;
  /* same rule the prototype's custFilter() applied to each card */
  const cardShown = (kind, status) => f === 'all' || (f === 'available' && status === 'available') || f === kind;
  const chipStyle = (key) => (key === f
    ? { cursor: "pointer", whiteSpace: "nowrap", color: "#0A0D14", background: "var(--blue-bright)", borderColor: "var(--blue-bright)" }
    : { cursor: "pointer", whiteSpace: "nowrap" });
  return (
    <Page id="customer-home">
      <Phone>
        <div className="phone-content">
          <div className="hero" style={{ position: "relative", height: "100px", borderRadius: "16px", overflow: "hidden", margin: "6px 0 12px", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
            <svg viewBox="0 0 400 190" preserveAspectRatio="none" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0B3E8C" />
                  <stop offset="100%" stopColor="#38E8FF" />
                </linearGradient>
                <pattern id="digiGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M22 0H0V22" fill="none" stroke="#2F8FFF" strokeWidth="0.5" />
                </pattern>
                <pattern id="scanLines" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="7" stroke="#38E8FF" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="400" height="190" fill="#000" />
              <rect width="400" height="190" fill="url(#digiGrid)" opacity="0.22" />
              <rect width="400" height="190" fill="url(#scanLines)" opacity="0.06" />
              <path d="M0,150 C60,110 100,180 160,140 C220,100 260,170 320,130 C360,105 380,120 400,110 L400,190 L0,190 Z" fill="url(#waveGrad1)" opacity="0.35" />
              <path d="M0,170 C70,130 120,190 180,155 C240,120 280,185 340,150 C370,132 385,140 400,132 L400,190 L0,190 Z" fill="#2F8FFF" opacity="0.3" />
              <path d="M0,40 C50,10 90,55 150,30 C210,5 250,50 310,25 C350,8 375,20 400,12 L400,0 L0,0 Z" fill="#5FB2FF" opacity="0.2" />
              <path d="M-10,95 C60,70 110,120 170,90 C230,60 270,110 340,80 C365,68 385,78 410,68" stroke="#5FB2FF" strokeWidth="1.5" fill="none" opacity="0.45" />
              <path d="M-10,60 C60,35 110,85 170,55 C230,25 270,75 340,45 C365,33 385,43 410,33" stroke="#38E8FF" strokeWidth="1" fill="none" opacity="0.3" />
              <circle cx="42" cy="28" r="1.6" fill="#38E8FF" opacity="0.8" />
              <circle cx="358" cy="162" r="1.6" fill="#5FB2FF" opacity="0.8" />
              <circle cx="368" cy="34" r="1.2" fill="#38E8FF" opacity="0.6" />
              <circle cx="28" cy="150" r="1.2" fill="#5FB2FF" opacity="0.6" />
              <circle cx="200" cy="18" r="1" fill="#38E8FF" opacity="0.5" />
              <circle cx="90" cy="172" r="1" fill="#5FB2FF" opacity="0.5" />
              <circle cx="320" cy="60" r="1" fill="#38E8FF" opacity="0.4" />
              <path d="M0,4 H400 M0,186 H400" stroke="#2F8FFF" strokeWidth="0.5" opacity="0.25" />
              <path d="M14,14 h14 M14,14 v14" stroke="#38E8FF" strokeWidth="1" opacity="0.5" />
              <path d="M386,176 h-14 M386,176 v-14" stroke="#5FB2FF" strokeWidth="1" opacity="0.5" />
              <ellipse cx="200" cy="70" rx="180" ry="55" fill="#1E6FE0" opacity="0.12" />
            </svg>
            <img src={IMG["logo.png"]} style={{ position: "relative", height: "62px", zIndex: "1", filter: "drop-shadow(0 0 14px rgba(95,178,255,0.7)) drop-shadow(0 0 28px rgba(47,143,255,0.35))" }} />
          </div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 13px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)", flexShrink: "0" }} />
              <div style={{ flex: "1", minWidth: "0" }}>
                <div style={{ fontSize: "12.5px", fontWeight: "600" }}>Buka sekarang</div>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Setiap hari 10.00 – 24.00 · Jl. Merdeka 21</div>
              </div>
              <span className="pill available" style={{ fontSize: "9px" }}>4 siap</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div style={{ padding: "10px 4px", textAlign: "center", borderRight: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "20px", color: "var(--green)", lineHeight: "1" }}>4</div>
                <div style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "3px" }}>Siap dipakai</div>
              </div>
              <div style={{ padding: "10px 4px", textAlign: "center", borderRight: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "20px", color: "var(--red)", lineHeight: "1" }}>2</div>
                <div style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "3px" }}>Dipakai</div>
              </div>
              <div style={{ padding: "10px 4px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "20px", color: "var(--amber)", lineHeight: "1" }}>2</div>
                <div style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "3px" }}>Dibooking</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <img src={IMG["operator.jpg"]} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: "0" }} />
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Operator jaga hari ini</div>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>Qori</div>
              <div style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "1px" }}>Tanya jadwal atau titip pesan lewat WhatsApp</div>
            </div>
            <a href="https://wa.me/6281234567890" target="_blank" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#0B0B0F">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.35-.5.06-1.06.28-3.57-.74-3-1.22-4.94-4.28-5.09-4.48-.15-.2-1.22-1.62-1.22-3.1s.78-2.2 1.06-2.5c.28-.3.6-.36.8-.36h.58c.19 0 .43-.02.66.5.24.55.8 1.9.87 2.03.07.14.11.3.02.49-.09.19-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.2 1.37.28.14.44.12.6-.07.16-.19.68-.78.87-1.05.19-.27.37-.22.62-.13.25.09 1.6.75 1.87.89.28.14.46.2.53.32.07.11.07.65-.17 1.33z" />
              </svg>
            </a>
          </div>
          <div className="banner" style={{ marginBottom: "10px" }}>Weekend promo — 3 jam bayar 2, setiap Jumat & Sabtu</div>
          <div className="row" style={{ marginBottom: "7px" }}>
            <div className="section-label" style={{ margin: "0" }}>What's new</div>
            <span style={{ fontSize: "9.5px", color: "var(--text-faint)" }}>Update 15 Sep</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
            <span className="chip" style={{ color: "var(--purple)", borderColor: "rgba(139,107,255,0.3)" }}>Tekken 8 added to TV 2</span>
            {" "}
            <span className="chip" style={{ color: "var(--cyan)", borderColor: "rgba(56,232,255,0.28)" }}>Stick PS 5 baru di TV 1</span>
          </div>
          <div className="section-label">Cara booking</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "7px", marginBottom: "20px" }}>
            <div className="card" style={{ padding: "10px 9px" }}>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: "var(--blue-bright)", lineHeight: "1" }}>1</div>
              <div style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "4px", lineHeight: "1.4" }}>Pilih TV atau room & jam main</div>
            </div>
            <div className="card" style={{ padding: "10px 9px" }}>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: "var(--blue-bright)", lineHeight: "1" }}>2</div>
              <div style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "4px", lineHeight: "1.4" }}>Tambah add-on & snack kalau perlu</div>
            </div>
            <div className="card" style={{ padding: "10px 9px" }}>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: "var(--blue-bright)", lineHeight: "1" }}>3</div>
              <div style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "4px", lineHeight: "1.4" }}>Bayar cash atau QRIS di kasir</div>
            </div>
          </div>
          <div className="row" style={{ marginBottom: "9px" }}>
            <div style={{ fontSize: "17px", fontWeight: "700", color: "#FFFFFF" }}>Pilih TV / Room</div>
            <span style={{ fontSize: "9.5px", color: "var(--text-faint)" }}>Tap untuk booking</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "11px" }}>
            <span className="chip cust-filter" data-f="all" onClick={() => custFilter('all')} style={chipStyle('all')}>Semua 8</span>
            {" "}
            <span className="chip cust-filter" data-f="available" onClick={() => custFilter('available')} style={chipStyle('available')}>Siap 4</span>
            {" "}
            <span className="chip cust-filter" data-f="tv" onClick={() => custFilter('tv')} style={chipStyle('tv')}>TV 5</span>
            {" "}
            <span className="chip cust-filter" data-f="room" onClick={() => custFilter('room')} style={chipStyle('room')}>Room 3</span>
          </div>
          <div id="cust-room-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
            <div className="room-card" data-kind="tv" data-status="booked" onClick={() => openRoom('billing-tv1')} style={{ minHeight: "140px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["tv.png"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("tv", "booked") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", opacity: "0.8" }}>
              <span className="pill booked" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>Booked</span>
              <div style={{ position: "relative", zIndex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "16px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>TV 1</div>
                <div style={{ fontSize: "9.5px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Reguler · PS 5</div>
                <div style={{ fontSize: "9px", color: "var(--amber)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Dibooking 18.00</div>
                <div style={{ marginTop: "5px" }}>
                  <div className="cust-rate" data-room="billing-tv1" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                    {rupiah(custRateFor('billing-tv1'))}
                    <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="room-card" data-kind="tv" data-status="available" onClick={() => openRoom('billing-tv2')} style={{ minHeight: "140px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["tv.png"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("tv", "available") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", borderColor: "rgba(47,143,255,0.5)" }}>
              <span className="pill available" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>Available</span>
              <div style={{ position: "relative", zIndex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "16px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>TV 2</div>
                <div style={{ fontSize: "9.5px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Reguler · PS 5</div>
                <div style={{ marginTop: "5px" }}>
                  <div className="cust-rate" data-room="billing-tv2" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                    {rupiah(custRateFor('billing-tv2'))}
                    <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                  </div>
                </div>
                <span className="btn sm primary" style={{ display: "block", width: "100%", marginTop: "6px", padding: "5px 0", fontSize: "10.5px", textAlign: "center" }}>Booking</span>
              </div>
            </div>
            <div className="room-card" data-kind="tv" data-status="inuse" onClick={() => openRoom('billing-tv3')} style={{ minHeight: "140px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["tv.png"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("tv", "inuse") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", opacity: "0.8" }}>
              <span className="pill inuse" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>In use</span>
              <div style={{ position: "relative", zIndex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "16px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>TV 3</div>
                <div style={{ fontSize: "9.5px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Reguler · PS 5</div>
                <div style={{ fontSize: "9px", color: "var(--amber)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Sedang dipakai</div>
                <div style={{ marginTop: "5px" }}>
                  <div className="cust-rate" data-room="billing-tv3" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                    {rupiah(custRateFor('billing-tv3'))}
                    <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="room-card" data-kind="tv" data-status="booked" onClick={() => openRoom('billing-tv4')} style={{ minHeight: "140px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["tv.png"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("tv", "booked") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", opacity: "0.8" }}>
              <span className="pill booked" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>Booked</span>
              <div style={{ position: "relative", zIndex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "16px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>TV 4</div>
                <div style={{ fontSize: "9.5px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Reguler · PS 5</div>
                <div style={{ fontSize: "9px", color: "var(--amber)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Dibooking 19.00</div>
                <div style={{ marginTop: "5px" }}>
                  <div className="cust-rate" data-room="billing-tv4" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                    {rupiah(custRateFor('billing-tv4'))}
                    <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="room-card" data-kind="tv" data-status="available" onClick={() => openRoom('billing-tv5')} style={{ minHeight: "140px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["tv.png"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("tv", "available") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", borderColor: "rgba(47,143,255,0.5)" }}>
              <span className="pill available" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>Available</span>
              <div style={{ position: "relative", zIndex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "16px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>TV 5</div>
                <div style={{ fontSize: "9.5px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Reguler · PS 4</div>
                <div style={{ marginTop: "5px" }}>
                  <div className="cust-rate" data-room="billing-tv5" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                    {rupiah(custRateFor('billing-tv5'))}
                    <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                  </div>
                </div>
                <span className="btn sm primary" style={{ display: "block", width: "100%", marginTop: "6px", padding: "5px 0", fontSize: "10.5px", textAlign: "center" }}>Booking</span>
              </div>
            </div>
            <div className="room-card" data-kind="room" data-status="available" onClick={() => openRoom('billing-private')} style={{ gridColumn: "span 2", minHeight: "152px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["private-room.jpg"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("room", "available") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", borderColor: "rgba(47,143,255,0.5)" }}>
              <span className="pill available" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>Available</span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px", position: "relative", zIndex: "1" }}>
                <div style={{ minWidth: "0" }}>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "19px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Private Room</div>
                  <div style={{ fontSize: "10px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Max 2 orang · PS 4, Netflix</div>
                  <div style={{ marginTop: "4px" }}>
                    <div className="cust-rate" data-room="billing-private" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                      {rupiah(custRateFor('billing-private'))}
                      <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                    </div>
                  </div>
                </div>
                <span className="btn sm primary" style={{ flexShrink: "0", padding: "5px 11px", fontSize: "10.5px" }}>Booking</span>
              </div>
            </div>
            <div className="room-card" data-kind="room" data-status="inuse" onClick={() => openRoom('billing-vip')} style={{ gridColumn: "span 2", minHeight: "152px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["vip-room.jpg"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("room", "inuse") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", opacity: "0.8" }}>
              <span className="pill inuse" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>In use</span>
              {" "}
              <span style={{ position: "absolute", top: "12px", right: "10px", fontSize: "9px", color: "rgba(237,241,250,0.8)", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Sedang dipakai</span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px", position: "relative", zIndex: "1" }}>
                <div style={{ minWidth: "0" }}>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "19px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>VIP Room</div>
                  <div style={{ fontSize: "10px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Max 4 orang · PS 4, Netflix, Karaoke</div>
                  <div style={{ marginTop: "4px" }}>
                    <div className="cust-rate" data-room="billing-vip" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                      {rupiah(custRateFor('billing-vip'))}
                      <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="room-card" data-kind="room" data-status="available" onClick={() => openRoom('billing-lounge')} style={{ gridColumn: "span 2", minHeight: "152px", position: "relative", padding: "12px", overflow: "hidden", borderRadius: "14px", border: "1px solid var(--border)", backgroundImage: `linear-gradient(175deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.9) 100%), url('${IMG["lounge-room.jpg"]}')`, backgroundSize: "cover", backgroundPosition: "center", display: cardShown("room", "available") ? "flex" : "none", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer", borderColor: "rgba(47,143,255,0.5)" }}>
              <span className="pill available" style={{ position: "absolute", top: "10px", left: "10px", fontSize: "9px", padding: "3px 7px" }}>Available</span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px", position: "relative", zIndex: "1" }}>
                <div style={{ minWidth: "0" }}>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "19px", lineHeight: "1.1", color: "#FFFFFF", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Lounge Room</div>
                  <div style={{ fontSize: "10px", color: "rgba(237,241,250,0.86)", marginTop: "2px", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>Max 10 orang · PS 4, Netflix, Board game + meja meeting</div>
                  <div style={{ marginTop: "4px" }}>
                    <div className="cust-rate" data-room="billing-lounge" style={{ fontSize: "11px", fontWeight: "600", color: "var(--cyan)", whiteSpace: "nowrap", textShadow: "0 1px 5px rgba(0,0,0,0.85)" }}>
                      {rupiah(custRateFor('billing-lounge'))}
                      <span style={{ color: "rgba(237,241,250,0.6)", fontWeight: "400" }}>/jam</span>
                    </div>
                  </div>
                </div>
                <span className="btn sm primary" style={{ flexShrink: "0", padding: "5px 11px", fontSize: "10.5px" }}>Booking</span>
              </div>
            </div>
          </div>
        </div>
        <CustomerTabs active="customer-home" />
      </Phone>
    </Page>
  );
}
