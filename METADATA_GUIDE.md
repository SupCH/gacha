# Gacha Metadata Service - 自托管指南

## 概述
本项目的角色-专武映射数据支持**实时更新**。你可以选择:
1. **使用本地 Fallback** (默认) - 定期手动更新 `metadata.ts`
2. **托管远程 JSON** - 在 GitHub/Gist/Cloudflare Pages 托管自己的数据文件

## 快速开始:托管你自己的元数据文件

### 方案 1: GitHub Gist (推荐)

1. **创建 Gist**
   - 访问 [gist.github.com](https://gist.github.com)
   - 创建新 Gist,文件名: `gacha-metadata.json`
   - 粘贴以下模板

2. **JSON 格式模板**
```json
{
  "hk4e": {
    "角色名": ["专武名"],
    "Character Name": ["Weapon Name"]
  },
  "hkrpg": {
    "角色名": ["光锥名"]
  },
  "nap": {
    "角色名": ["音擎名"]
  }
}
```

3. **获取 Raw URL**
   - 点击 Gist 右上角 "Raw" 按钮
   - 复制 URL (格式: `https://gist.githubusercontent.com/用户名/gist_id/raw/...`)

4. **更新配置**
   - 编辑 `src/services/metadata.ts`
   - 替换 `DEFAULT_METADATA_URL` 为你的 Gist Raw URL

### 方案 2: GitHub Repository

1. 创建仓库 (如 `your-username/gacha-metadata`)
2. 上传 `metadata.json` 文件
3. 使用 Raw URL: `https://raw.githubusercontent.com/your-username/gacha-metadata/main/metadata.json`

### 方案 3: Cloudflare Pages

1. 创建 Cloudflare Pages 项目
2. 托管静态 JSON 文件
3. 配置 CORS 头 (重要!)

## 数据更新流程

### 原神 (Genshin Impact)
- 数据来源建议: 
  - [Genshin.dev](https://github.com/genshindev/api)
  - [theBowja/genshin-db](https://github.com/theBowja/genshin-db)
- 更新频率: 每个大版本 (6周)

### 崩坏:星穹铁道 (Honkai: Star Rail)
- 数据来源建议:
  - [Mar-7th/StarRailRes](https://github.com/Mar-7th/StarRailRes)
  - [kel-z/HSR-Data](https://github.com/kel-z/HSR-Data)
- 更新频率: 每个大版本 (6周)

### 绝区零 (Zenless Zone Zero)
- 数据来源建议:
  - [360NENZ/Dimbreath-ZenlessData](https://github.com/360NENZ/Dimbreath-ZenlessData)
- 更新频率: 每个大版本 (6周)

## 缓存机制

系统会自动缓存远程数据 24 小时:
- 缓存位置: `localStorage`
- 过期时间: 24 小时
- 失败回退: 本地 Fallback 数据

## Fallback 优先级

1. LocalStorage 缓存 (24h)
2. PRIMARY URL (你配置的)
3. FALLBACK_URLS (备用源)
4. LOCAL_SIGNATURE_MAP (本地硬编码)

## 社区贡献

欢迎提交 Pull Request 更新本地 Fallback 数据:
- 格式: `'角色名': ['专武1', '专武2']`
- 注释: 标注角色所属地区/版本

## 调试

打开浏览器开发者工具 Console,查看元数据加载日志:
```
[Metadata] Fetching from: https://...
[Metadata] Successfully fetched from: ...
```

或者:
```
[Metadata] All remote sources failed, using local fallback
```
