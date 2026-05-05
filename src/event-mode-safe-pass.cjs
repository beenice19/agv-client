const fs = require("fs");

const file = "App.jsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(/AGV Stage/g, "AGV Stage • LIVE EVENT");
code = code.replace(/STANDBY/g, "EVENT STANDBY");
code = code.replace(/CAMERA LIVE/g, "LIVE BROADCAST");
code = code.replace(/SCREEN SHARE LIVE/g, "PRESENTATION LIVE");
code = code.replace(/JPG, PNG, WEBP, MP4, or PDF file/g, "");

fs.writeFileSync(file, code, "utf8");
console.log("EVENT MODE SAFE PASS COMPLETE");
