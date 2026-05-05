const fs = require("fs");

const file = "App.jsx";
let code = fs.readFileSync(file, "utf8");

// Add onboarding card BEFORE stage controls safely
code = code.replace(
/(\{canControlStage && \([\s\S]*?<div[^>]*stage[^>]*>)/i,
`$1
      <div style={{
        padding: "10px",
        marginBottom: "10px",
        background: "#111",
        color: "#fff",
        border: "1px solid #333",
        borderRadius: "6px",
        fontSize: "13px"
      }}>
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Host Quick Start
        </div>
        <div>1. Choose your room</div>
        <div>2. Click START BROADCAST</div>
        <div>3. Use Share Screen if presenting</div>
        <div>4. Copy Invite Link for viewers</div>
      </div>
`
);

// Rename Start Camera safely
code = code.replace(/Start Camera/g, "START BROADCAST");

fs.writeFileSync(file, code, "utf8");
console.log("ONBOARDING CARD SAFE PASS COMPLETE");
