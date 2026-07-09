const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "src", "AppCore.jsx");
const pass = "PASS_VENDOR_TICKET_SALES_LEDGER_1_V3";
if (!fs.existsSync(file)) {
  console.error("PATCH FAILED: AppCore.jsx not found:", file);
  process.exit(1);
}
let src = fs.readFileSync(file, "utf8");
if (src.includes("vendorTicketSalesSummary") || src.includes(pass)) {
  console.log("Vendor ticket sales ledger wiring already appears installed. No changes made.");
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
function insertAfterLineContaining(text, needle, insertText) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.includes(needle));
  if (idx < 0) fail("Could not find line containing: " + needle);
  lines.splice(idx + 1, 0, insertText.replace(/\r?\n$/, ""));
  return lines.join("\n");
}
function findFunctionEnd(text, functionName) {
  const start = text.indexOf(`function ${functionName}(`);
  if (start < 0) return -1;
  const open = text.indexOf("{", start);
  if (open < 0) return -1;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return i + 1;
  }
  return -1;
}
function replaceInsideSection(text, startMarker, endMarker, replacer) {
  const start = text.indexOf(startMarker);
  if (start < 0) fail("Could not find section start: " + startMarker);
  const end = text.indexOf(endMarker, start);
  if (end < 0) fail("Could not find section end after " + startMarker + ": " + endMarker);
  const before = text.slice(0, start);
  const section = text.slice(start, end);
  const after = text.slice(end);
  return before + replacer(section) + after;
}
// 1. Add state after vendorDockRecord state.
src = insertAfterLineContaining(
  src,
  "const [vendorDockRecord, setVendorDockRecord]",
`  const [vendorTicketSalesSummary, setVendorTicketSalesSummary] = useState(null); // ${pass}
  const [vendorTicketSalesWorking, setVendorTicketSalesWorking] = useState(false); // ${pass}
  const [vendorTicketSalesMessage, setVendorTicketSalesMessage] = useState(""); // ${pass}`
);
// 2. Add helper/loader after getRevenueAdminHeaders().
const fnEnd = findFunctionEnd(src, "getRevenueAdminHeaders");
if (fnEnd < 0) fail("Could not find end of getRevenueAdminHeaders().");
const loader = `
  function formatAgvCents(cents) {
    const safeCents = Number.isFinite(Number(cents)) ? Number(cents) : 0;
    return "$" + (safeCents / 100).toFixed(2);
  }
  function readTicketRevenueCents(ticket, field, fallback = 0) {
    const direct = ticket?.revenue?.[field];
    if (Number.isFinite(Number(direct))) {
      return Number(direct);
    }
    return fallback;
  }
  async function loadVendorTicketSalesFromServer() {
    let cleanPin = String(revenueAdminPin || "").trim();
    if (!cleanPin) {
      const promptedPin = window.prompt("Enter AGV ticket admin PIN to load protected ticket sales.");
      cleanPin = String(promptedPin || "").trim();
      if (!cleanPin) {
        setVendorTicketSalesMessage("Ticket sales not loaded. Admin PIN required.");
        setStatus("Ticket sales not loaded. Admin PIN required.");
        return;
      }
      setRevenueAdminPin(cleanPin);
      try {
        localStorage.setItem("agv_revenue_admin_pin", cleanPin);
      } catch {}
    }
    setVendorTicketSalesWorking(true);
    setVendorTicketSalesMessage("Loading protected ticket sales ledger...");
    setStatus("Loading protected ticket sales ledger...");
    try {
      const response = await fetch(\`\${TICKET_API_BASE}/api/tickets/list\`, {
        headers: {
          "x-agv-admin-pin": cleanPin,
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok || !Array.isArray(data.tickets)) {
        const message = data?.message || data?.error || "Could not load protected ticket sales ledger.";
        setVendorTicketSalesMessage(message);
        setStatus(message);
        setVendorTicketSalesWorking(false);
        return;
      }
      const paidTickets = data.tickets.filter((ticket) => {
        const paid = String(ticket?.paymentStatus || "").toLowerCase() === "paid";
        return paid && ticket?.paymentVerified === true;
      });
      const summary = paidTickets.reduce(
        (acc, ticket) => {
          const grossFallback = Number.isFinite(Number(ticket?.amountTotalCents)) ? Number(ticket.amountTotalCents) : 0;
          const gross = readTicketRevenueCents(ticket, "grossTicketRevenueCents", grossFallback);
          const agvFee = readTicketRevenueCents(ticket, "agvPlatformFeeCents", Math.round(gross * 0.07));
          const deliveryFee = readTicketRevenueCents(ticket, "broadcastDeliveryFeeCents", 0);
          const processingFee = readTicketRevenueCents(ticket, "paymentProcessingFeeCents", 0);
          const netFallback = Math.max(gross - agvFee - deliveryFee - processingFee, 0);
          const net = readTicketRevenueCents(ticket, "hostVendorNetRevenueCents", netFallback);
          acc.ticketsSold += 1;
          acc.grossTicketRevenueCents += gross;
          acc.agvPlatformFeeCents += agvFee;
          acc.broadcastDeliveryFeeCents += deliveryFee;
          acc.paymentProcessingFeeCents += processingFee;
          acc.hostVendorNetRevenueCents += net;
          if (!acc.latestTicketCode && ticket?.code) {
            acc.latestTicketCode = ticket.code;
          }
          return acc;
        },
        {
          ticketsSold: 0,
          grossTicketRevenueCents: 0,
          agvPlatformFeeCents: 0,
          broadcastDeliveryFeeCents: 0,
          paymentProcessingFeeCents: 0,
          hostVendorNetRevenueCents: 0,
          latestTicketCode: "",
          loadedAt: new Date().toISOString(),
        }
      );
      setVendorTicketSalesSummary(summary);
      setVendorTicketSalesMessage("Loaded " + summary.ticketsSold + " paid verified ticket sale(s) from protected ledger.");
      setStatus("Vendor Dock ticket sales updated from protected ticket ledger.");
    } catch {
      setVendorTicketSalesMessage("Ticket sales ledger offline or unreachable.");
      setStatus("Ticket sales ledger offline or unreachable.");
    }
    setVendorTicketSalesWorking(false);
  }
`;
src = src.slice(0, fnEnd) + loader + src.slice(fnEnd);
// 3. Patch Vendor Ticket Sales section.
src = replaceInsideSection(src, "3. Vendor Ticket Sales", "4. Financial Dock", (section) => {
  let out = section;
  out = out.replace(
    `<span>Tickets Sold</span><strong style={{ color: "#f8fafc" }}>0</strong>`,
    `<span>Tickets Sold</span><strong style={{ color: "#f8fafc" }}>{vendorTicketSalesSummary?.ticketsSold || 0}</strong>`
  );
  out = out.replace(
    `<span>Gross Ticket Revenue</span><strong style={{ color: "#f8fafc" }}>$0.00</strong>`,
    `<span>Gross Ticket Revenue</span><strong style={{ color: "#f8fafc" }}>{formatAgvCents(vendorTicketSalesSummary?.grossTicketRevenueCents)}</strong>`
  );
  out = out.replace(
    `<span>AGV Platform Fee 7%</span><strong style={{ color: "#fde68a" }}>$0.00</strong>`,
    `<span>AGV Platform Fee 7%</span><strong style={{ color: "#fde68a" }}>{formatAgvCents(vendorTicketSalesSummary?.agvPlatformFeeCents)}</strong>`
  );
  out = out.replace(
    `<span>Net Vendor Revenue</span><strong style={{ color: "#bbf7d0" }}>$0.00</strong>`,
    `<span>Net Vendor Revenue</span><strong style={{ color: "#bbf7d0" }}>{formatAgvCents(vendorTicketSalesSummary?.hostVendorNetRevenueCents)}</strong>`
  );
  const netLine = `<span>Net Vendor Revenue</span><strong style={{ color: "#bbf7d0" }}>{formatAgvCents(vendorTicketSalesSummary?.hostVendorNetRevenueCents)}</strong></div>`;
  const insertAfterNet = `${netLine}
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment Processing</span><strong style={{ color: "#bfdbfe" }}>{formatAgvCents(vendorTicketSalesSummary?.paymentProcessingFeeCents)}</strong></div>
                  <button
                    type="button"
                    onClick={loadVendorTicketSalesFromServer}
                    disabled={vendorTicketSalesWorking}
                    style={{ ...styles.primaryButton, marginTop: 8 }}
                  >
                    {vendorTicketSalesWorking ? "Loading Ticket Sales..." : "Refresh Ticket Sales"}
                  </button>
                  {vendorTicketSalesMessage ? <div style={{ color: "#fde68a", fontWeight: 850 }}>{vendorTicketSalesMessage}</div> : null}
                  {vendorTicketSalesSummary?.latestTicketCode ? <div style={{ color: "#93c5fd" }}>Latest paid ticket: {vendorTicketSalesSummary.latestTicketCode}</div> : null}`;
  if (!out.includes(netLine)) fail("Vendor Ticket Sales values were not replaced cleanly.");
  out = out.replace(netLine, insertAfterNet);
  return out;
});
// 4. Patch Financial Dock section.
src = replaceInsideSection(src, "4. Financial Dock", "5. Vendor Status", (section) => {
  let out = section;
  out = out.replace(
    `<span>Gross Revenue</span><strong style={{ color: "#f8fafc" }}>$0.00</strong>`,
    `<span>Gross Revenue</span><strong style={{ color: "#f8fafc" }}>{formatAgvCents(vendorTicketSalesSummary?.grossTicketRevenueCents)}</strong>`
  );
  out = out.replace(
    `<span>AGV 7% Fee</span><strong style={{ color: "#fde68a" }}>$0.00</strong>`,
    `<span>AGV 7% Fee</span><strong style={{ color: "#fde68a" }}>{formatAgvCents(vendorTicketSalesSummary?.agvPlatformFeeCents)}</strong>`
  );
  out = out.replace(
    `<span>Net Revenue</span><strong style={{ color: "#bbf7d0" }}>$0.00</strong>`,
    `<span>Net Revenue</span><strong style={{ color: "#bbf7d0" }}>{formatAgvCents(vendorTicketSalesSummary?.hostVendorNetRevenueCents)}</strong>`
  );
  const feeLine = `<span>AGV 7% Fee</span><strong style={{ color: "#fde68a" }}>{formatAgvCents(vendorTicketSalesSummary?.agvPlatformFeeCents)}</strong></div>`;
  const feeWithProcessing = `${feeLine}
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment Processing</span><strong style={{ color: "#bfdbfe" }}>{formatAgvCents(vendorTicketSalesSummary?.paymentProcessingFeeCents)}</strong></div>`;
  if (!out.includes(feeLine)) fail("Financial Dock values were not replaced cleanly.");
  out = out.replace(feeLine, feeWithProcessing);
  return out;
});
fs.writeFileSync(file, src, "utf8");
console.log(pass + " installed successfully.");
console.log("Updated:");
console.log(file);
console.log("");
console.log("What changed:");
console.log("- Added vendor ticket sales summary state.");
console.log("- Added protected ticket ledger loader.");
console.log("- Added Refresh Ticket Sales button.");
console.log("- Replaced Vendor Dock placeholder totals.");
console.log("- Replaced Financial Dock placeholder totals.");
console.log("- SERVER/payment/ticket creation logic untouched.");
