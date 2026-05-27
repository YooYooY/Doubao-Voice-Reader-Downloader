(function() {
  const OriginalWebSocket = window.WebSocket;
  let audioChunks = [];
  let collecting = false;
  let ui = null;
  let pendingStartAt = 0;
  let activeWs = null;
  let detectedExt = null;
  let prefixBytes = new Uint8Array(0);

  function init() {
    if (!window.DoubaoTTSUI) {
      setTimeout(init, 100);
      return;
    }

    ui = new window.DoubaoTTSUI();
    ui.onDownload = () => {
      if (audioChunks.length === 0) return;
      exportAudio();
    };
    ui.onClear = () => {
      reset();
      ui.update('已清空', 0, false);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target;
      if (!el || typeof el.closest !== 'function') return;

      const btn = el.closest('button, [role="button"], a');
      const label =
        (btn && (btn.getAttribute('aria-label') || btn.getAttribute('title'))) ||
        (btn && (btn.innerText || btn.textContent)) ||
        (el && (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title')))) ||
        (el && (el.innerText || el.textContent)) ||
        '';

      if (!label) return;
      if (!(label.includes('语音朗读') || label.includes('朗读') || label.includes('播放'))) return;

      pendingStartAt = Date.now();
      reset();
      if (ui) ui.setDownloadExt(null);
      if (ui) ui.update('音频收集中...', 0, true);
    },
    true
  );

  class PatchedWebSocket extends OriginalWebSocket {
    constructor(...args) {
      super(...args);
      const wsUrl = args && args[0] ? String(args[0]) : '';
      if (pendingStartAt && Date.now() - pendingStartAt < 10000) console.log('[TTS] WebSocket created', wsUrl);

      this.addEventListener('message', (event) => {
        onWsMessage(event.data, this, wsUrl);
      });

      this.addEventListener('close', () => {
        if (activeWs !== this) return;
        collecting = false;
        if (ui) ui.update('音频收集完成', getTotalSize(), false);
      });
    }
  }

  window.WebSocket = PatchedWebSocket;

  function onWsMessage(data, ws, wsUrl) {
    if (!shouldCapture(wsUrl)) return;
    if (activeWs && activeWs !== ws) return;
    if (!activeWs) activeWs = ws;

    if (data instanceof ArrayBuffer) {
      onBytes(new Uint8Array(data));
      return;
    }

    if (data instanceof Blob) {
      data
        .arrayBuffer()
        .then((buf) => onBytes(new Uint8Array(buf)))
        .catch(() => {});
    }
  }

  function onBytes(bytes) {
    if (!bytes || bytes.length === 0) return;

    if (!collecting) {
      collecting = true;
      pendingStartAt = 0;
      if (ui) ui.update('音频收集中...', getTotalSize(), true);
    }

    audioChunks.push(bytes);
    appendPrefix(bytes);

    if (!detectedExt) {
      detectedExt = detectExt(prefixBytes);
      if (ui) ui.setDownloadExt(detectedExt === 'mp3' || detectedExt === 'ogg' ? detectedExt : null);
    }

    if (ui) ui.update(null, getTotalSize(), true);
  }

  function shouldCapture(wsUrl) {
    if (pendingStartAt && Date.now() - pendingStartAt < 10000) return true;
    return wsUrl.includes('voicegenie') || wsUrl.includes('frontier-audio') || wsUrl.includes('tts');
  }

  function reset() {
    audioChunks = [];
    collecting = false;
    activeWs = null;
    detectedExt = null;
    prefixBytes = new Uint8Array(0);
  }

  function appendPrefix(bytes) {
    const max = 4096;
    if (prefixBytes.length >= max) return;
    const take = bytes.length > max ? bytes.subarray(0, max) : bytes;
    const combined = new Uint8Array(Math.min(prefixBytes.length + take.length, max));
    combined.set(prefixBytes, 0);
    combined.set(take.subarray(0, combined.length - prefixBytes.length), prefixBytes.length);
    prefixBytes = combined;
  }

  function detectExt(bytes) {
    if (!bytes || bytes.length < 4) return null;
    if (indexOfAscii(bytes, 'OggS') !== -1) return 'ogg';
    if (looksLikeMp3(bytes)) return 'mp3';
    return null;
  }

  function exportAudio() {
    if (!ui) return;
    if (detectedExt !== 'mp3' && detectedExt !== 'ogg') {
      ui.update('仅支持下载 .ogg / .mp3', getTotalSize(), false);
      return;
    }

    const bytes = concatBytes(audioChunks);
    if (!bytes || bytes.length === 0) return;

    if (detectedExt === 'mp3') {
      const cleaned = extractMp3(bytes);
      if (!cleaned || cleaned.length === 0) return;
      downloadBytes(cleaned, 'audio/mpeg', 'mp3');
      return;
    }

    const cleaned = extractOgg(bytes);
    if (!cleaned || cleaned.length === 0) return;
    downloadBytes(cleaned, 'audio/ogg', 'ogg');
  }

  function downloadBytes(bytes, mime, ext) {
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `doubao_tts_${Date.now()}.${ext}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function getTotalSize() {
    return audioChunks.reduce((acc, chunk) => acc + (chunk ? chunk.length : 0), 0);
  }

  function concatBytes(chunks) {
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  function indexOfAscii(bytes, str) {
    const needle = new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
    outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (bytes[i + j] !== needle[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  function looksLikeMp3(bytes) {
    let i = 0;
    let frames = 0;
    for (; i <= bytes.length - 4; i++) {
      if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
      const len = mp3FrameLengthAt(bytes, i);
      if (!len) continue;
      frames++;
      i += len - 1;
      if (frames >= 2) return true;
    }
    return false;
  }

  function mp3FrameLengthAt(bytes, i) {
    if (i + 3 >= bytes.length) return 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const versionBits = (b1 >> 3) & 0x03;
    const layerBits = (b1 >> 1) & 0x03;
    if (versionBits === 1) return 0;
    if (layerBits !== 1) return 0;

    const bitrateIndex = (b2 >> 4) & 0x0f;
    const sampleRateIndex = (b2 >> 2) & 0x03;
    const padding = (b2 >> 1) & 0x01;
    if (bitrateIndex === 0 || bitrateIndex === 15) return 0;
    if (sampleRateIndex === 3) return 0;

    const isMpeg1 = versionBits === 3;
    const bitratesMpeg1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
    const bitratesMpeg2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
    const sampleRatesMpeg1 = [44100, 48000, 32000, 0];
    const sampleRatesMpeg2 = [22050, 24000, 16000, 0];
    const sampleRatesMpeg25 = [11025, 12000, 8000, 0];

    let sampleRate = 0;
    if (versionBits === 3) sampleRate = sampleRatesMpeg1[sampleRateIndex];
    else if (versionBits === 2) sampleRate = sampleRatesMpeg2[sampleRateIndex];
    else sampleRate = sampleRatesMpeg25[sampleRateIndex];
    if (!sampleRate) return 0;

    const bitrateKbps = isMpeg1 ? bitratesMpeg1[bitrateIndex] : bitratesMpeg2[bitrateIndex];
    if (!bitrateKbps) return 0;

    const coef = isMpeg1 ? 144000 : 72000;
    const frameLen = Math.floor((coef * bitrateKbps) / sampleRate + padding);
    if (frameLen < 24 || frameLen > 10000) return 0;

    const next = i + frameLen;
    if (next + 1 < bytes.length) {
      if (!(bytes[next] === 0xff && (bytes[next + 1] & 0xe0) === 0xe0)) return 0;
    }

    return frameLen;
  }

  function concatSlices(bytes, slices) {
    let total = 0;
    for (const s of slices) total += s.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const s of slices) {
      out.set(bytes.subarray(s.start, s.start + s.length), offset);
      offset += s.length;
    }
    return out;
  }

  function extractMp3(bytes) {
    if (!bytes || bytes.length < 4) return null;
    const segments = [];
    let i = 0;

    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33 && bytes.length >= 10) {
      const tagSize =
        ((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f);
      const end = Math.min(bytes.length, 10 + tagSize);
      segments.push({ start: 0, length: end });
      i = end;
    }

    let frameCount = 0;
    for (; i <= bytes.length - 4; i++) {
      if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
      const len = mp3FrameLengthAt(bytes, i);
      if (!len) continue;
      if (i + len > bytes.length) continue;
      segments.push({ start: i, length: len });
      frameCount++;
      i += len - 1;
      if (frameCount > 200000) break;
    }

    if (frameCount < 2) return null;
    return concatSlices(bytes, segments);
  }

  function extractOgg(bytes) {
    if (!bytes || bytes.length < 27) return null;
    const streams = new Map();
    let i = 0;
    while (i <= bytes.length - 27) {
      if (!(bytes[i] === 0x4f && bytes[i + 1] === 0x67 && bytes[i + 2] === 0x67 && bytes[i + 3] === 0x53)) {
        i++;
        continue;
      }

      const headerType = bytes[i + 5];
      const serial = (bytes[i + 14] | (bytes[i + 15] << 8) | (bytes[i + 16] << 16) | (bytes[i + 17] << 24)) >>> 0;

      const pageSegments = bytes[i + 26];
      const segTableStart = i + 27;
      const segTableEnd = segTableStart + pageSegments;
      if (segTableEnd > bytes.length) break;
      let dataLen = 0;
      for (let s = 0; s < pageSegments; s++) dataLen += bytes[segTableStart + s];
      const pageTotal = 27 + pageSegments + dataLen;
      if (i + pageTotal > bytes.length) break;

      const entry = streams.get(serial) || { pages: [], hasBos: false };
      entry.pages.push({ start: i, length: pageTotal, headerType });
      if ((headerType & 0x02) === 0x02) entry.hasBos = true;
      streams.set(serial, entry);

      i += pageTotal;
    }

    let bestSerial = null;
    let bestScore = 0;
    for (const [serial, entry] of streams.entries()) {
      if (!entry.hasBos) continue;
      const score = entry.pages.length;
      if (score > bestScore) {
        bestScore = score;
        bestSerial = serial;
      }
    }

    if (bestSerial === null) return null;
    const entry = streams.get(bestSerial);
    const bosIndex = entry.pages.findIndex((p) => (p.headerType & 0x02) === 0x02);
    if (bosIndex === -1) return null;
    const slices = entry.pages.slice(bosIndex).map((p) => ({ start: p.start, length: p.length }));
    if (slices.length < 2) return null;
    return concatSlices(bytes, slices);
  }
})();
