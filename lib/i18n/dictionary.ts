/**
 * Spanish dictionary keyed by the English source string.
 *
 * The app calls t("English text"). When the active language is Spanish the
 * value below is used; otherwise the English key is returned unchanged. This
 * means any string not present here still renders (in English) instead of
 * breaking the UI. User-owned data (expense names, category names, account
 * names) is never translated.
 *
 * Placeholders use {name} syntax and are filled by translate().
 */
export const ES: Record<string, string> = {
  // ── Bottom nav ──────────────────────────────────────────────
  home: "inicio",
  expenses: "gastos",
  expense: "gasto",
  goals: "metas",
  profile: "perfil",

  // ── Sub-tabs ────────────────────────────────────────────────
  activity: "actividad",
  accounts: "cuentas",
  income: "ingresos",
  recurring: "recurrentes",
  budget: "presupuesto",
  savings: "ahorros",
  stats: "estadísticas",
  help: "ayuda",
  settings: "ajustes",

  // ── Common words / actions ──────────────────────────────────
  save: "guardar",
  cancel: "cancelar",
  delete: "eliminar",
  edit: "editar",
  add: "agregar",
  close: "cerrar",
  back: "atrás",
  next: "siguiente",
  done: "listo",
  continue: "continuar",
  confirm: "confirmar",
  search: "buscar",
  loading: "cargando",
  total: "total",
  spent: "gastado",
  remaining: "restante",
  left: "restante",
  over: "excedido",
  all: "todos",
  none: "ninguno",
  name: "nombre",
  amount: "monto",
  account: "cuenta",
  category: "categoría",
  type: "tipo",
  date: "fecha",
  today: "hoy",
  yesterday: "ayer",
  balance: "saldo",
  cash: "efectivo",
  card: "tarjeta",
  checking: "corriente",
  currency: "moneda",
  language: "idioma",
  notifications: "notificaciones",
  "biometric lock": "bloqueo biométrico",
  preferences: "preferencias",
  integrations: "integraciones",
  "completed": "completadas",
  active: "activas",
  paused: "pausadas",
  failed: "fallidas",
  posted: "registrada",
  skipped: "omitida",
  processing: "procesando",
  refresh: "actualizar",
  refreshing: "actualizando",
  "pull to refresh": "desliza para actualizar",
  "release to refresh": "suelta para actualizar",
  "your configured account and finance data": "tu cuenta y datos financieros configurados",
  "tx logged": "tx registradas",
  "paused status": "pausada",
  "active status": "activa",
  "search the product guide": "busca en la guía del producto",

  // ── Onboarding slides ───────────────────────────────────────
  "log every move": "registra cada movimiento",
  "tap, type, or just say it. SAM categorizes every transaction in seconds — no spreadsheets, no friction.":
    "toca, escribe o dilo. SAM categoriza cada transacción en segundos — sin hojas de cálculo, sin fricción.",
  "see the whole picture": "ve el panorama completo",
  "account balances, budgets tied to your transactions, and charts built from what you log. all in one screen.":
    "saldos de cuentas, presupuestos ligados a tus transacciones y gráficos construidos con lo que registras. todo en una pantalla.",
  "reach what matters": "alcanza lo que importa",
  "set goals, record progress, and see what remains. keep the plan next to the rest of your finances.":
    "fija metas, registra avances y mira lo que falta. mantén el plan junto al resto de tus finanzas.",
  "know what comes next": "anticipa lo que viene",
  "see recurring payments, budget pressure, and your projected balance before the month closes.":
    "consulta pagos recurrentes, presión presupuestaria y tu saldo proyectado antes de cerrar el mes.",
  "your money. your machine.": "tu dinero. tu máquina.",
  "your finance data stays scoped to your authenticated account. PWA-first and ready to install.":
    "tus datos financieros permanecen asociados a tu cuenta autenticada. PWA primero y lista para instalar.",
  "connect SAM to your AI tools": "conecta SAM a tus herramientas de IA",
  "use MCP to let Cursor, Claude or any agent read and manage your finances — securely, on your terms.":
    "usa MCP para que Cursor, Claude o cualquier agente lea y gestione tus finanzas — de forma segura y bajo tus reglas.",
  "[skip]": "[saltar]",
  "[continue ▸]": "[continuar ▸]",
  "[get started ▸]": "[empezar ▸]",
  of: "de",
  "swipe or tap dots to navigate": "desliza o toca los puntos para navegar",

  // ── Help / FAQ ──────────────────────────────────────────────
  "Frequently asked questions": "Preguntas frecuentes",
  "type to search · avg response < 4h": "escribe para buscar · respuesta promedio < 4h",
  "grep 'how to...'": "grep 'cómo...'",
  'no results for "{q}"': 'sin resultados para "{q}"',
  Contact: "Contacto",
  "chat with support": "chatear con soporte",
  "[open]": "[abrir]",
  "[copy]": "[copiar]",
  "[copied ✓]": "[copiado ✓]",
  "Where is my data stored?": "¿Dónde se guardan mis datos?",
  "Your data lives in Neon Postgres behind the Cloudflare app — accounts, transactions, goals and budgets are tied to your user account.":
    "Tus datos viven en Neon Postgres detrás de la app en Cloudflare — cuentas, transacciones, metas y presupuestos están ligados a tu cuenta de usuario.",
  "Is my data private?": "¿Mis datos son privados?",
  "Yes. Every record is scoped to your authenticated user id, so only your session can read or write your data.":
    "Sí. Cada registro está asociado a tu id de usuario autenticado, así que solo tu sesión puede leer o escribir tus datos.",
  "How do I add accounts and expenses?": "¿Cómo agrego cuentas y gastos?",
  "Accounts → [+ create account] to add a cash or card balance. Expenses → [+ new expense] to log spending against a category.":
    "Cuentas → [+ crear cuenta] para agregar un saldo en efectivo o tarjeta. Gastos → [+ nuevo gasto] para registrar un gasto en una categoría.",
  "How do I connect SAM to AI tools (MCP)?": "¿Cómo conecto SAM a herramientas de IA (MCP)?",
  "1) Profile → integrations → connect mcp → create a token (copy it, it is shown once). 2) In your AI client (Cursor, Claude, Hermes, OpenClaw...) add an MCP server with URL <your-app>/api/mcp and header Authorization: Bearer <your token>. 3) Reload the client and ask it about your finances. See docs/MCP.md for client-specific setup.":
    "1) Perfil → integraciones → conectar mcp → crea un token (cópialo, se muestra una sola vez). 2) En tu cliente de IA (Cursor, Claude, Hermes, OpenClaw...) agrega un servidor MCP con la URL <tu-app>/api/mcp y la cabecera Authorization: Bearer <tu token>. 3) Recarga el cliente y pregúntale sobre tus finanzas. Consulta docs/MCP.md para la configuración de cada cliente.",
  "How do I export my data?": "¿Cómo exporto mis datos?",
  "Profile → data → export csv downloads all your transactions as a CSV file.":
    "Perfil → datos → exportar csv descarga todas tus transacciones como archivo CSV.",
  "How do I reset or delete my account?": "¿Cómo reinicio o elimino mi cuenta?",
  "Profile → danger → delete account wipes your user and all owned rows. This cannot be undone.":
    "Perfil → peligro → eliminar cuenta borra tu usuario y todos sus registros. Esto no se puede deshacer.",

  // ── Profile ─────────────────────────────────────────────────
  "sign out": "cerrar sesión",
  "log out": "cerrar sesión",
  danger: "peligro",
  "danger zone": "zona de peligro",
  "delete account": "eliminar cuenta",
  "member since": "miembro desde",
  "connect mcp": "conectar mcp",
  "export data": "exportar datos",
  "export csv": "exportar csv",
  "sync accounts": "sincronizar cuentas",
  backup: "respaldo",
  "just now": "ahora mismo",
  "{n} linked": "{n} vinculadas",
  email: "correo",
  username: "usuario",
  data: "datos",
  "change credentials": "cambiar credenciales",
  saved: "ahorrado",
  "{n} day streak": "racha de {n} días",
  "member of the 0.3% who budget weekly. keep going.":
    "miembro del 0.3% que presupuesta cada semana. sigue así.",
  "username · no spaces": "usuario · sin espacios",
  "username cannot contain spaces": "el usuario no puede contener espacios",
  "could not save username": "no se pudo guardar el usuario",
  "[cancel]": "[cancelar]",
  "[save]": "[guardar]",
  "[saving...]": "[guardando...]",
  "[deleting...]": "[eliminando...]",
  "[confirm delete]": "[confirmar eliminación]",
  "this wipes your account + all data. cannot be undone.":
    "esto borra tu cuenta + todos los datos. no se puede deshacer.",

  // ── Expense / income forms ──────────────────────────────────
  "new expense": "nuevo gasto",
  "new income": "nuevo ingreso",
  "Lunch, Coffee, Uber...": "Almuerzo, Café, Uber...",
  "tap for detail": "toca para ver detalle",
  "tap to adjust cap": "toca para ajustar el tope",
  "new envelope": "nuevo sobre",
  "new goal": "nueva meta",
  "new source": "nueva fuente",
  "e.g. Lunch, Coffee, Uber...": "ej. Almuerzo, Café, Uber...",
  "e.g. Cash, Main Card...": "ej. Efectivo, Tarjeta principal...",
  "e.g. Client X · consulting": "ej. Cliente X · consultoría",
  icon: "icono",
  "will log to {date} · {account}": "se registrará el {date} · {account}",
  envelopes: "sobres",
  unallocated: "sin asignar",

  // ── Home ────────────────────────────────────────────────────
  pending: "pendiente",
  Recent: "Reciente",
  "tap to view details": "toca para ver detalles",
  "no expenses yet": "aún no hay gastos",
  "net cashflow vs last month": "flujo neto vs el mes pasado",
  "keep using sam to calculate metrics": "sigue usando sam para calcular métricas",
  "spent {a} of {b}": "gastado {a} de {b}",
  "{n} days left": "{n} días restantes",
  "good morning. tracking {accounts} accounts, {tx} tx this week.":
    "buenos días. siguiendo {accounts} cuentas, {tx} tx esta semana.",

  // ── Expenses ────────────────────────────────────────────────
  Categories: "Categorías",
  Transactions: "Transacciones",
  "tap to collapse": "/toca para contraer",
  "tap to expand": "/toca para expandir",
  "no categories with spend yet": "aún no hay categorías con gasto",
  "no transactions": "no hay transacciones",
  "all expenses · tap to view": "todos los gastos · toca para ver",
  "latest 3 · tap title to expand": "últimos 3 · toca el título para expandir",
  "{a} logged across {b} tx. on pace.": "{a} registrado en {b} tx. en buen ritmo.",
  "[+ new expense]": "[+ nuevo gasto]",
  "[+ new income]": "[+ nuevo ingreso]",
  "[+ new goal]": "[+ nueva meta]",
  "[+ new envelope]": "[+ nuevo sobre]",
  "[+ add]": "[+ agregar]",

  // ── Income detail / edit ────────────────────────────────────
  "[close]": "[cerrar]",
  "source name": "nombre de la fuente",
  "deposit to": "depositar en",
  "recent payments": "pagos recientes",
  "no payments logged yet": "aún no hay pagos registrados",
  "changing the account moves the cash, no duplication":
    "cambiar la cuenta mueve el dinero, sin duplicar",
  tbd: "por definir",
  "could not save": "no se pudo guardar",

  // ── Settings (themes) ───────────────────────────────────────
  "{n} app-wide themes · changes apply everywhere":
    "{n} temas para toda la app · los cambios aplican en todo",
  Themes: "Temas",
  "Active theme": "Tema activo",
  theme: "tema",
  "primary text, cards, borders, charts, forms, warnings and progress indicators use this shared token set.":
    "texto principal, tarjetas, bordes, gráficos, formularios, advertencias e indicadores de progreso usan este conjunto de tokens compartido.",

  // ── Goals ───────────────────────────────────────────────────
  "{n} goals tracked. {m} completed. tap any to contribute.":
    "{n} metas en seguimiento. {m} completadas. toca cualquiera para aportar.",
  "total progress": "progreso total",
  "All goals": "Todas las metas",
  eta: "estimado",

  // ── Income ──────────────────────────────────────────────────
  "{n} sources · {m} recurring · projected +${x} this month":
    "{n} fuentes · {m} recurrentes · proyectado +${x} este mes",
  "{n} income transactions · {x} this month":
    "{n} transacciones de ingreso · {x} este mes",
  "vs last month": "vs el mes pasado",
  "keep using sam to unlock month-over-month trends":
    "sigue usando sam para desbloquear tendencias mes a mes",
  "last 6 months": "últimos 6 meses",
  "no income logged yet · add a source to start tracking":
    "aún no hay ingresos registrados · agrega una fuente para empezar",
  "no income logged yet": "aún no hay ingresos registrados",
  "{active} active · {upcoming} due in the next 30 days":
    "{active} activas · {upcoming} programadas en los próximos 30 días",
  "no recurring movements configured": "no hay movimientos recurrentes configurados",
  "[create recurring movement]": "[crear movimiento recurrente]",
  "Recurring movements": "Movimientos recurrentes",
  "[+ recurring movement]": "[+ movimiento recurrente]",
  "changes apply only to future occurrences":
    "los cambios solo aplican a ocurrencias futuras",
  every: "cada",
  frequency: "frecuencia",
  day: "día",
  week: "semana",
  month: "mes",
  year: "año",
  "start date": "fecha de inicio",
  "end date (optional)": "fecha de fin (opcional)",
  timezone: "zona horaria",
  "next dates": "próximas fechas",
  "confirm posting {count} due movements totaling {total}":
    "confirmo registrar {count} movimientos vencidos por un total de {total}",
  "[pause]": "[pausar]",
  "[resume]": "[reanudar]",
  "[archive]": "[archivar]",
  "[confirm archive]": "[confirmar archivo]",
  "Occurrence history": "Historial de ocurrencias",
  "no occurrences yet": "aún no hay ocurrencias",
  "insufficient available balance": "saldo disponible insuficiente",
  "[retry]": "[reintentar]",
  "[retrying...]": "[reintentando...]",
  "retry failed": "el reintento falló",
  review: "revisar",
  "review account and schedule, then save before resuming":
    "revisa la cuenta y el calendario; luego guarda antes de reanudar",
  Sources: "Fuentes",
  "tap to view payment history": "toca para ver el historial de pagos",

  // ── Budget ──────────────────────────────────────────────────
  "{n} envelopes · ${x} unallocated": "{n} sobres · ${x} sin asignar",
  "budget · spent · remaining": "presupuesto · gastado · restante",
  Envelopes: "Sobres",

  // ── Activity ────────────────────────────────────────────────
  Unknown: "Desconocido",
  "{n} tx · filter live · tap to view": "{n} tx · filtro en vivo · toca para ver",
  "grep tx ...": "grep tx ...",
  'no matches for "{q}"': 'sin coincidencias para "{q}"',

  // ── Accounts ────────────────────────────────────────────────
  Accounts: "Cuentas",
  "[+ create account]": "[+ crear cuenta]",
  "[transfer]": "[transferir]",

  // ── Savings ─────────────────────────────────────────────────
  "{n} buckets · auto-save {state} · ${amt}/wk":
    "{n} fondos · ahorro automático {state} · ${amt}/sem",
  "{n} configured buckets": "{n} fondos configurados",
  on: "activado",
  off: "desactivado",
  "on schedule": "según lo programado",
  "auto-save rule": "regla de ahorro automático",
  "every friday": "cada viernes",
  "splits evenly across {n} buckets": "se reparte equitativamente entre {n} fondos",
  Buckets: "Fondos",
  target: "objetivo",
  "[+ new bucket]": "[+ nuevo fondo]",

  // ── Stats ───────────────────────────────────────────────────
  "wallet moved {m} over 1 week · {n} tx tracked":
    "la cartera se movió {m} en 1 semana · {n} tx registradas",
  "net {m} over {k} months · {n} tx tracked":
    "neto {m} en {k} meses · {n} tx registradas",
  net: "neto",
  "goal savings": "ahorro de metas",
  "save rate": "tasa de ahorro",
  "Net cashflow": "Flujo neto",
  "Where it went": "A dónde se fue",
  "no spending logged yet": "aún no hay gastos registrados",
  "Activity · last 28d": "Actividad · últimos 28d",
  less: "menos",
  more: "más",

  // ── Integrations ────────────────────────────────────────────
  Integrations: "Integraciones",
  "Open marketplace": "Abrir marketplace",
  "SAM for Developers": "SAM para desarrolladores",
  Connected: "Conectadas",
  Explore: "Explorar",
  Create: "Crear",
  "Create integration": "Crear integración",
  "marketplace connectors · author name shown on every listing":
    "conectores del marketplace · el autor aparece en cada ficha",
  "no integrations installed yet": "aún no hay integraciones instaladas",
  "read docs before publishing": "lee la documentación antes de publicar",

};
