# Design Direction — Landing v2 (EN default + ES switch)

## Concepto rector

**"One brand, two languages, one clear path to play."**

La landing debe sentirse como extensión natural del prototipo activo: misma familia cromática emocional (sunset), misma seriedad sistémica, onboarding más global.

## Tono visual

- Premium sobrio, cálido y nocturno.
- Contraste controlado con acentos ochre/ice del sistema web-v1.
- Profundidad por capas ligeras, sin efectos ruidosos.

## Principios UX

1. EN como idioma inicial para alcance internacional.
2. Selector de idioma EN/ES visible y persistente.
3. CTA primaria inequívoca: jugar web-v1.
4. Secciones narrativas modulares y escaneables.
5. Incluir una sección de visualización documental que destaque whitepaper + roadmap y canales oficiales explícitos (GitHub + email).

## Sistema tipográfico

- Sans contemporánea (`Plus Jakarta Sans` fallback stack) para lectura clara.
- Escala jerárquica marcada en hero y secciones.
- Microcopy en caps/letter spacing para navegación y señales.

## Sistema de espaciado

- Escala tokenizada (`--space-1` a `--space-6`).
- Ritmo vertical alto entre bloques editoriales.
- Densidad controlada en mobile.

## Sistema de color

Alineado con palette sunset de web-v1:
- `--bg #251420`
- `--surface #331b2c`
- `--surface2 #422139`
- `--border #684056`
- `--ochre #ff9e5e`
- `--ice #ffc89a`
- `--text #f3d4bf`
- `--muted #c58f79`

## Uso de imágenes

- Cover art del proyecto como soporte hero principal.
- Encuadre 16:9 con borde tonal coherente.

## Motion

- Hover/focus sobrios.
- Sin animaciones ornamentales pesadas.
- `prefers-reduced-motion` respetado globalmente.

## Layout

- Header sticky con nav + switch de idioma.
- Hero split responsive.
- Secciones modulares: vision → system → status → outcomes → final CTA.

## Responsive

- Mobile-first.
- Split layout a partir de desktop amplio.
- CTAs wrap sin pérdida de legibilidad.

## Accesibilidad

- Skip link.
- Focus visible consistente.
- Landmarks semánticos.
- Botones de idioma con `aria-pressed`.
- Traducción de atributos clave (`alt`) y metadatos.
