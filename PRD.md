# Planning Guide

AI Tutor Akademicki is a dark academic-themed educational platform that provides interactive AI-powered tutoring across multiple learning modes: interactive Q&A, guided lectures, and examination testing.

**Experience Qualities**:
1. **Scholarly** - Evokes the atmosphere of late-night academic study with a sophisticated dark theme reminiscent of university libraries
2. **Focused** - Clean, distraction-free interface that directs attention to learning content with purposeful use of accent gradients
3. **Professional** - Polished UI with smooth transitions and thoughtful micro-interactions that inspire confidence in the learning tool

**Complexity Level**: Light Application (multiple features with basic state)
This is a multi-view educational application with view switching, configuration state, and future interactive features. The navigation framework establishes the foundation for more complex tutoring, mentoring, and examination features.

## Essential Features

### View Navigation System
- **Functionality**: Tab-based navigation switching between four distinct learning modes (Tutor, Mentor, Egzamin, Ustawienia)
- **Purpose**: Provides clear separation of concerns between different learning modalities without page reloads
- **Trigger**: User clicks on navigation pills in the top bar
- **Progression**: User clicks nav item → Active state updates with gradient underline → Previous view fades out → New view fades in → Content displays
- **Success criteria**: Smooth transitions between views (300ms), clear visual feedback for active state, no layout shift during transitions

### Sticky Navigation Header
- **Functionality**: Persistent top navigation bar with semi-transparent background and backdrop blur
- **Purpose**: Maintains context and navigation access while scrolling through content
- **Trigger**: Page load and scroll events
- **Progression**: Page loads → Header renders at top → User scrolls → Header remains visible with blur effect → Always accessible
- **Success criteria**: Header stays visible during scroll, backdrop blur creates depth, no performance issues with blur effect

### Placeholder View Cards
- **Functionality**: Each view displays a descriptive card explaining its future purpose
- **Purpose**: Establishes UI patterns and demonstrates the navigation framework
- **Trigger**: View becomes active through navigation
- **Progression**: View activates → Card scales in subtly → Content displays with description → User reads purpose
- **Success criteria**: Cards have consistent styling, scale-in animation feels polished, content is clearly readable

### Responsive Layout Adaptation
- **Functionality**: Layout adapts from desktop (max-width 1200px centered) to mobile (single column)
- **Purpose**: Ensures usability across all device sizes
- **Trigger**: Viewport width changes
- **Progression**: User resizes window → Layout responds → Navigation adapts → Content reflows → Maintains readability
- **Success criteria**: No horizontal scroll on mobile, touch-friendly navigation on small screens, content remains readable at all sizes

## Edge Case Handling

- **Rapid Navigation Clicks**: Debounce or queue view transitions to prevent animation conflicts
- **Deep Linking**: Default to Tutor view on initial load; future enhancement for URL-based view state
- **Keyboard Navigation**: Tab key navigation through nav items with visible focus states
- **Reduced Motion**: Respect prefers-reduced-motion for users sensitive to animations
- **Long Content**: Ensure sticky header doesn't obscure content; proper spacing below header

## Design Direction

The design should evoke the feeling of focused late-night study in a prestigious university library—intimate, scholarly, and intellectually stimulating. The dark academic theme creates a sophisticated atmosphere that minimizes eye strain during extended learning sessions while accent gradients provide moments of visual interest that guide the eye and highlight interactive elements.

## Color Selection

The color scheme balances deep, contemplative backgrounds with vibrant accent gradients that create visual hierarchy and draw attention to interactive elements.

- **Primary Color**: Deep slate gradient (slate-900 → slate-800 → slate-900) - Communicates scholarly depth and reduces eye strain for extended study sessions
- **Secondary Colors**: 
  - Indigo-500 (oklch(0.555 0.183 272.314)) - Academic authority and trust
  - Fuchsia-500 (oklch(0.639 0.252 328.363)) - Creative energy and engagement
  - Cyan-400 (oklch(0.811 0.124 195.815)) - Technical precision and clarity
- **Accent Color**: Gradient combinations of indigo-500 → fuchsia-500 and cyan-400 for CTAs, active states, and visual interest
- **Foreground/Background Pairings**:
  - Background (slate-900 #0f172a): Foreground white (#FFFFFF) - Ratio 16.1:1 ✓
  - Card surface (rgba(255,255,255,0.05)): Foreground white (#FFFFFF) - Ratio 15.2:1 ✓
  - Indigo-500 (#6366f1): White (#FFFFFF) - Ratio 5.2:1 ✓
  - Muted text (slate-400 #94a3b8): Dark background (#0f172a) - Ratio 8.9:1 ✓

## Font Selection

Typography should communicate academic rigor while maintaining excellent readability across devices and content types.

- **Typographic Hierarchy**:
  - H1 (App Title): Plus Jakarta Sans Bold / 24px / -0.02em letter spacing
  - H2 (View Titles): Plus Jakarta Sans SemiBold / 32px / -0.01em letter spacing / 1.2 line height
  - H3 (Section Headers): Plus Jakarta Sans Medium / 20px / normal letter spacing
  - Body Text: Inter Regular / 16px / 1.6 line height / normal letter spacing
  - Navigation Items: Inter Medium / 14px / normal letter spacing
  - Code: Fira Code Regular / 14px / monospace / used for technical content
  - Badge/Meta: Inter Medium / 12px / 0.02em letter spacing / uppercase

## Animations

Animations should enhance the scholarly atmosphere with refined, purposeful motion that guides attention and provides feedback without creating distraction.

- **View Transitions**: 300ms ease fade-in/out when switching views - creates continuity
- **Card Entry**: Subtle scale-in (0.95 → 1.0) over 400ms with ease-out - draws attention without jarring
- **Button Hover**: Transform translateY(-2px) over 150ms + shadow increase - tactile feedback
- **Navigation Active State**: Gradient underline slides in over 200ms - clear visual confirmation
- **Backdrop Blur**: Always-on effect on sticky header - creates depth hierarchy

## Component Selection

- **Components**:
  - Card: Primary container for view content with semi-transparent backgrounds (rgba white 5-10%)
  - Button: Used sparingly for future CTAs, styled with gradient overlays on hover
  - Separator: Subtle dividers between navigation sections if needed
  - Badge: Version indicator "v1.0" with muted styling
  
- **Customizations**:
  - Custom navigation component using flexbox with pill-style buttons
  - Gradient text and border utilities for accent highlights
  - Custom backdrop-blur wrapper for sticky header
  - View container with fade animation wrapper (framer-motion)
  
- **States**:
  - Navigation pills: Default (muted text), Hover (slight glow), Active (gradient underline + bright text)
  - Cards: Default (subtle border), Hover (border brightens slightly for future interactive cards)
  - Focus states: Cyan ring with appropriate offset for keyboard navigation
  
- **Icon Selection**:
  - Emoji icons used for navigation (🎓 📝 👨‍🏫 ⚙️) - playful yet professional, universally recognizable
  - Future: Use Phosphor icons for settings controls and interactive elements
  
- **Spacing**:
  - Page padding: px-6 md:px-8 (24px mobile, 32px desktop)
  - Section gaps: gap-8 (32px between major sections)
  - Card padding: p-8 md:p-10 (32px mobile, 40px desktop)
  - Navigation items: gap-2 (8px between pills)
  - Content max-width: 1200px centered
  
- **Mobile**:
  - Navigation: Horizontal scroll with snap points on very small screens, wraps on tablets
  - Cards: Full width with appropriate padding reduction
  - Typography: Slightly reduced sizes (H2: 28px → 24px on mobile)
  - Touch targets: Minimum 44px height for navigation items
  - Sticky header: Reduced padding on mobile to maximize content space
