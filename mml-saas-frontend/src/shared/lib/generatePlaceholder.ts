/**
 * Generates a stable color based on string hash
 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate pleasant colors by constraining hue and using consistent saturation/lightness
  const hue = Math.abs(hash % 360);
  const saturation = 65; // Not too vibrant
  const lightness = 55; // Medium brightness

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Extracts initials from a name (max 2 letters)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word: take first 2 letters
    return words[0].slice(0, 2).toUpperCase();
  }

  // Multiple words: take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generates a placeholder SVG data URL for projects without logos
 * @param name - Project name
 * @returns SVG data URL
 */
export function generateProjectPlaceholder(name: string): string {
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  const svg = `
    <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" fill="${bgColor}" rx="8"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="18"
        font-weight="600"
        fill="white"
      >${initials}</text>
    </svg>
  `.trim();

  // Encode SVG to data URL
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  return `data:image/svg+xml,${encoded}`;
}
