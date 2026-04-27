#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

EXIT=0
echo "=== コアリスUI 絶対ルール lint ==="

check() {
  local label="$1"
  local pattern="$2"
  local hits
  hits=$(grep -rn -E "$pattern" src/ 2>/dev/null --include="*.tsx" --include="*.ts" --include="*.css" || true)
  if [ -n "$hits" ]; then
    echo ""
    echo "🚨 違反: $label"
    echo "$hits" | head -10
    local count
    count=$(echo "$hits" | wc -l | tr -d ' ')
    if [ "$count" -gt 10 ]; then
      echo "  ... 他 $((count - 10)) 件"
    fi
    EXIT=1
  fi
}

check "font-bold / extrabold / black 禁止 (font-semibold まで)" '\bfont-(bold|extrabold|black)\b'
check "shadow-md 以上禁止 (shadow-sm まで)" '\bshadow-(md|lg|xl|2xl)\b'
check "text-gray-300/400 禁止 (text-gray-500 以上)" '\btext-(gray|slate)-(300|400)\b'
check "active:scale-[0.95] 以下禁止 (active:scale-[0.98] まで)" 'active:scale-\[0\.9[0-7]\]'
check "rounded-3xl 以上禁止 (rounded-2xl まで、ただし rounded-full は許可)" '\brounded-3xl\b'

if [ "$EXIT" = "0" ]; then
  echo ""
  echo "✅ コアリスUI絶対ルール 全部 PASS"
fi

exit $EXIT
