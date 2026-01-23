# Doubao TTS Downloader

一个简单易用的 Chrome 扩展，用于一键下载豆包 (Doubao) 网页版的 TTS 语音朗读音频。

## ✨ 主要功能

- **无损下载**：直接捕获原始 AAC 音频流，保存为高兼容性的 `.m4a` 格式。
- **自动检测**：点击豆包的语音朗读后，自动唤醒下载面板。
- **实时监控**：实时显示已接收的音频大小。
- **隐私安全**：所有处理均在本地浏览器完成，不收集任何用户数据。

## 🚀 安装方法

### 方式一：从 Chrome 应用商店安装
（待发布链接）

### 方式二：手动安装（开发者模式）
1. 下载本仓库代码或 Clone 到本地：
   ```bash
   git clone https://github.com/YOUR_USERNAME/doubao-tts-downloader.git
   ```
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`。
3. 开启右上角的 **"开发者模式"**。
4. 点击左上角的 **"加载已解压的扩展程序"**。
5. 选择本项目文件夹即可。

## 📖 使用指南

1. 打开 [豆包官网](https://www.doubao.com/)。
2. 与豆包对话，或者让它朗读一段文字。
3. 点击对话气泡旁的 **"播放/朗读"** 按钮。
4. 页面右下角会自动弹出 **Doubao TTS** 控制面板。
5. 等待朗读结束（或随时），点击面板上的 **"下载 .m4a"** 按钮保存音频。

## 🛠️ 技术栈

- **Manifest V3**：符合最新的 Chrome 扩展标准。
- **WebSocket Hook**：通过拦截 WebSocket 消息流捕获音频数据。
- **Blob 处理**：在内存中高效处理二进制音频流。

## 🔒 隐私政策

本扩展仅在本地运行，不会上传任何数据到外部服务器。详细隐私政策请查看 [privacy.html](privacy.html)。

## 📄 License

MIT License
