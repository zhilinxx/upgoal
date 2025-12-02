import React, { useEffect, useState } from "react";
import { getInsuranceRecommendations, getProviders } from "../api/insuranceAPI";
import { useNavigate, useLocation } from "react-router-dom";
import { FaFilter, FaSort, FaTimes } from "react-icons/fa";
import "../styles/insuranceRecommendations.css";

export default function InsuranceRecommendations() {
  const [plans, setPlans] = useState([]);
  const [providers, setProviders] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    premiumMin: "",
    premiumMax: "",
    sumAssured: "",
    planType: "All",
    provider: "",
    taxRelief: false,
    sort: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("all");
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [planType, setPlanType] = useState("Life");
  const [validation, setValidation] = useState("");

  const location = useLocation();

  useEffect(() => {
    if (location.state?.filters) {
      setFilters(location.state.filters || {});
    }
  }, [location.state]);

  useEffect(() => {
    const resizeHandler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  // Restore filters and refetch plans if back from planDetails
  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchProviders();

      const savedFilters = location.state?.filters;
      if (savedFilters) {
        setFilters(savedFilters);
        setActiveMobileTab("filter");
        setAppliedFilters(savedFilters);
        fetchPlans(savedFilters); // refetch plans with applied filters
      } else {
        fetchPlans();
      }
    };

    fetchInitialData();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data } = await getProviders();
      setProviders(data);
    } catch (err) {
      console.error("Failed to fetch providers", err);
    }
  };

  const fetchPlans = async (customFilters = filters) => {
    setLoading(true);
    const userId = localStorage.getItem("userId");
    try {
      const { data } = await getInsuranceRecommendations(userId, customFilters);
      setPlans(data);
    } catch (err) {
      if (err.response?.status === 404) setProfileMissing(true);
      else console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (profileMissing) {
    return (
      <div className="insurance-container">
        <p>You haven’t completed your insurance profile yet.</p>
        <button className="setup-btn" onClick={() => navigate("/insuranceProfileSetup")}>
          Go to Setup
        </button>
      </div>
    );
  }

  const handleApply = () => {
    setShowFilter(false);
    setActiveMobileTab("filter");
    setAppliedFilters(filters);
    fetchPlans(filters); 
  };

  const handleClear = () => {
    const clearedFilters = {
      premiumMin: "",
      premiumMax: "",
      sumAssured: "",
      planType: "All",
      provider: "",
      taxRelief: false,
      sort: "",
    };

    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    fetchPlans({});
  };

  const handleSort = (option) => {
    setFilters({ ...filters, sort: option });
    fetchPlans({ ...filters, sort: option });
  };

  const handleTaxReliefToggle = () => {
    const newState = !filters.taxRelief;
    setFilters({ ...filters, taxRelief: newState });
  };

  const handleViewDetails = (planId, premiumWithTax, premiumNoTax, sumAssured, score) => {
    navigate(`/plan/${planId}`, { state: { sumAssured, premiumWithTax, premiumNoTax, score, filters } });
  };

  return (
    <div className="insurance-container">

      {/* Top bar (mobile) */}
      {isMobile && (
        <div className="top-bar">
          <div>
            <button
              className={`filter-btn ${activeMobileTab === "filter" ? "active" : ""}`}
              onClick={() => setShowFilter(true)}
            >
              <FaFilter /> Filter
            </button>
            <button
              className={`all-btn ${activeMobileTab === "all" ? "active" : ""}`}
              onClick={() => {
                handleClear();
                setActiveMobileTab("all");
              }}
            >
              All
            </button>
          </div>
          <select className="sort-select" onChange={(e) => handleSort(e.target.value)}>
            <option>Sort</option>
            <option value="premiumLow">Premium ↑</option>
            <option value="premiumHigh">Premium ↓</option>
            <option value="scoreHigh">Score ↑</option>
            <option value="scoreLow">Score ↓</option>
          </select>
        </div>
      )}

      <div className="insurance-content">
        {/* Desktop Filter Sidebar */}
        {!isMobile && (
          <div className="filter-sidebar">

            <label>Premium Amount (RM)</label>
            <div className="range-group">
              <input
                type="number"
                placeholder="Min"
                value={filters.premiumMin}
                min="0"
                max="10000"
                onChange={(e) => {
                  let value = e.target.value;
                  if (Number(value) < 0) value = "0";
                  value = value.replace(/^0+(?=\d)/, "");

                  setFilters({
                    ...filters,
                    premiumMin: value,
                  });
                }}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.premiumMax}
                max="10000"
                onChange={(e) => {
                  let value = e.target.value;

                  if (Number(value) < 0) value = "0";
                  value = value.replace(/^0+(?=\d)/, "");

                  setFilters({
                    ...filters,
                    premiumMax: value,
                  });
                }}
              />
            </div>

            <label>Sum Assured (RM)</label>
            <div className="slider-container">
              <input
                className="slider"
                type="range"
                min="100000"
                max="500000"
                step="100000"
                value={filters.sumAssured}
                onChange={(e) =>
                  setFilters({ ...filters, sumAssured: Number(e.target.value) })
                }
              />
              <p className="slider-value">
                RM {filters.sumAssured.toLocaleString()}
              </p>
            </div>

            <label>Plan Type</label>
            <div className="plan-types">
              {["All", "Life", "Life + Medical"].map((type) => (
                <button
                  key={type}
                  className={filters.planType === type ? "active" : ""}
                  onClick={() => setFilters({ ...filters, planType: type })}
                >
                  {type}
                </button>
              ))}
            </div>

            <label>Insurance Provider</label>
            <select value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}>
              <option value="">All</option>
              {providers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <label className="switch-label">
              Tax Relief Estimation
              <input
                type="checkbox"
                checked={filters.taxRelief}
                onChange={handleTaxReliefToggle}
              />
            </label>

            <div className="filter-actions">
              <button className="clear" onClick={handleClear}>Clear</button>
              <button onClick={handleApply}>Apply</button>
            </div>
          </div>
        )}

        <div className="insurance-list-section">
          <div className="list-header">
            <p className="record-line">
              {loading
                ? "Loading..."
                : appliedFilters.taxRelief
                ? `${plans.length} records found with tax relief applied`
                : `${plans.length} records found`}
            </p>

            {/* Sort selector (for desktop too) */}
            {!isMobile && (
              <select
                onChange={(e) => handleSort(e.target.value)}
                value={filters.sort}
              >
                <option value="">Sort</option>
                <option value="premiumLow">Premium ↑</option>
                <option value="premiumHigh">Premium ↓</option>
                <option value="scoreHigh">Score ↑</option>
                <option value="scoreLow">Score ↓</option>
              </select>
            )}
          </div>

          {/* Insurance Cards */}
          <div className="insurance-list">
            {loading ? (
              <p>Loading...</p>
            ) : plans.length === 0 ? (
              <p>No matching plans found.</p>
            ) : (
              plans.map((p) => (
                <div
                  className="insurance-card"
                  key={p.plan_id}
                  onClick={() => handleViewDetails(p.plan_id, p.premiumWithTax, p.premiumNoTax, p.sumAssured || p.adjustedSumAssured, p.score)}
                >
                  <div className="insurance-card-header">
                    <h3>{p.plan_name}</h3>
                  </div>
                  <div className="insurance-card-content">
                    <div>
                      <h3>{p.plan_type}</h3>
                      <p
                        className={
                          appliedFilters.taxRelief ? "premium premium-green" : "premium"
                        }
                      >
                        RM {Number(p.finalPremium).toFixed(2)} /month
                      </p>
                    </div>
                    <img src={`${import.meta.env.VITE_API_URL}/${p.provider_logo}`} alt={p.provider} />
                  </div>

                  <div className="insurance-card-content">
                    <div>
                      {p.plan_type === "Life" && (
                        <>
                          <p className="detail">
                            Sum Assured: RM{" "}
                            {(p.adjustedSumAssured || p.sum_assured)?.toLocaleString()}
                          </p>
                          <p className="detail">Coverage Age: {p.coverage_age}</p>
                        </>
                      )}

                      {p.plan_type === "Life + Medical" && (
                        <>
                          <p className="detail">
                            Sum Assured: RM{" "}
                            {(p.adjustedSumAssured || p.sum_assured)?.toLocaleString()}
                          </p>
                          <p className="detail">Annual Limit  : {p.annual_limit && p.annual_limit != 0 && p.annual_limit != null ? `RM ${p.annual_limit.toLocaleString()}`: "No Limit"}</p>
                          <p className="detail">Room & Board: RM {p.hp_room_board}/day</p>
                        </>
                      )}
                    </div>
                    <p className="score">Score {p.score}%</p>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Compare Button (Mobile) */}
      {plans.length > 1 && (
        <button className="compare-btn" onClick={() => setShowCompareDialog(true)}>Compare</button>
      )}

      {/* Mobile Filter Modal */}
      {showFilter && isMobile && (
        <div className="filter-modal">
          <div className="filter-box">
            <h3>Filter</h3>

            <label>Premium Amount (RM)</label>
            <div className="range-group">
              <input
                type="number"
                placeholder="Min"
                value={filters.premiumMin}
                min="0"
                max="10000"
                onChange={(e) => {
                  let value = e.target.value;
                  if (Number(value) < 0) value = "0";
                  value = value.replace(/^0+(?=\d)/, "");

                  setFilters({
                    ...filters,
                    premiumMin: value,
                  });
                }}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.premiumMax}
                max="10000"
                onChange={(e) => {
                  let value = e.target.value;

                  if (Number(value) < 0) value = "0";
                  value = value.replace(/^0+(?=\d)/, "");

                  setFilters({
                    ...filters,
                    premiumMax: value,
                  });
                }}
              />
            </div>

            <label>Sum Assured (RM)</label>
            <div className="slider-container">
              <input
                type="range"
                min="100000"
                max="500000"
                step="100000"
                value={filters.sumAssured}
                onChange={(e) =>
                  setFilters({ ...filters, sumAssured: Number(e.target.value) })
                }
              />
              <p className="slider-value">
                RM {filters.sumAssured.toLocaleString()}
              </p>
            </div>

            <label>Plan Type</label>
            <div className="plan-types">
              {["All", "Life", "Life + Medical"].map((type) => (
                <button
                  key={type}
                  className={filters.planType === type ? "active" : ""}
                  onClick={() => setFilters({ ...filters, planType: type })}
                >
                  {type}
                </button>
              ))}
            </div>

            <label>Insurance Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
            >
              <option value="">All</option>
              {providers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <label className="switch-label">
              Tax Relief Estimation
              <input
                type="checkbox"
                checked={filters.taxRelief}
                onChange={handleTaxReliefToggle}
              />
            </label>

            <div className="filter-actions">
              <button className="clear" onClick={() => setShowFilter(false)}>Cancel</button>
              <button onClick={handleApply}>Apply</button>
            </div>
          </div>
        </div>
      )}
      {showCompareDialog && (
      <div className="compare-dialog-overlay">
        <div className="compare-dialog">
          <label className="choose-plan-type">Plan Type:</label>
          <select
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
          >
            <option value="Life">Life</option>
            <option value="Life + Medical">Life + Medical</option>
          </select>

          <p>Choose 2 plans to compare *</p>
          {validation && <p className="validation">{validation}</p>}
          <div className="compare-plan-list">
            {plans
              .filter(
                (p) =>
                  (planType === "Life" && p.plan_type === "Life") ||
                  (planType === "Life + Medical" && p.plan_type === "Life + Medical")
              )
              .map((p) => (
                <label key={p.plan_id} className="plan-option">
                  <input
                    type="checkbox"
                    checked={selectedPlans.includes(p.plan_id)}
                    onChange={() => {
                      if (selectedPlans.includes(p.plan_id)) {
                        setSelectedPlans(selectedPlans.filter((id) => id !== p.plan_id));
                      } else if (selectedPlans.length < 2) {
                        setSelectedPlans([...selectedPlans, p.plan_id]);
                      }
                    }}
                  />
                  {p.provider} {p.plan_name}
                </label>
              ))}
          </div>

          <div className="compare-actions">
            <button
              className="cancel-btn"
              onClick={() => {
                setValidation("");
                setShowCompareDialog(false);
                setSelectedPlans([]);
              }}
            >
              Cancel
            </button>
            <button
              className="dialog-compare-btn"
              onClick={() => {
                if (selectedPlans.length === 2) {
                  const [plan1, plan2] = selectedPlans.map((id) =>
                    plans.find((p) => p.plan_id === id)
                  );
                  setValidation("");
                  setShowCompareDialog(false);
                  navigate("/comparePlans", { state: { plan1, plan2, filters: appliedFilters } });
                } else {
                  setValidation("Must select exactly 2 plans to compare");
                }
              }}
            >
              Compare
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
