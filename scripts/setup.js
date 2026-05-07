const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function main() {
  const root = process.cwd();
  const backendDir = path.join(root, "backend");
  const frontendDir = path.join(root, "frontend");
  const backendEnv = path.join(backendDir, ".env");

  if (!fs.existsSync(backendEnv)) {
    fs.writeFileSync(
      backendEnv,
      'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thinking_pixel"\nJWT_SECRET="super-secret-key"\nPORT=4000\n'
    );
    console.log("Created backend/.env with local defaults.");
  }

  await run("npm", ["install"], backendDir);
  await run("npm", ["install"], frontendDir);
  await run("npm", ["run", "prisma:generate"], backendDir);
  await run("npm", ["run", "prisma:migrate"], backendDir);
  await run("npm", ["run", "seed"], backendDir);
  console.log("Setup complete. Run `npm run dev` from repo root.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
