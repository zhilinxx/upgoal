import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart, FaThumbsUp, FaChevronLeft } from "react-icons/fa";
import { getPlanById } from "../api/insuranceAPI";
import { checkFavourite, addFavourite, removeFavourite } from "../api/favouritePlanAPI";
import "../styles/planDetails.css";

export default function InsurancePlanDetails() {
  const { planId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  // ✅ Safe defaults
  const previousFilters = location.state?.filters || {};
  const score = location.state?.score || 0;

  const [plan, setPlan] = useState(null);
  const [userSuggestion, setUserSuggestion] = useState("");
  const [applyTaxRelief, setApplyTaxRelief] = useState(previousFilters.taxRelief || false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [userSumAssured, setUserSumAssured] = useState(null);
  const premiumNoTax = Number(location.state?.premiumNoTax);
  const premiumWithTax = Number(location.state?.premiumWithTax);

  useEffect(() => {
    if (location.state) {
      setUserSumAssured(location.state.sumAssured || null);
    }

    const fetchPlan = async () => {
      try {
        const { data } = await getPlanById(planId, userId);
        setPlan(data.plan);
        setUserSuggestion(data.userSuggestion);
        const favRes = await checkFavourite(userId, planId, location.state?.sumAssured);
        setIsFavourite(favRes.data.isFavourite);
        if (favRes.data.isFavourite && favRes.data.sumAssured) {
          setUserSumAssured(favRes.data.sumAssured);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlan();
  }, [planId, userId]);


  if (!plan) return <p>Loading...</p>;

  // const checkFavStatus = async () => {
  // const { data } = await checkFavourite(userId, planId);
  //   setIsFavourite(data.isFavourite);
  // };
  // checkFavStatus();
  const displayedSumAssured = userSumAssured || plan.sum_assured;
  const displayedPremium = applyTaxRelief ? premiumWithTax : premiumNoTax;


  // let premium = Number(displayedPremium);
  // const originalPremium = Number(plan.premium);
  // const passedPremium = Number(userPremium);

  // if (previousFilters?.taxRelief) {
  //   // Base premium already tax-relieved from recommendations
  //   if(passedPremium == 0 || passedPremium == null){
  //     if(applyTaxRelief){
  //       premium = Math.max(passedPremium, 0);
  //     }
  //     else {
  //       premium = originalPremium;
  //     }
  //   }
  //   else{
  //     premium = applyTaxRelief ? premium : premium + 250;
  //   }

  // } else {
  //   // Apply or remove relief locally
  //   premium = applyTaxRelief ? Math.max(premium - 250, 0) : premium;
  // }

  // premium = premium.toFixed(2);

  // ✅ Suggested payment structures
  const paymentStructures = plan.payment_structure
    ? plan.payment_structure.split(",").map((s) => s.trim())
    : [];

  const getSuggestedStructure = () => {
    if (userSuggestion && paymentStructures.some(ps => ps.toLowerCase().includes(userSuggestion.toLowerCase()))) {
      return userSuggestion;
    }
    return "Flat rate and lower premium until coverage term.";
  };

  const suggested = getSuggestedStructure();

  const handleFavourite = async () => {
    try {
      if (isFavourite) {
        await removeFavourite(userId, planId);
        setIsFavourite(false);
      } else {
        await addFavourite(userId, planId, displayedSumAssured);
        setIsFavourite(true);
      }
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="plan-details-container">
      <button 
        className="back-btn"
        onClick={() => {
          const fromFav = location.state?.fromFavourite;
          if (fromFav) navigate(-1);
          else navigate("/insuranceRecommendations", { state: { filters: previousFilters } })
        }}
      >
        < FaChevronLeft />
      </button>
      <div className="plan-details-inner">
        <div className="plan-header">
          <img src={`http://localhost:5000/${plan.provider_logo}`} alt={plan.provider} className="provider-logo" />
          <div>
            <h3>{plan.plan_name}</h3>
            <button className="fav-btn" onClick={handleFavourite}>
                {isFavourite ? <FaHeart className="filled" /> : <FaRegHeart />}
            </button>
          </div>
          <p className="suitability-score">Suitability Score: <strong>{score}%</strong></p>
        </div>

        <div className="plan-info">
          <div className="upper-part">
            <div className="row">
              <span className="row-label">
                Premium {applyTaxRelief && <small>(tax relief estimated)</small>}
              </span>
              <span className="row-content">
                RM {displayedPremium.toFixed(2)} /month
                <label className="switch">
                  <input type="checkbox" checked={applyTaxRelief} onChange={() => setApplyTaxRelief(!applyTaxRelief)} />
                  <span className="slider round"></span>
                </label>
              </span>
            </div>

            <div className="row"><span className="row-label">Sum Assured</span><span className="row-content">RM {displayedSumAssured.toLocaleString()}</span></div>
            <div className="row"><span className="row-label">Coverage Age</span><span className="row-content">{plan.coverage_age} years</span></div>
            <div className="row"><span className="row-label">Coverage Scope</span><span className="row-content">{plan.coverage_scope}</span></div>

            <div className="row">
              <span className="row-label">Critical Illness Rider</span>
              <span
                className={`ci-status ${plan.CI ? "ci-yes" : "ci-no"}`}
              >
                {plan.CI ? "Included" : "Not Included"}
              </span>
            </div>
            {plan.plan_type === "Life + Medical" && (
              <>
                <div className="row"><span className="row-label">Annual Limit</span><span className="row-content">{plan.annual_limit && plan.annual_limit != 0 && plan.annual_limit != null ? `RM ${plan.annual_limit.toLocaleString()}` : "No limit"}</span></div>
                <div className="row"><span className="row-label">Lifetime Limit</span><span className="row-content">{plan.lifetime_limit && plan.lifetime_limit != 0 && plan.lifetime_limit != null ? `RM ${plan.lifetime_limit.toLocaleString()}` : "No limit"}</span></div>
                <div className="row"><span className="row-label">Hospital Room & Board</span><span className="row-content">{plan.hp_room_board}/day</span></div>
              </>
            )}
            <div className="payment-struc">
              <span className="row-label">Payment Structure <small>(suggested)</small></span>
              <ul className="payment-list">
                {paymentStructures.map((structure, index) => (
                  <li key={index}>
                    {index + 1}. {structure}
                    {structure.toLowerCase().includes(suggested.toLowerCase()) && (
                      <FaThumbsUp className="thumb-icon" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="bottom-part">
            <div className="contact">
              <div>
                <p><strong>Get interest</strong></p>
                {plan.provider_email && (
                  <>
                  <p>📧 {plan.provider_email}</p>
                  </>
                )}
                <p>📞 {plan.provider_phone}</p>
              </div>
              <div>
                <p><strong>More details</strong></p>
                <a href={`http://localhost:5000/${plan.brochure_path}`} target="_blank" rel="noreferrer">brochure.pdf</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
