---
name: Luminous Intelligence
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464554'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#8127cf'
  on-secondary: '#ffffff'
  secondary-container: '#9c48ea'
  on-secondary-container: '#fffbff'
  tertiary: '#595c5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#727577'
  on-tertiary-container: '#fbfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is defined by a **Minimalist Corporate** aesthetic that leans into a "product from the future" feel. It prioritizes clarity and intentionality, ensuring every element serves a specific purpose without visual clutter.

The target audience consists of high-productivity professionals and teams who require a sophisticated, calm workspace to manage complex AI-generated insights. The emotional response is one of **effortless control**—the UI feels light, airy, and premium. Key stylistic hallmarks include generous whitespace, a sophisticated indigo-to-violet gradient used sparingly for high-impact actions, and a "soft-UI" approach that uses depth rather than heavy borders to define structure.

## Colors

The palette is anchored in a pristine, high-brightness environment. 

- **Surfaces:** Use a tiered system of whites and very light grays (`#F8FAFC`) to create natural separation.
- **Accents:** A vibrant **Indigo (#6366F1) to Violet (#A855F7)** gradient is the primary identifier for AI-native features and primary actions.
- **Functional Colors:** Use soft, desaturated versions of emerald, amber, and rose for status indicators (Action Items, Decisions, Recordings) to maintain the calming atmosphere.
- **Typography:** Deep Navy (`#0F172A`) for high-contrast readability, transitioning to Slate (`#64748B`) for secondary metadata.

## Typography

The typography system utilizes **Manrope** for its modern, geometric-humanist balance. It feels professional yet approachable. 

- **Headlines:** Use tighter letter spacing and semi-bold weights to command attention without being aggressive.
- **Body:** Generous line heights are essential to maintain the "breathable" feel of the design system.
- **Data/Metadata:** **JetBrains Mono** is used for timestamps, durations, and technical labels to lean into the AI/Technology narrative.
- **Hierarchy:** Contrast is achieved through weight and color (Navy to Slate) rather than excessive size variations.

## Layout & Spacing

This design system uses a **Fluid Grid** model with high-density inner padding and low-density outer margins to emphasize focus.

- **Desktop:** 12-column grid with a 1440px max-width. Sidebars are fixed (240px) while the main content area expands.
- **Padding:** Use a base-8 scale. Content cards use 24px or 32px internal padding to create a luxurious sense of space.
- **Mobile:** Transition to a single-column stack. The navigation moves to a bottom bar or a condensed header to maximize vertical screen real estate for AI insights.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Ambient Shadows**.

- **Level 0 (Background):** Solid `#FFFFFF` or very light neutral.
- **Level 1 (Cards):** Subtle 1px border in `#F1F5F9` with a very soft, high-diffusion shadow (0px 4px 20px rgba(0,0,0,0.03)).
- **Level 2 (Hover/Active):** Slightly deeper shadow and a subtle lift.
- **AI Layers:** Components involving AI (like the Copilot panel) use a subtle glassmorphism effect (Backdrop Blur: 12px) to feel "lightweight" and overlayed rather than embedded.

## Shapes

The shape language is consistently **Rounded**, avoiding sharp corners to maintain an approachable feel.

- **Standard Elements:** Buttons and input fields use a `0.5rem` radius.
- **Container Elements:** Main content cards and dashboard widgets use `1rem` (rounded-lg) to create a soft, modern frame.
- **Specialty Elements:** User avatars and specific AI status indicators are circular (full rounded) to contrast against the structured grid.

## Components

- **Buttons:** Primary buttons utilize the Indigo-Violet gradient with white text. Secondary buttons are "Ghost" style with a subtle border.
- **Quick Record Button:** A high-visibility component featuring the gradient and a "Record" icon, often placed in the top right utility bar.
- **Cards:** White backgrounds, rounded corners (16px), and subtle shadows. Cards often feature a small icon with a light-colored circular background in the top right to denote category.
- **AI Copilot Panel:** A distinct right-aligned sidebar with a lighter background or glass effect. Chat bubbles should have soft corners and distinct colors for user vs. AI.
- **Progress Bars:** Thin, high-contrast lines using the primary gradient to track meeting playback or AI processing tasks.
- **Chips/Tags:** Used for "Spaces" or "Status." These are small, pill-shaped, and use low-saturation background tints with high-saturation text.