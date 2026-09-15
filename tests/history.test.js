import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  addItem,
  submitOrder,
  updateOrder,
  setOrderAmount,
  deleteHistoryOrder,
  orderTotal,
  archive,
} from "../model.js";
import { validateState } from "../storage.js";
function setup() {
  const state = emptyState();
  addItem(state, ["原味"], 1, 3);
  const order = submitOrder(state, "備註");
  updateOrder(state, order.id, "payment", "現金");
  updateOrder(state, order.id, "served", true);
  return { state, order };
}
test("history amount edits preserve completion and persist into archives", () => {
  const { state, order } = setup();
  const before = structuredClone(order);
  setOrderAmount(state, order.id, 0, "history");
  assert.equal(orderTotal(order), 0);
  assert.deepEqual(
    { ...order, actualAmount: undefined },
    { ...before, actualAmount: undefined },
  );
  assert.equal(
    validateState(JSON.parse(JSON.stringify(state))).history[0].actualAmount,
    0,
  );
  setOrderAmount(state, order.id, null, "history");
  assert.equal(orderTotal(order), 50);
  setOrderAmount(state, order.id, 30, "history");
  archive(state, "2026-09-16");
  assert.equal(orderTotal(state.archives[0].orders[0]), 30);
  assert.throws(() => setOrderAmount(state, order.id, 20, "history"));
  assert.throws(() => deleteHistoryOrder(state, order.id));
});
test("deletion only removes the selected history order and validates after reload", () => {
  const { state, order } = setup();
  addItem(state, ["原味"], 1, 3);
  const pending = submitOrder(state, "");
  assert.throws(() => deleteHistoryOrder(state, pending.id));
  assert.throws(() => setOrderAmount(state, pending.id, 20, "history"));
  assert.throws(() => setOrderAmount(state, order.id, -1, "history"));
  deleteHistoryOrder(state, order.id);
  assert.equal(state.history.length, 0);
  assert.equal(state.pending[0].id, pending.id);
  validateState(JSON.parse(JSON.stringify(state)));
  assert.throws(() => deleteHistoryOrder(state, order.id));
});
