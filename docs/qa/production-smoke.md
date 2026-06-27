# Production Smoke Check

Este smoke sirve para validar un deploy de Netlify después de subir cambios a producción. Es una comprobación corta: confirma que la app responde, que la base de datos está conectada y que el endpoint de partidos mantiene una respuesta estructurada.

## Comando

```bash
npm run smoke:production
```

Por defecto usa:

```text
https://shiny-torte-4f01e2.netlify.app
```

Para validar otro deploy:

```bash
SMOKE_BASE_URL=https://tu-sitio.netlify.app npm run smoke:production
```

En PowerShell:

```powershell
$env:SMOKE_BASE_URL = "https://tu-sitio.netlify.app"
npm run smoke:production
Remove-Item Env:\SMOKE_BASE_URL
```

## Qué valida

- `/api/health` devuelve un objeto y reporta `database: "connected"`.
- `/api/provider-status` devuelve un objeto.
- `/api/matches?date=2026-06-15` devuelve un objeto con `matches` como arreglo.

## Qué no valida

- No prueba todo el frontend.
- No mide precisión estadística ni calidad de predicciones.
- No confirma alineaciones, lesiones, cuotas ni datos de última hora.
- No reemplaza Playwright ni las auditorías manuales antes de cambios grandes.

## Seguridad y consumo

El script no imprime secretos. Solo muestra URL base, estado de base de datos y cantidad de partidos recibidos.

Para ahorrar créditos y cuota de proveedores, ejecútalo una vez después de un deploy real, no en cada commit local.
