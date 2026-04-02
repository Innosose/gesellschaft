/**
 * Theme System
 *
 * To add a new theme:
 * 1. Add a new ThemePreset entry to THEME_PRESETS array
 * 2. Choose unique: id, name, primary/accent colors, fg/danger/success/warning
 * 3. Set visual style: ornament, clock, particle, shape
 * 4. Set animations: openAnim, hubOpenAnim (keyframes in globals.css)
 * 5. Set fonts: titleFont, bodyFont (add to Google Fonts import in globals.css)
 *
 * CSS variables auto-updated: --theme-primary, --theme-accent, --theme-fg,
 * --theme-danger, --theme-body-font, --win-bg, --win-surface, --win-text, etc.
 *
 * 디자인 토큰 — 전체 앱 색상·크기·간격·스타일을 테마별로 관리
 */

import { useSyncExternalStore } from 'react'

export { rgba } from './color'
import { rgba } from './color'

// ─── Particle types ──────────────────────────
export type ParticleShape = 'petal' | 'ember' | 'sparkle' | 'snow' | 'leaf' | 'dust' | 'bubble' | 'ash'

// ─── Card ornament style ─────────────────────
export type OrnamentStyle = 'book' | 'crack' | 'vine' | 'frost' | 'gem' | 'minimal' | 'flame' | 'wave'

// ─── Hub clock style ─────────────────────────
export type ClockStyle = 'antique' | 'infernal' | 'crystal' | 'frost' | 'nature' | 'elegant' | 'digital' | 'solar'

// ─── Shape variants ──────────────────────────
export interface ShapeConfig {
  borderRadius: string           // CSS border-radius for card/hub
  clipPath?: string              // CSS clip-path (optional, for non-rectangular)
  aspectRatio: number            // w/h ratio for cards (0.72 = portrait book, 1 = square)
  hubBorderRadius: string        // hub button border-radius
}

// ─── Theme Preset ────────────────────────────
export interface ThemePreset {
  id: string
  name: string
  primary: string
  accent: string
  // Surfaces & atmosphere
  bg: string                     // base background color
  surface: string                // card inner page bg
  coverGradient: string          // card cover CSS gradient
  hubBg: string                  // hub button background (closed)
  hubBgOpen: string              // hub button background (open/expanded)
  blurStrength: number           // backdrop blur px (16-48)
  brightness: number             // backdrop brightness (0.3-0.8)
  // Backdrop
  backdropGradient: string
  // Particles
  particle: ParticleShape
  particleColor: string
  particleCount: number
  // Card ornament
  ornament: OrnamentStyle
  // Hub
  clock: ClockStyle
  hubGlow: string
  // Shape
  shape: ShapeConfig
  // Animation
  openAnim: string       // card reveal CSS animation name
  openDuration: number   // ms
  openEasing: string     // CSS easing
  hubOpenAnim: string    // hub transition to open position
  // Font
  titleFont: string
  bodyFont: string
  // Foreground / utility
  fg: string            // base foreground/text hex color
  danger: string        // danger/error hex color
  success: string       // success/green hex color
  warning: string       // warning/yellow hex color
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ruina', name: 'Library of Ruina',
    primary: '#c9a84c', accent: '#4de8c2',
    bg: '#0a0804', surface: '#1c1810',
    coverGradient: 'linear-gradient(175deg, #1e1a10 0%, #14110a 40%, #0e0c06 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #1e1910 0%, #0c0a06 55%, #080704 100%)',
    hubBgOpen: '#0c0b08',
    blurStrength: 32, brightness: 0.7,
    backdropGradient: [
      'radial-gradient(ellipse 70% 35% at 50% -3%, rgba(201,168,76,0.12) 0%, transparent 60%)',
      'radial-gradient(ellipse 28% 100% at 0% 50%, rgba(0,0,0,0.55) 0%, transparent 55%)',
      'radial-gradient(ellipse 28% 100% at 100% 50%, rgba(0,0,0,0.55) 0%, transparent 55%)',
      'repeating-linear-gradient(180deg, transparent 0px, transparent 72px, rgba(40,30,15,0.6) 72px, rgba(25,18,8,0.8) 76px, transparent 78px)',
      'linear-gradient(175deg, #14110a 0%, #0e0c07 40%, #0a0804 100%)',
    ].join(','),
    particle: 'petal', particleColor: 'rgba(230,220,190,0.4)', particleCount: 10,
    ornament: 'book', clock: 'antique',
    hubGlow: '0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.15)',
    shape: { borderRadius: '3px 5px 5px 3px', aspectRatio: 0.72, hubBorderRadius: '50%' },
    openAnim: 'cardFlipIn', openDuration: 500, openEasing: 'cubic-bezier(0.4,0,0.2,1)',
    hubOpenAnim: 'hubRise',
    titleFont: "'Cinzel Decorative', Georgia, serif",
    bodyFont: "'Noto Serif KR', 'Pretendard', Georgia, serif",
    fg: '#e6e0d2', danger: '#e06060', success: '#4dba6a', warning: '#e0a060',
  },
  {
    id: 'crimson', name: 'Crimson Night',
    primary: '#c45050', accent: '#f0a050',
    bg: '#0a0404', surface: '#1c100c',
    coverGradient: 'linear-gradient(175deg, #201010 0%, #160a0a 40%, #0e0606 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #201008 0%, #120604 55%, #0a0404 100%)',
    hubBgOpen: '#100808',
    blurStrength: 28, brightness: 0.6,
    backdropGradient: [
      'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(196,80,80,0.15) 0%, transparent 55%)',
      'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(196,80,80,0.05) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.65) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.65) 0%, transparent 50%)',
      'repeating-linear-gradient(175deg, transparent 0px, transparent 90px, rgba(80,20,20,0.2) 90px, rgba(60,15,15,0.1) 92px, transparent 93px)',
      'linear-gradient(170deg, #150808 0%, #0e0606 40%, #0a0404 100%)',
    ].join(','),
    particle: 'ember', particleColor: 'rgba(240,120,60,0.6)', particleCount: 14,
    ornament: 'crack', clock: 'infernal',
    hubGlow: '0 0 70px rgba(196,80,80,0.4), 0 0 140px rgba(240,160,80,0.15)',
    shape: { borderRadius: '4px', clipPath: 'polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)', aspectRatio: 0.85, hubBorderRadius: '12%' },
    openAnim: 'cardShatter', openDuration: 600, openEasing: 'cubic-bezier(0.6,0,0.2,1)',
    hubOpenAnim: 'hubBurst',
    titleFont: "'Playfair Display', 'Nanum Myeongjo', Georgia, serif",
    bodyFont: "'Pretendard', 'Segoe UI', system-ui, sans-serif",
    fg: '#e0d0c8', danger: '#e06060', success: '#e08040', warning: '#f0a050',
  },
  {
    id: 'violet', name: 'Violet Dream',
    primary: '#9070c0', accent: '#c4a0f0',
    bg: '#06040a', surface: '#16101e',
    coverGradient: 'linear-gradient(175deg, #1a1226 0%, #120c1a 40%, #0a0610 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #1a1228 0%, #0e0816 55%, #06040a 100%)',
    hubBgOpen: '#0a0810',
    blurStrength: 36, brightness: 0.65,
    backdropGradient: [
      'radial-gradient(ellipse 60% 35% at 50% -5%, rgba(144,112,192,0.15) 0%, transparent 55%)',
      'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(196,160,240,0.04) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.55) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.55) 0%, transparent 50%)',
      'repeating-linear-gradient(165deg, transparent 0px, transparent 100px, rgba(80,50,120,0.12) 100px, transparent 101px)',
      'linear-gradient(175deg, #0e0a14 0%, #0a0810 40%, #06040a 100%)',
    ].join(','),
    particle: 'sparkle', particleColor: 'rgba(196,160,240,0.5)', particleCount: 16,
    ornament: 'gem', clock: 'crystal',
    hubGlow: '0 0 70px rgba(144,112,192,0.35), 0 0 140px rgba(196,160,240,0.15)',
    shape: { borderRadius: '6px', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', aspectRatio: 0.87, hubBorderRadius: '30%' },
    openAnim: 'cardFadeScale', openDuration: 450, openEasing: 'cubic-bezier(0.25,1,0.5,1)',
    hubOpenAnim: 'hubFloat',
    titleFont: "'Cormorant Garamond', 'Nanum Myeongjo', Georgia, serif",
    bodyFont: "'Nanum Myeongjo', 'Pretendard', Georgia, serif",
    fg: '#dcd0e6', danger: '#d06080', success: '#a080e0', warning: '#c4a0f0',
  },
  {
    id: 'arctic', name: 'Arctic Blue',
    primary: '#5090c0', accent: '#80d0f0',
    bg: '#040608', surface: '#0e1620',
    coverGradient: 'linear-gradient(175deg, #101a24 0%, #0a1018 40%, #060a10 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #101a28 0%, #081018 55%, #040810 100%)',
    hubBgOpen: '#080c12',
    blurStrength: 40, brightness: 0.6,
    backdropGradient: [
      'radial-gradient(ellipse 60% 35% at 50% -5%, rgba(80,144,192,0.15) 0%, transparent 55%)',
      'radial-gradient(ellipse 80% 30% at 50% 105%, rgba(80,144,192,0.06) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.6) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.6) 0%, transparent 50%)',
      'repeating-linear-gradient(180deg, transparent 0px, transparent 80px, rgba(40,60,80,0.15) 80px, rgba(30,45,60,0.08) 82px, transparent 83px)',
      'linear-gradient(175deg, #080c10 0%, #060a0e 40%, #040608 100%)',
    ].join(','),
    particle: 'snow', particleColor: 'rgba(200,230,255,0.55)', particleCount: 18,
    ornament: 'frost', clock: 'frost',
    hubGlow: '0 0 70px rgba(80,144,192,0.35), 0 0 140px rgba(128,208,240,0.15)',
    shape: { borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%', aspectRatio: 0.8, hubBorderRadius: '50% 50% 50% 50% / 42% 42% 58% 58%' },
    openAnim: 'cardDrop', openDuration: 550, openEasing: 'cubic-bezier(0.34,1.56,0.64,1)',
    hubOpenAnim: 'hubCrystalize',
    titleFont: "'Raleway', 'Pretendard', 'Segoe UI', sans-serif",
    bodyFont: "'Pretendard', 'Segoe UI Variable', system-ui, sans-serif",
    fg: '#d0dce6', danger: '#d06070', success: '#60c0d0', warning: '#80d0f0',
  },
  {
    id: 'emerald', name: 'Emerald Forest',
    primary: '#50a060', accent: '#a0e0a0',
    bg: '#040804', surface: '#101c10',
    coverGradient: 'linear-gradient(175deg, #142014 0%, #0c160c 40%, #060e06 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #142218 0%, #0a140c 55%, #040a04 100%)',
    hubBgOpen: '#081008',
    blurStrength: 28, brightness: 0.7,
    backdropGradient: [
      'radial-gradient(ellipse 60% 35% at 50% -5%, rgba(80,160,96,0.12) 0%, transparent 55%)',
      'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(80,160,96,0.08) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.55) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.55) 0%, transparent 50%)',
      'repeating-linear-gradient(92deg, transparent 0px, transparent 35px, rgba(40,80,40,0.08) 35px, transparent 36px)',
      'linear-gradient(175deg, #0a100a 0%, #080c08 40%, #040804 100%)',
    ].join(','),
    particle: 'leaf', particleColor: 'rgba(140,200,120,0.45)', particleCount: 10,
    ornament: 'vine', clock: 'nature',
    hubGlow: '0 0 60px rgba(80,160,96,0.35), 0 0 120px rgba(160,224,160,0.15)',
    shape: { borderRadius: '40% 40% 30% 30%', aspectRatio: 0.78, hubBorderRadius: '45%' },
    openAnim: 'cardGrow', openDuration: 600, openEasing: 'cubic-bezier(0.22,1,0.36,1)',
    hubOpenAnim: 'hubBloom',
    titleFont: "'Merriweather', 'Nanum Myeongjo', Georgia, serif",
    bodyFont: "'Nanum Gothic', 'Pretendard', system-ui, sans-serif",
    fg: '#d4e0d4', danger: '#d06060', success: '#60c060', warning: '#a0c060',
  },
  {
    id: 'rose', name: 'Rose Quartz',
    primary: '#c07088', accent: '#f0b0c0',
    bg: '#0a0406', surface: '#1c1014',
    coverGradient: 'linear-gradient(175deg, #201418 0%, #160c10 40%, #0e0608 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #201418 0%, #120a0e 55%, #0a0608 100%)',
    hubBgOpen: '#0e080a',
    blurStrength: 32, brightness: 0.65,
    backdropGradient: [
      'radial-gradient(ellipse 60% 35% at 50% -5%, rgba(192,112,136,0.14) 0%, transparent 55%)',
      'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(240,176,192,0.04) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.5) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.5) 0%, transparent 50%)',
      'linear-gradient(175deg, #14080c 0%, #0e060a 40%, #0a0406 100%)',
    ].join(','),
    particle: 'petal', particleColor: 'rgba(240,180,200,0.45)', particleCount: 14,
    ornament: 'gem', clock: 'elegant',
    hubGlow: '0 0 70px rgba(192,112,136,0.35), 0 0 140px rgba(240,176,192,0.15)',
    shape: { borderRadius: '50%', aspectRatio: 1, hubBorderRadius: '50%' },
    openAnim: 'cardSpin', openDuration: 500, openEasing: 'cubic-bezier(0.25,1,0.5,1)',
    hubOpenAnim: 'hubPulse',
    titleFont: "'Playfair Display', 'Noto Serif KR', Georgia, serif",
    bodyFont: "'Noto Serif KR', 'Pretendard', Georgia, serif",
    fg: '#e0d0d8', danger: '#d06060', success: '#c080a0', warning: '#e0a0b0',
  },
  {
    id: 'mono', name: 'Monochrome',
    primary: '#909090', accent: '#d0d0d0',
    bg: '#060606', surface: '#141414',
    coverGradient: 'linear-gradient(175deg, #1a1a1a 0%, #111111 40%, #0a0a0a 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #181818 0%, #0e0e0e 55%, #080808 100%)',
    hubBgOpen: '#0a0a0a',
    blurStrength: 24, brightness: 0.5,
    backdropGradient: [
      'radial-gradient(ellipse 60% 35% at 50% -5%, rgba(144,144,144,0.08) 0%, transparent 55%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.5) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.5) 0%, transparent 50%)',
      'repeating-linear-gradient(90deg, transparent 0px, transparent 60px, rgba(128,128,128,0.04) 60px, transparent 61px)',
      'linear-gradient(175deg, #0e0e0e 0%, #0a0a0a 40%, #060606 100%)',
    ].join(','),
    particle: 'dust', particleColor: 'rgba(200,200,200,0.3)', particleCount: 8,
    ornament: 'minimal', clock: 'digital',
    hubGlow: '0 0 40px rgba(144,144,144,0.25), 0 0 80px rgba(208,208,208,0.1)',
    shape: { borderRadius: '22%', aspectRatio: 1, hubBorderRadius: '22%' },
    openAnim: 'cardSlideUp', openDuration: 350, openEasing: 'cubic-bezier(0.2,0,0,1)',
    hubOpenAnim: 'hubShrink',
    titleFont: "'JetBrains Mono', 'Fira Code', monospace",
    bodyFont: "'Pretendard', 'SF Mono', 'Segoe UI', system-ui, sans-serif",
    fg: '#d8d8d8', danger: '#d06060', success: '#a0a0a0', warning: '#c0c0c0',
  },
  {
    id: 'sunset', name: 'Sunset Amber',
    primary: '#d08030', accent: '#f0c060',
    bg: '#0a0804', surface: '#1c1408',
    coverGradient: 'linear-gradient(175deg, #201808 0%, #161004 40%, #0e0a02 100%)',
    hubBg: 'radial-gradient(circle at 45% 40%, #221a0a 0%, #140e04 55%, #0a0804 100%)',
    hubBgOpen: '#0e0a06',
    blurStrength: 30, brightness: 0.7,
    backdropGradient: [
      'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(208,128,48,0.16) 0%, transparent 55%)',
      'radial-gradient(ellipse 80% 25% at 50% 105%, rgba(208,128,48,0.08) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 0% 50%, rgba(0,0,0,0.55) 0%, transparent 50%)',
      'radial-gradient(ellipse 30% 100% at 100% 50%, rgba(0,0,0,0.55) 0%, transparent 50%)',
      'repeating-linear-gradient(180deg, transparent 0px, transparent 85px, rgba(80,40,15,0.16) 85px, rgba(60,30,10,0.08) 87px, transparent 88px)',
      'linear-gradient(175deg, #141008 0%, #0e0c06 40%, #0a0804 100%)',
    ].join(','),
    particle: 'ash', particleColor: 'rgba(240,180,80,0.45)', particleCount: 12,
    ornament: 'flame', clock: 'solar',
    hubGlow: '0 0 70px rgba(208,128,48,0.35), 0 0 140px rgba(240,192,96,0.15)',
    shape: { borderRadius: '16px', aspectRatio: 0.9, hubBorderRadius: '50%' },
    openAnim: 'cardRise', openDuration: 500, openEasing: 'cubic-bezier(0.4,0,0.2,1)',
    hubOpenAnim: 'hubMelt',
    titleFont: "'Lora', 'Noto Serif KR', Georgia, serif",
    bodyFont: "'Pretendard', 'Segoe UI Variable', system-ui, sans-serif",
    fg: '#e0d8c8', danger: '#e06050', success: '#d0a040', warning: '#f0c060',
  },
]

// ─── Particle config per shape ───────────────
export interface ParticleConfig {
  borderRadius: string
  width: (size: number) => number
  height: (size: number) => number
  rotate: number
  blur: number
  animation: string // keyframe name prefix
}

export const PARTICLE_CONFIGS: Record<ParticleShape, ParticleConfig> = {
  petal:   { borderRadius: '50% 50% 50% 0', width: s => s, height: s => s * 1.4, rotate: 45, blur: 0.5, animation: 'petalFloat' },
  ember:   { borderRadius: '50%', width: s => s * 0.7, height: s => s * 0.7, rotate: 0, blur: 1, animation: 'petalFloat' },
  sparkle: { borderRadius: '2px', width: s => s * 0.5, height: s => s * 0.5, rotate: 45, blur: 0, animation: 'petalFloat' },
  snow:    { borderRadius: '50%', width: s => s * 0.6, height: s => s * 0.6, rotate: 0, blur: 0.5, animation: 'petalFloat' },
  leaf:    { borderRadius: '50% 0 50% 0', width: s => s, height: s => s * 0.6, rotate: 30, blur: 0.3, animation: 'petalFloat' },
  dust:    { borderRadius: '50%', width: s => s * 0.4, height: s => s * 0.4, rotate: 0, blur: 1, animation: 'petalFloat' },
  bubble:  { borderRadius: '50%', width: s => s, height: s => s, rotate: 0, blur: 0, animation: 'petalFloat' },
  ash:     { borderRadius: '40% 60% 50% 50%', width: s => s * 0.8, height: s => s * 0.5, rotate: 20, blur: 0.5, animation: 'petalFloat' },
}

// ─── Theme Store ─────────────────────────────
let _current: ThemePreset = THEME_PRESETS[0]
let _version = 0
const _listeners = new Set<() => void>()

function emitChange(): void { _version++; _listeners.forEach(fn => fn()) }

/** Switch active theme and update all CSS variables */
export function setTheme(id: string): void {
  const found = THEME_PRESETS.find(t => t.id === id)
  if (found && found.id !== _current.id) {
    _current = found
    T = buildTokens(found)
    const root = document.documentElement
    root.style.setProperty('--theme-primary', found.primary)
    root.style.setProperty('--theme-accent', found.accent)
    root.style.setProperty('--theme-fg', found.fg)
    root.style.setProperty('--theme-danger', found.danger)
    root.style.setProperty('--theme-backdrop', found.backdropGradient)
    root.style.setProperty('--theme-title-font', found.titleFont)
    root.style.setProperty('--theme-body-font', found.bodyFont)
    // Sync --win-* CSS variables with theme
    root.style.setProperty('--win-bg', found.bg)
    root.style.setProperty('--win-surface', found.surface)
    /* Apple HIG label hierarchy: primary 0.92 / secondary 0.60 / tertiary 0.40 */
    root.style.setProperty('--win-text', rgba(found.fg, 0.92))
    root.style.setProperty('--win-text-sub', rgba(found.fg, 0.60))
    root.style.setProperty('--win-text-muted', rgba(found.fg, 0.40))
    root.style.setProperty('--win-danger', found.danger)
    // Dynamic neon keyframes
    let dynStyle = document.getElementById('gs-theme-dynamic') as HTMLStyleElement | null
    if (!dynStyle) { dynStyle = document.createElement('style'); dynStyle.id = 'gs-theme-dynamic'; document.head.appendChild(dynStyle) }
    const a = found.accent
    const ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16)
    const neonRgba = (op: number) => `rgba(${ar},${ag},${ab},${op})`
    dynStyle.textContent = `
      @keyframes neonLetterOff{0%{opacity:1;color:#fff;text-shadow:0 0 12px ${a},0 0 30px ${neonRgba(0.5)},0 0 60px ${neonRgba(0.2)}}12%{opacity:.15;color:${neonRgba(0.2)};text-shadow:none}24%{opacity:.8;color:#fff;text-shadow:0 0 8px ${a},0 0 20px ${neonRgba(0.35)}}36%{opacity:.05;color:${neonRgba(0.1)};text-shadow:none}50%{opacity:.5;color:rgba(255,255,255,0.5);text-shadow:0 0 4px ${neonRgba(0.2)}}65%{opacity:.02;text-shadow:none;color:transparent}80%{opacity:.15;color:${neonRgba(0.15)};text-shadow:0 0 2px ${neonRgba(0.1)}}100%{opacity:0;color:transparent;text-shadow:none}}
      @keyframes neonLetterOn{0%{opacity:0;color:transparent;text-shadow:none}15%{opacity:.4;color:${neonRgba(0.4)};text-shadow:0 0 4px ${neonRgba(0.2)}}25%{opacity:.05;color:transparent;text-shadow:none}45%{opacity:.7;color:rgba(255,255,255,0.7);text-shadow:0 0 8px ${a},0 0 20px ${neonRgba(0.3)}}55%{opacity:.2;color:${neonRgba(0.2)};text-shadow:none}75%{opacity:.9;color:#fff;text-shadow:0 0 10px ${a},0 0 25px ${neonRgba(0.4)}}100%{opacity:1;color:#fff;text-shadow:0 0 12px ${a},0 0 30px ${neonRgba(0.5)},0 0 60px ${neonRgba(0.2)}}}
    `
    try { localStorage.setItem('gs-theme', id) } catch { /* */ }
    emitChange()
    const announcer = document.getElementById('gs-sr-announce')
    if (announcer) announcer.textContent = `테마가 ${found.name}(으)로 변경되었습니다`
  }
}

export function getThemeId(): string { return _current.id }
/** Get current theme preset (for non-hook contexts like memo'd components) */
export function getCurrentTheme(): ThemePreset { return _current }

/** Load saved theme from localStorage on app startup */
export function loadSavedTheme(): void {
  try {
    const saved = localStorage.getItem('gs-theme')
    if (saved) setTheme(saved)
  } catch { /* */ }
}

/** React hook — re-renders component when theme changes */
export function useTheme(): ThemePreset {
  return useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => { _listeners.delete(cb) } },
    () => _current,
  )
}

/** React hook — returns computed color tokens from current theme */
export function useTokens(): ThemeTokens {
  const theme = useTheme()
  return buildTokens(theme)
}

// ─── Token builder ───────────────────────────

/** Computed design tokens derived from a ThemePreset */
export interface ThemeTokens {
  gold: string; teal: string; fg: string; danger: string; success: string; warning: string; bg: string
  surface: string; surface1: string; surface2: string; surface3: string
  text: string; textSub: string; textMuted: string; error: string
  gold06: string; gold10: string; gold15: string; gold20: string; gold30: string; gold50: string
  teal08: string; teal15: string; teal25: string; teal30: string
}

/** Derive color tokens (rgba pre-computed values) from a theme preset
 *  Text opacities aligned to Apple HIG semantic label hierarchy:
 *  - label (primary):     1.0  → text   0.92 (adjusted for dark fantasy aesthetic)
 *  - secondaryLabel:      0.6  → textSub 0.60
 *  - tertiaryLabel:       0.3  → textMuted 0.40
 *  - quaternaryLabel:     0.18 → used as needed
 */
function buildTokens(theme: ThemePreset): ThemeTokens {
  const { primary: p, accent: a, fg: f, danger: d, success: s, warning: w } = theme
  const pr = parseInt(p.slice(1,3),16), pg = parseInt(p.slice(3,5),16), pb = parseInt(p.slice(5,7),16)
  return {
    gold: p, teal: a, fg: f, danger: d, success: s, warning: w, bg: theme.bg,
    surface: theme.surface, surface1: theme.surface, surface2: theme.surface, surface3: theme.surface,
    text: rgba(f, 0.92), textSub: rgba(f, 0.60), textMuted: rgba(f, 0.40),
    error: d,
    gold06: `rgba(${pr},${pg},${pb},0.06)`, gold10: `rgba(${pr},${pg},${pb},0.1)`,
    gold15: `rgba(${pr},${pg},${pb},0.15)`, gold20: `rgba(${pr},${pg},${pb},0.2)`,
    gold30: `rgba(${pr},${pg},${pb},0.3)`, gold50: `rgba(${pr},${pg},${pb},0.5)`,
    teal08: rgba(a, 0.08), teal15: rgba(a, 0.15), teal25: rgba(a, 0.25), teal30: rgba(a, 0.3),
  }
}

export let T: ThemeTokens = buildTokens(_current)

