# Gacha Analyzer

一个用于分析米哈游游戏抽卡数据的 Web 应用,支持原神、星穹铁道、绝区零。

## 快速开始

### 方式一:双击启动脚本
- **Windows 批处理**: 双击 `start.bat`
- **PowerShell**: 右键 `start.ps1` → "使用 PowerShell 运行"

### 方式二:命令行启动
```bash
npm run dev
```

然后访问: http://localhost:5173/

## 功能特性

- 📁 支持 UIGF JSON 文件导入 (Starward/寻空)
- 🔗 PowerShell 脚本自动提取抽卡链接
- 📊 数据可视化看板 (总抽数/五星/平均出金/运气指数)
- 🤖 AI 欧气鉴定 (需配置 Gemini API)
- 📈 抽数分布直方图

## 构建生产版本

```bash
npm run build
```

构建产物将在 `dist` 目录中。

## 技术栈

- React 19 + TypeScript
- Vite 7.x
- Tailwind CSS 3.x
- Recharts (数据可视化)
- Lucide React (图标)

## 许可证

MIT
