import { test } from "node:test";
import assert from "node:assert/strict";
import {
  flavors,
  price,
  emptyState,
  addItem,
  total,
  submitOrder,
  updateOrder,
  archive,
} from "../model.js";
test("all menu singles and combinations follow published prices", () => {
  for (const f of flavors) assert.equal(price([f]), f === "原味" ? 50 : 60);
  for (let i = 0; i < flavors.length; i++)
    for (let j = i + 1; j < flavors.length; j++)
      assert.equal(price([flavors[i], flavors[j]]), i === 0 ? 55 : 60);
  assert.throws(() => price(flavors.slice(0, 3)));
  assert.throws(() => price([]));
  assert.throws(() => price(["原味", "原味"]));
});
test("draft totals and creation are separate", () => {
  const s = emptyState();
  addItem(s, ["原味"], 2, 3);
  addItem(s, ["原味", "芋頭"], 3, 2);
  assert.equal(total(s.draft), 265);
  assert.equal(s.pending.length, 0);
  const o = submitOrder(s, " 分袋 ");
  assert.equal(o.note, "分袋");
  assert.equal(s.draft.length, 0);
  assert.equal(s.pending.length, 1);
  assert.equal(o.number, 1);
  assert.throws(() => submitOrder(s, ""));
});
test("payment and serving required in either order; payment exclusive", () => {
  for (const servedFirst of [true, false]) {
    const s = emptyState();
    addItem(s, ["起士", "花生"], 1, 3);
    const o = submitOrder(s, "");
    if (servedFirst) updateOrder(s, o.id, "served", true);
    else {
      updateOrder(s, o.id, "payment", "現金");
      updateOrder(s, o.id, "payment", "LINE PAY");
      assert.equal(s.pending[0].payment, "LINE PAY");
    }
    assert.equal(s.history.length, 0);
    updateOrder(
      s,
      o.id,
      servedFirst ? "payment" : "served",
      servedFirst ? "全支付" : true,
    );
    assert.equal(s.pending.length, 0);
    assert.equal(s.history.length, 1);
    assert.ok(s.history[0].completedAt);
  }
});
test("archive moves all completed orders and preserves pending; same date separate batches", () => {
  const s = emptyState();
  for (let i = 0; i < 3; i++) {
    addItem(s, ["原味"], 1, 3);
    const o = submitOrder(s, "");
    if (i < 2) {
      updateOrder(s, o.id, "payment", "現金");
      updateOrder(s, o.id, "served", true);
    }
  }
  archive(s, "2026-09-10");
  assert.equal(s.history.length, 0);
  assert.equal(s.archives[0].orders.length, 2);
  assert.equal(s.pending.length, 1);
  const o = s.pending[0];
  updateOrder(s, o.id, "served", true);
  updateOrder(s, o.id, "payment", "現金");
  archive(s, "2026-09-10");
  assert.equal(s.archives.length, 2);
  assert.equal(JSON.parse(JSON.stringify(s)).archives[1].orders.length, 2);
});
test("split counts and duplicate combinations", () => {
  const s = emptyState();
  addItem(s, ["原味", "芋頭"], 1, 2);
  addItem(s, ["芋頭", "原味"], 2, 4);
  assert.equal(s.draft.length, 1);
  assert.equal(s.draft[0].qty, 3);
  assert.throws(() => addItem(s, ["原味", "芋頭"], 1, 0));
  assert.throws(() => addItem(s, ["原味"], 100, 3));
});
