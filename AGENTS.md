# AGENTS.md — instrucciones recurrentes del repositorio

Este archivo define reglas operativas para cualquier persona o agente que contribuya al proyecto.

## 1) Política de documentación de cambios (obligatoria)

Cada cambio funcional, técnico o de seguridad debe quedar documentado en el mismo PR/commit donde se implementa:

1. **Actualizar `CHANGELOG.md`** usando formato Keep a Changelog.
2. Registrar el cambio en la versión correcta:
   - Si aún no se publica una versión: sección **`[Unreleased]`**.
   - Si forma parte de una release en curso: mover/ordenar al bloque versionado correspondiente.
3. Clasificar cada ítem en la categoría adecuada: **Added / Changed / Fixed / Security / Removed / Deprecated**.
4. Describir el cambio con alcance concreto (archivo, módulo, comportamiento).

## 2) Cuándo actualizar otros documentos

Además del changelog:

- **`README.md` / `README.es.md`**: cuando cambien flujo de uso, rutas, comandos, estado del prototipo o arquitectura visible.
- **`CONTRIBUTING.md`**: cuando cambien políticas de contribución, pruebas, formato de commits o validaciones.
- **`docs/`**: cuando cambien contratos mecánicos, modelos sistémicos, o decisiones de arquitectura.

## 3) Checklist mínimo antes de merge

- [ ] Changelog actualizado.
- [ ] Documentación sincronizada (README/CONTRIBUTING/docs) según corresponda.
- [ ] Tests relevantes ejecutados localmente (`npm test`, `pytest`, validación de escenarios si aplica).
- [ ] Sin contradicciones entre documentación y comportamiento real del código.

## 4) Convención para entradas de changelog

- Escribir en inglés (idioma canónico del repositorio).
- Usar frases breves en pasado descriptivo, orientadas a impacto.
- Evitar entradas vagas como “misc fixes”.
- Si un cambio afecta seguridad, **debe** figurar explícitamente en `### Security`.

## 5) Mantenimiento histórico

- No borrar historial previo del changelog.
- Si se corrige una versión histórica, indicar ajuste retroactivo en el texto de esa versión.
- Mantener orden descendente por versión (más nueva arriba).
