import type { Lang } from "@/lib/i18n/i18n-context";

export type TourPlacement = "top" | "bottom" | "left" | "right";

/** Overlay the tour opens itself when a step needs it on screen. */
export type TourEnsure = "expense" | "samy";

type Localized = Record<Lang, string>;

export type TourStepDef = {
  id: string;
  chapter: TourChapterId;
  route: string;
  target: string;
  placement: TourPlacement;
  title: Localized;
  body: Localized;
  /** Optional hands-on task. Never blocks "Next". */
  task?: { label: Localized; done: Localized; doneWhen?: string };
  ensure?: TourEnsure;
  /** Keep this overlay open when entering the step instead of resetting to a clean page. */
  keep?: TourEnsure;
  /** Forms inside the target are intercepted: nothing is saved or sent. */
  sandbox?: boolean;
};

export type TourChapterId = "overview" | "record" | "ledger" | "plan" | "review" | "personalize";

export const TOUR_CHAPTERS: Array<{ id: TourChapterId; title: Localized; summary: Localized }> = [
  {
    id: "overview",
    title: { es: "Tu panorama", en: "Your overview" },
    summary: { es: "Saldo, moneda activa y flujo del mes.", en: "Balance, active currency and monthly flow." },
  },
  {
    id: "record",
    title: { es: "Registrar", en: "Record" },
    summary: { es: "Gastos, ingresos y búsqueda rápida.", en: "Expenses, income and quick search." },
  },
  {
    id: "ledger",
    title: { es: "Movimientos", en: "Transactions" },
    summary: { es: "Filtra el libro y abre el detalle.", en: "Filter the ledger and inspect entries." },
  },
  {
    id: "plan",
    title: { es: "Planificar", en: "Plan" },
    summary: { es: "Presupuestos, cuentas, metas y pagos fijos.", en: "Budgets, accounts, goals and fixed payments." },
  },
  {
    id: "review",
    title: { es: "Analizar", en: "Review" },
    summary: { es: "Informes y Samy, tu asistente.", en: "Reports and Samy, your assistant." },
  },
  {
    id: "personalize",
    title: { es: "Personalizar", en: "Personalize" },
    summary: { es: "Temas, integraciones y ayuda.", en: "Themes, integrations and help." },
  },
];

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: "nav",
    chapter: "overview",
    route: "/app",
    target: '[data-tour="nav"]',
    placement: "right",
    title: { es: "Todo SAM en una columna", en: "All of SAM in one column" },
    body: {
      es: "Las secciones se agrupan en diario, plan y revisión. El recorrido te lleva de una a otra; tú solo sigues.",
      en: "Sections are grouped into daily, plan and review. The tour moves you between them; you just follow along.",
    },
  },
  {
    id: "position",
    chapter: "overview",
    route: "/app",
    target: '[data-tour="position"]',
    placement: "bottom",
    title: { es: "Tu posición del mes", en: "Your position this month" },
    body: {
      es: "Saldo disponible, cierre estimado y lo que entró, salió y ahorraste este mes. El botón del ojo oculta las cifras si trabajas en público.",
      en: "Available balance, projected close, and what came in, went out and was saved this month. The eye button hides amounts when you work in public.",
    },
  },
  {
    id: "currency",
    chapter: "overview",
    route: "/app",
    target: '[data-tour="currency"]',
    placement: "bottom",
    title: { es: "Una moneda a la vez", en: "One currency at a time" },
    body: {
      es: "SAM no mezcla USD con PEN. Cambia la moneda aquí y cada vista se recalcula solo con las cuentas de esa moneda.",
      en: "SAM never mixes USD and PEN. Switch currency here and every view recalculates using only accounts in that currency.",
    },
  },
  {
    id: "cashflow",
    chapter: "overview",
    route: "/app",
    target: '[data-tour="cashflow"]',
    placement: "bottom",
    title: { es: "Flujo de efectivo", en: "Cash flow" },
    body: {
      es: "Lo confirmado hasta hoy y lo proyectado con tus pagos programados. La línea discontinua es hacia dónde vas si nada cambia.",
      en: "What is confirmed so far and what is projected from your scheduled payments. The dashed line is where you land if nothing changes.",
    },
  },
  {
    id: "tray",
    chapter: "record",
    route: "/app",
    target: '[data-tour="tray"]',
    placement: "top",
    title: { es: "Acciones siempre a mano", en: "Actions always within reach" },
    body: {
      es: "Esta bandeja está en todas las secciones: gasto, ingreso, transferencia, cuenta, meta, pago programado y presupuesto.",
      en: "This tray is on every section: expense, income, transfer, account, goal, scheduled payment and budget.",
    },
  },
  {
    id: "tray-expense",
    chapter: "record",
    route: "/app",
    target: '[data-tour="tray-expense"]',
    placement: "top",
    title: { es: "Pruébalo: registra un gasto", en: "Try it: record an expense" },
    body: {
      es: "Haz clic en Registrar gasto. Desde cualquier pantalla también puedes pulsar N.",
      en: "Click Record expense. From any screen you can also press N.",
    },
    task: {
      label: { es: "Abre el formulario de gasto", en: "Open the expense form" },
      done: { es: "Formulario abierto", en: "Form opened" },
      doneWhen: ".desk-action-layer.is-open",
    },
  },
  {
    id: "drawer",
    chapter: "record",
    route: "/app",
    target: '[data-tour="action-drawer"]',
    placement: "left",
    ensure: "expense",
    keep: "expense",
    sandbox: true,
    title: { es: "Así se registra un movimiento", en: "How a movement is recorded" },
    body: {
      es: "Descripción, importe, cuenta, categoría y fecha. Escribe lo que quieras y pulsa Guardar: en este paso el formulario está en modo práctica.",
      en: "Description, amount, account, category and date. Type anything and press Save: in this step the form is in practice mode.",
    },
    task: {
      label: { es: "Completa el formulario y pulsa Guardar", en: "Fill the form and press Save" },
      done: { es: "Guardado interceptado: no se registró nada", en: "Save intercepted: nothing was recorded" },
    },
  },
  {
    id: "search",
    chapter: "record",
    route: "/app",
    target: '[data-tour="search"]',
    placement: "bottom",
    title: { es: "Busca en todo tu libro", en: "Search your whole ledger" },
    body: {
      es: "Pulsa ⌘K o Ctrl K y escribe un comercio o una categoría. Al elegir un resultado se abre su detalle.",
      en: "Press ⌘K or Ctrl K and type a merchant or category. Picking a result opens its details.",
    },
    task: {
      label: { es: "Haz clic en la búsqueda y escribe algo", en: "Click the search and type something" },
      done: { es: "Búsqueda activa", en: "Search active" },
      doneWhen: '[data-tour="search"]:focus-within',
    },
  },
  {
    id: "ledger-filters",
    chapter: "ledger",
    route: "/app/transactions",
    target: '[data-tour="ledger-filters"]',
    placement: "bottom",
    title: { es: "Filtra el libro", en: "Filter the ledger" },
    body: {
      es: "Por cuenta, categoría y periodo. El contador de la derecha confirma cuántos movimientos estás viendo.",
      en: "By account, category and period. The counter on the right confirms how many movements you are looking at.",
    },
  },
  {
    id: "ledger-panel",
    chapter: "ledger",
    route: "/app/transactions",
    target: '[data-tour="ledger-panel"]',
    placement: "top",
    title: { es: "Cada fila tiene contexto", en: "Every row has context" },
    body: {
      es: "Haz clic en una descripción para abrir el inspector: cuenta, estado y edición, sin salir de la lista.",
      en: "Click a description to open the inspector: account, status and editing, without leaving the list.",
    },
    task: {
      label: { es: "Abre cualquier movimiento", en: "Open any movement" },
      done: { es: "Inspector abierto", en: "Inspector opened" },
      doneWhen: ".desk-inspector.is-open:not(.samy-panel)",
    },
  },
  {
    id: "budgets",
    chapter: "plan",
    route: "/app/budgets",
    target: '[data-tour="budget-envelope"]',
    placement: "bottom",
    title: { es: "Presupuestos mensuales", en: "Monthly budgets" },
    body: {
      es: "La barra suma todos tus sobres del mes. Debajo, cada categoría pasa a ámbar al 80 % y a rojo cuando se excede.",
      en: "The bar adds up every envelope for the month. Below, each category turns amber at 80% and red once it is exceeded.",
    },
  },
  {
    id: "accounts",
    chapter: "plan",
    route: "/app/accounts",
    target: '[data-tour="accounts-actions"]',
    placement: "bottom",
    title: { es: "Cuentas y tarjetas", en: "Accounts and cards" },
    body: {
      es: "Crea cuentas de banco, efectivo o tarjetas con su límite. Transferir mueve saldo entre dos cuentas de la misma moneda sin contarlo como gasto.",
      en: "Create bank, cash or card accounts with their limit. Transfer moves money between two accounts in the same currency without counting it as spending.",
    },
  },
  {
    id: "goals",
    chapter: "plan",
    route: "/app/goals",
    target: '[data-tour="goal-runway"]',
    placement: "bottom",
    title: { es: "Metas con pista de avance", en: "Goals with a runway" },
    body: {
      es: "Cada meta muestra cuánto llevas y cuánto falta. Ábrela para actualizar lo ahorrado.",
      en: "Each goal shows how far along you are and what is left. Open it to update the saved amount.",
    },
  },
  {
    id: "recurring",
    chapter: "plan",
    route: "/app/recurring",
    target: '[data-tour="recurring-metrics"]',
    placement: "bottom",
    title: { es: "Pagos programados", en: "Scheduled payments" },
    body: {
      es: "Suscripciones, sueldo o alquiler. SAM los ejecuta en su fecha y los descuenta del cierre estimado antes de que ocurran.",
      en: "Subscriptions, salary or rent. SAM runs them on their date and subtracts them from the projected close before they happen.",
    },
  },
  {
    id: "reports",
    chapter: "review",
    route: "/app/reports",
    target: '[data-tour="report-metrics"]',
    placement: "bottom",
    title: { es: "Informes del mes", en: "Monthly reports" },
    body: {
      es: "Flujo neto, tasa de ahorro, salidas programadas y posición proyectada, con la cinta diaria de ingresos y gastos debajo.",
      en: "Net flow, save rate, scheduled outflow and projected position, with the daily income and expense tape below.",
    },
  },
  {
    id: "samy-fab",
    chapter: "review",
    route: "/app/reports",
    target: '[data-tour="samy-fab"]',
    placement: "left",
    title: { es: "Conoce a Samy", en: "Meet Samy" },
    body: {
      es: "Tu asistente financiero. Responde con tus datos reales y puede registrar movimientos si se lo pides.",
      en: "Your financial assistant. It answers with your real data and can record movements when you ask.",
    },
    task: {
      label: { es: "Abre a Samy", en: "Open Samy" },
      done: { es: "Samy abierto", en: "Samy opened" },
      doneWhen: '[data-tour="samy-panel"]',
    },
  },
  {
    id: "samy-panel",
    chapter: "review",
    route: "/app/reports",
    target: '[data-tour="samy-panel"]',
    placement: "left",
    ensure: "samy",
    keep: "samy",
    sandbox: true,
    title: { es: "Pregunta en lenguaje natural", en: "Ask in plain language" },
    body: {
      es: "Por ejemplo: “¿cuánto gasté en comida este mes?”. En este paso el envío está en modo práctica: no gasta tu cuota ni registra nada.",
      en: "For example: “how much did I spend on food this month?”. In this step sending is in practice mode: it uses no quota and records nothing.",
    },
    task: {
      label: { es: "Escribe una pregunta y envíala", en: "Type a question and send it" },
      done: { es: "Envío interceptado: Samy no recibió nada", en: "Send intercepted: Samy received nothing" },
    },
  },
  {
    id: "themes",
    chapter: "personalize",
    route: "/app/settings",
    target: '[data-tour="themes"]',
    placement: "bottom",
    title: { es: "Tu terminal, tus colores", en: "Your terminal, your colors" },
    body: {
      es: "Siete paletas con los mismos significados: verde es ingreso y avance, ámbar es pendiente y rojo es riesgo.",
      en: "Seven palettes with the same meanings: green is income and progress, amber is pending, red is risk.",
    },
  },
  {
    id: "connect",
    chapter: "personalize",
    route: "/app/settings",
    target: '[data-tour="connect"]',
    placement: "top",
    title: { es: "Conecta tus herramientas", en: "Connect your tools" },
    body: {
      es: "Integraciones y SAM MCP dan acceso a tus finanzas a otros asistentes, con permisos acotados que puedes revocar.",
      en: "Integrations and SAM MCP give other assistants access to your finances, with scoped permissions you can revoke.",
    },
  },
  {
    id: "help",
    chapter: "personalize",
    route: "/app/settings",
    target: '[data-tour="help"]',
    placement: "bottom",
    title: { es: "Vuelve cuando quieras", en: "Come back any time" },
    body: {
      es: "Este botón abre el mapa del recorrido. Puedes repetir un capítulo concreto o retomar donde lo dejaste.",
      en: "This button opens the tour map. Replay a specific chapter or pick up where you left off.",
    },
  },
];

export function chapterIndex(id: TourChapterId) {
  return TOUR_CHAPTERS.findIndex((chapter) => chapter.id === id);
}

export function chapterSteps(id: TourChapterId) {
  const first = TOUR_STEPS.findIndex((step) => step.chapter === id);
  const count = TOUR_STEPS.filter((step) => step.chapter === id).length;
  return { first, last: first + count - 1, count };
}

export const TOUR_UI = {
  es: {
    open: "Recorrido por SAM",
    kicker: "sam://tour",
    title: "Recorrido por SAM",
    intro: "Seis paradas, unos 4 minutos. Usas los botones reales y los formularios que abras durante el recorrido no guardan nada.",
    start: "Empezar recorrido",
    resume: "Continuar en el paso {n}",
    replay: "Repetir recorrido",
    later: "Ahora no",
    steps: "{n} pasos",
    chapterDone: "Completado",
    chapterCurrent: "Aquí te quedaste",
    footnote: "Puedes pausar o salir en cualquier momento.",
    back: "Atrás",
    next: "Siguiente",
    finish: "Terminar",
    pause: "Pausar recorrido",
    exit: "Salir del recorrido",
    paused: "Recorrido en pausa",
    continue: "Continuar",
    stepOf: "Paso {n} de {total}",
    tryIt: "Pruébalo",
    optional: "opcional",
    practice: "Modo práctica activo",
    loading: "Abriendo {section}…",
    preparing: "Preparando…",
    offRoute: "Este paso está en {section}.",
    goThere: "Ir allí",
    notFound: "Este elemento no está visible ahora. Puedes seguir con el siguiente paso.",
    keys: "← → · Esc pausa",
    close: "Cerrar",
  },
  en: {
    open: "SAM tour",
    kicker: "sam://tour",
    title: "Tour of SAM",
    intro: "Six stops, about 4 minutes. You use the real buttons, and forms you open during the tour save nothing.",
    start: "Start tour",
    resume: "Continue at step {n}",
    replay: "Replay tour",
    later: "Not now",
    steps: "{n} steps",
    chapterDone: "Completed",
    chapterCurrent: "You left off here",
    footnote: "You can pause or leave at any moment.",
    back: "Back",
    next: "Next",
    finish: "Finish",
    pause: "Pause tour",
    exit: "Leave tour",
    paused: "Tour paused",
    continue: "Continue",
    stepOf: "Step {n} of {total}",
    tryIt: "Try it",
    optional: "optional",
    practice: "Practice mode on",
    loading: "Opening {section}…",
    preparing: "Preparing…",
    offRoute: "This step lives in {section}.",
    goThere: "Go there",
    notFound: "This element is not visible right now. You can continue to the next step.",
    keys: "← → · Esc pause",
    close: "Close",
  },
} as const;

export type TourUi = { [Key in keyof (typeof TOUR_UI)["en"]]: string };

export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
