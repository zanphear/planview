#!/usr/bin/env bash
# Fleet law (forbidden-23): no em dashes or en dashes as punctuation anywhere.
# Fails loudly with the offending locations. Used by pre-commit and CI.
set -euo pipefail

cd "$(dirname "$0")/.."

# Search tracked text files only; skip lockfiles, images, fonts and this script.
matches=$(git ls-files \
  | grep -vE '\.(png|jpg|jpeg|gif|ico|svg|woff2?|ttf|lock)$|package-lock\.json|Zone\.Identifier|scripts/check-no-dashes\.sh' \
  | xargs grep -nP '[\x{2013}\x{2014}]' 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "ERROR: em dash (U+2014) or en dash (U+2013) found. Use a comma, colon, parentheses, or split the sentence." >&2
  echo "$matches" >&2
  exit 1
fi
echo "OK: no em/en dashes."
