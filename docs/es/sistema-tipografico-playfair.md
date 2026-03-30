# Sistema tipográfico recomendado (eje en **Playfair Display** + **Montserrat**)

## 1) Lectura crítica del estado actual

Hoy el proyecto tiene dos superficies con criterios tipográficos distintos:

- `prototype/web-v1` prioriza `Plus Jakarta Sans` + `Lora` + `IBM Plex Mono`.
- La landing raíz usa serif/sans de sistema (`Iowan/Palatino` + `Inter`).

Esto produce buena legibilidad local, pero poca continuidad de marca entre `/` y `web-v1`.

## 2) Propuesta repensada (con Montserrat)

Tomar **Playfair Display** como familia principal de identidad y sumar **Montserrat** como familia operativa universal de UX/UI.

Arquitectura final propuesta:

1. **Brand / Editorial:** `Playfair Display`
2. **UI / Producto:** `Montserrat`
3. **Lectura larga de soporte:** `Inter` (opcional, como capa secundaria)
4. **Datos / Telemetría:** `IBM Plex Mono`

> Regla práctica: Playfair define tono y jerarquía; Montserrat sostiene flujo de interacción.

## 3) Roles por tipo de contenido

### A) Jerarquía editorial (primaria)
**Fuente:** `Playfair Display`

Aplicar a:
- Hero H1.
- H2 de secciones narrativas (Vision, System, Outcomes).
- Titulares de cierre/debrief y citas de alto peso dramático.

### B) UX/UI operativa (subordinada principal)
**Fuente:** `Montserrat`

Aplicar a:
- Navegación principal y secundaria.
- Botones, chips, tabs, pills, labels de formularios.
- Microcopy de estado/acción (feedback inmediato, hints, toggles).
- Cuerpo corto/medio dentro de pantallas interactivas.

### C) Lectura larga (subordinada secundaria)
**Fuente:** `Inter` (opcional)

Aplicar a:
- Párrafos extensos de documentación o bloques explicativos largos de landing.
- Texto donde prima velocidad de lectura sobre carácter editorial.

> Si se quiere máxima simplicidad, se puede unificar lectura larga en Montserrat y mantener sólo 3 familias totales.

### D) Señal técnica / datos
**Fuente:** `IBM Plex Mono`

Aplicar a:
- Watch/status, métricas EP/BT, tiempo, permit days, logs, seed/run signature.
- Metadatos técnicos y estados numéricos compactos.

## 4) Contrato de tokens recomendado

```css
:root {
  --font-brand: "Playfair Display", "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif;
  --font-ui: "Montserrat", "Plus Jakarta Sans", "Inter", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif;
  --font-reading: "Inter", "Montserrat", "Plus Jakarta Sans", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif;
  --font-data: "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Roboto Mono", monospace;
}
```

## 5) Mapeo rápido por uso

- **H1/H2 editoriales:** `--font-brand`
- **Navegación y CTAs:** `--font-ui`
- **Body de interfaz (corto/medio):** `--font-ui`
- **Body largo (landing/docs):** `--font-reading`
- **KPIs/watch/logs y telemetría:** `--font-data`

## 6) Guardrails de consistencia

- Evitar usar Playfair en controles de alta frecuencia (botones, chips, tablas densas).
- Mantener Montserrat como primera opción de interfaz para consistencia transversal.
- Reservar monoespaciada sólo para señal técnica.
- Limitar pesos activos por familia para reducir ruido visual:
  - Playfair: 500–700
  - Montserrat: 400–700
  - Inter: 400–500
  - Plex Mono: 400–500

## 7) Plan de adopción sugerido

1. **Fase 1:** declarar tokens `brand/ui/reading/data` con Montserrat como `--font-ui`.
2. **Fase 2:** migrar nav, botones y labels de landing + `web-v1` a Montserrat.
3. **Fase 3:** mantener Playfair en títulos editoriales y beats narrativos clave.
4. **Fase 4:** QA visual en móvil/desktop (legibilidad en tamaños pequeños, clipping, contraste).

---

Con esta combinación, el proyecto conserva una voz editorial fuerte (Playfair) y gana una capa UX/UI más limpia, consistente y moderna gracias a Montserrat.
