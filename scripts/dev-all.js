const { spawn } = require("child_process");
const path = require("path");

// ANSI colour codes — no extra dependencies needed
const COLORS = {
  reset:    "\x1b[0m",
  backend:  "\x1b[36m",   // cyan
  frontend: "\x1b[35m",   // magenta
  system:   "\x1b[33m",   // yellow
  error:    "\x1b[31m",   // red
};

function prefix(name) {
  const color = COLORS[name] || COLORS.reset;
  return `${color}[${name}]${COLORS.reset}`;
}

function runNamed(name, cwd, command) {
  // Pass the full command as a single string to avoid DEP0190 (arg concatenation warning).
  // shell: true is required on Windows to resolve .cmd shims (npm, npx, etc.).
  const child = spawn(command, { cwd, shell: true, windowsHide: false });

  child.stdout.on("data", (data) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => {
      process.stdout.write(`${prefix(name)} ${line}\n`);
    });
  });

  child.stderr.on("data", (data) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => {
      process.stderr.write(`${prefix(name)} ${COLORS.error}${line}${COLORS.reset}\n`);
    });
  });

  child.on("exit", (code) => {
    process.stdout.write(
      `${prefix("system")} ${name} exited with code ${code}\n`
    );
  });

  return child;
}

// Always resolve relative to this script's location so it works
// from any directory (e.g. `node scripts/dev-all.js` or `npm run dev`)
const root = path.resolve(__dirname, "..");
// backend/frontend are still inside repo-main/ until the process lock is released
// (move was partially blocked by running processes — complete after restarting)
const backendDir  = require("fs").existsSync(path.join(root, "backend"))
  ? path.join(root, "backend")
  : path.join(root, "repo-main", "backend");
const frontendDir = require("fs").existsSync(path.join(root, "frontend"))
  ? path.join(root, "frontend")
  : path.join(root, "repo-main", "frontend");

process.stdout.write(
  `${prefix("system")} Starting Thinking Pixel IMS...\n` +
  `${prefix("system")} Backend  → http://localhost:4000\n` +
  `${prefix("system")} Frontend → http://localhost:3000\n\n`
);

const backend  = runNamed("backend",  backendDir,  "npm run dev");
const frontend = runNamed("frontend", frontendDir, "npm run dev");

const stopAll = () => {
  process.stdout.write(`\n${prefix("system")} Shutting down...\n`);
  backend.kill("SIGTERM");
  frontend.kill("SIGTERM");
  setTimeout(() => process.exit(0), 500);
};

process.on("SIGINT",  stopAll);
process.on("SIGTERM", stopAll);
