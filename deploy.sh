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
echo "(提示输入用户名时填: Buren-joker;密码处粘贴你的 Personal Access Token)"
git push -u origin main

echo ""
echo "✅ 推送完成。接下来:"
echo "1. 打开 https://github.com/Buren-joker/ai-pm-academy/settings/pages"
echo "2. Source 选择 Deploy from a branch → main → /(root) → Save"
echo "3. 约 1-2 分钟后访问: https://Buren-joker.github.io/ai-pm-academy/"
