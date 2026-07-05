'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

export function NotificationManager() {
  // ✅ useAuth au lieu d'un fetch séparé — isAdmin déjà résolu par AuthContext
  const { isAdmin, loading } = useAuth()
  const audioUnlockedRef = useRef(false)
  const lastCheckedRef = useRef<string>(new Date().toISOString())

  // Débloquer l'audio au premier clic utilisateur
  useEffect(() => {
    const initAudio = () => {
      if (audioUnlockedRef.current) return
      audioUnlockedRef.current = true
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        if (ctx.state === 'suspended') ctx.resume()
        console.log('🔊 Audio débloqué')
      } catch {}
    }
    document.addEventListener('click', initAudio, { once: true })
    document.addEventListener('touchstart', initAudio, { once: true })
    return () => {
      document.removeEventListener('click', initAudio)
      document.removeEventListener('touchstart', initAudio)
    }
  }, [])

  // Polling — démarre uniquement quand AuthContext a fini de charger et confirme admin
  useEffect(() => {
    // ✅ Attendre la fin du chargement auth avant de décider
    if (loading) return
    if (!isAdmin) {
      console.log('👤 Non-admin, polling désactivé')
      return
    }

    console.log('🔄 Démarrage du polling notifications (admin)')

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const playSound = async () => {
      try {
        const audio = new Audio('/sounds/stock-alert.mp3')
        audio.volume = 0.5
        await audio.play()
        console.log('🔊 Son MP3 joué')
        return
      } catch {}

      // Fallback oscillateur Web Audio API
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        if (ctx.state === 'suspended') await ctx.resume()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.8)
        console.log('🔊 Son oscillateur joué')
      } catch (e) {
        console.warn('⚠️ Impossible de jouer le son', e)
      }
    }

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/notifications?since=${lastCheckedRef.current}&limit=10`,
        )
        if (!res.ok) return

        const data = await res.json()

        if (data.timestamp) {
          lastCheckedRef.current = data.timestamp
        }

        console.log(
          `[POLL] hasStockAlerts=${data.hasStockAlerts} notifications=${data.notifications?.length ?? 0}`,
        )

        if (data.hasStockAlerts && data.notifications?.length > 0) {
          console.log('🔔 Alerte stock détectée → lecture son')
          await playSound()

          if ('Notification' in window && Notification.permission === 'granted') {
            const stockAlerts = data.notifications.filter(
              (n: any) => n.type === 'STOCK_ALERT',
            )
            if (stockAlerts.length > 0) {
              new Notification('⚠️ Alerte Stock', {
                body: `${stockAlerts.length} nouvelle(s) alerte(s) stock`,
                icon: '/icons/alert-icon.png',
              })
            }
          }
        }
      } catch (error) {
        console.error('Erreur polling notifications:', error)
      }
    }

    const interval = setInterval(poll, 10000)
    return () => {
      console.log('🛑 Arrêt du polling')
      clearInterval(interval)
    }
  }, [isAdmin, loading]) // ✅ loading dans les deps pour relancer quand auth est prêt
  
  return null
}