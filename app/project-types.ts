export type ProjectStatus = "planned" | "active" | "paused" | "done";
export type TaskStatus = "backlog" | "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type ProjectItemType =
  | "task"
  | "note"
  | "idea"
  | "decision"
  | "problem"
  | "risk"
  | "milestone"
  | "link";

export type ProjectStage = {
  id: string;
  name: string;
  color: string;
  done: boolean;
};

export type ProjectChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ProjectItem = {
  id: string;
  type: ProjectItemType;
  title: string;
  body: string;
  status: TaskStatus;
  priority: TaskPriority;
  stageId?: string;
  dueDate?: string;
  startDate?: string;
  tags: string[];
  checklist: ProjectChecklistItem[];
  estimateMinutes?: number;
  spentMinutes?: number;
  blockedReason?: string;
  dependsOn?: string;
  url?: string;
  archived?: boolean;
  createdAt: string;
  completedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  goal: string;
  accent: string;
  icon: "folder" | "code" | "book" | "plane" | "home" | "wallet" | "rocket" | "spark";
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  favorite: boolean;
  archived: boolean;
  stages: ProjectStage[];
  items: ProjectItem[];
  createdAt: string;
  updatedAt: string;
};

export type EnabledModules = {
  notes: boolean;
  projects: boolean;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  icon: Project["icon"];
  accent: string;
  stages: string[];
  starterItems: Array<Pick<ProjectItem, "type" | "title" | "body" | "status" | "priority">>;
};

export const projectTemplates: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Пустой проект",
    description: "Начните с чистого листа",
    icon: "folder",
    accent: "blue",
    stages: ["Подготовка", "Работа", "Завершение"],
    starterItems: [],
  },
  {
    id: "app",
    name: "Разработка приложения",
    description: "Идея, дизайн, разработка и релиз",
    icon: "code",
    accent: "purple",
    stages: ["Исследование", "Дизайн", "Разработка", "Тестирование", "Релиз"],
    starterItems: [
      { type: "task", title: "Сформулировать задачу продукта", body: "", status: "todo", priority: "high" },
      { type: "task", title: "Собрать первый прототип", body: "", status: "backlog", priority: "medium" },
      { type: "milestone", title: "Первая рабочая версия", body: "", status: "backlog", priority: "high" },
    ],
  },
  {
    id: "content",
    name: "Контент-план",
    description: "Темы, производство и публикация",
    icon: "spark",
    accent: "pink",
    stages: ["Идеи", "Черновики", "Редактура", "Публикация"],
    starterItems: [
      { type: "idea", title: "Собрать банк тем", body: "", status: "todo", priority: "medium" },
      { type: "task", title: "Определить ритм публикаций", body: "", status: "todo", priority: "medium" },
    ],
  },
  {
    id: "study",
    name: "Обучение",
    description: "Программа, практика и контроль прогресса",
    icon: "book",
    accent: "green",
    stages: ["План", "Изучение", "Практика", "Итог"],
    starterItems: [
      { type: "task", title: "Определить результат обучения", body: "", status: "todo", priority: "high" },
      { type: "task", title: "Составить программу", body: "", status: "backlog", priority: "medium" },
    ],
  },
  {
    id: "travel",
    name: "Путешествие",
    description: "Маршрут, бюджет и подготовка",
    icon: "plane",
    accent: "orange",
    stages: ["Идея", "Бронирование", "Подготовка", "Поездка"],
    starterItems: [
      { type: "task", title: "Определить бюджет", body: "", status: "todo", priority: "high" },
      { type: "task", title: "Собрать маршрут", body: "", status: "todo", priority: "medium" },
      { type: "risk", title: "Проверить документы и страховку", body: "", status: "backlog", priority: "high" },
    ],
  },
  {
    id: "renovation",
    name: "Ремонт",
    description: "Этапы, покупки и контроль расходов",
    icon: "home",
    accent: "amber",
    stages: ["План", "Подготовка", "Черновые работы", "Чистовые работы", "Приёмка"],
    starterItems: [
      { type: "task", title: "Составить смету", body: "", status: "todo", priority: "high" },
      { type: "decision", title: "Выбрать стиль и материалы", body: "", status: "backlog", priority: "medium" },
    ],
  },
  {
    id: "finance",
    name: "Финансовая цель",
    description: "Цель, план накоплений и контроль",
    icon: "wallet",
    accent: "green",
    stages: ["Цель", "План", "Накопление", "Результат"],
    starterItems: [
      { type: "task", title: "Указать сумму и срок", body: "", status: "todo", priority: "high" },
      { type: "risk", title: "Продумать резервный сценарий", body: "", status: "backlog", priority: "medium" },
    ],
  },
  {
    id: "launch",
    name: "Запуск продукта",
    description: "Подготовка, запуск и анализ",
    icon: "rocket",
    accent: "blue",
    stages: ["Подготовка", "Предзапуск", "Запуск", "Аналитика"],
    starterItems: [
      { type: "milestone", title: "Дата запуска", body: "", status: "backlog", priority: "high" },
      { type: "task", title: "Собрать чек-лист запуска", body: "", status: "todo", priority: "high" },
    ],
  },
];

export const emptyProjects: Project[] = [];

export function createProjectFromTemplate(
  template: ProjectTemplate,
  name: string,
  goal: string,
  dueDate?: string,
): Project {
  const stamp = new Date().toISOString();
  const projectId = `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const stages = template.stages.map((stage, index) => ({
    id: `${projectId}-stage-${index}`,
    name: stage,
    color: ["blue", "purple", "green", "orange", "pink"][index % 5],
    done: false,
  }));

  return {
    id: projectId,
    name: name.trim() || template.name,
    description: template.description,
    goal: goal.trim(),
    accent: template.accent,
    icon: template.icon,
    status: "active",
    dueDate: dueDate || undefined,
    favorite: false,
    archived: false,
    stages,
    items: template.starterItems.map((item, index) => ({
      ...item,
      id: `${projectId}-item-${index}`,
      tags: [],
      checklist: [],
      createdAt: stamp,
      stageId: stages[0]?.id,
    })),
    createdAt: stamp,
    updatedAt: stamp,
  };
}
