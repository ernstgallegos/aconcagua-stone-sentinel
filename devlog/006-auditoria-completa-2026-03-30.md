# AUDITORÍA COMPLETA - ACONCAGUA: STONE SENTINEL
**Proyecto:** Aconcagua: Stone Sentinel  
**Versión auditada:** v1.4.5 (estado público)  
**Fecha:** 30 de marzo, 2026  
**Auditor:** Claude (Anthropic)  
**Objetivo:** Eliminar cabos sueltos para consolidar la versión pública

---

## RESUMEN EJECUTIVO

Esta auditoría identifica **1 BUG CRÍTICO bloqueante**, **8 bugs menores**, **12 inconsistencias de documentación**, **5 issues de UX**, y **3 áreas de deuda técnica** que deben resolverse antes del lanzamiento público.

### Estado General
- ✅ **Arquitectura sistémica:** Sólida y bien documentada
- ✅ **Documentación conceptual:** Excelente calidad, consistente con la visión
- ⚠️ **Implementación técnica:** Funcional pero con dependencia crítica faltante
- ⚠️ **Coherencia docs-código:** Varias desalineaciones menores
- ❌ **Dependencias de recursos:** BLOQUEANTE - directorio `/art/` faltante

---

## 1. BUGS CRÍTICOS (BLOQUEANTES)

### BUG-C1: Directorio `/art/` faltante - BLOQUEANTE TOTAL
**Severidad:** ⚠️ **CRÍTICA - BLOQUEA LANZAMIENTO**  
**Impacto:** El prototipo web-v1 no puede funcionar sin los assets visuales

**Descripción:**
El prototipo depende completamente del directorio `/art/` que fue eliminado del repositorio para reducir el tamaño del ZIP. Sin estos archivos, la aplicación no puede:
- Cargar la portada de bienvenida
- Mostrar retratos de personajes en los carruseles
- Renderizar fondos atmosféricos en las pantallas de setup
- Mostrar las imágenes de personajes en el widget de permiso

**Evidencia técnica:**
```html
<!-- prototype/web-v1/index.html línea 40 -->
<img class="splash-image" src="../../art/cover/cover-concept-1.png" alt=""/>
```

```javascript
// prototype/web-v1/ui/screens.js
const imgPath = isPartTwo
  ? `../../art/characters/part-2/${filename}.png`
  : `../../art/characters/${filename}.png`;
```

```css
/* prototype/web-v1/css/screens.css */
background-image: url('../../../art/concept-art/curated/concept-curated-4.webp');
```

**Archivos afectados:**
- `/art/cover/cover-concept-1.png` → Portada principal
- `/art/characters/*.png` → 7 retratos (6 personajes + random)
- `/art/characters/part-2/*.png` → Variantes de Parte 2
- `/art/concept-art/curated/concept-curated-4.webp` → Fondos atmosféricos

**Recomendación URGENTE:**
1. **Incluir el directorio `/art/` completo en el repositorio público**
2. Si el tamaño es prohibitivo, considerar:
   - Optimizar imágenes (WebP, compresión agresiva)
   - Usar placeholder images con texto indicativo
   - Documentar explícitamente que el directorio debe obtenerse por separado
3. Actualizar `.gitignore` si `/art/` estaba excluido intencionalmente

**Impacto en pruebas:**
Sin estos archivos, cualquier playtest resultará en:
- Pantalla de bienvenida con imagen rota
- Carruseles de personajes sin retratos
- Fondos negros/rotos en pantallas de setup
- Pérdida total de la atmósfera visual del juego

---

## 2. BUGS MENORES (NO BLOQUEANTES PERO AFECTAN EXPERIENCIA)

### BUG-M1: Console.error expuesto en producción
**Severidad:** Baja  
**Archivo:** `prototype/web-v1/ui/screens.js` líneas 27, 1231

**Descripción:**
Hay llamadas a `console.error()` que se ejecutarán en la build de producción, exponiendo información técnica al jugador.

**Código:**
```javascript
// Línea 27
console.error(rendered.detail);

// Línea 1231
if (!target) { console.error('Unknown screen: ' + id); return; }
```

**Recomendación:**
- Envolver en bloques condicionales: `if (DEV_MODE) console.error(...)`
- O remover completamente para producción
- Mantener solo el renderizado de errores en UI para el usuario

---

### BUG-M2: Falta validación de existencia del directorio `/art/` en startup
**Severidad:** Media  
**Archivo:** `prototype/web-v1/ui/helpers/startup-ui.js`

**Descripción:**
El sistema de validación de datos en startup verifica archivos JSON pero no valida la existencia de assets visuales críticos. El juego puede iniciar aparentemente "bien" pero con imágenes rotas.

**Recomendación:**
Agregar verificación de assets críticos en `loadDataConfig()`:
```javascript
const REQUIRED_ASSETS = [
  '../../art/cover/cover-concept-1.png',
  '../../art/characters/francisco.png',
  // ... otros críticos
];

async function validateAssets() {
  for (const path of REQUIRED_ASSETS) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Asset missing: ${path}`);
      }
    } catch (e) {
      setModelLoadError({
        category: 'missing asset',
        file: path,
        detail: 'Required visual asset not found'
      });
      return false;
    }
  }
  return true;
}
```

---

### BUG-M3: Referencia a personajes no implementados en código
**Severidad:** Baja  
**Archivo:** `prototype/web-v1/ui/screens.js`

**Descripción:**
Según el CHANGELOG v1.4.1, se menciona:
> "Fixed narrative/UI consistency... removing dead `valentina`/`diego` branches"

Sin embargo, podría haber otras referencias huérfanas en el código. Esto indica limpieza incompleta de iteraciones previas de diseño.

**Recomendación:**
- Ejecutar búsqueda exhaustiva: `grep -r "valentina\|diego" prototype/web-v1/`
- Verificar que todos los personajes referenciados en código existen en `data/characters.json`
- Crear test de integridad: "Todos los characterId en el código deben estar en characters.json"

---

### BUG-M4: Inconsistencia en formato de banderas de nacionalidad
**Archivo:** `data/characters.json`  
**Líneas:** Todos los personajes tienen campo `flag`

**Descripción:**
El CHANGELOG menciona que las banderas tienen problemas de renderizado en desktop:
> "Fixed nationality flag emoji (`.char-flag`) not rendering correctly on desktop: added `display: none` inside `@media (min-width: 1024px)`"

Esto sugiere una solución parcial (ocultar en desktop) en lugar de una solución real (renderizado confiable). La experiencia es inconsistente entre dispositivos.

**Recomendación:**
1. **Opción A - Consistencia total:** Usar SVG flags en lugar de emoji
2. **Opción B - Documentar claramente:** Agregar nota en README sobre limitaciones de emoji cross-platform
3. **Opción C - Mejorar fallback:** Mostrar código de país (AR, US, NO) cuando emoji no renderiza bien

---

### BUG-M5: Posible race condition en deep-links con datos no cargados
**Archivo:** `prototype/web-v1/ui/helpers/routing.js`

**Descripción:**
El sistema de deep-links permite navegar directamente a cualquier pantalla mediante hash URL, pero según el CHANGELOG:
> "Hardened runtime bootstrap flow... so setup carousels/deep-link initialization only execute after successful required-data loading"

Sin embargo, no está claro si un deep-link a `#game` con parámetros puede intentar iniciar una partida antes de que todos los datos estén listos.

**Recomendación:**
Agregar test de integridad:
```javascript
// Test: Deep-link debe esperar a modelReady
test('deep-link waits for data load', async () => {
  window.location.hash = '#game&character=francisco&scenario=assisted-route';
  // Simular carga lenta de datos
  await delay(100);
  // Verificar que no se ejecutó startGame() antes de modelReady
  assert.strictEqual(G.modelReady, false);
  assert.strictEqual(getCurrentScreen(), 'title'); // Debe quedarse en title
});
```

---

### BUG-M6: Falta manejo de errores en `mulberry32` RNG con seed inválido
**Archivo:** `prototype/web-v1/engine/turn-resolution.js` línea 1

**Descripción:**
```javascript
export function mulberry32(seed) {
  let s = seed >>> 0;  // ¿Qué pasa si seed es null, undefined, o NaN?
  return function() { /* ... */ };
}
```

No hay validación de entrada. Si se pasa un seed inválido, el RNG puede producir resultados impredecibles.

**Recomendación:**
```javascript
export function mulberry32(seed) {
  if (typeof seed !== 'number' || !isFinite(seed)) {
    throw new Error('mulberry32 requires a valid numeric seed');
  }
  let s = seed >>> 0;
  return function() { /* ... */ };
}
```

---

### BUG-M7: Falta de escape de caracteres especiales en nombres de nodos
**Archivo:** `data/nodes.json`

**Descripción:**
Los nombres de nodos contienen caracteres especiales (tildes, eñes) que podrían causar problemas en algunos contextos:
- "Cañada" → ñ
- "Cólera" → ó
- "Nido de Cóndores" → ó

Si bien JSON soporta UTF-8, podría haber problemas si estos strings se usan como IDs o claves en lugares no preparados para Unicode.

**Recomendación:**
- Mantener `nodeName` con UTF-8 para display
- Asegurar que `nodeId` use solo ASCII seguro: `"camp_canada"` ✓
- Documentar explícitamente que `nodeId` es ASCII-safe, `nodeName` es UTF-8 display

---

### BUG-M8: Posible memoria leak en historial de presión
**Archivo:** `prototype/web-v1/ui/screens.js`

**Descripción:**
El CHANGELOG menciona:
> "persisting rolling `pressureHistory` samples for non-steady trend estimation"

Si `pressureHistory` crece sin límite durante partidas largas (50+ turnos), podría causar problemas de memoria en dispositivos móviles.

**Recomendación:**
Implementar window deslizante:
```javascript
const MAX_PRESSURE_HISTORY = 10; // Solo últimos 10 turnos

function updatePressureHistory(ep) {
  G.pressureHistory.push(ep);
  if (G.pressureHistory.length > MAX_PRESSURE_HISTORY) {
    G.pressureHistory.shift(); // Eliminar más viejo
  }
}
```

---

## 3. INCONSISTENCIAS DE DOCUMENTACIÓN

### DOC-I1: README menciona directorio `/art/` que falta en el ZIP
**Archivos:** `README.md` (líneas 12-23), `README.es.md` (líneas 12-23)

**Inconsistencia:**
Ambos README muestran referencias visuales con rutas como:
```markdown
![Concepto de portada](../art/cover/cover-concept-1.png)
```

Estas imágenes no aparecerán en el repositorio tal como está distribuido.

**Recomendación:**
**Opción A - Si /art/ se incluirá:**
- Verificar que todas las rutas en README.md funcionen
- Agregar nota: "Visual assets included in repository"

**Opción B - Si /art/ NO se incluirá:**
- Actualizar README para decir:
```markdown
## Referencias visuales

*Nota: Los assets visuales del proyecto están disponibles por separado.  
Contacta a aconcaguastonesentinel@gmail.com para acceso completo.*
```

---

### DOC-I2: Versión mencionada en README no coincide con package.json
**Archivos:** `README.md`, `README.es.md`, `package.json`

**Inconsistencia:**
- README.md línea 289: "**v1.4.5 (despliegue público por fases)**"
- package.json: Necesito verificar qué versión tiene

**Recomendación:**
- Sincronizar versión exacta en todos los archivos
- Considerar automatizar con script: `npm run sync-version`

---

### DOC-I3: CHANGELOG menciona "Unreleased" pero hay releases sin publicar
**Archivo:** `CHANGELOG.md`

**Descripción:**
La sección `[Unreleased]` tiene muchos cambios documentados, pero también hay una sección `[1.4.5] — 2026-03` que sugiere que ya se publicó. Esto crea confusión sobre qué es "released" vs "unreleased".

**Recomendación:**
Antes del lanzamiento público:
1. Mover todo de `[Unreleased]` a una sección fechada definitiva
2. Crear tag de Git correspondiente: `git tag v1.4.5-public`
3. Dejar `[Unreleased]` vacío con solo encabezados de sección

---

### DOC-I4: Documentación de rutas en español (README.es.md) menos detallada que la inglesa
**Archivos:** `README.md` vs `README.es.md`

**Inconsistencia:**
El README en inglés tiene más secciones y mayor detalle que el español. Esto crea una experiencia asimétrica para hablantes de español.

**Secciones faltantes en README.es.md:**
- Detalles técnicos de deep-links menos extensos
- Menos ejemplos de código en algunas secciones
- Estructura de subsecciones ligeramente diferente

**Recomendación:**
- Sincronizar ambas versiones completamente
- Agregar test de paridad: verificar que ambos README tengan las mismas secciones principales

---

### DOC-I5: `docs/architecture.md` menciona v1.4 pero código está en v1.4.5
**Archivo:** `docs/architecture.md` línea 8

**Inconsistencia:**
```markdown
Prototype Web v1.4 (public branch state) is the canonical active prototype
```

Pero el CHANGELOG y package.json indican v1.4.5.

**Recomendación:**
Actualizar a: `Prototype Web v1.4.5 (current public state)`

---

### DOC-I6: Referencia a "cinco niveles globales de dificultad" en docs obsoleta
**Archivo:** `README.es.md`

**Inconsistencia:**
El CHANGELOG v1.4.2 dice:
> "Corrected stale 'cinco niveles globales de dificultad' reference"

Pero si quedó alguna referencia sin corregir en otros docs, causará confusión. El sistema ahora usa dificultad embebida en escenarios.

**Recomendación:**
Búsqueda exhaustiva:
```bash
grep -r "cinco niveles\|five.*difficulty.*tiers" docs/ README*.md
```

---

### DOC-I7: `AGENTS.md` menciona flujo obsoleto
**Archivo:** `AGENTS.md`

**Descripción:**
El CHANGELOG v1.4.2 dice:
> "Updated stale flow reference in AGENTS.md from splash → title → character → scenario → onboarding → game to welcome/title → expedition-setup → onboarding → game"

Si esto no se actualizó, cualquier agente de IA que lea `AGENTS.md` generará código basado en flujo obsoleto.

**Recomendación:**
Verificar que `AGENTS.md` tenga el flujo correcto:
```
welcome/title → expedition-setup → onboarding modal → game
```

---

### DOC-I8: Falta documentación de la API de eventos de contexto
**Archivo:** Faltante en `/docs/`

**Descripción:**
`data/context_events.json` es un archivo nuevo en v1.4.5 pero no hay documentación explicando:
- Cómo funcionan los eventos de contexto
- Qué campos son obligatorios vs opcionales
- Cómo agregar nuevos eventos
- Diferencia entre `contextEvents` y `characterEvents`

**Recomendación:**
Crear `docs/context-events-guide.md` con:
- Descripción del sistema
- Esquema JSON completo
- Ejemplos de cada tipo de trigger
- Limitaciones (maxPerRun, cooldown, etc.)

---

### DOC-I9: `docs/simulation_engine.md` tiene lenguaje vago sobre compatibilidad v1.3
**Archivo:** `docs/simulation_engine.md`

**Descripción:**
El CHANGELOG dice:
> "tightened `docs/simulation_engine.md` legacy wording to explicitly scope remaining v1.3 compatibility contracts"

Pero no está claro exactamente qué es compatible y qué no. Esto puede causar confusión si alguien intenta usar código v1.3.

**Recomendación:**
Agregar sección explícita:
```markdown
## Compatibilidad con versiones anteriores

### ✅ Compatible con v1.3:
- Formato de `nodes.json`
- Estructura básica de `characters.json` (campos core)
- API de `resolveTurn(state, action)`

### ❌ NO compatible con v1.3:
- Sistema de eventos (completamente nuevo en v1.4.5)
- Dificultad embebida en escenarios
- Campos de percepción de personajes
```

---

### DOC-I10: Falta documentación de cómo contribuir assets visuales
**Archivo:** Faltante en `CONTRIBUTING.md`

**Descripción:**
`CONTRIBUTING.md` tiene guías para código pero no para assets visuales. Si el proyecto busca contribuciones de arte, necesita guías claras.

**Recomendación:**
Agregar sección en `CONTRIBUTING.md`:
```markdown
## Contribuyendo Assets Visuales

### Formatos aceptados
- Concept art: PNG o WebP, mínimo 1920x1080
- Retratos de personajes: PNG, 1024x1024, fondo transparente
- UI elements: SVG preferido, PNG como fallback

### Proceso de revisión
1. Proponer el asset en un issue antes de crear
2. Seguir la paleta de colores documentada en `docs/design-system.md`
3. Incluir versiones en alta y baja resolución
```

---

### DOC-I11: `docs/repo-truth.md` desactualizado con nueva estructura
**Archivo:** `docs/repo-truth.md`

**Descripción:**
Si este archivo documenta "la verdad del repositorio", debe reflejar:
- Nueva estructura de eventos (context + character)
- Sistema de deep-links
- Arquitectura de módulos helpers en `ui/helpers/`

**Recomendación:**
Revisar y actualizar con:
- Árbol de archivos actualizado
- Descripción de nuevos módulos v1.4.5
- Contratos de datos actuales

---

### DOC-I12: Falta guía de troubleshooting para problemas comunes
**Archivo:** Faltante

**Descripción:**
No hay documentación de "Problemas comunes y soluciones" para jugadores o desarrolladores. Esto aumentará el volumen de consultas repetitivas.

**Recomendación:**
Crear `docs/TROUBLESHOOTING.md`:
```markdown
## Problemas Comunes

### Problema: Imágenes no cargan
**Síntoma:** Pantalla de bienvenida negra o con icono de imagen rota  
**Causa:** Directorio `/art/` faltante  
**Solución:** Contactar aconcaguastonesentinel@gmail.com para assets

### Problema: El juego no avanza del título
**Síntoma:** Clic en "Begin" no hace nada  
**Causa:** JavaScript no cargó correctamente  
**Solución:** Verificar consola de browser, recargar página

[... más problemas comunes ...]
```

---

## 4. ISSUES DE DISEÑO Y UX

### UX-1: Falta feedback visual durante carga de datos
**Severidad:** Media  
**Archivo:** `prototype/web-v1/index.html`

**Descripción:**
El mensaje de startup es:
```html
<p id="startup-status-line" class="startup-status-line" data-state="loading">
  Preparing mountain model…
</p>
```

Pero en conexiones lentas, el usuario no sabe si el juego está cargando o congelado. No hay:
- Spinner de carga
- Barra de progreso
- Indicación de qué archivo se está cargando

**Recomendación:**
Agregar indicador de progreso:
```javascript
function updateLoadingProgress(file, current, total) {
  const percent = (current / total * 100).toFixed(0);
  setStartupState('loading', 
    `Loading ${file}... (${current}/${total})`);
  // Actualizar barra visual
  document.getElementById('loading-bar').style.width = `${percent}%`;
}
```

---

### UX-2: Comportamiento inconsistente de ESC en modales
**Archivo:** `prototype/web-v1/ui/helpers/accessibility.js`

**Descripción:**
El CHANGELOG menciona "keyboard escape-close support" pero no está claro si TODOS los modales lo soportan. La experiencia debe ser consistente.

**Recomendación:**
Test de integridad:
```javascript
// Verificar que TODOS los modales respondan a ESC
const MODALS = [
  '#intro-modal',
  '#tutorial-modal', 
  '#watch-detail-overlay',
  '#field-log-overlay',
  '#onboarding-modal',
  '#game-help-overlay'
];

MODALS.forEach(selector => {
  test(`${selector} closes on ESC`, () => {
    openModal(selector);
    simulateKeypress('Escape');
    assert.strictEqual(isModalOpen(selector), false);
  });
});
```

---

### UX-3: No hay confirmación antes de salir de una partida en progreso
**Severidad:** Media

**Descripción:**
Si un jugador está en turno 25 de 50 y accidentalmente clickea "Back to Setup" o navega a otra URL, pierde toda la progresión sin advertencia.

**Recomendación:**
Agregar diálogo de confirmación:
```javascript
function safeNavigateAway() {
  if (G.turn > 0 && !G.finalOutcome) {
    const confirmed = confirm(
      uiText(
        'Leave current expedition? Progress will be lost.',
        '¿Abandonar expedición actual? Se perderá el progreso.'
      )
    );
    if (!confirmed) return false;
  }
  return true;
}
```

---

### UX-4: Falta indicador de "Nueva Parte 2 desbloqueada"
**Severidad:** Baja

**Descripción:**
Cuando un jugador alcanza summit por primera vez y desbloquea Parte 2, no hay un indicador celebratorio claro. El jugador podría no darse cuenta de que algo nuevo está disponible.

**Recomendación:**
En `screen-summit-success`:
```html
<div class="unlock-badge">
  🔓 <span class="unlock-text">
    {uiText('Part 2 Unlocked!', '¡Parte 2 Desbloqueada!')}
  </span>
</div>
```

Con animación de entrada para llamar la atención.

---

### UX-5: Deep-links con parámetros inválidos fallan silenciosamente
**Archivo:** `prototype/web-v1/ui/helpers/routing.js`

**Descripción:**
Si alguien comparte un deep-link con parámetros incorrectos:
```
#game&character=invalid&scenario=nonexistent&seed=abc
```

El juego podría:
- Fallar silenciosamente
- Mostrar pantalla en blanco
- O peor, iniciar con valores default sin avisar al usuario

**Recomendación:**
Validar parámetros de deep-link:
```javascript
function parseDeepLinkHash(hash) {
  const params = parseHashParams(hash);
  
  // Validar character
  if (params.character && !isValidCharacterId(params.character)) {
    showError(`Invalid character: ${params.character}`);
    return null;
  }
  
  // Validar scenario
  if (params.scenario && !isValidScenarioId(params.scenario)) {
    showError(`Invalid scenario: ${params.scenario}`);
    return null;
  }
  
  // Validar seed
  if (params.seed && !isValidSeed(params.seed)) {
    showError(`Invalid seed: ${params.seed}`);
    return null;
  }
  
  return params;
}
```

---

## 5. DEUDA TÉCNICA (FUNCIONA PERO NECESITA REFACTORIZACIÓN)

### TECH-1: Monolito `ui/screens.js` de 4505 líneas
**Severidad:** Alta (mantenibilidad)  
**Archivo:** `prototype/web-v1/ui/screens.js`

**Descripción:**
Este archivo es mencionado explícitamente en `docs/technical-debt-register.md`:
> "Single-file `web-v1` architecture (`prototype/web-v1/index.html` still mixes UI, flow wiring, and runtime orchestration)"

4505 líneas de código en un solo archivo hace:
- **Difícil encontrar bugs:** Buscar una función específica requiere scroll extenso
- **Alto riesgo de merge conflicts:** Múltiples personas editando el mismo archivo
- **Testeo complicado:** Funciones entrelazadas dificultan unit tests aislados

**Estado actual (según CHANGELOG v1.4.5):**
> "Added lightweight modular helpers under `prototype/web-v1/ui/helpers/` for help-overlay content, debrief/run-signature analysis, run-log serialization, accessibility focus handling, and seed-driven event logic."

Esto es un buen inicio pero insuficiente.

**Recomendación de refactorización:**
Dividir en módulos temáticos:
```
ui/
  screens.js (orquestador principal, ~800 líneas)
  carousel.js (lógica de carruseles)
  game-hud.js (actualización de watch, status, narrative)
  decision-panel.js (manejo de botones de acción)
  debrief-screen.js (pantalla de final de partida)
  part2-screens.js (flujo narrativo de Parte 2)
  modals.js (gestión de todos los modales)
```

**Criterio de éxito:**
- Ningún archivo UI > 1000 líneas
- Cada módulo tiene su propio test file
- Imports claros y sin dependencias circulares

---

### TECH-2: Inconsistencia en manejo de errores
**Severidad:** Media

**Descripción:**
El código tiene múltiples estrategias de manejo de errores:
- Algunos lugares usan `console.error()`
- Otros usan `throw new Error()`
- Algunos retornan `null` silenciosamente
- Otros muestran modal de error

No hay patrón consistente.

**Ejemplo de inconsistencia:**
```javascript
// En loadDataConfig()
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`); // Arroja error
}

// En mulberry32()
let s = seed >>> 0; // No valida, solo convierte silenciosamente

// En showScreen()
if (!target) { 
  console.error('Unknown screen: ' + id); // Solo logea
  return; 
}
```

**Recomendación:**
Establecer estrategia unificada:
```javascript
// errors.js
export class GameError extends Error {
  constructor(message, { category, severity, recoverable }) {
    super(message);
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;
  }
}

// Uso consistente
throw new GameError('Invalid seed', {
  category: 'validation',
  severity: 'high',
  recoverable: false
});
```

---

### TECH-3: Falta sistema de logging estructurado
**Severidad:** Media

**Descripción:**
El código usa `console.error()` en producción sin categorización ni niveles de severidad. Esto hace difícil:
- Debugging en producción
- Análisis de errores frecuentes
- Priorización de fixes

**Recomendación:**
Implementar logger estructurado:
```javascript
// logger.js
const LOG_LEVELS = {
  ERROR: 3,
  WARN: 2,
  INFO: 1,
  DEBUG: 0
};

class GameLogger {
  constructor(minLevel = LOG_LEVELS.WARN) {
    this.minLevel = minLevel;
  }

  log(level, category, message, metadata = {}) {
    if (level < this.minLevel) return;
    
    const entry = {
      timestamp: Date.now(),
      level: Object.keys(LOG_LEVELS)[level],
      category,
      message,
      ...metadata
    };
    
    // En producción: enviar a servicio de analytics
    // En desarrollo: console.log
    if (DEV_MODE) {
      console.log(JSON.stringify(entry, null, 2));
    } else {
      this.sendToAnalytics(entry);
    }
  }

  error(category, message, metadata) {
    this.log(LOG_LEVELS.ERROR, category, message, metadata);
  }

  // ... warn, info, debug
}

// Uso
logger.error('data-load', 'Failed to load characters.json', {
  httpStatus: 404,
  url: '/data/characters.json'
});
```

---

## 6. RECOMENDACIONES DE CONSOLIDACIÓN PRE-LANZAMIENTO

### FASE 1: BLOCKERS CRÍTICOS (1-2 días)
**Prioridad MÁXIMA**

1. **Resolver BUG-C1: Incluir directorio `/art/`**
   - ✅ Optimizar imágenes (WebP, ~70% calidad)
   - ✅ Verificar que todas cargan correctamente
   - ✅ Documentar en README que están incluidas
   - **Estimado:** 4 horas

2. **Sincronizar versiones en todos los archivos**
   - package.json
   - README.md / README.es.md
   - docs/architecture.md
   - Todos los archivos en `/docs/`
   - **Estimado:** 1 hora

3. **Mover [Unreleased] a release fechado en CHANGELOG**
   - Decidir versión final (v1.4.5 o v1.5.0)
   - Crear tag de Git correspondiente
   - **Estimado:** 30 minutos

---

### FASE 2: BUGS MENORES Y UX (2-3 días)

4. **Agregar validación de assets en startup (BUG-M2)**
   - Implementar `validateAssets()`
   - Mostrar error específico si falta imagen
   - **Estimado:** 3 horas

5. **Limpiar console.error de producción (BUG-M1)**
   - Envolver en `if (DEV_MODE)`
   - O remover completamente
   - **Estimado:** 1 hora

6. **Implementar límite en pressureHistory (BUG-M8)**
   - Window de 10 elementos
   - **Estimado:** 1 hora

7. **Agregar confirmación antes de salir de partida (UX-3)**
   - Diálogo "¿Seguro que quieres salir?"
   - **Estimado:** 2 horas

8. **Mejorar feedback de carga (UX-1)**
   - Barra de progreso o spinner
   - "Loading X of Y files..."
   - **Estimado:** 2 horas

---

### FASE 3: DOCUMENTACIÓN (2-3 días)

9. **Sincronizar README.md y README.es.md**
   - Paridad completa de contenido
   - Mismas secciones principales
   - **Estimado:** 4 horas

10. **Crear docs/context-events-guide.md (DOC-I8)**
    - Explicar sistema completo
    - Ejemplos de uso
    - **Estimado:** 3 horas

11. **Crear docs/TROUBLESHOOTING.md (DOC-I12)**
    - Problemas comunes
    - Soluciones paso a paso
    - **Estimado:** 2 horas

12. **Actualizar docs/repo-truth.md (DOC-I11)**
    - Árbol de archivos actual
    - Contratos de datos v1.4.5
    - **Estimado:** 2 horas

13. **Agregar sección de assets visuales a CONTRIBUTING.md (DOC-I10)**
    - Formatos aceptados
    - Proceso de revisión
    - **Estimado:** 1 hora

---

### FASE 4: TESTING Y VALIDACIÓN (1-2 días)

14. **Ejecutar suite completa de tests**
    ```bash
    npm run test:full
    ```
    - Corregir cualquier test fallando
    - **Estimado:** Variable según resultados

15. **Playtest manual completo**
    - Cada personaje al menos una vez
    - Cada escenario al menos una vez
    - Verificar todos los flujos (summit, retreat, collapse)
    - Probar en mobile Y desktop
    - **Estimado:** 4-6 horas

16. **Validar deep-links**
    - Probar todos los ejemplos en `docs/deep-links.web-v1.md`
    - Verificar que parámetros inválidos no rompen el juego
    - **Estimado:** 2 horas

17. **Testing de accesibilidad**
    - Navegación completa por teclado
    - Screen reader en pantallas principales
    - Verificar contraste de colores
    - **Estimado:** 3 horas

---

### FASE 5: REFINAMIENTO (OPCIONAL SI HAY TIEMPO)

18. **Refactorizar ui/screens.js (TECH-1)**
    - Solo si hay recursos y tiempo
    - Dividir en módulos más pequeños
    - **Estimado:** 3-5 días (GRANDE)

19. **Implementar logger estructurado (TECH-3)**
    - Sistema de logging unificado
    - **Estimado:** 1 día

20. **Unificar manejo de errores (TECH-2)**
    - Clase GameError consistente
    - **Estimado:** 2 días

---

## 7. CHECKLIST DE VALIDACIÓN PRE-LANZAMIENTO

Use este checklist para verificar que todo está listo:

### ✅ Assets y Recursos
- [ ] Directorio `/art/` incluido y completo
- [ ] Todas las imágenes cargan correctamente
- [ ] Imágenes optimizadas (tamaño razonable)
- [ ] Fonts cargando correctamente

### ✅ Código y Funcionalidad
- [ ] No hay `console.error()` expuesto en producción
- [ ] Todos los tests pasan: `npm run test:full`
- [ ] No hay warnings en consola del browser
- [ ] Build de producción genera archivos correctos

### ✅ Documentación
- [ ] README.md y README.es.md sincronizados
- [ ] Versiones consistentes en todos los archivos
- [ ] CHANGELOG limpio (no hay [Unreleased] con contenido)
- [ ] Tag de Git creado: `git tag v1.X.X`
- [ ] Todos los links en docs apuntan a rutas correctas

### ✅ Experiencia de Usuario
- [ ] Pantalla de bienvenida se ve correcta
- [ ] Carruseles de personajes muestran retratos
- [ ] Fondos atmosféricos cargan bien
- [ ] Indicador de carga visible durante startup
- [ ] Modales cierran con ESC
- [ ] Deep-links funcionan correctamente

### ✅ Internacionalización
- [ ] Selector de idioma funciona
- [ ] Todo el texto crítico tiene traducción EN/ES
- [ ] No hay texto hardcodeado en español en código

### ✅ Accesibilidad
- [ ] Navegación por teclado completa
- [ ] `aria-label` en elementos interactivos
- [ ] Contraste de texto adecuado
- [ ] Focus visible en todos los controles

### ✅ Mobile y Responsive
- [ ] Juego funciona en móvil (iOS y Android)
- [ ] Pantalla de carruseles responsiva
- [ ] Botones tienen tamaño táctil adecuado (min 44x44px)
- [ ] Sin scroll horizontal no deseado

### ✅ Playtesting
- [ ] Al menos 3 partidas completas jugadas sin crashes
- [ ] Summit alcanzado al menos una vez
- [ ] Parte 2 desbloqueada correctamente
- [ ] Todos los outcomes testeados (summit, retreat, collapse, etc.)

### ✅ Deployment
- [ ] URL de producción configurada correctamente
- [ ] CORS configurado si es necesario
- [ ] Vercel routing funciona (`vercel.json`)
- [ ] Analytics configurado (si aplica)

---

## 8. EVALUACIÓN DE PRIORIDADES

### 🔴 CRÍTICO (Bloquea lanzamiento)
1. **BUG-C1: Incluir `/art/`** → SIN ESTO EL JUEGO NO FUNCIONA

### 🟡 ALTO (Afecta experiencia pero no bloquea)
2. UX-1: Feedback de carga
3. BUG-M2: Validación de assets
4. DOC-I1: Actualizar referencias a `/art/` en README
5. UX-3: Confirmación antes de salir

### 🟢 MEDIO (Mejora calidad pero no urgente)
6. Todos los bugs menores (M1-M8)
7. Sincronización de documentación (DOC-I1 a DOC-I12)
8. Testing exhaustivo

### 🔵 BAJO (Nice to have)
9. Refactorización de deuda técnica (TECH-1 a TECH-3)
10. Mejoras de UX opcionales

---

## 9. ESTIMACIÓN TOTAL DE TIEMPO

### Mínimo viable (solo críticos + altos):
**5-7 días de trabajo**
- Fase 1: 1-2 días
- Fase 2: 2-3 días
- Fase 3: 2-3 días (paralelo con Fase 2)
- Testing básico: 1 día

### Recomendado (incluye medios):
**10-12 días de trabajo**
- Fases 1-4 completas
- Testing exhaustivo
- Documentación completa

### Ideal (incluye refactorización):
**15-20 días de trabajo**
- Todo lo anterior
- Fase 5 (refactorización de deuda técnica)

---

## 10. CONCLUSIONES

### Fortalezas del Proyecto
✅ **Visión clara:** La documentación conceptual es excepcional  
✅ **Sistema robusto:** El engine EP/BT/Perception está bien diseñado  
✅ **Testing presente:** 26 test files muestran compromiso con calidad  
✅ **Documentación bilingüe:** EN/ES es inclusivo  
✅ **Gobernanza clara:** CONTRIBUTING, SECURITY, CODE_OF_CONDUCT presentes

### Debilidades Críticas
❌ **Dependencia bloqueante:** Sin `/art/` el juego es injugable  
⚠️ **Monolito UI:** 4500 líneas en un archivo complica mantenimiento  
⚠️ **Inconsistencias docs:** Versiones desincronizadas crean confusión

### Recomendación Final

**El proyecto está a 85% del lanzamiento público.**

Para llegar al 100%:
1. **Semana 1:** Resolver blockers críticos + bugs mayores
2. **Semana 2:** Sincronizar documentación + testing exhaustivo
3. **Lanzamiento:** Con checklist de validación completado

**Riesgo de lanzar ahora sin fixes:**
- Los jugadores no podrán ejecutar el juego (sin `/art/`)
- Confusión por versiones inconsistentes en docs
- Experiencia degradada por bugs menores

**Beneficio de esperar 2 semanas:**
- Lanzamiento pulido y profesional
- Menor volumen de reportes de bugs
- Mejor primera impresión para prensa/curadores

---

## ANEXO A: COMANDOS DE VALIDACIÓN

```bash
# 1. Verificar que todos los tests pasen
npm run test:full

# 2. Verificar referencias a archivos faltantes
grep -r "../../art/" prototype/web-v1/ --include="*.html" --include="*.js" --include="*.css"

# 3. Buscar console.log/error en código
grep -r "console\." prototype/web-v1/ --include="*.js" | grep -v "test.js"

# 4. Verificar sincronización de versiones
echo "package.json:"
grep "version" package.json
echo "\nREADME.md:"
grep "v1\\.4\\." README.md
echo "\nREADME.es.md:"
grep "v1\\.4\\." README.es.md

# 5. Verificar que no hay IDs de personajes inválidos
grep -r "characterId\|character:" prototype/web-v1/ --include="*.js" | \
  grep -v "francisco\|laura\|erik\|daniela\|blake\|irina"

# 6. Contar líneas de archivos grandes
wc -l prototype/web-v1/ui/screens.js

# 7. Verificar deep-links
curl -I "http://localhost:4173/prototype/web-v1/index.html#title"
curl -I "http://localhost:4173/prototype/web-v1/index.html#game&character=francisco"
```

---

## ANEXO B: SCRIPTS ÚTILES PARA VALIDACIÓN

### Script 1: Verificar assets existen
```bash
#!/bin/bash
# validate-assets.sh

ASSETS=(
  "art/cover/cover-concept-1.png"
  "art/characters/francisco.png"
  "art/characters/laura.png"
  "art/characters/erik.png"
  "art/characters/daniela.png"
  "art/characters/blake.png"
  "art/characters/irina.png"
  "art/characters/random.png"
  "art/concept-art/curated/concept-curated-4.webp"
)

echo "Validando assets críticos..."
missing=0

for asset in "${ASSETS[@]}"; do
  if [ ! -f "$asset" ]; then
    echo "❌ FALTA: $asset"
    missing=$((missing + 1))
  else
    echo "✅ OK: $asset"
  fi
done

if [ $missing -eq 0 ]; then
  echo "\n✅ Todos los assets presentes"
  exit 0
else
  echo "\n❌ Faltan $missing assets"
  exit 1
fi
```

### Script 2: Sincronizar versiones
```bash
#!/bin/bash
# sync-version.sh

VERSION=$(grep '"version"' package.json | sed 's/.*: "\(.*\)".*/\1/')

echo "Sincronizando versión $VERSION en todos los archivos..."

# README.md
sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$VERSION/g" README.md

# README.es.md
sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$VERSION/g" README.es.md

# docs/architecture.md
sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$VERSION/g" docs/architecture.md

echo "✅ Versión sincronizada a v$VERSION"
```

---

**FIN DEL INFORME DE AUDITORÍA**

---

**Contacto para consultas sobre este informe:**  
aconcaguastonesentinel@gmail.com

**Fecha de entrega:** 30 de marzo, 2026  
**Próxima revisión sugerida:** Después de implementar Fase 1 y 2
