const ALLOWED_TITLE =
  /\b(founder|co[- ]?founder|chief executive officer|chief technology officer|chief operating officer|chief marketing officer|ceo|cto|coo|cmo|vice president|vp)\b/i;

export function isAllowedDecisionMakerTitle(title: string): boolean {
  return ALLOWED_TITLE.test(title);
}
