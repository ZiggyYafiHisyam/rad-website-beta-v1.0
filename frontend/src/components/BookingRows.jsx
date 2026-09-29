import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore, loadBooking, rupiah } from '../store';

/* The booking behind a /payment/…/:code page (null until the server has answered) */
export function useBooking() {
  const S = useStore();
  const { id } = useParams();
  useEffect(() => {
    if (id && (!S.booking || S.booking.code !== id)) loadBooking(id);
  }, [id]);
  return S.booking && S.booking.code === id ? S.booking : null;
}

export function money(b) { return b && !b.missing ? rupiah(b.total) : '—'; }

/* The "Booking details" table shared by the cash and QRIS pages */
export function BookingRows({ b }) {
  const S = useStore();
  const ok = b && !b.missing;
  return (
    <table className="receipt" style={{ textAlign: "left" }}>
      <tbody>
        <tr><td>Booking code</td><td>{ok ? b.code : (b && b.missing ? 'Tidak ditemukan' : '…')}</td></tr>
        <tr><td>Nama</td><td>{ok ? b.name : '—'}</td></tr>
        <tr><td>Nomor WA</td><td>{ok ? b.wa : '—'}</td></tr>
        <tr><td>Meja</td><td>{ok ? b.room : '—'}</td></tr>
        <tr><td>Jam</td><td>{ok ? b.start + '–' + b.end + ' (' + b.hours + ' jam)' : '—'}</td></tr>
        <tr><td>Add-ons</td><td className="receipt-addons">{ok ? b.addons : '—'}</td></tr>
        <tr><td>Notes</td><td>{ok && b.note ? b.note : '—'}</td></tr>
        <tr className="receipt-member-row" style={{ display: S.receipt.member ? undefined : "none" }}>
          <td>Member</td>
          <td className="receipt-member">{S.receipt.member || '—'}</td>
        </tr>
      </tbody>
    </table>
  );
}
