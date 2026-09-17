// Web Audio API procedural sound synthesizer for naval warfare

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.5;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playCannonShot(type: 'heavy' | 'swivel' | 'mortar' | 'torpedo' | 'fire' | 'missile' | 'railgun' = 'heavy') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(this.volume * 0.7, t);
    master.connect(this.ctx.destination);

    if (type === 'railgun') {
      // Hypervelocity hypersonic snap + electric hum
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'missile') {
      // Rocket booster hiss and whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(650, t + 0.2);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.45);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.45);
    } else if (type === 'swivel') {
      // High snap/crack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.15);
    } else if (type === 'mortar') {
      // Deep whoosh + punch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.45);
    } else if (type === 'torpedo') {
      // Bubbling whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.3);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'fire') {
      // Hissing flame noise
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      noise.start(t);
    } else {
      // Standard heavy cannon: low punch + noise rumble
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
      oscGain.gain.setValueAtTime(1.0, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start(t);
      osc.stop(t + 0.35);

      // Noise blast
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(t);
    }
  }

  public playHit(isFatal: boolean = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(this.volume * (isFatal ? 1.0 : 0.6), t);
    master.connect(this.ctx.destination);

    // Wood splinter / metal impact crunch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isFatal ? 110 : 190, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + (isFatal ? 0.6 : 0.25));
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + (isFatal ? 0.6 : 0.25));

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + (isFatal ? 0.6 : 0.25));
  }

  public playWaterSplash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(this.volume * 0.35, t);
    master.connect(this.ctx.destination);

    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t);
  }

  public playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.16;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  public playDefeat() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [392.00, 349.23, 311.13, 261.63]; // Descending minor
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.22;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  public playRadioPing(type: 'capture' | 'warning' = 'capture') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    if (type === 'warning') {
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(660, t + 0.08);
      gain.gain.setValueAtTime(this.volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    } else {
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12); // A5
      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

export const sounds = new SoundEngine();
