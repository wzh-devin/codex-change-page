import { statusPresentation } from "../model";

export function StatusBadge({ status }: { status: "active" | "paused" | "off" | "error" }) {
  const value = statusPresentation(status);
  return (
    <span className={`status-badge ${value.tone}`}>
      <span aria-hidden="true">{value.symbol}</span>
      {value.label}
    </span>
  );
}
