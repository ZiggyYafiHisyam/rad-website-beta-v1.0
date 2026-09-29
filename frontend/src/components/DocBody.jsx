import { rupiah, MEMBER_POINT_CAP } from '../store';

const faint = { color: "var(--text-faint)" };
const dim = { color: "var(--text-dim)" };
const bigNum = { fontFamily: "'Rajdhani',sans-serif", fontSize: "17px" };
const groupHead = { fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" };

function Line({ k, v, kStyle, vStyle, total }) {
  return (
    <div className={'doc-line' + (total ? ' total' : '')}>
      <span style={kStyle}>{k}</span>
      <span style={vStyle}>{v}</span>
    </div>
  );
}

function MethodPill({ method }) {
  return <span className={'pill ' + (method === 'Cash' ? 'booked' : 'available')}>{method}</span>;
}

/* receiptHtml() */
export function ReceiptDoc({ rec }) {
  if (rec.kind === 'counter') return <CounterReceiptDoc rec={rec} />;
  return (
    <>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "10px" }}>{rec.id} · {rec.at} · {rec.by}</div>
      <Line k="TV / Room" v={rec.room} kStyle={faint} />
      <Line k="Customer" v={rec.cust} kStyle={faint} />
      <Line k={'Main ' + rec.hours + ' jam'} v={rupiah(rec.roomAmt)} kStyle={dim} />
      {rec.charges.map((c, i) => (
        <Line key={i} k={(c.kind === 'snack' ? 'Snack' : 'Add-on') + ' · ' + c.name + ' ×' + c.qty} v={rupiah(c.qty * c.price)} kStyle={dim} />
      ))}
      <Line total k="Total payment" v={rupiah(rec.total)} vStyle={bigNum} />
      <Line k="Paid by" v={<MethodPill method={rec.method} />} kStyle={faint} />
      {rec.memberName ? (
        <>
          <Line k="Member" v={rec.memberName + ' · ' + rec.memberPhone} kStyle={faint} />
          <Line k="Poin" kStyle={faint} vStyle={{ color: rec.pts ? "var(--green)" : "var(--amber)" }}
            v={rec.pts ? '+' + rec.pts + ' · saldo ' + rec.ptsBalance + '/' + MEMBER_POINT_CAP : 'Poin penuh (' + MEMBER_POINT_CAP + ')'} />
          {rec.ptsDropped ? <div style={{ fontSize: "10.5px", color: "var(--amber)", marginTop: "6px" }}>{rec.ptsDropped} poin hangus — saldo sudah di batas {MEMBER_POINT_CAP}.</div> : null}
        </>
      ) : null}
      {rec.reason ? <div style={{ fontSize: "10.5px", color: "var(--amber)", marginTop: "8px" }}>Stopped early — {rec.reason}</div> : null}
    </>
  );
}

/* counterReceiptHtml() */
export function CounterReceiptDoc({ rec }) {
  return (
    <>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "10px" }}>{rec.id} · {rec.at} · {rec.by}</div>
      <Line k="Type" v={rec.message ? 'Custom order' : 'Counter order'} kStyle={faint} />
      <Line k="Customer" v={rec.cust} kStyle={faint} />
      {rec.message ? (
        <>
          <div style={{ fontSize: "12.5px", color: "var(--text-dim)", lineHeight: "1.5", padding: "8px 0", borderTop: "1px solid var(--border)" }}>{rec.message}</div>
          <div style={{ fontSize: "10px", color: "var(--amber)" }}>Amount typed manually by the operator.</div>
        </>
      ) : null}
      {rec.charges.map((c, i) => (
        <Line key={i} k={(c.kind === 'snack' ? 'Snack' : 'Add-on') + ' · ' + c.name + ' ×' + c.qty} v={rupiah(c.qty * c.price)} kStyle={dim} />
      ))}
      <Line total k="Total payment" v={rupiah(rec.total)} vStyle={bigNum} />
      <Line k="Paid by" v={<MethodPill method={rec.method} />} kStyle={faint} />
    </>
  );
}

/* refundHtml() */
export function RefundDoc({ r }) {
  return (
    <>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "10px" }}>{r.id} · against {r.recId} · {r.at}</div>
      <Line k="TV / Room" v={r.room} kStyle={faint} />
      <Line k="Customer" v={r.cust} kStyle={faint} />
      <Line k="Originally paid" v={rupiah(r.paid)} kStyle={dim} />
      <Line total k={'Refund' + (r.partial ? ' (partial)' : '')} v={'-' + rupiah(r.amount)} vStyle={{ ...bigNum, color: "var(--red)" }} />
      <Line k="Back via" v={<MethodPill method={r.method} />} kStyle={faint} />
      <Line k="Requested by" v={r.by} kStyle={faint} />
      <Line k="Reason" v={r.reason} kStyle={faint} vStyle={{ textAlign: "right" }} />
      {r.pts && r.memberName
        ? <Line k="Member poin" v={'-' + r.pts + ' pts from ' + r.memberName} kStyle={{ color: "var(--amber)" }} vStyle={{ color: "var(--amber)" }} />
        : null}
      <Line k="Status" kStyle={faint} v={
        <span className={'pill ' + (r.status === 'approved' ? 'inuse' : (r.status === 'rejected' ? 'off' : 'booked'))}>
          {r.status === 'approved' ? 'Approved' : (r.status === 'rejected' ? 'Rejected' : 'Waiting for owner')}
        </span>} />
      {r.ownerNote ? <div style={{ fontSize: "10.5px", color: "var(--amber)", marginTop: "8px" }}>Owner’s note — {r.ownerNote}</div> : null}
    </>
  );
}

/* shiftHtml() */
export function ShiftDoc({ s }) {
  function money(n) { return (n < 0 ? '-' : '') + rupiah(Math.abs(n)); }
  return (
    <>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "10px" }}>{s.id} · {s.at} · operator {s.by}</div>
      <Line k="Cash in cashier · counted" v={rupiah(s.cashActual)} kStyle={faint} />
      <Line k="Cash expected · system" v={rupiah(s.cashExpected)} kStyle={faint} />
      <Line k="QRIS on GoPay merchant" v={rupiah(s.qrisActual)} kStyle={faint} />
      <Line k="QRIS expected · system" v={rupiah(s.qrisExpected)} kStyle={faint} />
      <Line k="Discrepancy" v={money(s.disc)} vStyle={{ color: s.disc === 0 ? "var(--green)" : "var(--red)" }} />
      {s.refunds ? <Line k="Refunds paid out · owner-approved" v={'-' + rupiah(s.refunds)} kStyle={faint} vStyle={{ color: "var(--red)" }} /> : null}
      <Line total k="Total revenue today" v={rupiah(s.total)} vStyle={bigNum} />
      <div style={{ ...groupHead, margin: "14px 0 2px" }}>Snack count</div>
      {!s.snackGaps.length
        ? <Line k="All items match the system" v="Rp 0" kStyle={dim} vStyle={{ color: "var(--green)" }} />
        : (
          <>
            {s.snackGaps.map((g, i) => (
              <Line key={i} k={g.name + ' · ' + (g.gap > 0 ? '+' : '') + g.gap + ' pcs'} v={money(g.value)} kStyle={dim} vStyle={{ color: "var(--red)" }} />
            ))}
            <Line total k="Snack value gap" v={money(s.snackGapValue)} vStyle={{ color: "var(--red)" }} />
          </>
        )}
    </>
  );
}

/* ownerOpenSession() — a snapshot taken when the card was tapped */
export function SessionDoc({ d }) {
  return (
    <>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "10px" }}>{d.head}</div>
      <Line k="Time used" v={d.used} kStyle={faint} />
      {d.personal ? (
        <>
          <Line k="Stopwatch" v={d.paused ? 'Paused' : 'Running'} kStyle={faint} vStyle={{ color: d.paused ? "var(--amber)" : "var(--cyan)" }} />
          <Line k="Billed blocks" v={d.blocks + ' jam'} kStyle={faint} />
        </>
      ) : <Line k="Time left" v={d.left} kStyle={faint} vStyle={{ color: "var(--cyan)" }} />}
      <Line k={'Room billed so far · ' + rupiah(d.rate) + '/jam'} v={rupiah(d.accrued)} kStyle={dim} />
      {d.charges.length ? (
        <>
          <div style={{ ...groupHead, marginTop: "12px" }}>On the bill now</div>
          {d.charges.map((c, i) => (
            <Line key={i} k={(c.kind === 'snack' ? 'Snack' : 'Add-on') + ' · ' + c.name + ' ×' + c.qty} v={rupiah(c.qty * c.price)} kStyle={dim} />
          ))}
        </>
      ) : <div style={{ fontSize: "11.5px", color: "var(--text-faint)", marginTop: "12px" }}>No snacks or add-ons charged to this session yet.</div>}
      <Line total k="Running total" v={rupiah(d.total)} vStyle={bigNum} />
      <div style={{ ...groupHead, margin: "14px 0 2px" }}>Changes this session</div>
      {!d.log.length
        ? <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>Nothing changed since it started.</div>
        : d.log.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: "11.5px" }}>
            <span style={{ flex: "0 0 40px", color: "var(--blue-bright)", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600" }}>{l.t}</span>
            <span style={{ flex: "1", color: "var(--text-dim)" }}>{l.text}</span>
          </div>
        ))}
    </>
  );
}

/* Owner saved new rates */
export function RatesDoc({ changes }) {
  return (
    <>
      <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "10px" }}>Every operator on duty has been notified and the booking page now quotes the new rate.</div>
      {changes.map((c, i) => <Line key={i} k={c.split(':')[0]} v={c.split(': ')[1] || ''} kStyle={dim} />)}
    </>
  );
}

/* Where the CSV download is blocked, show the text to copy instead */
export function CsvDoc({ csv }) {
  return (
    <>
      <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "10px" }}>Download diblokir di sini — salin teks di bawah ke file .csv.</div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: "10.5px", color: "var(--text-dim)", lineHeight: "1.5" }}>{csv}</pre>
    </>
  );
}

export default function DocBody({ body }) {
  switch (body.kind) {
    case 'receipt': return <ReceiptDoc rec={body.rec} />;
    case 'refund': return <RefundDoc r={body.r} />;
    case 'shift': return <ShiftDoc s={body.s} />;
    case 'session': return <SessionDoc d={body} />;
    case 'rates': return <RatesDoc changes={body.changes} />;
    case 'csv': return <CsvDoc csv={body.csv} />;
    default: return null;
  }
}

