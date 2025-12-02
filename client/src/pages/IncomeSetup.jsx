// client/src/pages/IncomeSetup.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiMinus } from "react-icons/fi";
import { toast } from "react-toastify";
import { API } from "../api/auth"; 
import "../styles/IncomeSetup.css";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

/* ---------- Money helpers ---------- */
const MAX_DECIMAL_NUM = 9_999_999_999.99;
const MAX_DECIMAL_STR = "9,999,999,999.99";
const amountOK = (v) =>
  v === "" || /^(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/.test(String(v).trim());
const toNum = (v) => Number(String(v).replace(/,/g, ""));
const to2 = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) ? n.toFixed(2) : "";
};

/** Keep only digits + one dot, clamp to two decimals while typing */
const sanitizeMoney = (raw) => {
  let s = String(raw);
  // remove everything except digits and dots
  s = s.replace(/[^0-9.]/g, "");
  // if multiple dots, keep first
  const first = s.indexOf(".");
  if (first !== -1) {
    s =
      s.slice(0, first + 1) +
      s
        .slice(first + 1)
        .replace(/\./g, ""); // drop remaining dots
  }
  // limit decimals to 2
  if (first !== -1) {
    const intPart = s.slice(0, first);
    const decPart = s.slice(first + 1, first + 1 + 2);
    s = (intPart || "0") + "." + decPart;
  }
  // strip leading zeros (but keep "0" or "0.xx")
  s = s.replace(/^0+(?=\d)/, ""); // keep a single 0 before dot if needed
  if (s.startsWith(".")) s = "0" + s;
  return s;
};

export default function IncomeSetup() {
  const navigate = useNavigate();

  const [incomeId, setIncomeId] = useState(null);
  const [netIncome, setNetIncome] = useState("");
  const [lifestyle, setLifestyle] = useState(""); // start empty so placeholder can show
  const [housingLoan, setHousingLoan] = useState("");
  const [carLoan, setCarLoan] = useState("");
  const [otherCommitments, setOtherCommitments] = useState([
    { name: "", amount: "" },
  ]);

  // inline errors per field. others: array of { name: "", amount: "" }
  const [errors, setErrors] = useState({
    netIncome: "",
    lifestyle: "",
    housingLoan: "",
    carLoan: "",
    others: [{ name: "", amount: "" }],
    form: "",
  });

  // Confirm dialogs
  const [openBackConfirm, setOpenBackConfirm] = useState(false);
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);

  const userId = Number(localStorage.getItem("userId"));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/income/setup", { params: { userId } });

        setIncomeId(data.incomeId ?? null);
        setNetIncome(data.netIncome ? to2(data.netIncome) : "");

        // Only assign if the saved value is one of our allowed options.
        const valid = ["Frugal", "Balanced", "Luxury", "None"];
        const saved = data.lifestyle;
        setLifestyle(valid.includes(saved) ? saved : "");

        setHousingLoan(
          data.commitments?.housingLoan ? to2(data.commitments.housingLoan) : ""
        );
        setCarLoan(
          data.commitments?.carLoan ? to2(data.commitments.carLoan) : ""
        );

        // Normalize "other"
        const othersRaw = data.commitments?.other ?? [];
        const normalized = othersRaw.map((o, i) => {
          if (typeof o === "number")
            return { name: `Other ${i + 1}`, amount: to2(o) };
          const name =
            typeof o?.name === "string" && o.name.trim()
              ? o.name.trim()
              : `Other ${i + 1}`;
          const amount =
            o?.amount !== undefined && o.amount !== null ? to2(o.amount) : "";
          return { name, amount };
        });

        setOtherCommitments(
          normalized.length ? normalized : [{ name: "", amount: "" }]
        );

        // initialize errors.others sized to rows
        setErrors({
          netIncome: "",
          lifestyle: "",
          housingLoan: "",
          carLoan: "",
          others: normalized.length
            ? normalized.map(() => ({ name: "", amount: "" }))
            : [{ name: "", amount: "" }],
          form: "",
        });
      } catch (e) {
        console.error("Prefill failed", e);
        setErrors((x) => ({ ...x, form: "Failed to load existing data!" }));
        toast.error("Failed to load existing data!");
      }
    })();
  }, [userId]);

  /* ---------- helpers ---------- */

  const setOtherField = (index, field, value) => {
    const updated = [...otherCommitments];
    updated[index] = { ...updated[index], [field]: value };
    setOtherCommitments(updated);

    // Make sure errors.others exists and matches length
    setErrors((e) => {
      const next = { ...e, others: [...(e.others || [])] };
      while (next.others.length < updated.length) next.others.push({ name: "", amount: "" });
      return next;
    });
  };

  const addOtherField = () => {
    setOtherCommitments([...otherCommitments, { name: "", amount: "" }]);
    setErrors((e) => ({ ...e, others: [...(e.others || []), { name: "", amount: "" }] }));
  };

  const removeOtherField = (idx) => {
    const updated = otherCommitments.filter((_, i) => i !== idx);
    setOtherCommitments(updated.length ? updated : [{ name: "", amount: "" }]);
    setErrors((e) => {
      const arr = [...(e.others || [])];
      arr.splice(idx, 1);
      if (arr.length === 0) arr.push({ name: "", amount: "" });
      return { ...e, others: arr };
    });
  };

  const validateMoney = (label, val) => {
    if (val === "") return "";
    if (!amountOK(val)) return `${label} must be a valid number (max 2 decimals).`;
    const n = toNum(val);
    if (!(n >= 0)) return `${label} cannot be negative.`;
    if (n > MAX_DECIMAL_NUM)
      return `${label} exceeds the maximum RM ${MAX_DECIMAL_STR}.`;
    return "";
  };

  // Validate a single other row (used for onBlur if desired)
  const validateOtherRow = (row) => {
    const name = (row.name || "").trim();
    const amountStr = row.amount ?? "";
    const amountErr = validateMoney("Other Amount", amountStr);
    const amountNum = amountStr === "" ? 0 : toNum(amountStr);

    const e = { name: "", amount: "" };

    if (name && (amountStr === "" || amountNum <= 0)) {
      e.amount = "Please enter an amount greater than 0 for this Other commitment.";
    } else if (!name && amountStr !== "" && amountNum > 0) {
      e.name = "Please give a name/label for this Other commitment.";
    } else if (amountErr) {
      e.amount = amountErr;
    }
    return e;
  };

  const validateAll = () => {
    const next = {
      netIncome: "",
      lifestyle: "",
      housingLoan: "",
      carLoan: "",
      others: [],
      form: "",
    };

    // netIncome required & > 0
    if (!amountOK(netIncome) || netIncome === "") {
      next.netIncome =
        "Monthly Net Income is required and must be a valid number (max 2 decimals).";
    } else {
      const n = toNum(netIncome);
      if (!(n >= 0)) next.netIncome = "Monthly Net Income cannot be negative.";
      else if (n === 0) next.netIncome = "Monthly Net Income must be greater than 0.";
      else if (n > MAX_DECIMAL_NUM)
        next.netIncome = `Monthly Net Income exceeds the maximum RM ${MAX_DECIMAL_STR}.`;
    }

    if (!lifestyle) next.lifestyle = "Please select a lifestyle preference.";

    next.housingLoan = validateMoney("Housing Loan", housingLoan);
    next.carLoan = validateMoney("Car Loan", carLoan);

    // Validate other commitments row-by-row and produce field-level messages
    next.others = otherCommitments.map((row) => validateOtherRow(row));

    setErrors(next);

    // Any error present prevents save
    const hasErrors =
      next.netIncome ||
      next.lifestyle ||
      next.housingLoan ||
      next.carLoan ||
      next.others.some((o) => o.name || o.amount);
    return !hasErrors;
  };

  // Actual save logic (called after user confirms)
  const doSubmit = async () => {
    // validate before attempting save
    if (!validateAll()) {
      setOpenSaveConfirm(false);
      toast.error("Please fix the highlighted errors before saving.");
      return;
    }

    const payload = {
      userId,
      netIncome: Number(to2(netIncome)),
      lifestyle,
      commitments: {
        housingLoan: housingLoan ? Number(to2(housingLoan)) : 0,
        carLoan: carLoan ? Number(to2(carLoan)) : 0,
        other: otherCommitments
          .map(({ name, amount }) => ({
            name: (name || "").trim(),
            amount: amount ? Number(to2(amount)) : 0,
          }))
          // Keep only rows with both name and positive amount
          .filter((x) => x.amount > 0 && x.name.length > 0),
      },
    };

    try {
      if (incomeId) {
        await API.put("/income", { ...payload, incomeId });
        toast.success("Income setup saved successfully!");
        navigate("/profile");
      } else {
        const { data } = await API.post("/income", payload);
        setIncomeId(data.incomeId);
        toast.success("Income setup saved successfully!");
        navigate("/budgetPlanner");
      }
    } catch (err) {
      console.error(err);
      setErrors((x) => ({
        ...x,
        form:
          err?.response?.data?.error ||
          (typeof err?.response?.data === "string"
            ? err.response.data
            : "Failed to save income setup"),
      }));
      toast.error("Failed to save income setup.");
    } finally {
      setOpenSaveConfirm(false);
    }
  };

  return (
    <div className="income-container">
      <div className="income-header">
        <button
          className="income-back-btn"
          onClick={() => setOpenBackConfirm(true)}
        >
          <FaChevronLeft />
        </button>
        <h2>Income Setup</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpenSaveConfirm(true);
        }}
        className="income-form"
      >
        {errors.form && <p className="validation">{errors.form}</p>}

        {/* Row 1 - Monthly Income */}
        <div className="income-row">
          <div className="income-form-group">
            <label>
              Monthly Net Income (RM)
              <span className="income-required">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              placeholder={`e.g., up to ${MAX_DECIMAL_STR}`}
              value={netIncome}
              onChange={(e) => setNetIncome(sanitizeMoney(e.target.value))}
              onBlur={(e) => setNetIncome(to2(e.target.value))}
              required
            />
            {errors.netIncome && (
              <p className="validation">{errors.netIncome}</p>
            )}
          </div>
        </div>

        {/* Row 2 - Lifestyle */}
        <div className="income-row">
          <div className="income-form-group">
            <label>
              Lifestyle Preferences
              <span className="income-required">*</span>
            </label>
            <select
              value={lifestyle}
              onChange={(e) => setLifestyle(e.target.value)}
              required
              className={lifestyle === "" ? "income-placeholder" : ""}
            >
              <option value="" disabled>
                -- Select a lifestyle preference --
              </option>
              <option value="None">None</option>
              <option value="Frugal">Frugal</option>
              <option value="Balanced">Balanced</option>
              <option value="Luxury">Luxury</option>
            </select>
            {errors.lifestyle && (
              <p className="validation">{errors.lifestyle}</p>
            )}
          </div>
        </div>

        {/* Monthly Commitments Title */}
        <h4 className="income-commitment-title">Monthly Commitments :</h4>

        {/* Row 3 - Housing & Car Loans (stacked) */}
        <div className="income-row">
          <div className="income-form-group">
            <label>Housing Loans (RM)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              placeholder="e.g., 500.00"
              value={housingLoan}
              onChange={(e) => setHousingLoan(sanitizeMoney(e.target.value))}
              onBlur={(e) => setHousingLoan(to2(e.target.value))}
            />
            {errors.housingLoan && (
              <p className="validation">{errors.housingLoan}</p>
            )}
          </div>
        </div>

        <div className="income-row">
          <div className="income-form-group">
            <label>Car Loans (RM)</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              placeholder="e.g., 500.00"
              value={carLoan}
              onChange={(e) => setCarLoan(sanitizeMoney(e.target.value))}
              onBlur={(e) => setCarLoan(to2(e.target.value))}
            />
            {errors.carLoan && <p className="validation">{errors.carLoan}</p>}
          </div>
        </div>

        {/* Other Commitments */}
        <label className="income-other-label">
          Other Commitments{" "}
          <button
            title="Add Other Monthly Commitments"
            type="button"
            className="income-add-other-btn"
            onClick={addOtherField}
          >
            <FiPlus />
          </button>
        </label>

        {otherCommitments.map((item, idx) => (
          <div className="income-row income-other-row" key={idx}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="e.g., PTPTN Loan"
                value={item.name}
                onChange={(e) => setOtherField(idx, "name", e.target.value)}
                onBlur={() => {
                  // validate this row on blur
                  const rowErr = validateOtherRow(item);
                  setErrors((ev) => {
                    const next = { ...ev, others: [...(ev.others || [])] };
                    while (next.others.length < otherCommitments.length) next.others.push({ name: "", amount: "" });
                    next.others[idx] = rowErr;
                    return next;
                  });
                }}
              />
              {errors.others[idx]?.name && (
                <p className="validation">{errors.others[idx].name}</p>
              )}
            </div>

            <div style={{ width: 140, marginLeft: 12 }}>
              <input
                type="text"
                inputMode="decimal"
                pattern="^\d+(\.\d{1,2})?$"
                placeholder="e.g., 100.00"
                value={item.amount}
                onChange={(e) =>
                  setOtherField(idx, "amount", sanitizeMoney(e.target.value))
                }
                onBlur={() => {
                  // format to 2 decimals and validate this row
                  setOtherField(idx, "amount", to2(item.amount));
                  const rowErr = validateOtherRow({ ...item, amount: to2(item.amount) });
                  setErrors((ev) => {
                    const next = { ...ev, others: [...(ev.others || [])] };
                    while (next.others.length < otherCommitments.length) next.others.push({ name: "", amount: "" });
                    next.others[idx] = rowErr;
                    return next;
                  });
                }}
              />
              {errors.others[idx]?.amount && (
                <p className="validation">{errors.others[idx].amount}</p>
              )}
            </div>

            <button
              type="button"
              className="income-remove-other-btn"
              onClick={() => removeOtherField(idx)}
              title="Remove this other commitment"
            >
              <FiMinus />
            </button>
          </div>
        ))}

        <div className="income-button-row">
          <button type="submit" className="income-save-btn">
            Save
          </button>
        </div>
      </form>

      {/* ===== Confirm: Back ===== */}
      <ConfirmDialog
        open={openBackConfirm}
        action="discard"
        subject="your unsaved changes and go back to previous page"
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setOpenBackConfirm(false)}
        onConfirm={() => navigate(-1)}
      />

      {/* ===== Confirm: Save ===== */}
      <ConfirmDialog
        open={openSaveConfirm}
        action="save"
        subject="your income setup"
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setOpenSaveConfirm(false)}
        onConfirm={doSubmit}
      />
    </div>
  );
}
