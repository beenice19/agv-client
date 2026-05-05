const fs = require("fs");

const file = "App.jsx";
let code = fs.readFileSync(file, "utf8");

// Add safe mobile CSS once, inside the app shell.
// This does not touch LiveKit, server, auth, camera, or screen share logic.
if (!code.includes("AGV_MOBILE_RESPONSIVE_SAFE_PASS")) {
  code = code.replace(
`    <div style={styles.appShell}>`,
`    <div style={styles.appShell}>
      <style>{\`
        /* AGV_MOBILE_RESPONSIVE_SAFE_PASS */
        @media (max-width: 980px) {
          header {
            position: relative !important;
          }

          main {
            display: flex !important;
            flex-direction: column !important;
            padding: 10px !important;
            gap: 12px !important;
          }

          aside,
          section {
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            top: auto !important;
          }

          button,
          select,
          input,
          textarea {
            min-height: 44px !important;
            font-size: 15px !important;
          }

          video,
          iframe,
          img {
            max-width: 100% !important;
          }
        }

        @media (max-width: 640px) {
          main {
            padding: 8px !important;
          }

          button,
          select,
          input,
          textarea {
            width: 100% !important;
          }
        }
      \`}</style>`
  );
}

fs.writeFileSync(file, code, "utf8");
console.log("CLIENT MOBILE RESPONSIVE SAFE PASS COMPLETE");
