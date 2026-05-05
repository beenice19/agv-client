const fs = require("fs");

const file = "App.jsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
`                  <button
                    style={styles.secondaryButton}
                    onClick={() => stageContentFileRef.current?.click()}
                  >
                    Bring File to Stage
                  </button>

`,
``
);

code = code.replace(
`                <input
                  ref={stageContentFileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf,image/*,video/mp4,application/pdf"
                  style={{ display: "none" }}
                  onChange={handleChooseStageContent}
                />

`,
``
);

code = code.replace(
` : "Start camera/screen share for viewers, or bring a JPG, PNG, WEBP, MP4, or PDF file onto the stage."}`,
` : "Start camera or screen share for viewers."}`
);

fs.writeFileSync(file, code, "utf8");
console.log("CLIENT SAFE PASS COMPLETE: Stage file upload trigger removed.");
