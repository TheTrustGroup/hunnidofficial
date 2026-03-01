# Hunnid Official — Color System

## Brand primary (blue)

- **Tailwind:** `primary-50` … `primary-900` (see `tailwind.config.js`).
- **Main shade:** `primary-500` = `#5cacfa` (matches logo).
- **Use for:** Primary buttons, links, focus rings, selection highlights, cart badge, atmospheric glows, CTAs (Sign in, Add product, New sale, Save, etc.).

## Semantic red (errors & destructive only)

- **Use for:** Error banners, validation messages, destructive actions (Void sale, Delete, Clear cart), “Out of stock”, “Overdue”, low/out-of-stock badges.
- **Do not use** for primary CTAs or selection states.

## Global styles

- **Focus visible:** `#5cacfa` (primary) — `src/index.css`.
- **Input focus:** `#5cacfa` border + primary glow — `.input-field:focus`.
- **Selection:** `rgba(92, 172, 250, 0.2)` (primary).

## Summary

| Use case              | Color   | Example classes / tokens        |
|-----------------------|--------|----------------------------------|
| Primary CTA           | Primary| `bg-primary-500 hover:bg-primary-600` |
| Focus ring            | Primary| `focus:border-primary-400 focus:ring-primary-100` |
| Selected / active tab | Primary| `text-primary-500 bg-primary-50`     |
| Error / destructive   | Red    | `bg-red-50 text-red-700`, `bg-red-500` for destructive buttons |
