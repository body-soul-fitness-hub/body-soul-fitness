// Replaces {{variable}} tokens in a template's body_preview with resolved values — used both for
// the human-readable message logged to member_notifications and for building the ordered
// positional params sent to the Meta template API.
export function renderTemplate(bodyPreview: string, variables: Record<string, string>): string {
  return bodyPreview.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => variables[key] ?? match);
}

// Builds the ordered param array the Meta template API expects, in the order the template's own
// `variables` list declares — that order is what maps to the template's {{1}}, {{2}}, ... slots.
export function buildTemplateParams(templateVariables: string[], variables: Record<string, string>): string[] {
  return templateVariables.map((key) => variables[key] ?? "");
}
