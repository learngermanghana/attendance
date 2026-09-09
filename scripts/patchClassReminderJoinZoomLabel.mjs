import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workerPath = path.join(repoRoot, "functions", "classSessionReminderEmails.js");
let source = fs.readFileSync(workerPath, "utf8");

const buttonLine = '    button_label: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl) ? "Join Zoom" : "",';
const linkLabelLine = '    link_label: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl) ? "Join Zoom" : "",';

if (!source.includes(linkLabelLine)) {
  if (!source.includes(buttonLine)) {
    throw new Error("Class reminder Zoom button label anchor is missing.");
  }
  source = source.replace(buttonLine, `${buttonLine}\n${linkLabelLine}`);
}

if (!source.includes('link: text(zoom.url || DEFAULT_CLASS_REMINDER_ZOOM.joinUrl),')) {
  throw new Error("Class reminder Zoom link is missing.");
}
if (!source.includes(linkLabelLine)) {
  throw new Error("Class reminder Zoom link_label was not applied.");
}

fs.writeFileSync(workerPath, source, "utf8");
console.log("Class reminder Zoom CTA now writes link_label=Join Zoom for the announcement email template.");
