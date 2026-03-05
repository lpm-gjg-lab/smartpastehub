import React from "react";
import { 
  FileTextIcon, 
  CodeIcon, 
  Link2Icon, 
  EnvelopeClosedIcon, 
  TableIcon, 
  CalendarIcon, 
  ColorWheelIcon,
  ClipboardIcon,
  SymbolIcon
} from "@radix-ui/react-icons";

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
export const TYPE_ICONS: Record<string, React.ReactNode> = {
  plain_text: <FileTextIcon />,
  pdf_text: <ClipboardIcon />,
  source_code: <CodeIcon />,
  json_data: <CodeIcon />,
  csv_table: <TableIcon />,
  tsv_table: <TableIcon />,
  html_table: <TableIcon />,
  url_text: <Link2Icon />,
  email_text: <EnvelopeClosedIcon />,
  address: <SymbolIcon />,
  date_text: <CalendarIcon />,
  phone_number: <SymbolIcon />,
  math_expression: <SymbolIcon />,
  color_code: <ColorWheelIcon />,
  path_text: <FileTextIcon />,
  md_text: <FileTextIcon />,
  text_with_links: <Link2Icon />,
  yaml_data: <CodeIcon />,
  toml_data: <CodeIcon />,
};
