---
name: CampusBites Calm Hazy Glassmorphic Design System
version: 2.1.0
theme: light-glass
tokens:
  colors:
    primary-bg: '#FAF9FB'
    surface-bg: rgba(255, 255, 255, 0.35)
    surface-border-light: rgba(255, 255, 255, 0.45)
    surface-border-dark: rgba(15, 23, 42, 0.03)
    text-primary: '#1E293B'
    text-secondary: '#475569'
    text-muted: '#64748B'
    brand-primary: '#4F46E5'
    brand-hover: '#4338CA'
    hazy-lavender: rgba(165, 180, 252, 0.18)
    hazy-rose: rgba(244, 143, 177, 0.14)
    hazy-mint: rgba(167, 243, 208, 0.11)
    btn-gradient-start: rgba(255, 255, 255, 0.5)
    btn-gradient-end: rgba(255, 255, 255, 0.15)
    brand-btn-start: rgba(129, 140, 248, 0.25)
    brand-btn-end: rgba(244, 143, 177, 0.2)
    status:
      success: '#059669'
      success-bg: linear-gradient(135deg, rgba(110, 231, 183, 0.2) 0%, rgba(52, 211,
        153, 0.08) 100%)
      warning: '#D97706'
      warning-bg: linear-gradient(135deg, rgba(253, 230, 138, 0.25) 0%, rgba(252,
        211, 77, 0.08) 100%)
      error: '#DC2626'
      error-bg: linear-gradient(135deg, rgba(252, 165, 165, 0.25) 0%, rgba(248, 113,
        113, 0.08) 100%)
  typography:
    headings:
      fontFamily: Outfit
      weights:
      - 600
      - 700
    body:
      fontFamily: Inter
      weights:
      - 400
      - 500
      - 600
    monospace:
      fontFamily: Courier New, monospace
  effects:
    glass-card:
      blur: 24px
      bg: rgba(255, 255, 255, 0.35)
      border-highlight: 1px solid rgba(255, 255, 255, 0.45)
      border-shadow: 1px solid rgba(15, 23, 42, 0.03)
      shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.03)
    glass-nav:
      blur: 16px
      bg: rgba(255, 255, 255, 0.55)
      borderBottom: 1px solid rgba(255, 255, 255, 0.3)
  animations:
    cursor-swoosh:
      duration: 0.3s
      ease: cubic-bezier(0.25, 1, 0.5, 1)
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#5d5e60'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfe1'
  on-secondary-container: '#626264'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#DC2626'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e3e2e4'
  secondary-fixed-dim: '#c6c6c8'
  on-secondary-fixed: '#1a1c1d'
  on-secondary-fixed-variant: '#464749'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
  text-primary: '#1E293B'
  text-secondary: '#475569'
  text-muted: '#64748B'
  hazy-lavender: rgba(165, 180, 252, 0.18)
  hazy-rose: rgba(244, 143, 177, 0.14)
  hazy-mint: rgba(167, 243, 208, 0.11)
  surface-bg: rgba(255, 255, 255, 0.35)
  success: '#059669'
  warning: '#D97706'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

