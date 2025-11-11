#!/usr/bin/env node
// Simple production smoke test: builds app (if not built), starts it, probes routes, then exits.
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import http from "node:http";

const log = (...a) => console.log("[smoke]", ...a);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    log("run", cmd, args.join(" "));
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

async function probe(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port: 3000, path, method: "GET" },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const startTime = Date.now();
  // Build (assumes no pre-existing .next) – you can skip if CI already built
  await run("npm", ["run", "build"]);
  log("build complete");

  // Start prod server
  const server = spawn("npm", ["run", "start"], { stdio: "inherit" });

  // Wait for readiness (simple retry loop)
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const { status } = await probe("/");
      if (status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!ready) {
    server.kill("SIGTERM");
    throw new Error("Server did not become ready");
  }
  log("server ready");

  const checks = ["/", "/private/handover", "/private/handovers"];

  const results = [];
  for (const p of checks) {
    try {
      const r = await probe(p);
      results.push({ path: p, ...r });
    } catch (e) {
      results.push({ path: p, error: e.message });
    }
  }

  // Basic assertions
  const failures = results.filter(
    (r) => r.error || !(r.status >= 200 && r.status < 500)
  );
  results.forEach((r) => {
    if (r.error) log("FAIL", r.path, r.error);
    else log("OK", r.path, r.status);
  });

  server.kill("SIGTERM");
  await delay(500);

  if (failures.length) {
    console.error("\nSmoke test failures:", failures);
    process.exit(1);
  }
  log("all checks passed in", Date.now() - startTime + "ms");
}

main().catch((e) => {
  console.error("[smoke] error", e);
  process.exit(1);
});
