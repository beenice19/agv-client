const fs = require("fs");

const file = "App.jsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
/\s*<button\s+style=\{styles\.secondaryButton\}\s+onClick=\{\(\) => stageContentFileRef\.current\?\.click\(\)\}\s*>\s*Bring File to Stage\s*<\/button>/g,
""
);

fs.writeFileSync(file, code, "utf8");
console.log("CLIENT COMPLETE: Bring File to Stage button hidden.");
