const Audio2 = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
  },
  beep(freq=600, dur=0.05, vol=0.15, type='square') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const v = (save.options.sfx/100) * vol * (save.options.volume/100);
    g.gain.setValueAtTime(v, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },
  click(){ this.beep(600,0.04,0.1); },
  shoot(){ this.beep(880,0.03,0.06); },
  hit()  { this.beep(220,0.05,0.1); },
  hurt() { this.beep(140,0.1,0.15); },
  dash() { this.beep(660,0.08,0.12); setTimeout(()=>this.beep(990,0.06,0.1),30); },
  melee(){ this.beep(520,0.08,0.14,'sawtooth'); },
  long() { this.beep(180,0.25,0.18,'sawtooth'); setTimeout(()=>this.beep(120,0.35,0.15,'sawtooth'),120); },
  explosion(){ this.beep(90,0.4,0.25,'sawtooth'); },
  buy()  { this.beep(880,0.06); setTimeout(()=>this.beep(1200,0.08),50); },
  consume(){ this.beep(720,0.06,0.14); setTimeout(()=>this.beep(1080,0.09,0.12),60); },
  levelUp(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.beep(f,0.12,0.18),i*80)); },
  achievement(){ [880,1108,1320,1760].forEach((f,i)=>setTimeout(()=>this.beep(f,0.14,0.2),i*90)); },
  challenge(){ [330,392,494,392,330].forEach((f,i)=>setTimeout(()=>this.beep(f,0.14,0.2,'sawtooth'),i*90)); },
  victory(){ [660,880,1320].forEach((f,i)=>setTimeout(()=>this.beep(f,0.15),i*100)); },
  defeat(){ this.beep(220,0.3,0.3,'sawtooth'); setTimeout(()=>this.beep(110,0.5,0.3,'sawtooth'),150); },
};

