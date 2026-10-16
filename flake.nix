{
  description = "Lightweight macOS TUI application and background fan controller";

  inputs = {
    # nixpkgs-unstable (26.11) dropped x86_64-darwin entirely: importing it for an
    # Intel system throws. The 26.05 darwin branch still supports both macOS
    # architectures and has a binary cache, so it is what upstream points at.
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [ "aarch64-darwin" "x86_64-darwin" ] (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        # Published release this flake installs. Bump `version` together with the two
        # digests when cutting a release:
        #   nix store prefetch-file --json --hash-type sha256 \
        #     https://github.com/zeetec20/lazymacfan/releases/download/v<version>/lazymacfan-darwin-arm64.tar.gz
        # ponytail: hand-bumped per release (the Homebrew tap is bumped by CI instead); a stale
        # value keeps installing the old release rather than failing, so bump it in the release PR.
        version = "0.4.0";

        tarballHash = {
          aarch64-darwin = "sha256-jJZV+Gqc3X2urbya9nfWduPoESitftTAbumekDWRYbk=";
          x86_64-darwin = "sha256-9rZ4Auz+der9SZZASZkOjzTUGfszCdxytdkG/Pc9MeQ=";
        }.${system};

        tarballArch = {
          aarch64-darwin = "arm64";
          x86_64-darwin = "x64";
        }.${system};

        # Installs the release tarball CI built for this architecture — the same binaries the
        # Homebrew formula installs. Deliberately not built from source: a sandboxed
        # `bun build --compile` needs a per-release fixed-output hash for node_modules plus a
        # `--target=bun` workaround for the runtime download, while the tarball is the
        # artifact the release workflow already built, signed and published.
        lazymacfan = pkgs.stdenvNoCC.mkDerivation {
          pname = "lazymacfan";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://github.com/zeetec20/lazymacfan/releases/download/v${version}/lazymacfan-darwin-${tarballArch}.tar.gz";
            hash = tarballHash;
          };

          sourceRoot = ".";
          dontConfigure = true;
          dontBuild = true;
          # `bun build --compile` appends the JS bundle to the executable; stripping
          # discards it and produces a binary that cannot run.
          dontStrip = true;

          installPhase = ''
            runHook preInstall

            install -Dm755 lazymacfan $out/bin/lazymacfan
            install -Dm755 lazymacfan-helper $out/bin/lazymacfan-helper

            runHook postInstall
          '';

          doInstallCheck = true;
          installCheckPhase = ''
            runHook preInstallCheck

            versionOutput="$($out/bin/lazymacfan --version)"
            echo "$versionOutput"
            case "$versionOutput" in
              *"v${version}"*) ;;
              *)
                echo "unexpected --version output: $versionOutput" >&2
                exit 1
                ;;
            esac

            runHook postInstallCheck
          '';

          meta = {
            description = "Lightweight macOS TUI application and background fan controller";
            homepage = "https://github.com/zeetec20/lazymacfan";
            license = pkgs.lib.licenses.mit;
            platforms = pkgs.lib.platforms.darwin;
            mainProgram = "lazymacfan";
            sourceProvenance = [ pkgs.lib.sourceTypes.binaryNativeCode ];
          };
        };
      in {
        packages.default = lazymacfan;

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            clang
          ];

          shellHook = ''
            export LAZYMACFAN_DEV=1
          '';
        };
      }
    );
}
