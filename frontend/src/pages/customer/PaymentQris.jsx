import { useLocation } from 'react-router-dom';
import { BookingRows, useBooking, money } from '../../components/BookingRows';
import { Page, Phone } from '../../components/Phone';

/* /payment/qris/:id — waiting for payment, or ?paid=true once it went through */
export default function PaymentQris() {
  const b = useBooking();
  const { search } = useLocation();
  if (search.indexOf('paid=true') !== -1) return <QrisPaid b={b} />;
  return (
    <Page id="customer-payment-qris-pending">
      <Phone>
        <div className="phone-content" style={{ textAlign: "center", paddingTop: "20px" }}>
          <div className="h-title">Pay with QRIS</div>
          <div style={{ fontSize: "12px", color: "var(--red)", margin: "6px 0 14px" }}>Expires in 09:59</div>
          <div className="qr-box" style={{ width: "120px", height: "120px", marginBottom: "12px" }}>
            <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#5FB2FF" strokeWidth="1.4">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
            </svg>
          </div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "28px", marginBottom: "16px" }}>{money(b)}</div>
          <span className="pill booked" style={{ marginBottom: "14px", display: "inline-block" }}>Status: Waiting for payment</span>
          <div className="section-label" style={{ textAlign: "left", marginTop: "14px" }}>Booking details</div>
          <BookingRows b={b} />
        </div>
      </Phone>
    </Page>
  );
}

function QrisPaid({ b }) {
  return (
    <Page id="customer-payment-qris-paid">
      <Phone>
        <div className="phone-content" style={{ textAlign: "center", paddingTop: "20px" }}>
          <div className="h-title">Pay with QRIS</div>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6" style={{ margin: "12px 0 6px" }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="h-title" style={{ fontSize: "16px", color: "var(--green)" }}>Payment successful</div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "28px", margin: "12px 0 18px" }}>{money(b)}</div>
          <div className="section-label" style={{ textAlign: "left" }}>Booking details</div>
          <BookingRows b={b} />
        </div>
        <div style={{ padding: "14px 18px 20px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "13px" }}>Thank you!</div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "3px" }}>Don't forget to screenshot and show receipt to the Operator!</div>
        </div>
      </Phone>
    </Page>
  );
}
