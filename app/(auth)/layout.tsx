'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

// Safe hex alpha: clamps 0-1 float → 2-char hex string
const toHex2 = (alpha: number) =>
  Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16).padStart(2, '0')

export default function AuthLayout({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    // Particles: data packets flowing on circuit paths
    interface Particle {
      x: number; y: number
      vx: number; vy: number
      size: number; alpha: number
      color: string; life: number; maxLife: number
    }
    const particles: Particle[] = []
    const colors = ['#00d4ff', '#7c3aed', '#ec4899', '#06b6d4', '#8b5cf6']

    const spawnParticle = () => {
      const edge = Math.floor(Math.random() * 4)
      let x = 0, y = 0
      if (edge === 0) { x = Math.random() * w; y = 0 }
      else if (edge === 1) { x = w; y = Math.random() * h }
      else if (edge === 2) { x = Math.random() * w; y = h }
      else { x = 0; y = Math.random() * h }
      const angle = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() - 0.5) * 1.5
      const speed = 0.5 + Math.random() * 1.5
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 2,
        alpha: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 120 + Math.random() * 180,
      })
    }

    // Node grid points
    const nodeSpacing = 80
    interface Node { x: number; y: number; pulse: number; pulseSpeed: number }
    let nodes: Node[] = []
    const buildNodes = () => {
      nodes = []
      for (let x = nodeSpacing; x < w; x += nodeSpacing) {
        for (let y = nodeSpacing; y < h; y += nodeSpacing) {
          if (Math.random() > 0.6) {
            nodes.push({ x, y, pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.02 + Math.random() * 0.03 })
          }
        }
      }
    }
    buildNodes()
    window.addEventListener('resize', buildNodes)

    let tick = 0
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      tick++

      // Spawn particles periodically
      if (tick % 8 === 0) spawnParticle()

      // Draw node connections
      ctx.lineWidth = 0.4
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < nodeSpacing * 1.5) {
            const alpha = (1 - dist / (nodeSpacing * 1.5)) * 0.15
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        node.pulse += node.pulseSpeed
        const alpha = 0.1 + Math.sin(node.pulse) * 0.08
        const r = 1.5 + Math.sin(node.pulse) * 0.5
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${alpha})`
        ctx.fill()
      }

      // Draw + update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.alpha = p.life < 20 ? p.life / 20 : p.life > p.maxLife - 20 ? (p.maxLife - p.life) / 20 : 0.8

        // Tail
        const gradient = ctx.createLinearGradient(
          p.x - p.vx * 8, p.y - p.vy * 8,
          p.x, p.y
        )
        gradient.addColorStop(0, `${p.color}00`)
        gradient.addColorStop(1, `${p.color}${toHex2(p.alpha)}`)
        ctx.beginPath()
        ctx.moveTo(p.x - p.vx * 8, p.y - p.vy * 8)
        ctx.lineTo(p.x, p.y)
        ctx.strokeStyle = gradient
        ctx.lineWidth = p.size
        ctx.stroke()

        // Dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${toHex2(p.alpha)}`
        ctx.fill()

        if (p.life >= p.maxLife) particles.splice(i, 1)
      }

      animFrame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', buildNodes)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050810]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        :root {
          --cyan: #00d4ff;
          --violet: #7c3aed;
          --pink: #ec4899;
          --slate-glow: rgba(99,102,241,0.15);
        }

        /* Scanline effect */
        .scanlines::before {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
          z-index: 1;
        }

        /* Vignette */
        .vignette::after {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(5,8,16,0.8) 100%);
          pointer-events: none;
          z-index: 1;
        }

        @keyframes card-appear {
          from { opacity: 0; transform: translateY(32px) scale(0.97); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) scale(1);    filter: blur(0); }
        }
        .card-appear { animation: card-appear 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes hud-line {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }

        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        @keyframes orb-float-a {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(60px, -40px) scale(1.1); }
          66%     { transform: translate(-30px, 30px) scale(0.95); }
        }
        @keyframes orb-float-b {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(-50px, 30px) scale(1.05); }
          66%     { transform: translate(40px,-50px) scale(0.9); }
        }

        @keyframes corner-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes data-stream {
          0%   { opacity: 0; transform: translateY(-10px); }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(10px); }
        }

        .sys-font { font-family: 'JetBrains Mono', monospace; }
        .hud-font  { font-family: 'Rajdhani', sans-serif; }

        @keyframes progress-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .animate-progress { animation: progress-bar 3s ease-in-out infinite; }

        @keyframes status-blink {
          0%,100% { background: #10b981; box-shadow: 0 0 6px #10b981; }
          50%     { background: #6ee7b7; box-shadow: 0 0 12px #10b981, 0 0 24px #10b981; }
        }
        .status-dot { animation: status-blink 2s ease-in-out infinite; }

        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slide-up-fade 0.5s ease-out both; }
        .delay-1  { animation-delay: 0.1s; }
        .delay-2  { animation-delay: 0.2s; }
        .delay-3  { animation-delay: 0.3s; }
        .delay-4  { animation-delay: 0.4s; }

        /* HUD corner brackets */
        .hud-corner {
          position: absolute;
          width: 16px; height: 16px;
          pointer-events: none;
        }
        .hud-corner::before, .hud-corner::after {
          content: '';
          position: absolute;
          background: #00d4ff;
        }
        .hud-corner::before { width: 2px; height: 100%; }
        .hud-corner::after  { width: 100%; height: 2px; }
        .hud-tl { top: -1px; left: -1px; }
        .hud-tl::before { top: 0; left: 0; }
        .hud-tl::after  { top: 0; left: 0; }
        .hud-tr { top: -1px; right: -1px; transform: scaleX(-1); }
        .hud-tr::before { top: 0; left: 0; }
        .hud-tr::after  { top: 0; left: 0; }
        .hud-bl { bottom: -1px; left: -1px; transform: scaleY(-1); }
        .hud-bl::before { top: 0; left: 0; }
        .hud-bl::after  { top: 0; left: 0; }
        .hud-br { bottom: -1px; right: -1px; transform: scale(-1); }
        .hud-br::before { top: 0; left: 0; }
        .hud-br::after  { top: 0; left: 0; }

        /* Glassmorphism card */
        .glass-card {
          background: linear-gradient(135deg,
            rgba(15,20,40,0.92) 0%,
            rgba(10,15,35,0.88) 50%,
            rgba(15,20,40,0.95) 100%
          );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(99,102,241,0.2);
        }

        .glass-card:hover {
          border-color: rgba(99,102,241,0.4);
        }

        /* Input custom */
        .sys-input {
          background: rgba(15,20,40,0.7) !important;
          border: 1px solid rgba(99,102,241,0.25) !important;
          color: #e2e8f0 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px !important;
          transition: all 0.2s ease !important;
        }
        .sys-input:focus {
          border-color: #00d4ff !important;
          background: rgba(0,212,255,0.05) !important;
          box-shadow: 0 0 0 1px rgba(0,212,255,0.2), 0 0 20px rgba(0,212,255,0.1) !important;
          outline: none !important;
        }
        .sys-input::placeholder { color: rgba(148,163,184,0.4) !important; }

        /* Submit button */
        .sys-btn {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
          border: 1px solid rgba(124,58,237,0.5);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .sys-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #7c3aed, #ec4899, #00d4ff);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .sys-btn:hover::before { opacity: 1; }
        .sys-btn:hover {
          box-shadow: 0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(124,58,237,0.2);
          transform: translateY(-1px);
        }
        .sys-btn span { position: relative; z-index: 1; }
        .sys-btn:disabled { opacity: 0.5; transform: none; }

        /* Label */
        .sys-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.7);
        }

        .error-msg {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #f87171;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>

      {/* Canvas particle system */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60" />

      {/* Background image with dark overlay */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: 'url(/auth-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#050810] via-[#080d1f]/80 to-[#050810]" />
      </div>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
            animation: 'orb-float-a 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
            animation: 'orb-float-b 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
            animation: 'orb-float-a 22s ease-in-out infinite 3s',
          }}
        />
      </div>

      {/* Scanlines + vignette */}
      <div className="scanlines vignette fixed inset-0 pointer-events-none z-20" />

      {/* Top HUD bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 border-b border-[rgba(99,102,241,0.1)] bg-[rgba(5,8,16,0.6)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="status-dot w-2 h-2 rounded-full" />
          <span className="sys-font text-[10px] text-cyan-400/60 tracking-widest">SYS:ONLINE</span>
        </div>
        <div className="sys-font text-[10px] text-slate-500 tracking-widest hidden sm:block">
          REDSYS INFRASTRUCTURE PLATFORM v2.4.1
        </div>
        <div className="sys-font text-[10px] text-slate-500 tracking-[0.2em]">
          {clock}
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
        <div className="w-full max-w-md card-appear">
          {children}
        </div>
      </main>

      {/* Bottom HUD bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-2 border-t border-[rgba(99,102,241,0.1)] bg-[rgba(5,8,16,0.6)] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex gap-1 items-center">
            <span className="sys-font text-[9px] text-slate-600">CPU</span>
            <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden">
              <div className="h-full bg-violet-500/60 animate-progress rounded" />
            </div>
          </div>
          <div className="flex gap-1 items-center hidden sm:flex">
            <span className="sys-font text-[9px] text-slate-600">NET</span>
            <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden">
              <div className="h-full bg-cyan-500/60 rounded" style={{ width: '72%' }} />
            </div>
          </div>
        </div>
        <div className="sys-font text-[9px] text-slate-600 tracking-widest">
          TLS 1.3 · AES-256-GCM · SECURED
        </div>
      </div>
    </div>
  )
}