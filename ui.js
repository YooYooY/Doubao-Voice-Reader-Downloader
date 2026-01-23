class DoubaoTTSUI {
  constructor() {
    this.container = null;
    this.statusText = null;
    this.statusDot = null;
    this.info = null;
    this.downloadBtn = null;
    this.onDownload = null;
    this.onClear = null;
    this.init();
  }

  init() {
    if (document.getElementById('doubao-tts-ui')) return;

    const container = document.createElement('div');
    container.id = 'doubao-tts-ui';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e1e1e;
      color: #fff;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 999999;
      font-family: sans-serif;
      display: none;
      flex-direction: column;
      min-width: 180px;
      font-size: 13px;
      overflow: hidden;
      border: 1px solid #333;
    `;

    // 标题栏
    const header = this.createHeader(container);
    
    // 内容区域
    const content = document.createElement('div');
    content.style.padding = '12px';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '10px';

    const statusRow = this.createStatusRow();
    const info = this.createInfo();
    const btnGroup = this.createBtnGroup();

    content.appendChild(statusRow);
    content.appendChild(info);
    content.appendChild(btnGroup);

    container.appendChild(header);
    container.appendChild(content);

    document.body.appendChild(container);
    this.container = container;
  }

  createHeader(container) {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      background: #2d2d2d;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    `;
    
    const title = document.createElement('span');
    title.textContent = '豆包语音下载助手';
    title.style.fontWeight = 'bold';
    title.style.color = '#ddd';

    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      cursor: pointer;
      font-size: 18px;
      color: #999;
      padding: 0 4px;
    `;
    closeBtn.onclick = () => {
        container.style.display = 'none';
    };
    closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
    closeBtn.onmouseout = () => closeBtn.style.color = '#999';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 拖拽逻辑
    let isDragging = false;
    let initialX, initialY, currentX, currentY;
    let xOffset = 0, yOffset = 0;

    const dragStart = (e) => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || e.target === title) {
        isDragging = true;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
      }
    };

    const drag = (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
    };

    const dragEnd = () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', dragEnd);
    };

    header.onmousedown = dragStart;
    return header;
  }

  createStatusRow() {
    const statusRow = document.createElement('div');
    statusRow.style.display = 'flex';
    statusRow.style.alignItems = 'center';
    statusRow.style.gap = '6px';
    
    this.statusDot = document.createElement('div');
    this.statusDot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #666;
    `;
    
    this.statusText = document.createElement('span');
    this.statusText.textContent = '等待开始...';
    this.statusText.style.color = '#aaa';

    statusRow.appendChild(this.statusDot);
    statusRow.appendChild(this.statusText);
    return statusRow;
  }

  createInfo() {
    this.info = document.createElement('div');
    this.info.textContent = '0 KB';
    this.info.style.fontWeight = 'bold';
    this.info.style.fontSize = '16px';
    this.info.style.textAlign = 'center';
    this.info.style.margin = '4px 0';
    return this.info;
  }

  createBtnGroup() {
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '8px';

    this.downloadBtn = document.createElement('button');
    this.downloadBtn.textContent = '下载 .m4a';
    this.downloadBtn.disabled = true;
    this.downloadBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: not-allowed;
      opacity: 0.5;
      font-weight: 500;
      transition: all 0.2s;
    `;
    this.downloadBtn.onclick = () => {
        if (this.onDownload) this.onDownload();
    };

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清空';
    clearBtn.style.cssText = `
      padding: 8px 12px;
      background: #444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    clearBtn.onmouseover = () => clearBtn.style.background = '#555';
    clearBtn.onmouseout = () => clearBtn.style.background = '#444';
    clearBtn.onclick = () => {
        if (this.onClear) this.onClear();
    };

    btnGroup.appendChild(this.downloadBtn);
    btnGroup.appendChild(clearBtn);
    return btnGroup;
  }

  show() {
    if (this.container && this.container.style.display === 'none') {
        this.container.style.display = 'flex';
    }
  }

  update(text, sizeBytes, isRecording) {
    if (isRecording) this.show();

    if (text) this.statusText.textContent = text;
    
    if (isRecording === true) {
        this.statusDot.style.background = '#ff4444';
        this.statusDot.style.boxShadow = '0 0 6px #ff4444';
    } else if (isRecording === false) {
        this.statusDot.style.background = '#666';
        this.statusDot.style.boxShadow = 'none';
    }

    if (sizeBytes !== undefined) {
        const kb = (sizeBytes / 1024).toFixed(1);
        const mb = (sizeBytes / 1024 / 1024).toFixed(2);
        this.info.textContent = sizeBytes > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
        
        if (sizeBytes > 0) {
            this.downloadBtn.disabled = false;
            this.downloadBtn.style.cursor = 'pointer';
            this.downloadBtn.style.opacity = '1';
        } else {
            this.downloadBtn.disabled = true;
            this.downloadBtn.style.cursor = 'not-allowed';
            this.downloadBtn.style.opacity = '0.5';
        }
    }
  }
}

window.DoubaoTTSUI = DoubaoTTSUI;
