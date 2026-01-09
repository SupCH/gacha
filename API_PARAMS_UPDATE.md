# MiHoYo API 参数对比与更新指南

## 📊 当前配置 vs 最新配置

### 你的 `后端.txt` 配置 (可能过时)

```javascript
const SALT_CN = "xV8v4Qu54lUKrEYy3azhZgbBashqlF_b"; // LK2
const SALT_OS = "okr71iL8870LnguK6y5dRIF7DSKn0rrl"; // HoYoLAB
```

### ✅ 最新配置 (来自 UIGF-org, 2025)

根据 [UIGF-org/mihoyo-api-collect](https://github.com/UIGF-org/mihoyo-api-collect) 的数据:

#### 米游社 2.8.1 版本 (推荐使用)
```javascript
// K2 Salt (x-rpc-client_type: 2)
const SALT_K2 = "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy";

// LK2 Salt (x-rpc-client_type: 4) - 用于扫码登录
const SALT_LK2 = "rk4xg2hakoi26nljpr099fv9fck1ah10";

// 4X Salt (x-rpc-client_type: 5) - 查询游戏账号信息
const SALT_4X = "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs";

// 6X Salt (x-rpc-client_type: 5) - 福利签到
const SALT_6X = "t0qEgfub6cvuvAPgR5m9aQWWVciEer7v";

// PROD Salt - 账号相关功能
const SALT_PROD = "JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS";
```

#### 米游社 2.7.1 版本
```javascript
const SALT_K2 = "fd3ykrh7o1j54g581upo1tvpam0dsgtf";
const SALT_LK2 = "14bmu1mz0yuljprsfgpvjh3ju2ni468r";
```

---

## 🎯 你的后端应该使用哪个 Salt?

### 对于扫码登录 (你的用例)

你的后端使用 **LK2 Salt**,配合 `x-rpc-client_type: 4`:

```javascript
// ✅ 推荐更新为米游社 2.8.1 的 LK2
const SALT_CN = "rk4xg2hakoi26nljpr099fv9fck1ah10"; // 新值

// ❌ 你当前使用的 (可能过时)
// const SALT_CN = "xV8v4Qu54lUKrEYy3azhZgbBashqlF_b";
```

### 对于国际服 (HoYoLAB)

国际服的 Salt 数据更新频率较低,你当前的值**可能仍然有效**:
```javascript
const SALT_OS = "okr71iL8870LnguK6y5dRIF7DSKn0rrl";
```

但建议测试,如果失败可以尝试:
```javascript
// 尝试使用国服的 PROD Salt
const SALT_OS = "JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS";
```

---

## 🔄 完整更新方案

### 选项 A: 使用最新 LK2 (推荐)

```javascript
const SALT_CN = "rk4xg2hakoi26nljpr099fv9fck1ah10"; // 米游社 2.8.1 LK2
const SALT_OS = "okr71iL8870LnguK6y5dRIF7DSKn0rrl"; // HoYoLAB (保持不变)
```

### 选项 B: 使用 4X Salt (如果 LK2 失败)

```javascript
const SALT_CN = "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs"; // 4X Salt
// 同时需要修改
"x-rpc-client_type": "5", // 从 "4" 改为 "5"
```

### 选项 C: 多 Salt 自动降级

```javascript
const SALTS_CN = [
  "rk4xg2hakoi26nljpr099fv9fck1ah10", // 2.8.1 LK2 (最新)
  "14bmu1mz0yuljprsfgpvjh3ju2ni468r", // 2.7.1 LK2
  "xV8v4Qu54lUKrEYy3azhZgbBashqlF_b", // 旧 LK2 (你的当前值)
];

// 在 getDS 函数中依次尝试
async function getDS(isGlobal, saltIndex = 0) {
  const salt = isGlobal ? SALT_OS : SALTS_CN[saltIndex];
  // ...
}
```

---

## 📱 App Version 更新

### 你当前的版本
```javascript
"x-rpc-app_version": isGlobal ? "2.34.1" : "2.56.1"
```

### 建议更新为
```javascript
"x-rpc-app_version": isGlobal ? "2.40.0" : "2.81.0"
// 2.81.0 对应米游社 2.8.1 版本
```

**注意**: App Version 不一定需要完全匹配 Salt 版本,但建议接近。

---

## 🧪 验证方法

### 1. 本地测试

```bash
# 使用新 Salt 生成 DS
node -e "
const crypto = require('crypto');
const salt = 'rk4xg2hakoi26nljpr099fv9fck1ah10';
const t = Math.floor(Date.now() / 1000);
const r = Math.random().toString(36).substring(2, 8);
const main = \`salt=\${salt}&t=\${t}&r=\${r}\`;
const md5 = crypto.createHash('md5').update(main).digest('hex');
console.log(\`DS: \${t},\${r},\${md5}\`);
"
```

### 2. 部署到 Cloudflare 后测试

```bash
# 测试二维码接口
curl -X POST "https://your-worker.workers.dev/api/auth/qr/fetch?scope=cn"
```

**预期响应**:
- ✅ `retcode: 0` - Salt 有效
- ❌ `retcode: -1` 或其他错误码 - Salt 可能过时

---

## 📝 更新步骤

1. **备份当前配置**
   ```bash
   cp worker.js worker.js.backup
   ```

2. **更新 `worker.js`**
   ```javascript
   const SALT_CN = "rk4xg2hakoi26nljpr099fv9fck1ah10";
   ```

3. **重新部署到 Cloudflare**

4. **测试扫码功能**
   - 打开前端应用
   - 触发扫码登录
   - 检查是否成功生成二维码

5. **如果失败,回滚**
   ```bash
   cp worker.js.backup worker.js
   # 重新部署
   ```

---

## 🔍 持续监控

### 如何知道 Salt 过期了?

**症状**:
- 扫码二维码生成失败
- API 返回 `retcode: -1` 或 `retcode: -100`
- 日志中出现 "invalid sign" 错误

**解决方案**:
1. 访问 [UIGF-org/mihoyo-api-collect](https://github.com/UIGF-org/mihoyo-api-collect)
2. 查看最新的 Salt 值
3. 更新 `worker.js`
4. 重新部署

### 自动化监控 (可选)

在 Worker 中添加版本检查:
```javascript
// 记录当前使用的 Salt 版本
const SALT_VERSION = "2.8.1";
const LAST_UPDATE = "2025-01-09";

// 在错误日志中输出版本信息
console.error(`Current Salt Version: ${SALT_VERSION}, Last Update: ${LAST_UPDATE}`);
```

---

## 📌 总结

| 项目 | 你的当前值 | 推荐值 | 状态 |
|------|-----------|--------|------|
| **国服 LK2 Salt** | `xV8v4Qu...` | `rk4xg2h...` (2.8.1) | ⚠️ 需更新 |
| **国际服 Salt** | `okr71iL...` | `okr71iL...` (保持) | ✅ 可能有效 |
| **国服 App Version** | `2.56.1` | `2.81.0` | ⚠️ 建议更新 |
| **国际服 App Version** | `2.34.1` | `2.40.0` | ⚠️ 建议更新 |

**下一步**: 使用我提供的最新 Salt 值更新你的 `worker.js`,然后部署测试! 🚀
