# Aconcagua: Stone Sentinel — Kit de prensa

**Documento público · Abril 2026**  
**Versión:** 1.0  
**Estado:** Prototipo web público v1.5.1  
**Versión en inglés:** [`meta/press-kit.md`](./press-kit.md)

---

## Pitch en una oración

*Aconcagua: Stone Sentinel* es un juego indie contemplativo sobre leer señales, respetar límites y tomar decisiones sin botón de deshacer — ambientado en la cumbre más alta fuera de Asia.

---

## Descripción corta (1 párrafo)

*Aconcagua: Stone Sentinel* es un juego narrativo-sistémico mountain-first desarrollado como proyecto independiente en Argentina. Los jugadores asumen uno de seis roles de expedición e intentan navegar las presiones ambientales del Aconcagua, las restricciones de ruta y las realidades fisiológicas, en una estructura por turnos construida sobre un modelo real de Presión Ambiental / Tolerancia Corporal. La cumbre es un outcome válido entre varios: el retorno seguro, la retirada estratégica y la gestión del permiso tienen igual peso narrativo. El prototipo web público (Parte 1) está disponible en [aconcaguastonesentinel.com](https://aconcaguastonesentinel.com).

---

## Datos clave

| | |
|---|---|
| **Nombre del proyecto** | Aconcagua: Stone Sentinel |
| **Desarrollador** | Independiente / individual (Argentina) |
| **Plataforma** | Web (prototipo público); plataformas definitivas por determinar |
| **Género** | Narrativo contemplativo / orientado a sistemas |
| **Release actual** | v1.5.1 — prototipo web público (Parte 1) |
| **Prototipo jugable** | [aconcaguastonesentinel.com](https://aconcaguastonesentinel.com) |
| **Repositorio** | [github.com/ernstgallegos/aconcagua-stone-sentinel](https://github.com/ernstgallegos/aconcagua-stone-sentinel) |
| **Contacto de prensa** | aconcaguastonesentinel@gmail.com |
| **Instagram** | [@aconcaguastonesentinel](https://www.instagram.com/aconcaguastonesentinel/) |
| **Idiomas** | Inglés / Español |
| **Origen** | Basado en experiencia real de expedición (cumbre por Ruta 360, enero 2026) |

---

## Pilares de diseño

**1. Autoridad ambiental**  
Altitud, clima, timing de ruta y carga de fatiga moldean cada corrida. La montaña pone las reglas; el jugador responde.

**2. Información parcial**  
Las señales se interpretan por rangos de confianza, no con paneles omniscientes. La percepción se degrada antes de que el colapso sea visible.

**3. Outcomes plurales**  
El éxito solo-cumbre es una antimedida de diseño. La retirada estratégica y el retorno seguro son finales válidos con peso mecánico y narrativo real.

**4. Contemplación como jugabilidad**  
Esperar, descansar, observar y elegir no actuar son acciones reales con consecuencias reales.

---

## Qué no es el juego

- No es un juego de acción ambientado en las montañas.
- No es un juego de supervivencia construido alrededor del fracaso constante y el castigo.
- No es una interpretación "soulslike" del alpinismo.
- No es turismo de postal vacía: la montaña es un sistema, no un escenario.

---

## Los personajes (v1.5.1)

Seis roles de expedición jugables con perfiles de motor diferenciados:

| Personaje | Perfil | Especialidad |
|---|---|---|
| **Francisco Aguirre** | Guía argentino | Aclimatización, lectura de ruta |
| **Laura Kim** | Escaladora coreana | Eficiencia de recursos, velocidad |
| **Erik Lundvall** | Veterano sueco | Resistencia, tolerancia al clima |
| **Daniela De Rossi** | Fotógrafa italiana | Claridad perceptual, acciones de foto |
| **Blake Harris** | Aventurero estadounidense | Perfil exigente, alto riesgo/recompensa |
| **Irina Orlova** | Investigadora rusa | Sistemática, gestión fuerte de permisos |

Cada personaje tiene parámetros de motor distintos: latencia perceptual, eficiencia de recursos, tasa de aclimatización, postura de riesgo y capacidad funcional.

---

## El sistema (modelo EP/BT)

El juego corre sobre un resolvedor de turnos donde:

1. El jugador elige una acción (avanzar, avanzar despacio, esperar, descender, dormir, foto).
2. Se calcula la Presión Ambiental (EP) en función de altitud, clima, terreno, hora del día y persistencia de exposición.
3. La Tolerancia Corporal (BT) integra fatiga, exposición y capacidad funcional.
4. Se genera una señal percibida desde EP y BT a través de una capa de confianza y tendencia (información parcial).
5. El outcome se clasifica: progreso, espera, retiro o evento terminal.

Todos los parámetros son data-driven (archivos JSON) y todos los claims son verificables. El motor está completamente desacoplado de la UI.

---

## Transparencia técnica

- **381 tests automatizados** cubriendo motor, helpers de UI, API y paridad de contratos.
- **Simulación Monte Carlo**: 1.500 corridas headless validan la integridad estructural. Ningún personaje produce 0% de cumbre.
- **Open source**: repositorio público y auditable.
- **5 escenarios**: Ruta Asistida, Ventana Climática Estrecha, Terreno de Falsa Estabilidad, Trampa de Fatiga Acumulada, Ventana Climática.
- **10 nodos de ruta** en 3 etapas: Aproximación, Campo Alto, Día de Cumbre.

---

## Compromiso cultural

El Aconcagua no es solo un récord a batir. Es un territorio con presencia cultural andina, rutas ancestrales y significación cosmológica indígena. El proyecto adopta una postura clara: sin folklore decorativo, sin color local ornamental. La presencia humana aparece a través de trazas, contexto y referencias investigadas con cuidado — o no aparece.

---

## Estado actual y hoja de ruta

| Etapa | Estado |
|---|---|
| Parte 1 — Prototipo web (v1.5.1) | ✅ Público, jugable |
| Parte 2 — Puente narrativo | Preview accesible tras retorno seguro; Parte 2 completa en desarrollo |
| Etapa 7 — Evaluación de dirección | Planificada (próxima fase) |
| Plataformas de producción | Por determinar tras cierre de dirección |

Ver el roadmap público: [aconcaguastonesentinel.com](https://aconcaguastonesentinel.com) → Puntos de Paso → Roadmap público.

---

## Assets disponibles

- Arte conceptual: `/art/concept-art/` (ver repositorio)
- Assets de marca: `/art/brand/` (logo, favicon)
- Imágenes de Notas de Campo: `/art/concept-art/curated/field-notes/` (10 imágenes curadas)
- Capturas del prototipo: disponibles a pedido

**Condiciones de uso:** Todos los assets visuales son © 2026 Aconcagua: Stone Sentinel. El uso de prensa (editorial, reseñas, notas) está permitido con atribución. El uso comercial requiere permiso escrito.

---

## Contacto de prensa

**Email:** aconcaguastonesentinel@gmail.com  
**Instagram:** [@aconcaguastonesentinel](https://www.instagram.com/aconcaguastonesentinel/)  
**Repositorio:** [github.com/ernstgallegos/aconcagua-stone-sentinel](https://github.com/ernstgallegos/aconcagua-stone-sentinel)

Respondemos consultas de prensa, propuestas de colaboración y solicitudes de cobertura. Tiempo de respuesta: 3–5 días hábiles.

---

*Kit de prensa versión 1.0 · Abril 2026 · aconcaguastonesentinel.com*
