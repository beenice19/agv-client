const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "src", "AppCore.jsx");
const pass = "PASS_VENDOR_BOOTH_OPEN_1";
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
const oldBlock = `                    setVendorDockList(Array.isArray(data.vendors) ? data.vendors : []);
                    setStatus("Vendor list loaded. Select an existing vendor or create a new vendor profile.");
`;
const newBlock = `                    const loadedVendors = Array.isArray(data.vendors) ? data.vendors : [];
                    setVendorDockList(loadedVendors);
                    const openVendor =
                      loadedVendors.find((vendor) =>
                        vendor?.approvalStatus === "APPROVED" &&
                        vendor?.ticketSalesEnabled === true &&
                        (vendor?.gatewayStatus === "AGV_GATEWAY_ACTIVE" || vendor?.gatewayStatus === "VERIFIED")
                      ) ||
                      loadedVendors.find((vendor) => vendor?.approvalStatus === "APPROVED") ||
                      loadedVendors[0] ||
                      null;
                    if (openVendor) {
                      setVendorDockRecord(openVendor);
                      setVendorDockForm((prev) => ({
                        ...prev,
                        businessName: openVendor.businessName || "",
                        contactName: openVendor.contactName || "",
                        email: openVendor.email || "",
                        phone: openVendor.phone || "",
                        businessCategory: openVendor.businessCategory || "",
                        website: openVendor.website || "",
                        description: openVendor.description || "",
                      }));
                      setStatus("Vendor list loaded. Open approved vendor selected for ticket sales."); // ${pass}
                    } else {
                      setVendorDockRecord(null);
                      setStatus("Vendor list loaded. Select an existing vendor or create a new vendor profile."); // ${pass}
                    }
`;
if (!src.includes(oldBlock)) {
  fail("Could not find Vendor Dock list load block.");
}
src = src.replace(oldBlock, newBlock);
fs.writeFileSync(file, src, "utf8");
console.log(pass + " installed successfully.");
console.log("Updated:");
console.log(file);
console.log("");
console.log("What changed:");
console.log("- Vendor Dock now auto-selects an approved/open vendor after loading.");
console.log("- Booth Status should now show Open - Ticket Sales Enabled when approved vendor exists.");
console.log("- SERVER/payment/ticket logic untouched.");
