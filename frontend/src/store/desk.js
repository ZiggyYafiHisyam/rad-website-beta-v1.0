import { S, notify, showPage } from './state';

/* ================= OWNER DESKTOP CONSOLE =================
   The desktop view is a second skin over the SAME state: every section renders
   the same components the mobile owner pages use, so the two cannot drift. */
export const OWNER_SECTION_PAGE = {
  overview:'owner-live', live:'owner-live', stats:'owner-revenue', reports:'owner-reports',
  history:'owner-history', people:'owner-people', stock:'owner-stock'
};

export const OWNER_SECTION_HEAD = {
  overview: ['Overview', 'What is happening on the floor and in the drawer right now'],
  stats:   ['Statistics', 'Money in, split and reconciled for the selected month'],
  reports: ['Reports', 'Refunds waiting on you, operator overrides and customer feedback'],
  history: ['Transaction history', 'Receipts, settled refunds and shift closings by date'],
  people:  ['Operators & Members', 'Staff accounts, membership requests and the points program'],
  stock:   ['Stock & Rewards', 'Snacks, rental rates, add-ons and the redeem catalog']
};

/* Set while the desktop console is the page on screen */
let onDesktop = false;
export function setOwnerOnDesktop(v) { onDesktop = v; }
export function ownerOnDesktop() { return onDesktop; }

export function ownerDeskSection(name) {
  S.ownerDeskCurrent = name;
  notify();
}

/* Navigation that lands in whichever view the owner is actually using */
export function ownerGo(section) {
  if (ownerOnDesktop()) ownerDeskSection(section === 'live' ? 'overview' : section);
  else showPage(OWNER_SECTION_PAGE[section] || 'owner-live');
}
