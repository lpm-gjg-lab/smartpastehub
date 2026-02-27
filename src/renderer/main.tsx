import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

import AutoChart from "./windows/AutoChart";
import WebClipper from "./windows/WebClipper";
import QRBridge from "./windows/QRBridge";
import DragDropZone from "./windows/DragDropZone";
import PasteHistoryRing from "./windows/PasteHistoryRing";
import TemplateForm from "./windows/TemplateForm";
import OCRPopup from "./windows/OCRPopup";
import ToastApp from "./ToastApp";

const root = document.getElementById("root");
if (root) {
  const hash = window.location.hash.replace("#", "");

  let Component: any = App;
  let appInitialTab: "paste" | "history" | "settings" | "dashboard" = "paste";
  if (hash.startsWith("/auto-chart")) Component = AutoChart;
  else if (hash.startsWith("/web-clipper")) Component = WebClipper;
  else if (hash.startsWith("/qr-bridge")) Component = QRBridge;
  else if (hash.startsWith("/drag-drop-zone")) Component = DragDropZone;
  else if (hash.startsWith("/paste-history-ring")) Component = PasteHistoryRing;
  else if (hash.startsWith("/template-form")) Component = TemplateForm;
  else if (hash.startsWith("/ocr")) Component = OCRPopup;
  else if (hash.startsWith("/toast")) {
    Component = ToastApp;
    document.documentElement.classList.add("is-transparent-window");
    document.body.classList.add("is-transparent-window");
  }
  else if (hash.startsWith("/history")) appInitialTab = "history";
  else if (hash.startsWith("/settings")) appInitialTab = "settings";
  else if (hash.startsWith("/dashboard")) appInitialTab = "dashboard";
  else if (hash.startsWith("/paste")) appInitialTab = "paste";

  if (Component === App) {
    createRoot(root).render(<App initialTab={appInitialTab} />);
  } else {
    createRoot(root).render(<Component />);
  }
}
