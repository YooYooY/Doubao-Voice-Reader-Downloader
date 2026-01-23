(function() {
  const OriginalWebSocket = window.WebSocket;
  let audioChunks = [];
  let collecting = false;
  let ui = null;

  // 确保 UI 脚本已加载
  function init() {
    if (window.DoubaoTTSUI) {
      ui = new window.DoubaoTTSUI();
      ui.onDownload = () => {
        if (audioChunks.length === 0) return;
        exportAudio(audioChunks);
      };
      ui.onClear = () => {
        audioChunks = [];
        ui.update('已清空', 0, false);
      };
    } else {
      // 如果 UI 脚本还没执行，稍后重试
      setTimeout(init, 100);
    }
  }

  // 启动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.WebSocket = function(...args) {
    const ws = new OriginalWebSocket(...args);

    ws.addEventListener("message", (event) => {
      // 二进制音频帧 (ArrayBuffer)
      if (event.data instanceof ArrayBuffer) {
        if (collecting) {
            audioChunks.push(new Uint8Array(event.data));
            updateUIState();
        }
        return;
      }

      // 二进制音频帧 (Blob)
      if (event.data instanceof Blob) {
        if (collecting) {
            audioChunks.push(event.data);
            updateUIState();
        }
        return;
      }

      // JSON 控制消息
      try {
        const msg = JSON.parse(event.data);

        if (msg.event === "open_success") {
          collecting = true;
          console.log("[TTS] start collecting audio");
          if (ui) ui.update('正在接收音频...', undefined, true);
        }

        if (msg.event === "sentence_start") {
            collecting = true;
            console.log("[TTS] sentence start");
            if (ui) ui.update('正在接收音频...', undefined, true);
        }

        if (msg.event === "finish") {
          console.log("[TTS] finish signal received");
          if (ui) ui.update('接收完成', undefined, false);
        }

        if (msg.event === "sentence_end") {
          console.log("[TTS] sentence end");
          if (ui) ui.update('本句结束', undefined, false);
        }

      } catch (e) { }
    });

    ws.addEventListener("close", () => {
      collecting = false;
      console.log("[TTS] websocket closed");
      if (ui) ui.update('连接已断开', undefined, false);
    });

    return ws;
  };

  function updateUIState() {
    if (!ui) return;
    const totalSize = audioChunks.reduce((acc, chunk) => acc + (chunk.length || chunk.size || 0), 0);
    ui.update(null, totalSize, true);
  }

  function exportAudio(chunks) {
    if (!chunks || chunks.length === 0) return;
    
    const blob = new Blob(chunks, { type: "audio/aac" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `doubao_tts_${Date.now()}.m4a`;
    a.click();

    URL.revokeObjectURL(url);
  }
})();
