# Guía rápida para agregar datos deportivos

Esta guía resume el flujo recomendado para ampliar Analista Mundial Pro con nuevas ligas, equipos o proveedores sin romper el análisis existente.

## 1. Agregar una liga o competición

1. Actualiza el catálogo en `src/lib/providers/competitionCatalog.ts`.
2. Incluye los identificadores disponibles por proveedor:
   - API-Football: `leagueId` cuando aplique.
   - Football-Data: código de competición.
   - The Odds API: `sport_key` equivalente.
3. Agrega una fecha QA conocida en `docs/qa/manual-search-matrix.md`.
4. Verifica que una búsqueda sin datos muestre un mensaje claro, no una pantalla vacía.

## 2. Agregar un proveedor

1. Crea el cliente en `src/lib/providers/`.
2. Usa `resilientFetch` para llamadas externas con timeout y retry conservador.
3. Normaliza los datos hacia los tipos de `src/types/domain.ts`.
4. Registra el proveedor en `src/lib/providers/providerRegistry.ts`.
5. Expón estado/uso en `/api/health` si consume cuota.
6. Agrega tests unitarios del normalizador y un caso de error/rate limit.

Regla práctica: no mostrar datos como confirmados si vienen inferidos, estimados o sin fuente trazable.

## 3. Agregar escudos, logos o banderas

1. Prioriza imágenes del proveedor oficial cuando existan (`logo`, `crest`, `badge`).
2. Para selecciones, usa código ISO/bandera solo como fallback visual.
3. Si agregas un dominio de imágenes nuevo, revisa `next.config.ts` y CSP.
4. Valida localmente que el fallback siga siendo legible cuando la imagen falle.

## 4. Correr importadores

Antes de ejecutar importadores reales:

```powershell
npm run db:status
npm test
```

Después del import:

```powershell
npm run lint
npx tsc --noEmit
npm test
```

No ejecutes importadores masivos contra APIs con cuota sin revisar primero la política de caché y límites.

## 5. QA local mínimo

Usa fechas concretas:

- Mundial/selecciones: una fecha con fixtures reales y otra sin partidos.
- Liga europea: una fecha dentro de temporada.
- Caso vacío: fecha futura o competición sin cobertura.
- Cabina: abrir detalle, revisar resumen, mercados, fuentes y health panel.

Checklist rápido:

- La búsqueda no queda en blanco.
- La zona horaria se muestra en Colombia/COT.
- Los porcentajes cambian cuando cambian datos base, cuotas o bajas.
- Las fuentes indican si el dato es confirmado, estimado, inferido o no disponible.
- `/api/health` explica proveedor, uso, telemetría y base de datos.
