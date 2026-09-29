import { S, notify } from './state';

/* ================= DOC MODAL =================
   The prototype handed docOpen() a ready-made HTML string. Here it gets a small
   description ({ kind, ... }) that components/DocBody.jsx turns into the same
   markup. */
export function docOpen(title, body, note) {
  S.ui.doc = { title:title, body:body, note:note || '' };
  notify();
}

export function docClose() {
  S.ui.doc = null;
  notify();
}
