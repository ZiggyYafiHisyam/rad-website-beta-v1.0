import { useStore, notify, customerSendFeedback } from '../../store';
import { Page, Phone, CustomerTabs } from '../../components/Phone';

export default function CustomerFeedback() {
  const S = useStore();
  return (
    <Page id="customer-feedback">
      <Phone>
        <div className="phone-content">
          <div className="h-title" style={{ margin: "6px 0 4px" }}>Feedback</div>
          <div style={{ fontSize: "11.5px", color: "var(--text-faint)", marginBottom: "16px" }}>Anonymous, no account needed</div>
          <textarea style={{ minHeight: "140px", resize: "none" }} placeholder="Tell us what we can improve" value={S.feedbackText} maxLength={1000} onChange={(e) => { S.feedbackText = e.target.value; S.feedbackSent = false; notify(); }} />
          {S.feedbackSent ? <div style={{ fontSize: "11.5px", color: "var(--green)", marginTop: "10px" }}>Terima kasih! Feedback kamu sudah terkirim ke owner.</div> : null}
        </div>
        <div style={{ padding: "14px 18px 20px" }}>
          <div className="btn primary" onClick={customerSendFeedback}>Send feedback</div>
        </div>
        <CustomerTabs active="customer-feedback" />
      </Phone>
    </Page>
  );
}
