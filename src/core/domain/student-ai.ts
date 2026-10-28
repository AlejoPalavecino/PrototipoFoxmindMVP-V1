export interface StudentAiProgress {
  completion: { expected: number; delivered: number; pending: number; onTime: number; late: number;
    pendingResubmissions: number; percentage: string | null };
  performance: { graded: number; average: string | null };
  activities: { type: string; expected: boolean; firstSubmission: { late: boolean } | null;
    pendingResubmission: boolean; grade: string | null; confirmedAttempts?: number }[];
}
export interface StudentAiEvidence {
  completion: StudentAiProgress['completion']; performance: StudentAiProgress['performance'];
  activities: { ref: string; type: string; expected: boolean; submitted: boolean; onTime: boolean | null;
    grade: string | null; pendingResubmission: boolean; confirmedAttempts?: number }[];
}
export interface StudentAiFinding { text: string; evidenceRefs: string[] }
export interface StudentAiReport {
  overview: string; strengths: StudentAiFinding[]; supportNeeds: StudentAiFinding[];
  recommendations: StudentAiFinding[]; limitations: string[];
}

export function createStudentAiEvidence(progress: StudentAiProgress): StudentAiEvidence | null {
  if (!progress.activities.some(row => row.firstSubmission !== null || row.grade !== null)) return null;
  const { expected, delivered, pending, onTime, late, pendingResubmissions, percentage } = progress.completion;
  const { graded, average } = progress.performance;
  return { completion: { expected, delivered, pending, onTime, late, pendingResubmissions, percentage },
    performance: { graded, average }, activities: progress.activities.map((row, index) => ({
      ref: `A${index + 1}`, type: row.type, expected: row.expected, submitted: row.firstSubmission !== null,
      onTime: row.firstSubmission === null ? null : !row.firstSubmission.late,
      grade: row.grade, pendingResubmission: row.pendingResubmission,
      ...(Number.isSafeInteger(row.confirmedAttempts) && row.confirmedAttempts! >= 0
        ? { confirmedAttempts: row.confirmedAttempts } : {}),
    })) };
}

export function validateStudentAiReport(value: unknown, evidence: StudentAiEvidence): StudentAiReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_AI_OUTPUT');
  const report = value as Record<string, unknown>;
  const keys = ['overview', 'strengths', 'supportNeeds', 'recommendations', 'limitations'];
  if (Object.keys(report).length !== keys.length || !keys.every(key => key in report)
    || typeof report.overview !== 'string' || !report.overview.trim() || report.overview.length > 2000)
    throw new Error('INVALID_AI_OUTPUT');
  const refs = new Set(evidence.activities.map(row => row.ref));
  if (!Array.isArray(report.limitations) || report.limitations.length > 20
    || !report.limitations.every((item: unknown) => typeof item === 'string' && item.trim().length > 0 && item.length <= 1000))
    throw new Error('INVALID_AI_OUTPUT');
  for (const key of keys.slice(1, 4)) {
    const findings = report[key];
    if (!Array.isArray(findings) || findings.length > 20) throw new Error('INVALID_AI_OUTPUT');
    for (const finding of findings) {
      if (!finding || typeof finding !== 'object' || Array.isArray(finding)
        || Object.keys(finding).length !== 2 || typeof finding.text !== 'string'
        || !finding.text.trim() || finding.text.length > 1000 || !Array.isArray(finding.evidenceRefs)
        || !finding.evidenceRefs.length || !finding.evidenceRefs.every((ref: unknown) => typeof ref === 'string' && refs.has(ref)))
        throw new Error('INVALID_AI_OUTPUT');
    }
  }
  return value as StudentAiReport;
}

