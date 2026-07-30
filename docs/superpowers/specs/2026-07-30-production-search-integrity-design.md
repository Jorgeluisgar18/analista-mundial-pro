# Integridad de búsquedas y alineaciones en producción

## Objetivo

Hacer que producción distinga una consulta sin partidos de una caída real de proveedores, y evitar que se presenten pronósticos de alineación después de que un encuentro finalizó.

## Decisiones aprobadas

- Si al menos un proveedor responde correctamente, aunque ninguno tenga partidos, devolver `200` con `matches: []`, las advertencias de cobertura y un mensaje consumible por la UI.
- Si todos los proveedores fallan o son omitidos por cuota, conservar `503` seguro: representa indisponibilidad, no un vacío deportivo.
- `withExpectedLineups` solo puede crear o completar un XI esperado para encuentros futuros o en curso. Para encuentros finalizados sin once del proveedor, debe conservar una evidencia `unavailable` sin inventar formación ni jugadores.
- Las cuotas solo se muestran cuando The Odds API está configurada y devuelve mercado coincidente. Su configuración se mantiene exclusivamente en variables seguras de Netlify.

## Flujo

1. Cada proveedor de calendario informa si su llamada fue exitosa, aun cuando su lista sea vacía.
2. El servicio agrega advertencias y devuelve una respuesta vacía si hubo alguna respuesta válida.
3. Si no hubo ninguna respuesta válida, eleva el error de indisponibilidad existente.
4. El enriquecedor de alineaciones evalúa `match.status` antes de inferir un XI.
5. La salud operativa sigue indicando si The Odds API está configurada; una ronda QA posterior valida un único mercado real.

## Verificación

- Tests unitarios de lista vacía, fallo total y alineaciones terminadas sin XI.
- Tests de integración existentes para los flujos reales y demo.
- QA de producción posterior al despliegue: Mundial, Premier, Champions, LaLiga, fecha vacía y un partido con cuotas cuando estén habilitadas.
