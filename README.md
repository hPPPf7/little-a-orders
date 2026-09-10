# 小A雞蛋糕點餐工作台

[Android APK 下載](https://github.com/hPPPf7/little-a-orders/releases/latest) · [網頁版](https://hpppf7.github.io/little-a-orders/)

Android 9 以上可安裝 Releases 中的 `little-a-orders.apk`。程式內附完整點餐介面，不依賴伺服器，啟動時自動檢查新版並下載；更新時驗證相同簽章，經 Android 系統確認安裝。保留相同套件及簽章，更新會保留既有資料。

## 發布新版

更新 `package.json` 的版本（例如 `1.0.1`）、`sw.js` 的快取版本及 `RELEASE_NOTES.md`，提交程式後推送對應的 `v1.0.1` tag。GitHub Actions 會執行測試、Android lint、模擬器測試與簽署，通過後建立含 APK、網頁 ZIP、SHA-256 的 Release。

GitHub Secrets 必須保留 `ANDROID_KEYSTORE_BASE64` 與 `ANDROID_KEYSTORE_PASSWORD`，不可在日後重新產生不同金鑰，否則舊 App 無法原地升級。本機 `.local/release.jks` 以密碼加密，`.local/signing-password.dpapi` 以 Windows DPAPI 加密，只有原 Windows 使用者可解密；兩者均不提交 Git。此專案不含測試訂單或備份。

Android 建置使用 JDK 17、Gradle 8.11.1、Android SDK 35；先執行 `node scripts/package-web.js`，再執行 `gradle -p android assembleDebug`。正式簽署透過 Actions 的加密 Secrets 進行。

執行 `npm start`，在電腦開啟 http://localhost:4173。使用 Node.js，無需安裝套件。執行 `npm test` 驗證計價及訂單狀態。

## 操作

1. 選 1–2 種口味、份數，按「加入清單」。混搭預設各 3 顆，可調整為 1＋5 至 5＋1。
2. 按「建立訂單」才會進入待出餐。
3. 點選現金、LINE PAY、全支付其中一項即標記已付款；再次點選可取消。付款與出餐皆完成後自動進歷史。
4. 歷史頁顯示總金額及付款方式小計。「封存目前紀錄」預設當日，可更改日期；封存所有已完成訂單並清空歷史，不影響待出餐。同日可多次封存。
5. 右上下載按鈕匯出包含草稿、待出餐、歷史及封存的 JSON 備份。

介面採大字與分頁，依視窗高度調整每頁口味、品項與訂單數量。小螢幕可切換「選口味／本次點餐」，不需要捲動清單；長訂單備註點選「備註」即可完整查看。

## 平板使用

本專案為靜態 PWA，可部署至 GitHub Pages 或其他 HTTPS 空間，再透過平板瀏覽器「加入主畫面」使用。首次載入後可離線操作。區網測試可使用電腦 IP 與 4173 連接埠（須允許防火牆），但一般 HTTP 區網網址不提供完整 PWA 離線安裝能力。iPad 請以 Safari 加入主畫面。

訂單保存在該裝置／瀏覽器的 localStorage，重新整理不會清空。不同裝置或不同網址不共用資料；清除網站資料會移除紀錄，請定期下载備份。備份目前為 JSON 匯出，沒有匯入介面。此版本適用單一點餐工作台，未提供多人同時操作的伺服器同步；付款按鈕只紀錄收款狀態，不會呼叫支付服務。

## 菜單來源

https://hpppf7.github.io/little-local-lane/小A雞蛋糕/index.html

2026-09-10 核對，每份 6 顆、最多 2 種口味：全原味 $50；原味＋任一其他口味 $55；其他單／雙口味 $60。共有 16 種固定與 2 種不定時口味。實際供應依當日店況。

