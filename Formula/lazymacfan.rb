class Lazymacfan < Formula
  desc "Lightweight macOS TUI application and background fan controller"
  homepage "https://github.com/zeetec/lazymacfan"
  url "https://github.com/zeetec/lazymacfan/releases/download/v0.1.0/lazymacfan-v0.1.0-universal.tar.gz"
  version "0.1.0"
  sha256 "a1d90942870f1cf143d32d3a6ea33104bea54d43265bea5c157ddf6be14cb1e0" # Updated on release packaging
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
