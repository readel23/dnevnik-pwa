import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { EnabledModules, Project } from "./project-types";

export type CloudState<Notes, Preferences, Theme> = {
  version: 2;
  notes: Notes;
  projects: Project[];
  modules: EnabledModules;
  preferences: Preferences;
  theme: Theme;
};

export type CloudRecord<State> = {
  state: State;
  updated_at: string;
};

export async function loadCloudState<State>(user: User) {
  if (!supabase) return { record: null, error: null };
  const { data, error } = await supabase
    .from("user_app_state")
    .select("state, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return { record: data as CloudRecord<State> | null, error };
}

export async function saveCloudState<State>(user: User, state: State) {
  if (!supabase) return { error: null };
  const { error } = await supabase.from("user_app_state").upsert({
    user_id: user.id,
    state,
    updated_at: new Date().toISOString(),
  });
  return { error };
}

export function subscribeToCloudState<State>(
  user: User,
  onState: (record: CloudRecord<State>) => void,
): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel(`user-app-state-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_app_state",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === "object") {
          onState(payload.new as CloudRecord<State>);
        }
      },
    )
    .subscribe();
}
