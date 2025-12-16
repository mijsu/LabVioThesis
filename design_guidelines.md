# MEDiscan Design Guidelines
## Modern Hospital Analytics Dashboard

### Design Philosophy
MEDiscan embodies a **high-end hospital analytics platform** aesthetic - sleek, professional, and data-driven. The UI should feel like a premium medical-grade dashboard used in advanced healthcare facilities, combining clinical precision with modern design trends.

### Core Principles
1. **Premium Medical Aesthetic** - Clean, sophisticated, clinical yet approachable
2. **Data-First Design** - Information is king; present insights clearly and beautifully
3. **Advanced Components** - Use cutting-edge UI patterns suitable for healthcare systems
4. **Responsive Intelligence** - Adapt seamlessly from mobile to desktop
5. **Accessibility** - WCAG 2.1 AA compliance with medical-grade clarity

---

## Layout & Navigation

### Topbar Navigation (Primary)
- **Height**: 64px (desktop), 56px (mobile)
- **Background**: Semi-transparent with backdrop blur (glassmorphism)
- **Structure**: 
  - Left: Logo + Brand name
  - Center: Main navigation links (Home, Dashboard, Upload, Chat, Tips, Emergency)
  - Right: Theme toggle + User profile dropdown + Sign out
- **Mobile**: Hamburger menu that slides in from right
- **Sticky**: Fixed to top with subtle shadow on scroll
- **Typography**: Medium weight (500) for nav links

### Page Layout
- **Container**: Max-width 1400px for content, full-width for dashboards
- **Spacing**: Generous whitespace (24px-32px padding)
- **Grid**: CSS Grid for complex layouts, Flexbox for simple arrangements
- **Sections**: Clear visual hierarchy with gradient dividers

---

## Color System

### Medical Blue Palette (Primary)
```css
--primary-50: 239 246 255   /* Very light blue */
--primary-100: 219 234 254  /* Light blue wash */
--primary-200: 191 219 254  /* Soft blue */
--primary-300: 147 197 253  /* Medium light */
--primary-400: 96 165 250   /* Medium */
--primary-500: 59 130 246   /* Base primary #3B82F6 */
--primary-600: 37 99 235    /* Dark primary #2563EB */
--primary-700: 29 78 216    /* Darker */
--primary-800: 30 64 175    /* Very dark */
--primary-900: 30 58 138    /* Deepest */
```

### Clinical Whites & Grays
```css
Light Mode:
--background: 0 0% 100%           /* Pure white */
--surface: 240 20% 99%            /* Off-white for cards */
--surface-elevated: 214 32% 98%   /* Slightly blue-tinted white */
--border: 214 32% 91%             /* Soft blue-gray borders */
--muted: 210 40% 96%              /* Very light blue-gray */
--text: 222 47% 11%               /* Near black */
--text-secondary: 215 16% 47%     /* Medium gray */
--text-tertiary: 215 14% 71%      /* Light gray */

Dark Mode:
--background: 222 47% 11%         /* Deep blue-black */
--surface: 217 33% 17%            /* Dark blue-gray */
--surface-elevated: 215 28% 22%   /* Elevated surface */
--border: 217 33% 27%             /* Subtle borders */
--muted: 217 33% 17%              /* Muted backgrounds */
--text: 210 40% 98%               /* Off-white */
--text-secondary: 214 32% 71%     /* Light gray */
--text-tertiary: 215 20% 55%      /* Medium gray */
```

### Accent Colors (Semantic)
```css
--accent-success: 142 76% 36%     /* Medical green */
--accent-warning: 38 92% 50%      /* Amber alert */
--accent-danger: 0 84% 60%        /* Critical red */
--accent-info: 199 89% 48%        /* Info cyan */
```

### Gradients
```css
--gradient-primary: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)
--gradient-surface: linear-gradient(180deg, rgba(59,130,246,0.05) 0%, rgba(37,99,235,0.02) 100%)
--gradient-hero: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)
--gradient-chart: linear-gradient(180deg, rgba(59,130,246,0.8) 0%, rgba(59,130,246,0.1) 100%)
```

---

## Typography

### Font Family
- **Primary**: 'Inter', -apple-system, system-ui, sans-serif
- **Monospace**: 'JetBrains Mono', 'Fira Code', monospace (for data/metrics)

### Type Scale
```css
--text-xs: 0.75rem (12px)    /* Small labels */
--text-sm: 0.875rem (14px)   /* Body small, captions */
--text-base: 1rem (16px)     /* Body text */
--text-lg: 1.125rem (18px)   /* Large body */
--text-xl: 1.25rem (20px)    /* Small headings */
--text-2xl: 1.5rem (24px)    /* Headings */
--text-3xl: 1.875rem (30px)  /* Large headings */
--text-4xl: 2.25rem (36px)   /* Hero text */
--text-5xl: 3rem (48px)      /* Page titles */
```

### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (labels, nav items, emphasis)
- **Semibold**: 600 (headings, important data)
- **Bold**: 700 (hero text, critical metrics)

---

## Component Patterns

### Cards (Data Panels)
```css
Background: Semi-transparent white (light) / dark surface (dark)
Backdrop Filter: blur(12px)
Border: 1px solid border color
Border Radius: 16px
Padding: 24px
Box Shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)
Hover: Subtle lift (translateY(-2px)) + shadow increase
Transition: all 200ms ease
```

### Interactive Cards
- **Hover State**: Slight elevation + border glow (primary-300)
- **Active State**: Scale(0.98) + border primary-500
- **Loading State**: Skeleton shimmer with gradient animation

### Metric Cards (Dashboard Stats)
```css
Layout: Icon (top-left) + Label (below icon) + Value (large, bottom)
Icon: 48x48px, primary-500 background, white icon, rounded-2xl
Value: text-3xl, font-bold, gradient text effect
Label: text-sm, text-secondary
Trend Indicator: Small arrow + percentage (success/danger color)
```

### Chart Containers
```css
Background: surface-elevated
Border: 1px solid border
Border Radius: 20px
Padding: 32px
Gradient Overlay: Subtle blue gradient wash behind charts
Grid Lines: border color, 1px, dashed
```

---

## Glassmorphism Effects

### Primary Glass Cards
```css
background: rgba(255, 255, 255, 0.7) (light) / rgba(30, 41, 59, 0.7) (dark)
backdrop-filter: blur(12px) saturate(180%)
border: 1px solid rgba(255, 255, 255, 0.2) (light) / rgba(255, 255, 255, 0.1) (dark)
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15)
```

### Secondary Glass (Overlays, Modals)
```css
background: rgba(255, 255, 255, 0.9) (light) / rgba(15, 23, 42, 0.9) (dark)
backdrop-filter: blur(20px) saturate(200%)
```

---

## Spacing System

### Consistent Scale (4px base)
```css
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
--space-16: 4rem (64px)
--space-20: 5rem (80px)
```

### Application
- **Page padding**: 24px-32px
- **Card padding**: 24px
- **Section spacing**: 48px-64px
- **Element gaps**: 16px-24px
- **Tight spacing**: 8px-12px (forms, lists)

---

## Animations & Transitions

### Micro-interactions
```css
Default Transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
Hover: 150ms ease-out
Page Transitions: 300ms ease-in-out
Modal/Drawer: 250ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Loading States
- **Skeleton**: Shimmer gradient animation (1.5s loop)
- **Spinner**: Smooth rotation with primary gradient
- **Progress**: Animated gradient fill
- **Pulse**: Subtle opacity pulse for live data

### Data Visualization Animations
- **Chart Entry**: Stagger animation (100ms delay per element)
- **Data Update**: Smooth value transitions (500ms)
- **Hover Interactions**: Instant feedback (0ms delay)

---

## Iconography

### Icon System
- **Library**: Lucide React (primary)
- **Size**: 16px (sm), 20px (md), 24px (lg), 32px (xl), 48px (2xl)
- **Stroke Width**: 2px (default), 2.5px (bold for emphasis)
- **Color**: Inherit from parent, or primary-500 for accents

### Medical Icons
- Use appropriate medical iconography for health features
- Consistent style across all icons
- Clear, recognizable at small sizes

---

## Buttons & Controls

### Button Variants
**Primary (Call-to-Action)**
```css
Background: gradient-primary
Text: white
Border: none
Padding: 12px 24px
Border Radius: 10px
Font Weight: 600
Box Shadow: 0 4px 12px rgba(59, 130, 246, 0.4)
Hover: brightness(110%) + lift
```

**Secondary (Supporting Actions)**
```css
Background: surface
Text: text (primary-600 in light)
Border: 2px solid border
Hover: border-primary-500 + background-muted
```

**Ghost (Subtle Actions)**
```css
Background: transparent
Text: text-secondary
Hover: background-muted
```

### Form Controls
- **Input Height**: 44px (mobile-friendly)
- **Input Radius**: 10px
- **Focus Ring**: 2px primary-500 with offset
- **Label**: text-sm, font-medium, text-secondary

---

## Data Visualization

### Chart.js Configuration
**Colors**
- Primary Line: primary-500
- Fill Gradient: gradient-chart
- Grid Lines: border color, 1px
- Tooltips: Dark background, white text, rounded-lg

**Typography**
- Labels: text-xs, text-secondary
- Values: text-sm, font-medium
- Axis: text-xs, text-tertiary

### Health Metrics Display
**Risk Levels**
- Low: success color (green) with subtle green glow
- Moderate: warning color (amber) with amber glow
- High: danger color (red) with red glow

**Metric Cards**
- Large number display (text-4xl, font-bold)
- Unit label (text-sm, text-secondary)
- Trend indicator (arrow + percentage)
- Sparkline chart (inline, subtle)

---

## Responsive Design

### Breakpoints
```css
mobile: 0-639px
tablet: 640px-1023px
desktop: 1024px+
wide: 1400px+
```

### Mobile Optimizations
- Topbar: Condensed height (56px), hamburger menu
- Cards: Full-width with reduced padding (16px)
- Charts: Simplified, touch-friendly
- Navigation: Bottom bar or slide-out menu
- Font sizes: Slightly smaller for mobile

### Tablet Optimizations
- 2-column grid layouts
- Moderate card padding (20px)
- Full navigation visible
- Touch-optimized buttons (44px min height)

---

## Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI elements
- **Focus Indicators**: Clear 2px ring on all interactive elements
- **Keyboard Navigation**: Full keyboard support, logical tab order
- **ARIA Labels**: Proper labeling for all interactive components
- **Alt Text**: Descriptive alt text for all images

### Dark Mode
- All colors have dark mode variants
- Maintain contrast ratios in dark mode
- Smooth transition between themes (200ms)

---

## Special Components

### Health Analysis Panel
- Large card with gradient background
- Risk level indicator (color-coded badge)
- Key findings list with icons
- Recommendations grid
- Specialist suggestions with avatars

### Upload Zone
- Dashed border (primary-300)
- Large drop zone (min 300px height)
- Center-aligned icon + text
- Drag-over state: solid border, background highlight
- Preview: Image thumbnail + metadata

### Chat Interface
- Message bubbles: rounded-2xl, distinct colors for user/AI
- Typing indicator: animated dots
- Suggestion chips: pill-shaped, hover effect
- Auto-scroll to latest message

### Dashboard Overview
- Grid of metric cards (4 columns desktop, 2 tablet, 1 mobile)
- Chart section with tabs for different views
- Recent activity timeline
- Quick actions panel

---

## Performance

### Optimization Guidelines
- Lazy load images and heavy components
- Use CSS transforms for animations (GPU-accelerated)
- Minimize re-renders with proper React optimization
- Code-split routes
- Compress and optimize all images

---

## Medical Disclaimer

**Always display on AI-generated content:**
> "This analysis is AI-generated and for informational purposes only. It does not constitute medical advice. Please consult with a qualified healthcare professional for medical decisions."

**Placement**: Small text (text-xs), text-tertiary, at bottom of analysis panels

---

## Summary

MEDiscan's UI is a **modern hospital analytics dashboard** featuring:
- ✅ Topbar navigation with glassmorphism effects
- ✅ Medical blue color scheme with gradients
- ✅ Advanced data visualization panels
- ✅ Material/glassmorphism design language
- ✅ Professional typography (Inter font)
- ✅ Responsive design (mobile-first)
- ✅ Dark and light modes
- ✅ Smooth animations and micro-interactions
- ✅ Clinical precision with approachable aesthetics
- ✅ WCAG 2.1 AA accessibility compliance

The overall feel should be: **Premium • Professional • Data-Driven • Trustworthy • Modern**
