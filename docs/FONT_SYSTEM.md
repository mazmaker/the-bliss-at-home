# Font System - The Bliss Massage at Home

## Primary Font

**Noto Sans Thai** - Used for all text (Thai, English, and numbers)

### Why Noto Sans Thai?
- Excellent Thai language support
- Consistent rendering across Thai and English text
- Good readability on all devices
- Complete weight range (100-900)
- Free and open source from Google

## Implementation

### 1. Google Fonts Import

Each app includes the following import in `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100;200;300;400;500;600;700;800;900&family=Noto+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap');
```

### 2. Tailwind Configuration

Each app's `tailwind.config.js` extends the font family:

```javascript
fontFamily: {
  sans: ['Noto Sans Thai', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
}
```

### 3. CSS Root Variable

Set in `:root` in each app's `index.css`:

```css
:root {
  font-family: 'Noto Sans Thai', 'Noto Sans', system-ui, -apple-system, sans-serif;
}
```

## Font Weights

Use Tailwind utility classes for font weights:

- `font-thin` - 100
- `font-extralight` - 200
- `font-light` - 300
- `font-normal` - 400 (default)
- `font-medium` - 500
- `font-semibold` - 600
- `font-bold` - 700
- `font-extrabold` - 800
- `font-black` - 900

## Usage Examples

```jsx
// Thai text
<h1 className="text-2xl font-bold">ยินดีต้อนรับ</h1>

// English text
<p className="text-base font-normal">Welcome to The Bliss Massage at Home</p>

// Mixed content
<span className="font-medium">ราคา: 1,500 THB</span>
```

## Apps Using This System

1. **Admin App** (Port 3001) - ✅ Updated
2. **Customer App** (Port 3002) - ✅ Updated
3. **Hotel App** (Port 3003) - ✅ Updated
4. **Staff/Staff App** (Port 3004) - ✅ Updated

## Shared UI Package

The `packages/ui` components inherit font settings from the consuming apps. A Tailwind preset is available at `packages/ui/tailwind.preset.js` for consistent configuration.

## Best Practices

1. **Avoid font-family overrides** - Use the default sans font stack
2. **Use appropriate weights** - Light (300-400) for body, Medium (500-600) for emphasis, Bold (700+) for headings
3. **Maintain readability** - Minimum 14px for body text, 16px on mobile
4. **Test with Thai content** - Always test UI with real Thai text, not Lorem Ipsum

## Migration from Anantason

Previous font was "Anantason". All references have been updated to "Noto Sans Thai" for better language support and consistency.

---

**Last Updated:** January 26, 2026