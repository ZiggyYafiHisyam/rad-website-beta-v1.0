import { S, notify, MEMBER_POINT_CAP } from './state';
import { rupiah } from './format';
import { api, run, once } from './api';

/* ================= MEMBER POINTS ENGINE =================
   Points come from TV / Room TIME only. Snacks & add-ons never earn. */
export function pointsFor(amount) {
  if (!amount || amount < 0) return 0;
  return Math.floor(amount / S.POINT_BLOCK_RP) * S.POINT_BLOCK_PTS;
}
export function pointRateLabel() { return S.POINT_BLOCK_PTS + ' poin / ' + rupiah(S.POINT_BLOCK_RP); }
export function memberDigits(s) { return (s || '').replace(/[^0-9]/g, ''); }
export function memberByPhone(phone) {
  const d = memberDigits(phone);
  if (d.length < 6) return null;
  for (let i = 0; i < S.ownerMembers.length; i++) {
    if (memberDigits(S.ownerMembers[i].phone) === d) return S.ownerMembers[i];
  }
  return null;
}
export function memberLedger(m) { if (!m.ledger) m.ledger = []; return m.ledger; }
export function memberHeadroom(m) { return Math.max(0, MEMBER_POINT_CAP - m.points); }

/* ---------- Owner: member list search ---------- */
export function setMemberSearch(v) {
  S.memberSearch = v;
  notify();
}

export function membersFiltered() {
  const q = (S.memberSearch || '').toLowerCase().trim();
  return S.ownerMembers.filter((m) => !q || m.name.toLowerCase().indexOf(q) > -1 || m.phone.indexOf(q) > -1);
}

/* ---------- Owner: operator accounts editor ---------- */
export function ownerOpenOperatorEditor() {
  S.ui.operatorEditor = S.ownerOperators.map((o) => ({ id:o.id, name:o.name, pass:o.pass }));
  notify();
}
export function ownerCloseOperatorEditor() {
  S.ui.operatorEditor = null;
  notify();
}
export function ownerEditorAddOperator() {
  S.ui.operatorEditor.push({ name:'', pass:'' });
  notify();
}
export function ownerEditorRemoveOperator(i) {
  S.ui.operatorEditor.splice(i, 1);
  notify();
}
export async function ownerSaveOperators() {
  const clean = S.ui.operatorEditor.filter((o) => o.name.trim());
  if (!clean.length) { alert('Keep at least one operator account.'); return; }
  const ok = await run(() => api('PUT', '/owner/operators', { rows: clean.map((o) => ({ id:o.id, name:o.name.trim(), pass:o.pass })) }).then(() => true));
  if (ok) ownerCloseOperatorEditor();
}

/* ---------- Owner: member editor ---------- */
export function ownerMemberIndex(phone) {
  for (let i = 0; i < S.ownerMembers.length; i++) { if (S.ownerMembers[i].phone === phone) return i; }
  return -1;
}

export function ownerOpenMemberEditor(phone) {
  const i = ownerMemberIndex(phone);
  if (i < 0) return;
  const m = S.ownerMembers[i];
  S.ui.memberEditor = { phone:phone, name:m.name, phoneInput:m.phone, points:String(m.points) };
  notify();
}

export function ownerCloseMemberEditor() {
  S.ui.memberEditor = null;
  notify();
}

export async function ownerSaveMember() {
  const ed = S.ui.memberEditor;
  const i = ownerMemberIndex(ed.phone);
  if (i < 0) return;
  const name = ed.name.trim();
  const phone = ed.phoneInput.trim();
  const pts = parseInt(ed.points, 10);
  if (!name || !phone) { alert('Name and number are required'); return; }
  if (isNaN(pts) || pts < 0) { alert('Points must be a number'); return; }
  if (pts > MEMBER_POINT_CAP) { alert('Points cap at ' + MEMBER_POINT_CAP + '.'); return; }
  const ok = await run(() => api('PATCH', '/owner/members/' + S.ownerMembers[i].id, { name, phone, points: pts }).then(() => true));
  if (ok) ownerCloseMemberEditor();
}

export async function ownerDeleteMemberFromModal() {
  const i = ownerMemberIndex(S.ui.memberEditor.phone);
  if (i < 0) return;
  if (!confirm('Delete member ' + S.ownerMembers[i].name + '? Only the owner can do this.')) return;
  const ok = await run(() => api('DELETE', '/owner/members/' + S.ownerMembers[i].id).then(() => true));
  if (ok) ownerCloseMemberEditor();
}

/* ================= MEMBERSHIP REQUESTS (operator -> owner) ================= */
export async function operatorRequestMember(name, phone) {
  if (!name.trim() || !phone.trim()) { alert('Enter the customer name and phone number'); return false; }
  const ok = await once('member-req', () => run(() => api('POST', '/operator/member-requests', { name: name.trim(), phone: phone.trim() }).then(() => true)));
  if (!ok) return false;
  S.opReqStatus = 'Request sent to the owner for approval — ' + name.trim() + ' is not a member until approved.';
  notify();
  return true;
}

export function ownerApproveRequest(i) {
  const r = S.memberRequests[i];
  if (!r) return;
  return once('approve-' + r.id, () => run(() => api('POST', '/owner/member-requests/' + r.id + '/approve')));
}

export function ownerOpenReject(i) {
  const r = S.memberRequests[i];
  if (!r) return;
  S.ui.reject = { id: r.id, reason:'' };
  notify();
}

export function ownerCloseReject() {
  S.ui.reject = null;
  notify();
}

export async function ownerConfirmReject() {
  const reason = S.ui.reject.reason.trim();
  if (!reason) { alert('Please enter a reason — the operator needs to know why.'); return; }
  const ok = await run(() => api('POST', '/owner/member-requests/' + S.ui.reject.id + '/reject', { reason }).then(() => true));
  if (ok) ownerCloseReject();
}

/* ---- customer membership page (asks the server; customers never receive the member list) ---- */
export function custPointsBalance() {
  return S.custPtsMember ? S.custPtsMember.points : 0;
}

export async function custPointsCheck() {
  try {
    S.custPtsMember = await api('POST', '/public/member-lookup', { phone: S.custPtsPhone || '' });
    S.custPtsMsgError = false;
    S.custPtsMsgChecked = true;
  } catch (e) {
    if (e.network) { alert(e.message); return; }
    S.custPtsMember = null;
    S.custPtsMsgError = true;
  }
  notify();
}

/* ================= REDEEM CATALOG EDITOR ================= */
export function ownerOpenRewardEditor() {
  S.ui.rewardEditor = {
    rows: S.rewardCatalog.map((r) => ({ name:r.name, cost:r.cost })),
    pts: String(S.POINT_BLOCK_PTS),
    rp: String(S.POINT_BLOCK_RP)
  };
  notify();
}

export function ownerCloseRewardEditor() {
  S.ui.rewardEditor = null;
  notify();
}

export function ownerEditorAddReward() {
  S.ui.rewardEditor.rows.push({ name:'', cost:'' });
  notify();
}

export function ownerEditorRemoveReward(i) {
  S.ui.rewardEditor.rows.splice(i, 1);
  notify();
}

export async function ownerSaveRewards() {
  const ed = S.ui.rewardEditor;
  const rpBlock = parseInt(ed.rp, 10);
  const ptBlock = parseInt(ed.pts, 10);
  if (isNaN(rpBlock) || rpBlock < 1000) { alert('Rp per block must be at least 1.000'); return; }
  if (isNaN(ptBlock) || ptBlock < 1) { alert('Points per block must be at least 1'); return; }
  for (let i = 0; i < ed.rows.length; i++) {
    const rw = ed.rows[i];
    if (!String(rw.name).trim()) continue;
    const cost = parseInt(String(rw.cost).replace(/[^0-9]/g, ''), 10);
    if (isNaN(cost)) { alert('Enter a point cost for "' + rw.name + '"'); return; }
    if (cost > MEMBER_POINT_CAP) { alert('"' + rw.name + '" costs more than the ' + MEMBER_POINT_CAP + '-point cap.'); return; }
  }
  const ok = await run(() => api('PUT', '/owner/rewards', { rp: rpBlock, pts: ptBlock, rows: ed.rows }).then(() => true));
  if (ok) ownerCloseRewardEditor();
}
