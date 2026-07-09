const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "src", "AppCore.jsx");
const pass = "PASS_LIVE_ENV_VENDOR_URL_1";
if (!fs.existsSync(file)) {
  console.error("PATCH FAILED: AppCore.jsx not found:", file);
  process.exit(1);
}
let src = fs.readFileSync(file, "utf8");
if (src.includes(pass)) {
  console.log(pass + " already installed. No changes made.");
  process.exit(0);
}
const backup = file.replace(/\.jsx$/, `.BEFORE-${pass}.${Date.now()}.jsx`);
fs.writeFileSync(backup, src, "utf8");
console.log("Backup created:");
console.log(backup);
function fail(message) {
  console.error("PATCH FAILED:", message);
  console.error("Backup preserved at:");
  console.error(backup);
  process.exit(1);
}
// 1. Add VENDOR_API_BASE near the existing API base constants.
// We place it after TICKET_API_BASE because Vendor Dock depends on server APIs.
const ticketBaseBlock = `const TICKET_API_BASE =
  import.meta.env.VITE_AGV_TICKET_API_URL || "http://127.0.0.1:8796";
`;
const vendorBaseBlock = `const TICKET_API_BASE =
  import.meta.env.VITE_AGV_TICKET_API_URL || "http://127.0.0.1:8796";
const VENDOR_API_BASE =
  import.meta.env.VITE_AGV_VENDOR_API_URL || "http://127.0.0.1:8795"; // ${pass}
`;
if (!src.includes(ticketBaseBlock)) {
  fail("Could not find TICKET_API_BASE block.");
}
src = src.replace(ticketBaseBlock, vendorBaseBlock);
// 2. Replace hardcoded Vendor Gateway fetches.
const replacements = [
  {
    from: `fetch("http://127.0.0.1:8795/api/vendor/list")`,
    to: "fetch(`${VENDOR_API_BASE}/api/vendor/list`)",
  },
  {
    from: `fetch("http://127.0.0.1:8795/api/vendor/" + route, {`,
    to: "fetch(`${VENDOR_API_BASE}/api/vendor/${route}`, {",
  },
  {
    from: `fetch("http://127.0.0.1:8795/api/vendor/connect/" + gatewayChoice, {`,
    to: "fetch(`${VENDOR_API_BASE}/api/vendor/connect/${gatewayChoice}`, {",
  },
];
let changed = 0;
for (const item of replacements) {
  if (src.includes(item.from)) {
    src = src.replace(item.from, item.to);
    changed++;
  }
}
if (changed < 3) {
  fail("Expected to replace 3 Vendor Gateway hardcoded fetches, but replaced " + changed + ".");
}
fs.writeFileSync(file, src, "utf8");
console.log(pass + " installed successfully.");
console.log("Updated:");
console.log(file);
console.log("");
console.log("What changed:");
console.log("- Added VENDOR_API_BASE using VITE_AGV_VENDOR_API_URL.");
console.log("- Local fallback remains http://127.0.0.1:8795.");
console.log("- Replaced hardcoded Vendor Gateway fetch calls.");
console.log("- SERVER/payment/ticket/vendor server logic untouched.");
