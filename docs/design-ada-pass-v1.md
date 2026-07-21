# DUNJUNZ design + ADA pass (EMA council, 2026-07)

## Council verdict (P0)

Shell was center-stacked with **sub-10px Press Start** body copy (0.34–0.55rem), dim muted colors failing AA, actions buried in the footer, and unstyled auth fields. In-canvas dialog/help was too tight.

## Shipped changes

### Shell layout
- **Top menubar**: brand left, actions right (Journal / Settings / Account / Feedback)
- **Main grid**: game canvas + optional **Controls** side panel (≥960px)
- **Footer**: copyright + note, left-aligned, no action clutter
- Skip link to game container

### Typography
| Role | Font | Size | Line-height |
|------|------|------|-------------|
| Logo / nav / buttons | Press Start 2P | ≥10px (0.625rem) | ~1.5 |
| Body / forms / blurbs | IBM Plex Mono | 14–16px | 1.75–1.9 |
| Journal titles | Press Start | 10px | 1.65 |
| Journal blurbs | Plex Mono | 14px | 1.9 |

### ADA
- Higher contrast muted text (`#a8b0c4` / `#8b95ab`)
- Global `:focus-visible` amber ring
- Min control height ~40px
- `prefers-reduced-motion` kills CRT scan animation
- Do **not** shrink body text further on mobile

### In-game (UIScene)
- Dialog 12px + lineSpacing 12, taller panel
- HUD row text 9–12px
- Inventory labels 8px + looser lineSpacing

## Do not
- Drop Press Start entirely
- SaaS-ify into Inter + white cards
- Shrink mobile copy below floors

## Later (P1)
- Focus trap inside modals + restore focus on close
- Phaser inventory help still dense on small panels — further spacing pass
- Optional larger HUD_H if more HUD metrics land
