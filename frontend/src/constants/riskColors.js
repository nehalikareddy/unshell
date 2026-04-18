export const NODE_COLORS = {
  AUTO_APPROVE: { bg: "var(--cream-2)", border: "#38A169", text: "#38A169", pulse: false },
  MEDIUM_RISK:  { bg: "var(--cream-2)", border: "#D69E2E", text: "#D69E2E", pulse: false },
  HIGH_RISK:    { bg: "var(--cream-2)", border: "#6B46C1", text: "#6B46C1", pulse: true  },
  CRITICAL:     { bg: "var(--cream-2)", border: "#C53030", text: "#C53030", pulse: true  },
  OFFSHORE:     { bg: "var(--cream-2)", border: "#3182CE", text: "#3182CE", pulse: false },
  UNVERIFIED_AI:{ bg: "var(--cream-2)", border: "var(--text-muted)", text: "var(--text-muted)", pulse: false }
};

export const SCORE_THRESHOLDS = {
  AUTO_APPROVE: { max: 29,  label: "Auto-Approve", color: "green"   },
  HUMAN_REVIEW: { max: 64,  label: "Human Review", color: "amber"   },
  AUTO_REJECT:  { max: 94,  label: "Auto-Reject",  color: "red"     },
  CRITICAL:     { max: 100, label: "SAR Required",  color: "crimson" }
};

export const RISK_LEVEL_ORDER = ["AUTO_APPROVE", "MEDIUM_RISK", "HIGH_RISK", "CRITICAL"];

export function getRiskColor(riskLevel) {
  return NODE_COLORS[riskLevel] || NODE_COLORS.MEDIUM_RISK;
}

export function getScoreLabel(score) {
  if (score <= 29)  return SCORE_THRESHOLDS.AUTO_APPROVE;
  if (score <= 64)  return SCORE_THRESHOLDS.HUMAN_REVIEW;
  if (score <= 94)  return SCORE_THRESHOLDS.AUTO_REJECT;
  return SCORE_THRESHOLDS.CRITICAL;
}
