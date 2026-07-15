# Production smoke check

Este smoke valida una URL productiva o preview ya desplegada. No ejecuta deploy.

## Requisito

`SMOKE_BASE_URL` es obligatorio. No uses URLs históricas sin confirmarlas en Netlify.

PowerShell:

```powershell
$env:SMOKE_BASE_URL = "https://tu-sitio-activo.netlify.app"
npm run smoke:production
Remove-Item Env:\SMOKE_BASE_URL
```

Bash:

```bash
SMOKE_BASE_URL=https://tu-sitio-activo.netlify.app npm run smoke:production
```

## Qué valida

- `/api/health` responde JSON y reporta base de datos conectada.
- `/api/provider-status` responde JSON.
- `/api/matches?date=2026-06-15` responde JSON con `matches` como arreglo.

## Qué no valida

- No recorre todo el frontend.
- No sustituye Playwright.
- No certifica precisión estadística.
- No confirma datos de última hora como alineaciones oficiales, lesiones o cuotas.

## Seguridad y consumo

El script no imprime secretos. Ejecutarlo solo después de un deploy autorizado para evitar consumo innecesario de hosting/proveedores.
