# Cloudflare + GitHub 自动部署指南 (推荐)

这是最高效的部署方式：只需将代码推送到 GitHub，Cloudflare 就会自动执行构建、测试并上线。

---

## 🏗️ 1. 初始化 Git 仓库 (本地)

如果你还没初始化仓库，请在项目根目录执行：

```powershell
git init
git add .
git commit -m "initial commit"
```

---

## 🌐 2. 前端部署 (Cloudflare Pages)

GitHub 连接 Pages 是最简单的。

1. **创建 GitHub 仓库**: 在 GitHub 上创建一个新项目，并将本地代码推送到仓库。
2. **连接 Pages**:
   - 登录 Cloudflare -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。

### 步骤 1: 配置文件
在项目根目录创建一个 `wrangler.toml` 文件（如果还没有）：

```toml
name = "gacha-worker"
main = "worker-dynamic.js"
compatibility_date = "2023-12-01"

[vars]
SALT_CONFIG_URL = "你的远程salt配置地址"
```

### 步骤 2: GitHub Action
Cloudflare 官方提供了一个 Action 来实现自动部署。

1. **获取 API Token**: 在 Cloudflare 个人资料 -> **API Tokens** -> **Create Token** -> **Edit Cloudflare Workers**。
2. **设置 GitHub Secrets**: 在 GitHub 仓库设置 -> **Settings** -> **Secrets and variables** -> **Actions**。
   - 添加 `CLOUDFLARE_API_TOKEN`。
3. **创建 Workflow**: 在项目根目录创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy Worker
on:
  push:
    branches:
      - main
    paths:
      - 'worker-dynamic.js'
      - 'wrangler.toml'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## ✅ 总结流程

1. **改代码**: 在本地修改前端或后端。
2. **提交**: `git commit -am "update"`。
3. **推送**: `git push origin main`。
4. **自动上线**:
   - 前端：Cloudflare Pages 捕获 Push，自动运行 `npm run build` 并发布。
   - 后端：GitHub Action 捕获 Push，自动调用 Wrangler 部署到 Worker。

这种方式不仅**免去了手动上传的烦恼**，还提供了**版本回滚**功能，非常推荐！🚀
