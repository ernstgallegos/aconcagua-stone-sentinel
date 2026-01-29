# Visión de sistemas

> Este documento describe la arquitectura sistémica de *Aconcagua: Stone Sentinel*.  
> No define implementación técnica ni fórmulas: establece **qué sistemas existen**,  
> **qué información manejan**, **cómo interactúan entre sí** y **qué tipo de decisiones generan**.  
> Su función es servir de puente entre el concepto y el prototipo.

---

## Propósito del documento

La visión de sistemas responde a una pregunta central:

> **¿Cómo se traduce la experiencia conceptual del juego en sistemas interactivos coherentes?**

Este documento:
- Evita contradicciones entre mecánicas.
- Permite evaluar viabilidad sin escribir código.
- Sirve como referencia común para diseño, prototipado y comunicación con terceros.

---

## Principios sistémicos

Antes de describir sistemas individuales, se establecen principios que gobiernan a todos:

1. **Primacía del entorno**: ningún sistema existe aislado del territorio.
2. **Información situada**: los sistemas producen señales, no certezas.
3. **Consecuencia persistente**: las decisiones dejan huella.
4. **Complejidad limitada**: pocos sistemas bien conectados, no muchos sistemas superficiales.

---

## Sistemas principales

### 1. Sistema de montaña (territorio)

**Rol**  
Sistema soberano. Define las condiciones base sobre las que operan todos los demás.

**Componentes**
- Altitud
- Terreno (pendiente, estabilidad, tipo de superficie)
- Exposición
- Distancia entre puntos seguros

**Produce**
- Restricciones de movimiento
- Incremento de desgaste físico
- Riesgos contextuales (caídas, desorientación)

**No produce**
- Daño arbitrario
- Eventos guionados desconectados del entorno

---

### 2. Sistema climático

**Rol**  
Sistema dinámico y probabilístico que modifica el estado de la montaña.

**Componentes**
- Viento
- Temperatura
- Nubosidad / visibilidad
- Precipitaciones

**Produce**
- Variaciones en legibilidad del entorno
- Cambios en el costo de movimiento
- Riesgos crecientes o decrecientes

**Características clave**
- No es completamente predecible
- Se anticipa por señales
- Opera en ventanas temporales

---

### 3. Sistema fisiológico (cuerpo)

**Rol**  
Representa la adaptación (o no) del cuerpo a la altura y al esfuerzo.

**Componentes**
- Frecuencia cardíaca
- Saturación de oxígeno
- Fatiga acumulada
- Estado general

**Produce**
- Reducción de rendimiento
- Mayor error en acciones
- Necesidad de descanso o descenso

**Principio clave**  
No hay “vida” o “salud” tradicional: hay **capacidad funcional variable**.

---

### 4. Sistema de recursos

**Rol**  
Mediar la relación entre planificación y contingencia.

**Componentes**
- Agua
- Alimentación
- Descanso
- Energía disponible

**Produce**
- Sostén o deterioro del sistema fisiológico
- Decisiones de avance, espera o retirada

**Nota**  
Los recursos no se optimizan para maximizar progreso, sino para **sostener margen de decisión**.

---

### 5. Sistema de equipamiento

**Rol**  
Traducir preparación en consecuencias físicas.

**Componentes**
- Peso total
- Capas de abrigo
- Protección
- Herramientas

**Produce**
- Modificación del costo de movimiento
- Cambios en exposición al clima
- Compensaciones entre seguridad y desgaste

---

### 6. Sistema de información (interfaz)

**Rol**  
Canalizar señales de los sistemas sin anular la incertidumbre.

**Componentes**
- Dispositivo diegético (reloj)
- Señales ambientales
- Registro del jugador

**Produce**
- Tendencias
- Alertas implícitas
- Ambigüedad informativa

**No produce**
- Certezas absolutas
- Indicadores omniscientes

---

### 7. Sistema de decisión y consecuencia

**Rol**  
Conectar acciones con efectos persistentes.

**Componentes**
- Elecciones del jugador
- Estados acumulados
- Umbrales de riesgo

**Produce**
- Consecuencias graduales
- Cambios duraderos en condiciones futuras

**Principio clave**  
Las consecuencias **no castigan**: informan y condicionan.

---

## Relaciones entre sistemas (vista simplificada)

- El **clima** modifica la **montaña**.
- La **montaña** impone carga al **cuerpo**.
- El **cuerpo** condiciona la **decisión**.
- La **decisión** afecta recursos y estado futuro.
- La **información** nunca revela todo el sistema.

No hay sistema aislado. Todo feedback es cruzado.

---

## Flujo típico de decisión

1. Lectura de señales (clima, cuerpo, entorno)
2. Interpretación bajo incertidumbre
3. Elección (avanzar, esperar, descender)
4. Consecuencia inmediata
5. Consecuencia persistente

Este loop se repite sin garantía de progreso lineal.

---

## Lo que este documento no define

- Fórmulas matemáticas
- Interfaces finales
- Balance numérico
- Implementación técnica

Eso pertenece a etapas posteriores del desarrollo.

---

## Uso del documento

Este documento debe utilizarse para:
- Diseñar prototipos de papel o simulaciones simples
- Evaluar nuevas mecánicas
- Explicar el juego a colaboradores técnicos
- Verificar coherencia con los pilares de diseño

---

## Nota final

La visión de sistemas de *Aconcagua: Stone Sentinel* no busca simular la montaña en su totalidad, sino **recrear la experiencia de decidir bajo sus condiciones**.

El sistema no existe para ser dominado, sino para ser leído.
