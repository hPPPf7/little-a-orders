import { mkdir, copyFile, readFile } from "node:fs/promises";
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
for (const dir of ["dist", "android/app/src/main/assets"]) {
  await mkdir(dir, { recursive: true });
  for (const file of files) await copyFile(file, `${dir}/${file}`);
}
const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (!/^[0-9]{1,3}\.[0-9]{1,2}\.[0-9]{1,2}$/.test(pkg.version))
  throw Error("Invalid release version");
console.log(`Packaged web assets for ${pkg.version}`);
