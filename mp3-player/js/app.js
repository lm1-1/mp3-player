// app.js — UI 交互、文件夹选择与文件管理

(function () {
  'use strict';

  // ========== DOM 引用 ==========
  const btnSelectFolder = document.getElementById('btnSelectFolder');
  const folderLabel = document.getElementById('folderLabel');
  const currentFileEl = document.getElementById('currentFile');
  const progressBar = document.getElementById('progressBar');
  const currentTimeEl = document.getElementById('currentTime');
  const totalTimeEl = document.getElementById('totalTime');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const btnSkipBack = document.getElementById('btnSkipBack');
  const btnSkipForward = document.getElementById('btnSkipForward');
  const stepGroupBack = document.getElementById('stepGroupBack');
  const stepGroupForward = document.getElementById('stepGroupForward');
  const speedGroup = document.getElementById('speedGroup');
  const fileListEl = document.getElementById('fileList');

  // ========== 状态 ==========
  let fileList = [];         // 当前文件列表 (File objects)
  let currentFile = null;
  let isSeeking = false;
  const DB_NAME = 'mp3-player-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'handles';

  const settings = {
    speed: 1,
    stepSize: 4,
    lastFileName: '',
    lastTime: 0,
    folderName: '',
  };

  // ========== IndexedDB（存储文件夹句柄） ==========
  function openDB() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function saveDirHandle(handle) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, 'dirHandle');
      await new Promise(function (resolve, reject) {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
      db.close();
    } catch (_) { /* IndexedDB 不可用时静默失败 */ }
  }

  async function loadDirHandle() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('dirHandle');
      const result = await new Promise(function (resolve, reject) {
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = reject;
      });
      db.close();
      return result;
    } catch (_) { return null; }
  }

  // ========== 设置记忆 (localStorage) ==========
  function loadSettings() {
    try {
      const saved = localStorage.getItem('mp3-player-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.speed) settings.speed = parsed.speed;
        if (parsed.stepSize) settings.stepSize = parsed.stepSize;
        if (parsed.lastFileName) settings.lastFileName = parsed.lastFileName;
        if (typeof parsed.lastTime === 'number') settings.lastTime = parsed.lastTime;
        if (parsed.folderName) settings.folderName = parsed.folderName;
      }
    } catch (_) { /* ignore */ }
  }

  function saveSettings() {
    try {
      // 记住当前播放位置
      if (currentFile && player.duration > 0) {
        settings.lastFileName = currentFile.name;
        settings.lastTime = player.currentTime;
      }
      localStorage.setItem('mp3-player-settings', JSON.stringify(settings));
    } catch (_) { /* ignore */ }
  }

  // 页面关闭/刷新前保存
  window.addEventListener('beforeunload', saveSettings);
  // 定期保存播放进度（每 5 秒）
  setInterval(function () {
    if (currentFile && player.playing) {
      try {
        settings.lastFileName = currentFile.name;
        settings.lastTime = player.currentTime;
        localStorage.setItem('mp3-player-settings', JSON.stringify(settings));
      } catch (_) { /* ignore */ }
    }
  }, 5000);

  // ========== 格式化时间 ==========
  function formatTime(seconds) {
    if (!isFinite(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // ========== 播放器回调 ==========
  player.onTimeUpdate(function () {
    if (!isSeeking && player.duration > 0) {
      const pct = (player.currentTime / player.duration) * 100;
      progressBar.value = pct;
      currentTimeEl.textContent = formatTime(player.currentTime);
    }
  });

  player.onStateChange(function (playing) {
    playIcon.textContent = playing ? '⏸️' : '▶️';
    updateFilePlayingState();
  });

  player.onLoaded(function () {
    totalTimeEl.textContent = formatTime(player.duration);
    progressBar.value = 0;
    currentTimeEl.textContent = '00:00';
    player.speed = settings.speed;
  });

  // ========== 进度条交互 ==========
  progressBar.addEventListener('input', function () {
    isSeeking = true;
    currentTimeEl.textContent = formatTime((progressBar.value / 100) * player.duration);
  });

  progressBar.addEventListener('change', function () {
    player.seekTo(Number(progressBar.value));
    isSeeking = false;
  });

  progressBar.addEventListener('touchstart', function () { isSeeking = true; });
  progressBar.addEventListener('touchend', function () {
    player.seekTo(Number(progressBar.value));
    isSeeking = false;
  });

  // ========== 按钮事件 ==========
  btnPlayPause.addEventListener('click', function () {
    if (!currentFile) {
      alert('请先选择一个包含 MP3 文件的文件夹');
      return;
    }
    player.toggle();
  });

  btnSkipBack.addEventListener('click', function () {
    if (!currentFile) return;
    player.skipBack();
  });

  btnSkipForward.addEventListener('click', function () {
    if (!currentFile) return;
    player.skipForward();
  });

  // ========== 键盘快捷键 ==========
  document.addEventListener('keydown', function (e) {
    // 不在输入框中响应快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (!currentFile) return;
        player.toggle();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (!currentFile) return;
        player.skipBack();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!currentFile) return;
        player.skipForward();
        break;
    }
  });

  // ========== 步长选择 ==========
  function setActiveStep(group, step) {
    group.querySelectorAll('.btn-step').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.step) === step);
    });
  }

  function handleStepClick(e) {
    const btn = e.target.closest('.btn-step');
    if (!btn) return;
    const step = Number(btn.dataset.step);
    settings.stepSize = step;
    player.stepSize = step;
    setActiveStep(stepGroupBack, step);
    setActiveStep(stepGroupForward, step);
    saveSettings();
  }

  stepGroupBack.addEventListener('click', handleStepClick);
  stepGroupForward.addEventListener('click', handleStepClick);

  // ========== 倍速选择 ==========
  speedGroup.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-speed');
    if (!btn) return;
    const rate = Number(btn.dataset.rate);
    settings.speed = rate;
    player.speed = rate;
    speedGroup.querySelectorAll('.btn-speed').forEach(function (b) {
      b.classList.toggle('active', Number(b.dataset.rate) === rate);
    });
    saveSettings();
  });

  // ========== 文件夹选择 ==========
  // 检查浏览器是否支持 File System Access API
  const supportsDirectoryPicker = typeof window.showDirectoryPicker === 'function';

  // 不支持时的回退方案：文件选择器
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/mpeg,.mp3';
  fileInput.multiple = true;
  fileInput.addEventListener('change', function () {
    const files = Array.from(fileInput.files);
    if (files.length === 0) return;
    fileList = files;
    renderFileList();
    folderLabel.textContent = '已选 ' + files.length + ' 个文件';
    if (!currentFile || !fileList.includes(currentFile)) {
      selectFile(files[0]);
    }
  });

  async function scanDirectory(handle) {
    const files = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.mp3')) {
        const file = await entry.getFile();
        files.push(file);
      }
    }
    files.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return files;
  }

  async function selectFolder() {
    if (!supportsDirectoryPicker) {
      fileInput.click();
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readonly' });
      folderLabel.textContent = handle.name;
      settings.folderName = handle.name;
      saveSettings();
      const files = await scanDirectory(handle);
      if (files.length === 0) {
        fileListEl.innerHTML = '<div class="file-list-empty">该文件夹中没有 MP3 文件</div>';
        fileList = [];
        return;
      }
      fileList = files;
      await saveDirHandle(handle);
      renderFileList();
      tryAutoPlayLast();
    } catch (err) {
      if (err.name === 'AbortError') return;
      // showDirectoryPicker 失败时（如 file:// 协议安全限制），回退到文件选择器
      console.warn('文件夹选择不可用，使用文件选择器:', err.message);
      fileInput.click();
    }
  }

  btnSelectFolder.addEventListener('click', selectFolder);

  // ========== 文件列表渲染 ==========
  function renderFileList() {
    fileListEl.innerHTML = '';
    if (fileList.length === 0) {
      fileListEl.innerHTML = '<div class="file-list-empty">未发现 MP3 文件</div>';
      return;
    }
    fileList.forEach(function (file) {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.textContent = file.name;
      div.addEventListener('click', function () { selectFile(file); });
      fileListEl.appendChild(div);
    });
    folderLabel.textContent = '已选 ' + fileList.length + ' 个文件';
  }

  // ========== 文件选择 & 播放 ==========
  function selectFile(file) {
    currentFile = file;
    currentFileEl.textContent = file.name;
    player.load(file);
    player.play();
    updateFilePlayingState();
    saveSettings();
  }

  function updateFilePlayingState() {
    const items = fileListEl.querySelectorAll('.file-item');
    items.forEach(function (item, i) {
      item.classList.toggle('playing', fileList[i] === currentFile && player.playing);
    });
  }

  // 自动恢复上次播放的文件
  function tryAutoPlayLast() {
    if (!settings.lastFileName) return;
    const lastFile = fileList.find(function (f) { return f.name === settings.lastFileName; });
    if (lastFile) {
      selectFile(lastFile);
      // 恢复播放位置
      if (settings.lastTime > 0) {
        // 等待音频元数据加载后再跳转
        var checkReady = setInterval(function () {
          if (player.duration > 0) {
            player.currentTime = settings.lastTime;
            clearInterval(checkReady);
          }
        }, 100);
        // 超时停止等待
        setTimeout(function () { clearInterval(checkReady); }, 5000);
      }
    }
  }

  // ========== 启动时自动恢复文件夹 ==========
  async function restoreFolder() {
    const handle = await loadDirHandle();
    if (!handle) {
      // 没有已保存的文件夹句柄，但可能记得上次的文件夹名
      if (settings.folderName) {
        folderLabel.textContent = '选择文件夹（上次：' + settings.folderName + '）';
      }
      return;
    }

    // 直接尝试扫描，不提前检查权限
    // queryPermission/requestPermission 在页面加载时缺少用户手势会失败
    try {
      const files = await scanDirectory(handle);
      if (files.length === 0) {
        fileListEl.innerHTML = '<div class="file-list-empty">该文件夹中没有 MP3 文件</div>';
        fileList = [];
        folderLabel.textContent = handle.name;
        return;
      }
      folderLabel.textContent = handle.name;
      fileList = files;
      renderFileList();
      tryAutoPlayLast();
    } catch (_) {
      // 权限已过期（如 file:// 模式下浏览器未持久化授权）
      // 显示文件夹名提示用户重新选择
      folderLabel.textContent = '选择文件夹（上次：' + (settings.folderName || handle.name) + '）';
    }
  }

  // ========== 恢复 UI 状态 ==========
  function restoreUI() {
    speedGroup.querySelectorAll('.btn-speed').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.rate) === settings.speed);
    });
    setActiveStep(stepGroupBack, settings.stepSize);
    setActiveStep(stepGroupForward, settings.stepSize);
    player.stepSize = settings.stepSize;
    player.speed = settings.speed;
  }

  // ========== 启动 ==========
  loadSettings();
  restoreUI();
  progressBar.value = 0;
  restoreFolder();
})();
