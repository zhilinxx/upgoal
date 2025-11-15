import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { getInsuranceProfile, saveInsuranceProfile } from "../api/insuranceAPI";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import "../styles/InsuranceProfileSetup.css";

export default function InsuranceProfileSetup() {
  const navigate = useNavigate();
  const handleBack = () => {
    if (isFormDirty) {
      setOpenCancelConfirm(true);
    } else {
      navigate(-1);
    }
  };

  const userId = localStorage.getItem("userId");
  const [heightValidation, setHeightValidation] = useState("");
  const [weightValidation, setWeightValidation] = useState("");
  const [cholesterolValidation, setCholesterolValidation] = useState("");
  const [bdayValidation, setBdayValidation] = useState("");
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false); 

  const mapFrequencyToText = (num) => {
    switch (parseInt(num)) {
      case 0: return "Never";
      case 1: return "Rarely";
      case 2: return "Sometimes";
      case 3: return "Often";
      default: return "";
    }
  };

  const mapYesNoToText = (num) => (num === 1 ? "Yes" : num === 0 ? "No" : "");

  const mapOccupationToText = (num) => {
    switch (parseInt(num)) {
      case 0: return "Unemployed";
      case 1: return "Low Risk e.g.Office Worker/Techer/Government";
      case 2: return "Moderate Risk e.g.Driver/Security Guard/Chef";
      case 3: return "High Risk e.g.Manual,Industrial Worker/Police/Army";
      default: return "";
    }
  };

  const [formData, setFormData] = useState({
    gender: "",
    birth_date: "",
    height: "",
    weight: "",
    exercise: "",
    alcohol: "",
    smoke: "",
    diabetes: "",
    cholesterol: "",
    asthma: "",
    family_cancer: "",
    heart_disease: "",
    occupation: "",
    allowance: "",
  });
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getInsuranceProfile(userId);
        if (!data) return; // no record → keep default empty

        setFormData({
          gender: data.gender === "M" ? "Male" : data.gender === "F" ? "Female" : "",
          birth_date: data.birth_date ? data.birth_date.split("T")[0] : "",
          height: data.height || "",
          weight: data.weight || "",
          exercise: mapFrequencyToText(data.exercise),
          alcohol: mapFrequencyToText(data.alcohol),
          smoke: mapYesNoToText(data.smoke),
          diabetes: mapYesNoToText(data.diabetes),
          cholesterol: data.cholesterol,
          asthma: mapYesNoToText(data.asthma),
          family_cancer: mapYesNoToText(data.fam_cancer),
          heart_disease: mapYesNoToText(data.heart_disease),
          occupation: mapOccupationToText(data.occupation),
          allowance: data.allowance || "",
        });
      } catch (err) {
        // ✅ If no profile or 404, just keep empty fields
        if (err.response?.status !== 404) {
          console.error("Error fetching profile:", err);
        }
      }
    };
    fetchProfile();
  }, [userId]);

  const handleChange = (e) => {
    setIsFormDirty(true);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSaveClick = (e) => {
    e.preventDefault();

    const today = new Date();
    const birthDate = new Date(formData.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 18 || age > 70) {
      setBdayValidation("Invalid birth date (must be 18–70 years old)");
      return;
    }

    setOpenSaveConfirm(true);
  };

  const handleSave = async (e) => {
    for (let key in formData) {
      if (!formData[key]) {
        toast.error("Please fill all fields");
        return;
      }
    }

    try {
      await saveInsuranceProfile({ user_id: userId, ...formData });
      toast.success("Insurance profile saved successfully!");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400) {
          toast.error(err.response.data.message || "Invalid data. Please check your inputs.");
      } else {
        toast.error("Failed to save profile. Please try again later.");
      }
    }
  };

  return (
    <div className="insurance-setup-container">
      <div className="insurance-setup-header">
        <button className="back-btn" onClick={handleBack}>
          <FaChevronLeft />
        </button>
        <h2>Insurance Profile Setup</h2>
      </div>
      <ConfirmDialog
        open={openSaveConfirm}
        action="save"
        subject="your insurance profile"
        message="Do you confirm to save your insurance profile changes?"
        confirmText="Save"
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
          navigate(-1);
          setOpenCancelConfirm(false);
        }}
      />
      <form onSubmit={handleSaveClick} className="insurance-form">
        {/* Left column */}
        <div className="form-grid">
          <div className="form-column">
            <div className="input-group">
              <label className="setup-label">Gender<span className="required">*</span></label>
              <select name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Birth Date<span className="required">*</span></label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                required
              />
              {bdayValidation && <p className="validation">{bdayValidation}</p>}
            </div>

            <div className="input-group">
              <label className="setup-label">Height (cm)<span className="required">*</span></label>
              <input
                type="number"
                name="height"
                value={formData.height}
                // onChange={handleChange}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  handleChange(e);

                  if (value < 100 || value > 250) {
                    setHeightValidation("Invalid input, the height is not logical.");
                  } else {
                    setHeightValidation("");
                  }
                }}
                step="0.01"
                min="100"
                max="250"
                required
              />
              {heightValidation && <p className="validation">{heightValidation}</p>}
            </div>

            <div className="input-group">
              <label className="setup-label">Weight (kg)<span className="required">*</span></label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  handleChange(e);

                  if (value < 30 || value > 250) {
                    setWeightValidation("Invalid input, the weight is not logical.");
                  } else {
                    setWeightValidation("");
                  }
                }}
                step="0.01"
                min="30"
                max="250"
                required
              />
              {weightValidation && <p className="validation">{weightValidation}</p>}
            </div>

            <div className="input-group">
              <label className="setup-label">Exercise<span className="required">*</span></label>
              <select name="exercise" value={formData.exercise} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Rarely</option>
                <option>Sometimes</option>
                <option>Often</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Drinks Alcohol<span className="required">*</span></label>
              <select name="alcohol" value={formData.alcohol} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Never</option>
                <option>Rarely</option>
                <option>Sometimes</option>
                <option>Often</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">
                Allowance (RM)<span className="required">*</span>
              </label>
              <input
                type="number"
                name="allowance"
                value={formData.allowance}
                onChange={handleChange}
                placeholder="Enter your monthly allowance (net income)"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Right column */}
          <div className="form-column">
            <div className="input-group">
              <label className="setup-label">Smoke<span className="required">*</span></label>
              <select name="smoke" value={formData.smoke} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Diabetes<span className="required">*</span></label>
              <select name="diabetes" value={formData.diabetes} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Cholesterol (mg/dL)<span className="required">*</span></label>
              <input
                type="number"
                name="cholesterol"
                value={formData.cholesterol}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange(e);

                  if (value < 100 || value > 400) {
                    setCholesterolValidation("Invalid input, the cholesterol is not logical.");
                  } else {
                    setCholesterolValidation("");
                  }
                }}
                step="1"
                min="100"
                max="400"
                required
              />
              {cholesterolValidation && <p className="validation">{cholesterolValidation}</p>}
            </div>

            <div className="input-group">
              <label className="setup-label">Asthma<span className="required">*</span></label>
              <select name="asthma" value={formData.asthma} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Family Cancer<span className="required">*</span></label>
              <select name="family_cancer" value={formData.family_cancer} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Heart Disease<span className="required">*</span></label>
              <select name="heart_disease" value={formData.heart_disease} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label className="setup-label">Occupation<span className="required">*</span></label>
              <select name="occupation" value={formData.occupation} onChange={handleChange} required>
                <option value="">Select Occupation Type</option>
                <option>Unemployed</option>
                <option>Low Risk e.g.Office Worker/Techer/Government</option>
                <option>Moderate Risk e.g.Driver/Security Guard/Chef</option>
                <option>High Risk e.g.Manual,Industrial Worker/Police/Army</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="save-btn"
        >
          Save
        </button>
      </form>
    </div>
  );
}
