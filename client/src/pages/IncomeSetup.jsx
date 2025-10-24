import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/IncomeSetup.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function IncomeSetup() {
  const navigate = useNavigate();
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
        setIncomeId(data.incomeId);
        setNetIncome(data.netIncome ? String(data.netIncome) : "");
        setLifestyle(data.lifestyle || "None");
        setHousingLoan(data.commitments?.housingLoan ? String(data.commitments.housingLoan) : "");
        setCarLoan(data.commitments?.carLoan ? String(data.commitments.carLoan) : "");
        const othersRaw = data.commitments?.other ?? [];
        const others = othersRaw.map((o, i) => {
          if (typeof o === "number") return { name: `Other ${i + 1}`, amount: String(o) }; // backward compat
          return { name: o?.name ?? `Other ${i + 1}`, amount: String(o?.amount ?? 0) };
        });
        setOtherCommitments(others.length ? others : [{ name: "", amount: "" }]);
      } catch (e) {
        console.error("Prefill failed", e);
        toast.error("Failed to load existing data!");
      }
    })();
  }, []);

  const handleOtherChange = (index, field, value) => {
    const updated = [...otherCommitments];
    updated[index] = { ...updated[index], [field]: value };
    setOtherCommitments(updated);
  };

  const addOtherField = () => setOtherCommitments([...otherCommitments, { name: "", amount: "" }]);
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
        other: otherCommitments
          .map(({ name, amount }) => ({ name: (name || "").trim(), amount: Number(amount) }))
          .filter(x => x.amount > 0),
      },
    };

    try {
      console.log("[IncomeSetup] saving…", { incomeId, payload });
      if (incomeId) {
        const { data } = await api.put("/income", { ...payload, incomeId });
        console.log("[IncomeSetup] PUT ok:", data);
        toast.info("Income setup updated successfully!");
      } else {
        const { data } = await api.post("/income", payload);
        console.log("[IncomeSetup] POST ok:", data);
        setIncomeId(data.incomeId);
        toast.success("Income setup saved successfully!");
      }
      navigate("/budget-planner");
    } catch (err) {
      // Show detailed diagnostics in DevTools
      if (err.response) {
        console.error("[IncomeSetup] Server responded with error:", {
          status: err.response.status,
          data: err.response.data,
          url: err.config?.baseURL + err.config?.url,
          method: err.config?.method,
        });
        toast.error(`${err.response.status}: ${typeof err.response.data === "string"
          ? err.response.data
          : err.response.data?.error || "Server error"
          }`);
      } else if (err.request) {
        console.error("[IncomeSetup] No response received:", {
          url: err.config?.baseURL + err.config?.url,
          method: err.config?.method,
          request: err.request,
        });
        toast.error("No response from server (network/preflight/server crash)");
      } else {
        console.error("[IncomeSetup] Request setup error:", err.message);
        toast.error(err.message || "Failed to save income setup");
      }
    }

  };

  return (
    <div className="income-container">
      <h2>Income Setup</h2>
      <form onSubmit={handleSubmit} className="income-form">
        <label>Monthly Net Income (RM)*</label>
        <input
          type="number"
          placeholder="e.g., 3500.00"
          value={netIncome}
          onChange={(e) => setNetIncome(e.target.value)}
          required
        />

        <label>Lifestyle Preferences*</label>
        <select value={lifestyle} onChange={(e) => setLifestyle(e.target.value)} required>
          <option value="None">None</option>
          <option value="Frugal">Frugal</option>
          <option value="Balanced">Balanced</option>
          <option value="Luxury">Luxury</option>
        </select>

        <h4>Monthly Commitments :</h4>
        <label>Housing Loans (RM)</label>
        <input
          type="number"
          placeholder="e.g., 500.00"
          value={housingLoan}
          onChange={(e) => setHousingLoan(e.target.value)}
        />

        <label>Car Loans (RM)</label>
        <input
          type="number"
          placeholder="e.g., 500.00"
          value={carLoan}
          onChange={(e) => setCarLoan(e.target.value)}
        />

        <label>Other Commitments</label>
        {otherCommitments.map((item, idx) => (
          <div key={idx} className="other-row" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              type="text"
              placeholder="e.g., PTPTN Loan"
              value={item.name}
              onChange={(e) => handleOtherChange(idx, "name", e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              placeholder="e.g., 100.00"
              value={item.amount}
              onChange={(e) => handleOtherChange(idx, "amount", e.target.value)}
              style={{ width: 140 }}
            />
            <button type="button" onClick={() => removeOtherField(idx)} className="remove-other-btn">−</button>
          </div>
        ))}

        <button type="button" onClick={addOtherField} className="add-other-btn">+</button>
        <button type="submit" className="save-btn">Save</button>
      </form>
    </div>
  );
}
