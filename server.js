import http from "node:http";
import { readFile } from "node:fs/promises";
const files = [
  "index.html",
  "app.js",
  "model.js",
  "storage.js",
  "style.css",
  "sw.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
];
const mime = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  webmanifest: "application/manifest+json",
};
http
  .createServer(async (req, res) => {
    try {
      const name =
        decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(
          1,
        ) || "index.html";
      if (name === "__reset-test-data.js") {
        const request = JSON.parse(
          await readFile(".local/reset-request.json", "utf8"),
        );
        res.writeHead(200, {
          "Content-Type": mime.js,
          "Cache-Control": "no-store",
        });
        res.end(
          `if(location.hostname==='localhost'&&location.port==='4173'&&localStorage.getItem('little-a-reset')!==${JSON.stringify(request.id)}){localStorage.removeItem('little-a-orders-v1');localStorage.setItem('little-a-reset',${JSON.stringify(request.id)});}`,
        );
        return;
      }
      if (!files.includes(name)) {
        res.writeHead(404).end("Not found");
        return;
      }
      let data = await readFile(new URL(name, import.meta.url));
      if (name === "index.html") {
        try {
          await readFile(".local/reset-request.json");
          data = data
            .toString()
            .replace(
              "<head>",
              '<head><script src="/__reset-test-data.js"></script>',
            );
        } catch {}
      }
      res.writeHead(200, {
        "Content-Type": mime[name.split(".").pop()],
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(Number(process.env.PORT || 4173), "0.0.0.0", () =>
    console.log(`Little A: http://localhost:${process.env.PORT || 4173}`),
  );
