// Audio Manager - Handles sound effects with placeholder support
import { CONFIG } from './config.js';

export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.enabled = CONFIG.audio.enabled;
        this.volume = CONFIG.audio.volume;
        this.loadingSounds = new Set();
        this.failedSounds = new Set();
        
        // Initialize audio context for better browser compatibility
        this.audioContext = null;
        this.initializeAudioContext();
        
        // Load all sound files
        this.loadSounds();
    }
    
    initializeAudioContext() {
        try {
            // Create audio context for better control
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
            }
        } catch (error) {
            console.warn('AudioContext not supported:', error);
        }
    }
    
    loadSounds() {
        const soundFiles = CONFIG.assets.sounds;
        
        Object.entries(soundFiles).forEach(([name, path]) => {
            this.loadSound(name, path);
        });
    }
    
    loadSound(name, path) {
        if (this.sounds.has(name) || this.loadingSounds.has(name)) {
            return;
        }
        
        this.loadingSounds.add(name);
        
        const audio = new Audio();
        
        // Set up event listeners
        audio.addEventListener('canplaythrough', () => {
            this.sounds.set(name, audio);
            this.loadingSounds.delete(name);
            console.log(`Sound loaded: ${name}`);
        });
        
        audio.addEventListener('error', (error) => {
            console.warn(`Failed to load sound: ${name} from ${path}`, error);
            this.loadingSounds.delete(name);
            this.failedSounds.add(name);
        });
        
        // Configure audio properties
        audio.volume = this.volume;
        audio.preload = 'auto';
        
        // Start loading
        audio.src = path;
        audio.load();
    }
    
    playSfx(soundName, options = {}) {
        if (!this.enabled) {
            return;
        }
        
        // Check if sound exists
        if (!this.sounds.has(soundName)) {
            if (!this.failedSounds.has(soundName) && !this.loadingSounds.has(soundName)) {
                console.warn(`Sound not found: ${soundName}`);
            }
            return;
        }
        
        try {
            const audio = this.sounds.get(soundName);
            
            // Clone the audio for overlapping sounds
            const audioClone = audio.cloneNode();
            
            // Apply options
            audioClone.volume = (options.volume !== undefined ? options.volume : 1.0) * this.volume;
            audioClone.playbackRate = options.pitch || 1.0;
            
            // Play the sound
            const playPromise = audioClone.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Handle autoplay policy restrictions
                    if (error.name === 'NotAllowedError') {
                        console.warn('Audio play blocked by browser policy. User interaction required.');
                    } else {
                        console.warn(`Error playing sound ${soundName}:`, error);
                    }
                });
            }
            
            // Clean up after playing
            audioClone.addEventListener('ended', () => {
                audioClone.remove();
            });
            
        } catch (error) {
            console.warn(`Error playing sound ${soundName}:`, error);
        }
    }
    
    // Specific sound effect methods for game events
    playShoot() {
        this.playSfx('shoot', { volume: 0.3 });
    }
    
    playHit() {
        this.playSfx('hit', { volume: 0.5 });
    }
    
    playDeath() {
        this.playSfx('death', { volume: 0.7 });
    }
    
    playSpawn() {
        this.playSfx('spawn', { volume: 0.4 });
    }
    
    playPickup() {
        this.playSfx('pickup', { volume: 0.5 });
    }
    
    playGameOver() {
        this.playSfx('game_over', { volume: 0.8 });
    }
    
    // Volume control
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update all loaded sounds
        this.sounds.forEach(audio => {
            audio.volume = this.volume;
        });
    }
    
    getVolume() {
        return this.volume;
    }
    
    // Enable/disable audio
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            // Stop all currently playing sounds
            this.stopAll();
        }
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    // Stop all sounds
    stopAll() {
        this.sounds.forEach(audio => {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }
    
    // Get loading status
    getLoadingStatus() {
        const total = Object.keys(CONFIG.assets.sounds).length;
        const loaded = this.sounds.size;
        const failed = this.failedSounds.size;
        const loading = this.loadingSounds.size;
        
        return {
            total,
            loaded,
            failed,
            loading,
            isComplete: loading === 0,
            successRate: total > 0 ? loaded / total : 1
        };
    }
    
    // Debug information
    getDebugInfo() {
        const status = this.getLoadingStatus();
        return {
            enabled: this.enabled,
            volume: this.volume,
            audioContext: !!this.audioContext,
            ...status,
            loadedSounds: Array.from(this.sounds.keys()),
            failedSounds: Array.from(this.failedSounds),
            loadingSounds: Array.from(this.loadingSounds)
        };
    }
    
    // Handle user interaction for autoplay policy
    handleUserInteraction() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed');
            }).catch(error => {
                console.warn('Failed to resume audio context:', error);
            });
        }
    }
    
    // Preload critical sounds
    preloadCriticalSounds() {
        const criticalSounds = ['shoot', 'hit', 'death'];
        
        criticalSounds.forEach(soundName => {
            if (this.sounds.has(soundName)) {
                const audio = this.sounds.get(soundName);
                // Trigger a very quiet play to preload
                const originalVolume = audio.volume;
                audio.volume = 0.001;
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = originalVolume;
                    }).catch(() => {
                        audio.volume = originalVolume;
                    });
                }
            }
        });
    }
}

// Create a global audio manager instance
export const audioManager = new AudioManager();