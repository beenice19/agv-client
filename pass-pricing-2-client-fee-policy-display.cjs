const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "src", "AppCore.jsx");

if (!fs.existsSync(file)) {
  console.error("PASS PRICING-2 FAILED: src/AppCore.jsx not found.");
  process.exit(1);
}

let src = fs.readFileSync(file, "utf8");

const stamp = Date.now();
const backup = path.join(
  process.cwd(),
  "src",
  `AppCore.BEFORE-PASS-PRICING-2-FEE-POLICY-DISPLAY.${stamp}.jsx`
);

fs.writeFileSync(backup, src, "utf8");

const marker = "PASS_PRICING_2_CLIENT_FEE_POLICY_DISPLAY";

if (src.includes(marker)) {
  console.log("PASS PRICING-2 already installed.");
  console.log("Backup created:", backup);
  process.exit(0);
}

const policyBox = `
                {/* PASS_PRICING_2_CLIENT_FEE_POLICY_DISPLAY */}
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(250,204,21,0.35)",
                    background:
                      "linear-gradient(135deg, rgba(120,53,15,0.42), rgba(15,23,42,0.84))",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 950,
                      color: "#fde68a",
                      fontSize: 13,
                      letterSpacing: 0.35,
                      marginBottom: 6,
                    }}
                  >
                    AGV Pricing & Broadcast Fee Policy
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.86)",
                      lineHeight: 1.55,
                    }}
                  >
                    Monthly subscriptions provide platform access. Paid ticketed events include a
                    <strong> 7% AGV ticket platform fee</strong>. Broadcast delivery fees are billed
                    separately to cover Cloudflare and streaming usage. Payment processing fees are
                    passed through separately. Large audience broadcasts, conventions, international
                    events, and high-viewer programs may require a custom quote before going live.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    <span style={styles.chip}>Subscription = Platform Access</span>
                    <span style={styles.chip}>AGV Ticket Fee = 7%</span>
                    <span style={styles.chip}>Broadcast Delivery = Separate</span>
                    <span style={styles.chip}>Processing = Pass Through</span>
                    <span style={styles.chip}>Large Event = Custom Quote</span>
                  </div>
                </div>
`;

const refreshText = "Refresh Plan From AGV subscription service";
const refreshIndex = src.indexOf(refreshText);

if (refreshIndex === -1) {
  console.error("PASS PRICING-2 FAILED: Could not find Refresh Plan From AGV subscription service button.");
  console.log("Backup preserved:", backup);
  process.exit(1);
}

const buttonStart = src.lastIndexOf("<button", refreshIndex);

if (buttonStart === -1) {
  console.error("PASS PRICING-2 FAILED: Could not find button before Refresh Plan text.");
  console.log("Backup preserved:", backup);
  process.exit(1);
}

src = src.slice(0, buttonStart) + policyBox + "\n" + src.slice(buttonStart);

fs.writeFileSync(file, src, "utf8");

console.log("PASS PRICING-2 INSTALLED SUCCESSFULLY");
console.log("Updated:", file);
console.log("Backup:", backup);
console.log("");
console.log("Added visible AGV pricing policy display before the Plan Sync button:");
console.log("- Monthly subscription = platform access");
console.log("- 7% ticket fee = AGV monetization");
console.log("- Broadcast delivery fee = covers Cloudflare");
console.log("- Payment processing = passed through");
console.log("- Large event = custom quote");
