import React, { useMemo, useState } from "react";

export default function RuleControls({
  currency,
  income,
  plan,
  spending,
  setSpending,
  alerts,
  onCheckAlerts,
  onAutoAdjust,
}) {
  // sensible default thresholds; you can tweak or lift to parent if needed
  const [limits, setLimits] = useState({
    Essentials: { pctOfIncome: 0.60 },
    Savings:    { pctOfIncome: 0.30 },
    Insurance:  { pctOfIncome: 0.12 },
    Other:      { pctOfIncome: 0.15 },
  });

  const planTotal = useMemo(() => Object.values(plan ?? {}).reduce((s, v) => s + Number(v || 0), 0), [plan]);
  const fmt = (n) => `${currency} ${Number(n || 0).toFixed(2)}`;

  return (
    <div className="rule-controls">
      <h4 className="rc-title">Rules & Adjustments</h4>

      <div className="rc-grid">
        {["Essentials", "Savings", "Insurance", "Other"].map((k) => (
          <div key={k} className="rc-row">
            <div className="rc-left">
              <div className="rc-label">{k}</div>
              <div className="rc-sub">Plan: <b>{fmt(plan?.[k] ?? 0)}</b></div>
            </div>
            <div className="rc-right">
              <input
                type="number"
                min="0"
                step="0.01"
                value={spending?.[k] ?? 0}
                onChange={(e) => setSpending((s) => ({ ...s, [k]: Number(e.target.value || 0) }))}
                placeholder={`Enter ${k} spending`}
                className="rc-input"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rc-actions">
        <button className="btn" onClick={() => onCheckAlerts(limits)}>Check Alerts</button>
        <button className="btn primary" onClick={onAutoAdjust}>Auto-Reallocate</button>
      </div>

      {!!alerts?.length && (
        <div className="rc-alerts">
          <b>Alerts</b>
          <ul>
            {alerts.map((a, i) => (
              <li key={i}>{a.category}: {a.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rc-footer">
        <span>Total Plan</span>
        <span><b>{fmt(planTotal)}</b></span>
      </div>
    </div>
  );
}
