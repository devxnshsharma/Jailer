export type SoundName = 'menu' | 'hit' | 'heavy' | 'ability' | 'collect' | 'hurt' | 'victory' | 'defeat';

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled = true;
  private ambientTimer: number | null = null;
  private ambientStep = 0;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAmbient();
    }
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      this.startAmbient();
    } catch {
      // Browsers can block AudioContext creation. Gameplay remains fully playable.
    }
  }

  play(name: SoundName): void {
    if (!this.enabled || !this.context) {
      return;
    }

    const profiles: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; gain: number; slide?: number }> = {
      menu: { frequency: 260, duration: 0.08, type: 'sine', gain: 0.035, slide: 330 },
      hit: { frequency: 95, duration: 0.08, type: 'sawtooth', gain: 0.06, slide: 55 },
      heavy: { frequency: 70, duration: 0.18, type: 'square', gain: 0.08, slide: 35 },
      ability: { frequency: 180, duration: 0.3, type: 'triangle', gain: 0.07, slide: 620 },
      collect: { frequency: 520, duration: 0.12, type: 'sine', gain: 0.04, slide: 760 },
      hurt: { frequency: 120, duration: 0.16, type: 'square', gain: 0.05, slide: 70 },
      victory: { frequency: 320, duration: 0.65, type: 'triangle', gain: 0.06, slide: 900 },
      defeat: { frequency: 240, duration: 0.5, type: 'sawtooth', gain: 0.045, slide: 55 },
    };
    const profile = profiles[name];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.frequency, now);
    if (profile.slide) {
      oscillator.frequency.exponentialRampToValueAtTime(profile.slide, now + profile.duration);
    }
    gain.gain.setValueAtTime(profile.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + profile.duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
  }

  private startAmbient(): void {
    if (this.ambientTimer !== null || !this.context) {
      return;
    }

    const playPulse = () => {
      if (!this.context || !this.enabled) {
        return;
      }
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const notes = [68, 81, 91, 102, 81, 72, 61, 76];
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(notes[this.ambientStep % notes.length], now);
      this.ambientStep += 1;
      gain.gain.setValueAtTime(0.012, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.45);
    };

    playPulse();
    this.ambientTimer = window.setInterval(playPulse, 1800);
  }

  private stopAmbient(): void {
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }
}
