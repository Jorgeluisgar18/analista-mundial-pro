# Analista Mundial Pro

Analista Mundial Pro es una aplicación web para analizar partidos de fútbol antes del inicio. El proyecto combina datos deportivos, cuotas, contexto histórico, alineaciones y modelos probabilísticos para construir informes claros y explicables.

La primera versión está pensada para el Mundial 2026, pero la base está preparada para crecer hacia ligas europeas, Champions League y otros torneos.

## Qué ofrece

- Búsqueda de partidos por fecha y competición.
- Informes prepartido con lectura ejecutiva, táctica, mercados y fuentes.
- Probabilidades 1X2, goles, marcadores y mercados relacionados.
- Integración con proveedores deportivos y fuentes abiertas.
- Soporte para alineaciones confirmadas, parciales o esperadas.
- Contexto histórico, Elo calculado desde resultados previos, forma reciente y calibración del modelo.
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

Para usar datos reales, crea un `.env.local` a partir de `.env.example` y agrega tus propias claves de proveedores. En desarrollo y pruebas la aplicación puede usar fixtures locales, sin consumir cuota ni llamar proveedores externos. En producción opera con datos reales: si no están disponibles, responde de forma segura en vez de mostrar partidos demo.

## Scripts principales

```bash
npm run dev       # desarrollo local
npm run build     # build de producción
npm run lint      # revisión estática
npm test          # pruebas unitarias e integración
npm run test:e2e  # pruebas end-to-end
```

## Documentación útil

### Concurrencia del límite persistente

El workflow `PostgreSQL rate limit` comprueba solicitudes simultáneas sobre una
base PostgreSQL efímera de CI. Crea y elimina únicamente un esquema de prueba
con nombre único; no ejecuta migraciones ni utiliza `DATABASE_URL` o Neon.
El test requiere `RATE_LIMIT_TEST_POSTGRES=1`, un puerto local explícito y
`RATE_LIMIT_TEST_PASSWORD`. El workflow proporciona los valores de su servicio
temporal; sin activación, la prueba queda omitida al ejecutar `npm test`.

El consumo del bucket se realiza en una sola operación atómica, conservando
la clave por cliente y el reinicio al vencer la ventana. Si Postgres falla,
se mantiene el fallback de memoria existente; ese fallback no es un contador
distribuido entre instancias.

### Origen de las solicitudes que cambian estado

Los POST de `/api/match/[id]/analyze`, `/api/match/[id]/refresh` y
`/api/match/[id]/overrides` requieren un encabezado `Origin` idéntico al origen
de la URL de la aplicación. Por ejemplo,
para una aplicación en `https://app.example`, el valor es `https://app.example`,
sin ruta ni barra final. Los clientes de scripts también deben enviarlo.

Un origen ausente, vacío, `null` o diferente devuelve 403 antes de consultar
servicios, consumir límites de solicitudes o leer el cuerpo. Este control no
autentica a clientes externos ni reemplaza los límites de solicitudes o la
credencial de analista requerida para cambios manuales.

### Guías

- `docs/data-sources/provider-onboarding.md`: guía para agregar ligas, proveedores, escudos/importadores y QA local.
- `docs/qa/manual-search-matrix.md`: matriz manual para validar búsquedas, cabina y estados vacíos.
- `docs/guides/provider-setup.md`: configuración técnica y comportamiento de proveedores por entorno.
- `docs/qa/real-api-qa-runbook.md`: ronda autorizada de QA con APIs reales y presupuesto de cuota.

## Estado del proyecto

El proyecto está en evolución activa. Actualmente se está fortaleciendo el motor de análisis, la integración con proveedores, el histórico deportivo, la calibración de probabilidades y la experiencia visual del informe.

## Aviso responsable

Analista Mundial Pro es una herramienta de apoyo analítico. No garantiza resultados ni ganancias. Las apuestas deportivas implican riesgo financiero.

### Acceso privado de administrador

`/auth/sign-in` permite iniciar y cerrar sesión con una cuenta administradora de Neon Auth. La cuenta debe existir y tener su correo verificado; configura `NEON_AUTH_BASE_URL` (HTTPS), `NEON_AUTH_COOKIE_SECRET` (secreto aleatorio de al menos 32 caracteres) y `ANALYST_ADMIN_EMAIL` como variables privadas. No publiques correo, contraseña ni secretos en Git.

Este primer cambio incorpora el acceso privado sin registro público ni proxy general de autenticación. La autorización por token de los cambios manuales se conserva hasta la siguiente unidad, que activa la sesión administradora. El resto de la aplicación mantiene su acceso actual. Las pruebas offline no certifican el servicio administrado ni el login/logout desplegado.
