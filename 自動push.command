#!/bin/bash
set -e

echo "🌿 Spiral 語場同步開始..."
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

PORT=8080
LOCAL_URL="http://127.0.0.1:${PORT}/"

echo "🖥️ 檢查 localhost 服務..."
if lsof -iTCP:${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "ℹ️ localhost:${PORT} 已在運行"
else
  echo "▶️ 啟動 localhost:${PORT}"
  nohup python3 -m http.server ${PORT} > /tmp/ux-rec-localhost.log 2>&1 &
  sleep 1
fi

echo "🌐 開啟 ${LOCAL_URL}"
open "${LOCAL_URL}" || true

echo "📦 提交本地變更（如果有）..."
git add -A
if ! git diff --cached --quiet; then
  git commit -m "Update Rec's ux"
else
  echo "ℹ️ 沒有需要提交的變更"
fi

echo "🔄 拉取遠端更新（rebase）..."
git pull --rebase origin main

echo "🚀 推送至遠端..."
git push origin main

echo "✅ 語場已封，請至 https://ux.rec.ooo 查看結果！"
echo "🔍 本地預覽：${LOCAL_URL}"
read -n 1 -s -r -p "按任意鍵退出..."
