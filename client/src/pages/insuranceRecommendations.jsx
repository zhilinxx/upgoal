import React, { useEffect, useState } from "react";
import { getRecommendations, getProviders } from "../api/insuranceAPI";
import { useNavigate } from "react-router-dom"; 
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
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);

  useEffect(() => {
    const resizeHandler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  useEffect(() => {
    fetchProviders();
    fetchPlans();
  }, []);

  const fetchProviders = async () => {
    const { data } = await getProviders();
    setProviders(data);
  };

  const fetchPlans = async (customFilters = filters) => {
    setLoading(true);
    const userId = localStorage.getItem("userId");
    try {
      const { data } = await getRecommendations(userId, customFilters);
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
    fetchPlans();
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
    const sorted = [...plans];
    switch (option) {
      case "premiumHigh": sorted.sort((a,b)=>b.finalPremium - a.finalPremium); break;
      case "premiumLow": sorted.sort((a,b)=>a.finalPremium - b.finalPremium); break;
      case "scoreHigh": sorted.sort((a,b)=>b.score - a.score); break;
      case "scoreLow": sorted.sort((a,b)=>a.score - b.score); break;
      default: break;
    }
    setPlans(sorted);
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

  return (
    <div className="insurance-container">
      <h2>Insurance Recommendations</h2>

      {/* Top Filter Bar (Mobile) */}
      {isMobile && (
        <div className="top-bar">
          <button className="filter-btn" onClick={() => setShowFilter(true)}>
            <FaFilter /> Filter
          </button>
          <button className="all-btn" onClick={handleClear}>All</button>
          <select className="sort-select" onChange={(e)=>handleSort(e.target.value)}>
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
            <h3>Filter</h3>

            <label>Premium Amount</label>
            <div className="range-group">
              <input type="number" placeholder="Min" value={filters.premiumMin}
                onChange={(e)=>setFilters({...filters, premiumMin:e.target.value})}/>
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.premiumMax}
                onChange={(e)=>setFilters({...filters, premiumMax:e.target.value})}/>
            </div>

            <label>Sum Assured / Annual Limit</label>
            <div className="range-group">
              <input type="number" placeholder="Min" value={filters.sumMin}
                onChange={(e)=>setFilters({...filters, sumMin:e.target.value})}/>
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.sumMax}
                onChange={(e)=>setFilters({...filters, sumMax:e.target.value})}/>
            </div>

            <label>Plan Type</label>
            <div className="plan-types">
              {["All", "Life", "Medical"].map(type => (
                <button key={type}
                  className={filters.planType === type ? "active" : ""}
                  onClick={()=>setFilters({...filters, planType:type})}>
                  {type}
                </button>
              ))}
            </div>

            <label>Insurance Provider</label>
            <select value={filters.provider}
              onChange={(e)=>setFilters({...filters, provider:e.target.value})}>
              <option value="">All</option>
              {providers.map(p=> <option key={p}>{p}</option>)}
            </select>

            <label className="switch-label">
              Tax Relief Estimation
              <input type="checkbox" checked={filters.taxRelief}
                onChange={(e)=>setFilters({...filters, taxRelief:e.target.checked})}/>
            </label>

            <div className="filter-actions">
              <button onClick={handleClear}>Cancel</button>
              <button className="apply" onClick={handleApply}>Apply</button>
            </div>
          </div>
        )}

        {/* Insurance Plans */}
        <div className="insurance-list">
          {loading ? (
            <p>Loading...</p>
          ) : plans.length === 0 ? (
            <p>No matching plans found.</p>
          ) : (
            plans.map((p) => (
              <div className="insurance-card" key={p.plan_id}>
                <div className="insurance-header">
                  <h3>{p.plan_type}</h3>
                  <img src={p.company_logo} alt={p.company_name} />
                </div>
                <p className="premium">RM {p.finalPremium}/month</p>
                {p.sum_assured && <p>RM {p.sum_assured} sum assured</p>}
                <p>Score {p.score}%</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filter Modal (Mobile) */}
      {showFilter && isMobile && (
        <div className="filter-modal">
          <div className="filter-box">
            <button className="close-btn" onClick={()=>setShowFilter(false)}><FaTimes/></button>
            <h3>Filter</h3>

            <label>Premium Amount</label>
            <div className="range-group">
              <input type="number" placeholder="Min" value={filters.premiumMin}
                onChange={(e)=>setFilters({...filters, premiumMin:e.target.value})}/>
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.premiumMax}
                onChange={(e)=>setFilters({...filters, premiumMax:e.target.value})}/>
            </div>

            <label>Sum Assured / Annual Limit</label>
            <div className="range-group">
              <input type="number" placeholder="Min" value={filters.sumMin}
                onChange={(e)=>setFilters({...filters, sumMin:e.target.value})}/>
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.sumMax}
                onChange={(e)=>setFilters({...filters, sumMax:e.target.value})}/>
            </div>

            <label>Plan Type</label>
            <div className="plan-types">
              {["All", "Life", "Medical"].map(type => (
                <button key={type}
                  className={filters.planType === type ? "active" : ""}
                  onClick={()=>setFilters({...filters, planType:type})}>
                  {type}
                </button>
              ))}
            </div>

            <label>Insurance Provider</label>
            <select value={filters.provider}
              onChange={(e)=>setFilters({...filters, provider:e.target.value})}>
              <option value="">All</option>
              {providers.map(p=> <option key={p}>{p}</option>)}
            </select>

            <label className="switch-label">
              Tax Relief Estimation
              <input type="checkbox" checked={filters.taxRelief}
                onChange={(e)=>setFilters({...filters, taxRelief:e.target.checked})}/>
            </label>

            <div className="filter-actions">
              <button onClick={()=>setShowFilter(false)}>Cancel</button>
              <button className="apply" onClick={handleApply}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
