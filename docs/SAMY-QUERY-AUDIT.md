# Samy: lectura del ledger y plan en el header

## Cambios

- El header usa `PlanSnapshot` del servidor, sin planes ni cuotas mock. Muestra uso/límite, vencimiento y contacto manual; refresca al abrir y cada 30 segundos mientras está abierto. Si falla, avisa que el estado es anterior. Free mantiene los límites del catálogo, no significa ilimitado.
- Historial: título limitado al ancho disponible, elipsis y título completo al pasar el mouse; botón de eliminación conserva su columna.
- Herramienta compartida MCP/Samy `sam_get_latest_transaction`: una fila confirmada del usuario, orden estable, sin fechas artificiales. `registered` ordena por creación; `occurred` por fecha del movimiento. Ledger vacío devuelve `transaction: null`.
- Prompt con instante actual y comienzo del mes en la zona del usuario. Último registro no requiere rango; resumen sin período explícito usa mes actual hasta ahora; histórico explícito omite límites.
- Listados indican `totalsScope: returned_page_only`. Para sumas/conteos completos se usan las herramientas existentes de SQL (`sam_get_spending_summary`, `sam_get_cashflow`), con separación por moneda.
- Validación común de rangos: ambos extremos inclusivos, orden correcto y datetimes con zona. **Cambio de contrato:** fechas solas se rechazan con `invalid_date_range`; clientes deben enviar inicio/final del día local con offset, evitando perder el último día.

## Alcance y límites de la auditoría

Se revisaron catálogo compartido, consultas de movimientos/resúmenes, prompt y presentación. No es una auditoría exhaustiva de todas las herramientas de escritura. Los grupos diarios/mensuales de la herramienta de resumen siguen siendo UTC y su descripción lo declara. Totales por cuenta/búsqueda no están soportados por resumen; Samy debe decirlo y no inferirlos de una página. No se modifican saldos, cuotas, pagos, esquema ni datos de producción.

## Comprobaciones manuales antes de publicar

Probar hover, teclado y Escape del bloque; estados Free/trial/paid y error de red; títulos largos sin espacios y eliminación accesible. En sesión autenticada, probar último gasto con fechas de registro/movimiento distintas, ledger vacío, conteo de más de 500 movimientos y monedas mezcladas. Verificar la transición al vencer el trial con snapshot renovado.
