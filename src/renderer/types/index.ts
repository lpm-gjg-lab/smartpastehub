import type { ContentType } from "../../shared/types";

export interface TransformLabel {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface SmartPasteResult {
  input: string;
  output: string;
  detectedType: ContentType;
  transforms: TransformLabel[];
  timestamp: number;
}

export type AppTab =
  | "dashboard"
  | "paste"
  | "history"
  | "snippets"
  | "templates"
  | "settings";
