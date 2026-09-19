# Samy web: respuesta y actividad

Adaptación TypeScript del componente ThoughtLine proporcionado por el usuario, con Motion y Hugeicons. Conserva respiración, brillo del texto, cronómetro y detalle plegable, adaptados a los tokens del panel web. Tipografía de respuesta con párrafos, listas, títulos y tablas más legibles. Movimiento reducido y colores forzados desactivan los efectos; la actividad se anuncia sin leer cada décima del cronómetro.

## Fuente de verdad

- `tool-call`: identifica cada ejecución por `toolCallId`, incluso llamadas paralelas a la misma herramienta.
- `tool-result`: confirma resultado, error o necesidad de confirmación. No se envían argumentos ni resultados financieros al indicador.
- `text-delta`: mantiene el streaming real del modelo; no hay escritura simulada ni demoras artificiales.
- `done`: detiene el cronómetro y pliega la actividad. Una desconexión sin `done` se considera interrupción, no éxito.
- `finance_mutated`: solo se emite tras resultado exitoso de una herramienta de escritura, no al solicitarla.

Los textos describen operaciones observables, no razonamiento interno del modelo. El modelo configurado se conserva sin cambios.

## Historial y compatibilidad

`progress`, `elapsed` y `failed` son campos opcionales del JSONB ya existente en `samy_messages.content`: no requieren migración. Los mensajes antiguos conservan el indicador anterior de herramientas, sin inventar duración ni estado de ejecución. El historial no puede cambiarse durante una respuesta activa.

## Validación

Pruebas unitarias: llamadas paralelas, nombres repetidos, confirmación pendiente, errores, etiquetas ES/EN y SSE fragmentado con UTF-8/CRLF. Previsualización aislada en Chromium con componentes reales, incluyendo panel estrecho y respuesta Markdown. Falta validar el flujo autenticado contra el proveedor en producción; no se consumieron cuotas ni se hicieron escrituras financieras durante estas pruebas.
