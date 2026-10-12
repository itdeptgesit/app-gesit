# GESIT Platform — Agent UI Rules

## 1. PURPOSE

Build GESIT as one professional enterprise platform covering IT, CSL, and future modules.

UI must be:

* Corporate
* Clean
* Dense
* Consistent
* Intentional
* Human-designed

Avoid:

* Generic SaaS/dashboard templates
* AI-looking UI
* Excessive rounded cards
* Excessive shadows
* Gradients
* Glassmorphism
* Decorative animations
* Random colors
* Excessive whitespace

**Core rule: content and workflow may differ by module; visual language must not.**

---

## 2. STACK

Use:

* Next.js + TypeScript
* Tailwind CSS
* shadcn/ui
* Radix UI
* Lucide React

Reuse existing components before creating new ones.

Do not add dependencies unless necessary.

---

## 3. DESIGN TOKENS

Use a 4px spacing rhythm.

### Spacing

```text
4  8  12  16  20  24  28  32  40  48  64
```

Preferred Tailwind:

```text
gap/p/m: 1,2,3,4,5,6,7,8,10,12,16
```

Avoid arbitrary values such as:

```text
p-[19px]
gap-[13px]
h-[37px]
```

unless technically necessary.

### Component sizes

```text
Sidebar        240px
Collapsed      64px
Header         56px

Button         36px
Button sm      32px
Button lg      40px

Input/Select   36px

Table row      48px
Compact row    40px
Table header   40px

Badge          24px
Avatar         32px

Icon           16px
Nav icon       18px
Feature icon   20–24px

Card padding   16px
Large padding  24px

Field gap      16px
Section gap    24px
Major gap      32px
Toolbar gap    8px
```

### Radius

```text
sm   4px
md   6px  ← default
lg   8px
full       ← avatar/pill only
```

### Dialog / Drawer

```text
Dialog small   425px
Dialog medium  512px
Dialog large   640px
Dialog XL      768px

Drawer         400px
Drawer large  480px
Drawer XL      560px
```

Use the smallest size that fits the content.

---

## 4. COLORS

Use semantic design tokens.

Brand:

```text
Navy      #103065
Gold      #BC9C33
Background #F5F5F5
White      #FFFFFF
Foreground #171717
Muted      #737373
```

Do not invent module-specific palettes.

Module identity may use subtle accents only.

---

## 5. TYPOGRAPHY

Use one font system consistently:

```text
Geist or Inter
```

Hierarchy:

```text
Page title    text-2xl font-semibold
Section       text-lg font-semibold
Body          text-sm
Metadata      text-xs
Table         text-sm
```

Do not use oversized marketing-style headings.

---

## 6. STANDARD PAGE

Use this structure unless there is a clear UX reason not to:

```text
App Shell
├── Sidebar
├── Header
└── Main
    ├── PageHeader
    ├── Toolbar / Filters
    └── Content
```

Page header:

```text
Title
Short description
Primary action
```

Default main padding:

```text
p-6 lg:p-8
```

Default section spacing:

```text
space-y-6
```

---

## 7. DATA-DENSE UI

GESIT is an operational enterprise application.

Prefer:

* Compact layouts
* Clear hierarchy
* Information density
* Tables
* Filters
* Direct actions

Avoid:

* Huge cards
* Large empty areas
* Excessive padding
* Decorative dashboard metrics

**Do not add UI elements merely because there is empty space.**

---

## 8. TABLES

Default:

```text
Row          48px
Compact row  40px
Header       40px
Cell         px-4 py-3
Text         text-sm
```

Toolbar:

```text
Search + Filters + Actions
```

Use compact action buttons or `MoreHorizontal`.

Avoid oversized rows, excessive icons, and colorful table backgrounds.

---

## 9. FORMS

Default:

```text
Field gap       16px
Label → input   6px
Section gap     24px
```

Use shadcn form patterns.

Complex forms should use logical sections.

Use:

```text
Dialog   → short action/form
Drawer   → quick detail/edit
Page     → complex workflow
```

---

## 10. STATUS

Use the same semantic meaning everywhere:

```text
Success      → success
Pending      → warning
Rejected     → destructive
Draft        → neutral
In Progress  → info
Completed    → success
```

Do not randomly assign colors.

Prefer a shared `StatusBadge`.

---

## 11. COMPONENT REUSE

Shared components belong in:

```text
components/
├── ui/
└── shared/
```

Common shared patterns:

```text
PageHeader
DataTable
DataToolbar
FilterBar
StatusBadge
EmptyState
ErrorState
ConfirmDialog
DetailDrawer
FormSection
SectionHeader
StatCard
ActivityTimeline
FileUploader
```

Module-specific components:

```text
components/it/
components/csl/
```

Never duplicate a shared pattern just to change its styling.

---

## 12. NAVIGATION

Use one global shell:

```text
Overview

IT
  Dashboard
  Helpdesk
  Assets
  Activity
  Purchase

CSL
  Dashboard
  Requests
  Agreements
  Budgeting
  Planner

Administration
  Users
  Roles
  Companies
```

Navigation must respect permissions.

Users should only see modules they can access.

---

## 13. RESPONSIVE

Support:

* Desktop
* Laptop
* Tablet
* Mobile

Desktop is the primary environment.

Do not simply shrink desktop layouts.

Tables may scroll, hide secondary columns, or become cards when appropriate.

---

## 14. ANTI-AI RULE

Never add visual elements simply because they are trendy.

Avoid:

```text
Gradients
Glassmorphism
Huge rounded cards
AI sparkle icons
Floating blobs
Excessive shadows
Excessive animations
Random illustrations
Random emojis
Purple AI gradients
```

Do not use words such as:

```text
AI-powered
Smart
Magic
Intelligent
```

unless they represent a real product feature.

The code may be AI-generated.

**The UI must not look AI-generated.**

---

## 15. IMPLEMENTATION RULE

Before creating a page/component:

1. Inspect existing patterns.
2. Reuse before creating.
3. Follow the tokens above.
4. Keep the UI compact.
5. Add only elements that support the user's task.

Do not redesign existing UI without a reason.

Do not introduce arbitrary spacing, colors, radius, or component sizes.

---

## 16. FINAL RULE

When uncertain:

```text
Consistency > novelty
Clarity > decoration
Reuse > duplication
Business value > visual trend
Density > excessive whitespace
Simple > over-engineered
```

**Every page must look like it belongs to GESIT.**
