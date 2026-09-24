class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = false;
  public volume: number = 0.5; // 0.0 to 1.0
  public soundType: 'mechanical' | 'soft' | 'typewriter' = 'mechanical';

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick(key: string) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      const startGain = this.volume * 0.35;
      
      if (key === 'Enter') {
        // Deeper, slightly longer return strike
        if (this.soundType === 'typewriter') {
          this.playBell();
        }
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
        gain.gain.setValueAtTime(startGain * 1.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        
        this.playNoiseClick(now, startGain * 1.8, 0.05, 1000);
        return;
      } else if (key === ' ') {
        // Spacebar click: lower frequency, slightly hollower pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);
        gain.gain.setValueAtTime(startGain * 1.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
        
        this.playNoiseClick(now, startGain * 0.8, 0.02, 1200);
        return;
      }

      // Normal keys
      if (this.soundType === 'soft') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.015);
        gain.gain.setValueAtTime(startGain * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        osc.start(now);
        osc.stop(now + 0.015);
      } else if (this.soundType === 'mechanical') {
        // Mechanical tactile switch click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.012);
        
        gain.gain.setValueAtTime(startGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        
        osc.start(now);
        osc.stop(now + 0.012);
        
        // High-pitched click component
        this.playNoiseClick(now, startGain * 0.8, 0.006, 2500);
      } else if (this.soundType === 'typewriter') {
        // Typewriter punch strike
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.03);
        
        gain.gain.setValueAtTime(startGain * 1.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        osc.start(now);
        osc.stop(now + 0.03);
        
        this.playNoiseClick(now, startGain * 1.4, 0.022, 1400);
      }
    } catch (e) {
      console.warn('Audio click output error:', e);
    }
  }

  private playNoiseClick(startTime: number, volume: number, duration: number, bandpassFreq: number) {
    if (!this.ctx) return;
    try {
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(bandpassFreq, startTime);
      filter.Q.setValueAtTime(2.5, startTime);
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      noiseNode.start(startTime);
      noiseNode.stop(startTime + duration);
    } catch (err) {
      // Ignore audio synthesis edge errors
    }
  }

  private playBell() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1450, now);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2280, now); // metallic dissonance

      gainNode.gain.setValueAtTime(this.volume * 0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (err) {
      // Ignore audio synthesis errors
    }
  }
}

export const soundManager = new SoundManager();
