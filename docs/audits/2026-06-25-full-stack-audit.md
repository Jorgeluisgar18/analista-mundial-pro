# Auditoría integral de Analista Mundial Pro

**Fecha:** 25 de junio de 2026

**Rama auditada:** `codex/analista-mundial-pro`

**Commit base:** `eb13661`

## Estado general

La aplicación compila, funciona visualmente en escritorio y móvil y tiene una
base técnica aprovechable. Todavía no debe utilizarse para decisiones reales de
apuestas porque existen defectos críticos en un mercado de goles y en el flujo
de recálculo manual.

## Verificaciones superadas

- 22 pruebas unitarias e integración.
- 3 recorridos E2E en Chromium.
- Build de producción y ESLint.
- `npm audit`: 0 vulnerabilidades conocidas.
- Prisma válido y migración al día.
- SQLite `integrity_check`: `ok`.
- Cero violaciones de claves foráneas.
- Sin errores de consola ni desbordamiento horizontal en las vistas auditadas.

## Hallazgos P0

### P0-01: probabilidad incorrecta para el mercado visitante +1.5 goles

`src/lib/analysis/analysisEngine.ts` calcula el mercado utilizando cuatro
celdas de la matriz y una división entre dos. En el dataset demo muestra 82.3%,
pero la probabilidad derivada de toda la matriz es 46.5%.

### P0-02: los cambios manuales no modifican el pronóstico

El override se persiste, pero el motor recibe el dataset original. Antes y
después del cambio permanecen idénticas las probabilidades 1X2, métricas
esperadas y predicciones. En la base auditada había siete overrides y solo dos
análisis con el mismo `inputHash`.

## Hallazgos P1

- Los partidos obtenidos por API no se crean automáticamente en la base.
- Las etiquetas de The Odds API no se normalizan al dominio interno.
- Value betting y surebets no están conectados al dashboard.
- Open-Meteo, `resolveEvidence`, `EvidenceRecord`, `OddsSnapshot` y `ApiUsage`
  están implementados parcialmente o desconectados.
- Los mercados secundarios usan heurísticas y nombres de Colombia/Brasil
  codificados directamente.
- Las rutas mutables carecen de autenticación y rate limiting para un eventual
  despliegue público.
- Los filtros de competiciones de la UI no corresponden a identificadores de
  los proveedores.

## Hallazgos P2

- El panel manual no implementa semántica de diálogo, foco modal ni cierre con
  Escape.
- Faltan headers de endurecimiento HTTP.
- El manejo de JSON malformado devuelve 500.
- La cobertura total es 66.8% de líneas y 47.2% de ramas; proveedores y
  servicios tienen cobertura insuficiente.
- `AnalysisCabin.tsx` y `globals.css` requieren división por responsabilidades.

## Orden de remediación

1. Corregir los dos P0 con pruebas de regresión.
2. Persistir partidos y snapshots de proveedores.
3. Normalizar cuotas y conectar value/surebets.
4. Sustituir heurísticas por modelos específicos y calibrables.
5. Conectar clima, evidencia y presupuesto real de APIs.
6. Endurecer seguridad y accesibilidad.
7. Ejecutar una segunda auditoría integral.

## Limitaciones de la auditoría

- El navegador integrado no pudo inicializarse por
  `codex/sandbox-state-meta: missing field sandboxPolicy`; se utilizó
  Playwright local.
- CodeRabbit CLI no ofrece instalador compatible con el entorno
  `mingw64_nt-10.0-26200`.
- El escaneo profundo de Codex Security requiere agentes paralelos no
  disponibles en este hilo, por lo que no se afirmó cobertura exhaustiva.

## Estado de remediación al 25 de junio de 2026

Resuelto y verificado:

- Corrección del mercado visitante +1.5 y recálculo efectivo de bajas manuales.
- Persistencia de partidos externos, snapshots, evidencia y cuotas.
- Normalización de mercados, value betting y arbitraje aritmético dinámico.
- Protección de rutas mutables con mismo origen, rate limiting y cabeceras HTTP.
- Diálogo manual accesible con foco atrapado, Escape y restauración del foco.
- Catálogo único para Mundial, Premier League, Champions League, Europa League,
  La Liga, Bundesliga, Serie A y Ligue 1.
- Traducción de filtros para Football-Data.org y filtrado seguro de resultados
  de API-Football sin enviar slugs incompatibles.
- Integración de Open-Meteo mediante geocodificación de la ciudad y consulta
  horaria en UTC.
- Registro real de consumo de API por minuto, día, mes o fair-use.
- Mercados secundarios sin nombres fijos de la demo y con probabilidades de
  conteo basadas en Poisson para corners, tarjetas, faltas, disparos y fueras
  de juego.
- Narrativa del motor y textos de cabina parametrizados por los equipos reales
  del partido.
- Cambios manuales estructurados para bajas, titulares, formación, árbitro,
  clima, cuotas y suspensión, con impacto explícito sobre dataset/modelo cuando
  corresponde.
- Política explícita de frescura por recurso con ventanas prepartido T-90/T-15
  y reutilización de snapshots frescos de clima/cuotas para conservar llamadas
  API.
- Caché persistente sobre `MatchSnapshot` para reutilizar datasets frescos con
  alineaciones, lesiones y estadísticas sin invocar el proveedor principal.

Pendiente para una siguiente fase:

- Calibrar los modelos de conteo por competición con histórico real y pesos
  entrenables, en lugar de líneas base globales.
- Preparar una base de datos con mayor concurrencia antes de un despliegue
  multiusuario y dividir los componentes de interfaz más grandes.
