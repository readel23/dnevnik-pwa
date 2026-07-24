"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

type IconName =
  | "plus" | "user" | "more" | "chevron" | "back" | "checklist"
  | "folder" | "cube" | "pen" | "train" | "heart" | "bulb"
  | "message" | "cart" | "clapper" | "archive" | "edit" | "trash"
  | "moon" | "globe" | "download" | "help" | "info" | "logout"
  | "bell" | "shield" | "crown" | "grip" | "restore" | "sun";

const iconPaths: Record<IconName, string[]> = {
  plus: ["M12 5v14", "M5 12h14"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  chevron: ["m9 18 6-6-6-6"],
  back: ["m15 18-6-6 6-6"],
  checklist: ["M9 6h11", "M9 12h11", "M9 18h11", "m3 6 1 1 2-2", "m3 12 1 1 2-2", "m3 18 1 1 2-2"],
  folder: ["M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"],
  cube: ["m12 3 8 4.5v9L12 21l-8-4.5v-9Z", "m4.3 7.7 7.7 4.4 7.7-4.4", "M12 12v9"],
  pen: ["m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16Z", "m14.5 6.7 3 3"],
  train: ["M6 17h12", "M6 17a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2", "M8 7h8", "m8 21 2-4", "m16 21-2-4"],
  heart: ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"],
  bulb: ["M9 18h6", "M10 22h4", "M8.5 14.5a7 7 0 1 1 7 0c-1 .8-1.5 1.8-1.5 3.5h-4c0-1.7-.5-2.7-1.5-3.5Z"],
  message: ["M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A8 8 0 1 1 21 15Z"],
  cart: ["M3 4h2l2.4 10.1a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6", "M10 20h.01", "M18 20h.01"],
  clapper: ["M4 7h16v13H4Z", "m5 3 3 4", "m10-4 3 4", "m15-4 3 4", "M4 12h16"],
  archive: ["M4 7h16", "M5 7v13h14V7", "M3 3h18v4H3Z", "M10 12h4"],
  edit: ["M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z", "m14.5 7.5 3 3"],
  trash: ["M4 7h16", "M9 7V4h6v3", "m8 11 1 1", "m16 11-1 1", "M6 7l1 14h10l1-14"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"],
  sun: ["M12 4V2", "M12 22v-2", "m4.9 4.9-1.4-1.4", "m17.9 17.9-1.4-1.4", "M4 12H2", "M22 12h-2", "m4.9 19.1-1.4 1.4", "m20.5 3.5-1.4 1.4", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20", "M12 2a15 15 0 0 1 0 20", "M12 2a15 15 0 0 0 0 20"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  help: ["M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4", "M12 18h.01", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"],
  info: ["M12 11v6", "M12 7h.01", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", "M12 8v4", "M12 16h.01"],
  crown: ["m3 7 4 4 5-7 5 7 4-4-2 12H5Z", "M5 19h14"],
  grip: ["M8 7h.01", "M16 7h.01", "M8 12h.01", "M16 12h.01", "M8 17h.01", "M16 17h.01"],
  restore: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
};

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name].map((path, index) => <path d={path} key={index} />)}
    </svg>
  );
}

type Block = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type Subsection = {
  id: string;
  name: string;
  icon: IconName;
  accent: string;
  blocks: Block[];
  archived: Block[];
};

type Section = {
  id: string;
  name: string;
  subsections: Subsection[];
};

type AppData = {
  sections: Section[];
};

const initialData: AppData = {
  sections: [
    {
      id: "today",
      name: "today",
      subsections: [{
        id: "tasks",
        name: "Дела",
        icon: "checklist",
        accent: "amber",
        blocks: [
          { id: "morning", title: "Утренние задачи", body: "Проснуться в 7:00\nТренировка\nДуш и завтрак\nПлан на день\nРабота над проектами", createdAt: "24 июля" },
          { id: "work", title: "Работа", body: "Доделать дизайн главной страницы\nИсправить баг с авторизацией\nНаписать API для задач\nПротестировать на всех устройствах", createdAt: "24 июля" },
          { id: "personal", title: "Личное", body: "Почитать книгу 30 минут\nМедитация\nНе засиживаться в телефоне\nЛечь спать до 23:00", createdAt: "24 июля" },
        ],
        archived: [],
      }],
    },
    {
      id: "projects",
      name: "projects",
      subsections: [
        { id: "tyler", name: "Tyler", icon: "folder", accent: "blue", blocks: [{ id: "tyler-plan", title: "Следующий релиз", body: "Собрать идеи\nПодготовить прототип\nПроверить сценарии", createdAt: "22 июля" }], archived: [] },
        { id: "qor", name: "QOR", icon: "cube", accent: "purple", blocks: [], archived: [] },
        { id: "blog", name: "Блог", icon: "pen", accent: "green", blocks: [], archived: [] },
        { id: "transit", name: "Транзит", icon: "train", accent: "orange", blocks: [], archived: [] },
        { id: "private", name: "Личное", icon: "heart", accent: "pink", blocks: [], archived: [] },
      ],
    },
    {
      id: "inbox",
      name: "inbox",
      subsections: [
        { id: "ideas", name: "Идеи", icon: "bulb", accent: "amber", blocks: [], archived: [] },
        { id: "thoughts", name: "Мысли", icon: "message", accent: "blue", blocks: [], archived: [] },
        { id: "buy", name: "Что купить", icon: "cart", accent: "green", blocks: [], archived: [] },
        { id: "watch", name: "Что посмотреть", icon: "clapper", accent: "purple", blocks: [], archived: [] },
        { id: "misc", name: "Все подряд", icon: "archive", accent: "gray", blocks: [], archived: [] },
      ],
    },
  ],
};

const storageKey = "diary-pwa-state-v1";
const themes = ["dark", "light", "system"] as const;
type Theme = typeof themes[number];
type ProfilePanel = "account" | "subscription" | "notifications" | "privacy" | "language" | "help" | "about";
type Preferences = {
  haptics: boolean;
  reminders: boolean;
  dailySummary: boolean;
  hidePreviews: boolean;
  language: "ru" | "en" | "kk";
};

const defaultPreferences: Preferences = {
  haptics: true,
  reminders: false,
  dailySummary: false,
  hidePreviews: false,
  language: "ru",
};

function vibrate(pattern: number | number[] = 18) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date())
    .replace(/^./, (letter) => letter.toUpperCase());
}

export default function DiaryApp() {
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [view, setView] = useState<"home" | "profile" | "subsection" | "archive">("home");
  const [active, setActive] = useState<{ sectionId: string; subsectionId: string } | null>(null);
  const [menu, setMenu] = useState<{ type: "section" | "subsection"; sectionId: string; subsectionId?: string; x: number; y: number } | null>(null);
  const [sheet, setSheet] = useState<"section" | "subsection" | "block" | null>(null);
  const [dialog, setDialog] = useState<{ kind: "rename-section" | "rename-subsection" | "delete-block"; sectionId?: string; subsectionId?: string; blockId?: string } | null>(null);
  const [toast, setToast] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [sheetSectionId, setSheetSectionId] = useState<string | null>(null);
  const [profilePanel, setProfilePanel] = useState<ProfilePanel | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [archiveScope, setArchiveScope] = useState<"active" | "all">("all");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage hydration is intentionally client-only. */
    try {
      const saved = localStorage.getItem(storageKey);
      const savedTheme = localStorage.getItem(`${storageKey}-theme`) as Theme | null;
      const savedPreferences = localStorage.getItem(`${storageKey}-preferences`);
      if (saved) setData(JSON.parse(saved));
      if (savedTheme && themes.includes(savedTheme)) setTheme(savedTheme);
      if (savedPreferences) setPreferences({ ...defaultPreferences, ...JSON.parse(savedPreferences) });
    } catch {
      setData(initialData);
    }
    setHydrated(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: sessionData }) => {
      setAuthUser(sessionData.session?.user ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(`${storageKey}-theme`, theme);
    const root = document.documentElement;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = theme === "system" ? (preferredDark ? "dark" : "light") : theme;
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(`${storageKey}-preferences`, JSON.stringify(preferences));
  }, [preferences, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const section = active ? data.sections.find((item) => item.id === active.sectionId) : undefined;
  const subsection = active ? section?.subsections.find((item) => item.id === active.subsectionId) : undefined;
  const displayName = authUser?.user_metadata?.full_name || "Гость";
  const displayUsername = authUser?.user_metadata?.username
    ? `@${authUser.user_metadata.username}`
    : authUser?.email || "Войдите или зарегистрируйтесь";
  const allArchiveEntries = data.sections.flatMap((sectionItem) =>
    sectionItem.subsections.flatMap((sub) =>
      sub.archived.map((block) => ({ block, section: sectionItem, subsection: sub })),
    ),
  );
  const archiveEntries = archiveScope === "active" && active
    ? allArchiveEntries.filter(({ section: itemSection, subsection: itemSubsection }) =>
        itemSection.id === active.sectionId && itemSubsection.id === active.subsectionId)
    : allArchiveEntries;

  const mutateSubsection = (sectionId: string, subsectionId: string, fn: (current: Subsection) => Subsection) => {
    setData((current) => ({
      sections: current.sections.map((sectionItem) => sectionItem.id !== sectionId ? sectionItem : {
        ...sectionItem,
        subsections: sectionItem.subsections.map((subsectionItem) => subsectionItem.id === subsectionId ? fn(subsectionItem) : subsectionItem),
      }),
    }));
  };

  const openSubsection = (sectionId: string, subsectionId: string) => {
    setActive({ sectionId, subsectionId });
    setView("subsection");
    setMenu(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setView("home");
    setActive(null);
    setMenu(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showMenu = (event: ReactPointerEvent<HTMLButtonElement>, payload: Omit<NonNullable<typeof menu>, "x" | "y">) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({ ...payload, x: Math.min(rect.right, window.innerWidth - 16), y: rect.bottom + 4 });
  };

  const startLongPress = (event: ReactPointerEvent<HTMLButtonElement>, sectionId: string, subsectionId: string) => {
    longPressedRef.current = false;
    const x = event.clientX;
    const y = event.clientY;
    longPressRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (preferences.haptics) vibrate(25);
      setMenu({ type: "subsection", sectionId, subsectionId, x: Math.min(x + 90, window.innerWidth - 16), y: y + 14 });
    }, 460);
  };

  const stopLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const submitSheet = (event: FormEvent) => {
    event.preventDefault();
    if (sheet === "section" && draftName.trim()) {
      setData((current) => ({ sections: [...current.sections, { id: uid("section"), name: draftName.trim(), subsections: [] }] }));
      setToast("Раздел создан");
    }
    if (sheet === "subsection" && sheetSectionId && draftName.trim()) {
      setData((current) => ({
        sections: current.sections.map((item) => item.id === sheetSectionId ? {
          ...item,
          subsections: [...item.subsections, { id: uid("subsection"), name: draftName.trim(), icon: "folder", accent: "blue", blocks: [], archived: [] }],
        } : item),
      }));
      setToast("Подраздел добавлен");
    }
    if (sheet === "block" && active && (draftTitle.trim() || draftBody.trim())) {
      mutateSubsection(active.sectionId, active.subsectionId, (current) => ({
        ...current,
        blocks: [{
          id: uid("block"),
          title: draftTitle.trim() || "Без заголовка",
          body: draftBody.trim(),
          createdAt: todayLabel(),
        }, ...current.blocks],
      }));
      setToast("Запись сохранена");
    }
    setSheet(null);
    setMenu(null);
    setDraftName("");
    setDraftTitle("");
    setDraftBody("");
    setSheetSectionId(null);
  };

  const renameTarget = () => {
    if (!dialog || !draftName.trim()) return;
    if (dialog.kind === "rename-section" && dialog.sectionId) {
      setData((current) => ({ sections: current.sections.map((item) => item.id === dialog.sectionId ? { ...item, name: draftName.trim() } : item) }));
    }
    if (dialog.kind === "rename-subsection" && dialog.sectionId && dialog.subsectionId) {
      mutateSubsection(dialog.sectionId, dialog.subsectionId, (current) => ({ ...current, name: draftName.trim() }));
    }
    setDialog(null);
    setDraftName("");
    setToast("Название изменено");
  };

  const removeSection = (sectionId: string) => {
    setData((current) => ({ sections: current.sections.filter((item) => item.id !== sectionId) }));
    setMenu(null);
    setToast("Раздел удалён");
  };

  const removeSubsection = (sectionId: string, subsectionId: string) => {
    setData((current) => ({
      sections: current.sections.map((item) => item.id === sectionId ? {
        ...item,
        subsections: item.subsections.filter((sub) => sub.id !== subsectionId),
      } : item),
    }));
    setMenu(null);
    setToast("Подраздел удалён");
  };

  const archiveBlock = (blockId: string) => {
    if (!active) return;
    mutateSubsection(active.sectionId, active.subsectionId, (current) => {
      const target = current.blocks.find((item) => item.id === blockId);
      return target ? { ...current, blocks: current.blocks.filter((item) => item.id !== blockId), archived: [target, ...current.archived] } : current;
    });
    setToast("Запись перемещена в архив");
  };

  const deleteBlock = () => {
    if (!active || !dialog?.blockId) return;
    mutateSubsection(active.sectionId, active.subsectionId, (current) => ({
      ...current,
      blocks: current.blocks.filter((item) => item.id !== dialog.blockId),
    }));
    setDialog(null);
    setToast("Запись удалена");
  };

  const restoreBlock = (sectionId: string, subsectionId: string, blockId: string) => {
    mutateSubsection(sectionId, subsectionId, (current) => {
      const target = current.archived.find((item) => item.id === blockId);
      return target ? { ...current, archived: current.archived.filter((item) => item.id !== blockId), blocks: [target, ...current.blocks] } : current;
    });
    setToast("Запись восстановлена");
  };

  const startReorder = (index: number, pointerId: number) => {
    if (!active) return;
    dragRef.current = { index, pointerId };
    document.body.classList.add("is-reordering");
    if (preferences.haptics) vibrate(24);
  };

  const moveReorder = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragRef.current || !active) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-block-index]");
    const nextIndex = target ? Number(target.dataset.blockIndex) : -1;
    const fromIndex = dragRef.current.index;
    if (nextIndex < 0 || nextIndex === fromIndex) return;
    const before = new Map(
      Array.from(document.querySelectorAll<HTMLElement>("[data-block-id]"))
        .map((element) => [element.dataset.blockId || "", element.getBoundingClientRect()] as const),
    );
    mutateSubsection(active.sectionId, active.subsectionId, (current) => {
      const blocks = [...current.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(nextIndex, 0, moved);
      return { ...current, blocks };
    });
    dragRef.current.index = nextIndex;
    if (preferences.haptics) vibrate(8);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("[data-block-id]").forEach((element) => {
        const oldRect = before.get(element.dataset.blockId || "");
        if (!oldRect) return;
        const newRect = element.getBoundingClientRect();
        const deltaY = oldRect.top - newRect.top;
        if (Math.abs(deltaY) > 1 && element.animate) {
          element.animate(
            [{ transform: `translateY(${deltaY}px)` }, { transform: "translateY(0)" }],
            { duration: 270, easing: "cubic-bezier(.16,1,.3,1)" },
          );
        }
      });
    }));
  };

  const stopReorder = () => {
    dragRef.current = null;
    document.body.classList.remove("is-reordering");
  };

  const togglePreference = (key: keyof Omit<Preferences, "language">) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    if (preferences.haptics) vibrate(12);
  };

  if (!hydrated) return <div className="app-loading" aria-label="Загрузка"><span /></div>;

  return (
    <div className="app-shell" onPointerDown={(event) => {
      if (menu && !(event.target as HTMLElement).closest(".context-menu, .more-button")) setMenu(null);
    }}>
      {view === "home" && (
        <main className="screen home-screen" id="main-content">
          <header className="home-header">
            <div>
              <p className="eyebrow">{todayLabel()}</p>
              <h1>Дневник</h1>
              <p className="header-note">Ваши мысли, планы и идеи</p>
            </div>
            <div className="header-actions">
              <button className="round-button" aria-label="Создать раздел" onClick={() => { setSheet("section"); setDraftName(""); }}>
                <Icon name="plus" size={27} />
              </button>
              <button className="round-button" aria-label="Открыть профиль" onClick={() => setView("profile")}>
                <Icon name="user" size={26} />
              </button>
            </div>
          </header>

          <div className="section-list">
            {data.sections.map((sectionItem) => (
              <section className="diary-section" key={sectionItem.id}>
                <div className="section-heading">
                  <h2>{sectionItem.name}</h2>
                  <button
                    className="icon-button more-button"
                    aria-label={`Меню раздела ${sectionItem.name}`}
                    aria-expanded={menu?.type === "section" && menu.sectionId === sectionItem.id}
                    onPointerDown={(event) => showMenu(event, { type: "section", sectionId: sectionItem.id })}
                  >
                    <Icon name="more" />
                  </button>
                </div>
                <div className={`subsection-card ${sectionItem.subsections.length === 0 ? "empty-card" : ""}`}>
                  {sectionItem.subsections.length === 0 ? (
                    <button className="empty-section" onClick={() => {
                      setSheetSectionId(sectionItem.id);
                      setSheet("subsection");
                    }}>
                      <Icon name="plus" size={20} />
                      Добавить первый подраздел
                    </button>
                  ) : sectionItem.subsections.map((sub, index) => (
                    <button
                      className="subsection-row"
                      key={sub.id}
                      onPointerDown={(event) => startLongPress(event, sectionItem.id, sub.id)}
                      onPointerUp={() => {
                        stopLongPress();
                        if (!longPressedRef.current) openSubsection(sectionItem.id, sub.id);
                      }}
                      onPointerCancel={stopLongPress}
                      onPointerLeave={stopLongPress}
                    >
                      <span className={`tile-icon ${sub.accent}`}><Icon name={sub.icon} size={23} /></span>
                      <span className="row-label">{sub.name}</span>
                      <Icon name="chevron" size={22} />
                      {index < sectionItem.subsections.length - 1 && <span className="row-divider" />}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="gesture-hint">Удерживайте подраздел, чтобы открыть его меню</p>
        </main>
      )}

      {view === "profile" && (
        <main className="screen profile-screen" id="main-content">
          <ScreenHeader title="Профиль" onBack={goHome} />
          <button className="profile-hero" onClick={() => setProfilePanel("account")}>
            <span className="avatar"><Icon name="user" size={48} /></span>
            <span className="profile-copy">
              <strong>{displayName}</strong>
              <span>Личный дневник и проекты</span>
              <span>{displayUsername}</span>
            </span>
            <Icon name="chevron" />
          </button>
          <SettingsGroup rows={[
            { icon: "user", label: "Аккаунт", accent: "blue", onClick: () => setProfilePanel("account") },
            { icon: "crown", label: "Подписка", accent: "purple", value: "Базовая", onClick: () => setProfilePanel("subscription") },
            { icon: "bell", label: "Уведомления", accent: "orange", value: preferences.reminders ? "Вкл." : "Выкл.", onClick: () => setProfilePanel("notifications") },
            { icon: "shield", label: "Конфиденциальность", accent: "green", onClick: () => setProfilePanel("privacy") },
          ]} />
          <SettingsGroup rows={[
            {
              icon: theme === "light" ? "sun" : "moon",
              label: "Тема",
              accent: "purple",
              value: theme === "dark" ? "Тёмная" : theme === "light" ? "Светлая" : "Системная",
              onClick: () => {
                setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);
                if (preferences.haptics) vibrate(12);
              },
            },
            {
              icon: "globe",
              label: "Язык",
              accent: "blue",
              value: preferences.language === "ru" ? "Русский" : preferences.language === "kk" ? "Қазақша" : "English",
              onClick: () => setProfilePanel("language"),
            },
            { icon: "archive", label: "Архив", accent: "orange", value: allArchiveEntries.length ? String(allArchiveEntries.length) : undefined, onClick: () => {
              setArchiveScope("all");
              setView("archive");
            } },
            { icon: "download", label: "Экспорт данных", accent: "green", onClick: () => {
              const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data, preferences }, null, 2)], { type: "application/json" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "diary-export.json";
              link.click();
              URL.revokeObjectURL(link.href);
              setToast("Экспорт подготовлен");
            } },
          ]} />
          <SettingsGroup rows={[
            { icon: "help", label: "Помощь", accent: "amber", onClick: () => setProfilePanel("help") },
            { icon: "info", label: "О приложении", accent: "blue", value: "v1.1", onClick: () => setProfilePanel("about") },
          ]} />
          <button className="logout-row" onClick={async () => {
            if (authUser && supabase) {
              const { error } = await supabase.auth.signOut({ scope: "local" });
              setToast(error ? error.message : "Вы вышли из аккаунта");
            } else {
              setProfilePanel("account");
            }
          }}><span className="tile-icon red"><Icon name="logout" /></span>{authUser ? "Выйти" : "Войти"}</button>
        </main>
      )}

      {view === "subsection" && active && subsection && section && (
        <main className="screen subsection-screen" id="main-content">
          <header className="subsection-header">
            <button className="back-button" aria-label="Назад" onClick={goHome}><Icon name="back" size={28} /></button>
            <div className="breadcrumbs"><span>{section.name}</span><Icon name="chevron" size={18} /><strong>{subsection.name}</strong></div>
            <button className="archive-link" onClick={() => {
              setArchiveScope("active");
              setView("archive");
            }}>Архив{subsection.archived.length ? ` · ${subsection.archived.length}` : ""}</button>
          </header>
          <div className="blocks-list">
            {subsection.blocks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="pen" size={31} /></span>
                <h2>Здесь пока пусто</h2>
                <p>Создайте первую запись — идеальное место для мыслей, планов или списка дел.</p>
                <button className="primary-button" onClick={() => setSheet("block")}><Icon name="plus" size={20} />Создать запись</button>
              </div>
            ) : subsection.blocks.map((block, index) => (
              <SwipeBlock
                block={block}
                index={index}
                key={block.id}
                hidePreview={preferences.hidePreviews}
                onArchive={() => archiveBlock(block.id)}
                onDelete={() => setDialog({ kind: "delete-block", blockId: block.id })}
                onReorderStart={startReorder}
                onReorderMove={moveReorder}
                onReorderEnd={stopReorder}
              />
            ))}
          </div>
          <button className="floating-add" aria-label="Создать запись" onClick={() => { setDraftTitle(""); setDraftBody(""); setSheet("block"); }}>
            <Icon name="plus" size={29} />
          </button>
        </main>
      )}

      {view === "archive" && (
        <main className="screen archive-screen" id="main-content">
          <ScreenHeader
            title={archiveScope === "active" && subsection ? `Архив · ${subsection.name}` : "Архив"}
            onBack={() => setView(archiveScope === "active" && active ? "subsection" : "profile")}
          />
          <div className="archive-list">
            {archiveEntries.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="archive" size={31} /></span>
                <h2>Архив пуст</h2>
                <p>Смахните запись влево, и она появится здесь.</p>
              </div>
            ) : archiveEntries.map(({ block, section: sectionItem, subsection: sub }) => (
              <article className="archive-item" key={block.id}>
                <div><span>{sectionItem.name} · {sub.name}</span><h2>{block.title}</h2><p>{preferences.hidePreviews ? "Текст скрыт настройками конфиденциальности" : block.body}</p></div>
                <button className="round-button small" aria-label={`Восстановить ${block.title}`} onClick={() => restoreBlock(sectionItem.id, sub.id, block.id)}>
                  <Icon name="restore" size={21} />
                </button>
              </article>
            ))}
          </div>
        </main>
      )}

      {menu && (
        <div className="context-menu" role="menu" style={{ top: menu.y, left: menu.x }}>
          <button role="menuitem" onClick={() => {
            const currentName = menu.type === "section"
              ? data.sections.find((item) => item.id === menu.sectionId)?.name
              : data.sections.find((item) => item.id === menu.sectionId)?.subsections.find((item) => item.id === menu.subsectionId)?.name;
            setDraftName(currentName || "");
            setDialog({
              kind: menu.type === "section" ? "rename-section" : "rename-subsection",
              sectionId: menu.sectionId,
              subsectionId: menu.subsectionId,
            });
            setMenu(null);
          }}><Icon name="edit" size={21} />Переименовать</button>
          {menu.type === "section" && <button role="menuitem" onClick={() => {
            setDraftName("");
            setSheetSectionId(menu.sectionId);
            setSheet("subsection");
          }}><Icon name="plus" size={21} />Добавить подраздел</button>}
          <button role="menuitem" className="danger" onClick={() => {
            if (menu.type === "section") removeSection(menu.sectionId);
            else if (menu.subsectionId) removeSubsection(menu.sectionId, menu.subsectionId);
          }}><Icon name="trash" size={21} />Удалить</button>
        </div>
      )}

      {sheet && (
        <DraggableSheet onClose={() => setSheet(null)} tall={sheet === "block"}>
          <form className="sheet-form" onSubmit={submitSheet}>
            <div className="sheet-header">
              <button type="button" className="text-button muted-action" onClick={() => setSheet(null)}>Отмена</button>
              <strong>{sheet === "block" ? todayLabel() : sheet === "section" ? "Новый раздел" : "Новый подраздел"}</strong>
              <button className="text-button" type="submit">Готово</button>
            </div>
            {sheet === "block" ? (
              <div className="editor-fields">
                <input id="block-title" aria-label="Название записи" autoFocus value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Название записи" />
                <textarea id="block-body" aria-label="Текст записи" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="Начните писать…" />
              </div>
            ) : (
              <div className="name-field">
                <label htmlFor="item-name">Название</label>
                <input id="item-name" autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={sheet === "section" ? "Например, путешествия" : "Например, маршруты"} />
              </div>
            )}
          </form>
        </DraggableSheet>
      )}

      {profilePanel && (
        <DraggableSheet onClose={() => setProfilePanel(null)} tall={profilePanel === "account"}>
          {profilePanel === "account" ? (
            authUser ? (
              <PanelContent title="Аккаунт" onClose={() => setProfilePanel(null)}>
                <div className="account-card">
                  <span className="avatar compact-avatar"><Icon name="user" size={34} /></span>
                  <div><strong>{displayName}</strong><span>{displayUsername}</span><span>{authUser.email}</span></div>
                </div>
                <p className="panel-copy">Почта подтверждена через Supabase. Имя и никнейм используются в профиле приложения.</p>
                <button className="danger-button wide-button" onClick={async () => {
                  if (!supabase) return;
                  const { error } = await supabase.auth.signOut({ scope: "local" });
                  if (!error) setProfilePanel(null);
                  setToast(error ? error.message : "Вы вышли из аккаунта");
                }}>Выйти на этом устройстве</button>
              </PanelContent>
            ) : (
              <AuthPanel onClose={() => setProfilePanel(null)} onToast={setToast} />
            )
          ) : (
            <PanelContent
              title={{
                subscription: "Подписка",
                notifications: "Уведомления",
                privacy: "Конфиденциальность",
                language: "Язык",
                help: "Помощь",
                about: "О приложении",
              }[profilePanel]}
              onClose={() => setProfilePanel(null)}
            >
              {profilePanel === "subscription" && (
                <>
                  <div className="plan-card"><Icon name="crown" size={32} /><div><strong>Базовый план</strong><span>Все основные функции дневника доступны бесплатно.</span></div></div>
                  <p className="panel-copy">Синхронизация между устройствами и расширенные резервные копии появятся в следующей версии.</p>
                </>
              )}
              {profilePanel === "notifications" && (
                <div className="toggle-list">
                  <ToggleRow label="Напоминания" value={preferences.reminders} onChange={async () => {
                    if (!preferences.reminders && "Notification" in window && Notification.permission === "default") {
                      const permission = await Notification.requestPermission();
                      if (permission !== "granted") {
                        setToast("Уведомления не разрешены в системе");
                        return;
                      }
                    }
                    togglePreference("reminders");
                  }} />
                  <ToggleRow label="Итоги дня" value={preferences.dailySummary} onChange={() => togglePreference("dailySummary")} />
                  <ToggleRow label="Тактильный отклик" value={preferences.haptics} onChange={() => togglePreference("haptics")} />
                </div>
              )}
              {profilePanel === "privacy" && (
                <>
                  <div className="toggle-list">
                    <ToggleRow label="Скрывать текст записей" value={preferences.hidePreviews} onChange={() => togglePreference("hidePreviews")} />
                  </div>
                  <p className="panel-copy">Данные дневника хранятся локально на устройстве. Аккаунт Supabase используется только для регистрации и профиля.</p>
                </>
              )}
              {profilePanel === "language" && (
                <div className="choice-list">
                  {([
                    ["ru", "Русский"],
                    ["kk", "Қазақша"],
                    ["en", "English"],
                  ] as const).map(([code, label]) => (
                    <button key={code} className={`choice-row ${preferences.language === code ? "selected" : ""}`} onClick={() => {
                      setPreferences((current) => ({ ...current, language: code }));
                      document.documentElement.lang = code;
                      if (preferences.haptics) vibrate(12);
                    }}>
                      <span>{label}</span>{preferences.language === code && <span className="choice-check">✓</span>}
                    </button>
                  ))}
                  <p className="panel-copy">Интерфейс на казахском и английском будет переведён полностью в следующем обновлении; выбор уже сохраняется.</p>
                </div>
              )}
              {profilePanel === "help" && (
                <div className="help-list">
                  <p><strong>Перенос:</strong> удерживайте любую точку записи, затем двигайте вверх или вниз.</p>
                  <p><strong>Архив:</strong> смахните запись влево.</p>
                  <p><strong>Удаление:</strong> смахните вправо и подтвердите действие.</p>
                  <p><strong>Меню подраздела:</strong> удерживайте строку подраздела.</p>
                </div>
              )}
              {profilePanel === "about" && (
                <div className="about-panel">
                  <span className="empty-state-icon"><Icon name="pen" size={31} /></span>
                  <h2>Дневник 1.1</h2>
                  <p>Быстрое PWA-приложение для заметок, мыслей и проектов. Работает с телефона и устанавливается на главный экран.</p>
                </div>
              )}
            </PanelContent>
          )}
        </DraggableSheet>
      )}

      {dialog && (
        <div className="modal-layer centered" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            {dialog.kind === "delete-block" ? (
              <>
                <span className="dialog-icon danger-bg"><Icon name="trash" size={27} /></span>
                <h2 id="dialog-title">Удалить запись?</h2>
                <p>Это действие нельзя отменить. Запись будет удалена навсегда.</p>
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setDialog(null)}>Отмена</button>
                  <button className="danger-button" onClick={deleteBlock}>Удалить</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dialog-title">Новое название</h2>
                <label className="visually-hidden" htmlFor="rename-input">Название</label>
                <input id="rename-input" autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") renameTarget();
                }} />
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setDialog(null)}>Отмена</button>
                  <button className="primary-button compact" onClick={renameTarget}>Сохранить</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="screen-header">
      <button className="round-button back" onClick={onBack} aria-label="Назад"><Icon name="back" size={27} /></button>
      <h1>{title}</h1>
    </header>
  );
}

type SettingRow = { icon: IconName; label: string; accent: string; value?: string; onClick?: () => void };

function SettingsGroup({ rows }: { rows: SettingRow[] }) {
  return (
    <div className="settings-group">
      {rows.map((row, index) => (
        <button className="settings-row" onClick={row.onClick} key={row.label}>
          <span className={`tile-icon ${row.accent}`}><Icon name={row.icon} size={23} /></span>
          <span className="row-label">{row.label}</span>
          {row.value && <span className="row-value">{row.value}</span>}
          <Icon name="chevron" size={21} />
          {index < rows.length - 1 && <span className="row-divider" />}
        </button>
      ))}
    </div>
  );
}

function DraggableSheet({
  children,
  onClose,
  tall = false,
}: {
  children: ReactNode;
  onClose: () => void;
  tall?: boolean;
}) {
  const [expanded, setExpanded] = useState(tall);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const drag = useRef<{ y: number; pointerId: number } | null>(null);

  const finishDrag = () => {
    if (!drag.current) return;
    const finalOffset = offsetRef.current;
    if (finalOffset > 150 && !expanded) onClose();
    else if (finalOffset > 90 && expanded) setExpanded(false);
    else if (finalOffset < -55) setExpanded(true);
    offsetRef.current = 0;
    setOffset(0);
    drag.current = null;
  };

  return (
    <div className="modal-layer" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`bottom-sheet ${expanded ? "expanded" : ""}`}
        style={{ transform: `translateY(${offset}px)` }}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="sheet-drag-zone"
          aria-label={expanded ? "Свернуть панель" : "Развернуть панель"}
          onDoubleClick={() => setExpanded((current) => !current)}
          onPointerDown={(event) => {
            drag.current = { y: event.clientY, pointerId: event.pointerId };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || drag.current.pointerId !== event.pointerId) return;
            const delta = event.clientY - drag.current.y;
            const nextOffset = Math.max(expanded ? -24 : -180, Math.min(delta, window.innerHeight * 0.72));
            offsetRef.current = nextOffset;
            setOffset(nextOffset);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <span className="sheet-handle" />
        </button>
        <div className="sheet-scroll">{children}</div>
      </section>
    </div>
  );
}

function PanelContent({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="sheet-header panel-header">
        <button type="button" className="text-button muted-action" onClick={onClose}>Закрыть</button>
        <strong>{title}</strong>
        <span />
      </div>
      <div className="panel-body">{children}</div>
    </>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <button className="toggle-row" role="switch" aria-checked={value} onClick={onChange}>
      <span>{label}</span>
      <span className={`toggle ${value ? "on" : ""}`}><span /></span>
    </button>
  );
}

function AuthPanel({ onClose, onToast }: { onClose: () => void; onToast: (message: string) => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Supabase ещё не подключён. Добавьте URL проекта и publishable key.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Введите почту и пароль.");
      return;
    }
    if (mode === "register") {
      const normalizedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
        setError("Никнейм: 3–24 символа, латиница, цифры и _.");
        return;
      }
      if (fullName.trim().length < 2) {
        setError("Введите имя.");
        return;
      }
      if (password.length < 8) {
        setError("Пароль должен содержать не менее 8 символов.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Пароли не совпадают.");
        return;
      }
      setSubmitting(true);
      const { data: nicknameAvailable, error: nicknameError } = await supabase
        .rpc("is_username_available", { candidate_username: normalizedUsername });
      if (nicknameAvailable === false) {
        setSubmitting(false);
        setError("Этот никнейм уже занят.");
        return;
      }
      if (nicknameError) {
        console.warn("Username preflight check failed:", nicknameError.message);
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: normalizedUsername, full_name: fullName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError.message.includes("Database error")
          ? "Не удалось создать профиль. Проверьте SQL-схему Supabase или уникальность никнейма."
          : signUpError.message);
        return;
      }
      onToast(data.session ? "Аккаунт создан" : "Проверьте почту и подтвердите регистрацию");
      onClose();
      return;
    }

    setSubmitting(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (loginError) {
      setError("Не удалось войти. Проверьте почту и пароль.");
      return;
    }
    onToast("Вы вошли в аккаунт");
    onClose();
  };

  return (
    <form className="auth-panel" onSubmit={submitAuth}>
      <div className="sheet-header panel-header">
        <button type="button" className="text-button muted-action" onClick={onClose}>Закрыть</button>
        <strong>{mode === "register" ? "Регистрация" : "Вход"}</strong>
        <button type="submit" className="text-button" disabled={submitting}>{submitting ? "…" : "Готово"}</button>
      </div>
      <div className="auth-tabs" role="tablist">
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Регистрация</button>
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Вход</button>
      </div>
      {!isSupabaseConfigured && (
        <div className="config-note">
          Интерфейс готов. Для работы регистрации добавьте переменные Supabase на хостинге.
        </div>
      )}
      <div className="auth-fields">
        <label>Почта<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        {mode === "register" && (
          <>
            <label>Уникальный никнейм<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="nickname" /></label>
            <label>Имя<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ваше имя" /></label>
          </>
        )}
        <label>Пароль<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 8 символов" /></label>
        {mode === "register" && (
          <label>Подтверждение пароля<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Повторите пароль" /></label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button wide-button" disabled={submitting} type="submit">
          {submitting ? "Подождите…" : mode === "register" ? "Создать аккаунт" : "Войти"}
        </button>
      </div>
    </form>
  );
}

function SwipeBlock({
  block,
  index,
  hidePreview,
  onArchive,
  onDelete,
  onReorderStart,
  onReorderMove,
  onReorderEnd,
}: {
  block: Block;
  index: number;
  hidePreview: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onReorderStart: (index: number, pointerId: number) => void;
  onReorderMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onReorderEnd: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const offsetRef = useRef(0);
  const pointerId = useRef<number | null>(null);
  const gesture = useRef<"pending" | "swipe" | "scroll" | "reorder" | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const reset = () => {
    clearHold();
    pointerId.current = null;
    gesture.current = null;
    offsetRef.current = 0;
    setOffset(0);
    setDragging(false);
  };

  const finish = () => {
    const currentGesture = gesture.current;
    const currentOffset = offsetRef.current;
    if (currentGesture === "reorder") onReorderEnd();
    else if (currentGesture === "swipe" && currentOffset <= -88) {
      vibrate(18);
      onArchive();
    } else if (currentGesture === "swipe" && currentOffset >= 88) {
      vibrate(20);
      onDelete();
    }
    reset();
  };

  return (
    <div
      className={`swipe-wrap ${offset < 0 ? "swiping-left" : offset > 0 ? "swiping-right" : ""} ${dragging ? "dragging" : ""}`}
      data-block-index={index}
      data-block-id={block.id}
    >
      <div className="swipe-action archive-action"><Icon name="archive" /><span>В архив</span></div>
      <div className="swipe-action delete-action"><Icon name="trash" /><span>Удалить</span></div>
      <article
        className="note-block"
        style={{ transform: `translateX(${offset}px)` }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          start.current = { x: event.clientX, y: event.clientY };
          pointerId.current = event.pointerId;
          gesture.current = "pending";
          event.currentTarget.setPointerCapture(event.pointerId);
          holdTimer.current = setTimeout(() => {
            gesture.current = "reorder";
            setDragging(true);
            onReorderStart(index, event.pointerId);
          }, 390);
        }}
        onPointerMove={(event) => {
          if (pointerId.current !== event.pointerId || !gesture.current) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (gesture.current === "pending" && Math.hypot(dx, dy) > 9) {
            clearHold();
            gesture.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? "swipe" : "scroll";
          }
          if (gesture.current === "swipe") {
            const next = Math.max(-132, Math.min(132, dx));
            offsetRef.current = next;
            setOffset(next);
          } else if (gesture.current === "reorder") {
            onReorderMove(event);
          }
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          if (gesture.current === "reorder") onReorderEnd();
          reset();
        }}
      >
        <div className="note-meta">
          <span>{block.createdAt}</span>
          <span className="hold-hint"><Icon name="grip" size={18} />Удерживайте для переноса</span>
        </div>
        <h2>{block.title}</h2>
        <p>{hidePreview ? "Текст скрыт настройками конфиденциальности" : block.body}</p>
      </article>
    </div>
  );
}
