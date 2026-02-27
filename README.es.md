# Aconcagua: Stone Sentinel

**Un videojuego indie narrativo–sistémico sobre los límites, el entorno y la decisión de continuar.**

*Aconcagua: Stone Sentinel* es un videojuego indie single-player inspirado en el ascenso real al Cerro Aconcagua. Propone una experiencia lenta, deliberada y basada en sistemas, en la que el jugador no conquista la montaña, sino que aprende a leerla, adaptarse a ella y decidir cuándo avanzar deja de ser la mejor opción.

**Whitepaper del proyecto**  
Este documento presenta la visión, el enfoque y las decisiones fundacionales de *Aconcagua: Stone Sentinel*.  
Es el mejor punto de entrada para entender qué tipo de juego estamos construyendo y por qué.  
→ [`/meta/project-whitepaper.md`](meta/project-whitepaper.md) (inglés)

---

## Pitch en una frase

Un videojuego narrativo y sistémico que recrea el ascenso al Aconcagua mediante mecánicas basadas en el realismo, donde el jugador gestiona cuerpo, clima y entorno para decidir hasta dónde continuar.

---

## Idea central

La montaña es el sistema central y la máxima autoridad.

La geografía, la altitud, el clima y los límites físicos condicionan activamente cada decisión. El progreso no surge de subir de nivel ni de adquirir atributos abstractos, sino de aprender a interpretar señales, gestionar el riesgo y reconocer límites.

La incertidumbre, la información parcial y las consecuencias irreversibles son elementos centrales de la experiencia.

---

## Pilares de diseño

_Aconcagua: Stone Sentinel_ está concebido como una experiencia sistémica.

El clima, el terreno, el equipo y el estado físico y mental del jugador interactúan mediante bucles de retroalimentación que modelan el riesgo, la adaptación y la toma de decisiones.

### 1. La montaña gobierna
La altitud, el terreno y el clima son sistemas activos que condicionan cada acción. El diseño del juego se adapta a la geografía real, no a un diseño de niveles abstracto.

### 2. Información parcial
El jugador accede a datos fisiológicos y ambientales a través de una interfaz diegética y limitada (un dispositivo tipo reloj). La certeza nunca es absoluta.

### 3. Aprender haciendo
No existen niveles ni atributos de personaje. La progresión surge de la observación, la experiencia y la toma de decisiones informadas bajo condiciones cambiantes.

### 4. Contemplación activa
La observación, las pausas y la atención al entorno no son interrupciones, sino mecánicas centrales. El silencio, la escala y el tiempo son elementos significativos del diseño.

---

## Lo que este juego no es

- No es un juego de acción  
- No es un simulador técnico de montañismo  
- No es una fantasía heroica  
- No es un juego de supervivencia centrado en bucles de crafteo  

El realismo se expresa a través de sistemas y mecánicas, no mediante espectacularidad técnica ni simulación excesiva.

---

## Estructura de progresión (alto nivel)

1. **Ruta Normal — Expedición asistida**  
   Introducción a los sistemas con apoyo logístico y consecuencias amortiguadas.

2. **Ascensos menos asistidos**  
   Mayor autonomía, decisiones críticas y consecuencias directas.

3. **Modo Solo — Ruta técnica extrema**  
   Autonomía total, sin asistencia ni garantías. La experiencia definitiva.

---

## Marco legal y ético

 - La geografía real del Cerro Aconcagua y sus rutas principales se representa de forma fiel.
 - No se incluyen personas reales, marcas ni entidades comerciales.
 - Los elementos históricos y culturales se tratan con un enfoque documental y no promocional.
 - No se romantiza el riesgo ni la muerte.
 - El juego no obliga al jugador a alcanzar la cumbre.
 
 Detenerse, regresar o fallar son desenlaces válidos y significativos.
 
 ---
 
 ## Estado del proyecto
 
 Este repositorio documenta los **fundamentos conceptuales y de diseño** del proyecto, e incluye un **prototipo funcional de baja fidelidad** para validar hipótesis centrales.
 
 - El MRA v0 está disponible en `/prototype/mra-v0/`.
 - El vertical slice web v1 está disponible en `/prototype/web-v1/` y consume corridas incluidas.
 - El código de gameplay de producción no es público en esta etapa.
 
 Se trata de un repositorio curado y orientado al público, no de un archivo completo de producción.
 
 ---
 
 
## Vertical Slice web v1 (listo para Vercel)

Este repositorio ahora incluye un vertical slice web liviano para reproducir corridas incluidas del MRA v0:

- `prototype/web-v1/index.html`, `prototype/web-v1/styles.css`, `prototype/web-v1/app.js` — interfaz cliente estática más reciente
- `api/run.js` — API serverless que sirve corridas desde `prototype/mra-v0/runs/`
- `vercel.json` — configuración de runtime y ruteo para Vercel

### Vista local

Desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Luego abrir `http://localhost:4173/prototype/web-v1/`.

En este modo estático local, la UI lee los JSONL incluidos directamente desde `prototype/mra-v0/runs/` (sin API serverless).

### Publicación en Vercel

- Importar este repositorio en Vercel.
- Framework preset: **Other** (estático + funciones serverless).
- Este vertical slice no requiere build command.
- Publicar. La UI más reciente se sirve en `/` (`index.html`) y consume `/api/run`.

## Estructura del repositorio
 
 - [`/docs`](./docs) — Documentos conceptuales, pilares de diseño, visión de sistemas (inglés y español) y propuesta de artefacto mínimo reproducible (solo en inglés).
 - [`/art`](./art) — Concept art curado y referencias visuales
 - [`/devlog`](./devlog) — Intención de diseño, decisiones de alcance y reflexiones
 - [`/meta`](./meta) — Roadmap público, whitepaper y notas de visibilidad
 
 ---
 
 ## Política de idioma
 
 - El inglés es el idioma canónico del proyecto.
 - La documentación en español se ofrece como capa paralela y contextual.
 
 Ver [`README.md`](./README.md) para la versión en inglés.
 
 ---
 
 ## Licencia
 
 Este proyecto se distribuye bajo la licencia  
 **Creative Commons Atribución–NoComercial–SinDerivadas 4.0 Internacional (CC BY-NC-ND 4.0).**
 
 Se permite leer, compartir y referenciar el contenido de este repositorio con fines no comerciales.
 
 No está permitido reutilizar, modificar, redistribuir ni comercializar ninguna parte del proyecto —incluyendo su concepto, documentación o arte— sin autorización explícita.
 
 Para más detalles, ver [`LICENSE.md`](./LICENSE.md).
