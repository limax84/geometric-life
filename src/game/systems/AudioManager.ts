// Gestionnaire audio pour les effets sonores

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    muted: false,
  };

  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private isInitialized: boolean = false;
  
  // Musique
  private musicGainNode: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private isMusicPlaying: boolean = false;
  private musicPaused: boolean = false;
  private musicStartTime: number = 0;
  private musicPauseTime: number = 0;

  constructor() {
    // L'AudioContext sera créé lors de la première interaction utilisateur
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Générer les sons procéduralement
      await this.generateSounds();
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('AudioManager: Could not initialize audio context', error);
    }
  }

  private async generateSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Générer les sons procéduralement (pas besoin de fichiers audio)
    this.soundBuffers.set('shoot', this.createShootSound());
    this.soundBuffers.set('explosion', this.createExplosionSound());
    this.soundBuffers.set('playerHit', this.createPlayerHitSound());
    this.soundBuffers.set('powerup', this.createPowerupSound());
    this.soundBuffers.set('enemyShoot', this.createEnemyShootSound());
    this.soundBuffers.set('waveStart', this.createWaveStartSound());
    this.soundBuffers.set('gameOver', this.createGameOverSound());
    this.soundBuffers.set('bomb', this.createCyberExplosionSound());
    this.soundBuffers.set('playerDeath', this.createPlayerDeathSound());
    this.soundBuffers.set('music', this.createElectroMusic());
  }

  private createShootSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.1;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      const frequency = 800 - t * 3000;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      data[i] += (Math.random() - 0.5) * envelope * 0.1;
    }

    return buffer;
  }

  private createExplosionSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.4;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8);
      const noise = (Math.random() - 0.5) * 2;
      const bass = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 15);
      data[i] = (noise * 0.6 + bass * 0.4) * envelope * 0.5;
    }

    return buffer;
  }

  private createPlayerHitSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.5;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 6);
      const freq1 = Math.sin(2 * Math.PI * 150 * t);
      const freq2 = Math.sin(2 * Math.PI * 200 * t);
      const noise = (Math.random() - 0.5);
      data[i] = (freq1 * 0.4 + freq2 * 0.3 + noise * 0.3) * envelope * 0.4;
    }

    return buffer;
  }

  private createPowerupSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.3;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration);
      const frequency = 400 + t * 1500;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      data[i] += Math.sin(2 * Math.PI * frequency * 1.5 * t) * envelope * 0.15;
    }

    return buffer;
  }

  private createEnemyShootSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.15;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      const frequency = 300 - t * 1000;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25;
      data[i] += (Math.random() - 0.5) * envelope * 0.15;
    }

    return buffer;
  }

  private createWaveStartSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.6;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * (1 - t / duration);
      const note1 = t < 0.2 ? Math.sin(2 * Math.PI * 440 * t) : 0;
      const note2 = t >= 0.2 && t < 0.4 ? Math.sin(2 * Math.PI * 550 * t) : 0;
      const note3 = t >= 0.4 ? Math.sin(2 * Math.PI * 660 * t) : 0;
      data[i] = (note1 + note2 + note3) * envelope * 0.3;
    }

    return buffer;
  }

  private createGameOverSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 1.0;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2);
      const frequency = 400 - t * 200;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      data[i] += Math.sin(2 * Math.PI * frequency * 1.2 * t) * envelope * 0.15;
    }

    return buffer;
  }

  // Son cyber-explosion stylé pour la bombe
  private createCyberExplosionSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 1.5;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);
    const dataL = buffer.getChannelData(0);
    const dataR = buffer.getChannelData(1);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2);
      
      // Impact initial cyber (glitch)
      const glitch = t < 0.1 ? (Math.random() - 0.5) * Math.exp(-t * 50) * 2 : 0;
      
      // Bass massif
      const bass = Math.sin(2 * Math.PI * 30 * t) * Math.exp(-t * 3) * 0.8;
      
      // Sweep ascendant puis descendant (whoosh)
      const sweepFreq = t < 0.3 ? 100 + t * 2000 : 700 - (t - 0.3) * 500;
      const sweep = Math.sin(2 * Math.PI * sweepFreq * t) * Math.exp(-t * 4) * 0.4;
      
      // Harmoniques électriques
      const electric1 = Math.sin(2 * Math.PI * 150 * t * (1 + Math.sin(t * 50) * 0.1)) * Math.exp(-t * 5) * 0.3;
      const electric2 = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 6) * 0.2;
      
      // Bruit filtré (explosion)
      const noise = (Math.random() - 0.5) * Math.exp(-t * 4) * 0.5;
      
      // Résonance cyber
      const resonance = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 8) * Math.sin(t * 30) * 0.2;
      
      const sample = (glitch + bass + sweep + electric1 + electric2 + noise + resonance) * envelope;
      
      // Effet stéréo pour plus d'impact
      dataL[i] = sample * (1 + Math.sin(t * 20) * 0.1);
      dataR[i] = sample * (1 - Math.sin(t * 20) * 0.1);
    }

    return buffer;
  }

  // Son de mort du joueur stylé
  private createPlayerDeathSound(): AudioBuffer {
    const ctx = this.audioContext!;
    const duration = 0.8;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);
    const dataL = buffer.getChannelData(0);
    const dataR = buffer.getChannelData(1);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      
      // Descente de fréquence dramatique
      const dropFreq = 600 - t * 500;
      const drop = Math.sin(2 * Math.PI * dropFreq * t) * Math.exp(-t * 4) * 0.5;
      
      // Glitch/distorsion
      const glitch = t < 0.2 ? (Math.random() - 0.5) * Math.exp(-t * 15) * 0.6 : 0;
      
      // Impact sourd
      const impact = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 8) * 0.4;
      
      // Écho métallique
      const metal = Math.sin(2 * Math.PI * 400 * t * (1 + t * 2)) * Math.exp(-t * 6) * 0.3;
      
      // Bruit de désintégration
      const disintegrate = (Math.random() - 0.5) * Math.exp(-t * 5) * (1 - t / duration) * 0.4;
      
      const sample = drop + glitch + impact + metal + disintegrate;
      
      // Panoramique qui bouge
      const pan = Math.sin(t * 15) * 0.3;
      dataL[i] = sample * (1 - pan);
      dataR[i] = sample * (1 + pan);
    }

    return buffer;
  }

  private createElectroMusic(): AudioBuffer {
    const ctx = this.audioContext!;
    const bpm = 150;
    const beatsPerBar = 4;
    const barsCount = 8;
    const duration = (60 / bpm) * beatsPerBar * barsCount;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);
    const dataL = buffer.getChannelData(0);
    const dataR = buffer.getChannelData(1);

    const beatDuration = 60 / bpm;
    const sixteenthDuration = beatDuration / 4;

    const bassNotes = [110, 110, 110, 165, 110, 110, 147, 131];
    const leadNotes = [440, 523, 659, 523, 587, 659, 523, 440];
    const arpNotes = [220, 330, 440, 550, 440, 330, 220, 165];

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const beatIndex = Math.floor(t / beatDuration) % (beatsPerBar * barsCount);
      const barIndex = Math.floor(beatIndex / beatsPerBar);
      const beatInBar = beatIndex % beatsPerBar;
      const sixteenthIndex = Math.floor(t / sixteenthDuration) % 16;
      
      let sample = 0;

      // KICK DRUM
      const kickPhase = (t % beatDuration) / beatDuration;
      if (kickPhase < 0.1) {
        const kickEnv = Math.exp(-kickPhase * 50);
        const kickFreq = 60 - kickPhase * 200;
        sample += Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.5;
      }

      // HI-HAT
      const hihatPhase = (t % sixteenthDuration) / sixteenthDuration;
      if (hihatPhase < 0.05) {
        const hihatEnv = Math.exp(-hihatPhase * 100);
        sample += (Math.random() - 0.5) * hihatEnv * 0.15;
      }

      // SNARE
      if (beatInBar === 1 || beatInBar === 3) {
        const snarePhase = (t % beatDuration) / beatDuration;
        if (snarePhase < 0.15) {
          const snareEnv = Math.exp(-snarePhase * 30);
          sample += (Math.random() - 0.5) * snareEnv * 0.3;
          sample += Math.sin(2 * Math.PI * 180 * t) * snareEnv * 0.2;
        }
      }

      // BASS SYNTH
      const bassNote = bassNotes[barIndex % bassNotes.length];
      const bassPhase = (t % (beatDuration * 2));
      const bassEnv = Math.exp(-bassPhase * 3) * 0.3;
      const bassOsc = Math.sign(Math.sin(2 * Math.PI * bassNote * t));
      sample += bassOsc * bassEnv;

      // LEAD SYNTH
      if (sixteenthIndex % 2 === 0) {
        const leadNote = leadNotes[(sixteenthIndex / 2) % leadNotes.length];
        const leadPhase = (t % (sixteenthDuration * 2)) / (sixteenthDuration * 2);
        const leadEnv = Math.exp(-leadPhase * 8) * 0.2;
        const leadOsc = ((t * leadNote) % 1) * 2 - 1;
        sample += leadOsc * leadEnv;
      }

      // ARPEGGIATOR
      const arpPhase = (t % (sixteenthDuration / 2)) / (sixteenthDuration / 2);
      const arpIndex = Math.floor(t / (sixteenthDuration / 2)) % arpNotes.length;
      const arpNote = arpNotes[arpIndex];
      const arpEnv = Math.exp(-arpPhase * 15) * 0.12;
      sample += Math.sin(2 * Math.PI * arpNote * t) * arpEnv;
      sample += Math.sin(2 * Math.PI * arpNote * 2 * t) * arpEnv * 0.3;

      // SWEEP
      const sweepFreq = 200 + Math.sin(t * 0.5) * 150 + Math.sin(t * 2) * 50;
      sample += Math.sin(2 * Math.PI * sweepFreq * t) * 0.05;

      sample = Math.max(-1, Math.min(1, sample * 0.6));

      dataL[i] = sample + Math.sin(2 * Math.PI * 3 * t) * sample * 0.1;
      dataR[i] = sample - Math.sin(2 * Math.PI * 3 * t) * sample * 0.1;
    }

    return buffer;
  }

  play(soundName: string, volume: number = 1.0): void {
    if (!this.audioContext || !this.isInitialized || this.settings.muted) return;

    const buffer = this.soundBuffers.get(soundName);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    const finalVolume = volume * this.settings.sfxVolume * this.settings.masterVolume;
    gainNode.gain.value = finalVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
  }

  playShoot(): void {
    this.play('shoot', 0.6);
  }

  playExplosion(): void {
    this.play('explosion', 0.8);
  }

  playPlayerHit(): void {
    this.play('playerHit', 1.0);
  }

  playPowerup(): void {
    this.play('powerup', 0.9);
  }

  playEnemyShoot(): void {
    this.play('enemyShoot', 0.5);
  }

  playWaveStart(): void {
    this.play('waveStart', 0.7);
  }

  playGameOver(): void {
    this.play('gameOver', 1.0);
  }

  playBomb(): void {
    this.play('bomb', 1.0);
  }

  playPlayerDeath(): void {
    this.play('playerDeath', 1.0);
  }

  startMusic(): void {
    if (!this.audioContext || !this.isInitialized || this.isMusicPlaying) return;

    const buffer = this.soundBuffers.get('music');
    if (!buffer) return;

    this.musicSource = this.audioContext.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;

    this.musicGainNode = this.audioContext.createGain();
    const finalVolume = this.settings.musicVolume * this.settings.masterVolume;
    this.musicGainNode.gain.value = this.settings.muted ? 0 : finalVolume;

    this.musicSource.connect(this.musicGainNode);
    this.musicGainNode.connect(this.audioContext.destination);

    this.musicSource.start();
    this.musicStartTime = this.audioContext.currentTime;
    this.isMusicPlaying = true;
    this.musicPaused = false;
  }

  stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        // Ignore si déjà arrêté
      }
      this.musicSource = null;
    }
    this.isMusicPlaying = false;
    this.musicPaused = false;
  }

  pauseMusic(): void {
    if (this.musicGainNode && this.isMusicPlaying && !this.musicPaused) {
      // Fade out rapide
      this.musicGainNode.gain.value = 0;
      this.musicPaused = true;
    }
  }

  resumeMusic(): void {
    if (this.musicGainNode && this.isMusicPlaying && this.musicPaused) {
      const finalVolume = this.settings.musicVolume * this.settings.masterVolume;
      this.musicGainNode.gain.value = this.settings.muted ? 0 : finalVolume;
      this.musicPaused = false;
    }
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGainNode && !this.settings.muted && !this.musicPaused) {
      this.musicGainNode.gain.value = this.settings.musicVolume * this.settings.masterVolume;
    }
  }

  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    if (this.musicGainNode && !this.musicPaused) {
      this.musicGainNode.gain.value = muted ? 0 : this.settings.musicVolume * this.settings.masterVolume;
    }
  }

  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    if (this.musicGainNode && !this.musicPaused) {
      this.musicGainNode.gain.value = this.settings.muted ? 0 : this.settings.musicVolume * this.settings.masterVolume;
    }
    return this.settings.muted;
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  loadSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}
