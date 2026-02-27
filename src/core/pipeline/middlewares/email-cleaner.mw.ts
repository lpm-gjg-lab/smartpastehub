import { cleanEmail } from "../../email-cleaner";
import { PipelineMiddleware } from "../types";

export const emailCleanerMiddleware: PipelineMiddleware = {
  id: "email-cleaner",
  supports: (ctx) => ctx.detectedType === "email_text",
  run: (input) => cleanEmail(input),
};
