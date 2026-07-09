#!/usr/bin/env bash
#
# setup-codex.sh — bootstrap the OpenAI Codex CLI as a Claude Code sub-agent.
#
# Idempotent: safe to run repeatedly. Installs codex if missing and writes a
# default ~/.codex/config.toml (only if one does not already exist, so your
# edits are never clobbered). It does NOT handle authentication — see the
# notes it prints at the end.
#
# Usage:  bash scripts/setup-codex.sh
set -euo pipefail

DEFAULT_MODEL="${CODEX_DEFAULT_MODEL:-gpt-5.6-sol}"   # "Sol"; alt "Terra" -> gpt-5.6-terra
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

echo "==> Codex sub-agent setup"

# 1. Install the CLI if it is not already on PATH.
if command -v codex >/dev/null 2>&1; then
  echo "    codex already installed: $(codex --version 2>/dev/null || echo unknown)"
else
  echo "    installing @openai/codex globally via npm ..."
  npm install -g @openai/codex
  echo "    installed: $(codex --version 2>/dev/null || echo unknown)"
fi

# 2. Write a default config only if the user has none yet.
mkdir -p "$CODEX_HOME"
CONFIG="$CODEX_HOME/config.toml"
if [ -f "$CONFIG" ]; then
  echo "    config exists, leaving it untouched: $CONFIG"
else
  cat > "$CONFIG" <<EOF
# Codex CLI config — used when Claude Code drives codex as a sub-agent.
# Default model: "GPT 5.6 Sol" (alternate "Terra" -> gpt-5.6-terra).
# If codex rejects the slug, set \`model\` to the exact id OpenAI expects.
model = "${DEFAULT_MODEL}"
model_reasoning_effort = "high"
approval_policy = "never"
sandbox_mode = "workspace-write"
EOF
  echo "    wrote default config: $CONFIG (model=${DEFAULT_MODEL})"
fi

# 3. Auth / connectivity check — informational only.
echo
if codex login status >/dev/null 2>&1; then
  echo "==> Auth: logged in."
else
  echo "==> Auth: NOT configured. Provide credentials before running codex, e.g.:"
  echo "      printenv OPENAI_API_KEY | codex login --with-api-key      # API key"
  echo "      codex login                                               # ChatGPT sign-in (interactive)"
fi
echo "    Note: codex needs network access to api.openai.com. Some sandboxed"
echo "    environments block it; codex will fail with 'HTTP CONNECT 403' there."
echo "==> Done."
