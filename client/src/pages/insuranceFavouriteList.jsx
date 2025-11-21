import React, { useEffect, useState } from "react";
import { FaTrashAlt, FaHeart, FaChevronLeft } from "react-icons/fa";
import { getFavourites, removeMultipleFavourites } from "../api/favouritePlanAPI";
import { getPlanScore } from "../api/insuranceAPI";
import "../styles/insuranceFavouriteList.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function FavouriteList() {
  const userId = localStorage.getItem("userId");
  const [favourites, setFavourites] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sortOrder, setSortOrder] = useState("all");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [openRemoveConfirm, setOpenRemoveConfirm] = useState(false);
  const [openRemoveAllConfirm, setOpenRemoveAllConfirm] = useState(false);

  useEffect(() => {
    fetchFavourites();
  }, []);

  // Fetch favourites and calculate plan scores
  const fetchFavourites = async () => {
    try {
      setLoading(true);
      const res = await getFavourites(userId);
      const favs = res.data;

      const scoredFavourites = await Promise.all(
        favs.map(async (plan) => {
          try {
            const scoreRes = await getPlanScore(plan.plan_id, userId, plan.sum_assured);
            return {
              ...plan,
              score: scoreRes.data.score,
              finalPremium: scoreRes.data.finalPremium,
              premiumWithTax: scoreRes.data.premiumWithTax,
              premiumNoTax: scoreRes.data.premiumNoTax,
              adjustedSumAssured: scoreRes.data.adjustedSumAssured,
            };
          } catch (err) {
            console.error("Score fetch failed:", err);
            return { ...plan, score: "-", finalPremium: plan.premium };
          }
        })
      );

      setFavourites(scoredFavourites);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load favourites");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (plan) => {
    const exists = selected.find(
      (s) => s.plan_id === plan.plan_id && s.sum_assured === plan.sum_assured
    );
    setSelected((prev) =>
      exists
        ? prev.filter(
            (s) =>
              !(s.plan_id === plan.plan_id && s.sum_assured === plan.sum_assured)
          )
        : [...prev, plan]
    );
  };

  const handleRemoveSelected = async () => {
    try { 
      await removeMultipleFavourites(userId, selected);
      toast.success("Removed selected plans");
      setSelected([]);
      fetchFavourites();
    } catch (err) {
      toast.error("Failed to remove selected");
    }
  };

  const handleRemoveAll = async () => {
    if (favourites.length === 0) return;
    await removeMultipleFavourites(userId, favourites);
    toast.success("All favourites cleared");
    setSelected([]);
    fetchFavourites();
  };

  // Navigate to plan details with accurate filters
  const handlePlanClick = (plan) => {
    navigate(`/plan/${plan.plan_id}`, {
      state: {
        sumAssured: plan.adjustedSumAssured || plan.sum_assured,
        filters: {
          taxRelief: false,
        },
        score: plan.score,
        premiumWithTax: plan.premiumWithTax,
        premiumNoTax: plan.premiumNoTax,
        fromFavourite: true,
      },
    });
  };

  const sortedFavourites = [...favourites].sort((a, b) => {
    if (sortOrder === "low") return a.finalPremium - b.finalPremium;
    if (sortOrder === "high") return b.finalPremium - a.finalPremium;
    return 0;
  });

  return (
    <div className="fav-container">
      <div className="fav-header">
        <button className="back-btn" onClick={() => navigate(-1)} > < FaChevronLeft /> </button>
        <h2 className="fav-title">Favourite List</h2>
        <div></div>
      </div>
      <ConfirmDialog
        open={openRemoveConfirm}
        action="delete"
        subject="your favourite plan"
        message="Do you confirm to remove the selected plan(s) from favourite?"
        confirmText="Remove"
        cancelText="Cancel"
        onCancel={() => setOpenRemoveConfirm(false)}
        onConfirm={() => {
          setOpenRemoveConfirm(false);
          handleRemoveSelected();
        }}
      />
      <ConfirmDialog
        open={openRemoveAllConfirm}
        action="delete"
        subject="your favourite plan"
        message="Do you confirm to remove ALL favourite plans?"
        confirmText="Remove"
        cancelText="Cancel"
        onCancel={() => setOpenRemoveAllConfirm(false)}
        onConfirm={() => {
          setOpenRemoveAllConfirm(false);
          handleRemoveAll();
        }}
      />
      <div className="fav-controls">
        <select
          className="fav-sort"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="all">All</option>
          <option value="low">Premium ↑</option>
          <option value="high">Premium ↓</option>
        </select>

        <div className="fav-btn-group">
          <button className="remove-all-btn" onClick={() => setOpenRemoveAllConfirm(true)} >
            Remove All
          </button>
          <FaTrashAlt className="trash-icon" onClick={() => {if (selected.length === 0) return toast.warn("Select at least one plan to remove"); else setOpenRemoveConfirm(true)} } />
        </div>
      </div>

      <div className="fav-grid">
        {loading ? (
          <p>Loading favourites...</p>
        ) : sortedFavourites.length > 0 ? (
          sortedFavourites.map((plan) => (
            <div
              key={`${plan.plan_id}-${plan.sum_assured}`}
              className="fav-card"
              onClick={() => handlePlanClick(plan)}
            >
              <div className="fav-header">
                <h4>{plan.plan_name}</h4>
              </div>
              <div className="fav-card-content">
                <div className="fav-side">
                  <img
                    src={`http://localhost:5000/${plan.provider_logo}`}
                    alt={plan.provider}
                    className="fav-logo"
                  />
                  <p>
                    Score:{" "}
                    <span className="score">
                      {plan.score}%
                    </span>
                  </p>
                </div>
                
                <div className="fav-info">
                  <p className="plan-type">{plan.plan_type}</p>
                  <p>
                    <span className="premium">
                      RM{Number(plan.finalPremium || plan.premium).toFixed(2)}
                      </span> /month
                  </p>
                  <p>
                    Sum Assured:{" "}
                    <span className="sum-assured">RM{Number(plan.adjustedSumAssured || plan.sum_assured).toLocaleString()}</span>
                  </p>
                </div>
                <div
                  className="fav-actions"
                  onClick={(e) => e.stopPropagation()} // prevent click trigger navigation
                >
                  <FaHeart className="fav-heart" />
                  <input
                    type="checkbox"
                    checked={selected.some(
                      (s) =>
                        s.plan_id === plan.plan_id &&
                        s.sum_assured === plan.sum_assured
                    )}
                    onChange={() => handleSelect(plan)}
                  />
                </div>
              </div>
              
            </div>
          ))
        ) : (
          <p className="empty-text">No favourites yet</p>
        )}
      </div>
    </div>
  );
}
