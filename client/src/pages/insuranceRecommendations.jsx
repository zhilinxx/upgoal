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
    sumMin: "",
    sumMax: "",
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

  // ✅ Restore filters AND re-fetch plans immediately if coming back from planDetails
  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchProviders();

      const savedFilters = location.state?.filters;
      if (savedFilters) {
        setFilters(savedFilters);
        setAppliedFilters(savedFilters);
        fetchPlans(savedFilters); // ✅ re-fetch plans using those filters
      } else {
        fetchPlans(); // default
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

  const handleApply = () => {
    setShowFilter(false);
    // fetchPlans();
    setActiveMobileTab("filter");
    setAppliedFilters(filters); // ✅ Save these as active filters
    fetchPlans(filters); 
  };

  const handleClear = () => {
    setFilters({
      premiumMin: "",
      premiumMax: "",
      sumMin: "",
      sumMax: "",
      planType: "All",
      provider: "",
      taxRelief: false,
      sort: "",
    });
    fetchPlans({});
  };

  const handleSort = (option) => {
    setFilters({ ...filters, sort: option });
    fetchPlans({ ...filters, sort: option });
  };

  const handleTaxReliefToggle = () => {
    const newState = !filters.taxRelief;
    setFilters({ ...filters, taxRelief: newState });
    // fetchPlans({ ...filters, taxRelief: newState });
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

  const handleViewDetails = (planId, premium, sumAssured, score) => {
    navigate(`/plan/${planId}`, { state: { sumAssured, premium, score, filters } });
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
              <input type="number" placeholder="Min" value={filters.premiumMin}
                onChange={(e) => setFilters({ ...filters, premiumMin: e.target.value })} />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.premiumMax}
                onChange={(e) => setFilters({ ...filters, premiumMax: e.target.value })} />
            </div>

            <label>Sum Assured (RM)</label>
            <div className="range-group">
              <input
                type="number"
                placeholder="Min"
                value={filters.sumMin}
                min="0"
                max="500000"
                step="100000"
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (value > 500000) value = 500000;
                  setFilters({ ...filters, sumMin: value });
                }}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.sumMax}
                min="100000"
                max="500000"
                step="100000"
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (value < 100000) value = 100000;
                  if (value > 500000) value = 500000;
                  setFilters({ ...filters, sumMax: value });
                }}
              />
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
                  onClick={() => handleViewDetails(p.plan_id, p.finalPremium, p.sumAssured || p.adjustedSumAssured, p.score)}
                >
                  <div className="insurance-header">
                    <div>
                      <h3>{p.plan_type}</h3>
                      <p
                        className={
                          appliedFilters.taxRelief ? "premium premium-green" : "premium"
                        }
                      >
                        RM {p.finalPremium} /month
                      </p>
                    </div>
                    <img src={`http://localhost:5000/${p.provider_logo}`} alt={p.provider} />
                  </div>

                  <div className="insurance-header">
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
                          <p className="detail">Annual Limit  : RM {p.annual_limit?.toLocaleString()}</p>
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
        <button className="compare-btn">Compare</button>
      )}

      {/* Mobile Filter Modal */}
      {showFilter && isMobile && (
        <div className="filter-modal">
          <div className="filter-box">
            <h3>Filter</h3>

            <label>Premium Amount (RM)</label>
            <div className="range-group">
              <input type="number" placeholder="Min" value={filters.premiumMin}
                onChange={(e) => setFilters({ ...filters, premiumMin: e.target.value })} />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.premiumMax}
                onChange={(e) => setFilters({ ...filters, premiumMax: e.target.value })} />
            </div>

            <label>Sum Assured (RM)</label>
            <div className="range-group">
              <input
                type="number"
                placeholder="Min"
                value={filters.sumMin}
                min="0"
                max="500000"
                step="100000"
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (value > 500000) value = 500000;
                  setFilters({ ...filters, sumMin: value });
                }}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.sumMax}
                min="100000"
                max="500000"
                step="100000"
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (value < 100000) value = 100000;
                  if (value > 500000) value = 500000;
                  setFilters({ ...filters, sumMax: value });
                }}
              />
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
    </div>
  );
}
