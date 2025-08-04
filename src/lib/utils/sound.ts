/**
 * 音声通知ユーティリティ
 */

let audioContext: AudioContext | null = null

// Initialize audio context on user interaction
export const initializeAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    // Resume the context in case it's suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
  }
  return audioContext
}

export const playSound = (type: 'success' | 'failure' | 'notification') => {
  try {
    // Initialize or get existing audio context
    const ctx = initializeAudioContext()
    if (!ctx) return
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playSoundInternal(ctx, type)
      })
    } else {
      playSoundInternal(ctx, type)
    }
  } catch (error) {
    console.warn('Failed to play sound:', error)
  }
}

const playSoundInternal = (audioContext: AudioContext, type: 'success' | 'failure' | 'notification') => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // 音の種類に応じて周波数と音のパターンを設定
  switch (type) {
    case 'success':
      // 成功音: 明るい上昇音
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime) // C5
      oscillator.frequency.exponentialRampToValueAtTime(659, audioContext.currentTime + 0.1) // E5
      oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.2) // G5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
      break

    case 'failure':
      // 失敗音: 低い下降音
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // A4
      oscillator.frequency.exponentialRampToValueAtTime(330, audioContext.currentTime + 0.1) // E4
      oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2) // A3
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
      break

    case 'notification':
      // 通知音: シンプルなビープ音
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      
      // 2回目のビープ
      setTimeout(() => {
        const ctx = initializeAudioContext()
        if (!ctx) return
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.setValueAtTime(880, ctx.currentTime)
        gain2.gain.setValueAtTime(0.2, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc2.start(ctx.currentTime)
        osc2.stop(ctx.currentTime + 0.1)
      }, 150)
      break
  }
}

export const getNotificationSettings = () => {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('notification-settings')
  if (!stored) {
    return {
      soundEnabled: true,
      notifyOnSuccess: false,
      notifyOnFailure: true,
    }
  }
  
  try {
    return JSON.parse(stored)
  } catch {
    return {
      soundEnabled: true,
      notifyOnSuccess: false,
      notifyOnFailure: true,
    }
  }
}

export const saveNotificationSettings = (settings: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('notification-settings', JSON.stringify(settings))
  }
}

export const playTestCompletionSound = (success: boolean) => {
  const settings = getNotificationSettings()
  
  if (!settings?.soundEnabled) return
  
  // Play sound when enabled, regardless of success/failure notification settings
  if (success) {
    playSound('success')
  } else {
    playSound('failure')
  }
}