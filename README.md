# Analista Mundial Pro

Analista Mundial Pro es una aplicación web para analizar partidos de fútbol antes del inicio. El proyecto combina datos deportivos, cuotas, contexto histórico, alineaciones y modelos probabilísticos para construir informes claros y explicables.

La primera versión está pensada para el Mundial 2026, pero la base está preparada para crecer hacia ligas europeas, Champions League y otros torneos.

## Qué ofrece

- Búsqueda de partidos por fecha y competición.
- Informes prepartido con lectura ejecutiva, táctica, mercados y fuentes.
- Probabilidades 1X2, goles, marcadores y mercados relacionados.
- Integración con proveedores deportivos y fuentes abiertas.
- Soporte para alineaciones confirmadas, parciales o esperadas.
- Contexto histórico, forma reciente y calibración del modelo.
- Visualización responsive para escritorio y móvil.

## Enfoque

El objetivo no es mostrar predicciones genéricas, sino explicar el razonamiento detrás de cada análisis:

- rendimiento reciente;
- fuerza relativa de los equipos;
- datos históricos;
- cuotas disponibles;
- estado de alineaciones;
- confianza del modelo;
- disponibilidad y calidad de las fuentes.

Cuando falta información, la aplicación debe mostrarlo de forma clara en lugar de inventar certeza.

## Stack

- Next.js
- React
- TypeScript
- Prisma
- Neon Postgres
- Netlify
- Vitest
- Playwright

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre:

```text
http://localhost:3000
```

Para usar datos reales, crea un `.env.local` a partir de `.env.example` y agrega tus propias claves de proveedores.

## Scripts principales

```bash
npm run dev       # desarrollo local
npm run build     # build de producción
npm run lint      # revisión estática
npm test          # pruebas unitarias e integración
npm run test:e2e  # pruebas end-to-end
```

## Estado del proyecto

El proyecto está en evolución activa. Actualmente se está fortaleciendo el motor de análisis, la integración con proveedores, el histórico deportivo, la calibración de probabilidades y la experiencia visual del informe.

## Aviso responsable

Analista Mundial Pro es una herramienta de apoyo analítico. No garantiza resultados ni ganancias. Las apuestas deportivas implican riesgo financiero.
