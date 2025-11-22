import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { addPlan, updatePlan, getPlanById, getAllPlans } from "../api/insurancePlanAPI";
import "../styles/addInsurancePlan.css";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function AddInsurancePlan() {
  const navigate = useNavigate();
  const location = useLocation();
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
    CI: 0,
  });

  const [logo, setLogo] = useState(null);
  const [brochure, setBrochure] = useState(null);
  const [existingPlans, setExistingPlans] = useState([]);
  const [isFormDirty, setIsFormDirty] = useState(false); // Track unsaved changes
  const [message, setMessage] = useState("");
  const [logoValidation, setLogoValidation] = useState("");
  const [phoneValidation, setPhoneValidation] = useState("");
  const [scopeValidation, setScopeValidation] = useState("");
  const [paymentValidation, setPaymentValidation] = useState("");
  const [planValidation, setPlanValidation] = useState("");
  const [brochureValidation, setBrochureValidation] = useState("");
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);


  const coverageOptions = [
    "Death",
    "Total and Permanent Disability (TPD)",
    "Accidental Death Benefit (ADB)",
    "Accidental Disability Benefit",
  ];

  const paymentOptions = [
    "Flat rate and lower premium until coverage term",
    "Flat rate but higher premium for a short term",
    "Start with lower premium and increase with age growth",
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
            CI: plan.CI ? 1 : 0,
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load plan details");
      }
    };
    init();
  }, [id]);

  // Track form edits
  const handleChange = (e) => {
    setIsFormDirty(true);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMultiSelect = (field, value) => {
    setFormData((prev) => {
      const arr = prev[field];
      return arr.includes(value)
        ? { ...prev, [field]: arr.filter((v) => v !== value) }
        : { ...prev, [field]: [...arr, value] };
    });
  };

  const validateForm = () => {
    let isValid = true;

    const phoneRegex = /^(?:01\d-\d{7,8}|0\d{1,2}-\d{7,8}|1-300-\d{2}-\d{4})$/;

    setPhoneValidation("");
    setPlanValidation("");
    setScopeValidation("");
    setPaymentValidation("");
    setLogoValidation("");
    setBrochureValidation("");

    if (!isEditMode && existingPlans.includes(formData.plan_name.toLowerCase())) {
      setPlanValidation("Plan name already exists");
      isValid = false;
    }

    if (!isEditMode && !logo) {
      setLogoValidation("Please upload a provider logo");
      isValid = false;
    }

    if (!phoneRegex.test(formData.provider_phone)) {
      setPhoneValidation("Invalid phone format (e.g., 011-1234567 / 03-12345678 / 1-300-22-1234)");
      isValid = false;
    }

    if (formData.coverage_scope.length === 0) {
      setScopeValidation("Please select at least one coverage scope");
      isValid = false;
    }

    if (formData.payment_structure.length === 0) {
      setPaymentValidation("Please select at least one payment structure");
      isValid = false;
    }

    if (!isEditMode && !brochure) {
      setBrochureValidation("Please upload a brochure PDF file");
      isValid = false;
    }

    return isValid;
  };

  const handleSaveClick = (e) => {
    e.preventDefault();

    if (validateForm()) {
        setOpenSaveConfirm(true);
    }
    else return;
  };

  const handleSave = async (e) => {
    e.preventDefault();

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
      navigate("/insurancePlanManagement", {
        state: {
          search: location.state?.search,
          planType: location.state?.planType,
          page: location.state?.page,
        }
      });
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

      <ConfirmDialog
        open={openSaveConfirm}
        action="save"
        subject="insurance plan"
        message="Do you confirm to add/update your insurance plan?"
        confirmText="Sure"
        cancelText="Cancel"
        onCancel={() => setOpenSaveConfirm(false)}
        onConfirm={() => {
          setOpenSaveConfirm(false);
          handleSave(new Event("submit"));
        }}
      />

      <ConfirmDialog
        open={openCancelConfirm}
        action="discard"
        subject="your unsaved changes"
        message="Do you confirm to discard your unsaved changes and go back?"
        variant="danger"
        confirmText="Discard"
        cancelText="Cancel"
        onCancel={() => setOpenCancelConfirm(false)}
        onConfirm={() => {
          setOpenCancelConfirm(false);
          navigate("/insurancePlanManagement", {
            state: {
              search: location.state?.search,
              planType: location.state?.planType,
              page: location.state?.page,
            }
          });
        }}
      />

      <form onSubmit={handleSaveClick} className="plan-form">
        <div className="form-grid">
          {/* LEFT COLUMN */}
          <div className="form-column">
            <div className="input-group">
              <label>Plan Name<span className="required">*</span></label>
              <input name="plan_name" value={formData.plan_name} onChange={handleChange} maxLength={100} required />
              {planValidation && <p className="validation">{planValidation}</p>}
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
                  <a href={`${import.meta.env.VITE_API_URL}/${formData.provider_logo}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                </p>
              )}
              {logoValidation && <p className="validation">{logoValidation}</p>}
            </div>

            <div className="input-group">
              <label>Provider Phone<span className="required">*</span></label>
              <input name="provider_phone" value={formData.provider_phone} onChange={handleChange} required />
              {phoneValidation && <p className="validation">{phoneValidation}</p>}
            </div>

            <div className="input-group">
              <label>Provider Email</label>
              <input type="email" name="provider_email" value={formData.provider_email} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label>Premium (RM) per month<span className="required">*</span></label>
              <input type="number" name="premium" value={formData.premium} onChange={handleChange} step="0.1" min="1" required />
            </div>

            <div className="input-group">
              <label>Plan Type<span className="required">*</span></label>
              <select name="plan_type" value={formData.plan_type} onChange={handleChange} required>
                <option value="">Select</option>
                <option value="Life">Life</option>
                <option value="Life + Medical">Life + Medical</option>
              </select>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="form-column">
            <div className="input-group">
              <label>Sum Assured (RM)<span className="required">*</span></label>
              <input 
                type="number" 
                name="sum_assured" 
                value={formData.sum_assured} 
                min="0"
                max="500000"
                step="100000"
                onChange={(e) => {
                  let value = e.target.value;
                  if (Number(value) < 0) value = "0";
                  if (Number(value) > 500000) value = 500000;
                  value = value.replace(/^0+(?=\d)/, "");
                  setIsFormDirty(true);
                  setFormData({ ...formData, sum_assured: value });
                }}
                required 
              />
            </div>
            <div className="input-group">
              <label>Coverage Age<span className="required">*</span></label>
              <input type="number" name="coverage_age" value={formData.coverage_age} onChange={handleChange} min="1" max="100" required />
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
              {scopeValidation && <p className="validation">{scopeValidation}</p>}
            </div>
            <div className="input-group">
              <label>
                <input
                  type="checkbox"
                  name="CI"
                  checked={!!formData.CI}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, CI: e.target.checked ? 1 : 0 }))
                  }
                />
                Critical Illness Rider
              </label>
            </div>

            {formData.plan_type === "Life + Medical" && (
              <>
                
                <div className="input-group">
                  <label>Annual Limit (RM) *empty if no limit</label>
                  <input type="number" name="annual_limit" value={formData.annual_limit} onChange={handleChange} step="0.1" />
                </div>
                <div className="input-group">
                  <label>Lifetime Limit (RM) *empty if no limit</label>
                  <input type="number" name="lifetime_limit" value={formData.lifetime_limit} onChange={handleChange} step="0.1" />
                </div>
                <div className="input-group">
                  <label>Hospital Room & Board (RM)</label>
                  <input type="number" name="hp_room_board" value={formData.hp_room_board} onChange={handleChange} min="100"step="50" required />
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
              {paymentValidation && <p className="validation">{paymentValidation}</p>}
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
                  <a href={`${import.meta.env.VITE_API_URL}/${formData.brochure_path}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                </p>
              )}
              {brochureValidation && <p className="validation">{brochureValidation}</p>}
            </div>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => {
              if (isFormDirty) setOpenCancelConfirm(true);
              else {
                navigate("/insurancePlanManagement", {
                  state: {
                    search: location.state?.search,
                    planType: location.state?.planType,
                    page: location.state?.page,
                  }
                });
              };
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="save-btn"
          >
            {isEditMode ? "Update" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
