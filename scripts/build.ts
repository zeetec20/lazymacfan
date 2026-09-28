import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function run(cmd: string[]): Promise<void> {
  console.log(`> ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed with exit code ${code}: ${cmd.join(" ")}`);
  }
}

async function build(): Promise<void> {
  const distDir = join(process.cwd(), "dist");
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  console.log("=== 1. Compiling Universal Native Hardware Helper (arm64 + x86_64) ===");
  await run([
    "clang",
    "-O3",
    "-arch",
    "arm64",
    "-arch",
    "x86_64",
    "-framework",
    "IOKit",
    "-framework",
    "CoreFoundation",
    "src/native/lazymacfan-helper.c",
    "-o",
    "dist/lazymacfan-helper",
  ]);

  console.log("\n=== 2. Compiling Standalone Bun CLI (arm64 & x86_64) ===");
  await run([
    "bun",
    "build",
    "src/cli/index.ts",
    "--compile",
    "--target=bun-darwin-arm64",
    "--outfile=dist/lazymacfan-arm64",
  ]);

  const x64Pkg = join(process.cwd(), "node_modules", "@opentui", "core-darwin-x64");
  if (!existsSync(x64Pkg)) {
    console.log("Fetching @opentui/core-darwin-x64 for universal cross-compilation...");
    mkdirSync(x64Pkg, { recursive: true });
    await run([
      "sh",
      "-c",
      "curl -sL https://registry.npmjs.org/@opentui/core-darwin-x64/-/core-darwin-x64-0.5.12.tgz | tar -xz --strip-components=1 -C node_modules/@opentui/core-darwin-x64",
    ]);
  }

  await run([
    "bun",
    "build",
    "src/cli/index.ts",
    "--compile",
    "--target=bun-darwin-x64",
    "--outfile=dist/lazymacfan-x64",
  ]);

  console.log("\n=== 3. Creating Universal Mach-O Binary with lipo ===");
  await run([
    "lipo",
    "-create",
    "-output",
    "dist/lazymacfan",
    "dist/lazymacfan-arm64",
    "dist/lazymacfan-x64",
  ]);

  console.log("\n=== 4. Verifying Build Outputs ===");
  await run(["file", "dist/lazymacfan", "dist/lazymacfan-helper"]);

  console.log(
    "\n✅ Build complete! Universal binaries ready in dist/:\n- dist/lazymacfan\n- dist/lazymacfan-helper",
  );
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
