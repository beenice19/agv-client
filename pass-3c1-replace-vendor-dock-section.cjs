const fs = require("fs");

const path = "src/AppCore.jsx";
const backup = `src/AppCore.BEFORE-PASS-3C1-ENTIRE-VENDOR-DOCK.${Date.now()}.jsx`;

fs.copyFileSync(path, backup);

let s = fs.readFileSync(path, "utf8");

const startMarker = "{/* PASS_VENDOR_FINANCE_DOCK_3C */}";
const endMarker = "      </main>";

const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  console.error("PASS 3C.1 FAILED: Could not find full Vendor Dock section.");
  console.error("Backup preserved at:", backup);
  process.exit(1);
}

const replacement = `{/* PASS_LAUNCH_LOCK_3C1_VENDOR_FINANCIAL_DOCK_CLIENT_ONLY */}
      {vendorFinanceDockOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.76)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "min(1080px, 96vw)", maxHeight: "88vh", overflowY: "auto", borderRadius: 26, border: "1px solid rgba(212,175,55,0.50)", background: "linear-gradient(135deg, rgba(15,23,42,0.99), rgba(2,6,23,0.99))", boxShadow: "0 30px 90px rgba(0,0,0,0.60)", padding: 22, color: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 950, color: "#fde68a" }}>AGV Vendor Financial Docking Station</div>
                <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, maxWidth: 720 }}>
                  Vendor setup, payment gateway readiness, booth-ticket revenue, and AGV's fixed 7% ticket platform fee.
                </div>
              </div>
              <button onClick={() => setVendorFinanceDockOpen(false)} style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: "10px 14px", background: "rgba(15,23,42,0.85)", color: "#e5e7eb", fontWeight: 900, cursor: "pointer" }}>Close</button>
            </div>

            <div style={{ marginTop: 18, border: "1px solid rgba(34,197,94,0.24)", background: "rgba(22,101,52,0.12)", color: "#bbf7d0", borderRadius: 18, padding: 14, fontSize: 13, lineHeight: 1.5, fontWeight: 800 }}>
              MVP Scope: Vendor profile, payment gateway setup, booth-ticket financial summary, host approval, and AGV's 7% ticket platform fee.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 18 }}>
              <div style={{ border: "1px solid rgba(212,175,55,0.24)", borderRadius: 20, background: "rgba(15,23,42,0.72)", padding: 16 }}>
                <div style={{ color: "#fde68a", fontWeight: 950, marginBottom: 10 }}>1. Vendor Profile</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input style={styles.input} placeholder="Business name" />
                  <input style={styles.input} placeholder="Contact name" />
                  <input style={styles.input} placeholder="Vendor email" />
                  <input style={styles.input} placeholder="Phone number" />
                  <input style={styles.input} placeholder="Business category" />
                  <input style={styles.input} placeholder="Website optional" />
                  <textarea style={{ ...styles.input, minHeight: 82, resize: "vertical" }} placeholder="Vendor description" />
                  <button onClick={() => setStatus("Vendor profile UI is ready. SERVER save endpoint will connect in PASS 3C.2.")} style={styles.primaryButton}>Save Vendor Profile</button>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(212,175,55,0.24)", borderRadius: 20, background: "rgba(15,23,42,0.72)", padding: 16 }}>
                <div style={{ color: "#fde68a", fontWeight: 950, marginBottom: 10 }}>2. Payment Gateway Setup</div>
                <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>Vendor payment connection is required before booth-ticket sales are activated.</div>
                <div style={{ border: "1px solid rgba(239,68,68,0.32)", background: "rgba(127,29,29,0.18)", borderRadius: 16, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 950, color: "#fecaca" }}>Payment Status</div>
                  <div style={{ marginTop: 4, color: "#fee2e2", fontSize: 13 }}>Not Connected</div>
                </div>
                <button onClick={() => setStatus("Payment gateway setup button is ready. SERVER Stripe Connect onboarding will connect in PASS 3C.3.")} style={styles.primaryButton}>Connect Payment Account</button>
              </div>

              <div style={{ border: "1px solid rgba(212,175,55,0.24)", borderRadius: 20, background: "rgba(15,23,42,0.72)", padding: 16 }}>
                <div style={{ color: "#fde68a", fontWeight: 950, marginBottom: 10 }}>3. Vendor Ticket Sales</div>
                <div style={{ display: "grid", gap: 8, color: "#cbd5e1", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tickets Sold</span><strong style={{ color: "#f8fafc" }}>0</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Gross Ticket Revenue</span><strong style={{ color: "#f8fafc" }}>$0.00</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>AGV Platform Fee 7%</span><strong style={{ color: "#fde68a" }}>$0.00</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Net Vendor Revenue</span><strong style={{ color: "#bbf7d0" }}>$0.00</strong></div>
                  <div style={{ marginTop: 8, borderTop: "1px solid rgba(148,163,184,0.18)", paddingTop: 10, color: "#93c5fd", fontWeight: 900 }}>Booth Status: Closed Until Approved</div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(212,175,55,0.24)", borderRadius: 20, background: "rgba(15,23,42,0.72)", padding: 16 }}>
                <div style={{ color: "#fde68a", fontWeight: 950, marginBottom: 10 }}>4. Financial Dock</div>
                <div style={{ display: "grid", gap: 8, color: "#cbd5e1", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Gross Revenue</span><strong style={{ color: "#f8fafc" }}>$0.00</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>AGV 7% Fee</span><strong style={{ color: "#fde68a" }}>$0.00</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Net Revenue</span><strong style={{ color: "#bbf7d0" }}>$0.00</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment Account</span><strong style={{ color: "#fecaca" }}>Not Connected</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Approval Status</span><strong style={{ color: "#fef3c7" }}>Pending</strong></div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(212,175,55,0.24)", borderRadius: 20, background: "rgba(15,23,42,0.72)", padding: 16 }}>
                <div style={{ color: "#fde68a", fontWeight: 950, marginBottom: 10 }}>5. Vendor Status</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ border: "1px solid rgba(250,204,21,0.30)", background: "rgba(113,63,18,0.18)", borderRadius: 16, padding: 12 }}>
                    <div style={{ color: "#fef3c7", fontWeight: 950 }}>Pending</div>
                    <div style={{ color: "#fde68a", fontSize: 12, marginTop: 4 }}>Waiting for host approval and payment setup.</div>
                  </div>
                  <div style={{ border: "1px solid rgba(34,197,94,0.24)", background: "rgba(22,101,52,0.12)", borderRadius: 16, padding: 12 }}>
                    <div style={{ color: "#bbf7d0", fontWeight: 950 }}>Approved</div>
                    <div style={{ color: "#dcfce7", fontSize: 12, marginTop: 4 }}>Vendor can sell booth tickets when payment is connected.</div>
                  </div>
                  <div style={{ border: "1px solid rgba(239,68,68,0.24)", background: "rgba(127,29,29,0.14)", borderRadius: 16, padding: 12 }}>
                    <div style={{ color: "#fecaca", fontWeight: 950 }}>Suspended</div>
                    <div style={{ color: "#fee2e2", fontSize: 12, marginTop: 4 }}>Ticket sales disabled by host/admin.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

`;

s = s.slice(0, start) + replacement + s.slice(end);

fs.writeFileSync(path, s, "utf8");

console.log("PASS 3C.1 installed successfully.");
console.log("Backup created:", backup);