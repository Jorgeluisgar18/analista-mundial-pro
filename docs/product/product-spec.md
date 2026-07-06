# Analista Mundial Pro — Diseño del producto

## 1. Propósito

Analista Mundial Pro será una aplicación web personal y local para estudiar partidos de fútbol antes del inicio. Su primera aplicación práctica será el Mundial FIFA 2026, pero la arquitectura no dependerá de ese torneo: permitirá incorporar posteriormente Premier League, LaLiga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League y otras competiciones.

El producto apoyará decisiones informadas mediante datos, modelos matemáticos y explicaciones auditables. Nunca empleará expresiones como “apuesta segura”, ni garantizará resultados o ganancias.

La primera versión será exclusivamente prepartido. Podrá mostrar el estado o resultado de un encuentro, pero no generará análisis ni recomendaciones de apuestas en vivo.

## 2. Principios

1. **Gratis como requisito:** ningún servicio de pago será necesario para utilizar el producto.
2. **Local-first:** la aplicación, la base de datos, el historial y los modelos funcionarán en el equipo del usuario.
3. **Datos antes que narrativa:** las probabilidades serán calculadas por código; OpenAI será opcional y solo podrá redactar explicaciones a partir de resultados estructurados.
4. **Trazabilidad:** todo dato tendrá fuente, fecha de consulta y estado de evidencia.
5. **No inventar:** la ausencia de información se mostrará explícitamente.
6. **Multicompetición:** selecciones y clubes podrán compartir infraestructura, pero tendrán parámetros y modelos ajustados a su contexto.
7. **Uso responsable:** el aviso de riesgo estará permanentemente visible.

## 3. Alcance funcional

### 3.1 Inicio

- Selección de fecha.
- Selección de competición, con “Todas” como opción.
- Consulta de partidos disponibles.
- Selector visual con hora, equipos, torneo, fase y estado.
- Indicador del origen de los datos: API, caché o demostración.
- Navegación al análisis de un partido.

### 3.2 Dashboard de partido

La página del partido utilizará una estructura de “Cabina editorial”:

- Barra superior con marca, estado, actualización, exportación y cambios manuales.
- Navegación lateral fija con categorías desplegables.
- Subsecciones horizontales dentro de cada categoría.
- Área principal que combina lectura editorial, cifras grandes, tablas y alertas.
- Fondo oscuro verde petróleo, acento verde esmeralda, ámbar para inferencias y coral para riesgos.
- Tipografía sans contundente para datos y serif editorial para interpretación.
- Adaptación móvil mediante navegación horizontal y bloques apilados.

Categorías principales:

1. Resumen.
2. Contexto.
3. Táctica.
4. Plantillas, alineaciones y bajas.
5. Mercados.
6. Jugadores.
7. Porteros.
8. Valor y riesgo.
9. Alertas.
10. Fuentes y metodología.

Subsecciones de mercados:

- Resultado 1X2 y doble oportunidad.
- Hándicaps.
- Marcador exacto.
- Goles totales, por equipo y por periodo.
- Ambos equipos marcan.
- Corners totales, por equipo y por periodo.
- Tarjetas totales, por equipo, roja y jugadores.
- Faltas cometidas y recibidas.
- Disparos y tiros a puerta por equipo y jugador.
- Fueras de juego.
- Escenarios del partido.

Cada predicción mostrará:

- Mercado y línea.
- Probabilidad del modelo.
- Intervalo o margen de incertidumbre.
- Confianza de 1 a 10.
- Cuota mínima para considerar valor.
- Cuota disponible, si existe.
- Valor esperado.
- Motivo.
- Riesgo.
- Evidencia utilizada.
- Antigüedad de los datos.

### 3.3 Actualización

- Botón “Actualizar datos”.
- Panel manual para bajas, titulares, formación, árbitro, clima, cuotas y suspensión.
- Cada cambio manual requerirá nota y fuente opcional.
- La aplicación conservará historial de revisiones.
- Un cambio relevante recalculará solo los mercados afectados.
- El dashboard mostrará “Análisis actualizado manualmente” cuando corresponda.

### 3.4 Exportación

- Generación de un HTML autónomo con CSS interno.
- Inclusión del resumen, mercados, metodología, fuentes y aviso responsable.
- Identificación del snapshot utilizado.
- Exclusión de claves, rutas locales y datos sensibles.

## 4. Fuentes de datos

### 4.1 Proveedores gratuitos

**API-Football** será el adaptador deportivo principal. El plan gratuito ofrece 100 solicitudes diarias e incluye fixtures, alineaciones, lesiones, estadísticas y cuotas. La aplicación administrará una cuota diaria local y evitará consultas repetidas.

**Football-Data.org** será respaldo para calendarios, resultados, clasificaciones y competiciones cubiertas por su plan gratuito.

**The Odds API** será opcional para comparar cuotas. Sus créditos gratuitos mensuales se consumirán únicamente bajo demanda, nunca mediante sondeo continuo.

**Open-Meteo** aportará pronóstico climático sin clave para uso personal no comercial.

### 4.2 Fuentes oficiales

La aplicación ofrecerá enlaces de verificación hacia:

- FIFA Match Centre.
- UEFA.
- Web oficial de la competición.
- Federación nacional.
- Clubes participantes.
- Servicios meteorológicos o estadios cuando corresponda.

No se implementará scraping frágil ni acceso automatizado que contradiga términos de uso. Una confirmación oficial podrá registrarse manualmente con URL, hora y nota.

### 4.3 Estados de evidencia

Cada campo podrá tener uno de estos estados:

- `confirmed`: confirmado por fuente oficial o proveedor estructurado fiable.
- `expected`: alineación o situación esperada, no oficial.
- `inferred`: inferencia calculada por el sistema.
- `conflict`: fuentes en desacuerdo.
- `unavailable`: dato no disponible.

La prioridad será:

1. Fuente oficial más reciente.
2. Proveedor estructurado más reciente.
3. Entrada manual con fuente.
4. Inferencia del modelo.

Las discrepancias no se ocultarán: quedarán registradas y visibles.

## 5. Ciclo prepartido

- **T−72 a T−24 horas:** forma, calendario, lesiones, sanciones, viaje, sede, clima y cuotas iniciales.
- **T−12 a T−6 horas:** noticias oficiales, alineación esperada y movimientos relevantes.
- **T−90 minutos:** inicio de comprobación intensiva bajo demanda.
- **T−60 minutos:** búsqueda de once oficial y recalculado si está disponible.
- **T−40 a T−20 minutos:** ventana adicional para la llegada de alineaciones al proveedor.
- **T−15 minutos:** snapshot final prepartido.
- Después del inicio no se genera análisis en vivo.

No se ejecutarán tareas automáticas agresivas. La actualización se activará desde la interfaz y reutilizará la caché siempre que sea posible.

## 6. Motor estadístico

### 6.1 Variables

El conjunto de características podrá incluir:

- Fuerza Elo del equipo y rival.
- Forma reciente ponderada por recencia y calidad del rival.
- Rendimiento de local, visitante o sede neutral.
- Goles, xG y xGA cuando existan.
- Tiros y tiros a puerta.
- Posesión, corners, tarjetas, faltas y fuera de juego.
- Descanso, viajes y congestión.
- Bajas y calidad estimada de reemplazo.
- Alineación confirmada frente a la esperada.
- Importancia competitiva.
- Estilo táctico.
- Árbitro, clima y sede.
- Movimiento de cuotas, tratado como señal de mercado y no como verdad.

Si una variable no está disponible, el sistema no la sustituirá con un dato falso. El modelo aplicará imputación explícita, una versión reducida o bloqueará la predicción afectada.

### 6.2 Modelos

**Elo ajustado**

- Estima fuerza relativa.
- Distingue selecciones y clubes.
- Ajusta por rival, sede y recencia.

**Poisson y Dixon–Coles**

- Estiman intensidades de gol por equipo.
- Generan matriz de marcadores.
- Derivan 1X2, totales, ambos marcan y marcador exacto.
- Dixon–Coles corrige la dependencia de marcadores bajos.

**Regresión logística regularizada**

- Mercados binarios y ordinales.
- Coeficientes interpretables.
- Control de sobreajuste con regularización.

**Gradient boosting opcional**

- Solo se activa con volumen suficiente y validación temporal.
- Nunca reemplaza automáticamente a los modelos interpretables.

**Simulación Monte Carlo**

- Propaga incertidumbre de alineación, intensidad y contexto.
- Produce distribuciones e intervalos, no una única cifra rígida.

**Ensamble y calibración**

- Combina modelos según rendimiento histórico por competición y mercado.
- Usa calibración isotónica o Platt cuando la muestra lo permita.
- Reduce confianza en competiciones con poca información.

### 6.3 Pesos configurables

La configuración inicial conservará la intención solicitada:

- Forma reciente: 20%.
- Torneo o rendimiento competitivo actual: 20%.
- Calidad ofensiva: 15%.
- Solidez defensiva: 15%.
- Bajas y sanciones: 10%.
- Contexto competitivo: 10%.
- Estilo táctico: 5%.
- Árbitro y disciplina: 3%.
- Clima y sede: 2%.

Estos pesos no se aplicarán ciegamente como una suma universal. Serán una configuración explicable para el índice contextual y podrán ajustarse por competición. Los modelos probabilísticos mantendrán sus propios parámetros entrenados.

## 7. Evaluación científica

La evaluación será temporal: el modelo se entrenará solo con datos anteriores al partido evaluado.

Métricas:

- Brier Score.
- Log loss.
- Ranked Probability Score para 1X2.
- Curvas y error de calibración.
- MAE para conteos.
- Cobertura de intervalos.
- ROI y yield únicamente como métricas económicas secundarias.

Se mostrará:

- Tamaño de la muestra.
- Periodo evaluado.
- Competiciones incluidas.
- Versión del modelo.
- Rendimiento fuera de muestra.

No se publicará una confianza alta si la calibración o el volumen de datos no la respaldan.

## 8. Value betting y arbitraje

### 8.1 Probabilidad de mercado

La aplicación convertirá cuotas decimales en probabilidades implícitas y eliminará el margen de la casa antes de compararlas.

### 8.2 Valor esperado

`EV = probabilidad_modelo × cuota_decimal − 1`

Un mercado se mostrará como posible valor únicamente si:

- El EV supera un umbral configurable.
- La diferencia sobre el mercado supera la incertidumbre del modelo.
- Los datos no están desactualizados.
- La confianza y cobertura son suficientes.

### 8.3 Surebets

Para resultados mutuamente excluyentes:

`sumatoria(1 / mejor_cuota_resultado) < 1`

El resultado se presentará como “oportunidad aritmética detectada”, no como apuesta segura. Se advertirá sobre:

- Cambio de cuotas.
- Latencia.
- Límites de cuenta.
- Comisiones.
- Reglas diferentes entre operadores.
- Anulaciones.
- Errores del proveedor.

La primera versión detectará y calculará oportunidades, pero no automatizará apuestas.

## 9. Arquitectura técnica

### 9.1 Stack

- Next.js con App Router.
- TypeScript estricto.
- React para interacción.
- CSS Modules o CSS global basado en tokens; no dependencia obligatoria de Tailwind.
- SQLite local.
- Prisma ORM.
- Vitest para unidades e integración.
- Playwright para flujos críticos y validación visual.

### 9.2 Capas

1. **UI:** inicio, selector, cabina, tablas, panel manual y exportación.
2. **API interna:** rutas de partidos, detalle, actualización, análisis, cuotas y exportación.
3. **Adaptadores:** API-Football, Football-Data.org, The Odds API, Open-Meteo y demo.
4. **Normalización:** equipos, competiciones, jugadores, fixtures y estados.
5. **Evidencia:** procedencia, conflictos, frescura y snapshots.
6. **Modelos:** Elo, Poisson/Dixon–Coles, logística, Monte Carlo, calibración y valor.
7. **Persistencia:** entidades, observaciones, cuotas, análisis y revisiones.

Los adaptadores implementarán interfaces comunes para permitir sustitución futura sin modificar el dashboard o los modelos.

## 10. Esquema de persistencia

Entidades principales:

- `Competition`
- `Season`
- `Team`
- `Player`
- `Venue`
- `Match`
- `MatchSnapshot`
- `EvidenceRecord`
- `Lineup`
- `Availability`
- `TeamStatSnapshot`
- `PlayerStatSnapshot`
- `OddsSnapshot`
- `AnalysisRun`
- `Prediction`
- `ModelVersion`
- `ManualOverride`
- `ApiUsage`

Cada `AnalysisRun` apuntará al snapshot, configuración y versión del modelo utilizados. Esto permitirá reproducir una predicción.

## 11. APIs internas

- `GET /api/competitions`
- `GET /api/matches?date=YYYY-MM-DD&competition=...`
- `GET /api/match/[id]`
- `POST /api/match/[id]/refresh`
- `POST /api/match/[id]/overrides`
- `POST /api/match/[id]/analyze`
- `GET /api/match/[id]/history`
- `GET /api/match/[id]/export`
- `GET /api/usage`

Las respuestas incluirán `source`, `fetchedAt`, `freshness`, `evidenceStatus` y errores parciales.

## 12. Manejo de errores

- Sin clave: usar caché o modo demostración claramente rotulado.
- Cuota agotada: mostrar límite y próxima disponibilidad.
- Proveedor caído: conservar último snapshot y marcarlo como desactualizado.
- Datos parciales: calcular únicamente mercados soportados.
- Fuentes en conflicto: mostrar advertencia y reducir confianza.
- Error de modelo: no publicar predicciones incompletas.
- Entrada manual inválida: validar antes de persistir.
- Claves exclusivamente en servidor y `.env.local`.

El texto estándar será: “Dato no disponible en la fuente actual”.

## 13. Modo demostración

La aplicación incluirá fixtures de demostración deterministas y claramente identificados. Su propósito será:

- Permitir ejecutar y revisar la interfaz sin claves.
- Probar modelos y exportación.
- No representar información real o actual.

Los datos demo nunca se mezclarán silenciosamente con datos reales.

## 14. Accesibilidad y experiencia

- Navegación completa por teclado.
- Contraste suficiente.
- Estados de foco visibles.
- Tablas con encabezados semánticos.
- Colores acompañados de texto o iconografía.
- Respeto a `prefers-reduced-motion`.
- Formato horario y zona horaria visibles.
- Diseño usable en móvil y escritorio.

## 15. Aviso responsable

El siguiente aviso aparecerá en inicio, dashboard y exportación:

> Este análisis es probabilístico y no garantiza resultados. Las apuestas deportivas implican riesgo de pérdida de dinero. No apuestes dinero que no puedas perder. Usa esta información solo como apoyo analítico.

## 16. Pruebas y criterios de aceptación

### Pruebas unitarias

- Normalización.
- Resolución de evidencia.
- Poisson y Dixon–Coles.
- Elo.
- Regresión logística.
- Calibración.
- Conversión de cuotas y eliminación del margen.
- EV y surebets.
- Cálculo de confianza.
- Presupuesto de API.

### Integración

- Adaptadores con respuestas grabadas.
- Persistencia de snapshots.
- Reanálisis por cambio manual.
- Manejo de datos parciales.
- Exportación autónoma.

### End-to-end

1. Seleccionar fecha.
2. Buscar partidos.
3. Elegir competición y partido.
4. Abrir una categoría y subsección.
5. Actualizar datos.
6. Registrar un cambio manual.
7. Confirmar el recálculo.
8. Exportar HTML.

### Aceptación visual

- Fidelidad a la Cabina editorial aprobada.
- Navegación lateral profunda.
- No usar cuadrículas genéricas de tarjetas como estructura dominante.
- Jerarquía clara entre dato, inferencia y riesgo.
- Sin desbordamientos en móvil.
- Tipografía intencional en controles, tablas y navegación.

## 17. Fuera de alcance en la primera versión

- Análisis o apuestas en vivo.
- Automatización de apuestas.
- Autenticación y perfiles.
- Sincronización entre dispositivos.
- Aplicación móvil nativa.
- Scraping de sitios que no autoricen acceso automatizado.
- Entrenamiento de modelos complejos sin muestra suficiente.
- Dependencia obligatoria de APIs o modelos de pago.

## 18. Evolución

La arquitectura permitirá:

- Añadir Sportmonks u otros proveedores mediante adaptadores.
- Migrar SQLite a PostgreSQL.
- Entrenar modelos por liga.
- Incorporar nuevas casas y mercados.
- Ejecutar evaluaciones programadas.
- Añadir usuarios solo si el producto deja de ser personal.

