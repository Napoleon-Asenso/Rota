/**
 * Design Token to CSS Variables Converter
 * 
 * Converts matisse-tokens-all.json into a structured, production-ready CSS stylesheet.
 * Supports:
 *  - Theme switching (:root / [data-theme="light"] vs [data-theme="dark"])
 *  - Automatic system dark mode preference (@media (prefers-color-scheme: dark))
 *  - Semantic grouping with readable CSS section headers
 *  - Sanitization of CSS variable names (e.g. decimal spacing tokens)
 *  - CLI execution and programmatic Node.js API
 */

const fs = require('fs');
const path = require('path');

/**
 * Sanitizes a token key into a valid, standard CSS custom property name.
 * Replaces dots (e.g. 'spacing-0.5' -> 'spacing-0-5') and spaces.
 * 
 * @param {string} key
 * @returns {string}
 */
function sanitizeKey(key) {
  return key
    .trim()
    .replace(/\./g, '-')
    .replace(/\s+/g, '-');
}

/**
 * Formats a value for CSS custom property output.
 * Adds quotes to font families if needed, handles numeric line heights and font weights.
 * 
 * @param {string} key
 * @param {string|number} value
 * @returns {string}
 */
function formatCssValue(key, value) {
  if (typeof value === 'number') {
    return value.toString();
  }

  // If it's a font-family token without quotes and doesn't already have a fallback stack
  if (key.startsWith('font-family-') && typeof value === 'string') {
    if (!value.includes(',') && !value.startsWith('"') && !value.startsWith("'")) {
      const fallback = key.includes('mono') 
        ? 'ui-monospace, monospace' 
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      return `"${value}", ${fallback}`;
    }
  }

  return value.toString();
}

/**
 * Transforms the Matisse design tokens object into formatted CSS.
 * 
 * @param {object} tokens - Parsed JSON tokens
 * @param {object} options
 * @param {boolean} [options.includePrefersColorScheme=true] - Include @media (prefers-color-scheme: dark)
 * @param {string} [options.prefix=''] - Optional prefix for variables (e.g. 'matisse-')
 * @returns {string} Generated CSS string
 */
function convertTokensToCss(tokens, options = {}) {
  const {
    includePrefersColorScheme = true,
    prefix = ''
  } = options;

  const varPrefix = prefix ? `--${prefix}-` : '--';
  const lines = [];

  lines.push('/**');
  lines.push(' * DESIGN SYSTEM TOKENS');
  lines.push(' * Generated automatically from matisse-tokens-all.json');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(' */');
  lines.push('');

  // 1. Root & Light Theme
  lines.push(':root,');
  lines.push('[data-theme="light"] {');

  // Colors (Light Mode)
  if (tokens.color && tokens.color.light) {
    lines.push('  /* ========================================================');
    lines.push('     Colors (Light Theme)');
    lines.push('     ======================================================== */');
    for (const [key, value] of Object.entries(tokens.color.light)) {
      lines.push(`  ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
    }
    lines.push('');
  }

  // Typography
  if (tokens.typography) {
    lines.push('  /* ========================================================');
    lines.push('     Typography');
    lines.push('     ======================================================== */');
    for (const [key, value] of Object.entries(tokens.typography)) {
      lines.push(`  ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
    }
    lines.push('');
  }

  // Spacing
  if (tokens.spacing) {
    lines.push('  /* ========================================================');
    lines.push('     Spacing Scale');
    lines.push('     ======================================================== */');
    for (const [key, value] of Object.entries(tokens.spacing)) {
      const sanitized = sanitizeKey(key);
      lines.push(`  ${varPrefix}${sanitized}: ${formatCssValue(key, value)};`);
      // Also provide dot-escaped alias if key contained a dot (e.g. spacing-0.5)
      if (key.includes('.')) {
        lines.push(`  ${varPrefix}${key.replace(/\./g, '\\.')}: ${formatCssValue(key, value)};`);
      }
    }
    lines.push('');
  }

  // Border Radius
  if (tokens.borderRadius) {
    lines.push('  /* ========================================================');
    lines.push('     Border Radius');
    lines.push('     ======================================================== */');
    for (const [key, value] of Object.entries(tokens.borderRadius)) {
      lines.push(`  ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
    }
    lines.push('');
  }

  // Shadows
  if (tokens.shadows) {
    lines.push('  /* ========================================================');
    lines.push('     Box Shadows & Glows');
    lines.push('     ======================================================== */');
    for (const [key, value] of Object.entries(tokens.shadows)) {
      lines.push(`  ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
    }
    lines.push('');
  }

  // Elevation
  if (tokens.elevation) {
    lines.push('  /* ========================================================');
    lines.push('     Material Elevation');
    lines.push('     ======================================================== */');
    for (const [key, value] of Object.entries(tokens.elevation)) {
      lines.push(`  ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
    }
  }

  lines.push('}');
  lines.push('');

  // 2. Dark Theme (Explicit Attribute)
  if (tokens.color && tokens.color.dark) {
    lines.push('/* ========================================================');
    lines.push('   Dark Theme Override ([data-theme="dark"])');
    lines.push('   ======================================================== */');
    lines.push('[data-theme="dark"] {');
    for (const [key, value] of Object.entries(tokens.color.dark)) {
      lines.push(`  ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
    }
    lines.push('}');
    lines.push('');

    // 3. Media Query Dark Mode (prefers-color-scheme: dark without explicit [data-theme="light"])
    if (includePrefersColorScheme) {
      lines.push('/* ========================================================');
      lines.push('   Automatic System Dark Mode');
      lines.push('   ======================================================== */');
      lines.push('@media (prefers-color-scheme: dark) {');
      lines.push('  :root:not([data-theme="light"]) {');
      for (const [key, value] of Object.entries(tokens.color.dark)) {
        lines.push(`    ${varPrefix}${sanitizeKey(key)}: ${formatCssValue(key, value)};`);
      }
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || path.resolve(__dirname, 'matisse-tokens-all.json');
  const outputPath = args[1] || path.resolve(__dirname, 'matisse-tokens.css');

  if (!fs.existsSync(inputPath)) {
    console.error(`[Error] Input tokens file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const rawContent = fs.readFileSync(inputPath, 'utf8');
    const tokens = JSON.parse(rawContent);

    const cssContent = convertTokensToCss(tokens);
    fs.writeFileSync(outputPath, cssContent, 'utf8');

    console.log(`[Success] Converted ${inputPath} -> ${outputPath}`);
    console.log(`[Stats] File size: ${(Buffer.byteLength(cssContent, 'utf8') / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error('[Error] Failed to convert design tokens:', err.message);
    process.exit(1);
  }
}

// Allow CLI run or module import
if (require.main === module) {
  main();
}

module.exports = {
  convertTokensToCss,
  sanitizeKey,
  formatCssValue
};
