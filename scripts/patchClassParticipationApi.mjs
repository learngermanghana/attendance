import fs from "node:fs";

const target = new URL("../functions/index.js", import.meta.url);
let source = fs.readFileSync(target, "utf8");

const moduleImport = 'const { registerClassParticipationRoutes } = require("./classParticipationApi.js");';
if (!source.includes(moduleImport)) {
  const importAnchor = 'const { registerStudentProfileUpdateRoute } = require("./studentProfileUpdate.js");';
  if (!source.includes(importAnchor)) {
    throw new Error("Class participation API import anchor changed");
  }
  source = source.replace(importAnchor, `${importAnchor}\n${moduleImport}`);
}

const registration = "registerClassParticipationRoutes({ app, db, admin, requireAuth, staffEmails: teacherAllowlist });";
if (!source.includes(registration)) {
  const registrationAnchor = "registerStudentProfileUpdateRoute({ app, db, admin, requireAuth, staffEmails: teacherAllowlist });";
  if (!source.includes(registrationAnchor)) {
    throw new Error("Class participation API registration anchor changed");
  }
  source = source.replace(registrationAnchor, `${registrationAnchor}\n${registration}`);
}

fs.writeFileSync(target, source);
console.log("Persistent class participation API is registered.");
