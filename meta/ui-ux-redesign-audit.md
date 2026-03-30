# UI/UX Redesign Audit — Public Landing (Revision)

## Diagnóstico actualizado

1. **Desalineación visual con el producto principal**
   - La landing no reflejaba suficientemente la paleta del prototipo web-v1 (tema sunset), debilitando coherencia de marca entre entrada pública y experiencia jugable.

2. **Idioma por defecto no orientado a público global**
   - La experiencia anterior era ES-first sin selector de idioma visible, aumentando fricción para audiencias internacionales y prensa externa.

3. **Narrativa y jerarquía mejorables**
   - Había estructura sólida, pero faltaba un patrón explícito EN-default + switch instantáneo para señal de producto “public-ready”.

4. **Necesidad de i18n utilitario en UI estática**
   - Se requería traducción de navegación, hero, módulos de sistema/estado/outcomes y metadatos (title/description), no solo copy parcial.

5. **Documentación poco visualizada en landing**
   - La visibilidad documental era baja: whitepaper/roadmap estaban linkeados pero no aparecían como bloques visuales fáciles de escanear.

## Hipótesis de posicionamiento

La landing debe comunicar una identidad **premium, coherente con web-v1, internacional por defecto y bilingüe sin fricción**, preservando tono autoral de montaña + sistemas.

## Oportunidades

- Convertir documentos enlazados (whitepaper/roadmap/repo-truth) a lectura enriquecida bajo estilo de marca consistente.
- Alinear color tokens a la base sunset del prototipo.
- Convertir landing a EN-default con selector EN/ES persistente.
- Mantener semántica, accesibilidad y ritmo editorial sin recargar UI.

## Principios rectores

1. **Coherencia de marca inter-superficie** (landing ↔ prototipo).
2. **Internacionalización práctica** (EN por defecto + ES inmediato).
3. **Escaneabilidad premium** con jerarquía y CTA claras.
4. **Accesibilidad y performance first** en una página estática.

## Decisiones estratégicas

- Rehacer la landing sobre tokens inspirados en `prototype/web-v1/css/themes.css` (sunset).
- Implementar i18n client-side liviano con:
  - diccionario EN/ES,
  - persistencia localStorage,
  - traducción de texto + atributos + metadatos.
- Mantener IA modular (vision/system/status/outcomes) y CTA principal hacia web-v1.
