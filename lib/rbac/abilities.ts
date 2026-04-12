import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { UserRole } from "../db/types";

export type Actions = "manage" | "create" | "read" | "update" | "delete" | "comment" | "assign";
export type Subjects =
  | "all"
  | "Task"
  | "Project"
  | "Portfolio"
  | "Comment"
  | "User"
  | "Role"
  | "Automation"
  | "AiInsight"
  | "Settings";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilitiesFor(role: UserRole): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (role) {
    case "admin":
      can("manage", "all");
      break;

    case "manager":
      can("read", "all");
      can(["create", "update", "delete"], "Task");
      can(["create", "update"], "Project");
      can(["create", "update"], "Portfolio");
      can("manage", "Comment");
      can(["create", "update"], "Automation");
      can("read", "AiInsight");
      can("update", "Settings");
      cannot("delete", "User");
      cannot("manage", "Role");
      break;

    case "member":
      can("read", "all");
      can(["create", "update"], "Task");
      can("manage", "Comment");
      can("read", "AiInsight");
      cannot("delete", "Project");
      cannot("manage", "Role");
      cannot("manage", "Settings");
      break;

    case "viewer":
      can("read", "all");
      can("comment", "Task");
      cannot("create", "all");
      cannot("update", "all");
      cannot("delete", "all");
      break;

    case "guest":
      can("read", "Task");
      can("read", "Project");
      break;
  }

  return build();
}

export const ROLE_LABELS: Record<UserRole, Record<string, string>> = {
  admin:   { he: "מנהל מערכת", en: "Administrator", ru: "Администратор", fr: "Administrateur", es: "Administrador" },
  manager: { he: "מנהל",       en: "Manager",       ru: "Менеджер",       fr: "Responsable",    es: "Gerente"       },
  member:  { he: "חבר צוות",   en: "Team Member",   ru: "Участник",       fr: "Membre",         es: "Miembro"       },
  viewer:  { he: "צופה",       en: "Viewer",        ru: "Наблюдатель",    fr: "Observateur",    es: "Observador"    },
  guest:   { he: "אורח",       en: "Guest",         ru: "Гость",          fr: "Invité",         es: "Invitado"      },
};
