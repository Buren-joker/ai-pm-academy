#!/usr/bin/env bash
# 一键部署到 GitHub Pages
# 用法:
#   首次:   GIT_REPO=https://github.com/<用户名>/<仓库>.git ./deploy.sh
#   之后:   ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

GIT_REPO="${GIT_REPO:-}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "== 初始化 git 仓库 =="
  git init
  git add -A
  git commit -m "AI PM 学堂:初版(7 模块 + 实时资讯台)" || true
  git branch -M main
fi

if [ -n "$GIT_REPO" ]; then
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$GIT_REPO"
  else
    git remote add origin "$GIT_REPO"
  fi
  echo "== 远端已设为 $GIT_REPO =="
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "错误:尚未配置远端仓库。请运行:"
  echo "  GIT_REPO=https://github.com/<你的用户名>/<仓库>.git ./deploy.sh"
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "== 没有变更,跳过提交 =="
else
  git commit -m "更新内容:$(date '+%Y-%m-%d %H:%M')"
fi

echo "== 推送到 GitHub =="
git push -u origin main 2>/dev/null || git push -u origin master

echo ""
echo "✅ 推送完成。请在 GitHub 仓库 Settings → Pages 开启 Pages 部署(main 分支 / root),"
echo "   几分钟后即可访问 https://<你的用户名>.github.io/<仓库名>/"
