/**
 * Responsive tags for web layouts.
 *
 * Spread onto a react-native-web element: <View {...rw('stack pad')} style={...} />
 * It renders as data-r="stack pad", and the media queries in components/common/WebAppShell.tsx
 * apply phone/tablet overrides. Native ignores the prop.
 *
 * Tokens (phone ≤ 767px unless noted):
 *   pad      side padding 24px (tablet) / 16px (phone)
 *   pad0     remove side padding (phone)
 *   vpad     vertical padding 24px
 *   stack    row → column
 *   full     full width, no fixed width
 *   hide-sm  hidden on phones
 *   card     inner padding 20px
 *   h1 / h2  smaller headline sizes
 *   sidebar  portal sidebar becomes a wrapping top strip
 *   scpad    side padding on a ScrollView's content container
 *   wrap / gap-sm / tight / logo-sm / right-sm   small layout tweaks for nav bars and buttons
 */
export function rw(tokens: string): object {
  return { dataSet: { r: tokens } };
}
