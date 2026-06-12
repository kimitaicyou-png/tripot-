#!/usr/bin/env bash
set -euo pipefail

TRIPOT_SRC="/Users/tokikimito/projects/coaris/companies/tripot/system/app-v2"
COMPANIES_BASE="/Users/tokikimito/projects/coaris/companies"

usage() {
  echo "使い方: $0 <会社スラッグ> <会社表示名>"
  echo "例:     $0 deraforce 株式会社デラフォース"
  echo ""
  echo "処理内容:"
  echo "  1. tripot-v2 からコピー（.vercel / node_modules 除外）"
  echo "  2. package.json の name を <会社スラッグ>-app-v2 に書き換え"
  echo "  3. coaris.config.ts の companyName を <会社表示名> に書き換え"
  echo ""
  echo "残り手動作業（スクリプト完了後）:"
  echo "  - Vercel 新規プロジェクト作成"
  echo "  - Neon DB 新規 branch 作成"
  echo "  - Google OAuth クライアント発行"
  echo "  - npm run db:migrate"
  echo "  - npx tsx scripts/seed-rbac.ts"
  exit 1
}

[ $# -ne 2 ] && usage

SLUG="$1"
DISPLAY_NAME="$2"
DEST_DIR="${COMPANIES_BASE}/${SLUG}/system/app-v2"

echo "[init-company] 会社スラッグ: ${SLUG}"
echo "[init-company] 会社表示名:   ${DISPLAY_NAME}"
echo "[init-company] コピー先:     ${DEST_DIR}"
echo ""

if [ -d "${DEST_DIR}" ]; then
  echo "[ERROR] ${DEST_DIR} は既に存在します。上書きを避けるため中断します。"
  exit 1
fi

mkdir -p "${DEST_DIR}"

echo "[1/3] tripot-v2 → ${SLUG} にコピー中..."
rsync -av \
  --exclude='.vercel' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.log' \
  --exclude='.env.local' \
  "${TRIPOT_SRC}/" "${DEST_DIR}/"

echo ""
echo "[2/3] package.json の name を書き換え中..."
PJ_JSON="${DEST_DIR}/package.json"
if [ -f "${PJ_JSON}" ]; then
  python3 - "${PJ_JSON}" "${SLUG}" << 'PYEOF'
import sys, json
path, slug = sys.argv[1], sys.argv[2]
with open(path, encoding='utf-8') as f:
    d = json.load(f)
d['name'] = f"coaris-{slug}-v2"
with open(path, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
print(f"  name => coaris-{slug}-v2")
PYEOF
else
  echo "[WARN] package.json が見つかりません"
fi

echo ""
echo "[3/3] coaris.config.ts の companyName を書き換え中..."
CONFIG_TS="${DEST_DIR}/coaris.config.ts"
if [ -f "${CONFIG_TS}" ]; then
  python3 - "${CONFIG_TS}" "${DISPLAY_NAME}" "${SLUG}" << 'PYEOF'
import sys, re
path, display_name, slug = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"(companyName\s*:\s*)['\"].*?['\"]",
    f"\\1'{display_name}'",
    content
)

content = re.sub(
    r"(export const )TRIPOT_CONFIG",
    f"\\1{slug.upper().replace('-','_')}_CONFIG",
    content, count=1
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"  companyName => {display_name}")
print(f"  CONFIG名 => {slug.upper().replace('-','_')}_CONFIG")
PYEOF
else
  echo "[WARN] coaris.config.ts が見つかりません"
fi

echo ""
echo "================================================"
echo "[完了] ${SLUG} のコピーが完了しました。"
echo ""
echo "【次の手動作業（13-company-rollout-checklist.md 参照）】"
echo ""
echo "  Vercel:"
echo "    cd ${DEST_DIR}"
echo "    vercel  # 新規プロジェクト（Link to existing → No）"
echo ""
echo "  Neon DB:"
echo "    - ${SLUG}-main ブランチを Neon コンソールで作成"
echo "    - DATABASE_URL を Vercel env に投入"
echo ""
echo "  Google OAuth:"
echo "    - Google Cloud Console で OAuth2 クライアント新規作成"
echo "    - AUTH_GOOGLE_ID_V2 / AUTH_GOOGLE_SECRET_V2 を Vercel env に投入"
echo ""
echo "  DB 初期化:"
echo "    cd ${DEST_DIR}"
echo "    npm run db:migrate"
echo "    npx tsx scripts/seed-rbac.ts"
echo "    npx tsx scripts/test-rbac.ts  # 9/9 通過を確認"
echo ""
echo "  デプロイ:"
echo "    vercel --prod"
echo "================================================"
