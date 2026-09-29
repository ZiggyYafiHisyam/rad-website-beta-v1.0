import { useStore } from '../../store';
import { Page, Phone } from '../../components/Phone';

export default function PaymentCash() {
  const S = useStore();
  return (
    <Page id="customer-payment-cash">
      <Phone>
        <div className="phone-content" style={{ textAlign: "center", paddingTop: "24px" }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6" style={{ marginBottom: "10px" }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="h-title" style={{ fontSize: "17px" }}>Booked! Pay at location</div>
          <div style={{ fontSize: "11.5px", color: "var(--amber)", margin: "6px 0 18px" }}>
            {"Valid until 16.05 "}
            <span style={{ color: "var(--text-faint)" }}>(&gt;5 mins Booking will expire)</span>
          </div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "30px", marginBottom: "20px" }}>Rp 140.000</div>
          <div className="section-label" style={{ textAlign: "left" }}>Booking details</div>
          <table className="receipt" style={{ textAlign: "left" }}>
            <tbody>
              <tr>
                <td>Booking code</td>
                <td>CASH03-09092026-014</td>
              </tr>
              <tr>
                <td>Nama</td>
                <td>Andi Saputra</td>
              </tr>
              <tr>
                <td>Nomor WA</td>
                <td>0812-3456-7890</td>
              </tr>
              <tr>
                <td>Meja</td>
                <td>Lounge Room</td>
              </tr>
              <tr>
                <td>Jam</td>
                <td>16.00–19.00 (3 jam)</td>
              </tr>
              <tr>
                <td>Add-ons</td>
                <td className="receipt-addons">{S.receipt.addons}</td>
              </tr>
              <tr>
                <td>Notes</td>
                <td>—</td>
              </tr>
              <tr className="receipt-member-row" style={{ display: S.receipt.member ? undefined : "none" }}>
                <td>Member</td>
                <td className="receipt-member">{S.receipt.member || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: "14px 18px 20px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "13px" }}>Thank you!</div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "3px" }}>Don't forget to screenshot and show receipt to the Operator!</div>
        </div>
      </Phone>
    </Page>
  );
}
