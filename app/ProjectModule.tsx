"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useRef,
  useState,
} from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  BoardColumn,
  BoardTask,
  Project,
  ProjectDocument,
  ProjectNote,
} from "./project-types";
import { createProjectFromTemplate, projectTemplates } from "./project-types";

type Props = {
  projects: Project[];
  onChange: (projects: Project[]) => void;
  onProfile: () => void;
  onNotes: () => void;
  notesEnabled: boolean;
  haptics: boolean;
};

type ProjectTab = "board" | "notes" | "documents";
type ConfirmTarget =
  | { kind: "project"; projectId: string; label: string }
  | { kind: "column"; projectId: string; columnId: string; label: string }
  | { kind: "task"; projectId: string; columnId: string; taskId: string; label: string }
  | { kind: "note"; projectId: string; noteId: string; label: string }
  | { kind: "document"; projectId: string; documentId: string; label: string };

const paths = {
  plus: ["M12 5v14", "M5 12h14"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  back: ["m15 18-6-6 6-6"],
  chevron: ["m9 18 6-6-6-6"],
  down: ["m6 9 6 6 6-6"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  search: ["m21 21-4.35-4.35", "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  folder: ["M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"],
  folderPlus: ["M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "M12 10v6", "M9 13h6"],
  page: ["M5 3h10l4 4v14H5Z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
  board: ["M4 4h6v16H4Z", "M14 4h6v9h-6Z"],
  note: ["M5 3h10l4 4v14H5Z", "M15 3v5h5", "M8 13h8"],
  check: ["m5 12 4 4L19 6"],
  grip: ["M8 7h.01", "M16 7h.01", "M8 12h.01", "M16 12h.01", "M8 17h.01", "M16 17h.01"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 14h10l1-14"],
  edit: ["M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z", "m14.5 7.5 3 3"],
  star: ["m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"],
  code: ["m8 9-4 3 4 3", "m16 9 4 3-4 3", "m14 5-4 14"],
  book: ["M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z", "M4 5v17", "M8 7h8"],
  plane: ["M22 2 9 15l-6 1 4 2 2 4 1-6Z", "M9 15 13 2"],
  home: ["m3 11 9-8 9 8", "M5 10v11h14V10", "M9 21v-7h6v7"],
  wallet: ["M3 6a3 3 0 0 1 3-3h12v18H6a3 3 0 0 1-3-3Z", "M3 7h15", "M15 12h6v5h-6a2.5 2.5 0 0 1 0-5Z"],
  rocket: ["M14 4c4-3 7-2 7-2s1 3-2 7l-7 7-5-5Z", "m9 14-5 1 1-5", "m14 9 5 5-1 5"],
  spark: ["m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"],
  heading: ["M5 5v14", "M19 5v14", "M5 12h14"],
  list: ["M9 6h11", "M9 12h11", "M9 18h11", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
  quote: ["M6 17h4l2-5V7H5v6h4", "M15 17h4l2-5V7h-7v6h4"],
} as const;

type IconName = keyof typeof paths;

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name].map((path, index) => <path d={path} key={index} />)}
    </svg>
  );
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pulse(enabled: boolean, pattern: number | number[] = 12) {
  if (enabled && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

function defaultColumns(project: Project): BoardColumn[] {
  if (project.boardColumns?.length) return project.boardColumns;
  const stamp = new Date().toISOString();
  return [
    {
      id: `${project.id}-todo`,
      title: "Нужно сделать",
      color: "blue",
      tasks: project.items
        .filter((item) => item.type === "task" && item.status !== "done")
        .map((item) => ({ id: `${project.id}-legacy-${item.id}`, title: item.title, description: item.body, done: false, createdAt: stamp })),
    },
    { id: `${project.id}-doing`, title: "В работе", color: "orange", tasks: [] },
    {
      id: `${project.id}-done`,
      title: "Готово",
      color: "green",
      tasks: project.items
        .filter((item) => item.type === "task" && item.status === "done")
        .map((item) => ({ id: `${project.id}-legacy-${item.id}`, title: item.title, description: item.body, done: true, createdAt: stamp })),
    },
  ];
}

export default function ProjectModule({
  projects,
  onChange,
  onProfile,
  onNotes,
  notesEnabled,
  haptics,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<ProjectTab>("board");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [templateId, setTemplateId] = useState("blank");
  const [projectName, setProjectName] = useState("");
  const [projectMenu, setProjectMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [renameProject, setRenameProject] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [noteDraft, setNoteDraft] = useState<ProjectNote | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const activeProject = projects.find((project) => project.id === activeId);
  const shownProjects = projects
    .filter((project) => !query.trim() || `${project.name} ${project.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));

  const updateProject = (id: string, updater: (project: Project) => Project) => {
    onChange(projects.map((project) => project.id === id
      ? { ...updater(project), updatedAt: new Date().toISOString() }
      : project));
  };

  const startProjectLongPress = (event: ReactPointerEvent, projectId: string) => {
    longPressed.current = false;
    const x = event.clientX;
    const y = event.clientY;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      const menuWidth = Math.min(260, window.innerWidth - 32);
      setProjectMenu({
        projectId,
        x: Math.max(16, Math.min(x - menuWidth / 2, window.innerWidth - menuWidth - 16)),
        y: Math.max(16, Math.min(y + 14, window.innerHeight - 172)),
      });
      document.getSelection()?.removeAllRanges();
      pulse(haptics, 22);
    }, 340);
  };

  const stopProjectLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const openProject = (projectId: string) => {
    if (longPressed.current) return;
    setActiveId(projectId);
    setTab("board");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const createProject = (event: FormEvent) => {
    event.preventDefault();
    if (!projectName.trim()) return;
    const template = projectTemplates.find((item) => item.id === templateId) || projectTemplates[0];
    const project = createProjectFromTemplate(template, projectName, "", undefined);
    onChange([project, ...projects]);
    setProjectName("");
    setTemplateId("blank");
    setCreateOpen(false);
    setActiveId(project.id);
    setTab("board");
    pulse(haptics, [12, 28, 12]);
  };

  const executeDelete = () => {
    if (!confirm) return;
    if (confirm.kind === "project") {
      onChange(projects.filter((project) => project.id !== confirm.projectId));
      if (activeId === confirm.projectId) setActiveId(null);
    } else if (confirm.kind === "column") {
      updateProject(confirm.projectId, (project) => ({
        ...project,
        boardColumns: defaultColumns(project).filter((column) => column.id !== confirm.columnId),
      }));
    } else if (confirm.kind === "task") {
      updateProject(confirm.projectId, (project) => ({
        ...project,
        boardColumns: defaultColumns(project).map((column) => column.id === confirm.columnId
          ? { ...column, tasks: column.tasks.filter((task) => task.id !== confirm.taskId) }
          : column),
      }));
    } else if (confirm.kind === "note") {
      updateProject(confirm.projectId, (project) => ({
        ...project,
        projectNotes: (project.projectNotes || []).filter((note) => note.id !== confirm.noteId),
      }));
    } else {
      updateProject(confirm.projectId, (project) => {
        const documents = project.documents || [];
        const removing = new Set([confirm.documentId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const node of documents) {
            if (node.parentId && removing.has(node.parentId) && !removing.has(node.id)) {
              removing.add(node.id);
              changed = true;
            }
          }
        }
        return { ...project, documents: documents.filter((node) => !removing.has(node.id)) };
      });
    }
    setConfirm(null);
    pulse(haptics, 24);
  };

  if (activeProject) {
    return (
      <main className="screen project-detail-screen project-workspace" onPointerDown={(event) => {
        if (projectMenu && !(event.target as HTMLElement).closest(".project-context-menu, .project-more")) setProjectMenu(null);
      }}>
        <header className="project-detail-header simple">
          <button className="project-back" aria-label="Назад к проектам" onClick={() => setActiveId(null)}><Icon name="back" /></button>
          <span className={`project-symbol ${activeProject.accent}`}><Icon name={activeProject.icon} size={23} /></span>
          <div className="project-title-copy"><span>Проект</span><h1>{activeProject.name}</h1></div>
          <button className="project-more" aria-label="Меню проекта" onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setProjectMenu({
              projectId: activeProject.id,
              x: Math.max(16, rect.right - 260),
              y: Math.min(rect.bottom + 6, window.innerHeight - 172),
            });
          }}><Icon name="more" /></button>
        </header>

        <nav className="workspace-tabs" aria-label="Разделы проекта">
          <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}><Icon name="board" size={19} />Доска</button>
          <button className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}><Icon name="note" size={19} />Заметки</button>
          <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}><Icon name="page" size={19} />Документы</button>
        </nav>

        {tab === "board" && (
          <ProjectBoard
            columns={defaultColumns(activeProject)}
            onChange={(boardColumns) => updateProject(activeProject.id, (project) => ({ ...project, boardColumns }))}
            onConfirmDelete={(column) => setConfirm({ kind: "column", projectId: activeProject.id, columnId: column.id, label: column.title })}
            onConfirmDeleteTask={(columnId, task) => setConfirm({ kind: "task", projectId: activeProject.id, columnId, taskId: task.id, label: task.title })}
            haptics={haptics}
          />
        )}

        {tab === "notes" && (
          <ProjectNotes
            notes={activeProject.projectNotes || []}
            onChange={(projectNotes) => updateProject(activeProject.id, (project) => ({ ...project, projectNotes }))}
            onEdit={setNoteDraft}
            onDelete={(note) => setConfirm({ kind: "note", projectId: activeProject.id, noteId: note.id, label: note.title || "заметку" })}
            onCreate={() => setNoteDraft({ id: uid("note"), title: "", body: "", color: "green", createdAt: new Date().toISOString() })}
            haptics={haptics}
          />
        )}

        {tab === "documents" && (
          <DocumentWorkspace
            documents={activeProject.documents || []}
            onChange={(documents) => updateProject(activeProject.id, (project) => ({ ...project, documents }))}
            onConfirmDelete={(document) => setConfirm({ kind: "document", projectId: activeProject.id, documentId: document.id, label: document.title || "Без названия" })}
            haptics={haptics}
          />
        )}

        {noteDraft && (
          <Sheet onClose={() => setNoteDraft(null)}>
            <form className="project-note-editor" onSubmit={(event) => {
              event.preventDefault();
              if (!noteDraft.title.trim() && !noteDraft.body.trim()) return;
              const notes = activeProject.projectNotes || [];
              const next = notes.some((note) => note.id === noteDraft.id)
                ? notes.map((note) => note.id === noteDraft.id ? noteDraft : note)
                : [noteDraft, ...notes];
              updateProject(activeProject.id, (project) => ({ ...project, projectNotes: next }));
              setNoteDraft(null);
            }}>
              <div className="project-sheet-header">
                <button type="button" onClick={() => setNoteDraft(null)}>Отмена</button>
                <strong>Заметка</strong>
                <button type="submit">Готово</button>
              </div>
              <div className="project-note-fields">
                <input autoFocus aria-label="Заголовок заметки" value={noteDraft.title} onChange={(event) => setNoteDraft({ ...noteDraft, title: event.target.value })} placeholder="Название заметки" />
                {noteDraft.title.trim() && <div className="project-note-colors">{(["green", "blue", "purple", "orange", "pink", "neutral"] as const).map((color) => <button type="button" key={color} className={`${color} ${noteDraft.color === color ? "selected" : ""}`} aria-label={`Цвет ${color}`} onClick={() => setNoteDraft({ ...noteDraft, color })} />)}</div>}
                <textarea aria-label="Текст заметки" value={noteDraft.body} onChange={(event) => setNoteDraft({ ...noteDraft, body: event.target.value })} placeholder="Начните писать…" />
              </div>
            </form>
          </Sheet>
        )}

        {projectMenu && <ProjectContextMenu
          project={activeProject}
          position={projectMenu}
          onRename={() => { setRenameProject({ id: activeProject.id, name: activeProject.name }); setProjectMenu(null); }}
          onFavorite={() => { updateProject(activeProject.id, (item) => ({ ...item, favorite: !item.favorite })); setProjectMenu(null); }}
          onDelete={() => { setConfirm({ kind: "project", projectId: activeProject.id, label: activeProject.name }); setProjectMenu(null); }}
        />}
        {renameProject && <RenameProjectSheet value={renameProject} onChange={setRenameProject} onClose={() => setRenameProject(null)} onSave={() => {
          if (!renameProject.name.trim()) return;
          updateProject(renameProject.id, (project) => ({ ...project, name: renameProject.name.trim() }));
          setRenameProject(null);
        }} />}
        {confirm && <ConfirmDialog label={confirm.label} onCancel={() => setConfirm(null)} onConfirm={executeDelete} />}
      </main>
    );
  }

  return (
    <main className="screen projects-screen clean-projects-screen" onPointerDown={(event) => {
      if (projectMenu && !(event.target as HTMLElement).closest(".project-context-menu")) setProjectMenu(null);
    }}>
      <header className="projects-header">
        <div><p className="eyebrow">Рабочее пространство</p><h1>Проекты</h1><p className="projects-subtitle">Доски, заметки и документы без лишнего.</p></div>
        <div className="header-actions">
          <button className="round-button" aria-label="Создать проект" onClick={() => setCreateOpen(true)}><Icon name="plus" size={27} /></button>
          <button className="round-button" aria-label="Открыть профиль" onClick={onProfile}><Icon name="user" size={26} /></button>
        </div>
      </header>

      {notesEnabled && (
        <div className="module-switcher" role="tablist" aria-label="Модули приложения">
          <button role="tab" aria-selected="false" onClick={onNotes}><Icon name="note" size={18} />Заметки</button>
          <button className="active" role="tab" aria-selected="true"><Icon name="folder" size={18} />Проекты</button>
        </div>
      )}

      <div className="project-search"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти проект" aria-label="Найти проект" /></div>

      {shownProjects.length ? (
        <div className="projects-grid clean-project-grid">
          {shownProjects.map((project) => {
            const columns = defaultColumns(project);
            const tasks = columns.flatMap((column) => column.tasks);
            const done = tasks.filter((task) => task.done).length;
            return (
              <article className="project-card clean-project-card" key={project.id}>
                <button
                  className="project-card-open"
                  onContextMenu={(event) => event.preventDefault()}
                  onPointerDown={(event) => startProjectLongPress(event, project.id)}
                  onPointerUp={() => { stopProjectLongPress(); openProject(project.id); }}
                  onPointerCancel={stopProjectLongPress}
                  onPointerLeave={stopProjectLongPress}
                >
                  <span className={`project-symbol ${project.accent}`}><Icon name={project.icon} size={23} /></span>
                  <span><strong>{project.name}</strong><small>{columns.length} групп · {done}/{tasks.length} выполнено</small></span>
                  {project.favorite && <Icon name="star" size={17} />}
                  <Icon name="chevron" size={20} />
                </button>
                <button className="project-card-menu-button" aria-label={`Меню проекта ${project.name}`} onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setProjectMenu({ projectId: project.id, x: Math.max(16, rect.right - 260), y: Math.min(rect.bottom + 4, window.innerHeight - 172) });
                }}><Icon name="more" size={20} /></button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="project-empty">
          <span className="project-empty-icon"><Icon name="board" size={31} /></span>
          <h2>{query ? "Проекты не найдены" : "Создайте первый проект"}</h2>
          <p>{query ? "Попробуйте изменить запрос." : "Внутри будут чистая доска, заметки и пространство для документов."}</p>
          {!query && <button onClick={() => setCreateOpen(true)}><Icon name="plus" size={19} />Создать проект</button>}
        </div>
      )}

      {createOpen && (
        <Sheet onClose={() => setCreateOpen(false)}>
          <form onSubmit={createProject}>
            <div className="project-sheet-header"><button type="button" onClick={() => setCreateOpen(false)}>Отмена</button><strong>Новый проект</strong><button type="submit" disabled={!projectName.trim()}>Создать</button></div>
            <div className="project-sheet-scroll">
              <label className="project-field"><span>Название</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Например, запуск приложения" /></label>
              <fieldset className="template-picker"><legend>Шаблон</legend><div>{projectTemplates.map((template) => <button type="button" key={template.id} className={templateId === template.id ? "selected" : ""} onClick={() => setTemplateId(template.id)}><span className={`project-symbol ${template.accent}`}><Icon name={template.icon} size={21} /></span><span><strong>{template.name}</strong><small>{template.description}</small></span>{templateId === template.id && <Icon name="check" size={18} />}</button>)}</div></fieldset>
            </div>
          </form>
        </Sheet>
      )}

      {renameProject && <RenameProjectSheet value={renameProject} onChange={setRenameProject} onClose={() => setRenameProject(null)} onSave={() => {
        if (!renameProject.name.trim()) return;
        updateProject(renameProject.id, (project) => ({ ...project, name: renameProject.name.trim() }));
        setRenameProject(null);
      }} />}

      {projectMenu && (() => {
        const project = projects.find((item) => item.id === projectMenu.projectId);
        if (!project) return null;
        return <ProjectContextMenu
          project={project}
          position={projectMenu}
          onRename={() => { setRenameProject({ id: project.id, name: project.name }); setProjectMenu(null); }}
          onFavorite={() => { updateProject(project.id, (item) => ({ ...item, favorite: !item.favorite })); setProjectMenu(null); }}
          onDelete={() => { setConfirm({ kind: "project", projectId: project.id, label: project.name }); setProjectMenu(null); }}
        />;
      })()}

      {confirm && <ConfirmDialog label={confirm.label} onCancel={() => setConfirm(null)} onConfirm={executeDelete} />}
    </main>
  );
}

function ProjectContextMenu({
  project,
  position,
  onRename,
  onFavorite,
  onDelete,
}: {
  project: Project;
  position: { x: number; y: number };
  onRename: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="project-context-menu" role="menu" style={{ left: position.x, top: position.y }}>
      <button role="menuitem" onClick={onRename}><Icon name="edit" size={19} />Переименовать</button>
      <button role="menuitem" onClick={onFavorite}><Icon name="star" size={19} />{project.favorite ? "Убрать из избранного" : "В избранное"}</button>
      <button role="menuitem" className="danger" onClick={onDelete}><Icon name="trash" size={19} />Удалить</button>
    </div>
  );
}

function RenameProjectSheet({
  value,
  onChange,
  onClose,
  onSave,
}: {
  value: { id: string; name: string };
  onChange: (value: { id: string; name: string }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Sheet onClose={onClose} compact>
      <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div className="project-sheet-header"><button type="button" onClick={onClose}>Отмена</button><strong>Название</strong><button type="submit">Готово</button></div>
        <div className="project-sheet-scroll"><label className="project-field"><span>Название проекта</span><input autoFocus value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label></div>
      </form>
    </Sheet>
  );
}

function ProjectBoard({
  columns,
  onChange,
  onConfirmDelete,
  onConfirmDeleteTask,
  haptics,
}: {
  columns: BoardColumn[];
  onChange: (columns: BoardColumn[]) => void;
  onConfirmDelete: (column: BoardColumn) => void;
  onConfirmDeleteTask: (columnId: string, task: BoardTask) => void;
  haptics: boolean;
}) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnTitle, setColumnTitle] = useState("");
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [editingColumn, setEditingColumn] = useState<{ id: string; title: string } | null>(null);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
  );

  const addColumn = (event: FormEvent) => {
    event.preventDefault();
    if (!columnTitle.trim()) return;
    onChange([...columns, { id: uid("column"), title: columnTitle.trim(), color: ["blue", "purple", "orange", "green", "pink"][columns.length % 5], tasks: [] }]);
    setColumnTitle("");
    setAddingColumn(false);
    pulse(haptics);
  };

  const addTask = (event: FormEvent, columnId: string) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    onChange(columns.map((column) => column.id === columnId ? {
      ...column,
      tasks: [...column.tasks, { id: uid("task"), title: taskTitle.trim(), done: false, createdAt: new Date().toISOString() }],
    } : column));
    setTaskTitle("");
    setAddingTaskTo(null);
    pulse(haptics);
  };

  const finishDrag = (event: DragEndEvent) => {
    setActiveTask(null);
    document.body.classList.remove("is-reordering");
    if (!event.over) return;
    const activeData = event.active.data.current as { columnId?: string } | undefined;
    const overData = event.over.data.current as { columnId?: string; type?: string } | undefined;
    const sourceId = activeData?.columnId;
    const targetId = overData?.columnId || (columns.some((column) => column.id === event.over?.id) ? String(event.over.id) : undefined);
    if (!sourceId || !targetId) return;
    const source = columns.find((column) => column.id === sourceId);
    const task = source?.tasks.find((item) => item.id === event.active.id);
    if (!task) return;

    if (sourceId === targetId) {
      const column = columns.find((item) => item.id === sourceId);
      if (!column) return;
      const oldIndex = column.tasks.findIndex((item) => item.id === event.active.id);
      const newIndex = column.tasks.findIndex((item) => item.id === event.over?.id);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        onChange(columns.map((item) => item.id === sourceId ? { ...item, tasks: arrayMove(item.tasks, oldIndex, newIndex) } : item));
      }
      return;
    }

    onChange(columns.map((column) => {
      if (column.id === sourceId) return { ...column, tasks: column.tasks.filter((item) => item.id !== task.id) };
      if (column.id === targetId) {
        const overIndex = column.tasks.findIndex((item) => item.id === event.over?.id);
        const next = [...column.tasks];
        next.splice(overIndex < 0 ? next.length : overIndex, 0, task);
        return { ...column, tasks: next };
      }
      return column;
    }));
    pulse(haptics, [9, 22, 9]);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      autoScroll={{ threshold: { x: 0.18, y: 0.18 }, acceleration: 12, interval: 5 }}
      onDragStart={(event: DragStartEvent) => {
        const columnId = (event.active.data.current as { columnId?: string } | undefined)?.columnId;
        setActiveTask(columns.find((column) => column.id === columnId)?.tasks.find((task) => task.id === event.active.id) || null);
        document.body.classList.add("is-reordering");
        pulse(haptics, 18);
      }}
      onDragCancel={() => { setActiveTask(null); document.body.classList.remove("is-reordering"); }}
      onDragEnd={finishDrag}
    >
      <div className="trello-board">
        {columns.map((column) => (
          <BoardColumnView
            column={column}
            key={column.id}
            adding={addingTaskTo === column.id}
            taskTitle={addingTaskTo === column.id ? taskTitle : ""}
            editing={editingColumn?.id === column.id ? editingColumn.title : null}
            onTaskTitle={setTaskTitle}
            onStartAdd={() => { setAddingTaskTo(column.id); setTaskTitle(""); }}
            onCancelAdd={() => setAddingTaskTo(null)}
            onAddTask={(event) => addTask(event, column.id)}
            onToggle={(taskId) => onChange(columns.map((item) => item.id === column.id ? { ...item, tasks: item.tasks.map((task) => task.id === taskId ? { ...task, done: !task.done } : task) } : item))}
                onDeleteTask={(taskId) => {
                  const task = column.tasks.find((item) => item.id === taskId);
                  if (task) onConfirmDeleteTask(column.id, task);
                }}
            onStartRename={() => setEditingColumn({ id: column.id, title: column.title })}
            onRenameValue={(title) => setEditingColumn({ id: column.id, title })}
            onFinishRename={() => {
              if (editingColumn?.title.trim()) onChange(columns.map((item) => item.id === column.id ? { ...item, title: editingColumn.title.trim() } : item));
              setEditingColumn(null);
            }}
            onDeleteColumn={() => onConfirmDelete(column)}
          />
        ))}
        <section className="add-board-column">
          {addingColumn ? (
            <form onSubmit={addColumn}>
              <input autoFocus value={columnTitle} onChange={(event) => setColumnTitle(event.target.value)} placeholder="Название группы" onKeyDown={(event) => { if (event.key === "Escape") setAddingColumn(false); }} />
              <div><button type="submit">Добавить</button><button type="button" onClick={() => setAddingColumn(false)}>Отмена</button></div>
            </form>
          ) : <button onClick={() => setAddingColumn(true)}><Icon name="plus" size={19} />Добавить группу</button>}
        </section>
      </div>
      {activeTask && <div className="visually-hidden" aria-live="polite">Перемещается задача {activeTask.title}</div>}
    </DndContext>
  );
}

function BoardColumnView({
  column,
  adding,
  taskTitle,
  editing,
  onTaskTitle,
  onStartAdd,
  onCancelAdd,
  onAddTask,
  onToggle,
  onDeleteTask,
  onStartRename,
  onRenameValue,
  onFinishRename,
  onDeleteColumn,
}: {
  column: BoardColumn;
  adding: boolean;
  taskTitle: string;
  editing: string | null;
  onTaskTitle: (value: string) => void;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onAddTask: (event: FormEvent) => void;
  onToggle: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStartRename: () => void;
  onRenameValue: (value: string) => void;
  onFinishRename: () => void;
  onDeleteColumn: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column", columnId: column.id } });
  const [menu, setMenu] = useState(false);
  return (
    <section ref={setNodeRef} className={`trello-column ${isOver ? "is-over" : ""}`}>
      <header>
        <span className={`column-dot ${column.color}`} />
        {editing !== null ? <input autoFocus value={editing} onChange={(event) => onRenameValue(event.target.value)} onBlur={onFinishRename} onKeyDown={(event) => { if (event.key === "Enter") onFinishRename(); }} /> : <strong>{column.title}</strong>}
        <span className="column-count">{column.tasks.length}</span>
        <button aria-label={`Меню группы ${column.title}`} onClick={() => setMenu((value) => !value)}><Icon name="more" size={19} /></button>
        {menu && <div className="column-menu"><button onClick={() => { onStartRename(); setMenu(false); }}><Icon name="edit" size={17} />Переименовать</button><button className="danger" onClick={() => { onDeleteColumn(); setMenu(false); }}><Icon name="trash" size={17} />Удалить группу</button></div>}
      </header>
      <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="trello-tasks">
          {column.tasks.map((task) => <SortableBoardTask task={task} columnId={column.id} key={task.id} onToggle={() => onToggle(task.id)} onDelete={() => onDeleteTask(task.id)} />)}
          {!column.tasks.length && <span className="column-empty">Задач пока нет</span>}
        </div>
      </SortableContext>
      {adding ? (
        <form className="quick-task-form" onSubmit={onAddTask}>
          <textarea autoFocus value={taskTitle} onChange={(event) => onTaskTitle(event.target.value)} placeholder="Название задачи" onKeyDown={(event) => { if (event.key === "Escape") onCancelAdd(); if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <div><button type="submit">Добавить</button><button type="button" onClick={onCancelAdd}>Отмена</button></div>
        </form>
      ) : <button className="add-task-button" onClick={onStartAdd}><Icon name="plus" size={18} />Добавить задачу</button>}
    </section>
  );
}

/* eslint-disable react-hooks/refs -- dnd-kit exposes sortable bindings that are intentionally consumed during render. */
function SortableBoardTask({ task, columnId, onToggle, onDelete }: { task: BoardTask; columnId: string; onToggle: () => void; onDelete: () => void }) {
  const sortable = useSortable({ id: task.id, data: { type: "task", columnId } });
  return (
    <article
      ref={sortable.setNodeRef}
      className={`trello-task ${task.done ? "done" : ""} ${sortable.isDragging ? "dragging" : ""}`}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <button className={`board-check ${task.done ? "done" : ""}`} aria-label={task.done ? "Вернуть задачу" : "Выполнить задачу"} onPointerDown={(event) => event.stopPropagation()} onClick={onToggle}>{task.done && <Icon name="check" size={15} />}</button>
      <span>{task.title}</span>
      <button className="task-delete" aria-label={`Удалить задачу ${task.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={onDelete}><Icon name="trash" size={16} /></button>
    </article>
  );
}

function ProjectNotes({
  notes,
  onChange,
  onEdit,
  onDelete,
  onCreate,
  haptics,
}: {
  notes: ProjectNote[];
  onChange: (notes: ProjectNote[]) => void;
  onEdit: (note: ProjectNote) => void;
  onDelete: (note: ProjectNote) => void;
  onCreate: () => void;
  haptics: boolean;
}) {
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }));
  return (
    <DndContext sensors={sensors} autoScroll={{ threshold: { x: 0.12, y: 0.18 }, acceleration: 12, interval: 5 }} onDragStart={() => pulse(haptics, 18)} onDragEnd={(event) => {
      if (!event.over || event.active.id === event.over.id) return;
      const from = notes.findIndex((note) => note.id === event.active.id);
      const to = notes.findIndex((note) => note.id === event.over?.id);
      if (from >= 0 && to >= 0) onChange(arrayMove(notes, from, to));
    }}>
      <SortableContext items={notes.map((note) => note.id)} strategy={verticalListSortingStrategy}>
        <div className="project-notes-grid">
          {notes.map((note) => <SortableProjectNote note={note} key={note.id} onEdit={() => onEdit(note)} onDelete={() => onDelete(note)} />)}
        </div>
      </SortableContext>
      {!notes.length && <div className="workspace-empty"><span><Icon name="note" size={29} /></span><h2>Заметок пока нет</h2><p>Добавляйте отдельные смысловые блоки и свободно меняйте их порядок.</p></div>}
      <button className="project-fab" aria-label="Создать заметку" onClick={onCreate}><Icon name="plus" size={27} /></button>
    </DndContext>
  );
}

function SortableProjectNote({ note, onEdit, onDelete }: { note: ProjectNote; onEdit: () => void; onDelete: () => void }) {
  const sortable = useSortable({ id: note.id });
  return (
    <article ref={sortable.setNodeRef} className={`project-note-card ${sortable.isDragging ? "dragging" : ""}`} style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }} {...sortable.attributes} {...sortable.listeners}>
      <div className="project-note-meta"><span>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(note.createdAt))}</span><Icon name="grip" size={17} /></div>
      <button className="project-note-open" onPointerDown={(event) => event.stopPropagation()} onClick={onEdit}>{note.title && <h2 className={`title-${note.color}`}>{note.title}</h2>}<p>{note.body}</p></button>
      <button className="project-note-delete" aria-label="Удалить заметку" onPointerDown={(event) => event.stopPropagation()} onClick={onDelete}><Icon name="trash" size={17} /></button>
    </article>
  );
}
/* eslint-enable react-hooks/refs */

function DocumentWorkspace({
  documents,
  onChange,
  onConfirmDelete,
  haptics,
}: {
  documents: ProjectDocument[];
  onChange: (documents: ProjectDocument[]) => void;
  onConfirmDelete: (document: ProjectDocument) => void;
  haptics: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [create, setCreate] = useState<{ type: "folder" | "page"; parentId: string | null } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [rename, setRename] = useState<ProjectDocument | null>(null);
  const selected = documents.find((document) => document.id === selectedId && document.type === "page");

  const addDocument = (event: FormEvent) => {
    event.preventDefault();
    if (!create || !newTitle.trim()) return;
    const stamp = new Date().toISOString();
    const document: ProjectDocument = { id: uid(create.type), type: create.type, parentId: create.parentId, title: newTitle.trim(), content: "", createdAt: stamp, updatedAt: stamp };
    onChange([...documents, document]);
    if (create.parentId) setExpanded((current) => new Set(current).add(create.parentId!));
    if (create.type === "page") setSelectedId(document.id);
    setCreate(null);
    setNewTitle("");
    pulse(haptics);
  };

  const updateSelected = (patch: Partial<ProjectDocument>) => {
    if (!selected) return;
    onChange(documents.map((document) => document.id === selected.id ? { ...document, ...patch, updatedAt: new Date().toISOString() } : document));
  };

  const insert = (prefix: string) => updateSelected({ content: `${selected?.content || ""}${selected?.content ? "\n" : ""}${prefix}` });

  return (
    <div className={`document-workspace ${selected ? "page-open" : ""}`}>
      <aside className="document-tree">
        <div className="document-tree-head"><strong>Документы</strong><div><button aria-label="Новая страница" onClick={() => { setCreate({ type: "page", parentId: null }); setNewTitle(""); }}><Icon name="page" size={18} /></button><button aria-label="Новая папка" onClick={() => { setCreate({ type: "folder", parentId: null }); setNewTitle(""); }}><Icon name="folderPlus" size={18} /></button></div></div>
        <DocumentLevel
          parentId={null}
          documents={documents}
          expanded={expanded}
          selectedId={selectedId}
          onToggle={(id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
          onOpen={setSelectedId}
          onAdd={(type, parentId) => { setCreate({ type, parentId }); setNewTitle(""); }}
          onRename={setRename}
          onDelete={onConfirmDelete}
        />
        {!documents.length && <div className="document-tree-empty"><Icon name="page" size={26} /><span>Создайте папку или первую страницу</span></div>}
      </aside>
      <section className="document-editor">
        {selected ? (
          <>
            <header className="document-editor-mobile-head"><button onClick={() => setSelectedId(null)}><Icon name="back" size={21} />Документы</button></header>
            <div className="document-breadcrumbs"><span>{documents.find((node) => node.id === selected.parentId)?.title || "Проект"}</span><Icon name="chevron" size={15} /><strong>{selected.title || "Без названия"}</strong></div>
            <input className="document-title" aria-label="Название документа" value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} placeholder="Без названия" />
            <div className="document-toolbar" aria-label="Инструменты документа">
              <button onClick={() => insert("# ")} title="Заголовок"><Icon name="heading" size={18} /></button>
              <button onClick={() => insert("- ")} title="Список"><Icon name="list" size={18} /></button>
              <button onClick={() => insert("- [ ] ")} title="Задача"><Icon name="check" size={18} /></button>
              <button onClick={() => insert("> ")} title="Цитата"><Icon name="quote" size={18} /></button>
              <select aria-label="Переместить в папку" value={selected.parentId || ""} onChange={(event) => updateSelected({ parentId: event.target.value || null })}>
                <option value="">В корне проекта</option>
                {documents.filter((node) => node.type === "folder" && node.id !== selected.id).map((folder) => <option value={folder.id} key={folder.id}>{folder.title}</option>)}
              </select>
            </div>
            <textarea className="document-content" aria-label="Содержимое документа" value={selected.content} onChange={(event) => updateSelected({ content: event.target.value })} placeholder={"Начните писать…\n\nПоддерживается Markdown: # заголовок, - список, - [ ] задача"} />
            <span className="document-saved">Сохраняется автоматически</span>
          </>
        ) : <div className="document-placeholder"><span><Icon name="page" size={32} /></span><h2>Выберите документ</h2><p>Или создайте новую страницу в дереве слева.</p></div>}
      </section>

      {create && <Sheet onClose={() => setCreate(null)} compact><form onSubmit={addDocument}><div className="project-sheet-header"><button type="button" onClick={() => setCreate(null)}>Отмена</button><strong>{create.type === "folder" ? "Новая папка" : "Новая страница"}</strong><button type="submit">Создать</button></div><div className="project-sheet-scroll"><label className="project-field"><span>Название</span><input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={create.type === "folder" ? "Название папки" : "Название документа"} /></label></div></form></Sheet>}
      {rename && <Sheet onClose={() => setRename(null)} compact><form onSubmit={(event) => { event.preventDefault(); if (!rename.title.trim()) return; onChange(documents.map((document) => document.id === rename.id ? { ...document, title: rename.title.trim(), updatedAt: new Date().toISOString() } : document)); setRename(null); }}><div className="project-sheet-header"><button type="button" onClick={() => setRename(null)}>Отмена</button><strong>Переименовать</strong><button type="submit">Готово</button></div><div className="project-sheet-scroll"><label className="project-field"><span>Название</span><input autoFocus value={rename.title} onChange={(event) => setRename({ ...rename, title: event.target.value })} /></label></div></form></Sheet>}
    </div>
  );
}

function DocumentLevel({
  parentId,
  documents,
  expanded,
  selectedId,
  onToggle,
  onOpen,
  onAdd,
  onRename,
  onDelete,
}: {
  parentId: string | null;
  documents: ProjectDocument[];
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAdd: (type: "folder" | "page", parentId: string) => void;
  onRename: (document: ProjectDocument) => void;
  onDelete: (document: ProjectDocument) => void;
}) {
  return (
    <div className="document-level">
      {documents.filter((document) => document.parentId === parentId).map((document) => (
        <div className="document-node-wrap" key={document.id}>
          <div className={`document-node ${selectedId === document.id ? "selected" : ""}`}>
            <button className="document-node-main" onClick={() => document.type === "folder" ? onToggle(document.id) : onOpen(document.id)}>
              {document.type === "folder" ? <Icon name={expanded.has(document.id) ? "down" : "chevron"} size={16} /> : <span />}
              <Icon name={document.type === "folder" ? "folder" : "page"} size={18} />
              <span>{document.title || "Без названия"}</span>
            </button>
            <details>
              <summary aria-label={`Меню ${document.title}`}><Icon name="more" size={18} /></summary>
              <div>
                {document.type === "folder" && <><button onClick={() => onAdd("page", document.id)}><Icon name="page" size={16} />Страница</button><button onClick={() => onAdd("folder", document.id)}><Icon name="folderPlus" size={16} />Папка</button></>}
                <button onClick={() => onRename(document)}><Icon name="edit" size={16} />Переименовать</button>
                <button className="danger" onClick={() => onDelete(document)}><Icon name="trash" size={16} />Удалить</button>
              </div>
            </details>
          </div>
          {document.type === "folder" && expanded.has(document.id) && <DocumentLevel parentId={document.id} documents={documents} expanded={expanded} selectedId={selectedId} onToggle={onToggle} onOpen={onOpen} onAdd={onAdd} onRename={onRename} onDelete={onDelete} />}
        </div>
      ))}
    </div>
  );
}

function Sheet({ children, onClose, compact = false }: { children: ReactNode; onClose: () => void; compact?: boolean }) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const drag = useRef<{ y: number; pointerId: number } | null>(null);

  const finishDrag = () => {
    if (!drag.current) return;
    if (offsetRef.current > 120) onClose();
    offsetRef.current = 0;
    setOffset(0);
    drag.current = null;
  };

  return (
    <div
      className="project-sheet-layer keyboard-aware-layer"
      role="presentation"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`project-sheet ${compact ? "compact-sheet" : ""}`} style={{ transform: `translateY(${offset}px)` }} role="dialog" aria-modal="true">
        <button
          type="button"
          className="sheet-grabber sheet-grabber-button"
          aria-label="Потяните вниз, чтобы закрыть"
          onPointerDown={(event) => {
            drag.current = { y: event.clientY, pointerId: event.pointerId };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || drag.current.pointerId !== event.pointerId) return;
            const next = Math.max(-18, Math.min(event.clientY - drag.current.y, window.innerHeight * .65));
            offsetRef.current = next;
            setOffset(next);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        />
        <div className="project-sheet-body">{children}</div>
      </section>
    </div>
  );
}

function ConfirmDialog({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="project-confirm-layer" role="alertdialog" aria-modal="true" aria-labelledby="project-confirm-title">
      <div className="project-confirm"><span><Icon name="trash" size={25} /></span><h2 id="project-confirm-title">Удалить «{label}»?</h2><p>Это действие нельзя отменить.</p><div><button onClick={onCancel}>Отмена</button><button className="danger" onClick={onConfirm}>Удалить</button></div></div>
    </div>
  );
}
