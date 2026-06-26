# Analista Mundial Pro

Aplicación web personal y local-first para análisis estadístico, táctico y probabilístico de partidos de fútbol antes del inicio. Funciona sin claves mediante un modo demostración claramente identificado y está preparada para Mundial, ligas europeas y competiciones UEFA.

No genera análisis en vivo ni promete resultados. Las probabilidades son apoyo analítico, no certezas.

## Funciones

- Búsqueda de partidos por fecha y competición.
- Adaptadores server-only para API-Football, Football-Data.org, The Odds API y Open-Meteo.
- Modo demo completo cuando no hay claves o cobertura.
- Dashboard “Cabina editorial” con diez categorías y subsecciones detalladas.
- Poisson, corrección Dixon–Coles, Elo, regresión logística y Monte Carlo.
- Mercados de resultado, marcador, goles, corners, tarjetas, faltas, disparos, jugadores y fueras de juego.
- Probabilidad, intervalo, confianza, cuota mínima, valor esperado, motivo y riesgo.
- Detector matemático de surebets sin denominarlas apuestas seguras.
- Estados de evidencia: confirmado, esperado, inferido, conflicto y no disponible.
- Cambios manuales auditables con recálculo.
- SQLite/Prisma para snapshots, análisis, cuotas, overrides y versiones.
- Exportación HTML autónoma.
- Diseño responsive y accesible.

## Requisitos

- Node.js 20 o superior.
- npm.

## Instalación

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

`npm install` ejecuta también `prisma generate`.

## Variables de entorno

Copia `.env.example` como `.env`:

```dotenv
DATABASE_URL="file:./prisma/dev.db"
FOOTBALL_API_KEY=""
FOOTBALL_DATA_API_KEY=""
ODDS_API_KEY=""
OPENAI_API_KEY=""
```

Todas las claves son opcionales. Ninguna se incluye en el bundle del navegador.

- `FOOTBALL_API_KEY`: [API-Football](https://www.api-football.com/)
- `FOOTBALL_DATA_API_KEY`: [Football-Data.org](https://www.football-data.org/)
- `ODDS_API_KEY`: [The Odds API](https://the-odds-api.com/)
- `OPENAI_API_KEY`: reservado para redacción opcional futura; el análisis actual es determinista y funciona sin esta clave.

Consulta los límites vigentes de cada proveedor. La aplicación evita sondeos continuos y prioriza actualización bajo demanda.

Para validar la configuración sin revelar secretos, abre `/api/provider-status`.
La guía visual está en `/docs/provider-setup` y el documento de referencia en `docs/provider-setup.md`.

## Ejecución

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Uso

1. Selecciona una fecha.
2. Pulsa **Buscar partidos**.
3. Elige un partido.
4. Navega las categorías y subsecciones del informe.
5. Pulsa **Actualizar datos** para consultar recursos vencidos.
6. Usa **Cambios manuales** para registrar una novedad verificable.
7. Pulsa **Exportar HTML** para guardar un informe autónomo.

El ejemplo incluido usa la fecha `2026-06-15` y se rotula siempre como demostración.

## Motor de análisis

### Marcadores y goles

- Intensidades ofensivas y defensivas.
- Distribución de Poisson.
- Corrección Dixon–Coles para marcadores bajos.
- Matriz completa de resultados.

### Ensamble 1X2

- 60 % Dixon–Coles.
- 20 % simulación Monte Carlo reproducible.
- 20 % regresión logística regularizada mediante coeficientes versionados.

El peso puede evolucionar por competición cuando exista una muestra histórica suficiente.

### Valor esperado

```text
EV = probabilidad_modelo × cuota_decimal − 1
```

Se elimina primero el margen del mercado al comparar resultados mutuamente excluyentes.

### Arbitraje aritmético

```text
Σ (1 / mejor_cuota_resultado) < 1
```

Una coincidencia se muestra como “oportunidad aritmética detectada”. Latencia, límites, reglas, comisiones y anulaciones pueden eliminarla antes de ejecutar.

### Evaluación prevista

- Brier Score.
- Log loss.
- Ranked Probability Score.
- Calibración.
- MAE para conteos.
- ROI/yield como métricas económicas secundarias.

Gradient boosting permanece desactivado hasta contar con suficiente historial temporal fuera de muestra. Activarlo sin datos sería sobreajuste, no ciencia.

## Datos y evidencia

La precedencia es:

1. Fuente oficial reciente.
2. Proveedor estructurado.
3. Entrada manual con fuente.
4. Inferencia.

Cuando falte árbitro, clima, xG, lesiones, alineaciones o datos de jugadores, la interfaz muestra **“Dato no disponible en la fuente actual”** o bloquea el mercado afectado.

No se implementa scraping de páginas que no autoricen acceso automatizado. Las fuentes oficiales se registran mediante enlaces verificables.

## Comandos

```bash
npm test          # Vitest
npm run test:e2e  # Playwright
npm run lint      # ESLint
npm run build     # Compilación de producción
npm run db:seed   # Datos locales iniciales
```

## Estructura

```text
src/app          páginas y rutas internas
src/components   interfaz
src/data         datos demo
src/lib/analysis motor de análisis
src/lib/models   modelos matemáticos
src/lib/providers adaptadores externos
src/lib/services orquestación
src/types        dominio normalizado
prisma           esquema, migraciones y seed
tests            unitarias, integración y e2e
```

## Advertencia

Este sistema es de apoyo analítico y no garantiza ganancias. Las apuestas deportivas implican riesgo de pérdida de dinero. No apuestes dinero que no puedas perder.
