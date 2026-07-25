"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  Project,
  ProjectItem,
  ProjectItemType,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "./project-types";
import { createProjectFromTemplate, projectTemplates } from "./project-types";

type ProjectScreen = "projects" | "today" | "search";
type ProjectView = "overview" | "list" | "board" | "timeline" | "stats";
type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

type Props = {
  projects: Project[];
  onChange: (projects: Project[]) => void;
  onProfile: () => void;
  onNotes: () => void;
  notesEnabled: boolean;
  haptics: boolean;
  syncStatus: SyncStatus;
};

const iconPaths = {
  plus: ["M12 5v14", "M5 12h14"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  back: ["m15 18-6-6 6-6"],
  chevron: ["m9 18 6-6-6-6"],
  search: ["m21 21-4.35-4.35", "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  folder: ["M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"],
  code: ["m8 9-4 3 4 3", "m16 9 4 3-4 3", "m14 5-4 14"],
  book: ["M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z", "M4 5v17", "M8 7h8"],
  plane: ["M22 2 9 15l-6 1 4 2 2 4 1-6Z", "M9 15 13 2"],
  home: ["m3 11 9-8 9 8", "M5 10v11h14V10", "M9 21v-7h6v7"],
  wallet: ["M3 6a3 3 0 0 1 3-3h12v18H6a3 3 0 0 1-3-3Z", "M3 7h15", "M15 12h6v5h-6a2.5 2.5 0 0 1 0-5Z"],
  rocket: ["M14 4c4-3 7-2 7-2s1 3-2 7l-7 7-5-5Z", "m9 14-5 1 1-5", "m14 9 5 5-1 5", "M5 19c-2 0-3 2-3 3 1 0 3-1 3-3Z"],
  spark: ["m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z", "m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"],
  star: ["m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"],
  check: ["m5 12 4 4L19 6"],
  calendar: ["M6 2v4", "M18 2v4", "M3 9h18", "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"],
  list: ["M9 6h11", "M9 12h11", "M9 18h11", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
  board: ["M4 4h6v16H4Z", "M14 4h6v9h-6Z"],
  chart: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 14h10l1-14"],
  archive: ["M4 7h16", "M5 7v13h14V7", "M3 3h18v4H3Z", "M10 12h4"],
  flag: ["M5 21V4", "M5 5h12l-2 4 2 4H5"],
  bulb: ["M9 18h6", "M10 22h4", "M8.5 14.5a7 7 0 1 1 7 0c-1 .8-1.5 1.8-1.5 3.5h-4c0-1.7-.5-2.7-1.5-3.5Z"],
  note: ["M5 3h10l4 4v14H5Z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
  warning: ["M12 3 2 21h20Z", "M12 9v4", "M12 17h.01"],
  link: ["M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1", "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"],
  target: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v6l4 2"],
} as const;

type ProjectIconName = keyof typeof iconPaths;

function PIcon({ name, size = 22 }: { name: ProjectIconName; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name].map((path, index) => <path d={path} key={index} />)}
    </svg>
  );
}

const statusLabels: Record<TaskStatus, string> = {
  backlog: "План",
  todo: "Сделать",
  doing: "В работе",
  done: "Готово",
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  planned: "Запланирован",
  active: "Активный",
  paused: "На паузе",
  done: "Завершён",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

const typeLabels: Record<ProjectItemType, string> = {
  task: "Задача",
  note: "Заметка",
  idea: "Идея",
  decision: "Решение",
  problem: "Проблема",
  risk: "Риск",
  milestone: "Этап",
  link: "Ссылка",
};

const typeIcons: Record<ProjectItemType, ProjectIconName> = {
  task: "check",
  note: "note",
  idea: "bulb",
  decision: "target",
  problem: "warning",
  risk: "flag",
  milestone: "star",
  link: "link",
};

function localDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function pulse(haptics: boolean, pattern: number | number[] = 12) {
  if (haptics && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

function freshItem(type: ProjectItemType): ProjectItem {
  return {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: "",
    body: "",
    status: type === "note" || type === "idea" ? "backlog" : "todo",
    priority: "medium",
    tags: [],
    checklist: [],
    createdAt: new Date().toISOString(),
  };
}

export default function ProjectModule({ projects, onChange, onProfile, onNotes, notesEnabled, haptics, syncStatus }: Props) {
  const [screen, setScreen] = useState<ProjectScreen>("projects");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectView, setProjectView] = useState<ProjectView>("overview");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<"active" | "favorite" | "archived">("active");
  const [taskFilter, setTaskFilter] = useState<"all" | TaskStatus>("all");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(projectTemplates[0]);
  const [projectName, setProjectName] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectDue, setProjectDue] = useState("");
  const [itemDraft, setItemDraft] = useState<ProjectItem | null>(null);
  const [projectEdit, setProjectEdit] = useState<{
    name: string;
    goal: string;
    description: string;
    status: ProjectStatus;
    dueDate: string;
    stages: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "project" | "item"; id: string; label: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeProject = projects.find((project) => project.id === activeId);
  const visibleProjects = useMemo(() => projects
    .filter((project) => projectFilter === "archived" ? project.archived : !project.archived)
    .filter((project) => projectFilter !== "favorite" || project.favorite)
    .filter((project) => {
      const normalized = query.trim().toLowerCase();
      return !normalized || `${project.name} ${project.description} ${project.goal}`.toLowerCase().includes(normalized);
    })
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt)), [projectFilter, projects, query]);

  const allTasks = useMemo(() => projects.flatMap((project) =>
    project.items
      .filter((item) => !item.archived && item.type === "task")
      .map((item) => ({ item, project })),
  ), [projects]);

  const todayTasks = allTasks
    .filter(({ item }) => item.status !== "done" && item.dueDate && item.dueDate <= dateKey())
    .sort((a, b) => (a.item.dueDate || "").localeCompare(b.item.dueDate || ""));

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return projects.flatMap((project) => project.items
      .filter((item) => !item.archived && `${item.title} ${item.body} ${item.tags.join(" ")}`.toLowerCase().includes(normalized))
      .map((item) => ({ item, project })));
  }, [projects, query]);

  const updateProject = (id: string, updater: (project: Project) => Project) => {
    onChange(projects.map((project) => project.id === id
      ? { ...updater(project), updatedAt: new Date().toISOString() }
      : project));
  };

  const setItemStatus = (projectId: string, itemId: string, status: TaskStatus) => {
    updateProject(projectId, (project) => ({
      ...project,
      items: project.items.map((item) => item.id === itemId
        ? { ...item, status, completedAt: status === "done" ? new Date().toISOString() : undefined }
        : item),
    }));
    pulse(haptics, status === "done" ? [12, 35, 18] : 10);
  };

  const saveProject = (event: FormEvent) => {
    event.preventDefault();
    const next = createProjectFromTemplate(selectedTemplate, projectName, projectGoal, projectDue);
    onChange([next, ...projects]);
    setTemplateOpen(false);
    setProjectName("");
    setProjectGoal("");
    setProjectDue("");
    setSelectedTemplate(projectTemplates[0]);
    setActiveId(next.id);
    setProjectView("overview");
    pulse(haptics, [12, 30, 12]);
  };

  const saveItem = (event: FormEvent) => {
    event.preventDefault();
    if (!activeProject || !itemDraft || !itemDraft.title.trim()) return;
    updateProject(activeProject.id, (project) => ({
      ...project,
      items: project.items.some((item) => item.id === itemDraft.id)
        ? project.items.map((item) => item.id === itemDraft.id ? { ...itemDraft, title: itemDraft.title.trim(), body: itemDraft.body.trim() } : item)
        : [{ ...itemDraft, title: itemDraft.title.trim(), body: itemDraft.body.trim(), stageId: itemDraft.stageId || project.stages[0]?.id }, ...project.items],
    }));
    setItemDraft(null);
    pulse(haptics);
  };

  const saveProjectEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeProject || !projectEdit?.name.trim()) return;
    const stageNames = projectEdit.stages.split("\n").map((value) => value.trim()).filter(Boolean);
    updateProject(activeProject.id, (project) => ({
      ...project,
      name: projectEdit.name.trim(),
      goal: projectEdit.goal.trim(),
      description: projectEdit.description.trim(),
      status: projectEdit.status,
      dueDate: projectEdit.dueDate || undefined,
      stages: stageNames.map((name, index) => project.stages[index]
        ? { ...project.stages[index], name }
        : { id: `${project.id}-stage-${Date.now()}-${index}`, name, color: ["blue", "purple", "green", "orange", "pink"][index % 5], done: false }),
    }));
    setProjectEdit(null);
    pulse(haptics);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === "project") {
      onChange(projects.filter((project) => project.id !== confirmDelete.id));
      setActiveId(null);
    } else if (activeProject) {
      updateProject(activeProject.id, (project) => ({
        ...project,
        items: project.items.filter((item) => item.id !== confirmDelete.id),
      }));
    }
    setConfirmDelete(null);
    pulse(haptics, 24);
  };

  if (activeProject) {
    return (
      <main className="screen project-detail-screen">
        <header className="project-detail-header">
          <button className="project-back" aria-label="Назад к проектам" onClick={() => { setActiveId(null); setMenuOpen(false); }}>
            <PIcon name="back" />
          </button>
          <div className={`project-symbol ${activeProject.accent}`}><PIcon name={activeProject.icon} size={24} /></div>
          <div className="project-title-copy">
            <span>{projectStatusLabels[activeProject.status]}</span>
            <h1>{activeProject.name}</h1>
          </div>
          <button className="project-more" aria-label="Настройки проекта" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <PIcon name="more" />
          </button>
          {menuOpen && (
            <div className="project-menu">
              <button onClick={() => {
                setProjectEdit({
                  name: activeProject.name,
                  goal: activeProject.goal,
                  description: activeProject.description,
                  status: activeProject.status,
                  dueDate: activeProject.dueDate || "",
                  stages: activeProject.stages.map((stage) => stage.name).join("\n"),
                });
                setMenuOpen(false);
              }}><PIcon name="note" size={19} />Редактировать</button>
              <button onClick={() => {
                updateProject(activeProject.id, (project) => ({ ...project, favorite: !project.favorite }));
                setMenuOpen(false);
              }}><PIcon name="star" size={19} />{activeProject.favorite ? "Убрать из избранного" : "В избранное"}</button>
              <button onClick={() => {
                updateProject(activeProject.id, (project) => ({ ...project, archived: !project.archived }));
                setActiveId(null);
              }}><PIcon name="archive" size={19} />{activeProject.archived ? "Вернуть из архива" : "В архив"}</button>
              <button className="danger" onClick={() => {
                setConfirmDelete({ kind: "project", id: activeProject.id, label: activeProject.name });
                setMenuOpen(false);
              }}><PIcon name="trash" size={19} />Удалить</button>
            </div>
          )}
        </header>

        <nav className="project-view-tabs" aria-label="Представление проекта">
          {([
            ["overview", "Обзор", "target"],
            ["list", "Список", "list"],
            ["board", "Доска", "board"],
            ["timeline", "Сроки", "calendar"],
            ["stats", "Итоги", "chart"],
          ] as Array<[ProjectView, string, ProjectIconName]>).map(([value, label, icon]) => (
            <button key={value} className={projectView === value ? "active" : ""} aria-current={projectView === value ? "page" : undefined} onClick={() => setProjectView(value)}>
              <PIcon name={icon} size={19} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <ProjectViewContent
          project={activeProject}
          view={projectView}
          filter={taskFilter}
          setFilter={setTaskFilter}
          onEdit={setItemDraft}
          onStatus={(itemId, status) => setItemStatus(activeProject.id, itemId, status)}
        />

        <button className="project-fab" aria-label="Добавить в проект" onClick={() => setItemDraft(freshItem("task"))}>
          <PIcon name="plus" size={27} />
        </button>

        {itemDraft && (
          <ItemSheet
            draft={itemDraft}
            project={activeProject}
            onChange={setItemDraft}
            onClose={() => setItemDraft(null)}
            onSave={saveItem}
            onDelete={activeProject.items.some((item) => item.id === itemDraft.id)
              ? () => {
                  setConfirmDelete({ kind: "item", id: itemDraft.id, label: itemDraft.title });
                  setItemDraft(null);
                }
              : undefined}
          />
        )}

        {projectEdit && (
          <div className="project-sheet-layer" role="presentation">
            <form className="project-sheet item-editor-sheet" onSubmit={saveProjectEdit}>
              <div className="sheet-grabber" />
              <div className="project-sheet-header">
                <button type="button" onClick={() => setProjectEdit(null)}>Отмена</button>
                <strong>Настройки проекта</strong>
                <button type="submit" disabled={!projectEdit.name.trim()}>Готово</button>
              </div>
              <div className="project-sheet-scroll">
                <label className="project-field"><span>Название</span><input autoFocus value={projectEdit.name} onChange={(event) => setProjectEdit({ ...projectEdit, name: event.target.value })} /></label>
                <label className="project-field"><span>Цель</span><textarea value={projectEdit.goal} onChange={(event) => setProjectEdit({ ...projectEdit, goal: event.target.value })} placeholder="Какой результат должен получиться?" /></label>
                <label className="project-field"><span>Описание</span><textarea value={projectEdit.description} onChange={(event) => setProjectEdit({ ...projectEdit, description: event.target.value })} /></label>
                <div className="project-field-grid">
                  <label className="project-field"><span>Статус</span><select value={projectEdit.status} onChange={(event) => setProjectEdit({ ...projectEdit, status: event.target.value as ProjectStatus })}>{Object.entries(projectStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label className="project-field"><span>Срок</span><input type="date" value={projectEdit.dueDate} onChange={(event) => setProjectEdit({ ...projectEdit, dueDate: event.target.value })} /></label>
                </div>
                <label className="project-field"><span>Этапы · по одному на строку</span><textarea value={projectEdit.stages} onChange={(event) => setProjectEdit({ ...projectEdit, stages: event.target.value })} /></label>
              </div>
            </form>
          </div>
        )}

        {confirmDelete && <ConfirmDialog label={confirmDelete.label} onCancel={() => setConfirmDelete(null)} onConfirm={executeDelete} />}
      </main>
    );
  }

  return (
    <main className="screen projects-screen">
      <header className="projects-header">
        <div>
          <p className="eyebrow">Личное пространство</p>
          <h1>{screen === "today" ? "Сегодня" : screen === "search" ? "Поиск" : "Проекты"}</h1>
          <p className="projects-subtitle">
            {screen === "today" ? "Главные задачи на текущий день" : screen === "search" ? "Найдите задачу, решение или заметку" : "От идеи до результата — в одном месте"}
          </p>
        </div>
        <div className="header-actions">
          {screen === "projects" && <button className="round-button" aria-label="Создать проект" onClick={() => setTemplateOpen(true)}><PIcon name="plus" size={27} /></button>}
          <button className="round-button" aria-label="Открыть профиль" onClick={onProfile}><PIcon name="user" size={26} /></button>
        </div>
      </header>

      {notesEnabled && (
        <div className="module-switcher" role="tablist" aria-label="Модули приложения">
          <button role="tab" aria-selected="false" onClick={onNotes}><PIcon name="note" size={18} />Заметки</button>
          <button className="active" role="tab" aria-selected="true"><PIcon name="folder" size={18} />Проекты</button>
        </div>
      )}

      <div className={`cloud-status ${syncStatus}`}>
        <span />
        {syncStatus === "saving" ? "Сохраняем изменения…" : syncStatus === "offline" ? "Офлайн · синхронизируем позже" : syncStatus === "error" ? "Не удалось синхронизировать" : "Все данные синхронизированы"}
      </div>

      {screen === "projects" && (
        <>
          <div className="project-search">
            <PIcon name="search" size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти проект" aria-label="Найти проект" />
          </div>
          <div className="filter-chips" role="group" aria-label="Фильтр проектов">
            <button className={projectFilter === "active" ? "active" : ""} onClick={() => setProjectFilter("active")}>Активные</button>
            <button className={projectFilter === "favorite" ? "active" : ""} onClick={() => setProjectFilter("favorite")}>Избранные</button>
            <button className={projectFilter === "archived" ? "active" : ""} onClick={() => setProjectFilter("archived")}>Архив</button>
          </div>
          {visibleProjects.length ? (
            <div className="projects-grid">
              {visibleProjects.map((project) => <ProjectCard project={project} key={project.id} onOpen={() => { setActiveId(project.id); setProjectView("overview"); }} />)}
            </div>
          ) : (
            <ProjectEmpty archived={projectFilter === "archived"} onCreate={() => setTemplateOpen(true)} />
          )}
        </>
      )}

      {screen === "today" && (
        <section className="today-projects">
          <div className="today-summary">
            <span><strong>{todayTasks.length}</strong> требуют внимания</span>
            <span><strong>{allTasks.filter(({ item }) => item.status === "done" && item.completedAt?.slice(0, 10) === dateKey()).length}</strong> завершено сегодня</span>
          </div>
          {todayTasks.length ? todayTasks.map(({ item, project }) => (
            <TaskRow key={item.id} item={item} project={project} onOpen={() => { setActiveId(project.id); setItemDraft(item); }} onStatus={(status) => setItemStatus(project.id, item.id, status)} />
          )) : (
            <div className="project-empty compact">
              <span className="project-empty-icon"><PIcon name="check" size={30} /></span>
              <h2>На сегодня всё спокойно</h2>
              <p>Задачи с истёкшим или сегодняшним сроком появятся здесь.</p>
            </div>
          )}
        </section>
      )}

      {screen === "search" && (
        <section>
          <div className="project-search large">
            <PIcon name="search" size={21} />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Задачи, заметки, теги…" aria-label="Поиск по проектам" />
          </div>
          {query.trim() && (
            <p className="search-count">{searchResults.length ? `Найдено: ${searchResults.length}` : "Ничего не найдено"}</p>
          )}
          <div className="search-results">
            {searchResults.map(({ item, project }) => (
              <button key={item.id} className="search-result" onClick={() => { setActiveId(project.id); setItemDraft(item); }}>
                <span className={`type-icon ${item.type}`}><PIcon name={typeIcons[item.type]} size={19} /></span>
                <span><strong>{item.title}</strong><small>{project.name} · {typeLabels[item.type]}</small></span>
                <PIcon name="chevron" size={19} />
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className="project-local-nav" aria-label="Разделы проектов">
        <button className={screen === "projects" ? "active" : ""} onClick={() => setScreen("projects")}><PIcon name="folder" size={21} /><span>Проекты</span></button>
        <button className={screen === "today" ? "active" : ""} onClick={() => setScreen("today")}><PIcon name="calendar" size={21} /><span>Сегодня</span>{todayTasks.length > 0 && <b>{todayTasks.length}</b>}</button>
        <button className={screen === "search" ? "active" : ""} onClick={() => setScreen("search")}><PIcon name="search" size={21} /><span>Поиск</span></button>
      </nav>

      {templateOpen && (
        <div className="project-sheet-layer" role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) setTemplateOpen(false);
        }}>
          <form className="project-sheet" onSubmit={saveProject}>
            <div className="sheet-grabber" />
            <div className="project-sheet-header">
              <button type="button" onClick={() => setTemplateOpen(false)}>Отмена</button>
              <strong>Новый проект</strong>
              <button type="submit" disabled={!projectName.trim()}>Создать</button>
            </div>
            <div className="project-sheet-scroll">
              <label className="project-field"><span>Название</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Например, новое приложение" /></label>
              <label className="project-field"><span>Главная цель</span><textarea value={projectGoal} onChange={(event) => setProjectGoal(event.target.value)} placeholder="Какой результат должен получиться?" /></label>
              <label className="project-field"><span>Желаемый срок</span><input type="date" value={projectDue} onChange={(event) => setProjectDue(event.target.value)} /></label>
              <fieldset className="template-picker">
                <legend>Шаблон</legend>
                <div>
                  {projectTemplates.map((template) => (
                    <button type="button" key={template.id} className={selectedTemplate.id === template.id ? "selected" : ""} onClick={() => setSelectedTemplate(template)}>
                      <span className={`project-symbol ${template.accent}`}><PIcon name={template.icon} size={21} /></span>
                      <span><strong>{template.name}</strong><small>{template.description}</small></span>
                      {selectedTemplate.id === template.id && <PIcon name="check" size={19} />}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const tasks = project.items.filter((item) => item.type === "task" && !item.archived);
  const done = tasks.filter((item) => item.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : project.status === "done" ? 100 : 0;
  const next = tasks
    .filter((item) => item.status !== "done" && item.dueDate)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];

  return (
    <button className="project-card" onClick={onOpen}>
      <span className={`project-symbol ${project.accent}`}><PIcon name={project.icon} size={24} /></span>
      <span className="project-card-main">
        <span className="project-card-title"><strong>{project.name}</strong>{project.favorite && <PIcon name="star" size={16} />}</span>
        <span className="project-card-description">{project.goal || project.description}</span>
        <span className="project-progress"><i><b style={{ width: `${progress}%` }} /></i><small>{progress}%</small></span>
        <span className="project-card-meta">
          <small>{done} из {tasks.length} задач</small>
          {next?.dueDate && <small className={next.dueDate < dateKey() ? "overdue" : ""}><PIcon name="clock" size={14} />{localDate(next.dueDate)}</small>}
        </span>
      </span>
      <PIcon name="chevron" size={20} />
    </button>
  );
}

function ProjectEmpty({ archived, onCreate }: { archived: boolean; onCreate: () => void }) {
  return (
    <div className="project-empty">
      <span className="project-empty-icon"><PIcon name={archived ? "archive" : "rocket"} size={31} /></span>
      <h2>{archived ? "Архив проектов пуст" : "Создайте первый проект"}</h2>
      <p>{archived ? "Завершённые и отложенные проекты можно хранить здесь." : "Выберите готовый шаблон или начните с чистого листа. Этапы и стартовые задачи появятся автоматически."}</p>
      {!archived && <button onClick={onCreate}><PIcon name="plus" size={19} />Создать проект</button>}
    </div>
  );
}

function ProjectViewContent({
  project,
  view,
  filter,
  setFilter,
  onEdit,
  onStatus,
}: {
  project: Project;
  view: ProjectView;
  filter: "all" | TaskStatus;
  setFilter: (filter: "all" | TaskStatus) => void;
  onEdit: (item: ProjectItem) => void;
  onStatus: (id: string, status: TaskStatus) => void;
}) {
  const activeItems = project.items.filter((item) => !item.archived);
  const tasks = activeItems.filter((item) => item.type === "task");
  const done = tasks.filter((item) => item.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const overdue = tasks.filter((item) => item.status !== "done" && item.dueDate && item.dueDate < dateKey()).length;
  const upcoming = tasks.filter((item) => item.status !== "done" && item.dueDate).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];

  if (view === "overview") {
    return (
      <div className="project-overview">
        <section className="project-hero-card">
          <p>Цель проекта</p>
          <h2>{project.goal || "Добавьте цель, чтобы не терять направление"}</h2>
          <div className="hero-progress"><span><b>{progress}%</b> выполнено</span><i><b style={{ width: `${progress}%` }} /></i></div>
        </section>
        <div className="metric-grid">
          <div><span>Открыто</span><strong>{tasks.length - done}</strong><small>задач</small></div>
          <div><span>Просрочено</span><strong className={overdue ? "danger-text" : ""}>{overdue}</strong><small>требуют внимания</small></div>
          <div><span>Ближайший срок</span><strong className="metric-date">{upcoming?.dueDate ? localDate(upcoming.dueDate) : "—"}</strong><small>{upcoming?.title || "не назначен"}</small></div>
          <div><span>Материалы</span><strong>{activeItems.length - tasks.length}</strong><small>записей</small></div>
        </div>
        <section className="stage-section">
          <div className="section-line"><h2>Этапы</h2><span>{project.stages.filter((stage) => stage.done).length}/{project.stages.length}</span></div>
          <div className="stages-track">
            {project.stages.map((stage, index) => {
              const stageTasks = tasks.filter((item) => item.stageId === stage.id);
              const stageDone = stageTasks.filter((item) => item.status === "done").length;
              return (
                <div className={`stage-card ${stage.done ? "done" : ""}`} key={stage.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{stage.name}</strong>
                  <small>{stageTasks.length ? `${stageDone}/${stageTasks.length} задач` : "Пока без задач"}</small>
                </div>
              );
            })}
          </div>
        </section>
        <section className="next-actions">
          <div className="section-line"><h2>Следующие действия</h2></div>
          {tasks.filter((item) => item.status !== "done").slice(0, 4).map((item) => (
            <TaskRow key={item.id} item={item} project={project} onOpen={() => onEdit(item)} onStatus={(status) => onStatus(item.id, status)} />
          ))}
          {!tasks.some((item) => item.status !== "done") && <p className="inline-empty">Добавьте первую задачу — она появится здесь.</p>}
        </section>
      </div>
    );
  }

  if (view === "list") {
    const shown = activeItems.filter((item) => filter === "all" || item.status === filter);
    return (
      <section className="project-list-view">
        <div className="filter-chips scrollable">
          {(["all", "backlog", "todo", "doing", "done"] as const).map((value) => (
            <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "Все" : statusLabels[value]}</button>
          ))}
        </div>
        <div className="project-items-list">
          {shown.map((item) => (
            <article className="project-item-row" key={item.id}>
              <button className={`task-check ${item.status === "done" ? "done" : ""}`} aria-label={item.status === "done" ? "Вернуть задачу" : "Завершить"} onClick={() => onStatus(item.id, item.status === "done" ? "todo" : "done")}>
                {item.status === "done" && <PIcon name="check" size={16} />}
              </button>
              <button className="project-item-copy" onClick={() => onEdit(item)}>
                <span><strong>{item.title}</strong><small>{typeLabels[item.type]}{item.dueDate ? ` · ${localDate(item.dueDate)}` : ""}</small></span>
                <span className={`priority-dot ${item.priority}`} aria-label={`Приоритет: ${priorityLabels[item.priority]}`} />
              </button>
            </article>
          ))}
          {!shown.length && <p className="inline-empty">Здесь пока ничего нет.</p>}
        </div>
      </section>
    );
  }

  if (view === "board") {
    return (
      <div className="kanban-board">
        {(["backlog", "todo", "doing", "done"] as TaskStatus[]).map((status) => {
          const columnItems = tasks.filter((item) => item.status === status);
          return (
            <section className={`kanban-column ${status}`} key={status}>
              <header><strong>{statusLabels[status]}</strong><span>{columnItems.length}</span></header>
              <div>
                {columnItems.map((item) => (
                  <article className="kanban-card" key={item.id}>
                    <button className="kanban-main" onClick={() => onEdit(item)}>
                      <span className={`priority-label ${item.priority}`}>{priorityLabels[item.priority]}</span>
                      <strong>{item.title}</strong>
                      {item.dueDate && <small className={item.dueDate < dateKey() && status !== "done" ? "overdue" : ""}><PIcon name="calendar" size={14} />{localDate(item.dueDate)}</small>}
                    </button>
                    <div className="status-stepper">
                      {status !== "backlog" && <button aria-label="Переместить назад" onClick={() => onStatus(item.id, (["backlog", "todo", "doing", "done"] as TaskStatus[])[(["backlog", "todo", "doing", "done"] as TaskStatus[]).indexOf(status) - 1])}><PIcon name="back" size={17} /></button>}
                      {status !== "done" && <button aria-label="Переместить вперёд" onClick={() => onStatus(item.id, (["backlog", "todo", "doing", "done"] as TaskStatus[])[(["backlog", "todo", "doing", "done"] as TaskStatus[]).indexOf(status) + 1])}><PIcon name="chevron" size={17} /></button>}
                    </div>
                  </article>
                ))}
                {!columnItems.length && <span className="kanban-empty">Пока пусто</span>}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  if (view === "timeline") {
    const dated = activeItems.filter((item) => item.dueDate).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    return (
      <section className="timeline-view">
        <div className="timeline-head">
          <div><span>Начало</span><strong>{project.startDate ? localDate(project.startDate) : "Не указано"}</strong></div>
          <i />
          <div><span>Срок проекта</span><strong>{project.dueDate ? localDate(project.dueDate) : "Не указан"}</strong></div>
        </div>
        <div className="timeline-list">
          {dated.map((item) => (
            <button key={item.id} className={item.status === "done" ? "done" : ""} onClick={() => onEdit(item)}>
              <time dateTime={item.dueDate}>{localDate(item.dueDate)}</time>
              <span><i /><strong>{item.title}</strong><small>{typeLabels[item.type]} · {statusLabels[item.status]}</small></span>
            </button>
          ))}
          {!dated.length && <p className="inline-empty">Назначьте сроки задачам и этапам — здесь появится хронология.</p>}
        </div>
      </section>
    );
  }

  const statusCounts = (["backlog", "todo", "doing", "done"] as TaskStatus[]).map((status) => ({
    status,
    count: tasks.filter((item) => item.status === status).length,
  }));
  const maxCount = Math.max(1, ...statusCounts.map((item) => item.count));
  const checklist = activeItems.flatMap((item) => item.checklist);
  const checklistDone = checklist.filter((item) => item.done).length;
  return (
    <section className="stats-view">
      <div className="stats-highlight">
        <span className="stats-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><strong>{progress}%</strong></span>
        <div><h2>{done === tasks.length && tasks.length ? "Проект готов" : "Проект движется"}</h2><p>{done} из {tasks.length} задач завершено</p></div>
      </div>
      <div className="status-chart" role="img" aria-label={`Распределение задач: ${statusCounts.map(({ status, count }) => `${statusLabels[status]} ${count}`).join(", ")}`}>
        {statusCounts.map(({ status, count }) => (
          <div key={status}><span>{statusLabels[status]}</span><i><b className={status} style={{ width: `${(count / maxCount) * 100}%` }} /></i><strong>{count}</strong></div>
        ))}
      </div>
      <div className="stats-cards">
        <div><span>Чек-листы</span><strong>{checklistDone}/{checklist.length}</strong></div>
        <div><span>Просрочено</span><strong>{overdue}</strong></div>
        <div><span>Решений</span><strong>{activeItems.filter((item) => item.type === "decision").length}</strong></div>
        <div><span>Рисков</span><strong>{activeItems.filter((item) => item.type === "risk").length}</strong></div>
      </div>
    </section>
  );
}

function TaskRow({ item, project, onOpen, onStatus }: { item: ProjectItem; project: Project; onOpen: () => void; onStatus: (status: TaskStatus) => void }) {
  return (
    <article className="today-task">
      <button className={`task-check ${item.status === "done" ? "done" : ""}`} aria-label={item.status === "done" ? "Вернуть задачу" : "Завершить"} onClick={() => onStatus(item.status === "done" ? "todo" : "done")}>
        {item.status === "done" && <PIcon name="check" size={16} />}
      </button>
      <button onClick={onOpen}>
        <strong>{item.title}</strong>
        <span>{project.name}{item.dueDate ? ` · ${item.dueDate < dateKey() ? "Просрочено " : ""}${localDate(item.dueDate)}` : ""}</span>
      </button>
      <span className={`priority-dot ${item.priority}`} aria-label={`Приоритет: ${priorityLabels[item.priority]}`} />
    </article>
  );
}

function ItemSheet({
  draft,
  project,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  draft: ProjectItem;
  project: Project;
  onChange: (item: ProjectItem) => void;
  onClose: () => void;
  onSave: (event: FormEvent) => void;
  onDelete?: () => void;
}) {
  const set = <K extends keyof ProjectItem>(key: K, value: ProjectItem[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="project-sheet-layer" role="presentation">
      <form className="project-sheet item-editor-sheet" onSubmit={onSave}>
        <div className="sheet-grabber" />
        <div className="project-sheet-header">
          <button type="button" onClick={onClose}>Отмена</button>
          <strong>{typeLabels[draft.type]}</strong>
          <button type="submit" disabled={!draft.title.trim()}>Готово</button>
        </div>
        <div className="project-sheet-scroll">
          <fieldset className="type-picker">
            <legend>Тип записи</legend>
            <div>{(Object.keys(typeLabels) as ProjectItemType[]).map((type) => (
              <button type="button" key={type} className={draft.type === type ? "selected" : ""} onClick={() => set("type", type)}>
                <PIcon name={typeIcons[type]} size={18} />{typeLabels[type]}
              </button>
            ))}</div>
          </fieldset>
          <label className="project-field"><span>Название</span><input autoFocus value={draft.title} onChange={(event) => set("title", event.target.value)} placeholder="Что нужно сделать или сохранить?" /></label>
          <label className="project-field"><span>Описание</span><textarea value={draft.body} onChange={(event) => set("body", event.target.value)} placeholder="Детали, контекст, результат…" /></label>
          <div className="project-field-grid">
            <label className="project-field"><span>Статус</span><select value={draft.status} onChange={(event) => set("status", event.target.value as TaskStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="project-field"><span>Приоритет</span><select value={draft.priority} onChange={(event) => set("priority", event.target.value as TaskPriority)}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          </div>
          <div className="project-field-grid">
            <label className="project-field"><span>Начало</span><input type="date" value={draft.startDate || ""} onChange={(event) => set("startDate", event.target.value || undefined)} /></label>
            <label className="project-field"><span>Срок</span><input type="date" value={draft.dueDate || ""} onChange={(event) => set("dueDate", event.target.value || undefined)} /></label>
          </div>
          <label className="project-field"><span>Этап</span><select value={draft.stageId || ""} onChange={(event) => set("stageId", event.target.value || undefined)}><option value="">Без этапа</option>{project.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
          <label className="project-field"><span>Теги</span><input value={draft.tags.join(", ")} onChange={(event) => set("tags", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} placeholder="дизайн, релиз, важно" /></label>
          {draft.type === "link" && <label className="project-field"><span>Ссылка</span><input type="url" value={draft.url || ""} onChange={(event) => set("url", event.target.value)} placeholder="https://…" /></label>}
          {draft.type === "task" && (
            <>
              <label className="project-field"><span>Чек-лист</span><textarea value={draft.checklist.map((item) => item.text).join("\n")} onChange={(event) => set("checklist", event.target.value.split("\n").filter(Boolean).map((text, index) => ({ id: draft.checklist[index]?.id || `check-${Date.now()}-${index}`, text, done: draft.checklist[index]?.done || false })))} placeholder={"Один пункт на строку\nПроверить детали\nПодготовить результат"} /></label>
              <label className="project-field"><span>Блокирует работу</span><input value={draft.blockedReason || ""} onChange={(event) => set("blockedReason", event.target.value || undefined)} placeholder="Оставьте пустым, если блокировок нет" /></label>
            </>
          )}
          {onDelete && <button type="button" className="project-delete-button" onClick={onDelete}><PIcon name="trash" size={19} />Удалить запись</button>}
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="project-confirm-layer" role="alertdialog" aria-modal="true" aria-labelledby="project-confirm-title">
      <div className="project-confirm">
        <span><PIcon name="trash" size={25} /></span>
        <h2 id="project-confirm-title">Удалить «{label || "эту запись"}»?</h2>
        <p>Это действие нельзя отменить.</p>
        <div><button onClick={onCancel}>Отмена</button><button className="danger" onClick={onConfirm}>Удалить</button></div>
      </div>
    </div>
  );
}
