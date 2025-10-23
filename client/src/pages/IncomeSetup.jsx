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
  const [otherCommitments, setOtherCommitments] = useState([""]);
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
        const others = (data.commitments?.other || []).map(String);
        setOtherCommitments(others.length ? others : [""]);
      } catch (e) {
        console.error("Prefill failed", e);
        toast.error("Failed to load existing data!"); 
      }
    })();
  }, []);

  const handleOtherChange = (index, value) => {
    const updated = [...otherCommitments];
    updated[index] = value;
    setOtherCommitments(updated);
  };

  const addOtherField = () => setOtherCommitments([...otherCommitments, ""]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      userId,
      netIncome: Number(netIncome),
      lifestyle,
      commitments: {
        housingLoan: Number(housingLoan || 0),
        carLoan: Number(carLoan || 0),
        other: otherCommitments.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0),
      },
    };

    try {
      if (incomeId) {
        await api.put("/income", { ...payload, incomeId });
        toast.info("Income setup updated successfully!"); 
      } else {
        const { data } = await api.post("/income", payload);
        setIncomeId(data.incomeId);
        toast.success("Income setup saved successfully!"); 
      }
      navigate("/budget-planner");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Failed to save income setup";
      toast.error(msg); 
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

        {otherCommitments.map((val, idx) => (
          <input
            key={idx}
            type="number"
            placeholder="Other..."
            value={val}
            onChange={(e) => handleOtherChange(idx, e.target.value)}
          />
        ))}

        <button type="button" onClick={addOtherField} className="add-other-btn">+</button>
        <button type="submit" className="save-btn">Save</button>
      </form>
    </div>
  );
}
