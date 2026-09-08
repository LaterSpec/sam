export const SAMY_MAX_STEPS = 8;
export const SAMY_HISTORY_LIMIT = 24;
export const SAMY_MEMORY_LIMIT = 20;
export const SAMY_USER_MESSAGE_MAX = 4000;
export const SAMY_TOOL_RESULT_MAX = 8000;
export const SAMY_RATE_LIMIT_PER_MINUTE = 20;
export const SAMY_LIST_TRANSACTIONS_MAX = 80;
export const SAMY_TITLE_MAX = 72;
export const SAMY_MEMORY_CONTENT_MAX = 500;

export const SAMY_WRITE_TOOL_NAMES = new Set([
  "sam_add_expense",
  "sam_update_expense",
  "sam_delete_expense",
  "sam_create_category",
  "sam_update_category",
  "sam_update_category_cap",
  "sam_add_income",
  "sam_create_account",
  "sam_update_account",
  "sam_transfer_between_accounts",
  "sam_create_goal",
  "sam_update_goal",
  "sam_set_goal_saved",
  "sam_set_bucket_balance",
  "sam_create_recurring_rule",
  "sam_update_recurring_rule",
  "sam_pause_recurring_rule",
  "sam_resume_recurring_rule",
  "sam_archive_recurring_rule",
  "sam_delete_recurring_rule",
  "sam_retry_recurring_occurrence",
  "sam_update_username",
  "sam_update_prefs",
]);
