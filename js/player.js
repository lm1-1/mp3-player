// player.js — 音频播放核心模块

class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this._stepSize = 4;
    this._onTimeUpdate = null;
    this._onStateChange = null;
    this._onLoaded = null;

    this.audio.addEventListener('timeupdate', () => {
      if (this._onTimeUpdate) this._onTimeUpdate();
    });

    this.audio.addEventListener('play', () => {
      if (this._onStateChange) this._onStateChange(true);
    });

    this.audio.addEventListener('pause', () => {
      if (this._onStateChange) this._onStateChange(false);
    });

    this.audio.addEventListener('ended', () => {
      if (this._onStateChange) this._onStateChange(false);
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this._onLoaded) this._onLoaded();
    });
  }

  // --- 加载 ---
  load(file) {
    if (this._objectUrl) URL.revokeObjectURL(this._objectUrl);
    this._objectUrl = URL.createObjectURL(file);
    this.audio.src = this._objectUrl;
    this.audio.load();
  }

  // --- 播放控制 ---
  play() {
    const p = this.audio.play();
    if (p) p.catch(() => {}); // 吞掉自动播放被拦截的错误
  }

  pause() { this.audio.pause(); }

  toggle() {
    if (this.audio.paused) this.play();
    else this.pause();
  }

  get playing() { return !this.audio.paused; }

  // --- 时间 ---
  get currentTime() { return this.audio.currentTime; }
  set currentTime(t) { this.audio.currentTime = Math.max(0, Math.min(t, this.duration)); }

  get duration() { return this.audio.duration || 0; }

  // --- 快进/后退 ---
  skipForward() { this.currentTime += this._stepSize; }
  skipBack() { this.currentTime -= this._stepSize; }

  get stepSize() { return this._stepSize; }
  set stepSize(s) { this._stepSize = s; }

  // --- 倍速 ---
  get speed() { return this.audio.playbackRate; }
  set speed(rate) { this.audio.playbackRate = rate; }

  // --- 进度跳转（百分比 0-100） ---
  seekTo(percent) {
    if (this.duration) {
      this.currentTime = (percent / 100) * this.duration;
    }
  }

  // --- 回调 ---
  onTimeUpdate(fn) { this._onTimeUpdate = fn; }
  onStateChange(fn) { this._onStateChange = fn; }
  onLoaded(fn) { this._onLoaded = fn; }
}

// 导出单例
const player = new AudioPlayer();
