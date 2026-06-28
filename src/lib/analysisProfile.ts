export interface AnalysisProfileLike {
  analyzed_profile_id?: string | null;
  analyzed_profile_name_snapshot?: string | null;
  user_startup_profiles?: {
    company_name?: string | null;
  } | null;
}

export function getAnalysisProfileLabel(analysis: AnalysisProfileLike): string {
  const explicitName =
    analysis.analyzed_profile_name_snapshot?.trim() ||
    analysis.user_startup_profiles?.company_name?.trim() ||
    "";

  if (explicitName) return explicitName;
  if (analysis.analyzed_profile_id) return "Deleted profile";
  return "Universal analysis";
}

export function isUniversalAnalysis(analysis: AnalysisProfileLike): boolean {
  return !analysis.analyzed_profile_id && !analysis.analyzed_profile_name_snapshot;
}
