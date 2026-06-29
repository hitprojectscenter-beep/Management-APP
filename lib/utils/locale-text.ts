/**
 * Multi-locale text helper.
 * Usage: txt(locale, { he: "עברית", en: "English", ru: "Русский", fr: "Français", es: "Español" })
 * Falls back to English if locale not found.
 */
export type LocaleTexts = {
  he: string;
  en: string;
  ru?: string;
  fr?: string;
  es?: string;
};

export function txt(locale: string, texts: LocaleTexts): string {
  return (texts as Record<string, string>)[locale] || texts.en;
}

/**
 * Common UI labels used across many components.
 * Centralised so every component picks up all 5 locales.
 */
export const COMMON_LABELS = {
  cancel:   { he: "ביטול",      en: "Cancel",     ru: "Отмена",     fr: "Annuler",    es: "Cancelar"   },
  save:     { he: "שמור",       en: "Save",       ru: "Сохранить",  fr: "Enregistrer", es: "Guardar"   },
  add:      { he: "הוסף",       en: "Add",        ru: "Добавить",   fr: "Ajouter",    es: "Añadir"     },
  delete:   { he: "מחק",        en: "Delete",     ru: "Удалить",    fr: "Supprimer",  es: "Eliminar"   },
  search:   { he: "חיפוש",      en: "Search",     ru: "Поиск",      fr: "Rechercher", es: "Buscar"     },
  required: { he: "חובה",       en: "required",   ru: "обязательно", fr: "obligatoire", es: "obligatorio" },
  loading:  { he: "טוען...",    en: "Loading...", ru: "Загрузка...", fr: "Chargement...", es: "Cargando..." },
  today:    { he: "היום",       en: "Today",      ru: "Сегодня",    fr: "Aujourd'hui", es: "Hoy"       },
  synced:   { he: "מסונכרן",    en: "Synced",     ru: "Синхронизировано", fr: "Synchronisé", es: "Sincronizado" },
  open:     { he: "פתוחות",     en: "Open",       ru: "Открытые",   fr: "Ouvertes",   es: "Abiertas"   },
  done:     { he: "הושלמו",     en: "Done",       ru: "Завершены",  fr: "Terminées",  es: "Completadas" },
  invite:   { he: "הזמן חבר",   en: "Invite member", ru: "Пригласить", fr: "Inviter", es: "Invitar"    },
  team:     { he: "צוות",       en: "Team",       ru: "Команда",    fr: "Équipe",     es: "Equipo"     },
  teamMembers: { he: "חברי צוות", en: "team members", ru: "участников команды", fr: "membres", es: "miembros" },
} as const;

/** Status labels for tasks */
export const STATUS_LABELS_ML: Record<string, LocaleTexts> = {
  not_started: { he: "לא התחיל", en: "Not started", ru: "Не начата",      fr: "Non démarré",  es: "No iniciada" },
  in_progress: { he: "בטיפול",   en: "In progress", ru: "В работе",       fr: "En cours",     es: "En progreso" },
  review:      { he: "בבדיקה",   en: "Review",      ru: "Проверка",       fr: "En revue",     es: "En revisión" },
  done:        { he: "הושלם",    en: "Done",        ru: "Завершена",      fr: "Terminé",      es: "Completada"  },
  blocked:     { he: "חסום",     en: "Blocked",     ru: "Заблокирована",  fr: "Bloqué",       es: "Bloqueada"   },
  cancelled:   { he: "בוטל",     en: "Cancelled",   ru: "Отменена",       fr: "Annulé",       es: "Cancelada"   },
  // Task workflow statuses (user spec)
  new:         { he: "חדשה",     en: "New",         ru: "Новая",          fr: "Nouvelle",     es: "Nueva"       },
  frozen:      { he: "הוקפאה",   en: "Frozen",      ru: "Заморожена",     fr: "Gelé",         es: "Congelada"   },
  waiting:     { he: "ממתינה",   en: "Waiting",     ru: "Ожидает",        fr: "En attente",   es: "En espera"   },
  handled:     { he: "טופל",     en: "Handled",     ru: "Обработана",     fr: "Traité",       es: "Atendida"    },
  rejected:    { he: "נדחתה",    en: "Rejected",    ru: "Отклонена",      fr: "Rejeté",       es: "Rechazada"   },
  completed:   { he: "הושלם",    en: "Completed",   ru: "Завершена",      fr: "Terminé",      es: "Completada"  },
};

/** Per-member role/function within a task ("who does what"). */
export const MEMBER_ROLE_LABELS_ML: Record<string, LocaleTexts> = {
  execute:      { he: "לבצע",          en: "Execute",          ru: "Выполнить",                fr: "Exécuter",            es: "Ejecutar" },
  provide_info: { he: "לספק מידע",     en: "Provide info",     ru: "Предоставить информацию",  fr: "Fournir des infos",   es: "Proporcionar información" },
  meeting:      { he: "לקיים פגישה",   en: "Hold a meeting",   ru: "Провести встречу",         fr: "Tenir une réunion",   es: "Realizar una reunión" },
  report:       { he: "להכין דו\"ח",    en: "Prepare a report", ru: "Подготовить отчёт",        fr: "Préparer un rapport", es: "Preparar un informe" },
  review:       { he: "לבדוק ולאשר",   en: "Review & approve", ru: "Проверить и утвердить",    fr: "Vérifier et approuver", es: "Revisar y aprobar" },
  coordinate:   { he: "לתאם",          en: "Coordinate",       ru: "Координировать",           fr: "Coordonner",          es: "Coordinar" },
  consult:      { he: "לייעץ",         en: "Advise / consult", ru: "Консультировать",          fr: "Conseiller",          es: "Asesorar" },
  other:        { he: "אחר",           en: "Other",            ru: "Другое",                   fr: "Autre",               es: "Otro" },
};

/** Role keys in display order (for the add-task dropdown). */
export const MEMBER_ROLE_KEYS = ["execute", "provide_info", "meeting", "report", "review", "coordinate", "consult", "other"];

/** Priority labels */
export const PRIORITY_LABELS_ML: Record<string, LocaleTexts> = {
  low:      { he: "נמוכה",   en: "Low",      ru: "Низкий",      fr: "Basse",     es: "Baja"     },
  medium:   { he: "בינונית", en: "Medium",   ru: "Средний",     fr: "Moyenne",   es: "Media"    },
  high:     { he: "גבוהה",   en: "High",     ru: "Высокий",     fr: "Haute",     es: "Alta"     },
  critical: { he: "קריטית",  en: "Critical", ru: "Критический", fr: "Critique",  es: "Crítica"  },
};

/** Tab labels for the landing page task tabs */
export const TAB_LABELS_ML: Record<string, LocaleTexts> = {
  all:         { he: "הכל",        en: "All",         ru: "Все",            fr: "Tout",         es: "Todo"         },
  in_progress: { he: "בביצוע",     en: "In progress", ru: "В работе",       fr: "En cours",     es: "En progreso"  },
  not_started: { he: "לא התחילו",  en: "Not started", ru: "Не начаты",     fr: "Non démarrés", es: "No iniciadas" },
  blocked:     { he: "חסומות",     en: "Blocked",     ru: "Заблокированы", fr: "Bloquées",     es: "Bloqueadas"   },
  review:      { he: "בבדיקה",     en: "Review",      ru: "На проверке",   fr: "En revue",     es: "En revisión"  },
  overdue:     { he: "באיחור",     en: "Overdue",     ru: "Просрочены",    fr: "En retard",    es: "Retrasadas"   },
  by_project:  { he: "לפי פרויקט", en: "By project",  ru: "По проекту",    fr: "Par projet",   es: "Por proyecto" },
  subordinates:{ he: "משימות הכפופים אלי", en: "My team's tasks", ru: "Задачи подчинённых", fr: "Tâches de mon équipe", es: "Tareas de mi equipo" },
};

/** Weekday short names for calendar */
export const WEEKDAYS_ML: Record<string, string[]> = {
  he: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
  en: ["S", "M", "T", "W", "T", "F", "S"],
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  fr: ["D", "L", "M", "M", "J", "V", "S"],
  es: ["D", "L", "M", "X", "J", "V", "S"],
};

/** Organization name */
export const ORG_NAME: LocaleTexts = {
  he: "המרכז למיפוי ישראל",
  en: "Israel Mapping Center",
  ru: "Центр картографии Израиля",
  fr: "Centre de Cartographie d'Israël",
  es: "Centro de Cartografía de Israel",
};

/** Locale code → Intl locale string for date formatting */
export const INTL_LOCALE: Record<string, string> = {
  he: "he-IL",
  en: "en-US",
  ru: "ru-RU",
  fr: "fr-FR",
  es: "es-ES",
};
