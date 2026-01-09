# 前后端集成指南

## 🔗 架构概览

```
┌─────────────┐      HTTPS      ┌──────────────────┐      HTTPS      ┌─────────────┐
│   前端应用   │ ──────────────► │ Cloudflare Worker│ ──────────────► │ 米哈游 API   │
│  (React)    │                 │   (后端代理)      │                 │             │
└─────────────┘                 └──────────────────┘                 └─────────────┘
      │                                  │
      │                                  │
      ▼                                  ▼
 扫码登录组件                         动态 Salt 配置
 (QRScanner)                        (GitHub Gist)
```

---

## 📋 集成步骤

### 步骤 1: 配置环境变量

创建 `.env` 文件:

```bash
# Cloudflare Worker 地址
VITE_WORKER_URL=https://your-worker.workers.dev
```

**.env.example** (示例文件):
```bash
# 后端 Worker 地址
VITE_WORKER_URL=https://gacha-auth-worker.your-username.workers.dev

# 可选: 游戏默认配置
VITE_DEFAULT_GAME=hk4e_cn
VITE_DEFAULT_REGION=cn_gf01
```

### 步骤 2: 安装依赖 (如果需要二维码库)

```bash
npm install qrcode.react
# 或使用在线 API (组件中已使用)
```

### 步骤 3: 在 App.tsx 中集成扫码组件

在 `src/App.tsx` 中添加:

```tsx
import { QRScanner } from './components/QRScanner';
import { useState } from 'react';

function App() {
  const [gachaUrl, setGachaUrl] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (url: string) => {
    setGachaUrl(url);
    setShowScanner(false);
    // 使用获取到的 URL 导入抽卡数据
    importGachaData(url);
  };

  const importGachaData = async (url: string) => {
    try {
      // 解析 URL 参数
      const params = new URL(url).searchParams;
      const authkey = params.get('authkey');
      const gameBiz = params.get('game_biz');
      
      // 调用米哈游 API 获取抽卡历史
      // ... 实现数据导入逻辑
    } catch (e) {
      console.error('导入失败:', e);
    }
  };

  return (
    <div>
      {/* 触发扫码按钮 */}
      <button onClick={() => setShowScanner(true)}>
        扫码导入抽卡数据
      </button>

      {/* 扫码弹窗 */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative">
            <button 
              onClick={() => setShowScanner(false)}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2"
            >
              ✕
            </button>
            <QRScanner 
              onSuccess={handleScanSuccess}
              scope="cn"
              gameBiz="hk4e_cn"
              region="cn_gf01"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 步骤 4: 多游戏支持示例

```tsx
import { QRScanner } from './components/QRScanner';

function MultiGameScanner() {
  const [activeGame, setActiveGame] = useState<'hk4e' | 'hkrpg' | 'nap'>('hk4e');
  
  const gameConfig = {
    hk4e: { biz: 'hk4e_cn', region: 'cn_gf01', name: '原神' },
    hkrpg: { biz: 'hkrpg_cn', region: 'prod_gf_cn', name: '崩坏:星穹铁道' },
    nap: { biz: 'nap_cn', region: 'prod_gf_cn', name: '绝区零' }
  };
  
  return (
    <div>
      {/* 游戏选择 */}
      <div className="flex gap-2 mb-4">
        {Object.entries(gameConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveGame(key as any)}
            className={activeGame === key ? 'active' : ''}
          >
            {config.name}
          </button>
        ))}
      </div>
      
      {/* 扫码器 */}
      <QRScanner 
        onSuccess={(url) => console.log('Success:', url)}
        scope="cn"
        gameBiz={gameConfig[activeGame].biz}
        region={gameConfig[activeGame].region}
      />
    </div>
  );
}
```

---

## 🧪 测试流程

### 1. 测试后端健康状态

```bash
curl https://your-worker.workers.dev/health
```

**预期响应**:
```json
{
  "status": "ok",
  "config": {
    "cn_version": "2.81.0",
    "os_version": "2.40.0"
  }
}
```

### 2. 前端测试

```bash
# 启动开发服务器
npm run dev

# 访问测试页面
# 点击"扫码导入"按钮
# 应该能看到二维码
```

### 3. 完整流程测试

1. ✅ 前端显示二维码
2. ✅ 使用米游社 App 扫码
3. ✅ 手机上点击"确认"
4. ✅ 前端收到 authkey
5. ✅ 成功导入抽卡数据

---

## 🔧 故障排查

### 问题 1: CORS 错误

**症状**: 
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解决**:
- 确保 Worker 代码中包含 CORS 头
- 检查 `Access-Control-Allow-Origin: "*"` 是否存在

### 问题 2: 二维码无法生成

**检查**:
```typescript
// authService.ts
console.log('Worker endpoint:', WORKER_ENDPOINT);
console.log('QR response:', data);
```

**可能原因**:
- Worker URL 配置错误
- Worker 未部署成功
- Salt 配置过期

### 问题 3: 扫码后无响应

**原因**: deviceId 不一致

**解决**:
```typescript
// 确保 deviceId 持久化
const deviceId = localStorage.getItem('mihoyo-device-id') || crypto.randomUUID();
localStorage.setItem('mihoyo-device-id', deviceId);
```

### 问题 4: authkey 生成失败

**检查**:
```bash
# Worker 日志
wrangler tail your-worker

# 查看 DS 签名是否正确
```

---

## 🚀 优化建议

### 1. 添加加载状态

```tsx
import { checkWorkerHealth } from '../services/authService';

function App() {
  const [workerStatus, setWorkerStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  
  useEffect(() => {
    checkWorkerHealth().then(result => {
      setWorkerStatus(result.ok ? 'ok' : 'error');
    });
  }, []);
  
  if (workerStatus === 'error') {
    return <div>后端服务不可用,请检查配置</div>;
  }
}
```

### 2. 错误重试机制

```typescript
async function fetchWithRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. 用户体验优化

```tsx
// 添加倒计时
const [countdown, setCountdown] = useState(120); // 2分钟

useEffect(() => {
  if (status === 'waiting') {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }
}, [status]);
```

---

## 📊 完整数据流

```
1. 用户点击"扫码导入"
   └─► 前端: QRScanner 组件挂载

2. 获取二维码
   └─► authService.fetchQRCode('cn')
       └─► Worker: /api/auth/qr/fetch?scope=cn
           └─► 米哈游 API: qrcode/fetch
               └─► 返回: { url, ticket }

3. 轮询扫码状态
   └─► 每 2 秒: authService.queryQRStatus(ticket, deviceId)
       └─► Worker: /api/auth/qr/query?ticket=xxx&device=xxx
           └─► 米哈游 API: qrcode/query
               └─► 返回: { status: 'Confirmed', payload: { stoken, uid } }

4. 生成 authkey
   └─► authService.generateAuthKey(stoken, uid, gameBiz, region)
       └─► Worker: /api/auth/gen-key
           └─► Worker 生成 DS 签名
               └─► 米哈游 API: binding/api/genAuthKey
                   └─► 返回: { authkey, authkey_ver, sign_type }

5. 构建抽卡链接
   └─► authService.buildGachaUrl(authkey, gameBiz, region)
       └─► 返回: https://...gacha_info/api/getGachaLog?authkey=xxx&...

6. 导入抽卡数据
   └─► 调用抽卡历史 API
       └─► 解析并存储数据
           └─► ✅ 完成!
```

---

## ✅ 检查清单

部署前确认:

- [ ] Worker 已部署到 Cloudflare
- [ ] Worker URL 已配置到 `.env`
- [ ] Salt 配置已托管(GitHub Gist)
- [ ] 前端可以访问 Worker `/health` 端点
- [ ] 二维码可以正常显示
- [ ] 扫码流程测试通过
- [ ] 错误处理已实现
- [ ] 用户体验优化完成

---

需要我帮你测试集成吗? 或者有任何疑问随时问我! 🚀
