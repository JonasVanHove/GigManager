# GigManager Animation System Guide

## Overview

GigManager now features a comprehensive animation system that makes the app feel smooth and professional. All animations are built with Tailwind CSS and are optimized for performance.

## Available Animations

### Core Animations

#### Entrance Animations
- **`animate-fade-in`** - Smooth opacity fade (0.4s) - Default for most elements
- **`animate-fade-in-fast`** - Quick fade (0.2s) - For interactive feedback
- **`animate-fade-in-slow`** - Leisurely fade (0.6s) - For hero sections
- **`animate-slide-in-down`** - Slides down with fade (0.4s) - For headers
- **`animate-slide-in-up`** - Slides up with fade (0.4s) - For notifications
- **`animate-slide-in-left`** - Slides left with fade (0.4s) - For sidebars
- **`animate-slide-in-right`** - Slides right with fade (0.4s) - For panels
- **`animate-scale-in`** - Scales from 95% with fade (0.3s) - For badges
- **`animate-bounce-in`** - Bounces in with elasticity (0.5s) - For emphasis

### Special Effects
- **`animate-pulse-soft`** - Subtle pulsing (2s) - For loading states
- **`animate-shimmer`** - Loading shimmer effect (2s) - For skeleton loaders
- **`animate-slide-and-fade`** - Combined effect (0.4s) - For content blocks

### Expand/Collapse
- **`animate-expand`** - Smooth content expansion (0.3s)
- **`animate-collapse`** - Smooth content collapse (0.3s)

## Usage Patterns

### 1. Gig Cards
```tsx
// Individual cards fade in with stagger
<div className="animate-fade-in animate-stagger-1">
  <GigCard ... />
</div>

// Expand/collapse animation
{effectiveIsExpanded && (
  <div className="animate-expand">
    {/* Expanded content */}
  </div>
)}
```

### 2. Staggered Lists
For lists of gigs or items, use stagger delays (1-10):

```tsx
{gigs.map((gig, idx) => (
  <div key={gig.id} className={`animate-fade-in animate-stagger-${Math.min(idx + 1, 10)}`}>
    <GigCard gig={gig} />
  </div>
))}
```

This creates a cascading entrance effect where each item appears in sequence:
- Item 1: 0.05s delay
- Item 2: 0.10s delay
- Item 3: 0.15s delay
- ... up to Item 10: 0.50s delay

### 3. Modal Animations
All modals use combined backdrop + content animations:

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 modal-backdrop-enter">
  <div className="rounded-xl shadow-2xl modal-content-enter">
    {/* Modal content */}
  </div>
</div>
```

- **`modal-backdrop-enter`** - Fades in backdrop (0.2s)
- **`modal-content-enter`** - Slides up with fade (0.3s, cubic-bezier timing)

### 4. Smooth Transitions
Use transition utilities for interactive states:

```tsx
<button className="transition-smooth hover:bg-brand-100 hover:shadow-md">
  Interactive Button
</button>

<div className="transition-smooth-300">
  Content that transitions all properties over 300ms
</div>
```

### 5. Toast Notifications
```tsx
// Slides up with fade automatically
<div className="animate-slide-in-up">
  <Toast message="Success!" type="success" />
</div>
```

## Component Animations

### Dashboard
- **Gig lists**: Staggered fade-in for active and handled gigs
- **Expand/collapse**: Smooth height transitions
- **Transitions**: Button states, color changes

### GigCard
- **Entry**: Fade-in on mount
- **Expand/collapse**: Smooth height animation with fade
- **Hover states**: Shadow and color transitions

### Modals (ConfirmDialog, SettingsModal, GigForm, BulkEditor)
- **Backdrop**: Fade in (0.2s)
- **Content**: Slide up with fade (0.3s)
- **Exit**: Fade out (reverse animation)

### LandingPage
- **Hero section**: Cascading animations
  - Badge: Scale-in (0.3s)
  - Heading: Slide-down (0.4s)
  - Paragraph: Fade-in with 0.2s delay
  - CTA buttons: Fade-in with 0.4s delay

### Notifications
- **Toasts**: Slide-up with fade

## Global CSS Utilities

### Stagger Classes
```css
.animate-stagger-1 { animation-delay: 0.05s; }
.animate-stagger-2 { animation-delay: 0.1s; }
/* ... up to 10 */
```

### Transition Utilities
```css
.transition-smooth          /* 200ms cubic-bezier */
.transition-smooth-300      /* 300ms cubic-bezier */
.transition-smooth-500      /* 500ms cubic-bezier */
```

### Loading Effects
```css
.shimmer-load               /* Shimmer animation for skeletons */
```

## Performance Considerations

1. **Hardware Acceleration**: All animations use `transform` and `opacity` for GPU acceleration
2. **Duration**: Keep animations between 0.2s - 0.6s for responsiveness
3. **Stagger Limits**: Maximum 10 stagger items; beyond that, animations wrap to avoid excessive delays
4. **Prefersfers reduced-motion**: Consider adding media queries for accessibility:
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation: none !important;
       transition: none !important;
     }
   }
   ```

## Customization

### Tailwind Config
All animations are defined in `tailwind.config.cjs`:
- Keyframes: Define animation sequences
- Animation utilities: Set duration and easing

To add new animations:
```js
animation: {
  "custom": "customKeyframe 0.5s ease-out"
}
```

### Global CSS
Additional animations in `src/app/globals.css`:
- Modal animations
- Expand/collapse
- Loading effects
- Tooltip animations

## Browser Support

All animations use standard CSS features supported in:
- Chrome/Edge 88+
- Firefox 78+
- Safari 13.1+
- Mobile browsers (iOS Safari 13.4+, Android Chrome 88+)

## Best Practices

1. **Use stagger for lists**: Creates visual hierarchy and guidance
2. **Keep modals consistent**: Always use backdrop + content animations
3. **Prefer fade over others**: Fade-in is safest for general content
4. **Respect user preferences**: Test with `prefers-reduced-motion`
5. **Match brand timing**: Keep animations feeling snappy (not sluggish)
6. **Use transitions for state changes**: Buttons, hover effects, focus states

## Examples

### Adding animation to a new component
```tsx
// Container with entrance animation
<div className="animate-fade-in">
  {/* Component content */}
</div>

// List with stagger
<div className="grid gap-4">
  {items.map((item, idx) => (
    <div key={item.id} className={`animate-fade-in animate-stagger-${Math.min(idx + 1, 10)}`}>
      <ItemCard item={item} />
    </div>
  ))}
</div>

// Interactive element with smooth transition
<button className="transition-smooth hover:bg-blue-100 hover:shadow-lg">
  Click me
</button>
```

## Testing Animations

### In Development
1. Open DevTools (F12)
2. Check the Animations panel
3. Slow down animations: Shift+P (toggle throttling)
4. Disable animations: Search `prefers-reduced-motion`

### Performance
Use Chrome DevTools Performance tab to:
- Record animation performance
- Check for jank (frame drops)
- Monitor GPU usage
- Verify 60fps target

## Version History

- **v1.12.0**: Initial animation system with stagger, modals, and transitions
