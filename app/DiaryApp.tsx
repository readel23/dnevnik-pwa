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
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isSupabaseConfigured, supabase } from "./supabase";
import ProjectModule from "./ProjectModule";
import type { EnabledModules, Project } from "./project-types";
import { emptyProjects } from "./project-types";
import {
  CloudState,
  loadCloudState,
  saveCloudState,
  subscribeToCloudState,
} from "./cloud-sync";
import { translateUiText } from "./i18n";

type IconName =
  | "plus" | "user" | "more" | "chevron" | "back" | "checklist"
  | "folder" | "cube" | "pen" | "train" | "heart" | "bulb"
  | "message" | "cart" | "clapper" | "archive" | "edit" | "trash"
  | "moon" | "globe" | "download" | "help" | "info" | "logout"
  | "bell" | "shield" | "crown" | "grip" | "restore" | "sun" | "search"
  | "eye" | "eyeOff";

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
  search: ["m21 21-4.35-4.35", "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  eyeOff: ["m3 3 18 18", "M10.6 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a15.8 15.8 0 0 1-2.1 3.1", "M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.5 4.5-1.2", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
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
  titleColor?: TitleColor;
};

type TitleColor = "green" | "blue" | "purple" | "orange" | "pink" | "neutral";

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
const cloudCacheKey = "diary-pwa-cloud-state-v2";
const legacyOwnerKey = "diary-pwa-legacy-owner";
const themes = ["dark", "light", "system"] as const;
type Theme = typeof themes[number];
type ProfilePanel = "account" | "modules" | "subscription" | "notifications" | "privacy" | "language" | "help" | "about";
type Preferences = {
  haptics: boolean;
  reminders: boolean;
  dailySummary: boolean;
  hidePreviews: boolean;
  language: "ru" | "en";
};

const defaultPreferences: Preferences = {
  haptics: true,
  reminders: false,
  dailySummary: false,
  hidePreviews: false,
  language: "ru",
};

const defaultModules: EnabledModules = {
  notes: true,
  projects: false,
};

type UserCloudState = CloudState<AppData, Preferences, Theme>;
type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

const subsectionIconOptions: Array<{ icon: IconName; accent: string; label: string }> = [
  { icon: "folder", accent: "blue", label: "Папка" },
  { icon: "checklist", accent: "amber", label: "Задачи" },
  { icon: "pen", accent: "green", label: "Записи" },
  { icon: "bulb", accent: "amber", label: "Идеи" },
  { icon: "heart", accent: "pink", label: "Личное" },
  { icon: "cube", accent: "purple", label: "Проект" },
  { icon: "message", accent: "blue", label: "Мысли" },
  { icon: "cart", accent: "green", label: "Покупки" },
  { icon: "clapper", accent: "purple", label: "Видео" },
  { icon: "train", accent: "orange", label: "Поездки" },
  { icon: "archive", accent: "gray", label: "Разное" },
];

const titleColorOptions: Array<{ value: TitleColor; label: string }> = [
  { value: "green", label: "Зелёный" },
  { value: "blue", label: "Синий" },
  { value: "purple", label: "Фиолетовый" },
  { value: "orange", label: "Оранжевый" },
  { value: "pink", label: "Розовый" },
  { value: "neutral", label: "Обычный" },
];

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
  const [data, setData] = useState<AppData>({ sections: [] });
  const [projects, setProjects] = useState<Project[]>(emptyProjects);
  const [modules, setModules] = useState<EnabledModules>(defaultModules);
  const [appMode, setAppMode] = useState<"notes" | "projects">("notes");
  const [cloudReady, setCloudReady] = useState(false);
  const [, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncRevision, setSyncRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [view, setView] = useState<"home" | "profile" | "subsection" | "archive">("home");
  const [active, setActive] = useState<{ sectionId: string; subsectionId: string } | null>(null);
  const [menu, setMenu] = useState<{ type: "section" | "subsection"; sectionId: string; subsectionId?: string; x: number; y: number } | null>(null);
  const [sheet, setSheet] = useState<"section" | "subsection" | "block" | null>(null);
  const [dialog, setDialog] = useState<{
    kind: "rename-section" | "rename-subsection" | "delete-section" | "delete-subsection" | "delete-block";
    sectionId?: string;
    subsectionId?: string;
    blockId?: string;
    label?: string;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftIcon, setDraftIcon] = useState<IconName>("folder");
  const [draftAccent, setDraftAccent] = useState("blue");
  const [draftTitleColor, setDraftTitleColor] = useState<TitleColor>("green");
  const [sheetSectionId, setSheetSectionId] = useState<string | null>(null);
  const [profilePanel, setProfilePanel] = useState<ProfilePanel | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [archiveScope, setArchiveScope] = useState<"active" | "all">("all");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [desktopQuery, setDesktopQuery] = useState("");
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const authUserIdRef = useRef<string | null>(null);
  const applyingCloudSignatureRef = useRef("");
  const latestCloudTimestampRef = useRef("");
  const moduleSwipeRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const appShellRef = useRef<HTMLDivElement>(null);
  const dragSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 9 } }),
  );

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
    if ("serviceWorker" in navigator) {
      const serviceWorkerUrl = new URL("sw.js", document.baseURI);
      navigator.serviceWorker.register(serviceWorkerUrl.pathname).catch(() => undefined);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateVisualViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      document.documentElement.style.setProperty("--visual-viewport-height", `${height}px`);
      document.documentElement.style.setProperty("--visual-viewport-top", `${top}px`);
    };
    updateVisualViewport();
    viewport?.addEventListener("resize", updateVisualViewport);
    viewport?.addEventListener("scroll", updateVisualViewport);
    window.addEventListener("resize", updateVisualViewport);
    return () => {
      viewport?.removeEventListener("resize", updateVisualViewport);
      viewport?.removeEventListener("scroll", updateVisualViewport);
      window.removeEventListener("resize", updateVisualViewport);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: sessionData }) => {
      authUserIdRef.current = sessionData.session?.user.id ?? null;
      setAuthUser(sessionData.session?.user ?? null);
    }).finally(() => setAuthReady(true));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (authUserIdRef.current !== nextUserId) setCloudReady(false);
      authUserIdRef.current = nextUserId;
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated || !authUser || !supabase) {
      return;
    }

    const cloudClient = supabase;
    const userCacheKey = `${cloudCacheKey}:${authUser.id}`;
    let disposed = false;
    let channel: ReturnType<typeof subscribeToCloudState<UserCloudState>> = null;

    const applyRemoteState = (remote: UserCloudState) => {
      if (!remote || remote.version !== 2) return;
      const signature = JSON.stringify(remote);
      applyingCloudSignatureRef.current = signature;
      localStorage.setItem(userCacheKey, signature);
      setData(remote.notes || { sections: [] });
      setProjects(Array.isArray(remote.projects) ? remote.projects : []);
      setModules({ ...defaultModules, ...(remote.modules || {}) });
      setPreferences({ ...defaultPreferences, ...(remote.preferences || {}) });
      if (remote.theme && themes.includes(remote.theme)) setTheme(remote.theme);
    };

    const startCloud = async () => {
      setSyncStatus(navigator.onLine ? "saving" : "offline");
      const { record, error } = await loadCloudState<UserCloudState>(authUser);
      if (disposed) return;
      if (error) {
        setSyncStatus(navigator.onLine ? "error" : "offline");
      } else if (record?.state?.version === 2) {
        latestCloudTimestampRef.current = record.updated_at;
        applyRemoteState(record.state);
        setSyncStatus("saved");
      } else {
        const cachedForUser = localStorage.getItem(userCacheKey);
        const legacyOwner = localStorage.getItem(legacyOwnerKey);
        const canMigrateLegacy = !legacyOwner || legacyOwner === authUser.id;
        const seed: UserCloudState = cachedForUser
          ? JSON.parse(cachedForUser)
          : {
              version: 2,
              notes: canMigrateLegacy ? data : { sections: [] },
              projects: canMigrateLegacy ? projects : [],
              modules: canMigrateLegacy ? modules : defaultModules,
              preferences: canMigrateLegacy ? preferences : defaultPreferences,
              theme: canMigrateLegacy ? theme : "dark",
            };
        applyRemoteState(seed);
        const result = await saveCloudState(authUser, seed);
        if (disposed) return;
        localStorage.setItem(userCacheKey, JSON.stringify(seed));
        if (!legacyOwner) localStorage.setItem(legacyOwnerKey, authUser.id);
        setSyncStatus(result.error ? "error" : "saved");
      }

      channel = subscribeToCloudState<UserCloudState>(authUser, (record) => {
        if (!record.state || record.updated_at <= latestCloudTimestampRef.current) return;
        latestCloudTimestampRef.current = record.updated_at;
        applyRemoteState(record.state);
        setSyncStatus("saved");
      });
      setCloudReady(true);
    };

    startCloud();
    return () => {
      disposed = true;
      if (channel) cloudClient.removeChannel(channel);
    };
    // Initial local state is intentionally captured once after authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated || !authUser) return;
    const cached: UserCloudState = { version: 2, notes: data, projects, modules, preferences, theme };
    localStorage.setItem(`${cloudCacheKey}:${authUser.id}`, JSON.stringify(cached));
  }, [authUser, data, hydrated, modules, preferences, projects, theme]);

  useEffect(() => {
    if (!cloudReady || !authUser || !supabase) return;
    const nextState: UserCloudState = { version: 2, notes: data, projects, modules, preferences, theme };
    const signature = JSON.stringify(nextState);
    if (signature === applyingCloudSignatureRef.current) {
      applyingCloudSignatureRef.current = "";
      return;
    }

    if (!navigator.onLine) {
      queueMicrotask(() => setSyncStatus("offline"));
      return;
    }
    queueMicrotask(() => setSyncStatus("saving"));
    const timer = window.setTimeout(async () => {
      const result = await saveCloudState(authUser, nextState);
      if (result.error) {
        setSyncStatus(navigator.onLine ? "error" : "offline");
      } else {
        latestCloudTimestampRef.current = new Date().toISOString();
        setSyncStatus("saved");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [authUser, cloudReady, data, modules, preferences, projects, syncRevision, theme]);

  useEffect(() => {
    const online = () => {
      setSyncStatus("saving");
      setSyncRevision((value) => value + 1);
    };
    const offline = () => setSyncStatus("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

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

  useEffect(() => {
    const root = appShellRef.current;
    if (!root) return;
    document.documentElement.lang = preferences.language;
    const originalText = new Map<Text, string>();
    const originalAttributes = new Map<Element, Map<string, string>>();
    const attributes = ["placeholder", "aria-label", "title"];

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        if (!originalText.has(textNode)) originalText.set(textNode, textNode.data);
        const next = translateUiText(originalText.get(textNode) || "", preferences.language);
        if (textNode.data !== next) textNode.data = next;
        return;
      }
      if (!(node instanceof Element)) return;
      for (const attribute of attributes) {
        const value = node.getAttribute(attribute);
        if (!value) continue;
        if (!originalAttributes.has(node)) originalAttributes.set(node, new Map());
        const values = originalAttributes.get(node)!;
        if (!values.has(attribute)) values.set(attribute, value);
        const next = translateUiText(values.get(attribute) || "", preferences.language);
        if (value !== next) node.setAttribute(attribute, next);
      }
      node.childNodes.forEach(translateNode);
    };

    translateNode(root);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target);
        mutation.addedNodes.forEach(translateNode);
      }
    });
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      originalText.forEach((value, node) => {
        if (node.isConnected) node.data = value;
      });
      originalAttributes.forEach((values, element) => {
        if (!element.isConnected) return;
        values.forEach((value, attribute) => element.setAttribute(attribute, value));
      });
    };
  }, [preferences.language]);

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
  const normalizedDesktopQuery = desktopQuery.trim().toLowerCase();
  const visibleSections = normalizedDesktopQuery
    ? data.sections
      .map((sectionItem) => {
        if (sectionItem.name.toLowerCase().includes(normalizedDesktopQuery)) return sectionItem;
        return {
          ...sectionItem,
          subsections: sectionItem.subsections.filter((subsectionItem) =>
            subsectionItem.name.toLowerCase().includes(normalizedDesktopQuery)
            || subsectionItem.blocks.some((block) =>
              `${block.title} ${block.body}`.toLowerCase().includes(normalizedDesktopQuery)),
          ),
        };
      })
      .filter((sectionItem) => sectionItem.subsections.length > 0)
    : data.sections;

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

  const menuPosition = (x: number, y: number, rows: number) => {
    const width = Math.min(280, window.innerWidth - 32);
    const height = rows * 54 + 2;
    return {
      x: Math.max(16, Math.min(x, window.innerWidth - width - 16)),
      y: Math.max(12, Math.min(y, window.innerHeight - height - 12)),
    };
  };

  const showMenu = (event: ReactPointerEvent<HTMLButtonElement>, payload: Omit<NonNullable<typeof menu>, "x" | "y">) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = menuPosition(rect.right - 280, rect.bottom + 4, payload.type === "section" ? 3 : 2);
    setMenu({ ...payload, ...position });
  };

  const startLongPress = (event: ReactPointerEvent<HTMLButtonElement>, sectionId: string, subsectionId: string) => {
    longPressedRef.current = false;
    const x = event.clientX;
    const y = event.clientY;
    longPressRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (preferences.haptics) vibrate(25);
      const position = menuPosition(x - 140, y + 14, 2);
      setMenu({ type: "subsection", sectionId, subsectionId, ...position });
      document.getSelection()?.removeAllRanges();
    }, 340);
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
          subsections: [...item.subsections, {
            id: uid("subsection"),
            name: draftName.trim(),
            icon: draftIcon,
            accent: draftAccent,
            blocks: [],
            archived: [],
          }],
        } : item),
      }));
      setToast("Подраздел добавлен");
    }
    if (sheet === "block" && active && (draftTitle.trim() || draftBody.trim())) {
      mutateSubsection(active.sectionId, active.subsectionId, (current) => ({
        ...current,
        blocks: [{
          id: uid("block"),
          title: draftTitle.trim(),
          body: draftBody.trim(),
          createdAt: todayLabel(),
          titleColor: draftTitleColor,
        }, ...current.blocks],
      }));
      setToast("Запись сохранена");
    }
    setSheet(null);
    setMenu(null);
    setDraftName("");
    setDraftTitle("");
    setDraftBody("");
    setDraftIcon("folder");
    setDraftAccent("blue");
    setDraftTitleColor("green");
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

  const deleteBlock = (blockId: string) => {
    if (!active) return;
    mutateSubsection(active.sectionId, active.subsectionId, (current) => ({
      ...current,
      blocks: current.blocks.filter((item) => item.id !== blockId),
    }));
    setToast("Запись удалена");
  };

  const restoreBlock = (sectionId: string, subsectionId: string, blockId: string) => {
    mutateSubsection(sectionId, subsectionId, (current) => {
      const target = current.archived.find((item) => item.id === blockId);
      return target ? { ...current, archived: current.archived.filter((item) => item.id !== blockId), blocks: [target, ...current.blocks] } : current;
    });
    setToast("Запись восстановлена");
  };

  const beginDrag = () => {
    document.body.classList.add("is-reordering");
    document.getSelection()?.removeAllRanges();
    if (preferences.haptics) vibrate(24);
  };

  const finishBlockDrag = (event: DragEndEvent) => {
    document.body.classList.remove("is-reordering");
    document.getSelection()?.removeAllRanges();
    if (!active || !event.over || event.active.id === event.over.id) return;
    mutateSubsection(active.sectionId, active.subsectionId, (current) => {
      const oldIndex = current.blocks.findIndex((item) => item.id === event.active.id);
      const newIndex = current.blocks.findIndex((item) => item.id === event.over?.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return { ...current, blocks: arrayMove(current.blocks, oldIndex, newIndex) };
    });
    if (preferences.haptics) vibrate(12);
  };

  const finishSectionDrag = (event: DragEndEvent) => {
    document.body.classList.remove("is-reordering");
    document.getSelection()?.removeAllRanges();
    if (!event.over || event.active.id === event.over.id) return;
    setData((current) => {
      const oldIndex = current.sections.findIndex((item) => item.id === event.active.id);
      const newIndex = current.sections.findIndex((item) => item.id === event.over?.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return { sections: arrayMove(current.sections, oldIndex, newIndex) };
    });
    if (preferences.haptics) vibrate(12);
  };

  const cancelDrag = () => {
    document.body.classList.remove("is-reordering");
    document.getSelection()?.removeAllRanges();
  };

  const confirmDelete = () => {
    if (!dialog) return;
    if (dialog.kind === "delete-section" && dialog.sectionId) removeSection(dialog.sectionId);
    if (dialog.kind === "delete-subsection" && dialog.sectionId && dialog.subsectionId) {
      removeSubsection(dialog.sectionId, dialog.subsectionId);
    }
    if (dialog.kind === "delete-block" && dialog.blockId) deleteBlock(dialog.blockId);
    setDialog(null);
  };

  const togglePreference = (key: keyof Omit<Preferences, "language">) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    if (preferences.haptics) vibrate(12);
  };

  const toggleModule = (key: keyof EnabledModules) => {
    const other: keyof EnabledModules = key === "notes" ? "projects" : "notes";
    if (modules[key] && !modules[other]) {
      setToast("Хотя бы один модуль должен оставаться включённым");
      return;
    }
    setModules((current) => ({ ...current, [key]: !current[key] }));
    if (modules[key] && appMode === key) setAppMode(other);
    setToast(modules[key] ? "Модуль выключен" : "Модуль включён");
    if (preferences.haptics) vibrate(12);
  };

  const startModuleSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== "touch"
      || (event.target as HTMLElement).closest("button, input, textarea, select, [role='dialog'], .sortable-section")
    ) return;
    moduleSwipeRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  };

  const finishModuleSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const start = moduleSwipeRef.current;
    moduleSwipeRef.current = null;
    if (!start || start.pointerId !== event.pointerId || !modules.projects) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (dx < -72 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      setAppMode("projects");
      if (preferences.haptics) vibrate(10);
    }
  };

  if (!hydrated || !authReady || (authUser && supabase && !cloudReady)) {
    return <div className="app-loading" aria-label="Загрузка"><span /></div>;
  }

  if (!authUser) {
    return <AuthGate onToast={setToast} />;
  }

  return (
    <div ref={appShellRef} className="app-shell desktop-workspace-shell" onPointerDown={(event) => {
      if (menu && !(event.target as HTMLElement).closest(".context-menu, .more-button")) setMenu(null);
    }}>
      <a className="skip-link" href="#app-main">К основному содержимому</a>
      <DesktopSidebar
        active={view === "profile" ? "profile" : view === "archive" ? "archive" : view === "home" ? appMode : "notes"}
        modules={modules}
        displayName={displayName}
        displayUsername={displayUsername}
        onNotes={() => {
          setAppMode("notes");
          goHome();
        }}
        onProjects={() => {
          setAppMode("projects");
          goHome();
        }}
        onProfile={() => setView("profile")}
        onArchive={() => {
          setArchiveScope("all");
          setView("archive");
        }}
      />
      {view === "home" && appMode === "notes" && modules.notes && (
        <main
          id="app-main"
          className="screen home-screen"
          onPointerDown={startModuleSwipe}
          onPointerUp={finishModuleSwipe}
          onPointerCancel={() => { moduleSwipeRef.current = null; }}
        >
          <header className="home-header">
            <div>
              <p className="eyebrow">{todayLabel()}</p>
              <h1><span className="mobile-page-title">Дневник</span><span className="desktop-page-title">Дневник</span></h1>
            </div>
            <label className="desktop-top-search">
              <span className="visually-hidden">Поиск по дневнику</span>
              <Icon name="search" size={19} />
              <input value={desktopQuery} onChange={(event) => setDesktopQuery(event.target.value)} placeholder="Поиск" />
            </label>
            <div className="header-actions">
              <button className="round-button desktop-primary-action" aria-label="Создать раздел" onClick={() => { setSheet("section"); setDraftName(""); }}>
                <Icon name="plus" size={27} />
                <span>Новый раздел</span>
              </button>
              <button className="round-button mobile-profile-action" aria-label="Открыть профиль" onClick={() => setView("profile")}>
                <Icon name="user" size={26} />
              </button>
            </div>
          </header>

          {modules.projects && (
            <div className="module-switcher" role="tablist" aria-label="Модули приложения">
              <button className="active" role="tab" aria-selected="true"><Icon name="pen" size={18} />Заметки</button>
              <button role="tab" aria-selected="false" onClick={() => setAppMode("projects")}><Icon name="cube" size={18} />Проекты</button>
            </div>
          )}

          {data.sections.length === 0 ? (
            <div className="home-empty-state">
              <span className="empty-state-icon"><Icon name="pen" size={31} /></span>
              <h2>Начните создавать свой дневник</h2>
              <p>Добавьте первый раздел, а внутри него — подразделы для мыслей, планов и проектов.</p>
              <button className="primary-button" onClick={() => {
                setDraftName("");
                setSheet("section");
              }}><Icon name="plus" size={20} />Создать раздел</button>
            </div>
          ) : visibleSections.length === 0 ? (
            <div className="home-empty-state desktop-search-empty">
              <span className="empty-state-icon"><Icon name="search" size={30} /></span>
              <h2>Ничего не найдено</h2>
              <p>Попробуйте изменить запрос или очистить поиск.</p>
              <button className="secondary-button" onClick={() => setDesktopQuery("")}>Очистить поиск</button>
            </div>
          ) : (
            <DndContext
              sensors={dragSensors}
              collisionDetection={closestCenter}
              autoScroll={{ threshold: { x: 0.12, y: 0.18 }, acceleration: 12, interval: 5 }}
              onDragStart={beginDrag}
              onDragCancel={cancelDrag}
              onDragEnd={finishSectionDrag}
            >
              <SortableContext items={visibleSections.map((item) => item.id)} strategy={rectSortingStrategy}>
                <div className="section-list">
                  {visibleSections.map((sectionItem) => (
                    <SortableSection id={sectionItem.id} key={sectionItem.id}>
                      {(sortable) => (
                        <>
                          <div className="section-heading">
                            <h2>{sectionItem.name}</h2>
                            <button
                              className={`section-collapse-button ${collapsedSections.has(sectionItem.id) ? "collapsed" : ""}`}
                              aria-label={`${collapsedSections.has(sectionItem.id) ? "Развернуть" : "Свернуть"} раздел ${sectionItem.name}`}
                              aria-expanded={!collapsedSections.has(sectionItem.id)}
                              onClick={() => setCollapsedSections((current) => {
                                const next = new Set(current);
                                if (next.has(sectionItem.id)) next.delete(sectionItem.id);
                                else next.add(sectionItem.id);
                                return next;
                              })}
                            >
                              <Icon name="chevron" size={19} />
                            </button>
                            <button
                              className="section-drag-handle"
                              aria-label={`Переместить раздел ${sectionItem.name}`}
                              {...sortable.attributes}
                              {...sortable.listeners}
                            >
                              <Icon name="grip" size={20} />
                            </button>
                            <button
                              className="icon-button more-button"
                              aria-label={`Меню раздела ${sectionItem.name}`}
                              aria-expanded={menu?.type === "section" && menu.sectionId === sectionItem.id}
                              onPointerDown={(event) => showMenu(event, { type: "section", sectionId: sectionItem.id })}
                            >
                              <Icon name="more" />
                            </button>
                          </div>
                          <div className={`subsection-card section-collapsible ${collapsedSections.has(sectionItem.id) ? "collapsed" : ""} ${sectionItem.subsections.length === 0 ? "empty-card" : ""}`}>
                            <div className="section-collapsible-inner">
                            {sectionItem.subsections.length === 0 ? (
                              <button className="empty-section" onClick={() => {
                                setSheetSectionId(sectionItem.id);
                                setDraftIcon("folder");
                                setDraftAccent("blue");
                                setSheet("subsection");
                              }}>
                                <Icon name="plus" size={20} />
                                Добавить первый подраздел
                              </button>
                            ) : sectionItem.subsections.map((sub, index) => (
                              <button
                                className="subsection-row"
                                key={sub.id}
                                onContextMenu={(event) => event.preventDefault()}
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
                          </div>
                        </>
                      )}
                    </SortableSection>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {data.sections.length > 0 && <p className="gesture-hint">Удерживайте подраздел для меню · перетаскивайте разделы за точки</p>}
        </main>
      )}

      {view === "home" && appMode === "projects" && modules.projects && (
        <ProjectModule
          projects={projects}
          onChange={setProjects}
          onProfile={() => setView("profile")}
          onNotes={() => setAppMode("notes")}
          notesEnabled={modules.notes}
          haptics={preferences.haptics}
        />
      )}

      {view === "profile" && (
        <main id="app-main" className="screen profile-screen">
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
            { icon: "cube", label: "Модули", accent: "green", value: `${Number(modules.notes) + Number(modules.projects)} из 2`, onClick: () => setProfilePanel("modules") },
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
              value: preferences.language === "ru" ? "Русский" : "English",
              onClick: () => setProfilePanel("language"),
            },
            { icon: "archive", label: "Архив", accent: "orange", value: allArchiveEntries.length ? String(allArchiveEntries.length) : undefined, onClick: () => {
              setArchiveScope("all");
              setView("archive");
            } },
            { icon: "download", label: "Экспорт данных", accent: "green", onClick: () => {
              const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data, projects, modules, preferences }, null, 2)], { type: "application/json" });
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
            { icon: "info", label: "О приложении", accent: "blue", value: "v2.0", onClick: () => setProfilePanel("about") },
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
        <main id="app-main" className="screen subsection-screen">
          <ContentHeader
            onBack={goHome}
            title={<><span>{section.name}</span><Icon name="chevron" size={19} /><strong>{subsection.name}</strong></>}
            action={
            <button className="archive-link" onClick={() => {
              setArchiveScope("active");
              setView("archive");
            }}>Архив{subsection.archived.length ? ` · ${subsection.archived.length}` : ""}</button>
            }
          />
          {subsection.blocks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon"><Icon name="pen" size={31} /></span>
              <h2>Начните с первой записи</h2>
              <p>Запишите мысль, план или список дел. Заголовок можно оставить пустым.</p>
              <button className="primary-button" onClick={() => setSheet("block")}><Icon name="plus" size={20} />Создать запись</button>
            </div>
          ) : (
            <DndContext
              sensors={dragSensors}
              collisionDetection={closestCenter}
              autoScroll={{ threshold: { x: 0.12, y: 0.18 }, acceleration: 12, interval: 5 }}
              onDragStart={beginDrag}
              onDragCancel={cancelDrag}
              onDragEnd={finishBlockDrag}
            >
              <SortableContext items={subsection.blocks.map((item) => item.id)} strategy={rectSortingStrategy}>
                <div className="blocks-list">
                  {subsection.blocks.map((block) => (
                    <SortableSwipeBlock
                      block={block}
                      key={block.id}
                      hidePreview={preferences.hidePreviews}
                      onArchive={() => archiveBlock(block.id)}
                      onDelete={() => setDialog({ kind: "delete-block", blockId: block.id, label: block.title || "эту запись" })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <button className="floating-add" aria-label="Создать запись" onClick={() => {
            setDraftTitle("");
            setDraftBody("");
            setDraftTitleColor("green");
            setSheet("block");
          }}>
            <Icon name="plus" size={29} />
          </button>
        </main>
      )}

      {view === "archive" && (
        <main id="app-main" className="screen archive-screen">
          <ContentHeader
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
                <div>
                  <span>{sectionItem.name} · {sub.name}</span>
                  {block.title && <h2 className={`title-${block.titleColor || "green"}`}>{block.title}</h2>}
                  <p>{preferences.hidePreviews ? "Текст скрыт настройками конфиденциальности" : block.body}</p>
                </div>
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
            setDraftIcon("folder");
            setDraftAccent("blue");
            setSheetSectionId(menu.sectionId);
            setSheet("subsection");
          }}><Icon name="plus" size={21} />Добавить подраздел</button>}
          <button role="menuitem" className="danger" onClick={() => {
            if (menu.type === "section") {
              const currentSection = data.sections.find((item) => item.id === menu.sectionId);
              setDialog({ kind: "delete-section", sectionId: menu.sectionId, label: currentSection?.name });
            } else if (menu.subsectionId) {
              const currentSubsection = data.sections
                .find((item) => item.id === menu.sectionId)
                ?.subsections.find((item) => item.id === menu.subsectionId);
              setDialog({
                kind: "delete-subsection",
                sectionId: menu.sectionId,
                subsectionId: menu.subsectionId,
                label: currentSubsection?.name,
              });
            }
            setMenu(null);
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
                {draftTitle.trim() && (
                  <div className="title-color-picker" role="group" aria-label="Цвет заголовка">
                    {titleColorOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`color-swatch title-${option.value} ${draftTitleColor === option.value ? "selected" : ""}`}
                        aria-label={option.label}
                        aria-pressed={draftTitleColor === option.value}
                        onClick={() => setDraftTitleColor(option.value)}
                      />
                    ))}
                  </div>
                )}
                <textarea id="block-body" aria-label="Текст записи" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="Начните писать…" />
              </div>
            ) : (
              <>
                <div className="name-field">
                  <label htmlFor="item-name">Название</label>
                  <input id="item-name" autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={sheet === "section" ? "Например, путешествия" : "Например, маршруты"} />
                </div>
                {sheet === "subsection" && (
                  <fieldset className="icon-picker">
                    <legend>Иконка подраздела</legend>
                    <div>
                      {subsectionIconOptions.map((option) => (
                        <button
                          type="button"
                          key={`${option.icon}-${option.label}`}
                          className={`icon-choice ${draftIcon === option.icon ? "selected" : ""}`}
                          aria-label={option.label}
                          aria-pressed={draftIcon === option.icon}
                          onClick={() => {
                            setDraftIcon(option.icon);
                            setDraftAccent(option.accent);
                            if (preferences.haptics) vibrate(8);
                          }}
                        >
                          <span className={`tile-icon ${option.accent}`}><Icon name={option.icon} size={22} /></span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
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
                modules: "Модули",
                subscription: "Подписка",
                notifications: "Уведомления",
                privacy: "Конфиденциальность",
                language: "Язык",
                help: "Помощь",
                about: "О приложении",
              }[profilePanel]}
              onClose={() => setProfilePanel(null)}
            >
              {profilePanel === "modules" && (
                <>
                  <p className="panel-copy panel-intro">Оставьте только те инструменты, которыми пользуетесь. Данные выключенного модуля сохраняются и вернутся после повторного включения.</p>
                  <div className="module-settings">
                    <div>
                      <span className="tile-icon green"><Icon name="pen" /></span>
                      <span><strong>Дневник заметок</strong><small>Разделы, записи, архив и свободные блоки</small></span>
                      <button
                        className="module-toggle-control"
                        role="switch"
                        aria-checked={modules.notes}
                        onClick={() => toggleModule("notes")}
                      ><span className={`toggle ${modules.notes ? "on" : ""}`}><span /></span></button>
                    </div>
                    <div>
                      <span className="tile-icon purple"><Icon name="cube" /></span>
                      <span><strong>Ведение проектов</strong><small>Доска задач, блочные заметки и документы</small></span>
                      <button
                        className="module-toggle-control"
                        role="switch"
                        aria-checked={modules.projects}
                        onClick={() => toggleModule("projects")}
                      ><span className={`toggle ${modules.projects ? "on" : ""}`}><span /></span></button>
                    </div>
                  </div>
                  <p className="panel-copy">Хотя бы один модуль всегда должен оставаться включённым.</p>
                </>
              )}
              {profilePanel === "subscription" && (
                <>
                  <div className="plan-card"><Icon name="crown" size={32} /><div><strong>Базовый план</strong><span>Все основные функции дневника доступны бесплатно.</span></div></div>
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
                </>
              )}
              {profilePanel === "language" && (
                <div className="choice-list">
                  {([
                    ["ru", "Русский"],
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
                  <p>Удобное приложение для заметок, мыслей и проектов на телефоне и компьютере.</p>
                </div>
              )}
            </PanelContent>
          )}
        </DraggableSheet>
      )}

      {dialog && (
        <div className="modal-layer centered" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            {dialog.kind.startsWith("delete-") ? (
              <>
                <span className="dialog-icon danger-bg"><Icon name="trash" size={27} /></span>
                <h2 id="dialog-title">
                  {dialog.kind === "delete-section"
                    ? "Удалить раздел?"
                    : dialog.kind === "delete-subsection"
                      ? "Удалить подраздел?"
                      : "Удалить запись?"}
                </h2>
                <p>
                  {dialog.kind === "delete-section"
                    ? `Раздел «${dialog.label || "Без названия"}» и все записи внутри будут удалены навсегда.`
                    : dialog.kind === "delete-subsection"
                      ? `Подраздел «${dialog.label || "Без названия"}» и все его записи будут удалены навсегда.`
                      : "Это действие нельзя отменить. Запись будет удалена навсегда."}
                </p>
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setDialog(null)}>Отмена</button>
                  <button className="danger-button" onClick={confirmDelete}>Удалить</button>
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

function ContentHeader({
  title,
  onBack,
  action,
}: {
  title: ReactNode;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="content-header unified-content-header">
      <button className="project-back" onClick={onBack} aria-label="Назад">
        <Icon name="back" size={25} />
      </button>
      <div className="content-header-title">{title}</div>
      <div className="content-header-action">{action}</div>
    </header>
  );
}

function DesktopSidebar({
  active,
  modules,
  displayName,
  displayUsername,
  onNotes,
  onProjects,
  onProfile,
  onArchive,
}: {
  active: "notes" | "projects" | "archive" | "profile";
  modules: EnabledModules;
  displayName: string;
  displayUsername: string;
  onNotes: () => void;
  onProjects: () => void;
  onProfile: () => void;
  onArchive: () => void;
}) {
  return (
    <aside className="desktop-sidebar" aria-label="Основная навигация">
      <div className="desktop-brand">
        <span><Icon name="pen" size={20} /></span>
        <strong>Дневник</strong>
      </div>
      <nav className="desktop-nav">
        <p>Рабочее пространство</p>
        {modules.notes && (
          <button className={active === "notes" ? "active" : ""} aria-current={active === "notes" ? "page" : undefined} onClick={onNotes}>
            <Icon name="pen" size={20} /><span>Заметки</span>
          </button>
        )}
        {modules.projects && (
          <button className={active === "projects" ? "active" : ""} aria-current={active === "projects" ? "page" : undefined} onClick={onProjects}>
            <Icon name="cube" size={20} /><span>Проекты</span>
          </button>
        )}
        <button className={active === "archive" ? "active" : ""} aria-current={active === "archive" ? "page" : undefined} onClick={onArchive}>
          <Icon name="archive" size={20} /><span>Архив</span>
        </button>
        <button className={active === "profile" ? "active" : ""} aria-current={active === "profile" ? "page" : undefined} onClick={onProfile}>
          <Icon name="shield" size={20} /><span>Настройки</span>
        </button>
      </nav>
      <button className={`desktop-account ${active === "profile" ? "active" : ""}`} onClick={onProfile}>
        <span className="desktop-avatar"><Icon name="user" size={20} /></span>
        <span><strong>{displayName}</strong><small>{displayUsername}</small></span>
        <Icon name="chevron" size={18} />
      </button>
    </aside>
  );
}

type SortableRenderState = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;

/* eslint-disable react-hooks/refs -- dnd-kit intentionally exposes bindings consumed while rendering sortable nodes. */
function SortableSection({
  id,
  children,
}: {
  id: string;
  children: (sortable: SortableRenderState) => ReactNode;
}) {
  const sortable = useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={`diary-section sortable-section ${sortable.isDragging ? "is-dragging" : ""}`}
    >
      {children({ attributes: sortable.attributes, listeners: sortable.listeners })}
    </section>
  );
}
/* eslint-enable react-hooks/refs */

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
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const drag = useRef<{ y: number; pointerId: number } | null>(null);

  const finishDrag = () => {
    if (!drag.current) return;
    const finalOffset = offsetRef.current;
    if (finalOffset > 110) onClose();
    offsetRef.current = 0;
    setOffset(0);
    setDragging(false);
    drag.current = null;
  };

  return (
    <div
      className="modal-layer keyboard-aware-layer"
      role="presentation"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`bottom-sheet ${tall ? "expanded tall-sheet" : ""} ${dragging ? "dragging" : ""}`}
        style={{ transform: `translateY(${offset}px)` }}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="sheet-drag-zone"
          aria-label="Потяните вниз, чтобы закрыть"
          onPointerDown={(event) => {
            drag.current = { y: event.clientY, pointerId: event.pointerId };
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || drag.current.pointerId !== event.pointerId) return;
            const delta = event.clientY - drag.current.y;
            const nextOffset = Math.max(-12, Math.min(delta, window.innerHeight * 0.72));
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

function AuthGate({ onToast }: { onToast: (message: string) => void }) {
  const [screen, setScreen] = useState<"welcome" | "register" | "login">("welcome");
  const [message, setMessage] = useState("");

  const report = (nextMessage: string) => {
    setMessage(nextMessage);
    onToast(nextMessage);
  };

  if (screen !== "welcome") {
    return (
      <main className="auth-gate auth-gate-flow">
        <AuthPanel
          key={screen}
          initialMode={screen}
          onClose={() => setScreen("welcome")}
          onToast={report}
          embedded
        />
        {message && <div className="auth-message auth-gate-message" role="status">{message}</div>}
      </main>
    );
  }

  return (
    <main className="auth-gate auth-gate-welcome">
      <section className="auth-showcase" aria-hidden="true">
        <div className="auth-brand">
          <span className="auth-logo">D</span>
          <strong>Dnevnik</strong>
        </div>
        <div className="auth-note-collage">
          <article className="auth-note-card auth-note-card-one">
            <span>Сегодня</span>
            <strong>Мысли, которые хочется сохранить</strong>
            <i /><i /><i />
          </article>
          <article className="auth-note-card auth-note-card-two">
            <span>Идеи</span>
            <strong>Начать с малого</strong>
            <i /><i />
          </article>
          <article className="auth-note-card auth-note-card-three">
            <span>Проекты</span>
            <strong>План на неделю</strong>
            <i /><i /><i />
          </article>
          <article className="auth-note-card auth-note-card-four">
            <span>Личное</span>
            <strong>Не забыть этот день</strong>
            <i /><i />
          </article>
          <span className="auth-floating-word">планы</span>
          <span className="auth-floating-word second">идеи</span>
        </div>
      </section>
      <section className="auth-welcome-content">
        <div className="auth-lockup">
          <span className="auth-logo auth-logo-large">D</span>
          <span>Dnevnik</span>
        </div>
        <h1>Соберите мысли<br />в одном месте.</h1>
        <p>Личный дневник для заметок, идей и проектов — всегда рядом.</p>
        <div className="auth-welcome-actions">
          <button type="button" className="auth-primary-action" onClick={() => setScreen("register")}>Регистрация</button>
          <button type="button" className="auth-secondary-action" onClick={() => setScreen("login")}>Вход</button>
        </div>
        <p className="auth-legal">Продолжая, вы принимаете условия использования и политику конфиденциальности Dnevnik.</p>
      </section>
    </main>
  );
}

function AuthPanel({
  onClose,
  onToast,
  embedded = false,
  initialMode = "register",
}: {
  onClose: () => void;
  onToast: (message: string) => void;
  embedded?: boolean;
  initialMode?: "register" | "login";
}) {
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [registerStep, setRegisterStep] = useState(0);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: "register" | "login") => {
    setMode(nextMode);
    setRegisterStep(0);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const goBack = () => {
    if (mode === "register" && registerStep > 0) {
      setRegisterStep((step) => step - 1);
      setError("");
      return;
    }
    onClose();
  };

  const validateCurrentStep = () => {
    if (registerStep === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Введите корректный адрес электронной почты.");
      return false;
    }
    if (registerStep === 1 && !/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) {
      setError("Никнейм: 3–24 символа, латиница, цифры и _.");
      return false;
    }
    if (registerStep === 2 && fullName.trim().length < 2) {
      setError("Введите имя.");
      return false;
    }
    return true;
  };

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && registerStep < 3) {
      if (validateCurrentStep()) setRegisterStep((step) => step + 1);
      return;
    }
    if (!supabase) {
      setError("Сервис входа временно недоступен. Попробуйте позже.");
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
          emailRedirectTo: new URL("./", document.baseURI).href,
        },
      });
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError.message.includes("Database error")
          ? "Не удалось создать профиль. Попробуйте другой никнейм."
          : signUpError.message);
        return;
      }
      onToast(data.session ? "Аккаунт создан" : "Проверьте почту и подтвердите регистрацию");
      if (data.session || !embedded) onClose();
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

  const registrationCopy = [
    {
      eyebrow: "Шаг 1 из 4",
      title: "Укажите адрес электронной почты",
      description: "Он понадобится для входа и восстановления аккаунта.",
    },
    {
      eyebrow: "Шаг 2 из 4",
      title: "Придумайте никнейм",
      description: "Он будет уникальным именем вашего профиля.",
    },
    {
      eyebrow: "Шаг 3 из 4",
      title: "Как вас зовут?",
      description: "Так мы будем обращаться к вам в приложении.",
    },
    {
      eyebrow: "Шаг 4 из 4",
      title: "Создайте пароль",
      description: "Используйте не менее 8 символов.",
    },
  ][registerStep];

  const canContinue = mode === "login"
    ? Boolean(email.trim() && password)
    : registerStep === 0
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      : registerStep === 1
        ? /^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())
        : registerStep === 2
          ? fullName.trim().length >= 2
          : password.length >= 8 && confirmPassword.length >= 8;

  return (
    <form className={`auth-panel ${embedded ? "auth-panel-flow" : ""}`} onSubmit={submitAuth}>
      {embedded && (
        <header className="auth-flow-header">
          <button type="button" className="auth-back-button" onClick={goBack} aria-label="Назад">
            <Icon name="back" size={25} />
          </button>
          {mode === "register" ? (
            <div className="auth-progress" aria-label={`Шаг ${registerStep + 1} из 4`}>
              {[0, 1, 2, 3].map((step) => <span key={step} className={step === registerStep ? "active" : step < registerStep ? "done" : ""} />)}
            </div>
          ) : (
            <strong className="auth-flow-title">Вход</strong>
          )}
          <span className="auth-header-spacer" />
        </header>
      )}
      {embedded ? (
        <div className="auth-card-heading auth-flow-heading">
          <span>{mode === "register" ? registrationCopy.eyebrow : "С возвращением"}</span>
          <h2>{mode === "register" ? registrationCopy.title : "Войдите в Dnevnik"}</h2>
          <p>{mode === "register" ? registrationCopy.description : "Продолжите с того места, где остановились."}</p>
        </div>
      ) : (
        <div className="sheet-header panel-header">
          <button type="button" className="text-button muted-action" onClick={onClose}>Закрыть</button>
          <strong>{mode === "register" ? "Регистрация" : "Вход"}</strong>
          <button type="submit" className="text-button" disabled={submitting}>{submitting ? "…" : "Готово"}</button>
        </div>
      )}
      {!isSupabaseConfigured && <div className="config-note">Сервис входа временно недоступен.</div>}
      <div className="auth-fields">
        {(mode === "login" || registerStep === 0) && (
          <label>Электронная почта<input type="email" inputMode="email" autoCapitalize="none" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        )}
        {mode === "register" && registerStep === 1 && (
          <label>Никнейм<input autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder="nickname" /></label>
        )}
        {mode === "register" && registerStep === 2 && (
          <label>Имя<input autoComplete="name" autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ваше имя" /></label>
        )}
        {(mode === "login" || registerStep === 3) && (
          <>
            <label>
              Пароль
              <span className="auth-password-field">
                <input type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} autoFocus={mode === "register"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "Не менее 8 символов" : "Введите пароль"} />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={22} />
                </button>
              </span>
            </label>
            {mode === "register" && (
              <label>Подтверждение пароля<input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Повторите пароль" /></label>
            )}
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="auth-continue-button" disabled={submitting || !canContinue} type="submit">
          {submitting ? "Подождите…" : mode === "register" && registerStep < 3 ? "Далее" : mode === "register" ? "Создать аккаунт" : "Войти"}
        </button>
      </div>
      <p className="auth-mode-switch">
        {mode === "register" ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}
        <button type="button" onClick={() => switchMode(mode === "register" ? "login" : "register")}>
          {mode === "register" ? "Войти" : "Зарегистрироваться"}
        </button>
      </p>
    </form>
  );
}

/* eslint-disable react-hooks/refs -- dnd-kit intentionally exposes bindings consumed while rendering sortable nodes. */
function SortableSwipeBlock({
  block,
  hidePreview,
  onArchive,
  onDelete,
}: {
  block: Block;
  hidePreview: boolean;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const sortable = useSortable({ id: block.id });
  const start = useRef({ x: 0, y: 0 });
  const offsetRef = useRef(0);
  const pointerId = useRef<number | null>(null);
  const gesture = useRef<"pending" | "swipe" | "scroll" | null>(null);
  const { onPointerDown: sortablePointerDown, ...sortableListeners } = sortable.listeners || {};

  const reset = () => {
    pointerId.current = null;
    gesture.current = null;
    offsetRef.current = 0;
    setOffset(0);
  };

  const finish = () => {
    const currentGesture = gesture.current;
    const currentOffset = offsetRef.current;
    if (currentGesture === "swipe" && currentOffset <= -88) {
      vibrate(18);
      onArchive();
    } else if (currentGesture === "swipe" && currentOffset >= 88) {
      vibrate(20);
      onDelete();
    }
    reset();
  };

  const sortableStyle = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={sortableStyle}
      className={`swipe-wrap sortable-block ${offset < 0 ? "swiping-left" : offset > 0 ? "swiping-right" : ""} ${sortable.isDragging ? "is-dragging" : ""}`}
      data-block-id={block.id}
    >
      <div className="swipe-action archive-action"><Icon name="archive" /><span>В архив</span></div>
      <div className="swipe-action delete-action"><Icon name="trash" /><span>Удалить</span></div>
      <article
        className={`note-block ${block.title ? "" : "no-title"}`}
        style={{ transform: `translateX(${offset}px)` }}
        {...sortable.attributes}
        {...sortableListeners}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          sortablePointerDown?.(event);
          start.current = { x: event.clientX, y: event.clientY };
          pointerId.current = event.pointerId;
          gesture.current = "pending";
        }}
        onPointerMove={(event) => {
          if (pointerId.current !== event.pointerId || !gesture.current) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (gesture.current === "pending" && Math.hypot(dx, dy) > 9) {
            gesture.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? "swipe" : "scroll";
            if (gesture.current === "swipe") event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (gesture.current === "swipe") {
            const next = Math.max(-132, Math.min(132, dx));
            offsetRef.current = next;
            setOffset(next);
          }
        }}
        onPointerUp={finish}
        onPointerCancel={reset}
      >
        <div className="note-meta">
          <span>{block.createdAt}</span>
          <span className="hold-hint"><Icon name="grip" size={18} />Потяните для переноса</span>
        </div>
        {block.title && <h2 className={`title-${block.titleColor || "green"}`}>{block.title}</h2>}
        <p>{hidePreview ? "Текст скрыт настройками конфиденциальности" : block.body}</p>
      </article>
    </div>
  );
}
/* eslint-enable react-hooks/refs */
