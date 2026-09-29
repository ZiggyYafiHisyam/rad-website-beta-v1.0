import { BookingRows, useBooking, money } from '../../components/BookingRows';
import { Page, Phone } from '../../components/Phone';

export default function PaymentCash() {
  const b = useBooking();
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
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "30px", marginBottom: "20px" }}>{money(b)}</div>
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
