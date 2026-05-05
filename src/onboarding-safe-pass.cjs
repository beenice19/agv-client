const fs = require("fs");

const file = "App.jsx";
let code = fs.readFileSync(file, "utf8");

// 1) Add host instruction banner
code = code.replace(
/return \(\s*</,
`return (
  <>
    {canControlStage && (
      <div style={{
        padding: "10px",
        background: "#111",
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold"
      }}>
        You are the host. Click START BROADCAST to go live.
      </div>
    )}
`
);

// 2) Add START BROADCAST label to camera button
code = code.replace(
/Start Camera/g,
"START BROADCAST"
);

// 3) Add LIVE indicator
code = code.replace(
/LIVE BROADCAST/g,
"🔴 YOU ARE LIVE"
);

// 4) Improve standby text
code = code.replace(
/EVENT STANDBY/g,
"Waiting for host to go live..."
);

fs.writeFileSync(file, code, "utf8");
console.log("ONBOARDING SAFE PASS COMPLETE");
