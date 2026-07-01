const fs = require("fs");

const path = "src/AppCore.jsx";
const backup = `src/AppCore.BEFORE-PASS-3C3-CONNECT-VENDOR-PAYMENT.${Date.now()}.jsx`;

fs.copyFileSync(path, backup);

let s = fs.readFileSync(path, "utf8");

const oldButton = `<button onClick={() => setStatus("Payment gateway setup button is ready. SERVER Stripe Connect onboarding will connect in PASS 3C.3.")} style={styles.primaryButton}>Connect Payment Account</button>`;

const newButton = `<button
                  onClick={async () => {
                    try {
                      setStatus("Opening AGV vendor payment setup...");

                      const vendorEmail =
                        storedAccount?.email ||
                        freeAccount?.email ||
                        "vendor@agv.local";

                      const vendorBusinessName =
                        storedAccount?.name ||
                        freeAccount?.name ||
                        "AGV Vendor";

                      const response = await fetch("http://127.0.0.1:8795/api/vendor/connect/stripe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: vendorEmail,
                          businessName: vendorBusinessName,
                          contactName: vendorBusinessName,
                          businessCategory: "AGV Event Vendor",
                          description: "AGV Vendor Financial Docking Station onboarding",
                        }),
                      });

                      const data = await response.json();

                      if (!response.ok || !data.ok || !data.onboardingUrl) {
                        throw new Error(data.error || "Vendor payment setup failed.");
                      }

                      setStatus("Redirecting to Stripe vendor onboarding...");
                      window.location.href = data.onboardingUrl;
                    } catch (error) {
                      setStatus("Vendor payment setup failed: " + (error.message || "Unknown error"));
                    }
                  }}
                  style={styles.primaryButton}
                >
                  Connect Payment Account
                </button>`;

if (!s.includes(oldButton)) {
  console.error("PASS 3C.3 FAILED: Connect Payment Account button was not found.");
  console.error("Backup created:", backup);
  process.exit(1);
}

s = s.replace(oldButton, newButton);

fs.writeFileSync(path, s, "utf8");

console.log("PASS 3C.3 installed successfully.");
console.log("Backup created:", backup);