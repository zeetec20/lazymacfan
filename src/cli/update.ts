import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  authorizeHelper,
  resolveHelperPath,
  runElevatedShellScript,
  posixQuote,
} from "../hardware/helper-auth";
import pkg from "../../package.json";

const REPO = "zeetec20/lazymacfan";

export const handleUpdateCommand = async (args: string[]): Promise<void> => {
  const currentVersion = pkg.version;
  const isCheckOnly = args.includes("--check");
  const isForce = args.includes("--force") || args.includes("-f");

  console.log(`lazymacfan v${currentVersion} update check\n`);

  // 1. Detect if running from Homebrew installation
  const execPath = process.execPath;
  const isBrew =
    execPath.includes("/Cellar/") ||
    execPath.includes("/opt/homebrew/") ||
    execPath.includes("/usr/local/Cellar/");

  if (isBrew) {
    console.log("lazymacfan is installed and managed via Homebrew.");
    console.log("To upgrade, please run:\n  brew update && brew upgrade lazymacfan\n");
    return;
  }

  // 2. Query GitHub Releases API
  console.log(`Checking latest release from github.com/${REPO}...`);
  let latestTag = "";
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        "User-Agent": "lazymacfan-updater",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`No published releases found yet on github.com/${REPO}.`);
        console.log("You are running the local build (v" + currentVersion + ").");
        return;
      }
      throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
    }

    const data = (await res.json()) as { tag_name?: string };
    latestTag = (data.tag_name ?? "").replace(/^v/, "").trim();
  } catch (err) {
    console.error(
      `Failed to check for updates: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }

  if (!latestTag) {
    console.log("Could not parse latest version tag from release.");
    return;
  }

  const isNewer = latestTag !== currentVersion;
  if (!isNewer && !isForce) {
    console.log(`✅ lazymacfan is already up to date (v${currentVersion}).`);
    return;
  }

  console.log(`Update available: v${currentVersion} -> v${latestTag}`);
  if (isCheckOnly) {
    console.log("Run 'lazymacfan update' to download and install this update.");
    return;
  }

  // 3. Download and verify release asset
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const tarballName = `lazymacfan-darwin-${arch}.tar.gz`;
  const shaName = `lazymacfan-darwin-${arch}.sha256`;
  const baseUrl = `https://github.com/${REPO}/releases/download/v${latestTag}`;

  const tmpDir = join("/tmp", `lazymacfan-update-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    console.log(`Downloading ${tarballName}...`);
    const tarballRes = await fetch(`${baseUrl}/${tarballName}`);
    if (!tarballRes.ok) {
      throw new Error(`Failed to download ${tarballName} (${tarballRes.status})`);
    }
    const tarballBuffer = await tarballRes.arrayBuffer();
    const tarballPath = join(tmpDir, tarballName);
    await Bun.write(tarballPath, tarballBuffer);

    // Verify sha256 checksum if available
    try {
      const shaRes = await fetch(`${baseUrl}/${shaName}`);
      if (shaRes.ok) {
        const expectedSha = (await shaRes.text()).trim().split(/\s+/)[0]?.toLowerCase();
        const hasher = new Bun.CryptoHasher("sha256");
        hasher.update(Buffer.from(tarballBuffer));
        const actualSha = hasher.digest("hex").toLowerCase();

        if (expectedSha && expectedSha !== actualSha) {
          throw new Error(`SHA256 checksum mismatch! Expected ${expectedSha}, got ${actualSha}`);
        }
        console.log(`Checksum verified (${actualSha.slice(0, 12)}...)`);
      }
    } catch {
      // ignore checksum download errors if release doesn't have sha file
    }

    // 4. Extract archive
    console.log("Extracting updated binaries...");
    const untarProc = Bun.spawnSync(["tar", "-xzf", tarballPath, "-C", tmpDir]);
    if (untarProc.exitCode !== 0) {
      throw new Error(`Failed to extract tarball: ${untarProc.stderr.toString()}`);
    }

    const newBin = join(tmpDir, "lazymacfan");
    const newHelper = join(tmpDir, "lazymacfan-helper");

    if (!existsSync(newBin)) {
      throw new Error("Updated binary 'lazymacfan' was not found inside the release archive.");
    }

    // 5. Replace current binaries
    const binDest = execPath;
    const helperDest = resolveHelperPath() ?? join(dirname(execPath), "lazymacfan-helper");

    console.log(`Installing updated binary to ${binDest}...`);
    try {
      Bun.spawnSync(["cp", newBin, binDest]);
      Bun.spawnSync(["chmod", "+x", binDest]);
      if (existsSync(newHelper) && existsSync(helperDest)) {
        Bun.spawnSync(["cp", newHelper, helperDest]);
        Bun.spawnSync(["chmod", "+x", helperDest]);
      }
    } catch {
      // Needs root elevation
      console.log("Elevating permissions to install update in system directory...");
      const cmds = [
        `cp ${posixQuote(newBin)} ${posixQuote(binDest)}`,
        `chmod +x ${posixQuote(binDest)}`,
      ];
      if (existsSync(newHelper) && existsSync(helperDest)) {
        cmds.push(`cp ${posixQuote(newHelper)} ${posixQuote(helperDest)}`);
        cmds.push(`chmod +x ${posixQuote(helperDest)}`);
      }
      const res = runElevatedShellScript(
        cmds,
        "lazymacfan requires authorization to install the updated binary.",
      );
      if (!res.success) {
        throw new Error(`Failed to replace binary: ${res.stderr || "Authorization cancelled."}`);
      }
    }

    // 6. Update privileged helper tool if present
    if (existsSync(newHelper)) {
      await authorizeHelper();
    }

    console.log(`\n🎉 Successfully updated lazymacfan to v${latestTag}!`);
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  }
};
