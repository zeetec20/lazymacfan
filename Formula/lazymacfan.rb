class Lazymacfan < Formula
  desc "Lightweight macOS TUI application and background fan controller"
  homepage "https://github.com/zeetec/lazymacfan"
  url "https://github.com/zeetec/lazymacfan/releases/download/v0.1.0/lazymacfan-v0.1.0-universal.tar.gz"
  version "0.1.0"
  sha256 "f6a3069e485996fba1646829b46c30f70933b97dcee62d200ebd0631144a26f9" # Updated on release packaging
  license "MIT"
  head "https://github.com/zeetec/lazymacfan.git", branch: "main"

  depends_on :macos
  depends_on arch: [:arm64, :x86_64]

  def install
    bin.install "dist/lazymacfan"
    bin.install "dist/lazymacfan-helper" if File.exist?("dist/lazymacfan-helper")
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

  test do
    assert_match "lazymacfan v#{version}", shell_output("#{bin}/lazymacfan --version")
  end
end
