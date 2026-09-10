import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addItem, submitOrder } from "../model.js";
import { readState, validateState, validDate } from "../storage.js";
test("reject corrupt or injectable records without erasing storage", () => {
  const s = emptyState();
  addItem(s, ["原味"], 1, 3);
  submitOrder(s, "");
  assert.equal(validateState(s), s);
  for (const mutate of [
    (s) => (s.next = 0),
    (s) => (s.pending[0].id = '" onclick="alert(1)'),
    (s) => (s.pending[0].items[0].qty = -1),
    (s) => (s.pending[0].items[0].price = 0),
    (s) => (s.pending[0].items[0].counts = [7]),
  ]) {
    const copy = structuredClone(s);
    mutate(copy);
    assert.throws(() => validateState(copy));
  }
  assert.throws(() => readState({ getItem: () => "{broken" }));
  assert.deepEqual(readState({ getItem: () => null }), emptyState());
});
test("calendar dates are real, including leap years", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
});
