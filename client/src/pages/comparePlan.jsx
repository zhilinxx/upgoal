import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import "../styles/comparePlan.css";

export default function ComparePlanPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { plan1, plan2, filters } = state || {};

  if (!plan1 || !plan2) {
    return (
      <div className="compare-page">
        <p>No plans selected for comparison.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

    const highlightIfDifferent = (field) => {
    const val1 = plan1[field];
    const val2 = plan2[field];

    // If both undefined/null, same
    if (!val1 && !val2) return "";

    // Special case: coverage_scope — order-insensitive comparison
    if (field === "coverage_scope") {
        const arr1 = val1
        ?.split(",")
        .map((v) => v.trim())
        .sort()
        .join(", ");
        const arr2 = val2
        ?.split(",")
        .map((v) => v.trim())
        .sort()
        .join(", ");
        return arr1 !== arr2 ? "highlight" : "";
    }

    // Default comparison
    return val1 !== val2 ? "highlight" : "";
    };

  return (
    <div className="compare-page">
      <button className="back-btn" onClick={() => navigate("/insuranceRecommendations", { state: { filters } }) }><FaChevronLeft /></button>

      <div className="compare-container">
        {[plan1, plan2].map((p, i) => (
          <div key={i} className="compare-card">
            <div className="compare-header">
                <img src={`http://localhost:5000/${p.provider_logo}`} alt={p.provider} className="provider-logo" />
                <h3>{p.plan_name}</h3>
            </div>

            <div className="plan-info">
                <div className="row">
                    <span className="row-label">Premium: </span>
                    <span className="row-content">
                        <p className={highlightIfDifferent("finalPremium")}>
                            RM {Number(p.finalPremium).toFixed(2)}/month
                        </p>
                    </span>
                </div>
                <div className="row">
                    <span className="row-label">Sum Assured: </span>
                    <span className="row-content">
                        <p className={highlightIfDifferent("adjustedSumAssured")}>
                        RM{" "}
                        {p.adjustedSumAssured
                            ? p.adjustedSumAssured.toLocaleString()
                            : p.sum_assured?.toLocaleString()}
                        </p>
                    </span>
                </div>
                <div className="row">
                    <span className="row-label">Coverage Age: </span>
                    <span className="row-content">
                        <p className={highlightIfDifferent("coverage_age")}>
                            {p.coverage_age} years
                        </p>
                    </span>
                </div>
                <div className="row">
                    <span className="row-label">Coverage Scope: </span>
                    <span className="row-content">
                        <p className={highlightIfDifferent("coverage_scope")}>
                            {p.coverage_scope}
                        </p>
                    </span>
                </div>
                <div className="row">
                    <span className="row-label">Critical Illness Rider: </span>
                    <span className="row-content">
                        <p className={highlightIfDifferent("CI")}>
                            {p.CI ? "Included" : "Not Included"}
                        </p>
                    </span>
                </div>
                {p.plan_type === "Life + Medical" && (
                <>
                    {p.annual_limit !== undefined && (
                    <div className="row">
                        <span className="row-label">Annual Limit: </span>
                        <span className="row-content">
                        <p className={highlightIfDifferent("annual_limit")}>
                            {p.annual_limit
                            ? `RM ${p.annual_limit.toLocaleString()}`
                            : "No Limit"}
                        </p>
                        </span>
                    </div>
                    )}

                    {p.lifetime_limit !== undefined && (
                    <div className="row">
                        <span className="row-label">Lifetime Limit: </span>
                        <span className="row-content">
                        <p className={highlightIfDifferent("lifetime_limit")}>
                            {p.lifetime_limit && p.lifetime_limit !== 0 && p.lifetime_limit !== null
                            ? `RM ${p.lifetime_limit.toLocaleString()}`
                            : "No Limit"}
                        </p>
                        </span>
                    </div>
                    )}

                    {p.hp_room_board && (
                    <div className="row">
                        <span className="row-label">Hospital Room & Board: </span>
                        <span className="row-content">
                        <p className={highlightIfDifferent("hp_room_board")}>
                            RM {p.hp_room_board.toLocaleString()}/day
                        </p>
                        </span>
                    </div>
                    )}
                </>
                )}
            </div>
            <button
                className="details-btn"
                onClick={() =>
                    navigate(`/plan/${p.plan_id}`, {
                    state: {
                        plan: p,
                        filters,
                        premiumWithTax: p.premiumWithTax ?? 0,
                        premiumNoTax: p.premiumNoTax ?? p.finalPremium,
                        fromFavourite: true,
                    },
                    })
                }
                >
                Details
            </button>
          </div>
        ))}
      </div>
      <div className="empty"></div>
    </div>
  );
}
