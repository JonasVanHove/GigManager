# GigManager Interactive Animations Guide (v1.12.1)

## Overview

GigManager now features **professional-grade interactive animations** that make every interaction feel smooth, responsive, and delightful. This includes menu animations, dropdown transitions, form interactions, badge animations, and much more.

## 🎬 Animation Categories

### 1. Menu & Navigation Animations

#### Profile Menu (Top Right)
- **Type**: `menu-enter` - Smooth slide-down with fade
- **Duration**: 0.2s (quick, responsive)
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - Smooth spring curve
- **Effect**: Dropdown appears with elegant animation

```html
<div className="... menu-enter">
  <!-- Profile menu content -->
</div>
```

#### Mobile Menu (Side Panel)
- **Type**: `mobile-menu-enter` - Slide from left
- **Duration**: 0.35s (smooth, noticeable)
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1)
- **Backdrop**: `mobile-menu-backdrop` - Fade-in animation for overlay
- **Effect**: Full-screen navigation slides in from left edge

```html
<div className="mobile-menu-enter">
  <!-- Mobile navigation -->
</div>
```

### 2. Expand/Collapse Animations

#### Accordion Sections
- **Type**: `accordion-enter` / `accordion-exit`
- **Effect**: Content slides down/up with scale animation
- **Duration**: 0.35s enter, 0.25s exit
- **Used in**: DashboardSummary cards, collapsible sections
- **Physics**: ScaleY transform for smooth height transitions

```tsx
{isExpanded && (
  <div className="accordion-enter">
    {/* Expandable content */}
  </div>
)}
```

#### GigCard Content
- **Type**: `animate-expand` (custom keyframe)
- **Duration**: 0.3s
- **Effect**: Max-height and opacity transition
- **Smooth**: No jarring visibility changes

### 3. Badge & Chip Animations

#### Badge Entrance/Exit
- **Type**: `badge-enter` / `badge-exit`
- **Duration**: 0.25s
- **Effect**: Scale from 85% + fade-in, with upward movement
- **Used in**: Status badges, tags, pills
- **Emoji Enhancement**: Added emojis for visual clarity
  - 💕 Charity gigs
  - ⏳ Tentative bookings
  - ✅ Payment received
  - 🎵 Band management
  - 💰 Manager payments
  - 👥 Band direct payment
  - ⚠️ Payment overdue

```html
<span className="badge-enter">💕 Charity</span>
```

### 4. Form Interactions

#### Input Focus Animation
- **Type**: `inputFocus`
- **Duration**: 0.3s
- **Effect**: Box-shadow grows outward (ripple effect)
- **Applied to**: input, textarea, select fields

```css
input:focus {
  animation: inputFocus 0.3s ease-out forwards;
}
```

#### Checkbox Check Animation
- **Type**: `checkboxCheck`
- **Duration**: 0.3s
- **Effect**: Scale 0.7 → 1.1 → 1.0 (spring action)
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - Bouncy

```html
<input type="checkbox" /> <!-- Auto-animated on check -->
```

#### Radio Button Animation
- **Type**: `radioPulse`
- **Duration**: 0.4s
- **Effect**: Pulse shadow expands outward
- **Used in**: Radio button selections

### 5. Modal Animations

#### Modal Backdrop
- **Type**: `modal-backdrop-enter`
- **Duration**: 0.2s
- **Effect**: Fade in from 0 to 1 opacity
- **Applied to**: ConfirmDialog, SettingsModal, GigForm, BulkEditor

#### Modal Content
- **Type**: `modal-content-enter`
- **Duration**: 0.3s
- **Effect**: Slide up 32px + fade-in
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)

```tsx
<div className="modal-backdrop-enter">
  <div className="modal-content-enter">
    {/* Modal body */}
  </div>
</div>
```

### 6. Tab Switching Animations

#### Tab Content
- **Type**: `tab-content-enter` / `tab-content-exit`
- **Duration**: 0.3s enter, 0.2s exit
- **Effect**: Slide from right + fade-in
- **Used in**: Dashboard tabs, section switching

```tsx
{activeTab === 'gigs' && (
  <div className="tab-content-enter">
    {/* Tab content */}
  </div>
)}
```

### 7. List Item Animations

#### Staggered List Items
- **Type**: `animate-fade-in` + `animate-stagger-{1-10}`
- **Duration**: 0.4s per item
- **Delay**: 0.05s - 0.5s (cascading effect)
- **Effect**: Items fade in with progressive delays
- **Used in**: Gig lists, filter results

```tsx
{gigs.map((gig, idx) => (
  <div key={gig.id} className={`animate-fade-in animate-stagger-${Math.min(idx + 1, 10)}`}>
    <GigCard gig={gig} />
  </div>
))}
```

### 8. Button Interactions

#### Button Press
- **Type**: `button-press`
- **Duration**: 0.2s
- **Effect**: Scale from 1 → 0.96 → 1 (tactile press)

#### Button Glow
- **Type**: `button-glow` (optional)
- **Duration**: 2s infinite
- **Effect**: Box-shadow pulse (for CTAs)

```html
<button className="... button-press">Click me</button>
```

### 9. Tooltip Animations

#### Tooltip Entrance
- **Type**: `tooltip-enter`
- **Duration**: 0.2s
- **Effect**: Fade-in from -4px translateY with ease-out
- **Applied to**: All tooltip components

### 10. Row/Item Highlight

#### Row Highlight on Interaction
- **Type**: `row-highlight`
- **Duration**: 0.6s
- **Effect**: Background color pulse (0-50%-0% opacity)
- **Used in**: Selected rows, highlighted items

### 11. Loading & Special Effects

#### Shimmer Loading
- **Type**: `shimmer-load`
- **Duration**: 2s infinite
- **Effect**: Gradient sweep from left to right
- **Used in**: Skeleton loaders, placeholder animations

#### Soft Pulse
- **Type**: `pulse-soft`
- **Duration**: 2s infinite
- **Effect**: Opacity 1 → 0.8 → 1 (breathing effect)
- **Used in**: Loading indicators, pending states

## 🎨 Color & Emoji Enhancements

### Status Badges with Emojis

```
💕 Charity              - Pink background, indicates charity event
⏳ Tentative            - Amber background, booking not confirmed
✅ Client Paid          - Green background, payment received
🎵 Band Unpaid          - Amber background, band payment pending
💰 Manager pays         - Amber background, manager arranges payment
👥 Band payment direct  - Slate background, band handles own payment
⚠️ Payment overdue      - Red background, urgent attention needed
```

## 🔧 Technical Implementation

### Global CSS Animations

All animations are defined in `src/app/globals.css` with:
- **Keyframe definitions** for each animation type
- **Reusable classes** for consistent application
- **GPU acceleration** via `transform` and `opacity`
- **Performance optimized** (60fps target)

### Tailwind Integration

Animations are added to `tailwind.config.cjs`:
- Custom animations extend Tailwind's default animations
- Named consistently for easy discovery
- Configurable durations and easing functions

## 📱 Responsive Behavior

- **Desktop**: Full animations with hover states
- **Tablet**: Consistent animations with touch feedback
- **Mobile**: Optimized animations (no unnecessary complexity)

All animations respect `prefers-reduced-motion` media query for accessibility.

## 🚀 Performance Tips

1. **Stagger delays**: Max 10 items per list (0.5s total cascade)
2. **Duration**: Keep animations 0.2s - 0.6s for responsiveness
3. **GPU acceleration**: Use `transform` and `opacity` only
4. **No animation loops**: Except for loading indicators

## 🎯 Use Cases by Component

| Component | Animation Type | Effect |
|-----------|---------------|--------|
| **Dashboard** | Stagger fade-in + expand | Gigs cascade onto screen |
| **GigCard** | Fade-in + expand | Card entrance + content reveal |
| **Profile Menu** | Menu-enter | Dropdown slides down |
| **Mobile Menu** | Mobile-menu-enter | Sidebar slides from left |
| **Modals** | Backdrop + content enter | Professional dialog appearance |
| **Badges** | Badge-enter | Status indicators pop in |
| **Buttons** | Transition smooth + press | Interactive feedback |
| **Tooltips** | Tooltip-enter | Context help appears smoothly |
| **Forms** | Input focus + checkbox check | Form interactions feel responsive |
| **Tabs** | Tab-content-enter | Tab switching feels fluid |

## 🎬 Animation Easing Functions

- **Spring**: `cubic-bezier(0.34, 1.56, 0.64, 1)` - Bouncy, playful
- **Smooth**: `cubic-bezier(0.4, 0, 0.2, 1)` - Professional, standard
- **Ease-out**: `ease-out` - Deceleration, natural feel

## 🔍 Debugging Animations

### Chrome DevTools
1. Open DevTools (F12)
2. Go to **Animations** panel
3. Slow down animations: **⏱️ × 0.1** (10x slower)
4. Pause and step through frame-by-frame

### Test prefers-reduced-motion
```bash
# In DevTools Console:
# Change accessibility settings to test reduced motion
```

## 📋 Accessibility Considerations

- All animations have non-animated fallbacks
- Respect `prefers-reduced-motion` system preference
- Keep animations brief (< 1 second)
- Don't rely on animations for critical information
- Use semantic HTML with ARIA labels

## 🎨 Customization

### Add New Animation

1. **Define keyframe in `globals.css`**:
```css
@keyframes myCustomAnimation {
  from { /* ... */ }
  to { /* ... */ }
}
```

2. **Add to `tailwind.config.cjs`**:
```js
animation: {
  "my-custom": "myCustomAnimation 0.4s ease-out"
}
```

3. **Apply to component**:
```tsx
<div className="animate-my-custom">
  {/* Content */}
</div>
```

## 📊 Animation Distribution

- **Entrance animations**: 40% (fade-in, slide-in, scale-in)
- **Interactive animations**: 30% (buttons, badges, forms)
- **Navigation animations**: 15% (menus, modals, tabs)
- **Special effects**: 15% (shimmer, pulse, highlights)

## 🎯 Future Enhancements

- Gesture-based animations for swipe interactions
- Parallax scrolling effects
- Page transition animations
- Micro-interactions for form validation
- Advanced loading state visualizations

## 📞 Support

For animation-related issues or questions:
1. Check this guide first
2. Review the specific component's implementation
3. Inspect animations in Chrome DevTools
4. Test with `prefers-reduced-motion` enabled

---

**Version**: 1.12.1  
**Last Updated**: May 12, 2026  
**Status**: Production Ready ✨
