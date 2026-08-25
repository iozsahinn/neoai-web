import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  extendMaxVisitedStep,
  getActiveWorkflowContext,
  getMaxVisitedStep,
  getWorkflowStorageKey,
  setActiveWorkflowContext
} from "../utils/workflowState";

const stepOrder = [
  { key: "query", label: "Data Query" },
  { key: "ai-module", label: "AI Module Selection" },
  { key: "selection", label: "Data Selection" },
  { key: "preprocessing", label: "Data Preprocessing" },
  { key: "reporting", label: "Reporting" }
];

function buildStepHref(stepKey, context, pathname = "") {
  const patientId = context?.patientId;
  const examinationId = context?.examinationId;
  const reportId = context?.reportId || "REP-2001";
  const isEcgPo = pathname.includes("-ecg-pulse-oximeter") || examinationId?.startsWith("EPO_");
  const isPo = !isEcgPo && (pathname.includes("-pulse-oximeter") || examinationId?.startsWith("PO_"));

  if (isEcgPo) {
    switch (stepKey) {
      case "query":
        return "/query-ecg-pulse-oximeter";
      case "selection":
      case "preprocessing":
        return patientId && examinationId ? `/preprocessing-ecg-pulse-oximeter/${patientId}/${examinationId}` : "/query-ecg-pulse-oximeter";
      case "ai-module":
        return patientId && examinationId ? `/ai-module-ecg-pulse-oximeter/${patientId}/${examinationId}` : "/query-ecg-pulse-oximeter";
      case "results":
      case "reporting":
        return `/report/${reportId}`;
      default:
        return "/query-ecg-pulse-oximeter";
    }
  }

  if (isPo) {
    switch (stepKey) {
      case "query":
        return "/query-pulse-oximeter";
      case "selection":
      case "preprocessing":
        return patientId && examinationId ? `/preprocessing-pulse-oximeter/${patientId}/${examinationId}` : "/query-pulse-oximeter";
      case "ai-module":
        return patientId && examinationId ? `/ai-module-pulse-oximeter/${patientId}/${examinationId}` : "/query-pulse-oximeter";
      case "results":
      case "reporting":
        return `/report/${reportId}`;
      default:
        return "/query-pulse-oximeter";
    }
  }

  switch (stepKey) {
    case "query":
      return "/query";
    case "ai-module":
      return patientId && examinationId ? `/ai-module/${patientId}/${examinationId}` : "/query";
    case "selection":
      return patientId && examinationId ? `/selection/${patientId}/${examinationId}` : "/query";
    case "preprocessing":
      return patientId && examinationId ? `/preprocessing/${patientId}/${examinationId}` : "/query";
    case "reporting":
      return `/report/${reportId}`;
    default:
      return "/query";
  }
}

export function WorkflowSteps({ currentStep, context }) {
  const location = useLocation();
  const currentIndex = stepOrder.findIndex((step) => step.key === currentStep);
  const [storedContext, setStoredContext] = useState(null);
  const effectiveContext = context ?? storedContext;

  useEffect(() => {
    setStoredContext(getActiveWorkflowContext());
  }, []);

  useEffect(() => {
    if (!context?.patientId || !context?.examinationId) {
      return;
    }

    const nextContext = {
      patientId: context.patientId,
      examinationId: context.examinationId,
      reportId: context.reportId || storedContext?.reportId || "REP-2001"
    };

    setStoredContext(nextContext);
    setActiveWorkflowContext(nextContext);
  }, [context, storedContext?.reportId]);

  const workflowKey = useMemo(() => {
    return getWorkflowStorageKey(effectiveContext?.patientId, effectiveContext?.examinationId);
  }, [effectiveContext?.patientId, effectiveContext?.examinationId]);
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(currentIndex);

  useEffect(() => {
    const nextIndex = effectiveContext?.patientId && effectiveContext?.examinationId
      ? extendMaxVisitedStep(effectiveContext.patientId, effectiveContext.examinationId, currentIndex)
      : Math.max(getMaxVisitedStep("no-patient", "no-exam"), currentIndex);
    setMaxVisitedIndex(nextIndex);
  }, [currentIndex, effectiveContext?.examinationId, effectiveContext?.patientId, workflowKey]);

  return (
    <nav className="workflow-nav" aria-label="Workflow steps">
      {stepOrder.map((step, index) => {
        const isCurrent = step.key === currentStep;
        const isAllowed = index <= maxVisitedIndex;
        const href = buildStepHref(step.key, effectiveContext, location.pathname);

        return isAllowed ? (
          <Link
            key={step.key}
            className={`workflow-step${isCurrent ? " current" : ""}`}
            to={href}
            state={location.state}
          >
            {step.label}
          </Link>
        ) : (
          <span key={step.key} className="workflow-step disabled">
            {step.label}
          </span>
        );
      })}
    </nav>
  );
}
