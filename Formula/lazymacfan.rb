# TEMPLATE — do not install this file directly without filling placeholders.
# Run scripts/gen-formula.sh to generate the filled-in formula at dist/lazymacfan.rb,
# then copy that into the zeetec20/homebrew-lazymacfan tap's Formula/ directory.
class Lazymacfan < Formula
  desc "Lightweight macOS TUI application and background fan controller"
  homepage "https://github.com/__GH_OWNER__/lazymacfan"
  version "__VERSION__"
  license "MIT"

  depends_on :macos
  depends_on arch: [:arm64, :x86_64]

  on_arm do
    url "https://github.com/__GH_OWNER__/lazymacfan/releases/download/v#{version}/lazymacfan-darwin-arm64.tar.gz"
    sha256 "__SHA_ARM64__"
  end

  on_intel do
    url "https://github.com/__GH_OWNER__/lazymacfan/releases/download/v#{version}/lazymacfan-darwin-x64.tar.gz"
    sha256 "__SHA_X64__"
  end

  def install
    bin.install "lazymacfan"
    bin.install "lazymacfan-helper"
  end

  def post_install
    (var/"log/lazymacfan").mkpath
  end

  service do
    run [opt_bin/"lazymacfan", "agent"]
    keep_alive true
    log_path var/"log/lazymacfan/agent.stdout.log"
    error_log_path var/"log/lazymacfan/agent.stderr.log"
  end

  def caveats
    <<~EOS
      Writing fan speeds via AppleSMC on macOS requires root privileges.
      lazymacfan will automatically prompt for one-time Touch ID / admin
      authorization when first launched, or you can run:
        lazymacfan helper setup

      If you installed with Homebrew, manage the background service with:
        brew services start lazymacfan
      Do not also run 'lazymacfan service start' — it installs a second
      launchd job (com.lazymacfan.agent) that competes for fan control.

      To remove the privileged helper and any launchd job:
        lazymacfan uninstall
    EOS
  end

  test do
    assert_match "lazymacfan v#{version}", shell_output("#{bin}/lazymacfan --version")
    assert_predicate bin/"lazymacfan-helper", :executable?
  end
end
