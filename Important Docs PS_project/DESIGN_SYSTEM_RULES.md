# Design System Rules

> **IMPORTANT:** This document defines the styling rules for the entire frontend. 
> All components MUST follow these rules. Do NOT create separate stylesheets or hardcode colors.

---

## 🎨 Color Palette: Nord Orange

All colors are defined as CSS variables in `src/app/globals.css`. 

**NEVER hardcode hex colors in components.** Always use `var(--name)`.

### Core Variables

```
BACKGROUNDS
--bg              #2e3440   Main background
--bg-secondary    #3b4252   Panels, cards, nodes
--bg-tertiary     #434c5e   Toolbars, hover backgrounds  
--bg-hover        #4c566a   Hover state

BORDERS
--border          #4c566a   Default borders
--border-light    #5c6678   Subtle borders, hover

TEXT
--text            #eceff4   Primary text (headings, content)
--text-secondary  #d8dee9   Secondary text
--muted           #7b88a1   Labels, hints, disabled

ACCENT (Orange)
--accent          #d08770   Primary accent - selection, active, primary buttons
--accent-hover    #e09980   Accent hover state
--accent-muted    rgba(208,135,112,0.2)  Accent backgrounds, glows

SEMANTIC
--success         #a3be8c   Green - success states
--warning         #ebcb8b   Yellow - warnings
--danger          #bf616a   Red - errors, destructive actions
```

---

## ✅ DO

```tsx
// Use CSS variables
<div className="bg-[var(--bg-secondary)] text-[var(--text)] border-[var(--border)]">

// Use Tailwind with CSS variables
<button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]">

// Use semantic classes from globals.css
<button className="btn btn-primary">Save</button>

// Reference existing variables for new components
const style = { background: 'var(--bg-secondary)' };
```

## ❌ DON'T

```tsx
// NEVER hardcode colors
<div style={{ background: '#3b4252' }}>  // ❌ BAD

// NEVER create new color variables in components
const colors = { panel: '#2e3440' };  // ❌ BAD

// NEVER use arbitrary Tailwind colors
<div className="bg-slate-800">  // ❌ BAD

// NEVER create separate CSS files for components
// component.module.css  // ❌ BAD
```

---

## 📦 Component Styling Pattern

### For new components, follow this pattern:

```tsx
// MyComponent.tsx
import { cn } from "@/lib/utils";

type MyComponentProps = {
  className?: string;
  children: React.ReactNode;
};

export function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div
      className={cn(
        // Base styles using CSS variables
        "rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]",
        "p-4 text-[var(--text)]",
        // Hover/focus states
        "hover:border-[var(--border-light)]",
        "focus-within:ring-2 focus-within:ring-[var(--accent-muted)]",
        // Allow override
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## 🏗️ Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER          bg-[var(--bg-secondary)]                    │
│                 border-b border-[var(--border)]             │
├───────────────────────────────────┬─────────────────────────┤
│                                   │                         │
│  GRAPH CANVAS                     │  SIDE PANEL             │
│  bg-[var(--bg)]                   │  bg-[var(--bg-secondary)]│
│                                   │                         │
│  Nodes: bg-[var(--bg-secondary)]  │  Sections use:          │
│  Selected: border-[var(--accent)] │  --bg-tertiary for tabs │
│                                   │  --border for dividers  │
│                                   │                         │
└───────────────────────────────────┴─────────────────────────┘
```

---

## 🧩 Common UI Elements

### Buttons
```tsx
// Primary action (Save, Share, Play)
<button className="btn btn-primary">Save</button>

// Secondary action
<button className="btn">Cancel</button>

// Danger action (Delete)
<button className="btn btn-danger">Delete</button>

// Or with Tailwind directly:
<button className="px-4 py-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
```

### Inputs
```tsx
<input 
  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
/>
```

### Labels
```tsx
<label className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
  Field Name
</label>
```

### Tabs
```tsx
<div className="flex border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
  <button className="tab active">Content</button>
  <button className="tab">Style</button>
</div>
```

### Collapsible Section
```tsx
<div className="section-header">
  <span>▼</span>
  <span>Section Title</span>
</div>
<div className="section-content">
  {/* content */}
</div>
```

### Cards / Panels
```tsx
<div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
  {/* content */}
</div>
```

### Badges
```tsx
// Media badge (cyan)
<span className="badge badge-media">IMG</span>

// Flag badge (yellow)  
<span className="badge badge-flag">VAR</span>
```

---

## 🎯 Selection & Focus States

```tsx
// Selected item (node, list item, etc.)
className={cn(
  "border border-[var(--border)]",
  selected && "border-[var(--accent)] ring-2 ring-[var(--accent-muted)]"
)}

// Hover state
"hover:bg-[var(--bg-hover)] hover:border-[var(--border-light)]"

// Focus state (inputs, buttons)
"focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] focus:outline-none"
```

---

## 📁 File Organization

```
src/
├── app/
│   └── globals.css          # ✅ ALL CSS variables defined here
│
├── features/
│   └── editor/
│       └── ui/
│           └── SomePanel.tsx  # Uses CSS vars, NO separate CSS file
│
└── ui-core/
    └── primitives/          # shadcn components (already styled)
```

**Rule:** Components should NOT have their own `.css` or `.module.css` files. All styling is done via:
1. Tailwind classes with CSS variables: `bg-[var(--bg-secondary)]`
2. The `cn()` utility for conditional classes
3. Global classes from `globals.css` (`.btn`, `.tab`, etc.)

---

## 🔧 When Creating New Features

Before writing any component, remember:

1. **Check globals.css** for existing variables and utility classes
2. **Use CSS variables** for all colors: `var(--name)`
3. **Use Tailwind** for spacing, layout, typography
4. **Use cn()** for conditional styling
5. **NO new CSS files** — everything goes through Tailwind + CSS vars
6. **NO hardcoded colors** — always reference variables

---

## Quick Reference Card

| Need | Use |
|------|-----|
| Background | `bg-[var(--bg)]` or `--bg-secondary`, `--bg-tertiary` |
| Text | `text-[var(--text)]` or `--muted` |
| Border | `border-[var(--border)]` |
| Accent/Selection | `--accent`, `--accent-muted` |
| Success | `--success` |
| Warning | `--warning` |  
| Danger | `--danger` |
| Hover bg | `hover:bg-[var(--bg-hover)]` |
| Focus ring | `focus:ring-[var(--accent-muted)]` |
