import { Audio } from 'expo-av';
import { Platform } from 'react-native';

class AudioManager {
  private static instance: AudioManager;
  private sounds: { [key: string]: Audio.Sound } = {};
  private isEnabled = true;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async initialize() {
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
      
      // Create button click sounds
      await this.createButtonSounds();
    } catch (error) {
      console.warn('Audio initialization failed (non-critical):', error);
      // Set audio as disabled if initialization fails
      this.isEnabled = false;
    }
  }

  private async createButtonSounds() {
    try {
      // Create different sounds for different actions
      const buttonClickSound = await this.createBeepSound(800, 0.1); // High beep
      const addToCartSound = await this.createBeepSound(600, 0.15); // Medium beep
      const orderCompleteSound = await this.createBeepSound(400, 0.2); // Low beep
      const errorSound = await this.createBeepSound(200, 0.3); // Error beep

      this.sounds = {
        buttonClick: buttonClickSound,
        addToCart: addToCartSound,
        orderComplete: orderCompleteSound,
        error: errorSound,
      };
    } catch (error) {
      console.warn('Failed to create button sounds:', error);
    }
  }

  private async createBeepSound(frequency: number, duration: number): Promise<Audio.Sound> {
    if (Platform.OS === 'web') {
      // For web, we'll use Web Audio API
      return {
        playAsync: async () => {
          if (typeof window !== 'undefined' && window.AudioContext) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
          }
        },
        unloadAsync: async () => {},
      } as any;
    } else {
      // For native platforms, create a simple sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuR2O/AciMFl` },
        { shouldPlay: false }
      );
      return sound;
    }
  }

  async playSound(soundType: 'buttonClick' | 'addToCart' | 'orderComplete' | 'error') {
    if (!this.isEnabled) {
      console.log('Audio disabled, skipping sound:', soundType);
      return;
    }

    try {
      const sound = this.sounds[soundType];
      if (sound) {
        await sound.playAsync();
      } else {
        console.warn('Sound not found:', soundType);
      }
    } catch (error) {
      console.warn('Failed to play sound (non-critical):', soundType, error);
      // Don't throw error, just log it
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async cleanup() {
    try {
      for (const sound of Object.values(this.sounds)) {
        await sound.unloadAsync();
      }
      this.sounds = {};
    } catch (error) {
      console.warn('Failed to cleanup sounds:', error);
    }
  }
}

export const audioManager = AudioManager.getInstance();

// Convenience functions
export const playButtonClick = () => audioManager.playSound('buttonClick');
export const playAddToCart = () => audioManager.playSound('addToCart');
export const playOrderComplete = () => audioManager.playSound('orderComplete');
export const playError = () => audioManager.playSound('error');