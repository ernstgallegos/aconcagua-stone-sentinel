# Pilares de diseño

> Este documento desarrolla los pilares de diseño de *Aconcagua: Stone Sentinel* como reglas operativas. No es un texto promocional: funciona como constitución del proyecto. Cada pilar define **qué prioriza el juego**, **qué habilita**, **qué prohíbe**, **cómo se ve en la práctica**, y **cómo se resuelven conflictos** cuando los pilares compiten.

---

## Cómo leer este documento

- **Pilar**: principio rector.
- **Intención**: por qué existe.
- **Implicancias de diseño**: qué decisiones concretas exige.
- **Criterios de aceptación**: señales objetivas de que se está cumpliendo.
- **Antipatrón**: forma típica de traicionar el pilar.
- **Microescenarios**: situaciones jugables de prueba para validar coherencia.
- **Riesgos**: dónde se rompe y cómo cuidarlo.

---

## Pilar 1 — La montaña gobierna

### Enunciado
La geografía, la altitud y el clima son **sistemas activos**. No acompañan la experiencia: la determinan.

### Intención
Evitar que la montaña sea un decorado. El juego trata sobre **tomar decisiones bajo autoridad externa** (territorio + condiciones). La dificultad no surge de enemigos ni puzzles, sino de la realidad ambiental y su incertidumbre.

### Implicancias de diseño
- El diseño de rutas, campamentos y riesgos surge del territorio, no de “niveles”.
- El clima afecta movilidad, legibilidad, consumo y planificación.
- La altitud reduce el margen de error y amplifica consecuencias.
- La escala y la exposición deben sentirse mecánicamente.
- El entorno puede imponer retirada o estancamiento como resultados válidos.

### Criterios de aceptación
- El jugador puede explicar sus decisiones en términos ambientales.
- El clima y el terreno generan dilemas reales.
- Rutas y campamentos se perciben como consecuencia del territorio.
- La tensión principal proviene de clima, fatiga e incertidumbre.

### Antipatrones
- Clima solo estético.
- Mapas omniscientes.
- Checkpoints arbitrarios.
- Amenazas externas que reemplazan al territorio.

### Microescenarios jugables
**A. Ventana climática corta**  
Salir ahora permite avanzar, pero implica llegar fatigado y con poco margen de error.  
→ Test: no hay decisión óptima universal.

**B. Terreno engañoso**  
Una ladera parece estable pero incrementa desgaste y riesgo.  
→ Test: el territorio manda sobre la planificación.

### Riesgos y cuidados
- Realismo punitivo → usar consecuencias graduales.
- Sobresimulación → pocas variables, feedback claro.

---

## Pilar 2 — Información parcial

### Enunciado
El jugador actúa con **datos incompletos, ruidosos y situados**. La interfaz es diegética y limitada.

### Intención
Que la experiencia trate sobre interpretación y criterio, no sobre optimización matemática. El montañismo ocurre en la frontera entre lo medible y lo incierto.

### Implicancias de diseño
- UI integrada al mundo (reloj, señales).
- Mediciones con error y variación.
- Señales cualitativas (respiración, viento, torpeza).
- Priorizar tendencias y patrones.
- Evitar el metajuego de barras perfectas.

### Criterios de aceptación
- El jugador anticipa problemas sin warnings explícitos.
- No puede predecir resultados con certeza total.
- La UI es sobria y funcional.

### Antipatrones
- HUD omnisciente.
- Pop-ups constantes.
- Minimapas mágicos.

### Microescenarios jugables
**A. Lectura fisiológica ambigua**  
SpO₂ baja levemente pero la sensación es buena.  
→ Test: ningún dato aislado define la acción.

**B. Señales contradictorias**  
Buen clima visual, pero viento en aumento.  
→ Test: interpretar, no obedecer alertas.

### Riesgos y cuidados
- Demasiada ambigüedad → azar.
- Demasiada certeza → optimización.

---

## Pilar 3 — Aprender haciendo

### Enunciado
No hay niveles ni atributos. La progresión surge de **criterio, rutina y experiencia**.

### Intención
Evitar el “RPGficado” del montañismo. La montaña no otorga buffs: enseña a decidir mejor.

### Implicancias de diseño
- Progresa el jugador, no el personaje.
- Rutinas repetibles generan hábito.
- El error enseña y deja marca.
- Desbloqueos diegéticos, no XP.

### Criterios de aceptación
- Repetir un tramo mejora por comprensión.
- Nuevas opciones surgen de experiencia real.

### Antipatrones
- Árboles de habilidades.
- Loot mágico.
- Grind numérico.

### Microescenarios jugables
**A. Repetición informada**  
El jugador sale antes y con mejor carga.  
→ Test: progreso cognitivo.

**B. Error persistente**  
Una mala decisión deja una consecuencia duradera.  
→ Test: el error informa el futuro.

### Riesgos y cuidados
- Falta de sensación de progreso → usar bitácora y nuevas responsabilidades.

---

## Pilar 4 — Contemplación activa

### Enunciado
Observar, detenerse y registrar el entorno son acciones centrales. El juego recompensa la atención.

### Intención
Sostener presencia, escala y silencio como mecánicas, no como pausa pasiva.

### Implicancias de diseño
- Pausas con costo/beneficio.
- Registro como práctica de atención.
- Sonido como información.
- El tiempo avanza: contemplar no es gratis.

### Criterios de aceptación
- Se puede jugar bien sin correr.
- La observación afecta decisiones.

### Antipatrones
- Coleccionables checklist.
- Fotomodo sin impacto.
- Cinemáticas pasivas.

### Microescenarios jugables
**A. Observación con costo**  
Registrar fauna mientras el clima empeora.  
→ Test: contemplar implica riesgo.

**B. Pausa estratégica**  
Detectar un cambio de viento antes de un paso expuesto.  
→ Test: observar reduce riesgo.

### Riesgos y cuidados
- Walking sim sin tensión.
- Sobrecarga de tareas.

---

## Conflictos entre pilares y reglas de desempate

1. **Primero la montaña**: si debilita al entorno, se descarta.
2. **Legibilidad situada**: si no se puede leer, se simplifica.
3. **Progresión por experiencia**: si depende de stats, se rediseña.
4. **Contemplación activa**: si mata el tono, se revisa.

---

## Límites de simulación (qué NO se simula)

Para preservar legibilidad y viabilidad, el proyecto no simula:
- Metabolismo y nutrición avanzada (se abstrae).
- Escalada técnica hiper-especializada.
- Física exacta de cada material.
- Dinámicas sociales complejas.

El foco es **decidir bajo condiciones ambientales**.

---

## Glosario básico

- **Asistido**: ascenso con apoyo logístico y consecuencias amortiguadas.
- **Mediado**: entorno exigente con margen de corrección.
- **Probabilístico**: resultados basados en rangos y contexto.
- **Diegético**: información integrada al mundo del juego.
- **Consecuencia persistente**: efecto que condiciona decisiones futuras.

---

## Notas finales

Este documento debe usarse para:
- Evaluar nuevas mecánicas.
- Detectar incoherencias.
- Justificar descartes.

Cualquier cambio relevante debe versionarse y justificarse.
