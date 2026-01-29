# Visión de Sistemas

> Este documento describe la arquitectura sistémica de *Aconcagua: Stone Sentinel*.  
> No define implementación técnica ni fórmulas. En su lugar, establece  
> **qué sistemas existen**, **qué información manejan**, **cómo interactúan**  
> y **qué tipo de decisiones generan**.  
>  
> Su función es servir de puente entre la visión conceptual del proyecto  
> y las primeras instancias de prototipado.

---

## Propósito de este documento

La visión de sistemas responde a una pregunta central:

> **¿Cómo se traduce la experiencia conceptual del juego en sistemas interactivos coherentes?**

Este documento:
- Previene contradicciones mecánicas.
- Permite evaluar la viabilidad del diseño sin necesidad de escribir código.
- Funciona como referencia compartida para diseño, prototipado y comunicación externa.

---

## Principios sistémicos

Antes de detallar los sistemas individuales, se establecen los siguientes principios globales:

1. **Primacía del entorno**  
   Ningún sistema existe de forma independiente del terreno y de las condiciones atmosféricas.

2. **Información situada**  
   Los sistemas entregan señales y tendencias, no certezas absolutas.

3. **Consecuencia persistente**  
   Las decisiones dejan efectos duraderos que se acumulan a lo largo del tiempo.

4. **Complejidad limitada**  
   Se priorizan pocos sistemas profundamente interconectados por sobre muchos sistemas superficiales.

---

## Panorama de subsistemas

Desde el punto de vista del diseño, el juego se estructura en un conjunto reducido de subsistemas fuertemente acoplados.  
El sentido de la experiencia emerge de su interacción sostenida en el tiempo.

- **Entorno (Montaña + Clima)**  
  Define las condiciones externas y las restricciones del ascenso. Actúa como un agente activo, no como un fondo pasivo.

- **Cuerpo (Estado fisiológico)**  
  Representa la capacidad del jugador para operar bajo condiciones de altura, esfuerzo y exposición.

- **Recursos y equipo**  
  Median entre la planificación previa y la contingencia durante la expedición.

- **Información**  
  Canaliza señales parciales y situadas sin eliminar la incertidumbre.

- **Decisión y consecuencia**  
  Traduce la intención del jugador en efectos sistémicos persistentes.

Ningún subsistema funciona de manera aislada.  
Todos están diseñados para influirse y condicionarse mutuamente.

---

## Sistemas centrales

### 1. Sistema de la montaña (Terreno)

**Rol**  
Sistema soberano. Define las condiciones base bajo las cuales operan todos los demás sistemas.

**Componentes**
- Altitud
- Terreno (pendiente, estabilidad, tipo de superficie)
- Exposición
- Distancia entre puntos seguros

**Produce**
- Restricciones al movimiento
- Incremento del esfuerzo físico
- Riesgos contextuales (caídas, desorientación)

**No produce**
- Daño arbitrario
- Eventos guionados desconectados del terreno

---

### 2. Sistema climático

**Rol**  
Sistema dinámico y probabilístico que modifica el estado de la montaña. El clima puede cambiar de manera rápida e imprevista.

**Componentes**
- Viento
- Temperatura
- Nubosidad / visibilidad
- Precipitaciones

**Produce**
- Cambios en la legibilidad del entorno
- Variaciones en el costo del movimiento
- Alteraciones del nivel de riesgo a corto y mediano plazo

**Características clave**
- Nunca es completamente predecible
- Se anticipa a través de señales
- Opera en ventanas temporales, no en ciclos fijos

---

### 3. Sistema fisiológico (Cuerpo)

**Rol**  
Representa la adaptación —o la incapacidad de adaptación— del cuerpo a la altura y al esfuerzo.

**Componentes**
- Frecuencia cardíaca
- Saturación de oxígeno
- Fatiga acumulada
- Estado funcional general

**Produce**
- Reducción del rendimiento
- Mayor probabilidad de errores
- Necesidad de descanso, aclimatación o descenso

**Principio clave**  
No existe una “barra de vida” tradicional.  
Solo **capacidad funcional variable**.

---

### 4. Sistema de recursos

**Rol**  
Media la relación entre planificación y contingencia.

**Componentes**
- Agua
- Alimentos
- Descanso
- Energía disponible

**Produce**
- Estabilización o deterioro del sistema fisiológico
- Decisiones estratégicas de avance, espera o retirada

**Nota**  
Los recursos no están optimizados para maximizar el progreso, sino para **preservar el margen de decisión**.

---

### 5. Sistema de equipo

**Rol**  
Traduce la preparación previa en consecuencias físicas concretas.

**Componentes**
- Peso total transportado
- Capas de abrigo
- Protección contra viento y precipitación
- Herramientas y equipamiento específico

**Produce**
- Modificación del costo de movimiento
- Alteración del nivel de exposición climática
- Compromisos entre seguridad, fatiga y flexibilidad

---

### 6. Sistema de información (Interfaz)

**Rol**  
Canaliza señales provenientes de otros sistemas sin resolver la incertidumbre.

**Componentes**
- Dispositivo diegético (interfaz tipo reloj)
- Señales ambientales
- Registros y anotaciones del jugador

**Produce**
- Tendencias y patrones
- Alertas implícitas
- Conciencia situacional parcial

**No produce**
- Certeza absoluta
- Indicadores omniscientes

---

### 7. Sistema de decisión y consecuencia

**Rol**  
Conecta las acciones del jugador con efectos persistentes en los distintos sistemas.

**Componentes**
- Elecciones del jugador
- Estados acumulados
- Umbrales de riesgo

**Produce**
- Consecuencias graduales
- Cambios de largo plazo en condiciones futuras

**Principio clave**  
Las consecuencias no castigan.  
**Informan y condicionan** decisiones posteriores.

---

## Interacciones entre sistemas (vista simplificada)

- El **clima** modifica la **montaña**.
- La **montaña** carga al **cuerpo**.
- El **cuerpo** restringe las **decisiones**.
- Las **decisiones** afectan recursos, exposición y estados futuros.
- La **información** nunca revela el estado completo del sistema.

Ningún sistema opera de manera independiente.  
Toda retroalimentación es cruzada y acumulativa.

---

## Bucles de retroalimentación clave

El comportamiento del juego emerge a partir de un conjunto reducido de bucles sistémicos.  
Estos bucles explican cómo surgen el riesgo, la adaptación y el fracaso sin necesidad de eventos guionados.

### R1 — Espiral de exposición al frío (Reforzante)

El aumento del viento y la baja temperatura reducen la sensación térmica.  
Al descender la temperatura corporal, disminuyen la destreza física y mental, extendiendo el tiempo de exposición.  
Una mayor exposición intensifica la pérdida de calor, reforzando el bucle.

---

### B1 — Mitigación mediante el equipo (Balance)

Un abrigo y una protección adecuados reducen la pérdida de calor.  
La estabilidad térmica preserva la capacidad funcional, favoreciendo decisiones más claras y menor exposición.

---

### R2 — Bucle de fatiga y terreno (Reforzante)

Un terreno empinado o inestable incrementa el gasto energético.  
La fatiga acumulada reduce el ritmo de avance, prolongando la exposición y aumentando el esfuerzo total.

---

### B2 — Aclimatación progresiva (Balance, largo plazo)

Un ascenso gradual combinado con descanso mejora la adaptación fisiológica.  
Una mejor aclimatación reduce las penalizaciones por altura y estabiliza el rendimiento a lo largo del tiempo.

---

### R3 — Carga mental y percepción del riesgo (Reforzante)

Las condiciones adversas y la fatiga elevan la carga cognitiva.  
El estrés distorsiona la percepción del riesgo, favoreciendo decisiones deficientes y escalando el peligro.

---

## Ciclo típico de decisión

1. Lectura de señales (clima, cuerpo, entorno)
2. Interpretación bajo incertidumbre
3. Elección (avanzar, esperar, descender)
4. Consecuencia inmediata
5. Consecuencia persistente

Este ciclo se repite sin garantía de mejora lineal.

---

## Por qué esto importa para la jugabilidad

Estas interacciones sistémicas moldean la experiencia del jugador de manera concreta:

- No existe un único punto de falla.  
  Los resultados emergen de condiciones acumuladas, no de errores aislados.

- El tiempo es una variable crítica.  
  Permanecer más tiempo en condiciones adversas suele ser más determinante que una acción puntual.

- La preparación es significativa, pero nunca absoluta.  
  El equipo y los recursos mitigan el riesgo, no lo eliminan.

- La montaña actúa como un sistema activo.  
  El jugador no la vence: negocia con ella.

El juego no trata de dominar mecánicas, sino de **aprender a leer un sistema bajo incertidumbre**.

---

## Qué no define este documento

- Fórmulas matemáticas
- Diseños finales de interfaz
- Balance numérico
- Implementación técnica

Estos aspectos corresponden a etapas posteriores del desarrollo.

---

## Uso previsto

Este documento debe utilizarse para:
- Diseñar prototipos en papel o digitales de baja fidelidad
- Evaluar nuevas mecánicas
- Explicar el juego a colaboradores técnicos
- Verificar coherencia con los pilares de diseño

---

## Nota final

Los sistemas de *Aconcagua: Stone Sentinel* no buscan simular la montaña en su totalidad,  
sino **recrear la experiencia de decidir bajo sus condiciones**.

El sistema no está pensado para ser dominado,  
sino para ser leído.
