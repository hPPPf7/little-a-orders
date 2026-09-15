import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  addItem,
  submitOrder,
  setOrderAmount,
  orderTotal,
  total,
  updateOrder,
  archive,
} from "../model.js";
import { validateState } from "../storage.js";
const order = () => {
  const s = emptyState();
  addItem(s, ["原味", "卡士達"], 2, 3);
  return { s, o: submitOrder(s, "") };
};
test("discount persists through completion and archive without changing item prices", () => {
  const { s, o } = order();
  setOrderAmount(s, o.id, 90);
  assert.equal(orderTotal(o), 90);
  assert.equal(total(o.items), 110);
  assert.equal(
    validateState(JSON.parse(JSON.stringify(s))).pending[0].actualAmount,
    90,
  );
  updateOrder(s, o.id, "payment", "LINE PAY");
  updateOrder(s, o.id, "served", true);
  assert.equal(orderTotal(s.history[0]), 90);
  archive(s, "2026-09-15");
  assert.equal(orderTotal(validateState(s).archives[0].orders[0]), 90);
  assert.throws(() => setOrderAmount(s, o.id, 80));
});
test("free orders, surcharges, restoring prices and legacy records", () => {
  const { s, o } = order();
  assert.equal(orderTotal(o), 110);
  setOrderAmount(s, o.id, 0);
  assert.equal(orderTotal(o), 0);
  validateState(s);
  setOrderAmount(s, o.id, 120);
  assert.equal(orderTotal(o), 120);
  setOrderAmount(s, o.id, null);
  assert.equal(orderTotal(o), 110);
  assert.equal(Object.hasOwn(o, "actualAmount"), false);
  setOrderAmount(s, o.id, 110);
  assert.equal(Object.hasOwn(o, "actualAmount"), false);
});
test("invalid amounts are rejected before changing order data", () => {
  const { s, o } = order();
  for (const value of [-1, 1.2, NaN, Infinity, "90", undefined, 1000000]) {
    assert.throws(() => setOrderAmount(s, o.id, value));
    assert.equal(orderTotal(o), 110);
    const copy = structuredClone(s);
    copy.pending[0].actualAmount = value === undefined ? null : value;
    assert.throws(() => validateState(copy));
  }
});
test("editing an already paid pending order preserves its payment and serving status", () => {
  const { s, o } = order();
  updateOrder(s, o.id, "payment", "現金");
  setOrderAmount(s, o.id, 80);
  assert.equal(o.payment, "現金");
  assert.equal(o.served, false);
  assert.equal(s.history.length, 0);
});
