const ACTIVE_WORKFLOW_KEY = "neoai-active-workflow";

export function getWorkflowStorageKey(patientId, examinationId) {
  const safePatientId = patientId || "no-patient";
  const safeExaminationId = examinationId || "no-exam";
  return `neoai-workflow:${safePatientId}:${safeExaminationId}`;
}

export function getActiveWorkflowContext() {
  const rawValue = window.sessionStorage.getItem(ACTIVE_WORKFLOW_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.sessionStorage.removeItem(ACTIVE_WORKFLOW_KEY);
    return null;
  }
}

export function setActiveWorkflowContext(context) {
  if (!context?.patientId || !context?.examinationId) {
    return;
  }

  const existing = getActiveWorkflowContext();

  const nextContext = {
    patientId: context.patientId,
    examinationId: context.examinationId,
    reportId: context.reportId || existing?.reportId || "REP-2001",
    selectedModuleIds: context.selectedModuleIds || existing?.selectedModuleIds || ["rds-score"]
  };

  window.sessionStorage.setItem(ACTIVE_WORKFLOW_KEY, JSON.stringify(nextContext));
}

export function getMaxVisitedStep(patientId, examinationId) {
  const rawValue = window.sessionStorage.getItem(getWorkflowStorageKey(patientId, examinationId));
  const parsedValue = rawValue ? Number(rawValue) : 0;
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function setMaxVisitedStep(patientId, examinationId, stepIndex) {
  window.sessionStorage.setItem(getWorkflowStorageKey(patientId, examinationId), String(stepIndex));
}

export function extendMaxVisitedStep(patientId, examinationId, stepIndex) {
  const currentValue = getMaxVisitedStep(patientId, examinationId);
  const nextValue = Math.max(currentValue, stepIndex);
  setMaxVisitedStep(patientId, examinationId, nextValue);
  return nextValue;
}

export function resetWorkflowAfterStep(patientId, examinationId, stepIndex) {
  setMaxVisitedStep(patientId, examinationId, stepIndex);
}
