import { stripHTML } from "../../html-stripper";
import { PipelineMiddleware } from "../types";

export const htmlStripperMiddleware: PipelineMiddleware = {
  id: "html-stripper",
  supports: (ctx) =>
    ctx.detectedType === "styled_html" ||
    ctx.detectedType === "structured_html",
  run: (_, ctx) => {
    return stripHTML(ctx.content.html ?? ctx.content.text, {
      keepBold: true,
      keepItalic: true,
      keepLists: true,
      keepLinks: true,
      keepHeadings: true,
      keepLineBreaks: true,
    });
  },
};
