// 注入 UI 模块
const scriptUI = document.createElement('script');
scriptUI.src = chrome.runtime.getURL('ui.js');
scriptUI.onload = function() {
    this.remove();
    
    // UI 模块加载完成后，再注入逻辑模块
    const scriptLogic = document.createElement('script');
    scriptLogic.src = chrome.runtime.getURL('logic.js');
    scriptLogic.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(scriptLogic);
};
(document.head || document.documentElement).appendChild(scriptUI);
