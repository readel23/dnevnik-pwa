import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DiaryApp from "../app/DiaryApp";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <DiaryApp />
  </StrictMode>,
);
