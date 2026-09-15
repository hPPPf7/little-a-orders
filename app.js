import {
  flavors,
  payments,
  emptyState,
  price,
  total,
  orderTotal,
  setOrderAmount,
  deleteHistoryOrder,
  addItem,
  submitOrder,
  updateOrder,
  archive,
} from "./model.js";
import { readState, validateState, STORAGE_KEY } from "./storage.js";
const $ = (s) => document.querySelector(s),
  KEY = STORAGE_KEY;
let state = emptyState(),
  tab = "order",
  selected = [],
  qty = 1,
  split = 3,
  note = "",
  archiveId = null,
  amountOrderId = null,
  amountScope = "pending",
  confirmAction = null,
  toastTimer,
  storageBroken = false;
try {
  state = readState();
} catch {
  storageBroken = true;
}
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => "$" + n.toLocaleString("en-US");
const day = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const time = (s) =>
  new Date(s).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const number = (o) => "#" + String(o.number).padStart(3, "0");
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3200);
}
function mutate(fn) {
  if (storageBroken) {
    toast("儲存資料無法讀取，請先下载備份並保留原始資料。");
    return false;
  }
  try {
    const next = readState();
    fn(next);
    validateState(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    state = next;
    render();
    return true;
  } catch (e) {
    toast(e.message || "儲存失敗，請檢查裝置空間");
    return false;
  }
}
const pages = {},
  sizes = { flavors: 18, cart: 2, orders: 2, archives: 4, lines: 2 };
let compactCart = false;
function slicePage(items, key, size) {
  const count = Math.max(1, Math.ceil(items.length / size));
  pages[key] = Math.min(pages[key] || 0, count - 1);
  return items.slice(pages[key] * size, (pages[key] + 1) * size);
}
function pager(items, key, size) {
  const count = Math.ceil(items.length / size);
  return count > 1
    ? `<div class="pager"><button data-page="${key}" data-step="-1" ${pages[key] ? "" : "disabled"} aria-label="上一頁">‹</button><span>${(pages[key] || 0) + 1} / ${count}</span><button data-page="${key}" data-step="1" ${(pages[key] || 0) >= count - 1 ? "disabled" : ""} aria-label="下一頁">›</button></div>`
    : "";
}
function heading(title, sub, right = "") {
  return `<div class="page-heading"><h1>${title}</h1>${right}</div>`;
}
function empty(title) {
  return `<div class="empty">${title}</div>`;
}
function stepper(value, minus, plus, label) {
  return `<div class="stepper"><button data-action="${minus}" aria-label="減少${label}" ${value <= 1 ? "disabled" : ""}>−</button><strong>${value}</strong><button data-action="${plus}" aria-label="增加${label}" ${value >= 99 ? "disabled" : ""}>＋</button></div>`;
}
function render() {
  const tabs = [
    ["order", "點餐"],
    ["pending", "待出餐"],
    ["history", "歷史訂單"],
    ["archives", "封存紀錄"],
  ];
  $("#nav").innerHTML = tabs
    .map(
      ([id, title]) =>
        `<button data-tab="${id}" class="nav-tab ${tab === id ? "active" : ""}" aria-current="${tab === id ? "page" : "false"}">${title}${id === "pending" ? `<span class="badge">${state.pending.length}</span>` : ""}</button>`,
    )
    .join("");
  $("#main").innerHTML =
    tab === "order"
      ? orderView()
      : tab === "pending"
        ? pendingView()
        : tab === "history"
          ? historyView()
          : archivesView();
  requestAnimationFrame(fitPages);
}
function fitPages() {
  let changed = false;
  const size = (k, n) => {
    n = Math.max(1, n);
    if (sizes[k] !== n) {
      sizes[k] = n;
      changed = true;
    }
  };
  const grid = $(".flavor-grid");
  if (grid && grid.clientWidth) {
    const cols = Math.max(2, Math.floor(grid.clientWidth / 150));
    grid.style.setProperty("--columns", cols);
    size(
      "flavors",
      cols * Math.max(1, Math.floor((grid.clientHeight + 10) / 92)),
    );
  }
  const cart = $(".cart-items");
  if (cart && cart.clientHeight)
    size("cart", Math.floor(cart.clientHeight / 148));
  const orders = $(".orders-grid");
  if (orders) {
    const cols =
      orders.clientWidth >= 1150 ? 3 : orders.clientWidth >= 720 ? 2 : 1;
    orders.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
    size("orders", cols);
    const lines = [...document.querySelectorAll(".order-lines")];
    if (lines.length) {
      const row = $(".order-line");
      size(
        "lines",
        Math.floor(
          Math.min(...lines.map((el) => el.clientHeight)) /
            (row?.offsetHeight || 100),
        ),
      );
    }
  }
  const list = $(".archive-list");
  if (list) size("archives", Math.floor(list.clientHeight / 94));
  if (changed) render();
}
function orderView() {
  const fs = slicePage(flavors, "flavors", sizes.flavors),
    items = slicePage(state.draft, "cart", sizes.cart);
  return `<div class="mobile-switch"><button data-cart-view="false" class="${!compactCart ? "active" : ""}">選口味</button><button data-cart-view="true" class="${compactCart ? "active" : ""}">本次點餐（${state.draft.reduce((s, i) => s + i.qty, 0)}）</button></div><div class="order-layout ${compactCart ? "show-cart" : ""}"><section class="menu-panel">${heading("選擇口味", "", `<span class="selection-count">已選 ${selected.length} / 2</span>`)}<div class="flavor-grid">${fs.map((name) => `<button class="flavor ${selected.includes(name) ? "chosen" : ""}" data-flavor="${flavors.indexOf(name)}" aria-pressed="${selected.includes(name)}"><strong>${name}</strong><span>${name === "原味" ? "$50" : "$60"}</span></button>`).join("")}</div><div class="page-slot">${pager(flavors, "flavors", sizes.flavors)}</div><div class="selection-box"><div class="selection-summary"><strong>${selected.length ? selected.map(esc).join(" ＋ ") : "請選擇口味"}</strong>${selected.length === 2 ? `<select id="split" aria-label="混搭顆數分配">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${split === n ? "selected" : ""}>${n} 顆 ＋ ${6 - n} 顆</option>`).join("")}</select>` : "<span>6 顆／份</span>"}</div><div class="add-controls">${stepper(qty, "qty-minus", "qty-plus", "份數")}<button class="primary add-button" data-action="add" ${selected.length ? "" : "disabled"}>加入清單${selected.length ? ` · ${money(price(selected) * qty)}` : ""}</button></div></div></section><aside class="cart"><div class="cart-title"><h2>本次點餐</h2><span>${state.draft.reduce((s, i) => s + i.qty, 0)} 份</span></div><div class="cart-items">${items.length ? items.map((item) => `<article class="cart-item"><div class="item-heading"><strong>${item.names.map(esc).join(" ＋ ")}</strong><button class="remove" data-remove="${item.id}" aria-label="移除${esc(item.names.join("加"))}">×</button></div><div class="item-bottom"><div><span class="counts">${item.counts.join(" ＋ ")} 顆</span><div class="stepper"><button data-quantity="${item.id}" data-delta="-1" aria-label="減少此品項份數">−</button><strong>${item.qty}</strong><button data-quantity="${item.id}" data-delta="1" aria-label="增加此品項份數" ${item.qty >= 99 ? "disabled" : ""}>＋</button></div></div><strong>${money(item.qty * item.price)}</strong></div></article>`).join("") : empty("尚未加入品項")}</div><div class="page-slot">${pager(state.draft, "cart", sizes.cart)}</div><div class="cart-footer"><input id="note" aria-label="訂單備註" maxlength="100" placeholder="備註（選填）" value="${esc(note)}"><div class="cart-total"><span>合計</span><strong>${money(total(state.draft))}</strong></div><button class="primary submit" data-action="submit" ${state.draft.length ? "" : "disabled"}>建立訂單</button></div></aside></div>`;
}
function orderCard(o, done = false) {
  const key = "lines-" + o.id,
    items = slicePage(o.items, key, sizes.lines);
  return `<article class="order-card"><div class="order-card-head"><strong>${number(o)}</strong><span>${time(o.createdAt)}</span>${o.note ? `<button class="order-note" data-note="${o.id}">備註</button>` : ""}<span class="status-pill">${done ? "已完成" : o.served ? "待付款" : o.payment ? "待出餐" : "製作中"}</span></div><div class="order-lines">${items.map((i) => `<div class="order-line"><div><b>${i.names.map(esc).join(" ＋ ")}</b><span>${i.counts.join(" ＋ ")} 顆</span></div><div><span>× ${i.qty} 份</span><strong>${money(i.price * i.qty)}</strong></div></div>`).join("")}</div>${o.items.length > 1 ? `<div class="page-slot">${pager(o.items, key, sizes.lines)}</div>` : ""}<div class="order-total"><span>${o.items.reduce((s, i) => s + i.qty, 0)} 份${o.actualAmount !== undefined ? `<small class="original-amount">原價 ${money(total(o.items))}</small>` : ""}</span><div class="order-amount"><strong>${money(orderTotal(o))}</strong>${!done || tab === "history" ? `<button class="edit-amount" data-edit-amount="${o.id}" aria-label="編輯 ${number(o)} 金額">編輯</button>` : ""}</div></div>${done ? `<div class="completed-info"><span>✓ ${o.payment}</span><span>${time(o.completedAt)}</span>${tab === "history" ? `<button class="history-delete" data-delete-history="${o.id}">刪除</button>` : ""}</div>` : `<div class="payment-options">${payments.map((p, i) => `<button class="${o.payment === p ? "paid" : ""}" data-payment="${i}" data-order="${o.id}" aria-pressed="${o.payment === p}">${p}</button>`).join("")}</div><button class="serve ${o.served ? "served" : ""}" data-serve="${o.id}" aria-pressed="${o.served}">${o.served ? "✓ 已出餐" : "標記已出餐"}</button>`}</article>`;
}
function ordersView(orders, key, done) {
  const slice = slicePage(orders, key, sizes.orders);
  return `<div class="orders-grid">${slice.length ? slice.map((o) => orderCard(o, done)).join("") : empty(done ? "尚無已完成訂單" : "尚無待出餐訂單")}</div><div class="page-slot">${pager(orders, key, sizes.orders)}</div>`;
}
function pendingView() {
  return `${heading("待出餐", "", `<span>${state.pending.length} 筆</span>`)}${ordersView(state.pending, "pending", false)}`;
}
function stats(orders) {
  return `<div class="stats"><div class="stat-main"><span>總金額 · ${orders.length} 筆</span><strong>${money(orders.reduce((s, o) => s + orderTotal(o), 0))}</strong></div>${payments.map((p) => `<div><span>${p}</span><strong>${money(orders.filter((o) => o.payment === p).reduce((s, o) => s + orderTotal(o), 0))}</strong></div>`).join("")}</div>`;
}
function historyView() {
  return `${heading("歷史訂單", "", `<button class="primary" data-action="archive" ${state.history.length ? "" : "disabled"}>封存紀錄</button>`)}${stats(state.history)}${ordersView([...state.history].reverse(), "history", true)}`;
}
function archivesView() {
  const batch = state.archives.find((a) => a.id === archiveId);
  if (batch)
    return `${heading(batch.date, "", `<button class="secondary" data-action="back">返回封存清單</button>`)}${stats(batch.orders)}${ordersView([...batch.orders].reverse(), "batch-" + batch.id, true)}`;
  const batches = slicePage(state.archives, "archives", sizes.archives);
  return `${heading("封存紀錄")}<div class="archive-list">${batches.length ? batches.map((a) => `<button class="archive-row" data-archive="${a.id}"><strong>${a.date}</strong><span>${a.orders.length} 筆</span><b>${money(a.orders.reduce((s, o) => s + orderTotal(o), 0))}</b><span>›</span></button>`).join("") : empty("尚無封存紀錄")}</div><div class="page-slot">${pager(state.archives, "archives", sizes.archives)}</div>`;
}
window.addEventListener("resize", () => requestAnimationFrame(fitPages));

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.deleteHistory) {
    const order = state.history.find((o) => o.id === d.deleteHistory);
    if (!order) return;
    confirmOperation(
      "刪除歷史訂單？",
      `${number(order)}，實收 ${money(orderTotal(order))}。刪除後無法復原，歷史總額也會扣除此筆金額。`,
      "確認刪除",
      () => {
        if (mutate((s) => deleteHistoryOrder(s, order.id)))
          toast("歷史訂單已刪除");
      },
    );
    return;
  }
  if (d.editAmount) {
    amountScope = tab === "history" ? "history" : "pending";
    const order = state[amountScope].find((o) => o.id === d.editAmount);
    if (!order) return;
    amountOrderId = order.id;
    $("#amount-warning").hidden = amountScope !== "history";
    $("#amount-title").textContent = `${number(order)} 編輯收款金額`;
    $("#amount-original").textContent = `原價 ${money(total(order.items))}`;
    $("#actual-amount").value = orderTotal(order);
    $("#amount-error").textContent = "";
    $("#amount-dialog").showModal();
    $("#actual-amount").focus();
    $("#actual-amount").select();
    return;
  }
  if (d.page) {
    pages[d.page] = (pages[d.page] || 0) + Number(d.step);
    render();
    return;
  }
  if (d.cartView) {
    compactCart = d.cartView === "true";
    render();
    return;
  }
  if (d.note) {
    const order = [
      ...state.pending,
      ...state.history,
      ...state.archives.flatMap((a) => a.orders),
    ].find((o) => o.id === d.note);
    document.querySelector("#note-content").textContent = order.note;
    document.querySelector("#note-dialog").showModal();
    return;
  }
  if (d.tab) {
    tab = d.tab;
    archiveId = null;
    render();
    return;
  }
  if (d.flavor !== undefined) {
    const f = flavors[Number(d.flavor)];
    if (selected.includes(f)) selected = selected.filter((n) => n !== f);
    else if (selected.length === 2) {
      toast("一份最多選 2 種口味，請先取消其中一種");
      return;
    } else selected.push(f);
    split = 3;
    render();
    return;
  }
  if (d.remove) {
    mutate((s) => (s.draft = s.draft.filter((i) => i.id !== d.remove)));
    return;
  }
  if (d.quantity) {
    mutate((s) => {
      const i = s.draft.find((i) => i.id === d.quantity);
      i.qty += Number(d.delta);
      if (i.qty <= 0) s.draft = s.draft.filter((i) => i.id !== d.quantity);
    });
    return;
  }
  if (d.payment !== undefined) {
    mutate((s) => {
      const o = s.pending.find((o) => o.id === d.order);
      const p = payments[Number(d.payment)];
      updateOrder(s, o.id, "payment", o.payment === p ? null : p);
    });
    return;
  }
  if (d.serve) {
    mutate((s) =>
      updateOrder(
        s,
        d.serve,
        "served",
        !s.pending.find((o) => o.id === d.serve).served,
      ),
    );
    return;
  }
  if (d.archive) {
    archiveId = d.archive;
    render();
    return;
  }
  switch (d.action) {
    case "qty-minus":
      qty = Math.max(1, qty - 1);
      render();
      break;
    case "qty-plus":
      qty = Math.min(99, qty + 1);
      render();
      break;
    case "add":
      if (mutate((s) => addItem(s, selected, qty, split))) {
        selected = [];
        qty = 1;
        render();
        toast("已加入本次點餐");
      }
      break;
    case "submit": {
      let order;
      if (mutate((s) => (order = submitOrder(s, note)))) {
        note = "";
        selected = [];
        qty = 1;
        render();
        toast(`訂單 ${number(order)} 已建立，加入待出餐`);
      }
      break;
    }
    case "archive":
      $("#archive-date").value = day();
      $("#archive-description").textContent =
        `共 ${state.history.length} 筆，總金額 ${money(state.history.reduce((s, o) => s + orderTotal(o), 0))}。`;
      $("#archive-dialog").showModal();
      break;
    case "back":
      archiveId = null;
      render();
      break;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "note") note = e.target.value;
});
document.addEventListener("change", (e) => {
  if (e.target.id === "split") split = Number(e.target.value);
});
$("#cancel-archive").onclick = () => $("#archive-dialog").close();
$("#cancel-amount").onclick = () => $("#amount-dialog").close();
function confirmOperation(title, description, label, action) {
  $("#confirm-title").textContent = title;
  $("#confirm-description").textContent = description;
  $("#confirm-action").textContent = label;
  confirmAction = action;
  $("#confirm-dialog").showModal();
  $("#cancel-confirm").focus();
}
$("#cancel-confirm").onclick = () => $("#confirm-dialog").close();
$("#confirm-dialog").addEventListener("close", () => {
  confirmAction = null;
});
$("#confirm-action").onclick = () => {
  const action = confirmAction;
  confirmAction = null;
  $("#confirm-dialog").close();
  action?.();
};
function saveAmount(amount, confirmed = false) {
  if (amountScope === "history" && !confirmed) {
    const order = state.history.find((o) => o.id === amountOrderId);
    if (!order) return;
    confirmOperation(
      "修改歷史金額？",
      `${number(order)}：${money(orderTotal(order))} → ${money(amount ?? total(order.items))}。這會更新歷史總額，確定儲存？`,
      "確認修改",
      () => saveAmount(amount, true),
    );
    return;
  }
  if (mutate((s) => setOrderAmount(s, amountOrderId, amount, amountScope))) {
    $("#amount-dialog").close();
    toast(amount === null ? "已恢復原價" : "收款金額已更新");
  } else {
    $("#amount-error").textContent = "無法儲存，請關閉視窗確認訂單狀態後再試。";
  }
}
$("#reset-amount").onclick = () => saveAmount(null);
$("#amount-form").onsubmit = (e) => {
  e.preventDefault();
  const value = $("#actual-amount").value.trim();
  if (!/^\d{1,6}$/.test(value)) {
    $("#amount-error").textContent = "請輸入 0–999999 的整數金額";
    return;
  }
  saveAmount(Number(value));
};
$("#archive-form").onsubmit = (e) => {
  e.preventDefault();
  if (mutate((s) => archive(s, $("#archive-date").value))) {
    $("#archive-dialog").close();
    toast("已封存，可至封存紀錄查看");
  }
};
$("#backup").onclick = () => {
  const content = storageBroken
    ? localStorage.getItem(KEY) || ""
    : JSON.stringify(state, null, 2);
  if (window.AndroidApp) {
    window.AndroidApp.saveBackup(content);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `小A點餐備份-${day()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("已下載訂單備份");
};
window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    try {
      state = readState();
      storageBroken = false;
      render();
      toast("訂單資料已同步更新");
    } catch {
      storageBroken = true;
      toast("資料變更異常，請重新整理");
    }
  }
});
$("#date").textContent = new Date().toLocaleDateString("zh-TW", {
  month: "long",
  day: "numeric",
  weekday: "long",
});
if (window.AndroidApp?.checkForUpdate) {
  const button = document.createElement("button");
  button.className = "secondary update-button";
  button.textContent = "檢查更新";
  button.title = "目前版本 v" + window.AndroidApp.getVersionName();
  button.setAttribute("aria-label", "檢查更新");
  button.onclick = () => window.AndroidApp.checkForUpdate();
  document
    .querySelector(".topbar")
    .insertBefore(button, document.querySelector("#backup"));
}
render();
if (storageBroken) toast("本機資料無法讀取，已暫停寫入以保留原始紀錄。");
if (
  "serviceWorker" in navigator &&
  location.hostname !== "localhost" &&
  location.hostname !== "appassets.androidplatform.net"
)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
