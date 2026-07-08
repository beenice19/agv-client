const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "index.html");
if (!fs.existsSync(file)) {
  console.error("PASS FAILED: index.html not found.");
  process.exit(1);
}
const backup = path.join(
  process.cwd(),
  "index.BEFORE-AGV-BRANDING-POLISH-1." + Date.now() + ".html"
);
fs.copyFileSync(file, backup);
let html = fs.readFileSync(file, "utf8");
const before = html;
if (html.match(/<title>.*?<\/title>/i)) {
  html = html.replace(/<title>.*?<\/title>/i, "<title>AGV | Avant Global Vision</title>");
} else {
  html = html.replace(
    /<head[^>]*>/i,
    match => `${match}\n    <title>AGV | Avant Global Vision</title>`
  );
}
if (!html.includes('name="description"')) {
  html = html.replace(
    /<title>AGV \| Avant Global Vision<\/title>/i,
    `<title>AGV | Avant Global Vision</title>
    <meta name="description" content="AGV is a digital venue platform for live events, ticketed rooms, creators, ministries, conventions, and protected broadcasts." />`
  );
}
fs.writeFileSync(file, html, "utf8");
console.log("");
console.log("==================================================");
console.log(" PASS AGV-BRANDING-POLISH-1 COMPLETE");
console.log("==================================================");
console.log("Backup created:");
console.log(backup);
console.log("");
console.log("Changed:");
console.log("Browser title -> AGV | Avant Global Vision");
console.log("Description meta tag -> added if missing");
console.log("==================================================");
console.log("");
if (before === html) {
  console.log("NOTE: No visible file change was needed. Branding may already be present.");
}
