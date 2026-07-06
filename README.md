# Analista Mundial Pro

Analista Mundial Pro es una aplicación web para preparar análisis de partidos de fútbol antes del inicio. La idea es combinar datos deportivos, contexto histórico, cuotas, alineaciones, forma reciente y modelos probabilísticos para entregar una lectura clara, útil y explicable.

Nació pensando en el Mundial 2026, pero la arquitectura está pensada para crecer hacia ligas europeas, Champions League y otras competiciones con buen mercado de datos.

> No es una app de análisis en vivo y no promete resultados. Las probabilidades son apoyo analítico, no certezas.

## Qué hace

- Busca partidos por fecha y competición.
- Integra proveedores deportivos reales con fallback controlado.
- Normaliza datos de múltiples fuentes para que el análisis sea consistente.
- Genera informes prepartido con lectura ejecutiva, táctica, mercados, fuentes y señales de riesgo.
- Usa modelos como Poisson, Dixon-Coles, simulación Monte Carlo, forma histórica y calibración.
- Calcula probabilidades, confianza del modelo, valor esperado y señales de mercado.
- Maneja alineaciones confirmadas, oficiales parciales, esperadas o no disponibles.
- Muestra escudos, banderas y visualización táctica cuando los datos están disponibles.
- Permite cambios manuales auditables para ajustar información de último momento.
- Exporta informes en HTML.
- Incluye pruebas unitarias, integración y e2e para cuidar la calidad.

## Fuentes y proveedores

El proyecto está preparado para trabajar con:

- API-Football
- Football-Data.org
- Footballdata.io
- TheSportsDB
- The Odds API
- OpenFootball como fuente abierta para contexto histórico
- Neon Postgres para persistencia

Todas las claves se leen desde variables de entorno del servidor. Ninguna clave debe vivir en el código ni llegar al navegador.

## Enfoque del análisis

El motor busca que cada porcentaje tenga contexto. No se trata de mostrar números bonitos repetidos, sino de explicar de dónde vienen:

- producción ofensiva y defensiva;
- forma reciente ponderada por recencia;
- fuerza relativa del rival;
- histórico disponible;
- cuotas y margen del mercado;
- alineaciones y disponibilidad;
- calibración mediante métricas como Brier Score, Log Loss y RPS.

Cuando faltan datos, la interfaz debe decirlo con claridad y bajar la confianza del modelo en vez de inventar certeza.

## Stack

- Next.js
- React
- TypeScript
- Prisma
- Neon Postgres
- Netlify
- Vitest
- Playwright
- Zod

## Requisitos

- Node.js 20 o superior
- npm
- Una base Postgres/Neon si quieres persistencia real
- Claves de proveedores si quieres datos reales en vez de fallback/demo

## Configuración local

Instala dependencias:

```bash
npm install
```

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Configura solo las variables que vayas a usar. Para desarrollo puedes arrancar sin todas las claves; la app debe degradar a cache, fallback o demo cuando un proveedor no esté disponible.

Variables principales:

```env
DATABASE_URL=""
DIRECT_URL=""
FOOTBALL_API_KEY=""
FOOTBALL_DATA_API_KEY=""
FOOTBALLDATA_IO_API_KEY=""
THE_SPORTS_DB_API_KEY=""
ODDS_API_KEY=""
```

Importante: no subas `.env.local`, `.env` ni tokens reales al repositorio.

## Base de datos

Genera Prisma y aplica migraciones:

```bash
npm run db:generate
npm run db:migrate
```

Para cargar datos iniciales:

```bash
npm run db:seed
```

En producción, la app debe usar Neon/Postgres. Si no hay base configurada, algunos flujos funcionan en modo limitado sin persistencia.

## Ejecutar en desarrollo

```bash
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

## Comandos útiles

```bash
npm run lint       # Revisión de estilo y errores estáticos
npm test           # Pruebas unitarias e integración
npm run test:e2e   # Pruebas de navegador con Playwright
npm run build      # Build de producción
npm run db:status  # Estado de migraciones Prisma
```

## Estructura del proyecto

```text
src/app                 Rutas, páginas y endpoints internos
src/components          Interfaz y componentes visuales
src/components/analysis Cabina de análisis e informe del partido
src/lib/analysis        Motor de análisis probabilístico
src/lib/backtesting     Métricas y validación histórica
src/lib/historical      Forma reciente y señales históricas
src/lib/lineups         Alineaciones esperadas y parciales
src/lib/providers       Adaptadores de proveedores externos
src/lib/services        Orquestación entre datos, DB y análisis
src/types               Tipos de dominio normalizados
prisma                  Esquema, migraciones y seed
tests                   Unitarias, integración y e2e
docs                    Auditorías, handoff y documentación técnica
```

## Calidad y QA

Antes de considerar estable un cambio importante, se recomienda correr:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
npm run build
```

También es recomendable revisar manualmente:

- búsqueda por fecha;
- estados vacíos;
- análisis de un partido con datos reales;
- análisis con datos incompletos;
- actualización de alineaciones;
- visualización responsive;
- endpoints `/api/health`, `/api/provider-status` y `/api/usage`.

## Seguridad

Buenas prácticas del repo:

- `.env`, `.env.local` y `.env.*` están ignorados.
- `.env.example` solo debe contener nombres de variables o valores vacíos.
- Las claves deben configurarse en local o en el panel del hosting.
- Los endpoints de estado no deben revelar secretos.
- Antes de hacer público el repositorio, conviene escanear el árbol actual y el historial Git.

## Despliegue

El proyecto está preparado para Netlify con Next.js. Si el sitio está conectado por Git, recuerda que un push a la rama de producción puede disparar builds si Netlify tiene los builds activos.

Para evitar consumo accidental de créditos, puedes pausar builds en Netlify antes de subir cambios grandes y activarlos solo cuando quieras desplegar.

## Documentación útil

- `docs/provider-setup.md`: configuración de proveedores.
- `docs/deployment/netlify-neon-postgres.md`: guía de despliegue con Neon.
- `docs/qa/manual-search-matrix.md`: matriz de QA manual.
- `docs/handoff/2026-06-29-complejidad-empalme-produccion.md`: empalme y bitácora técnica.
- `docs/audits/claude/2026-07-06-claude-web-free.md`: guía para auditoría externa con Claude Web Free.

## Aviso responsable

Analista Mundial Pro es una herramienta de apoyo analítico. Las apuestas deportivas implican riesgo financiero. No existe modelo que garantice ganancias ni aciertos perfectos.
