import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { saveInsuranceProfile } from "../api/insuranceAPI";
import "../styles/InsuranceProfileSetup.css";

export default function InsuranceProfileSetup() {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const userId = localStorage.getItem("userId");

  const [formData, setFormData] = useState({
    gender: "",
    birth_date: "",
    height: "",
    weight: "",
    exercise: "",
    drinks_alcohol: "",
    smoke: "",
    diabetes: "",
    cholesterol: "",
    asthma: "",
    family_cancer: "",
    heart_disease: "",
    occupation: "",
    allowance: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validation
    for (let key in formData) {
      if (!formData[key]) {
        toast.error("Please fill all fields");
        return;
      }
    }

    try {
      await saveInsuranceProfile({ user_id: userId, ...formData });
      toast.success("Profile saved successfully!");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
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

      <form onSubmit={handleSave} className="insurance-form">
        {/* Left column */}
        <div className="form-grid">
          <div className="form-column">
            <div className="input-group">
              <label>Gender<span className="required">*</span></label>
              <select name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>

            <div className="input-group">
              <label>Birth Date<span className="required">*</span></label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Height (cm)<span className="required">*</span></label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Weight (kg)<span className="required">*</span></label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Exercise<span className="required">*</span></label>
              <select name="exercise" value={formData.exercise} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Never</option>
                <option>Rarely</option>
                <option>Sometimes</option>
                <option>Often</option>
              </select>
            </div>

            <div className="input-group">
              <label>Drinks Alcohol<span className="required">*</span></label>
              <select name="alcohol" value={formData.alcohol} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Never</option>
                <option>Rarely</option>
                <option>Sometimes</option>
                <option>Often</option>
              </select>
            </div>

            <div className="input-group">
              <label>
                Allowance (RM)<span className="required">*</span>
              </label>
              <input
                type="number"
                name="allowance"
                value={formData.allowance}
                onChange={handleChange}
                placeholder="Enter your monthly allowance (net income)"
                required
              />
            </div>
          </div>

          {/* Right column */}
          <div className="form-column">
            <div className="input-group">
              <label>Smoke<span className="required">*</span></label>
              <select name="smoke" value={formData.smoke} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label>Diabetes<span className="required">*</span></label>
              <select name="diabetes" value={formData.diabetes} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label>Cholesterol<span className="required">*</span></label>
              <select name="cholesterol" value={formData.cholesterol} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label>Asthma<span className="required">*</span></label>
              <select name="asthma" value={formData.asthma} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label>Family Cancer<span className="required">*</span></label>
              <select name="familyCancer" value={formData.family_cancerr} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label>Heart Disease<span className="required">*</span></label>
              <select name="heartDisease" value={formData.heart_disease} onChange={handleChange} required>
                <option value="">Select</option>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="input-group">
              <label>Occupation<span className="required">*</span></label>
              <select name="occupation" value={formData.occupation} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Unemployed</option>
                <option>Office Worker</option>
                <option>Student</option>
                <option>Manual Worker</option>
                <option>Self-Employed</option>
              </select>
            </div>
          </div>
        </div>

        <button className="save-btn" type="submit">Save</button>
      </form>
    </div>
  );
}
