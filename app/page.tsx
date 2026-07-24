import type { Metadata } from "next";
import DiaryApp from "./DiaryApp";

export const metadata: Metadata = {
  title: "Дневник",
  description: "Личный дневник, заметки и проекты — всегда под рукой.",
};

export default function Home() {
  return <DiaryApp />;
}
