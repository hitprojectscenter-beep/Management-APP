/**
 * User Guides — comprehensive step-by-step guides for PMO++ in 5 languages.
 * Accessible from the sidebar and referenced by Help Bot + Assistant.
 */

export interface GuideStep {
  title: Record<string, string>;
  body: Record<string, string>;
}

export interface UserGuide {
  id: string;
  icon: string; // emoji
  category: "getting-started" | "tasks" | "projects" | "risks" | "gantt" | "admin" | "ai";
  title: Record<string, string>;
  summary: Record<string, string>;
  steps: GuideStep[];
}

export const USER_GUIDES: UserGuide[] = [
  // ============================================================
  // GETTING STARTED
  // ============================================================
  {
    id: "getting-started",
    icon: "🚀",
    category: "getting-started",
    title: {
      he: "התחלה מהירה — 5 דקות",
      en: "Quick Start — 5 Minutes",
      ru: "Быстрый старт — 5 минут",
      fr: "Démarrage rapide — 5 minutes",
      es: "Inicio rápido — 5 minutos",
    },
    summary: {
      he: "היכרות עם PMO++ לחדשים במערכת",
      en: "Introduction to PMO++ for new users",
      ru: "Знакомство с PMO++ для новых пользователей",
      fr: "Introduction à PMO++ pour les nouveaux utilisateurs",
      es: "Introducción a PMO++ para usuarios nuevos",
    },
    steps: [
      {
        title: { he: "1. בחירת שפה", en: "1. Choose your language", ru: "1. Выберите язык", fr: "1. Choisissez votre langue", es: "1. Elige tu idioma" },
        body: {
          he: "לחץ על אייקון הגלובוס 🌐 בסרגל העליון ובחר מתוך 5 שפות: עברית, אנגלית, רוסית, צרפתית, ספרדית. עברית תמיד מוצגת ב-RTL עם תמיכה מלאה.",
          en: "Click the globe icon 🌐 in the top bar and select from 5 languages: Hebrew, English, Russian, French, Spanish. Hebrew always displays in RTL with full support.",
          ru: "Нажмите на значок глобуса 🌐 в верхней панели и выберите из 5 языков.",
          fr: "Cliquez sur l'icône du globe 🌐 dans la barre supérieure et choisissez parmi 5 langues.",
          es: "Haz clic en el ícono del globo 🌐 en la barra superior y elige entre 5 idiomas.",
        },
      },
      {
        title: { he: "2. היכרות עם המסך הראשי", en: "2. Meet the home screen", ru: "2. Главный экран", fr: "2. L'écran d'accueil", es: "2. Pantalla de inicio" },
        body: {
          he: "בדף הבית תראה את המשימות שלך מסודרות לפי דחיפות, סטטיסטיקות אישיות, והפרויקטים בהם אתה חבר. לחץ על כל משימה לפתיחת הפרטים.",
          en: "On the home page you'll see your tasks sorted by urgency, personal stats, and projects you're a member of. Click any task to open details.",
          ru: "На главной странице — ваши задачи по срочности, личная статистика, проекты.",
          fr: "Sur la page d'accueil — vos tâches par urgence, statistiques personnelles, projets.",
          es: "En la página de inicio — tus tareas por urgencia, estadísticas personales, proyectos.",
        },
      },
      {
        title: { he: "3. מעבר בין תפקידים", en: "3. Switch roles", ru: "3. Переключение ролей", fr: "3. Changer de rôle", es: "3. Cambiar roles" },
        body: {
          he: "לחץ על Badge התפקיד בסרגל העליון כדי לעבור בין משתמשים (Admin, Manager, Member, Viewer, Guest). הממשק ישתנה בהתאם להרשאות.",
          en: "Click the role badge in the top bar to switch between users (Admin, Manager, Member, Viewer, Guest). The UI adapts to permissions.",
          ru: "Нажмите на значок роли в верхней панели для переключения между пользователями.",
          fr: "Cliquez sur le badge de rôle pour basculer entre les utilisateurs.",
          es: "Haz clic en la insignia de rol para cambiar entre usuarios.",
        },
      },
      {
        title: { he: "4. העוזר האישי", en: "4. Personal Assistant", ru: "4. Личный помощник", fr: "4. Assistant personnel", es: "4. Asistente personal" },
        body: {
          he: "לחץ על הכפתור הסגול ✨ בפינה כדי לפתוח את העוזר האישי. דבר איתו או כתוב שאלות בעברית, למשל: \"הסבר לי על לוח גאנט\" או \"מה הסיכונים בפרויקט?\".",
          en: "Click the purple ✨ button to open the Personal Assistant. Speak or type questions like: \"Explain the Gantt chart\" or \"What are the risks?\".",
          ru: "Откройте Личного помощника (фиолетовая кнопка ✨). Говорите или пишите вопросы.",
          fr: "Ouvrez l'Assistant personnel (bouton violet ✨). Parlez ou tapez des questions.",
          es: "Abre el Asistente personal (botón morado ✨). Habla o escribe preguntas.",
        },
      },
    ],
  },

  // ============================================================
  // TASKS
  // ============================================================
  {
    id: "manage-tasks",
    icon: "✅",
    category: "tasks",
    title: {
      he: "ניהול משימות",
      en: "Managing Tasks",
      ru: "Управление задачами",
      fr: "Gérer les tâches",
      es: "Gestionar tareas",
    },
    summary: {
      he: "איך ליצור, לערוך, לסגור ולשייך משימות",
      en: "How to create, edit, close and assign tasks",
      ru: "Как создавать, редактировать, закрывать и назначать задачи",
      fr: "Comment créer, modifier, fermer et assigner des tâches",
      es: "Cómo crear, editar, cerrar y asignar tareas",
    },
    steps: [
      {
        title: { he: "יצירת משימה", en: "Creating a task", ru: "Создание задачи", fr: "Créer une tâche", es: "Crear tarea" },
        body: {
          he: "בדף הבית לחץ על כפתור \"+\" ליד הטאבים. מלא שם, בחר סוג מתוך 13 (באג, פגישה, מסמך...), בחר פרויקט/פרוגרמה, הוסף תיאור, צוות, תאריכים, ועדיפות. אפשר לצרף קבצים עד 5MB.",
          en: "On the home page, click the \"+\" button near the tabs. Fill in the name, choose a type from 13 options (bug, meeting, document...), select project/program, add description, team, dates, and priority. Files up to 5MB can be attached.",
          ru: "На главной странице нажмите \"+\" рядом с вкладками. Заполните имя, тип, проект, описание, команду, даты, приоритет.",
          fr: "Sur la page d'accueil, cliquez sur \"+\" près des onglets. Remplissez le nom, type, projet, description, équipe, dates, priorité.",
          es: "En inicio, haz clic en \"+\" cerca de las pestañas. Completa nombre, tipo, proyecto, descripción, equipo, fechas, prioridad.",
        },
      },
      {
        title: { he: "סגירת משימה", en: "Closing a task", ru: "Закрытие задачи", fr: "Fermer une tâche", es: "Cerrar tarea" },
        body: {
          he: "רק המשויך יכול לסגור. פתח את המשימה ולחץ \"סגור משימה\". בחר סיבה: ✅ טופל, ⏳ נדחה, ❌ בוטל, 🔄 הועבר למשתמש אחר. הוסף תיאור קצר (עד 300 תווים).",
          en: "Only the assignee can close. Open the task and click \"Close Task\". Choose reason: ✅ Handled, ⏳ Postponed, ❌ Cancelled, 🔄 Transferred. Add short description (300 chars).",
          ru: "Только назначенный может закрыть. Выберите причину: ✅ Выполнено, ⏳ Отложено, ❌ Отменено, 🔄 Передано.",
          fr: "Seul l'assigné peut fermer. Choisissez une raison : ✅ Traité, ⏳ Reporté, ❌ Annulé, 🔄 Transféré.",
          es: "Solo el asignado puede cerrar. Elige razón: ✅ Gestionado, ⏳ Pospuesto, ❌ Cancelado, 🔄 Transferido.",
        },
      },
      {
        title: { he: "שיוך מחדש", en: "Reassigning", ru: "Перенаправление", fr: "Réassigner", es: "Reasignar" },
        body: {
          he: "רק יוצר המשימה יכול לשייך מחדש. בלחיצה על \"שייך מחדש\" נפתח דיאלוג עם From → To, רשימת משתמשים, וסיבת שיוך.",
          en: "Only the creator can reassign. Click \"Reassign\" for a dialog with From → To, user list, and reason.",
          ru: "Только создатель может перенаправить. Диалог: От → Кому, список пользователей, причина.",
          fr: "Seul le créateur peut réassigner. Dialogue : De → À, liste d'utilisateurs, raison.",
          es: "Solo el creador puede reasignar. Diálogo: De → A, lista, razón.",
        },
      },
    ],
  },

  // ============================================================
  // PROJECTS
  // ============================================================
  {
    id: "projects",
    icon: "📂",
    category: "projects",
    title: {
      he: "ניהול פרויקטים",
      en: "Project Management",
      ru: "Управление проектами",
      fr: "Gestion de projets",
      es: "Gestión de proyectos",
    },
    summary: {
      he: "עבודה עם פרויקטים, פרוגרמות, כ\"א ופעילויות",
      en: "Working with projects, programs, staff and activities",
      ru: "Работа с проектами, программами, персоналом и действиями",
      fr: "Travailler avec projets, programmes, personnel et activités",
      es: "Trabajar con proyectos, programas, personal y actividades",
    },
    steps: [
      {
        title: { he: "פאנל כ\"א", en: "Staff Panel", ru: "Панель персонала", fr: "Panneau du personnel", es: "Panel de personal" },
        body: {
          he: "בדף כל פרויקט יש פאנל \"כ\"א\" המציג את כל חברי הצוות עם תפקיד ואחוז משרה (FTE). לחץ \"הוסף\" להוספת חבר, \"ערוך\" לשינוי תפקיד, \"מחק\" להסרה. סך FTE מוצג למעלה — אזהרת הקצאת יתר מעל 100%.",
          en: "Each project page has a \"Staff\" panel showing all team members with role and FTE %. Click \"Add\" to add, \"Edit\" to change role, \"Delete\" to remove. Total FTE shown at top — over-allocation warning above 100%.",
          ru: "На странице проекта — панель \"Персонал\" с ролями и % FTE. Добавить/Изменить/Удалить.",
          fr: "Chaque projet a un panneau \"Personnel\" avec rôles et % FTE. Ajouter/Modifier/Supprimer.",
          es: "Cada proyecto tiene panel \"Personal\" con roles y % FTE. Añadir/Editar/Eliminar.",
        },
      },
      {
        title: { he: "פאנל פעילויות", en: "Activities Panel", ru: "Панель действий", fr: "Panneau d'activités", es: "Panel de actividades" },
        body: {
          he: "פאנל \"פעילויות\" מציג את כל הפעילויות בפרויקט עם 5 סטטוסים: חדשה, בביצוע, הסתיימה, הקפאה, איחור. לכל פעילות: שם, משימה מקושרת, דחיפות, תאריכים ואחראי. טאבי סינון מאפשרים להציג לפי סטטוס.",
          en: "\"Activities\" panel shows all project activities with 5 statuses: New, In Progress, Done, Frozen, Late. Each activity has: name, linked task, priority, dates, assignee. Filter tabs show by status.",
          ru: "Панель \"Действия\": 5 статусов (Новая, В работе, Готово, Заморожено, Опаздывает). Фильтры по статусу.",
          fr: "Panneau \"Activités\" : 5 statuts (Nouveau, En cours, Terminé, Gelé, En retard). Filtres.",
          es: "Panel \"Actividades\": 5 estados (Nueva, En progreso, Terminada, Congelada, Atrasada). Filtros.",
        },
      },
      {
        title: { he: "שיטת ניהול פרויקט", en: "Project Methodology", ru: "Методология проекта", fr: "Méthodologie", es: "Metodología" },
        body: {
          he: "בעת יצירת משימה עבור פרויקט תוכל לבחור את שיטת הניהול: 📊 Waterfall (שלבים רציפים), 🔄 Agile (Sprints), 📋 Kanban (זרימה רציפה). הבחירה משפיעה על זיהוי הסיכונים.",
          en: "When creating a task for a project, choose methodology: 📊 Waterfall (sequential phases), 🔄 Agile (Sprints), 📋 Kanban (continuous flow). Choice affects risk detection.",
          ru: "Выберите методологию: Waterfall, Agile или Kanban — влияет на обнаружение рисков.",
          fr: "Choisissez la méthodologie : Waterfall, Agile ou Kanban — affecte la détection des risques.",
          es: "Elige metodología: Waterfall, Agile o Kanban — afecta la detección de riesgos.",
        },
      },
    ],
  },

  // ============================================================
  // RISKS
  // ============================================================
  {
    id: "risks",
    icon: "🛡️",
    category: "risks",
    title: {
      he: "ניהול סיכונים",
      en: "Risk Management",
      ru: "Управление рисками",
      fr: "Gestion des risques",
      es: "Gestión de riesgos",
    },
    summary: {
      he: "זיהוי, הערכה, גידור ומעקב אחר סיכונים",
      en: "Detect, assess, mitigate and monitor risks",
      ru: "Обнаружение, оценка, смягчение и мониторинг рисков",
      fr: "Détecter, évaluer, atténuer et surveiller les risques",
      es: "Detectar, evaluar, mitigar y monitorear riesgos",
    },
    steps: [
      {
        title: { he: "בחירת פרויקט", en: "Select Project", ru: "Выбор проекта", fr: "Sélectionner projet", es: "Seleccionar proyecto" },
        body: {
          he: "בדף ניהול סיכונים, בחר פרויקט מה-dropdown למעלה. הדשבורד יציג סיכונים ספציפיים לפרויקט זה בלבד.",
          en: "On the Risk Management page, select a project from the dropdown at the top. The dashboard will show risks specific to that project only.",
          ru: "На странице Управления рисками выберите проект в выпадающем списке.",
          fr: "Sur la page Gestion des risques, sélectionnez un projet dans le menu déroulant.",
          es: "En Gestión de riesgos, selecciona un proyecto del menú desplegable.",
        },
      },
      {
        title: { he: "מטריצת סיכונים 5×5", en: "5×5 Risk Matrix", ru: "Матрица рисков 5×5", fr: "Matrice 5×5", es: "Matriz 5×5" },
        body: {
          he: "המטריצה מציגה סבירות (X) מול השפעה (Y). ירוק = נמוך, צהוב = בינוני, כתום = גבוה, אדום = קריטי. בועה בתוך תא = מספר הסיכונים בקטגוריה זו.",
          en: "Matrix shows probability (X) vs impact (Y). Green = low, yellow = medium, orange = high, red = critical. Bubble in cell = number of risks in that category.",
          ru: "Матрица: вероятность × влияние. Цвета: зелёный/жёлтый/оранжевый/красный.",
          fr: "Matrice : probabilité × impact. Couleurs : vert/jaune/orange/rouge.",
          es: "Matriz: probabilidad × impacto. Colores: verde/amarillo/naranja/rojo.",
        },
      },
      {
        title: { he: "תכנית AI לגידור", en: "AI Mitigation Plan", ru: "План ИИ", fr: "Plan IA", es: "Plan IA" },
        body: {
          he: "לכל סיכון בציר הזמן יש תכנית AI בת 3 שלבים המותאמת לחומרה. למשל, סיכון קריטי: הסלמה מיידית → הקצאת משאבים → סקירה תוך 7 ימים.",
          en: "Each risk on the timeline has a 3-step AI plan adapted to severity. E.g., critical: immediate escalation → resource allocation → review in 7 days.",
          ru: "Каждый риск имеет план из 3 шагов, адаптированный к серьёзности.",
          fr: "Chaque risque a un plan en 3 étapes adapté à la gravité.",
          es: "Cada riesgo tiene un plan de 3 pasos adaptado a la gravedad.",
        },
      },
    ],
  },

  // ============================================================
  // GANTT
  // ============================================================
  {
    id: "gantt",
    icon: "📊",
    category: "gantt",
    title: {
      he: "לוח גאנט",
      en: "Gantt Chart",
      ru: "Диаграмма Ганта",
      fr: "Diagramme de Gantt",
      es: "Diagrama de Gantt",
    },
    summary: {
      he: "תצוגת ציר זמן עם תלויות, נתיב קריטי ואבני דרך",
      en: "Timeline view with dependencies, critical path and milestones",
      ru: "Временная шкала с зависимостями",
      fr: "Chronologie avec dépendances",
      es: "Línea de tiempo con dependencias",
    },
    steps: [
      {
        title: { he: "טווח תאריכים", en: "Date Range", ru: "Диапазон дат", fr: "Plage de dates", es: "Rango de fechas" },
        body: {
          he: "הגאנט נפתח תמיד בתאריך של היום ומציג 31 ימים קדימה. משימות מחוץ לטווח מורחבות אוטומטית.",
          en: "Gantt always opens at today's date and shows 31 days forward. Tasks outside the range extend automatically.",
          ru: "Ганта открывается с сегодняшней даты на 31 день вперёд.",
          fr: "Gantt s'ouvre à aujourd'hui et affiche 31 jours.",
          es: "Gantt se abre en la fecha de hoy y muestra 31 días.",
        },
      },
      {
        title: { he: "תלויות", en: "Dependencies", ru: "Зависимости", fr: "Dépendances", es: "Dependencias" },
        body: {
          he: "חצים סגולים מחברים בין משימות תלויות. לחיצה על פס של משימה פותחת popup עם רשימת התלויות: \"תלוי ב\" ו-\"חוסם את\".",
          en: "Purple arrows connect dependent tasks. Click a task bar for a popup showing \"depends on\" and \"blocks\" dependencies.",
          ru: "Фиолетовые стрелки соединяют зависимые задачи.",
          fr: "Flèches violettes entre tâches dépendantes.",
          es: "Flechas moradas entre tareas dependientes.",
        },
      },
      {
        title: { he: "נתיב קריטי", en: "Critical Path", ru: "Критический путь", fr: "Chemin critique", es: "Ruta crítica" },
        body: {
          he: "לחץ \"נתיב קריטי\" בסרגל העליון להדגשה באדום של המשימות בנתיב הקריטי — כל עיכוב בהן ידחה את סיום הפרויקט.",
          en: "Click \"Critical Path\" in the toolbar to highlight (in red) the critical path tasks — any delay pushes the project end date.",
          ru: "Нажмите \"Критический путь\" для выделения критичных задач.",
          fr: "Cliquez \"Chemin critique\" pour mettre en évidence les tâches critiques.",
          es: "Haz clic \"Ruta crítica\" para resaltar tareas críticas.",
        },
      },
    ],
  },

  // ============================================================
  // AI ASSISTANT
  // ============================================================
  {
    id: "assistant",
    icon: "🤖",
    category: "ai",
    title: {
      he: "עוזר אישי קולי",
      en: "Voice Personal Assistant",
      ru: "Голосовой помощник",
      fr: "Assistant vocal",
      es: "Asistente de voz",
    },
    summary: {
      he: "שיח קולי וטקסטואלי עם AI בשפה שלך",
      en: "Voice + text chat with AI in your language",
      ru: "Голос + текст с ИИ на вашем языке",
      fr: "Voix + texte avec l'IA dans votre langue",
      es: "Voz + texto con IA en tu idioma",
    },
    steps: [
      {
        title: { he: "פתיחת העוזר", en: "Open the Assistant", ru: "Открыть помощника", fr: "Ouvrir l'assistant", es: "Abrir asistente" },
        body: {
          he: "לחץ על הכפתור הסגול ✨ בפינה התחתונה. העוזר יברך אותך בשפה שבה נבחר הממשק.",
          en: "Click the purple ✨ button in the corner. The assistant greets you in your interface language.",
          ru: "Нажмите фиолетовую кнопку ✨ в углу.",
          fr: "Cliquez sur le bouton violet ✨ dans le coin.",
          es: "Haz clic en el botón morado ✨ en la esquina.",
        },
      },
      {
        title: { he: "דיבור (קולי)", en: "Voice input", ru: "Голосовой ввод", fr: "Entrée vocale", es: "Entrada de voz" },
        body: {
          he: "לחץ על אייקון המיקרופון 🎤 ודבר בעברית. הטקסט יופיע בזמן אמת ויישלח אוטומטית בסיום. דורש הרשאת מיקרופון + HTTPS.",
          en: "Click the mic icon 🎤 and speak. Text appears in real-time and submits automatically when done. Requires mic permission + HTTPS.",
          ru: "Нажмите микрофон 🎤 и говорите. Текст появляется в реальном времени.",
          fr: "Cliquez sur le micro 🎤 et parlez. Le texte apparaît en temps réel.",
          es: "Haz clic en el micrófono 🎤 y habla. El texto aparece en tiempo real.",
        },
      },
      {
        title: { he: "תשובות קוליות (TTS)", en: "Voice replies (TTS)", ru: "Голосовые ответы", fr: "Réponses vocales", es: "Respuestas de voz" },
        body: {
          he: "העוזר מקריא בקול את תשובותיו בעברית. אם אינך שומע — בדוק שה-TTS מופעל בהגדרות העוזר (אייקון 🔊) ושהדפדפן תומך בקול עברי.",
          en: "The assistant reads its replies aloud in your language. If not hearing — check that TTS is enabled in the assistant settings (🔊 icon) and your browser has voice support.",
          ru: "Помощник читает ответы вслух. Проверьте настройки TTS.",
          fr: "L'assistant lit les réponses à haute voix. Vérifiez les paramètres TTS.",
          es: "El asistente lee las respuestas en voz alta. Verifica la configuración TTS.",
        },
      },
      {
        title: { he: "שאלות לדוגמה", en: "Example questions", ru: "Примеры вопросов", fr: "Exemples", es: "Ejemplos" },
        body: {
          he: "• \"הסבר לי על לוח גאנט\"\n• \"מה הסיכונים בפרויקט?\"\n• \"מי הכי עמוס?\"\n• \"פתח משימה חדשה\"\n• \"תן לי סיכום יומי\"\n• \"איך מגדירים KPI?\"",
          en: "• \"Explain the Gantt chart\"\n• \"What are the risks?\"\n• \"Who is most loaded?\"\n• \"Create a new task\"\n• \"Daily summary\"\n• \"How to set up KPI?\"",
          ru: "• \"Объясни Ганта\"\n• \"Какие риски?\"\n• \"Кто загружен?\"\n• \"Создай задачу\"",
          fr: "• \"Explique Gantt\"\n• \"Quels risques ?\"\n• \"Qui est chargé ?\"\n• \"Créer tâche\"",
          es: "• \"Explica Gantt\"\n• \"¿Qué riesgos?\"\n• \"¿Quién está cargado?\"\n• \"Crear tarea\"",
        },
      },
    ],
  },

  // ============================================================
  // ADVANCED KPIs (NEW)
  // ============================================================
  {
    id: "advanced-kpis",
    icon: "⭐",
    category: "projects",
    title: {
      he: "מדדי KPI מתקדמים",
      en: "Advanced KPIs",
      ru: "Расширенные KPI",
      fr: "KPIs Avancés",
      es: "KPIs Avanzados",
    },
    summary: {
      he: "7 מדדים מקצועיים מבוססי PMBOK, EVM, McKinsey, Bain ו-Gartner",
      en: "7 industry-standard metrics (PMBOK, EVM, McKinsey, Bain, Gartner)",
      ru: "7 профессиональных метрик (PMBOK, EVM, McKinsey)",
      fr: "7 métriques professionnelles (PMBOK, EVM, McKinsey)",
      es: "7 métricas profesionales (PMBOK, EVM, McKinsey)",
    },
    steps: [
      {
        title: { he: "CPI — יעילות עלות", en: "CPI — Cost Performance Index", ru: "CPI — Индекс эффективности затрат", fr: "CPI — Indice de performance des coûts", es: "CPI — Índice de desempeño del costo" },
        body: {
          he: "מקור: PMBOK® Guide, EVM Standard.\nנוסחה: EV/AC (ערך שהושג ÷ עלות בפועל).\nערך מעל 1.0 = מתחת לתקציב (טוב). מתחת ל-1.0 = חריגת תקציב.\nיעד ארגוני: ≥ 0.95.\nמיקום: דשבורד KPI → תצוגת מנהל פרויקט → אזור 'מדדי KPI מתקדמים'.",
          en: "Source: PMBOK® Guide, EVM Standard.\nFormula: EV/AC (Earned Value ÷ Actual Cost).\nValue >1.0 = under budget (good). <1.0 = over budget.\nTarget: ≥ 0.95.\nLocation: Dashboard → PM view → 'Advanced KPIs' section.",
          ru: "PMBOK/EVM. EV/AC. >1.0 = под бюджетом. Цель: ≥ 0.95.",
          fr: "PMBOK/EVM. EV/AC. >1.0 = sous budget. Cible : ≥ 0.95.",
          es: "PMBOK/EVM. EV/AC. >1.0 = bajo presupuesto. Meta: ≥ 0.95.",
        },
      },
      {
        title: { he: "SPI — יעילות לו\"ז", en: "SPI — Schedule Performance Index", ru: "SPI — Индекс производительности графика", fr: "SPI — Indice de performance du calendrier", es: "SPI — Índice de desempeño del cronograma" },
        body: {
          he: "מקור: PMBOK/EVM.\nנוסחה: EV/PV (ערך שהושג ÷ ערך מתוכנן).\nמעל 1.0 = לפני הלו\"ז, מתחת ל-1.0 = מפגרים.\nיעד: ≥ 0.95.\nיחד עם CPI, SPI נותן תמונה מלאה של בריאות הפרויקט.",
          en: "Source: PMBOK/EVM.\nFormula: EV/PV.\n>1.0 = ahead of schedule. <1.0 = behind.\nTarget: ≥ 0.95.\nTogether with CPI, gives a complete project health picture.",
          ru: "PMBOK/EVM. EV/PV. >1.0 = впереди графика. Цель: ≥ 0.95.",
          fr: "PMBOK/EVM. EV/PV. >1.0 = en avance. Cible : ≥ 0.95.",
          es: "PMBOK/EVM. EV/PV. >1.0 = adelantado. Meta: ≥ 0.95.",
        },
      },
      {
        title: { he: "Rework Rate — עבודה חוזרת", en: "Rework Rate", ru: "Rework Rate", fr: "Taux de retravail", es: "Tasa de retrabajo" },
        body: {
          he: "מקור: ISO 9001, Six Sigma.\nמחושב: אחוז משימות עם שעות בפועל > 150% מההערכה.\nRework גבוה מעיד על: הגדרות דרישות לקויות, לחץ זמן, חוסר תקשורת.\nיעד בריא: < 15%. מעל 30% = בעיה מערכתית שדורשת התערבות ניהולית.",
          en: "Source: ISO 9001, Six Sigma.\nCalculated: % of tasks with actual hours > 150% of estimate.\nHigh rework = poor requirements, time pressure, miscommunication.\nHealthy: < 15%. > 30% = systemic issue.",
          ru: "ISO 9001. % задач с часами > 150% оценки. Цель < 15%.",
          fr: "ISO 9001. % tâches avec heures > 150% de l'estimation. Cible < 15%.",
          es: "ISO 9001. % tareas con horas > 150% del estimado. Meta < 15%.",
        },
      },
      {
        title: { he: "Decision Latency — זמן החלטות", en: "Decision Latency", ru: "Decision Latency", fr: "Latence décisionnelle", es: "Latencia de decisión" },
        body: {
          he: "מקור: McKinsey Organizational Health Index 2023.\nמחושב: זמן ממוצע מהעלאת סיכון/נושא ועד החלטה סופית.\nארגונים זריזים: < 48 שעות. איטיים: > 72 שעות.\nמחקר McKinsey: ארגונים עם זמן החלטה קצר צומחים ב-30% יותר.",
          en: "Source: McKinsey OHI 2023.\nAvg hours from issue raised to decision made.\nAgile orgs: < 48h. Slow: > 72h.\nMcKinsey research: fast-decision orgs grow 30% more.",
          ru: "McKinsey. Среднее время от проблемы до решения. Цель < 48ч.",
          fr: "McKinsey. Temps moyen problème → décision. Cible < 48h.",
          es: "McKinsey. Tiempo promedio problema → decisión. Meta < 48h.",
        },
      },
      {
        title: { he: "Stakeholder NPS — שביעות רצון", en: "Stakeholder NPS", ru: "Stakeholder NPS", fr: "NPS parties prenantes", es: "NPS partes interesadas" },
        body: {
          he: "מקור: Bain & Company NPS Methodology.\nנוסחה: %מקדמים (9-10) − %מתנגדים (0-6).\nטווח: -100 עד +100. יעד: > +30. מעל +50 = מצוין.\nמדד ישיר של ערך הנתפס של PMO++ בקרב משתמשים — הלקוחות הפנימיים.",
          en: "Source: Bain & Company NPS.\nFormula: %Promoters (9-10) − %Detractors (0-6).\nRange: -100 to +100. Target: > +30. >+50 = excellent.\nDirect measure of PMO++'s perceived value by internal customers.",
          ru: "Bain. %Продвигающих − %Критиков. Цель > +30.",
          fr: "Bain. %Promoteurs − %Détracteurs. Cible > +30.",
          es: "Bain. %Promotores − %Detractores. Meta > +30.",
        },
      },
      {
        title: { he: "Burnout Risk — סיכון שחיקה", en: "Burnout Risk Index", ru: "Burnout Risk", fr: "Risque d'épuisement", es: "Riesgo de burnout" },
        body: {
          he: "מקור: Maslach Burnout Inventory (MBI).\nמחושב לפי: FTE > 90% (+40 נק'), משימות באיחור (+15-30), משימות חסומות (+10-20), משימות קריטיות (+10).\n0-30 = בריא, 30-60 = אזהרה, >60 = קריטי.\nשחיקה גורמת לאובדן 5-10% כוח אדם שנתי — מעקב פרואקטיבי מונע זאת.",
          en: "Source: Maslach Burnout Inventory.\nBased on: FTE > 90% (+40), overdue (+15-30), blocked (+10-20), critical (+10).\n0-30 = healthy, >60 = critical.\nBurnout causes 5-10% annual staff loss — proactive monitoring prevents it.",
          ru: "MBI. FTE + просрочки + блокировки + критичные = оценка.",
          fr: "MBI. FTE + retards + bloquées + critiques = score.",
          es: "MBI. FTE + retrasos + bloqueadas + críticas = puntuación.",
        },
      },
      {
        title: { he: "AI Adoption Rate", en: "AI Recommendation Adoption", ru: "AI Adoption Rate", fr: "Taux d'adoption IA", es: "Tasa de adopción de IA" },
        body: {
          he: "מקור: Gartner AI in Project Management 2024.\nמחושב: אחוז המלצות AI שאומצו ויושמו על ידי מנהלי הפרויקטים.\nיישום גבוה (>60%) = תרבות אימוץ טכנולוגי בריאה.\nנמוך = התנגדות או חוסר אמון ב-AI — דורש הדרכה.\nמדד קריטי בעידן הדיגיטלי.",
          en: "Source: Gartner 2024.\n% of AI recommendations adopted by PMs.\nHigh (>60%) = healthy tech adoption culture.\nLow = resistance or mistrust — needs training.\nCritical in digital era.",
          ru: "Gartner 2024. % принятых рекомендаций ИИ. Цель > 60%.",
          fr: "Gartner 2024. % recommandations IA adoptées. Cible > 60%.",
          es: "Gartner 2024. % recomendaciones IA adoptadas. Meta > 60%.",
        },
      },
    ],
  },

  // ============================================================
  // ADMIN
  // ============================================================
  {
    id: "admin",
    icon: "🛡️",
    category: "admin",
    title: {
      he: "ניהול מערכת",
      en: "System Administration",
      ru: "Администрирование",
      fr: "Administration",
      es: "Administración",
    },
    summary: {
      he: "ניהול משתמשים, הרשאות, תפקידים ויומן פעילות",
      en: "Manage users, permissions, roles and activity log",
      ru: "Управление пользователями, правами, ролями",
      fr: "Gérer utilisateurs, permissions, rôles",
      es: "Gestionar usuarios, permisos, roles",
    },
    steps: [
      {
        title: { he: "6 טאבים", en: "6 tabs", ru: "6 вкладок", fr: "6 onglets", es: "6 pestañas" },
        body: {
          he: "ניהול מערכת כולל 6 טאבים: משתמשים, תפקידים והרשאות, סוגי פריטים, שיוך היררכי, טבלת הרשאות, יומן פעילות. רק Admin יכול לגשת.",
          en: "Admin includes 6 tabs: Users, Roles & Permissions, Item Types, Hierarchy, Permissions Table, Activity Log. Only Admin can access.",
          ru: "Админ включает 6 вкладок. Доступ только для Admin.",
          fr: "Admin a 6 onglets. Accès Admin seulement.",
          es: "Admin tiene 6 pestañas. Solo Admin puede acceder.",
        },
      },
      {
        title: { he: "מטריצת הרשאות", en: "Permissions Matrix", ru: "Матрица разрешений", fr: "Matrice des permissions", es: "Matriz de permisos" },
        body: {
          he: "בטאב \"תפקידים והרשאות\" ניתן לשנות הרשאות על ידי לחיצה על תאים במטריצה. Admin תמיד מלא ולא ניתן לעריכה.",
          en: "In \"Roles & Permissions\" tab you can toggle permissions by clicking cells. Admin is always full and non-editable.",
          ru: "В \"Роли и разрешения\" нажимайте на ячейки. Admin нельзя редактировать.",
          fr: "Dans \"Rôles\", cliquez sur les cellules. Admin non modifiable.",
          es: "En \"Roles\" haz clic en celdas. Admin no editable.",
        },
      },
      {
        title: { he: "יומן פעילות", en: "Activity Log", ru: "Журнал активности", fr: "Journal d'activité", es: "Registro de actividad" },
        body: {
          he: "טאב \"יומן פעילות\" מציג שתי תצוגות: סיכום לפי משתמש (כניסות, פעולות) וציר זמן (30 פעולות אחרונות).",
          en: "\"Activity Log\" tab has two views: Per-User Summary (logins, actions) and Timeline (last 30 actions).",
          ru: "Журнал: по пользователю + хронология.",
          fr: "Journal : par utilisateur + chronologie.",
          es: "Registro: por usuario + cronología.",
        },
      },
    ],
  },
];

/** Get guide by ID */
export function getGuideById(id: string): UserGuide | undefined {
  return USER_GUIDES.find((g) => g.id === id);
}

/** Get all guides by category */
export function getGuidesByCategory(category: string): UserGuide[] {
  return USER_GUIDES.filter((g) => g.category === category);
}
