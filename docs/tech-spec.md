# 技术方案 — MP3 听力播放器

## 技术选型：PWA（渐进式网页应用）

### 为什么选 PWA？

| 对比维度 | PWA | 原生 APP（Flutter） | 桌面软件（Electron） |
|---------|-----|-------------------|---------------------|
| 跨平台 | ✅ Android + Windows | ✅ 需打包 | ⚠️ 仅桌面 |
| 安装门槛 | ✅ 零安装，浏览器打开 | ⚠️ 需装 APK/exe | ⚠️ 需装 exe |
| 开发复杂度 | ✅ 纯前端，无需编译 | ⚠️ Dart + 构建环境 | ⚠️ Node.js + 打包 |
| MP3 播放 | ✅ 浏览器原生支持 | ⚠️ 需插件 | ✅ |
| 维护成本 | ✅ 极低 | ⚠️ 中等 | ⚠️ 中等 |

**结论**：PWA 是当前需求的最优解——一套代码、零安装、浏览器原生支持音频播放。

## 技术栈

- **HTML5**：页面结构
- **CSS3**：样式与响应式布局
- **JavaScript（ES6+）**：业务逻辑，无第三方依赖
- **HTML5 Audio API**：音频播放控制
- **File System Access API**：读取本地文件夹
- **Service Worker**：离线缓存（PWA 核心）
- **Web App Manifest**：添加到主屏幕
- **IndexedDB**：存储文件夹句柄
- **localStorage**：存储用户设置

## 浏览器 API 使用说明

### 1. 音频播放 — `<audio>` + Web Audio API

```js
const audio = new Audio();
audio.src = URL.createObjectURL(mp3File);
audio.playbackRate = 1.5; // 倍速
audio.currentTime = 30;   // 跳转到 30 秒
```

### 2. 文件夹选择 — File System Access API

```js
const handle = await window.showDirectoryPicker();
for await (const entry of handle.values()) {
  if (entry.name.endsWith('.mp3')) { /* 处理文件 */ }
}
```

- Chrome 86+ (桌面) 和 Chrome 112+ (Android) 支持
- 用户必须手动授予文件夹权限
- 文件夹句柄可存入 IndexedDB 实现「记住上次选择」

### 3. 进度条 — `<input type="range">`

原生 range 控件在移动端和桌面端都有良好支持，配合 touch 事件可实现精准拖拽。

## 浏览器兼容性

| 功能 | Chrome (Windows) | Edge (Windows) | Chrome (Android) |
|------|:---:|:---:|:---:|
| `<audio>` | ✅ | ✅ | ✅ |
| `showDirectoryPicker()` | ✅ v86+ | ✅ v86+ | ✅ v112+ |
| Service Worker | ✅ | ✅ | ✅ |
| `localStorage` | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ |

**最低要求**：Android Chrome 112+（2023 年 4 月后版本均支持）

## 不需要的服务

- ❌ 不需要后端服务器
- ❌ 不需要数据库
- ❌ 不需要第三方 CDN
- 播放器完全在浏览器本地运行，所有文件（HTML/CSS/JS）可离线使用
