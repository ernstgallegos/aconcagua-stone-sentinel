# Auditoría y revisión integral: Aconcagua – Stone Sentinel (versión pública v1.4.5)

## 1. Objetivo de la auditoría

Se realizó una auditoría exhaustiva del repositorio público `ernstgallegos/aconcagua-stone-sentinel` y de la web app desplegada en <https://aconcaguastonesentinel.com>. El objetivo fue identificar incoherencias, bugs y “cabos sueltos” que deban corregirse antes de publicar oficialmente la versión 1.4.5 del prototipo. Se revisaron el código, la documentación y la experiencia de juego (playtest) para validar que estén alineados.

## 2. Hallazgos de la documentación y arquitectura

### 2.1 Versionado y prototipos activos

La documentación establece con bastante claridad que el prototipo activo es `prototype/web-v1`, que el artefacto de compatibilidad es `prototype/mra-v0` y que la versión pública canónica es **v1.4.5**. Eso coincide con la versión visible en la interfaz pública. Desde un punto de vista de auditoría, esto es una fortaleza importante: reduce ambigüedad y facilita validar qué superficie es realmente “la que cuenta”.

Mi conclusión acá es positiva: **la intención de fuente de verdad existe y está relativamente bien formulada**. El problema no está en la ausencia de una verdad canónica, sino en que **esa verdad no siempre se replica con igual limpieza en todos los documentos secundarios**, especialmente en el changelog y en algunos textos de soporte.

### 2.2 Contrato de verdad y autoridad del sistema

`docs/repo-truth.md` cumple una función crítica: fija una especie de “constitución” del proyecto. Ahí se define la lista de personajes activos, la autoridad del turno en `resolveTurn(state, action)`, la separación entre sistemas vivos y diferidos y el alcance de la versión pública.

Mi lectura es que esto está **muy bien planteado conceptualmente**. No es común ver en un proyecto de esta escala un documento que explicite tan claramente qué partes son canónicas y cuáles no. Eso mejora enormemente la auditabilidad.

Mi recomendación, sin embargo, es reforzar una disciplina: **cada vez que cambie algo material del runtime, tiene que revisarse `repo-truth.md` en la misma tanda**. Si no, el documento puede pasar de ser una fuente de verdad a convertirse en una declaración aspiracional.

### 2.3 Flujo del motor y arquitectura sistémica

La arquitectura describe un pipeline claro: ambiente → presión ambiental → tolerancia corporal → delta de presión → percepción → modificador de acción → outcome. El motor mantiene una lógica centrada en el resolver, y eso está alineado con el diseño general del juego: la montaña gobierna, no la UI.

Ésta es, en mi opinión, una de las mayores fortalezas del proyecto. **La lógica sistémica no está improvisada**. Hay una estructura real detrás del comportamiento del juego, y esa estructura no depende de efectos cosméticos ni de decisiones de interfaz.

La conclusión importante es que **la base de simulación es suficientemente sólida para un lanzamiento público de prototipo**, siempre que la capa de UI no la contamine ni la contradiga.

### 2.4 Carga y validación de datos

`ui/helpers/data-config.js` define con bastante rigor qué archivos necesita el prototipo para arrancar y cómo validar que esos datos tienen la forma esperada. Eso incluye nodos, presión ambiental, modificadores, personajes, eventos, outcomes y escenarios. La clasificación de errores en categorías específicas (`missing file`, `http failure`, `invalid json`, `invalid shape`, `post-load validation failure`) es una muy buena decisión de ingeniería.

Mi conclusión aquí es doble:

- A nivel interno, **la estrategia es correcta**.
- A nivel de experiencia pública, **todavía no está explotada del todo**.

Es decir: el sistema sabe bastante bien qué falla, pero esa inteligencia diagnóstica no siempre se traduce en una experiencia de error igual de clara para quien prueba la app.

### 2.5 Estado actual de modularización

Hubo progreso real en la extracción de helpers como `startup-ui.js`, `routing.js` y `data-config.js`. Eso muestra que las recomendaciones anteriores no solo se escucharon, sino que empezaron a implementarse.

Sin embargo, `ui/screens.js` sigue concentrando demasiadas responsabilidades: navegación, carga, render de pantallas, traducciones, overlays, lógica de interacción y parte del loop visible del juego.

Mi conclusión es clara: **la modularización empezó, pero no terminó**. Y en esta etapa del proyecto eso importa, porque el riesgo ya no es conceptual sino operativo: cuando un archivo central crece demasiado, cualquier ajuste de último sprint puede introducir bugs laterales difíciles de detectar.

## 3. Observaciones del playtest

Se realizaron varias partidas desde el navegador con el objetivo de evaluar la jugabilidad, la usabilidad y la coherencia visual del prototipo.

### 3.1 Pantalla inicial y carga

La portada carga bien y transmite identidad. El mensaje de estado del modelo (“Model ready – Begin when prepared”) aparece con claridad. El acceso a información de versión y contexto del prototipo vía el botón “Info” también funciona y está bien orientado.

Mi lectura es positiva: **la primera impresión general no es amateur**. Se siente ya como un producto con voz propia. Eso importa mucho de cara a un lanzamiento público, porque la confianza del jugador empieza antes del primer turno.

### 3.2 Selección de expedición

La pantalla de preparación tiene una buena idea base: elección de personaje, escenario y arranque relativamente ritualizado. Eso acompaña bien la vibra del proyecto.

El problema detectado fue concreto: **el primer personaje podía aparecer sin imagen hasta interactuar con el carrusel**. Aunque no rompe el juego, sí rompe la percepción de calidad. Desde afuera, eso se lee como bug o como asset faltante.

Mi conclusión es que esto no es un detalle menor. En un prototipo público, **el primer error visual suele exagerarse en la cabeza del usuario**. Si el primer retrato aparece vacío, el usuario no piensa “esto es un tema de precarga”; piensa “esto está roto”.

### 3.3 Inicio del juego

El briefing previo a la expedición explica bien las acciones disponibles y da un marco suficiente para arrancar. Una vez iniciada la partida, la actualización de nodo, altitud, tiempo, presión y suministros funciona de manera coherente en las primeras pruebas.

Acá la conclusión es buena: **el juego ya puede sostener una primera lectura jugable real**. No es solo una interfaz bonita; hay una estructura de juego que se deja leer, y eso es un avance importante.

### 3.4 Overlays y capas superpuestas

El botón “View Field Log” abre un panel que bloquea la interacción con las acciones. Lo mismo ocurre con otros overlays de ayuda. Técnicamente esto es consistente, pero **no siempre es lo bastante evidente para el usuario**. Es posible que alguien deje abierto el panel, intente avanzar y sienta que el botón “no responde”.

Mi conclusión: **acá hay un bug de percepción**, aunque no sea estrictamente una rotura funcional. Y en una release pública, los bugs de percepción importan casi tanto como los bugs reales, porque erosionan confianza.

### 3.5 Traducción y accesibilidad

El juego resuelve bien la traducción en las pantallas iniciales, pero durante la partida ya no queda claro cómo cambiar el idioma. Además, algunos textos de apoyo tienen tamaño y contraste algo justos para ciertas condiciones de visualización.

Mi conclusión es que **la accesibilidad general es aceptable pero todavía no está consolidada**. No está mal, pero aún no está al nivel de “release pública sin observaciones”.

### 3.6 Mecánicas observadas en los primeros turnos

Las acciones básicas (`advance slowly`, `wait`, etc.) respondieron de forma coherente con lo documentado. La presión y la tendencia variaron de manera consistente con eventos contextuales y con el estado del jugador. No encontré, en los primeros turnos, comportamientos absurdos o roturas sistémicas.

Eso es importante: **no vi evidencia de que el núcleo jugable esté roto**. El problema principal hoy no está en que la simulación falle todo el tiempo, sino en varios cabos sueltos de presentación, claridad, modularidad y validación prolongada.

## 4. Conclusiones principales y recomendaciones

A continuación detallo una por una mis conclusiones con su recomendación asociada.

---

### Conclusión 1: la base conceptual del proyecto es fuerte

Mi punto de vista general es que **Aconcagua: Stone Sentinel ya no es un experimento desordenado**. Hay una dirección de diseño clara, una voz estética reconocible y una arquitectura sistémica real. Eso se nota en el motor, en la documentación y en la manera en que el prototipo transmite tensión e incertidumbre.

#### Recomendación
No cambien la identidad del proyecto para “volverlo más accesible” en un sentido genérico. La base está bien. El trabajo ahora no es rediseñar, sino **consolidar y limpiar**.

---

### Conclusión 2: la mayor debilidad actual no es el motor, sino la superficie de UI

La simulación se sostiene bastante mejor que la interfaz que la expone. El principal factor de riesgo hoy es `screens.js` como archivo “contenedor de todo”, más algunos problemas de coordinación entre helpers y UI.

#### Recomendación
Terminar la modularización de la UI antes del lanzamiento. No hace falta sobreingeniería: basta con separar responsabilidades con criterio práctico:

- startup y errores bloqueantes
- routing y hash state
- setup de expedición
- HUD / pantalla de juego
- overlays y modales
- debrief / field log
- traducciones

La prioridad no es elegancia abstracta, sino **reducir riesgo de regresión**.

---

### Conclusión 3: hay un problema real de percepción de calidad en la carga de assets

La aparición vacía del primer personaje en el carrusel es pequeña como bug técnico, pero grande como bug simbólico. Afecta el primer contacto con el producto.

#### Recomendación
Implementar una de estas dos soluciones, idealmente ambas:

1. **Precarga explícita** de retratos y assets críticos antes de mostrar el carrusel.
2. **Placeholder visual deliberado** mientras la imagen real carga.

Además, sumaría una prueba automática que valide que todos los retratos referenciados en los datos existen efectivamente en `assets`.

---

### Conclusión 4: el sistema de errores sabe más de lo que comunica

`data-config.js` clasifica fallos con bastante precisión, y `startup-ui.js` ya tiene buena lógica para expresar esos fallos. Pero la experiencia global todavía da la sensación de que parte de esa inteligencia queda encapsulada y no siempre se ve reflejada con limpieza en la superficie final.

#### Recomendación
Centralizar por completo la presentación de errores en un único módulo y eliminar duplicaciones. Todo error fatal de carga debería mostrar:

- archivo afectado
- tipo de error
- detalle útil
- acción sugerida (recargar / volver al inicio)

La clave acá es simple: **si el juego falla, que falle con honestidad y con precisión**.

---

### Conclusión 5: el juego tiene fricciones de overlay que pueden parecer bugs

Los paneles de ayuda y log no están conceptualmente mal, pero les falta un poco de “gramática visual” para comunicar que tomaron el foco y bloquearon el fondo.

#### Recomendación
Volverlos más claramente modales:

- backdrop más legible
- close button evidente
- desactivar visualmente acciones del fondo
- restaurar foco al cerrar
- reforzar navegación por teclado

Esto no solo mejora UX: también mejora testeo, porque reduce falsos positivos del tipo “el botón no anda”.

---

### Conclusión 6: la documentación está bastante mejor, pero todavía tiene drift residual

La situación documental mejoró mucho. Sin embargo, el changelog todavía parece el punto más propenso a desalinearse con el estado real del código. Cuando algo figura como “Unreleased” pero ya está implementado, se erosiona la confianza del repositorio como espejo fiel.

#### Recomendación
Hacer una pasada de sincronización final sobre:

- `README.md`
- `README.es.md`
- `CHANGELOG.md`
- `docs/repo-truth.md`
- `docs/architecture.md`
- `docs/simulation_engine.md`
- `prototype/web-v1/README.md`

Y usar una regla simple: **si está en el repo y corre en la build pública, no puede seguir figurando como “pendiente”**.

---

### Conclusión 7: la accesibilidad está encaminada, pero no cerrada

No vi un desastre de accesibilidad, pero sí varios puntos donde todavía se siente “en progreso”: foco de teclado, contraste de textos pequeños, claridad de estados y persistencia de idioma.

#### Recomendación
Antes de publicar, haría una pasada específica de hardening accesible:

- `:focus-visible` claro en todos los elementos interactivos
- mejora leve del contraste de textos secundarios
- revisión de tamaño tipográfico en ayudas y disclaimers
- control más visible sobre idioma o explicación explícita de cuándo puede cambiarse

La clave es no “blanquear” ni “aplanar” la estética, sino **hacerla un poco más robusta sin perder carácter**.

---

### Conclusión 8: la jugabilidad básica ya existe, pero faltan validaciones de largo recorrido

Las primeras partidas funcionaron bien, pero no alcanza con eso para declarar una release “lista”. En juegos sistémicos, muchos problemas aparecen recién al recorrer estados extremos: fatiga acumulada, clocks largos, outcomes terminales específicos, escenarios raros.

#### Recomendación
Antes del lanzamiento haría sí o sí una batería de pruebas orientadas a outcomes:

- rescate
- colapso / fatality
- permit expired
- retreat
- finales por presión acumulada
- comportamiento de eventos contextuales en distintos escenarios

No necesariamente todo tiene que hacerse manualmente. Parte puede blindarse con smoke tests o harnesses de simulación.

---

### Conclusión 9: falta blindaje automático en áreas críticas de release

El proyecto ya tiene una sensibilidad de ingeniería bastante madura, pero todavía conviene reforzar algunos checks automáticos para evitar que el launch dependa demasiado de inspección manual.

#### Recomendación
Agregar o reforzar tests para:

- existencia y forma de todos los JSON obligatorios
- existencia de assets referenciados
- paridad de versión entre `package.json`, UI y docs
- smoke flow: carga → setup → start → uno o dos turnos → no fatal error
- rutas deep-link si siguen siendo parte del contrato público

La meta no es cobertura total. La meta es **detectar lo vergonzoso antes de que llegue a Vercel**.

---

### Conclusión 10: el proyecto ya tiene “vibra propia” y eso debe protegerse

Ésta es una conclusión menos técnica pero importante. La app y el repo ya comunican una identidad particular: montaña, espera, lectura de señales, austeridad, fragilidad, contemplación. Eso ya existe y es valioso.

Mi advertencia es que, en un sprint de consolidación, es fácil corregir cosas con soluciones demasiado genéricas que maten parte de esa personalidad.

#### Recomendación
Toda mejora de UI, copy, error handling o accesibilidad debería pasar un filtro de tono:

- ¿sigue sonando como este juego?
- ¿sigue sintiéndose montaña y no dashboard?
- ¿sigue habiendo espacio para incertidumbre?
- ¿sigue habiendo autoría y no solo “buenas prácticas”?

Consolidar no debe equivaler a esterilizar.

## 5. Recomendaciones concretas de cierre antes del lanzamiento

Si tuviera que priorizar el cierre de la versión pública en pocas líneas, mi orden sería este:

1. **Resolver la carga inicial del carrusel y cualquier asset vacío visible.**
2. **Terminar de centralizar los errores de carga y hacerlos más claros.**
3. **Extraer lo más riesgoso de `screens.js` a módulos concretos.**
4. **Pulir overlays y foco para eliminar fricciones que parezcan bugs.**
5. **Sincronizar changelog y documentación con la verdad real del repo.**
6. **Agregar smoke tests y checks de integridad de datos/assets.**
7. **Hacer una pasada de outcomes de largo recorrido antes del lanzamiento.**

## 6. Conclusión final

Mi punto de vista general como evaluador externo es este:

**el proyecto está bastante más cerca de una release pública seria de lo que estaba antes**, y eso se nota tanto en la arquitectura como en la experiencia de juego. No veo un prototipo roto ni una base improvisada. Veo un proyecto con una columna vertebral de diseño real, con una voz propia bastante conseguida y con un motor que ya puede sostener una experiencia significativa.

Pero también veo con claridad que **todavía no está completamente “cerrado”**. Lo que falta no es visión ni dirección; lo que falta es hardening. Hay varios problemas pequeños y medianos —de interfaz, documentación, percepción de calidad y blindaje de release— que todavía pueden dañar la recepción pública si no se corrigen antes.

La buena noticia es que el tipo de problemas que quedan **son solucionables** y no exigen reinvención. No hace falta cambiar el juego; hace falta **terminarlo de alinear consigo mismo**.

Si se corrigen estos cabos sueltos, mi evaluación cambia de “prototipo fuerte con fricciones” a **“versión pública sólida, defendible y coherente para testeo externo”**.