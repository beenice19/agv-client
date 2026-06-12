const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "src", "AppCore.jsx");
const cssPath = path.join(root, "src", "index.css");

if (!fs.existsSync(appPath)) {
  console.error("PASS CLEAN-SCALE-2 FAILED: src/AppCore.jsx not found.");
  process.exit(1);
}

const stamp = Date.now();

const appBackup = path.join(
  root,
  "src",
  `AppCore.BEFORE-PASS-CLEAN-SCALE-2-FINAL-BRIDGE-PRIMARY.${stamp}.jsx`
);

fs.copyFileSync(appPath, appBackup);

let app = fs.readFileSync(appPath, "utf8");

const original = app;

const buttonRegex = /<button\b([^>]*)>([\s\S]*?Final Bridge[\s\S]*?)<\/button>/i;

if (!buttonRegex.test(app)) {
  console.error("PASS CLEAN-SCALE-2 FAILED: Could not find a Final Bridge button in AppCore.jsx.");
  console.error("Backup preserved at:");
  console.error(appBackup);
  process.exit(1);
}

app = app.replace(buttonRegex, (full, attrs, inner) => {
  let newAttrs = attrs;

  if (/className\s*=/.test(newAttrs)) {
    newAttrs = newAttrs.replace(
      /className\s*=\s*{`([^`]*)`}/,
      'className={`$1 agv-primary-broadcast-btn agv-final-bridge-primary`}'
    );

    newAttrs = newAttrs.replace(
      /className\s*=\s*"([^"]*)"/,
      'className="$1 agv-primary-broadcast-btn agv-final-bridge-primary"'
    );

    newAttrs = newAttrs.replace(
      /className\s*=\s*'([^']*)'/,
      "className='$1 agv-primary-broadcast-btn agv-final-bridge-primary'"
    );
  } else {
    newAttrs += ' className="agv-primary-broadcast-btn agv-final-bridge-primary"';
  }

  if (!/aria-label\s*=/.test(newAttrs)) {
    newAttrs += ' aria-label="Primary Broadcast Button"';
  }

  if (!/title\s*=/.test(newAttrs)) {
    newAttrs += ' title="Primary Broadcast Button"';
  }

  let newInner = inner.replace(/Final Bridge/gi, "PRIMARY BROADCAST");

  return `<button${newAttrs}>${newInner}</button>`;
});

if (app === original) {
  console.error("PASS CLEAN-SCALE-2 FAILED: AppCore.jsx did not change.");
  console.error("Backup preserved at:");
  console.error(appBackup);
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

if (fs.existsSync(cssPath)) {
  const cssBackup = path.join(
    root,
    "src",
    `index.BEFORE-PASS-CLEAN-SCALE-2-FINAL-BRIDGE-PRIMARY.${stamp}.css`
  );

  fs.copyFileSync(cssPath, cssBackup);

  let css = fs.readFileSync(cssPath, "utf8");

  const cssMarker = "/* PASS CLEAN-SCALE-2 — FINAL BRIDGE PRIMARY BROADCAST BUTTON */";

  if (!css.includes(cssMarker)) {
    css += `

${cssMarker}
.agv-primary-broadcast-btn,
.agv-final-bridge-primary {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  min-height: 48px !important;
  padding: 14px 22px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(255, 215, 128, 0.9) !important;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.28), transparent 34%),
    linear-gradient(135deg, #f7c948 0%, #d97706 48%, #7c2d12 100%) !important;
  color: #111827 !important;
  font-weight: 950 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16) inset,
    0 18px 44px rgba(217, 119, 6, 0.34),
    0 0 28px rgba(247, 201, 72, 0.30) !important;
  cursor: pointer !important;
}

.agv-primary-broadcast-btn:hover,
.agv-final-bridge-primary:hover {
  transform: translateY(-1px) scale(1.01) !important;
  filter: brightness(1.07) !important;
}

.agv-primary-broadcast-btn:active,
.agv-final-bridge-primary:active {
  transform: translateY(0) scale(0.99) !important;
}
`;
    fs.writeFileSync(cssPath, css, "utf8");
    console.log("CSS updated:");
    console.log(cssPath);
    console.log("CSS backup created:");
    console.log(cssBackup);
  } else {
    console.log("CSS marker already exists. CSS not duplicated.");
  }
} else {
  console.log("NOTICE: src/index.css not found. AppCore.jsx was still updated.");
}

console.log("");
console.log("PASS CLEAN-SCALE-2 COMPLETE");
console.log("CLIENT ONLY");
console.log("Final Bridge is now promoted as the PRIMARY BROADCAST button.");
console.log("");
console.log("Backup created:");
console.log(appBackup);