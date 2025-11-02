import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { addPlan, updatePlan, getPlanById, getAllPlans } from "../api/insurancePlanAPI";
import "../styles/addInsurancePlan.css";

export default function AddInsurancePlan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isEditMode, setIsEditMode] = useState(!!id);

  const [formData, setFormData] = useState({
    plan_name: "",
    plan_type: "",
    provider: "",
    provider_phone: "",
    provider_email: "",
    premium: "",
    payment_structure: [],
    sum_assured: "",
    coverage_age: "",
    coverage_scope: [],
    annual_limit: "",
    lifetime_limit: "",
    hp_room_board: "",
  });

  const [logo, setLogo] = useState(null);
  const [brochure, setBrochure] = useState(null);
  const [existingPlans, setExistingPlans] = useState([]);

  const coverageOptions = [
    "Death",
    "Terminal illness",
    "Total and Permanent Disability (TPD)",
    "Accidental Death Benefit (ADB)",
    "Accidental Disability Benefit",
  ];

  const paymentOptions = [
    "Flat rate and lower premium until coverage term",
    "Flat rate but higher payment for a short term",
    "Increase with age growth",
    "Start with higher premium and lower after certain age",
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await getAllPlans("", 1, 999);
        setExistingPlans(data.plans.map((p) => p.plan_name.toLowerCase()));

        if (id) {
          const { data: plan } = await getPlanById(id);
          setFormData({
            ...plan,
            coverage_scope: plan.coverage_scope ? plan.coverage_scope.split(", ") : [],
            payment_structure: plan.payment_structure ? plan.payment_structure.split(", ") : [],
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load plan details");
      }
    };
    init();
  }, [id]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleMultiSelect = (field, value) => {
    setFormData((prev) => {
      const arr = prev[field];
      return arr.includes(value)
        ? { ...prev, [field]: arr.filter((v) => v !== value) }
        : { ...prev, [field]: [...arr, value] };
    });
  };

  const validateForm = () => {
  // const phoneRegex = /^(?:\+?60\s?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}|01\d{1}-\d{7,8})$/;
  const phoneRegex = /^(?:01\d-\d{7,8}|0\d{1,2}-\d{7,8}|1-300-\d{2}-\d{4})$/;

    if (!phoneRegex.test(formData.provider_phone)) {
      toast.error("Invalid phone format (e.g., 011-1234567 / 03-12345678 / 1-300-22-1234)");
      return false;
    }
    if (!isEditMode && existingPlans.includes(formData.plan_name.toLowerCase())) {
      toast.error("Plan name already exists");
      return false;
    }

    if (
      formData.plan_type === "Life" &&
      formData.coverage_scope.length === 0
    ) {
      toast.error("Please select at least one coverage scope");
      return false;
    }

    if (formData.payment_structure.length === 0) {
      toast.error("Please select at least one payment structure");
      return false;
    }

    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const form = new FormData();
    Object.entries({
      ...formData,
      coverage_scope: formData.coverage_scope.join(", "),
      payment_structure: formData.payment_structure.join(", "),
    }).forEach(([k, v]) => form.append(k, v));

    if (logo) form.append("logo", logo);
    if (brochure) form.append("brochure", brochure);

    try {
      if (isEditMode) {
        await updatePlan(id, form);
        toast.success("Plan updated successfully!");
      } else {
        await addPlan(form);
        toast.success("Plan added successfully!");
      }
      navigate("/insurancePlanManagement");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save plan");
    }
  };

  return (
    <div className="add-plan-container">
      <div className="add-plan-header">
        <h2>{isEditMode ? "Edit Insurance Plan" : "Add Insurance Plan"}</h2>
      </div>

      <form onSubmit={handleSave} className="plan-form">
        <div className="form-grid">
          {/* LEFT COLUMN */}
          <div className="form-column">
            <div className="input-group">
              <label>Plan Name<span className="required">*</span></label>
              <input name="plan_name" value={formData.plan_name} onChange={handleChange} maxLength={100} required />
            </div>

            <div className="input-group">
              <label>Provider Name<span className="required">*</span></label>
              <input name="provider" value={formData.provider} onChange={handleChange} maxLength={50} required />
            </div>

            <div className="input-group">
              <label>Provider Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files[0])}
              />
              {isEditMode && formData.provider_logo && (
                <p className="existing-file">
                  Current provider logo:
                  <a href={`http://localhost:5000/${formData.provider_logo}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                </p>
              )}
            </div>

            <div className="input-group">
              <label>Provider Phone<span className="required">*</span></label>
              <input name="provider_phone" value={formData.provider_phone} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label>Provider Email</label>
              <input type="email" name="provider_email" value={formData.provider_email} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label>Premium (RM) per month<span className="required">*</span></label>
              <input type="number" name="premium" value={formData.premium} onChange={handleChange} step="0.1" max="1000" required />
            </div>

            <div className="input-group">
              <label>Plan Type<span className="required">*</span></label>
              <select name="plan_type" value={formData.plan_type} onChange={handleChange} required>
                <option value="">Select</option>
                <option value="Life">Life</option>
                <option value="Medical">Medical</option>
              </select>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="form-column">
            {formData.plan_type === "Life" && (
              <>
                <div className="input-group">
                  <label>Sum Assured (RM)<span className="required">*</span></label>
                  <input type="number" name="sum_assured" value={formData.sum_assured} onChange={handleChange} step="0.1" required />
                </div>
                <div className="input-group">
                  <label>Coverage Age<span className="required">*</span></label>
                  <input type="number" name="coverage_age" value={formData.coverage_age} onChange={handleChange} max="100" required />
                </div>

                <div className="input-group">
                  <label>Coverage Scope (select one or more)<span className="required">*</span></label>
                  <div className="checkbox-group">
                    {coverageOptions.map((opt) => (
                      <label key={opt}>
                        <input
                          type="checkbox"
                          checked={formData.coverage_scope.includes(opt)}
                          onChange={() => handleMultiSelect("coverage_scope", opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {formData.plan_type === "Medical" && (
              <>
                <div className="input-group">
                  <label>Annual Limit (RM)</label>
                  <input type="number" name="annual_limit" value={formData.annual_limit} onChange={handleChange} step="0.1" />
                </div>
                <div className="input-group">
                  <label>Lifetime Limit (RM) *empty if no limit</label>
                  <input type="number" name="lifetime_limit" value={formData.lifetime_limit} onChange={handleChange} step="0.1" />
                </div>
                <div className="input-group">
                  <label>Hospital Room & Board (RM)</label>
                  <input type="number" name="hp_room_board" value={formData.hp_room_board} onChange={handleChange} step="0.1" />
                </div>
              </>
            )}

            {/* Common fields */}
            <div className="input-group">
              <label>Payment Structure (select one or more)<span className="required">*</span></label>
              <div className="checkbox-group">
                {paymentOptions.map((opt) => (
                  <label key={opt}>
                    <input
                      type="checkbox"
                      checked={formData.payment_structure.includes(opt)}
                      onChange={() => handleMultiSelect("payment_structure", opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>Plan Brochure (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setBrochure(e.target.files[0])}
              />
              {isEditMode && formData.brochure_path && (
                <p className="existing-file">
                  Current brochure:
                  <a href={`http://localhost:5000/${formData.brochure_path}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="button-row">
          <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="save-btn">{isEditMode ? "Update" : "Add"}</button>
        </div>
      </form>
    </div>
  );
}
