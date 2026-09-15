import { flavors, payments, price, emptyState, validAmount } from "./model.js";
export const STORAGE_KEY = "little-a-orders-v1";
const validId = (v) => typeof v === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(v);
const stamp = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));
export function validDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export function validateState(s) {
  const fail = () => {
    throw Error("訂單資料格式不完整，已保留原始資料，請下載備份。");
  };
  if (
    !s ||
    s.version !== 1 ||
    !Number.isSafeInteger(s.next) ||
    s.next < 1 ||
    !["draft", "pending", "history", "archives"].every((k) =>
      Array.isArray(s[k]),
    )
  )
    fail();
  const item = (i) => {
    if (
      !i ||
      !validId(i.id) ||
      typeof i.key !== "string" ||
      !Array.isArray(i.names) ||
      i.names.length < 1 ||
      i.names.length > 2 ||
      new Set(i.names).size !== i.names.length ||
      i.names.some((n) => !flavors.includes(n)) ||
      !Array.isArray(i.counts) ||
      i.counts.length !== i.names.length ||
      i.counts.some((n) => !Number.isInteger(n) || n < 1) ||
      i.counts.reduce((a, b) => a + b, 0) !== 6 ||
      !Number.isInteger(i.qty) ||
      i.qty < 1 ||
      i.qty > 99 ||
      i.price !== price(i.names)
    )
      fail();
  };
  const ids = new Set(),
    numbers = new Set();
  const order = (o, done) => {
    if (
      !o ||
      !validId(o.id) ||
      ids.has(o.id) ||
      !Number.isSafeInteger(o.number) ||
      o.number < 1 ||
      o.number >= s.next ||
      numbers.has(o.number) ||
      !stamp(o.createdAt) ||
      !Array.isArray(o.items) ||
      !o.items.length ||
      typeof o.note !== "string" ||
      o.note.length > 100 ||
      !(o.payment === null || payments.includes(o.payment)) ||
      typeof o.served !== "boolean" ||
      (o.actualAmount !== undefined && !validAmount(o.actualAmount)) ||
      (done
        ? !(o.payment && o.served && stamp(o.completedAt))
        : !!(o.payment && o.served))
    )
      fail();
    ids.add(o.id);
    numbers.add(o.number);
    o.items.forEach(item);
  };
  s.draft.forEach(item);
  s.pending.forEach((o) => order(o, false));
  s.history.forEach((o) => order(o, true));
  const archives = new Set();
  s.archives.forEach((a) => {
    if (
      !a ||
      !validId(a.id) ||
      archives.has(a.id) ||
      !validDate(a.date) ||
      !stamp(a.createdAt) ||
      !Array.isArray(a.orders) ||
      !a.orders.length
    )
      fail();
    archives.add(a.id);
    a.orders.forEach((o) => order(o, true));
  });
  return s;
}
export function readState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? emptyState() : validateState(JSON.parse(raw));
}
