import React, { useEffect, useState } from "react";
import api from "../api/budgetAPI";
import "../styles/IncomeSetup.css";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { toast } from "react-toastify";

export default function IncomeSetup() {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };
  const [incomeId, setIncomeId] = useState(null);
  const [netIncome, setNetIncome] = useState("");
  const [lifestyle, setLifestyle] = useState("None");
  const [housingLoan, setHousingLoan] = useState("");
  const [carLoan, setCarLoan] = useState("");
  const [otherCommitments, setOtherCommitments] = useState([{ name: "", amount: "" }]);
  const userId = Number(localStorage.getItem("userId"));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/income/setup", { params: { userId } });
        setIncomeId(data.incomeId ?? null);
        setNetIncome(data.netIncome ? String(data.netIncome) : "");
        setLifestyle(data.lifestyle || "None");
        setHousingLoan(data.commitments?.housingLoan ? String(data.commitments.housingLoan) : "");
        setCarLoan(data.commitments?.carLoan ? String(data.commitments.carLoan) : "");

        // Map others from either [number] or [{name, amount}]
        const othersRaw = data.commitments?.other ?? [];
        const normalized = othersRaw.map((o, i) => {
          if (typeof o === "number") {
            return { name: `Other ${i + 1}`, amount: String(o) };
          }
          const name =
            typeof o?.name === "string" && o.name.trim()
              ? o.name.trim()
              : `Other ${i + 1}`;
          const amount =
            o?.amount !== undefined && o.amount !== null ? String(o.amount) : "";
          return { name, amount };
        });
        setOtherCommitments(normalized.length ? normalized : [{ name: "", amount: "" }]);
      } catch (e) {
        console.error("Prefill failed", e);
        toast.error("Failed to load existing data!");
      }
    })();
  }, [userId]);

  const handleOtherChange = (index, field, value) => {
    const updated = [...otherCommitments];
    updated[index] = { ...updated[index], [field]: value };
    setOtherCommitments(updated);
  };

  const addOtherField = () =>
    setOtherCommitments([...otherCommitments, { name: "", amount: "" }]);

  const removeOtherField = (idx) => {
    const updated = otherCommitments.filter((_, i) => i !== idx);
    setOtherCommitments(updated.length ? updated : [{ name: "", amount: "" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      userId,
      netIncome: Number(netIncome),
      lifestyle,
      commitments: {
        housingLoan: Number(housingLoan || 0),
        carLoan: Number(carLoan || 0),
        // IMPORTANT: send {name, amount}
        other: otherCommitments
          .map(({ name, amount }) => ({
            name: (name || "").trim(),
            amount: Number(amount),
          }))
          .filter((x) => x.amount > 0 && x.name.length > 0),
      },
    };

    try {
      if (incomeId) {
        const { data } = await api.put("/income", { ...payload, incomeId });
        console.log("[IncomeSetup] PUT ok:", data);
        toast.info("Income setup updated successfully!");
        navigate("/profile");
      } else {
        const { data } = await api.post("/income", payload);
        console.log("[IncomeSetup] POST ok:", data);
        setIncomeId(data.incomeId);
        toast.success("Income setup saved successfully!");
        navigate("/budgetPlanner");
      }
      
    } catch (err) {
      if (err.response) {
        console.error("[IncomeSetup] Server responded with error:", {
          status: err.response.status,
          data: err.response.data,
          url: err.config?.baseURL + err.config?.url,
          method: err.config?.method,
        });
        toast.error(
          `${err.response.status}: ${typeof err.response.data === "string"
            ? err.response.data
            : err.response.data?.error || "Server error"
          }`
        );
      } else if (err.request) {
        console.error("[IncomeSetup] No response received:", {
          url: err.config?.baseURL + err.config?.url,
          method: err.config?.method,
          request: err.request,
        });
        toast.error("No response from server");
      } else {
        console.error("[IncomeSetup] Request setup error:", err.message);
        toast.error(err.message || "Failed to save income setup");
      }
    }
  };

  return (
    <div className="income-container">
      <div className="income-setup-header">
        <button className="back-btn" onClick={handleBack}>
          <FaChevronLeft />
        </button>
        <h2>Income Setup</h2>
      </div>
      <form onSubmit={handleSubmit} className="income-form">

        {/* Row 1 - Monthly Income only */}
        <div className="row">
          <div className="form-group">
            <label>Monthly Net Income (RM)<span className="required">*</span></label>
            <input
              type="number"
              value={netIncome}
              onChange={(e) => setNetIncome(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Row 2 - Lifestyle */}
        <div className="row">
          <div className="form-group">
            <label>Lifestyle Preferences<span className="required">*</span></label>
            <select
              value={lifestyle}
              onChange={(e) => setLifestyle(e.target.value)}
              required
            >
              <option value="None">None</option>
              <option value="Frugal">Frugal</option>
              <option value="Balanced">Balanced</option>
              <option value="Luxury">Luxury</option>
            </select>
          </div>
        </div>

        {/* Monthly Commitments Title */}
        <h4 className="commitment-title">Monthly Commitments :</h4>

        {/* Row 3 - Housing & Car Loans on same row */}
        <div className="row">
          <div className="form-group">
            <label>Housing Loans (RM)</label>
            <input
              type="number"
              placeholder="e.g., 500"
              value={housingLoan}
              onChange={(e) => setHousingLoan(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Car Loans (RM)</label>
            <input
              type="number"
              placeholder="e.g., 500"
              value={carLoan}
              onChange={(e) => setCarLoan(e.target.value)}
            />
          </div>
        </div>

        {/* Other Commitments Title */}
        <label>Other Commitments <button type="button" className="add-other-btn" onClick={addOtherField}>+</button></label>

        {/* Other Commitment Fields */}
        {otherCommitments.map((item, idx) => (
          <div className="row other-row" key={idx}>
            <input
              type="text"
              placeholder="e.g., PTPTN Loan"
              value={item.name}
              onChange={(e) => handleOtherChange(idx, "name", e.target.value)}
            />
            <input
              type="number"
              placeholder="e.g., 100.00"
              value={item.amount}
              onChange={(e) => handleOtherChange(idx, "amount", e.target.value)}
            />
            <button
              type="button"
              className="remove-other-btn"
              onClick={() => removeOtherField(idx)}
            >
              −
            </button>
          </div>
        ))}

        <div className="button-row">
          <button type="submit" className="save-btn">Save</button>
        </div>
      </form>

    </div>
  );
}
