const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "src", "AppCore.jsx");

if (!fs.existsSync(appPath)) {
  console.error("PASS CLEAN-SCALE-2C FAILED: src/AppCore.jsx not found.");
  process.exit(1);
}

const stamp = Date.now();
const backupPath = path.join(
  root,
  "src",
  `AppCore.BEFORE-PASS-CLEAN-SCALE-2C-RESTORE-EVENT-SERVER-8786.${stamp}.jsx`
);

fs.copyFileSync(appPath, backupPath);

let app = fs.readFileSync(appPath, "utf8");
const before = app;

// Restore events to the real Event Server on 8786.
// Do not change ROOM_API_BASE / broadcast server on 8787.
app = app.replace(
  `import.meta.env.VITE_AGV_EVENT_API_URL || "http://127.0.0.1:8787";`,
  `import.meta.env.VITE_AGV_EVENT_API_URL || "http://127.0.0.1:8786";`
);

app = app.replaceAll(
  "Event server offline. Start AGV SERVER 8787.",
  "Event server offline. Start EVENT SERVER 8786."
);

app = app.replaceAll(
  "Could not reach event server on 8787.",
  "Could not reach event server on 8786."
);

app = app.replaceAll(
  "Events are stored on AGV SERVER 8787.",
  "Events are stored on EVENT SERVER 8786."
);

if (app === before) {
  console.error("PASS CLEAN-SCALE-2C FAILED: No matching 8787 event server text was changed.");
  console.error("Backup preserved at:");
  console.error(backupPath);
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log("PASS CLEAN-SCALE-2C COMPLETE");
console.log("CLIENT ONLY");
console.log("Event API restored to http://127.0.0.1:8786");
console.log("Broadcast / bridge API remains on ROOM_API_BASE / 8787.");
console.log("");
console.log("Backup created:");
console.log(backupPath);