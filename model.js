export const flavors = [
  "原味",
  "卡士達",
  "可可卡士達",
  "奶酥",
  "起士",
  "香蒜",
  "花生",
  "芋頭",
  "奧利奧",
  "黑糖麻吉",
  "德式香腸",
  "黑芝麻",
  "紅豆",
  "苦甜巧克力",
  "抹茶奶酥",
  "鮮奶凍",
  "奶茶卡士達",
  "抹茶卡士達",
];
export const payments = ["現金", "LINE PAY", "全支付"];
const makeId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
export const emptyState = () => ({
  version: 1,
  next: 1,
  pending: [],
  history: [],
  archives: [],
  draft: [],
});
export function price(names) {
  if (
    !names.length ||
    names.length > 2 ||
    new Set(names).size !== names.length ||
    names.some((n) => !flavors.includes(n))
  )
    throw Error("請選擇 1–2 種口味");
  return names.includes("原味") ? (names.length === 1 ? 50 : 55) : 60;
}
export const total = (items) => items.reduce((s, i) => s + i.price * i.qty, 0);
export const validAmount = (amount) =>
  Number.isInteger(amount) && amount >= 0 && amount <= 999999;
export const orderTotal = (order) => order.actualAmount ?? total(order.items);
export function setOrderAmount(state, id, amount) {
  const order = state.pending.find((o) => o.id === id);
  if (!order) throw Error("訂單已完成或已更新，無法修改金額");
  if (amount !== null && !validAmount(amount))
    throw Error("請輸入 0–999999 的整數金額");
  if (amount === null || amount === total(order.items))
    delete order.actualAmount;
  else order.actualAmount = amount;
}
export function addItem(state, names, qty, split) {
  if (!Number.isInteger(qty) || qty < 1 || qty > 99)
    throw Error("份數須為 1–99");
  const unit = price(names);
  const counts = names.length === 1 ? [6] : [split, 6 - split];
  if (counts.some((n) => !Number.isInteger(n) || n < 1))
    throw Error("每種口味至少 1 顆");
  const key = names
    .map((n, i) => n + ":" + counts[i])
    .sort()
    .join("|");
  const found = state.draft.find((i) => i.key === key);
  if (found) {
    if (found.qty + qty > 99) throw Error("相同組合最多 99 份");
    found.qty += qty;
  } else
    state.draft.push({
      id: makeId(),
      key,
      names: [...names],
      counts,
      qty,
      price: unit,
    });
}
export function submitOrder(state, note, now = new Date().toISOString()) {
  if (!state.draft.length) throw Error("請先加入品項");
  const order = {
    id: makeId(),
    number: state.next++,
    createdAt: now,
    items: state.draft,
    note: note.trim().slice(0, 100),
    payment: null,
    served: false,
  };
  state.pending.push(order);
  state.draft = [];
  return order;
}
export function updateOrder(state, id, field, value) {
  const o = state.pending.find((o) => o.id === id);
  if (!o) throw Error("訂單已更新");
  if (field === "payment" && (value === null || payments.includes(value)))
    o.payment = value;
  else if (field === "served" && typeof value === "boolean") o.served = value;
  else throw Error("無效狀態");
  if (o.payment && o.served) {
    o.completedAt = new Date().toISOString();
    state.pending = state.pending.filter((x) => x.id !== id);
    state.history.push(o);
  }
}
export function archive(state, date) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(new Date(date + "T00:00:00").getTime())
  )
    throw Error("請選擇封存日期");
  if (!state.history.length) throw Error("目前沒有可封存的訂單");
  state.archives.unshift({
    id: makeId(),
    date,
    createdAt: new Date().toISOString(),
    orders: state.history,
  });
  state.history = [];
}
