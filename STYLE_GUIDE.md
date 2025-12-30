# Tiffany & Co Luxury Aesthetic - Visual Style Guide

## Design Token System

### Color Hierarchy

#### Primary Brand Colors
```
Gold (Accent)
  └── #D4AF37 (Main gold)
      ├── #F4E5C2 (Light - backgrounds)
      ├── #B8942C (Dark - text, borders)
      └── #FFD700 (Bright - highlights)

Warm Beige (Primary)
  └── #E8DCC8 (Main beige)
      ├── #F5F0E8 (Light - backgrounds)
      └── #D4C4B0 (Dark - accents)

Deep Brown (Text/Depth)
  └── #3D332A (Main brown)
      ├── #6B5B4F (Medium - secondary)
      └── #9E8B7E (Light - muted)
```

#### Neutral Palette
- Pearl: #F8F6F0 (Premium white)
- Cream: #FFFEF7 (Off-white)
- Champagne: #F8F4E6 (Warm neutral)
- Ivory: #FFFFF0 (Light neutral)

#### Text Colors
- Dark: #2F2926 (Primary text)
- Mid: #4A4238 (Secondary text)
- Light: #6B6158 (Tertiary text)
- Muted: #8B7E72 (Disabled/hint text)

### Typography Scale

#### Font Families
- **Headings**: Cormorant Garamond (serif, 300 weight)
- **Body**: Montserrat (sans-serif, 300-400 weight)
- **Quotes**: Georgia (serif, italic)

#### Size Scale (Fluid clamp)
```
--text-xs: clamp(10px, 1.5vw + 2px, 13px)      → Labels
--text-sm: clamp(12px, 1.8vw + 3px, 15px)      → Captions
--text-base: clamp(14px, 2vw + 4px, 17px)      → Body
--text-md: clamp(15px, 2.2vw + 5px, 19px)      → Emphasis
--text-lg: clamp(17px, 2.5vw + 6px, 22px)      → Subheading
--text-xl: clamp(20px, 3vw + 8px, 28px)        → Section heading
--text-2xl: clamp(24px, 4vw + 10px, 36px)      → Page heading
--text-3xl: clamp(32px, 5vw + 12px, 56px)      → Hero title
```

#### Letter Spacing (Luxury)
```
--ls-tight: 0.04em          → Body text
--ls-normal: 0.08em         → Headings
--ls-wide: 0.12em           → Page titles
--ls-extra-wide: 0.16em     → Logo, special text
```

### Spacing System (Fluid Responsive)

```
6px ← Mobile
  ↓
clamp(6px, 1.2vw + 2px, 10px)
  ↓
10px ← Desktop (4K)

Ratios: 2:1 scale increment
```

| Token | Mobile | Tablet | Desktop | 4K |
|-------|--------|--------|---------|-----|
| xs | 6px | 7px | 9px | 10px |
| sm | 12px | 14px | 18px | 20px |
| md | 24px | 28px | 32px | 36px |
| lg | 36px | 44px | 52px | 56px |
| xl | 48px | 60px | 72px | 80px |
| 2xl | 64px | 86px | 106px | 120px |

## Component Library

### Button Styles

#### Primary Button
```
State: Default
  - Background: Dark brown gradient (360deg, 0°: #2C1810, 100°: #1C1C1C)
  - Color: Gold light (#F4E5C2)
  - Border: 1px solid gold (#D4AF37)
  - Shadow: 0 4px 20px rgba(212, 175, 55, 0.25)
  - Padding: 18px 40px (responsive)

State: Hover
  - Gold gradient overlay animation (translateX 0.5s)
  - Elevated: translateY(-2px)
  - Enhanced shadow: 0 8px 32px rgba(212, 175, 55, 0.45)
  - Text color: Dark brown

State: Active
  - Gradient fully visible
  - Enhanced shadow
  - No elevation (stays at base)
```

#### Secondary Button
```
State: Default
  - Background: Transparent
  - Color: Gold dark (#B8942C)
  - Border: 2px solid gold (#D4AF37)
  - Shadow: None initially

State: Hover
  - Gold gradient fill animation (scaleX 0.4s)
  - Text color: Dark brown
  - Border: Gold accent (#FFD700)
  - Shadow: 0 8px 28px rgba(212, 175, 55, 0.35)
  - Elevation: translateY(-2px)
```

### Card Styles

#### Product Card
```
Default:
  - Background: White (#FFFFFF)
  - Border: 1px solid transparent
  - Shadow: 0 2px 8px rgba(0, 0, 0, 0.04)
  - Radius: 0 (luxury squared)

Hover:
  - Border: 1px solid gold
  - Shadow: 0 12px 32px rgba(212, 175, 55, 0.15)
  - Elevation: translateY(-4px)
  - Image scale: 1.08 (zoom effect)
```

#### Info Card
```
Background Gradient:
  - From: White (#FFFFFF)
  - To: Pearl (#F8F6F0)

Border: 1px solid rgba(212, 175, 55, 0.15)

Divider (top):
  - Height: 1px
  - Gradient: transparent → gold → transparent

Highlight variant:
  - Background: Champagne → Pearl gradient
  - Border color: Gold
```

### Form Elements

#### Input Styling
```
Default:
  - Border: 1px solid rgba(212, 175, 55, 0.2)
  - Background: White (#FFFFFF)
  - Padding: 16px 20px
  - Font: Montserrat, 14px
  - Color: Text dark (#2F2926)
  - Placeholder: Text muted (#8B7E72)

Focus:
  - Border: Gold (#D4AF37)
  - Shadow: 0 0 0 4px rgba(212, 175, 55, 0.12)
  - Background: White (unchanged)

Readonly:
  - Background: Cream gradient
  - Color: Text muted
  - Cursor: Not-allowed
  - Border: Faded gold
```

#### Select Dropdown
```
Default:
  - Border: 1px solid bronze
  - Background: Cream (#FFFEF7)
  - Padding: 12px 20px
  - Font size: 12px

Hover:
  - Border color: Gold

Focus:
  - Border: Gold (#D4AF37)
  - Shadow: 0 0 0 3px rgba(212, 175, 55, 0.1)
```

### Navigation

#### Nav Container
```
Position: Sticky (top: 0, z-index: 1000)
Background: rgba(255, 254, 247, 0.95)
Backdrop: blur(20px) saturate(180%)

Divider (bottom):
  - Height: 1px
  - Gradient: transparent → gold → transparent
  
Shadow: 0 1px 0 rgba(212, 175, 55, 0.2)
```

#### Nav Links
```
Default:
  - Color: Text dark
  - Font: 11px, uppercase
  - Letter-spacing: 0.25em
  - Underline: Width 0, gold color

Hover:
  - Color: Gold (#D4AF37)
  - Underline: Width 100%
  - Text-shadow: 0 0 20px rgba(212, 175, 55, 0.4)
```

### Badge Styling

#### Cart Count Badge
```
Position: Absolute (top -10px, right -12px)
Background: Gold gradient
Color: Rich brown text
Size: 20px × 20px, border-radius: 50%
Font: 10px, weight: 600
Shadow: 0 2px 8px rgba(212, 175, 55, 0.4)
Animation: cartPulse (0.3s ease, scale 0→1.2→1)
```

#### Product Badge
```
Position: Absolute (top 16px, right 16px)
Padding: 8px 16px
Font: 9px, weight: 600, uppercase
Letter-spacing: 0.15em

Variants:
  - New: Deep burgundy → brown gradient
  - Bestseller: Rich brown → charcoal gradient
  - Sale: Gold → accent gradient
```

## Shadow Elevations

### Shadow System
```
Soft (subtle depth):
  0 2px 8px rgba(0, 0, 0, 0.06)
  
Medium (visible elevation):
  0 6px 20px rgba(0, 0, 0, 0.1)

Gold (brand highlight):
  0 8px 32px rgba(212, 175, 55, 0.18)

Luxury (premium depth):
  0 16px 48px rgba(212, 175, 55, 0.15),
  0 6px 20px rgba(0, 0, 0, 0.08)

Elevation (maximum depth):
  0 20px 60px rgba(0, 0, 0, 0.12)
```

## Animation Specifications

### Timing Functions
```
Standard: 0.3s ease
Fast: 0.2s ease
Smooth: 0.4s cubic-bezier(0.4, 0, 0.2, 1)
Bounce: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
Long: 4-6s ease-in-out
```

### Keyframe Animations

#### Hero Glow
```css
0% { opacity: 0.5; }
50% { opacity: 1; }
100% { opacity: 0.5; }
Duration: 6s
Easing: ease-in-out
Loop: infinite
```

#### Shimmer
```css
0% { background-position: -200% center; }
100% { background-position: 200% center; }
Duration: 3s
Easing: linear
Loop: infinite
```

#### Pulse Gold
```css
0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); }
50% { box-shadow: 0 0 0 12px rgba(212, 175, 55, 0); }
Duration: 2s
Easing: ease-in-out
Loop: infinite
```

#### Float
```css
0%, 100% { transform: translateY(0); }
50% { transform: translateY(-8px); }
Duration: 3s
Easing: ease-in-out
Loop: infinite
```

## Layout Patterns

### Hero Section
```
Min height: 100vh
Background: Multi-layer gradient
Alignment: Center both axes

Title:
  - Font-size: clamp(48px, 10vw, 96px)
  - Letter-spacing: var(--ls-wide)
  - Line-height: 1.1
  - Color: Rich brown

Subtitle:
  - Font-size: var(--text-sm)
  - Letter-spacing: 0.3em
  - Text-transform: uppercase
  - Color: Gold dark
```

### Grid System

#### Product Grid
```
Mobile: 1 column
Tablet: 2 columns
Desktop: 3 columns (1024px+)
Gap: var(--spacing-md) to var(--spacing-lg)
```

#### Form Grid
```
Mobile: 1 column
Tablet+: 2 columns
Gap: var(--spacing-md)
```

#### Footer Grid
```
Mobile: 1 column (stacked)
Tablet+: 3 columns (equal)
Gap: var(--spacing-xl) to var(--spacing-2xl)
Text-align: center → left at tablet+
```

## Responsive Design Rules

### Mobile First Approach
- Design for smallest screen first (320px)
- Enhance for larger screens (640px+)
- Use fluid `clamp()` values, not breakpoints where possible
- Touch targets: minimum 44×44px

### Breakpoints
```
Mobile: 320px (base)
Tablet: 640px+ (@media min-width: 640px)
Desktop: 1024px+ (@media min-width: 1024px)
Wide: 1440px+ (@media min-width: 1440px)
Ultra: 1920px+ (@media min-width: 1920px)
```

### Container Sizing
```
Mobile: 94% width
Tablet: 90% width
Desktop: 86% width
Wide: 82% width
Max: 1800px
```

## Accessibility Standards

### Color Contrast Ratios (WCAG AA)
- Text on background: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- Interactive elements: 3:1 minimum

### Font Sizes
- Minimum readable: 12px for small text
- 16px+ for body text (accessibility)
- Increased letter-spacing aids dyslexia

### Touch Targets
- Interactive elements: 44×44px minimum
- Padding: 8-12px around touch targets
- Sufficient spacing between actions

### Focus States
- Visible focus outline on all interactive elements
- High contrast focus indicators
- Clear visual feedback for all states

## Performance Considerations

### Optimization Techniques
- Use CSS variables for DRY styling
- Hardware acceleration: `transform`, `opacity`
- Minimal box shadows (combine multiple)
- Efficient gradient usage
- Lazy-load images in HTML

### Critical Rendering Path
- Essential CSS: Navigation, hero, buttons
- Deferred: Animations, transitions
- Preload: Google Fonts (Montserrat, Cormorant Garamond)

## Browser Support

### Modern Browsers (All Features)
- Chrome 85+
- Firefox 79+
- Safari 14+
- Edge 85+

### Required Features
- CSS Grid & Flexbox
- CSS Custom Properties (variables)
- CSS Gradients (linear, radial)
- Backdrop Filter (optional, graceful fallback)
- Transforms & Transitions

## Customization Guide

### Changing Primary Gold
```css
Search & Replace:
  --gold: #D4AF37        → Your color
  --gold-light: #F4E5C2  → Lighter variant
  --gold-dark: #B8942C   → Darker variant
  --gold-accent: #FFD700 → Accent variant
```

### Adjusting Spacing Scale
```css
Base spacing formula:
  clamp(base_mobile, width_calc + offset, base_desktop)

Example for 2x scale:
  clamp(12px, 2.4vw + 4px, 20px)  → instead of 1.2vw
```

### Modifying Typography Scale
```css
Update font-size clamp values:
  --text-base: clamp(14px, 2vw + 4px, 17px)
  
Adjust multiplier (2vw) for faster/slower scaling
Adjust offset (+ 4px) for minimum reading size
```

---

**Style Guide Version**: 1.0
**Last Updated**: 2024
**Status**: Complete & Production Ready
