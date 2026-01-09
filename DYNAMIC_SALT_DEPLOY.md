# 动态 Salt 配置方案 - 部署指南

## 🎯 方案优势

- ✅ **自动更新**: Worker 从远程获取最新 Salt,无需重新部署
- ✅ **国服/国际服**: 自动识别并使用对应配置
- ✅ **缓存机制**: 1小时本地缓存,减少外部请求
- ✅ **降级保护**: 远程获取失败时自动使用本地 fallback
- ✅ **实时监控**: `/health` 端点查看当前配置版本

---

## 📋 部署步骤

### 步骤 1: 托管 Salt 配置文件

#### 选项 A: GitHub Gist (推荐)

1. **创建 Gist**
   - 访问 https://gist.github.com
   - 新建 Gist,文件名: `salt_config.json`
   - 粘贴 `salt_config.json` 的内容
   - 设置为 **Public**

2. **获取 Raw URL**
   ```
   https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/salt_config.json
   ```

3. **更新 `worker-dynamic.js`**
   ```javascript
   const SALT_CONFIG_URL = 'https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/salt_config.json';
   ```

#### 选项 B: 自己的 GitHub 仓库

```
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/salt_config.json
```

#### 选项 C: Cloudflare Pages

1. 创建静态站点托管 `salt_config.json`
2. 使用 `https://your-salt-config.pages.dev/salt_config.json`

---

### 步骤 2: 部署 Worker

1. **复制 `worker-dynamic.js` 到 Cloudflare Workers**
2. **修改 `SALT_CONFIG_URL`** 为你的配置文件 URL
3. **Deploy**

---

### 步骤 3: (可选) 配置 KV 存储

启用 KV 可以进一步优化性能:

1. **Cloudflare Dashboard** → **Workers** → **KV**
2. **Create Namespace** → 命名为 `SALT_CACHE`
3. **Worker Settings** → **Variables** → **KV Namespace Bindings**
   - Variable name: `SALT_CACHE`
   - KV namespace: 选择刚创建的 namespace

配置后,Worker 会自动使用 KV 缓存 Salt 配置。

---

## 🧪 测试与验证

### 1. 检查 Worker 健康状态

```bash
curl https://your-worker.workers.dev/health
```

**预期响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T03:20:00.000Z",
  "config": {
    "cn_version": "2.81.0",
    "os_version": "2.40.0",
    "cache_enabled": true
  }
}
```

### 2. 测试国服二维码

```bash
curl -X POST "https://your-worker.workers.dev/api/auth/qr/fetch?scope=cn"
```

### 3. 测试国际服二维码

```bash
curl -X POST "https://your-worker.workers.dev/api/auth/qr/fetch?scope=global"
```

### 4. 手动刷新 Salt 缓存

```bash
curl https://your-worker.workers.dev/api/refresh-salt
```

---

## 🔄 更新 Salt 配置

### 当米游社版本更新时:

1. **从 UIGF 获取最新 Salt**
   - 访问 https://github.com/UIGF-org/mihoyo-api-collect
   - 查看最新的 Salt 值

2. **更新你的 `salt_config.json`**
   ```json
   {
     "cn": {
       "lk2": "NEW_LK2_SALT",
       "version": "2.82.0",
       "last_update": "2026-01-15"
     }
   }
   ```

3. **保存 Gist/仓库**

4. **验证更新**
   ```bash
   # 刷新 Worker 缓存
   curl https://your-worker.workers.dev/api/refresh-salt
   
   # 验证新版本
   curl https://your-worker.workers.dev/health
   ```

**无需重新部署 Worker!** 配置会在 1 小时内自动同步。

---

## 📊 配置文件结构说明

```json
{
  "cn": {                    // 国服(米游社)配置
    "lk2": "...",           // LK2 Salt - 扫码登录用
    "k2": "...",            // K2 Salt
    "s4x": "...",           // 4X Salt - 查询游戏信息用
    "s6x": "...",           // 6X Salt - 福利签到用
    "prod": "...",          // PROD Salt - 账号功能用
    "version": "2.81.0",    // 米游社 App 版本
    "last_update": "..."    // 最后更新日期(供参考)
  },
  "os": {                    // 国际服(HoYoLAB)配置
    "lk2": "...",
    "version": "2.40.0"
  }
}
```

---

## 🔍 故障排查

### Q: Worker 一直使用 fallback 配置?

**检查**:
1. `SALT_CONFIG_URL` 能否在浏览器中访问
2. 配置文件是否为有效 JSON
3. 查看 Worker 日志 (Dashboard → Logs → Real-time Logs)

### Q: 扫码失败,显示 "invalid sign"?

**原因**: Salt 已过期

**解决**:
1. 访问 UIGF 仓库获取最新 Salt
2. 更新你的 `salt_config.json`
3. 刷新 Worker 缓存: `/api/refresh-salt`

### Q: 如何验证 Worker 是否使用了最新配置?

```bash
# 查看当前版本
curl https://your-worker.workers.dev/health

# 对比你的 salt_config.json
curl https://gist.githubusercontent.com/.../salt_config.json
```

---

## 🚀 高级功能

### 自动化监控 & 告警

使用 Cloudflare Workers Cron Triggers:

```javascript
export default {
  async scheduled(event, env, ctx) {
    // 每天检查 Salt 是否过期
    const salts = await getSaltConfig(env);
    const lastUpdate = new Date(salts.cn.last_update);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 30) {
      // 发送告警到 Discord/Telegram
      await sendAlert(`警告: Salt 配置已 ${daysSinceUpdate} 天未更新!`);
    }
  }
}
```

### 多区域支持

扩展 `salt_config.json` 支持更多区域:

```json
{
  "cn": {...},
  "os": {...},
  "tw": {...},  // 台服
  "kr": {...}   // 韩服
}
```

---

## 📝 对比

| 特性 | 静态 Salt (`worker.js`) | 动态 Salt (`worker-dynamic.js`) |
|------|------------------------|-------------------------------|
| **更新方式** | 重新部署 Worker | 更新配置文件即可 |
| **响应速度** | 最快 | 首次稍慢(需获取配置) |
| **维护成本** | 高 | 低 |
| **降级机制** | 无 | 有 |
| **多区域** | 手动配置 | 自动识别 |

---

## ✅ 下一步

1. ✅ 选择配置托管方式(推荐 GitHub Gist)
2. ✅ 创建并上传 `salt_config.json`
3. ✅ 部署 `worker-dynamic.js` 到 Cloudflare
4. ✅ 测试 `/health` 端点验证配置
5. ✅ 集成到前端应用

配置完成后,你的后端将**永远使用最新的 Salt**,无需担心过期问题! 🎉
