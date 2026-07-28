# Production Readiness Design

## Objetivo

Eliminar el uso accidental de datos demo en produccion y cerrar los riesgos de operacion que impiden certificar Analista Mundial Pro como una aplicacion con datos reales.

## Alcance y division

El cierre se divide en bloques independientes para conservar cambios pequenos y verificables:

1. **Produccion fail-closed.** En produccion, una base de datos o proveedor de futbol no disponible no debe devolver muestra demo. Las respuestas deben explicar la indisponibilidad con un problema HTTP estructurado. Desarrollo y tests conservan fixtures demo para poder trabajar sin cuotas externas.
2. **Estabilidad de QA y CI.** El flujo E2E de navegacion debe dejar de ser intermitente bajo la configuracion normal. GitHub Actions debe ejecutar las verificaciones relevantes sin requerir secretos ni tocar proveedores reales.
3. **Cobertura de contratos operativos.** Se agregan pruebas dirigidas a cache, uso de API, health e historial, priorizando las ramas que hoy tienen cobertura baja y afectan disponibilidad o trazabilidad.
4. **Plan y documentacion viva.** Se crea un plan activo separado de los planes archivados, con estado, responsable y criterio de cierre para cada bloque.
5. **QA real y certificacion.** Se ejecuta la matriz de proveedores que no exceda los limites acordados y se prepara el smoke productivo. La certificacion final depende de una URL Netlify activa y de autorizacion explicita para desplegar o promover.

## Comportamiento de datos

| Entorno | Base de datos / proveedor real | Resultado de busqueda o detalle |
|---|---|---|
| Desarrollo o test | No disponible | Fixture demo claramente etiquetado, sin llamadas externas obligatorias. |
| Desarrollo o test | Disponible | Datos reales, cache y persistencia cuando apliquen. |
| Produccion | Neon y proveedor disponibles | Datos reales con evidencia, cache y telemetria. |
| Produccion | Neon o proveedor no disponible | Error operativo explicito; nunca fixture demo ni persistencia no-op silenciosa. |

`NODE_ENV === "production"` sera la regla de seguridad principal. Una bandera de entorno opcional solo podra endurecer la regla, no reactivar demo en produccion.

## Limites de seguridad

- Las claves permanecen exclusivamente en variables de entorno del servidor.
- `/api/provider-status` y `/api/health` pueden exponer estado y motivo seguro, pero no valores de variables ni cadenas de conexion.
- Las escrituras de base de datos se mantienen fuera de GET/export cuando no son necesarias.
- El smoke productivo no se ejecuta sin una URL confirmada por el owner.

## Estabilidad y CI

La prueba E2E que navega desde la busqueda a la cabina se hara determinista esperando la navegacion iniciada por el enlace, en vez de depender de un timeout posterior al click. La configuracion de Playwright se validara tanto con su paralelismo normal como en ejecucion serial.

El workflow CI conservara Node 22 y agregara validacion Prisma y E2E con fixtures locales. No se agregaran llamadas a APIs de futbol ni variables privadas al pipeline.

## Pruebas de aceptacion

1. Una busqueda sin proveedor en produccion responde un problema operativo y no contiene ids, copy ni resultados demo.
2. Un detalle demo se rechaza en produccion y sigue disponible en test/desarrollo.
3. Health distingue conectado, no configurado y no disponible sin filtrar secretos.
4. E2E normal y serial pasan de forma repetible.
5. CI ejecuta lint, typecheck, schema Prisma, unit/integration, E2E y build.
6. El plan activo registra lo terminado, lo bloqueado externamente y los limites de cuota para QA real.

## Fuera de alcance de este primer diseno

- Desplegar, promover o reactivar builds de Netlify sin autorizacion explicita del owner.
- Implementar autenticacion multiusuario y workspaces: continua como bloque posterior.
- Calibracion automatica por liga, comparacion formal de proveedores y Agents SDK: quedan como siguientes bloques de producto una vez certificada la operacion base.
