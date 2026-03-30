# Sistema tipográfico recomendado (eje en **Playfair Display**)

## 1) Contexto auditado (estado actual del repo)

En el estado actual:

- `prototype/web-v1` usa principalmente:
  - `--heading: Plus Jakarta Sans`
  - `--serif: Lora`
  - `--mono: IBM Plex Mono`. 
- La landing raíz (`/index.html`) usa una serif de sistema (`Iowan/Palatino`) y sans (`Inter`) sin una familia principal única compartida con `web-v1`.

Resultado: existe buena legibilidad funcional, pero falta **coherencia tipográfica transversal** entre landing, UI jugable y capas narrativas.

## 2) Decisión guía

Adoptar **Playfair Display** como familia principal de marca/editorial y organizar un sistema subordinado de tres capas:

1. **Marca / narrativa de alto impacto** → `Playfair Display`.
2. **Interfaz operativa** → `Plus Jakarta Sans` (o `Inter` como fallback de lectura extensa).
3. **Datos/telemetría/sistema** → `IBM Plex Mono`.

## 3) Arquitectura tipográfica propuesta por uso

### A. Brand & Editorial (primaria)
**Familia:** `Playfair Display`

Usar en:
- H1 hero (landing y pantallas clave de entrada).
- Títulos de sección editorial (manifest/system/outcomes).
- Títulos de cierre narrativo y frases de tono (“summit/debrief highlights”).

Razonamiento:
- Refuerza tono alpino-editorial premium.
- Mejora diferenciación jerárquica frente a UI operativa.

### B. UI operativa (subordinada 1)
**Familia:** `Plus Jakarta Sans`

Usar en:
- Navegación, botones, chips, tabs, labels de formularios.
- Textos de instrucciones cortas y microcopy de interacción.
- Listados y módulos de lectura rápida dentro del juego.

Razonamiento:
- Excelente legibilidad en tamaños bajos/medios.
- Encaja bien con interfaces densas y estados frecuentes.

### C. Cuerpo de lectura larga (subordinada 2)
**Familia:** `Inter` (opcional según superficie)

Usar en:
- Párrafos largos de documentación y landing.
- Bloques explicativos donde prima velocidad de lectura sobre tono.

Razonamiento:
- Inter suele rendir mejor en párrafos largos y UI híbrida.
- Puede convivir con Jakarta si se quiere simplificar a 2 familias sans.

### D. Sistema y datos (subordinada 3)
**Familia:** `IBM Plex Mono`

Usar en:
- Watch/status, métricas EP/BT, tiempo, permit, logs, semillas, signatures.
- Badges técnicos y etiquetas de estado compactas.

Razonamiento:
- Señala semánticamente “dato técnico”.
- Aumenta escaneabilidad de números y columnas.

## 4) Contrato mínimo de tokens (sugerido)

```css
:root {
  --font-brand: "Playfair Display", "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif;
  --font-ui: "Plus Jakarta Sans", "Inter", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif;
  --font-reading: "Inter", "Plus Jakarta Sans", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif;
  --font-data: "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Roboto Mono", monospace;
}
```

## 5) Mapa de aplicación rápida (qué usar en cada cosa)

- **H1/H2 editoriales:** `--font-brand`
- **CTAs/botones/nav:** `--font-ui`
- **Body copy corto/medio:** `--font-ui`
- **Body copy largo (landing/docs):** `--font-reading`
- **KPIs/watch/logs/metadatos técnicos:** `--font-data`
- **Citas narrativas destacadas:** `--font-brand` en itálica moderada

## 6) Guardrails para no perder consistencia

- Evitar más de **4 familias activas** en runtime.
- No usar `Playfair` en labels de alta frecuencia (fatiga visual en UI densa).
- Mantener monoespaciada sólo para señal técnica/datos (no para párrafos narrativos).
- Definir escalas y pesos por rol (no por componente aislado) para evitar deriva.

## 7) Secuencia de adopción recomendada

1. **Fase 1 (tokens):** introducir `--font-brand/ui/reading/data` y mapear alias existentes.
2. **Fase 2 (landing):** mover H1/H2 y quotes clave a `Playfair`.
3. **Fase 3 (web-v1):** usar `Playfair` en títulos narrativos/debrief; mantener UI densa en Jakarta/mono.
4. **Fase 4 (QA visual):** revisar contraste, tamaños mínimos y clipping en mobile.

---

Este enfoque mantiene el tono premium que buscas con Playfair, sin sacrificar legibilidad operativa ni claridad sistémica durante la toma de decisiones en juego.
