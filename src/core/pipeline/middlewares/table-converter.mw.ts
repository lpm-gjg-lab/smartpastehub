import {
  parseCSV,
  parseHTMLTable,
  parseTSV,
  toMarkdown,
} from "../../table-converter";
import { PipelineMiddleware } from "../types";

export const tableConverterMiddleware: PipelineMiddleware = {
  id: "table-converter",
  supports: (ctx) =>
    ctx.detectedType === "html_table" ||
    ctx.detectedType === "csv_table" ||
    ctx.detectedType === "tsv_table",
  run: (_, ctx) => {
    if (ctx.detectedType === "html_table") {
      return toMarkdown(parseHTMLTable(ctx.content.html ?? ctx.content.text));
    }
    if (ctx.detectedType === "csv_table") {
      return toMarkdown(parseCSV(ctx.content.text));
    }
    return toMarkdown(parseTSV(ctx.content.text));
  },
};
