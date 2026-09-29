import { S, notify, MEMBER_POINT_CAP } from './state';
import { rupiah, billingFormatClock } from './format';

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

/* credits room time only; stops at the cap */
export function memberAward(phone, roomAmt, source) {
  const m = memberByPhone(phone);
  if (!m) return null;
  const would = pointsFor(roomAmt);
  const earned = Math.min(would, memberHeadroom(m));
  m.points += earned;
  memberLedger(m).unshift({ at:'Today · ' + billingFormatClock(new Date()), source:source, pts:earned, dropped:would - earned });
  return { member:m, earned:earned, would:would, capped:earned < would, balance:m.points };
}

/* Pulls points back when a payment is refunded — never below zero */
export function memberDeduct(phone, pts, source) {
  const m = memberByPhone(phone);
  if (!m || !pts) return null;
  const taken = Math.min(pts, m.points);
  m.points -= taken;
  memberLedger(m).unshift({ at:'Today · ' + billingFormatClock(new Date()), source:source, pts:-taken, dropped:0 });
  return { member:m, taken:taken, balance:m.points };
}

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
  S.ui.operatorEditor = S.ownerOperators.map((o) => ({ name:o.name, pass:o.pass }));
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
export function ownerSaveOperators() {
  const clean = S.ui.operatorEditor.filter((o) => o.name.trim());
  if (!clean.length) { alert('Keep at least one operator account.'); return; }
  S.ownerOperators = clean.map((o) => ({ name:o.name.trim(), pass:(o.pass || '••••••') }));
  ownerCloseOperatorEditor();
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

export function ownerSaveMember() {
  const ed = S.ui.memberEditor;
  const i = ownerMemberIndex(ed.phone);
  if (i < 0) return;
  const name = ed.name.trim();
  const phone = ed.phoneInput.trim();
  const pts = parseInt(ed.points, 10);
  if (!name || !phone) { alert('Name and number are required'); return; }
  if (isNaN(pts) || pts < 0) { alert('Points must be a number'); return; }
  if (pts > MEMBER_POINT_CAP) { alert('Points cap at ' + MEMBER_POINT_CAP + '.'); return; }
  S.ownerMembers[i].name = name;
  S.ownerMembers[i].phone = phone;
  S.ownerMembers[i].points = pts;
  ownerCloseMemberEditor();
}

export function ownerDeleteMemberFromModal() {
  const i = ownerMemberIndex(S.ui.memberEditor.phone);
  if (i < 0) return;
  if (!confirm('Delete member ' + S.ownerMembers[i].name + '? Only the owner can do this.')) return;
  S.ownerMembers.splice(i, 1);
  ownerCloseMemberEditor();
}

/* ================= MEMBERSHIP REQUESTS (operator -> owner) ================= */
export function operatorRequestMember(name, phone) {
  if (!name.trim() || !phone.trim()) { alert('Enter the customer name and phone number'); return false; }
  S.memberRequests.push({ name:name.trim(), phone:phone.trim(), by:S.activeOperator, at:'Today ' + billingFormatClock(new Date()) });
  S.opReqStatus = 'Request sent to the owner for approval — ' + name.trim() + ' is not a member until approved.';
  notify();
  return true;
}

export function ownerApproveRequest(i) {
  const r = S.memberRequests[i];
  S.memberRequests.splice(i, 1);
  S.ownerMembers.push({ name:r.name, phone:r.phone, points:0, joined:'Today' });
  notify();
}

export function ownerOpenReject(i) {
  S.ui.reject = { index:i, reason:'' };
  notify();
}

export function ownerCloseReject() {
  S.ui.reject = null;
  notify();
}

export function ownerConfirmReject() {
  const reason = S.ui.reject.reason.trim();
  if (!reason) { alert('Please enter a reason — the operator needs to know why.'); return; }
  const r = S.memberRequests[S.ui.reject.index];
  S.memberRequests.splice(S.ui.reject.index, 1);
  ownerNotice('Membership rejected — ' + r.name, reason, r.by);
  ownerCloseReject();
}

/* ================= INFO FROM OWNER (owner -> operator) ================= */
export function ownerNotice(title, body, to) {
  S.ownerNotices.unshift({ title:title, body:body, to:to || 'All operators', at:'Today · ' + billingFormatClock(new Date()), unread:true });
  notify();
}

/* ---- customer membership page (live off ownerMembers) ---- */
export function custPointsBalance() {
  const m = memberByPhone(S.custViewPhone);
  return m ? m.points : 0;
}

export function custPointsCheck() {
  const m = memberByPhone(S.custPtsPhone || '');
  if (!m) {
    S.custPtsMsgError = true;
    notify();
    return;
  }
  S.custViewPhone = m.phone;
  S.custPtsMsgError = false;
  S.custPtsMsgChecked = true;
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

export function ownerSaveRewards() {
  const ed = S.ui.rewardEditor;
  const rpBlock = parseInt(ed.rp, 10);
  const ptBlock = parseInt(ed.pts, 10);
  if (isNaN(rpBlock) || rpBlock < 1000) { alert('Rp per block must be at least 1.000'); return; }
  if (isNaN(ptBlock) || ptBlock < 1) { alert('Points per block must be at least 1'); return; }
  S.POINT_BLOCK_RP = rpBlock;
  S.POINT_BLOCK_PTS = ptBlock;
  const out = [];
  for (let i = 0; i < ed.rows.length; i++) {
    const rw = ed.rows[i];
    if (!String(rw.name).trim()) continue;
    const cost = parseInt(String(rw.cost).replace(/[^0-9]/g, ''), 10);
    if (isNaN(cost)) { alert('Enter a point cost for "' + rw.name + '"'); return; }
    if (cost > MEMBER_POINT_CAP) { alert('"' + rw.name + '" costs more than the ' + MEMBER_POINT_CAP + '-point cap.'); return; }
    out.push({ name:String(rw.name).trim(), cost:cost });
  }
  out.sort((a, b) => a.cost - b.cost);
  S.rewardCatalog = out;
  ownerCloseRewardEditor();
}
