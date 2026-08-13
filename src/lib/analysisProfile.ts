export interface AnalysisProfileLike {
  analyzed_profile_id?: string | null;
  analyzed_profile_name_snapshot?: string | null;
  user_startup_profiles?: {
    company_name?: string | null;
  } | null;
}

export function getViewerCompanyName(analysis: AnalysisProfileLike): string | null {
  return (
    analysis.analyzed_profile_name_snapshot?.trim() ||
    analysis.user_startup_profiles?.company_name?.trim() ||
    null
  );
}

export function getAnalysisProfileLabel(analysis: AnalysisProfileLike): string {
  const explicitName = getViewerCompanyName(analysis);

  if (explicitName) return explicitName;
  if (analysis.analyzed_profile_id) return "Deleted profile";
  return "Universal analysis";
}

export function isUniversalAnalysis(analysis: AnalysisProfileLike): boolean {
  return !analysis.analyzed_profile_id && !analysis.analyzed_profile_name_snapshot;
}

/** Header for the profile-specific advice column. */
export function getBoardMeetingMemoTitle(analysis: AnalysisProfileLike): string {
  if (isUniversalAnalysis(analysis)) return "Board Meeting Memo";
  return `Board Meeting Memo for: ${getAnalysisProfileLabel(analysis)}`;
}
