# WorkRail Brand Guidelines

**Version:** 1.0  
**Official Brand Color:** Amber `#F59E0B`

---

## 🎨 Brand Color

### Amber `#F59E0B`

```css
--workrail-brand: #F59E0B
```

**RGB:** `245, 158, 11`  
**HSL:** `43°, 93%, 50%`

---

## Why Amber? 🚦

In railway signaling:
- 🔴 **RED** = Stop, danger, blocked
- 🟡 **AMBER** = Proceed with awareness, guided, structured ← **WorkRail**
- 🟢 **GREEN** = Clear, validated, complete

**WorkRail is the amber signal** - guiding AI from chaos to structure.

### Brand Positioning:
> "The gold standard for AI workflow orchestration."

---

## Logo Files 📁

### Black Logo (Light Backgrounds)
- **File:** `assets/logo.svg`
- **Use:** Light backgrounds, README, documentation

### White Logo (Dark Backgrounds)
- **File:** `assets/logo-white.svg`
- **Use:** Dark mode, maximum contrast

### Amber Logo (Dark Backgrounds, Brand Moments)
- **File:** `assets/logo-amber.svg`
- **Use:** Marketing, hero sections, presentations (dark slides only)

---

## Logo Usage Rules

### ✅ Correct Usage

**Light Backgrounds:**
```
Use: BLACK logo (logo.svg)
```

**Dark Backgrounds:**
```
Default: WHITE logo (logo-white.svg)
Branding: AMBER logo (logo-amber.svg) ⭐
```

### ❌ Incorrect Usage

- Never use amber logo on light backgrounds (fails WCAG contrast)
- Never stretch or distort logo
- Never add effects (shadows, glows) to base logo files
- Never change logo colors beyond black/white/amber

---

## Accessibility (WCAG)

### Contrast Ratios:

| Logo Color | Background | Contrast | Rating | Use? |
|------------|------------|----------|--------|------|
| Amber | White | 2.15:1 | ❌ FAIL | NO |
| Amber | Dark (#18181B) | 8.25:1 | ✅ AAA | YES |
| White | Dark (#18181B) | 17.72:1 | ✅ AAA | YES |
| Black | White | 21.00:1 | ✅ AAA | YES |

**Key Takeaway:** Amber logo only works on dark backgrounds!

---

## Color Usage in UI

### Where to USE amber:

✅ Buttons and CTAs  
✅ Hover states  
✅ Active/selected states  
✅ Progress indicators  
✅ Badges and labels  
✅ Focus rings  
✅ Icons (on dark backgrounds)

### Where NOT to use amber:

❌ Body text on white  
❌ Small text on white  
❌ Logos on light backgrounds

---

## Responsive Logo (HTML)

Auto-switch based on user's theme:

```html
<picture>
  <source srcset="./assets/logo-white.svg" 
          media="(prefers-color-scheme: dark)">
  <img src="./assets/logo.svg" 
       alt="WorkRail Logo">
</picture>
```

---

## File Structure

```
assets/
  logo.svg              # Black (light backgrounds)
  logo-white.svg        # White (dark backgrounds)
  logo-amber.svg        # Amber (dark backgrounds, branding)
  logo.png              # Raster fallback

web/assets/images/
  favicon.ico           # Multi-size favicon
  favicon-16.png        # 16×16 black
  favicon-32.png        # 32×32 black
  favicon-white-16-clean.png   # Dark mode
  favicon-white-32-clean.png   # Dark mode
  icon-192.png          # PWA icon
  icon-512.png          # PWA icon
```

---

## Quick Reference Card

| Scenario | Logo to Use |
|----------|-------------|
| Light website/docs | `logo.svg` (black) |
| Dark website/docs | `logo-white.svg` (white) |
| Dark hero/marketing | `logo-amber.svg` (amber) ⭐ |
| README (GitHub) | `logo.svg` (black) |
| Presentations (light) | `logo.svg` (black) |
| Presentations (dark) | `logo-amber.svg` (amber) |
| Favicon | `favicon.ico` (black) |

---

## Testing Checklist

Before using logos:
- [ ] Black logo visible on white
- [ ] White logo visible on dark
- [ ] Amber logo only on dark backgrounds
- [ ] Buttons/CTAs have sufficient contrast
- [ ] Focus states are visible (3:1 minimum)

---

**Questions?** All logo files are ready in `assets/` and properly optimized.
