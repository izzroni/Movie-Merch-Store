const { spawn } = require("child_process");
const path = require("path");

console.log("==================================================");
console.log(" Starting Moviestore Backend & Frontend ");
console.log("==================================================");

// Start Backend
const backend = spawn("node", ["server.js"], {
  cwd: path.join(__dirname, "backend"),
  shell: true,
  stdio: "pipe",
  env: { ...process.env, PORT: "5000" }
});

backend.stdout.on("data", (data) => {
  process.stdout.write(`[BACKEND] ${data.toString()}`);
});

backend.stderr.on("data", (data) => {
  process.stderr.write(`[BACKEND ERR] ${data.toString()}`);
});

// Start Frontend
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const frontend = spawn(npmCmd, ["start"], {
  cwd: path.join(__dirname, "frontend"),
  shell: true,
  stdio: "pipe",
  env: { ...process.env, BROWSER: "none", PORT: "3000", CI: "true" },
});

frontend.stdout.on("data", (data) => {
  process.stdout.write(`[FRONTEND] ${data.toString()}`);
});

frontend.stderr.on("data", (data) => {
  process.stderr.write(`[FRONTEND ERR] ${data.toString()}`);
});

function cleanup() {
  console.log("\nStopping processes...");
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
