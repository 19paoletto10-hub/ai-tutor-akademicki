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

### AI Tutor Chat Interface
- **Functionality**: Full-featured chat interface with AI-powered academic tutoring using GPT-4o with active teaching methodology
- **Purpose**: Provides interactive Q&A learning experience with step-by-step explanations following a structured teaching format
- **Trigger**: User types question and presses Enter or clicks send button
- **Progression**: User enters question → Message appears in chat → AI typing indicator shows → AI response appears with structured markdown formatting (definition → intuition → example → sources) → Conversation history persists in localStorage → User can continue conversation
- **Success criteria**: Messages save to localStorage (max 50 messages), markdown renders correctly, typing indicator provides feedback, auto-scroll to new messages, conversation maintains context, welcome message displays on first load

### Chat Message Display
- **Functionality**: Differentiated message bubbles for user and AI with markdown rendering
- **Purpose**: Clear visual distinction between participants and rich content formatting
- **Trigger**: Message sent or received
- **Progression**: Message data received → Markdown parsed → HTML rendered → Animated entrance → Timestamp displayed
- **Success criteria**: User messages show gradient background, AI messages show avatar and label, code blocks have syntax highlighting, tables render properly, timestamps show relative time in Polish

### Quick Prompt Suggestions
- **Functionality**: Sidebar with pre-written example questions
- **Purpose**: Help users get started and demonstrate chat capabilities
- **Trigger**: User clicks on suggestion button
- **Progression**: User clicks suggestion → Text auto-fills and sends → AI responds → User sees example interaction
- **Success criteria**: Prompts are contextually relevant, clicking sends immediately, suggestions are helpful for new users

### Conversation Persistence with Storage Management
- **Functionality**: Intelligent local browser storage of chat history using localStorage (key: 'tutor_chat_history') with automatic trimming and quota management
- **Purpose**: Maintain conversation context across sessions with privacy-first approach while preventing storage quota issues
- **Trigger**: Automatic on message send/receive, loads on component mount
- **Progression**: Message created → Content truncated to max 4000 characters → Saved to localStorage → Messages trimmed to max 50 entries → Available on page reload → User can clear via confirmation dialog or export to markdown file
- **Success criteria**: History persists across page reloads with max 50 messages and 4000 chars per message, QuotaExceededError handled gracefully with automatic trimming and toast notification ("Pamięć pełna — starsza historia została usunięta"), clear function shows confirmation dialog, no data sent to external services

### Clear Chat Confirmation
- **Functionality**: Alert dialog that confirms chat history deletion before proceeding
- **Purpose**: Prevent accidental data loss and provide clear feedback about action consequences
- **Trigger**: User clicks "Wyczyść rozmowę" button in sidebar
- **Progression**: User clicks clear button → Confirmation dialog appears → User can cancel or confirm → On confirm, all messages except welcome message are removed → Dialog closes
- **Success criteria**: Dialog clearly explains consequences, cancel button works, confirm button clears chat and closes dialog, welcome message remains after clearing

### Conversation Export
- **Functionality**: Export full conversation history as a downloadable Markdown file
- **Purpose**: Allow users to save and review their learning conversations outside the app
- **Trigger**: User clicks "📥 Eksportuj rozmowę" button in sidebar
- **Progression**: User clicks export button → Markdown file is generated with header, formatted messages, and separators → Browser download initiated → File saved with timestamp
- **Success criteria**: Markdown file includes header "# Rozmowa z AI Tutorem — {date}", each message formatted as "## Student" or "## Tutor" with content and --- separators, filename includes date in ISO format, button disabled when no messages exist

### Student Profile with Adaptive Level System
- **Functionality**: Persistent student profile tracking learning level (1-5), weak topics (max 10), recent mistakes (max 5), and quiz history (max 10 grades 2-5)
- **Purpose**: Enable AI to adapt explanation complexity and focus to student's demonstrated knowledge level
- **Trigger**: Profile loads on app start, updates after quiz completion
- **Progression**: Quiz completed → Grade added to history → If 3+ quizzes exist, calculate average of last 3 → If avg ≥ 4.5 and level < 5, increment level with toast "🎉 Awans! Poziom X" → If avg ≤ 2.5 and level > 1, decrement level with toast "📚 Poziom obniżony do X — poćwicz jeszcze!" → Profile displayed in sidebar → Profile context prepended to all AI prompts
- **Success criteria**: Level adjusts automatically after quiz grading based on rolling 3-quiz average, profile data persists in localStorage (key: 'student_profile'), profile displayed in sidebar shows level (1-5 visual indicator), weak topics as pills, and quiz average, AI prompts include profile context block with level, weak topics, last mistakes, and quiz average

### Responsive Chat Layout
- **Functionality**: Chat area and sidebar adapt to screen size (70/30 split on desktop, stacked on mobile)
- **Purpose**: Optimal layout for different device sizes
- **Trigger**: Viewport width changes
- **Progression**: Layout detects screen size → Adjusts chat/sidebar positioning → Maintains usability
- **Success criteria**: Sidebar stacks below chat on mobile, message bubbles adapt width, input area remains accessible, scrolling works smoothly

## Edge Case Handling

- **Rapid Navigation Clicks**: Debounce or queue view transitions to prevent animation conflicts
- **Deep Linking**: Default to Tutor view on initial load; future enhancement for URL-based view state
- **Keyboard Navigation**: Tab key navigation through nav items with visible focus states
- **Reduced Motion**: Respect prefers-reduced-motion for users sensitive to animations
- **Long Content**: Ensure sticky header doesn't obscure content; proper spacing below header
- **localStorage Quota Exceeded**: Automatically trim oldest messages when storage quota is reached, show toast notification to user
- **Very Long Messages**: Truncate messages exceeding 4000 characters before storage to prevent quota issues
- **Empty Conversation Export**: Disable export button when no messages exist in conversation
- **Level Boundaries**: Level clamped between 1-5, cannot go below or above these limits regardless of quiz performance
- **Insufficient Quiz Data**: Level adjustment only triggers after 3+ quizzes completed to ensure reliable average

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
