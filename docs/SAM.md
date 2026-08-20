# SAM

SAM es un terminal financiero personal: un ledger para cuentas, transacciones, presupuestos, metas, ahorros y pagos recurrentes. Está pensado para usarlo a diario desde el navegador o como PWA instalada, y para que agentes de IA (Cursor, Claude, Hermes, OpenClaw) operen los mismos datos por MCP.

No es un banco, no mueve dinero real hacia el exterior y no es asesoramiento financiero. Es un ledger propio con UI nativa y una API de herramientas para agentes.

**Producción:** [https://sam-app.its-manuel-caceres.workers.dev](https://sam-app.its-manuel-caceres.workers.dev)

Este documento describe el producto. Detalles técnicos: [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), [MCP.md](./MCP.md), [INTEGRATIONS.md](./INTEGRATIONS.md), [PWA.md](./PWA.md), [PLANS.md](./PLANS.md).

---

## Qué es y qué no es

| Es | No es |
| --- | --- |
| Un ledger personal de efectivo, tarjetas y transferencias internas | Un neobanco o procesador de pagos |
| Presupuestos por categoría (envelopes mensuales) | Un ERP o software contable de empresa |
| Metas y buckets de ahorro sobre el saldo que ya tienes | Un bróker o tracker de inversiones (ese módulo se retiró) |
| Recurrentes de ingreso/gasto con historial de ejecuciones | Un scheduler de producción siempre activo (el cron de posting está desconectado) |
| MCP remoto para que un agente lea y escriba tu ledger | Un chatbot embebido en la app |
| Marketplace de conectores (fase 1: manifiestos + webhooks) | Un runtime que ejecuta código de terceros (eso es fase 2) |

Público: una persona que quiere ver posición, flujo de caja y presupuesto en un solo sitio, y opcionalmente dejar que un agente registre gastos o consulte el mes.

---

## Experiencias

SAM elige **un árbol de UI estable** por request (`lib/presentation/experience.ts`). El tamaño de la ventana no cambia de árbol: un desktop que se achica no pasa a la PWA de teléfono.

| Experiencia | Quién la recibe | Qué ve |
| --- | --- | --- |
| **Living Ledger (desktop)** | Navegadores de escritorio y tablets | Shell con nav lateral, inspector, búsqueda y secciones `/app/[section]` |
| **PWA (teléfono)** | User agents móviles / `Sec-CH-UA-Mobile: ?1` | App a pantalla completa, nav inferior, sheets de captura |
| **Instalada** | Android (Chrome) e iOS (Safari → Add to Home Screen) | Misma UI de teléfono, sin chrome del navegador |

El workspace de escritorio agrupa la navegación así:

| Grupo | Secciones |
| --- | --- |
| Daily | Overview, Transactions |
| Plan | Budgets, Accounts, Goals, Recurring |
| Review | Reports, Activity |

Settings, MCP e integraciones viven en perfil / ajustes, no en el nav principal.

En teléfono las pantallas equivalentes son Home, Activity, Expenses, Income, Accounts/Cards, Budget, Goals, Savings, Recurring, Stats, Profile, Ajustes, Help e Integrations. Rutas legacy `/app/income` y `/app/expenses` siguen mapeando a esas pantallas.

---

## Funcionalidades

### Overview

Resumen del mes en la moneda activa:

- Posición (saldos), flujo de caja y presión de presupuesto
- Próximos recurrentes y obligaciones
- Últimas transacciones
- Ocultar cifras (privacy toggle) para mostrar el workspace en público

### Transacciones y actividad

Ledger de ingresos y gastos confirmados:

- Alta, edición y baja de gastos
- Ingreso puntual (one-time income) con opción de acreditar una cuenta
- Filtro por moneda, categoría, cuenta y texto
- Búsqueda rápida en el shell de escritorio
- Activity reutiliza el mismo ledger (historial / feed)

Cada transacción guarda cuenta, categoría, monto positivo, kind (`expense` / `income`), moneda, estado, origen, notas y fecha. No se suman USD y PEN: cada cifra se muestra en la moneda a la que pertenece, sin FX.

### Cuentas

Cuentas de efectivo, checking, savings y tarjeta:

- Nombre, tipo, saldo, moneda (`USD` o `PEN`)
- Límite y últimos 4 dígitos en tarjetas
- Orden, icono y color
- Transferencias internas **misma moneda**: movimiento emparejado e inmutable; no hay conversión

Un usuario nuevo recibe cuentas por defecto (`Cash` y `Card`) en el bootstrap de onboarding.

### Presupuestos y categorías

Las categorías de gasto son también envelopes mensuales:

- Tope (`monthly_cap`) y moneda por categoría
- Estado del mes: gastado vs. tope
- Crear / editar categoría y ajustar el cap

Los nombres de categoría que ve el usuario son los de display; las keys internas no se exponen en MCP.

### Metas y ahorros

- **Goals:** objetivo, monto ahorrado, ETA opcional, completado, metadatos de presentación
- **Savings buckets:** reservas con nombre, saldo, target y APY de display (no capitaliza solo)

Sirven para asignar y seguir dinero ya existente en el ledger, no para invertir.

### Recurrentes

Reglas de ingreso o gasto con timezone IANA:

- Estados: activa, pausada, archivada
- Una regla de gasto exige categoría
- Historial de ocurrencias: `processing`, `posted`, `failed`, `skipped`
- Reintento de una ocurrencia fallida
- Idempotencia por `(rule_id, scheduled_date)`

Las reglas se crean y editan en la app. El posting automático por cron de producción **no está activo** (la ruta legacy responde `410`). El detalle de compute/Neon está en [NEON-COMPUTE.md](./NEON-COMPUTE.md).

`income_sources` es una vista de compatibilidad de solo lectura; el modelo vigente es `recurring_rules`.

### Reportes

Vista de review: totales, desglose por categoría / día / mes y cashflow ingreso vs. gasto. En MCP las piezas equivalentes son `sam_get_spending_summary` y `sam_get_cashflow`.

### Perfil y ajustes

- Nombre de usuario y preferencias (tema, idioma, moneda por defecto, timezone)
- Idiomas: inglés y español
- Monedas soportadas: USD y PEN
- Temas (paletas tipo editor): Ayu Mirage (default), Ayu Light, Solarized Cream, Catppuccin Latte, GitHub Light, ANSI Dark, entre otros
- Auth: email/password y Google OAuth opcional
- **Connect MCP:** crear tokens personales con scopes; el secreto se muestra una sola vez
- **Integrations:** catálogo, installs, conectar / desconectar

---

## MCP (agentes)

SAM expone un servidor MCP remoto en `{APP_URL}/api/mcp` (Streamable HTTP, JSON-RPC, sin sesión). Un token `sam_mcp_…` autentica a un usuario; las herramientas operan solo sobre su ledger.

**Producción:** `https://sam-app.its-manuel-caceres.workers.dev/api/mcp`

Flujo para un humano:

1. Login → Profile → **Connect MCP** → crear token con label y scopes
2. Guardar el token en `SAM_MCP_TOKEN` (nunca en git)
3. Apuntar el cliente a `/api/mcp` con `Authorization: Bearer …`

Qué puede hacer un agente (36 tools, agrupadas por intención):

| Intención | Ejemplos de tools |
| --- | --- |
| Perfil, moneda, scopes | `sam_get_profile` |
| Gastos e historial | `sam_list_transactions`, `sam_get_spending_summary` |
| Alta / edición / baja de gasto | `sam_add_expense`, `sam_update_expense`, `sam_delete_expense` |
| Cuentas y patrimonio | `sam_list_accounts`, `sam_get_net_worth` |
| Transferencia interna | `sam_transfer_between_accounts` (`confirm: true`) |
| Presupuesto | `sam_list_categories`, `sam_get_budget_status` |
| Metas y buckets | `sam_list_goals`, `sam_set_goal_saved`, `sam_list_savings_buckets` |
| Recurrentes | `sam_create_recurring_rule`, `sam_list_recurring_occurrences`, `sam_retry_recurring_occurrence` |
| Preferencias | `sam_update_prefs`, `sam_update_username` |

Writes sensibles piden confirmación. Un token sin scope recibe `scope_denied`; no hay bypass por base de datos cuando el acceso pedido es MCP.

Guía de cliente: [MCP.md](./MCP.md). Skill del repo: [`.agents/skills/sam-mcp/SKILL.md`](../.agents/skills/sam-mcp/SKILL.md).

---

## Integraciones

Marketplace de conectores para automatizar el ledger (sync bancario, webhooks, pulls HTTP). Fase 1: el autor publica un **manifiesto**; SAM ejecuta. Fase 2 (planeada): workers sandbox en Cloudflare. En fase 1 no corre código arbitrario de terceros.

- Catálogo: Settings → Integrations (desktop) o Profile → Settings → Integrations (móvil)
- Docs públicas: `/developers`
- Webhook: `POST /api/integrations/hooks/{installId}`
- Scopes alineados con MCP; secretos cifrados; disconnect los borra

Detalle: [INTEGRATIONS.md](./INTEGRATIONS.md).

---

## Autenticación y datos

- **Better Auth** (sesiones, email/password, Google OAuth)
- **Neon Postgres** + **Drizzle**; todo el dominio financiero se filtra por `userId`
- Un usuario nuevo recibe perfil, cuentas default y categorías default
- Seed demo: `alex@sam.app` / `sam12345` (`npm run db:seed:demo`)
- Isolation a nivel de aplicación (no RLS de Postgres como mecanismo principal)

---

## Stack

| Capa | Tecnología |
| --- | --- |
| App | Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn-style UI |
| Deploy | Cloudflare Workers vía OpenNext |
| Auth | Better Auth |
| DB | Neon Postgres, Drizzle ORM |
| PWA | Serwist, Web App Manifest, fallback `/~offline` |
| Agentes | MCP Streamable HTTP en `/api/mcp` |

Supabase quedó solo como archivo de migración. `sam-demo/` no forma parte del producto.

---

## Planes (producto, aún no cobrados)

Los límites Free / Pro / Agent están definidos; **no hay billing ni enforcement**. `profiles.plan` existe y es display-only (default `pro`). Fuente: [PLANS.md](./PLANS.md).

| | Free | Pro · $5/mes | Agent · $10/mes |
| --- | --- | --- | --- |
| Transacciones | 100 / mes | 500 / mes | Ilimitadas (fair use) |
| Cuentas | 2 | 8 | Ilimitadas |
| Monedas | 1 | USD + PEN | USD + PEN |
| Recurrentes | No | Sí | Sí |
| PWA | No | Sí | Sí |
| MCP | Solo lectura | Read + write | Read + write + transfer |
| Integraciones | 0 | 3 | Ilimitadas (fase 1) |

---

## Rutas

| Ruta | Uso |
| --- | --- |
| `/onboarding` | Landing y auth |
| `/app` | Entrada autenticada (desktop u teléfono según el request) |
| `/app/[section]` | Secciones del workspace (overview, transactions, budgets, …) |
| `/~offline` | Fallback PWA |
| `/developers` | SAM for Developers |
| `/api/auth/[...all]` | Better Auth |
| `/api/mcp` | MCP |
| `/canvas` | Sandbox visual / referencia de diseño |

---

## Documentación relacionada

| Doc | Contenido |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, folders, auth, deploy |
| [DATABASE.md](./DATABASE.md) | Tablas y ownership |
| [MCP.md](./MCP.md) | Protocolo, tools, clientes |
| [MCP-ARCHITECTURE.md](./MCP-ARCHITECTURE.md) | Internals del servidor MCP |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Marketplace y runtime |
| [PWA.md](./PWA.md) | Install, offline, iOS |
| [PLANS.md](./PLANS.md) | Límites Free / Pro / Agent |
| [NEON-COMPUTE.md](./NEON-COMPUTE.md) | Compute de Neon y keep-alives |
| [FINANCIAL-RELIABILITY-PLAN.md](./FINANCIAL-RELIABILITY-PLAN.md) | Plan de fiabilidad del ledger |

---

## Disclaimer

SAM es un proyecto de desarrollo / demo. No es consejo financiero.
