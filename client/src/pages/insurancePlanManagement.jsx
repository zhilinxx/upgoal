import React, { useEffect, useState } from "react";
import "../styles/insurancePlanManagement.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getAllPlans, deletePlans } from "../api/insurancePlanAPI";
import { FaPencilAlt, FaPlus, FaTrashAlt } from "react-icons/fa";

export default function InsurancePlanManagement() {
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [planType, setPlanType] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectAll, setSelectAll] = useState(false);
  const limit = 10;
  const navigate = useNavigate();

  const fetchPlans = async () => {
    try {
      const searchQuery = search.trim();
      const { data } = await getAllPlans(searchQuery, page, limit, planType);

      // ✅ Filter by plan type on frontend for simplicity
      const filteredPlans =
        planType === "All"
          ? data.plans
          : data.plans.filter((p) => p.plan_type.toLowerCase() === planType.toLowerCase());

      setPlans(filteredPlans || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load insurance plans");
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [search, page, planType]);

  const handleSelect = (planId) => {
    setSelectedIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      const allIds = plans.map((p) => p.plan_id);
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one plan to delete");
      return;
    }

    if (!window.confirm("Are you sure you want to delete selected plans?")) return;
    try {
      await deletePlans(selectedIds);
      toast.success("Selected plan(s) deleted successfully");
      fetchPlans();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete plans");
    }
  };

  return (
    <div className="insurance-plan-container">
      <h2>Insurance Plan Management</h2>

      {/* ===== Filter Bar ===== */}
      <div className="filter-bar">
        <div className="search-area">
          <input
            type="text"
            placeholder="Search by plan ID, name, or provider"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
            className="plan-type-filter"
          >
            <option value="All">All</option>
            <option value="Life">Life</option>
            <option value="Medical">Medical</option>
          </select>
        </div>

        <div className="button-area">
            <button className="delete-btn" onClick={handleDelete}>
            <FaTrashAlt style={{ marginRight: "6px" }} />
          </button>
          <button
            className="add-btn"
            onClick={() => navigate("/addInsurancePlan")}
          >
            <FaPlus style={{ marginRight: "6px" }} />
          </button>
        </div>
      </div>

      <p className="record-line">{plans.length} records found.</p>

      {/* ===== Table Section ===== */}
      <div className="table-container">
        <table className="plan-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Plan Name</th>
              <th>Provider</th>
              <th>Type</th>
              <th>Premium (RM)</th>
              <th>Brochure</th>
              <th>Edit</th>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? (
              plans.map((p) => (
                <tr key={p.plan_id}>
                  <td>{p.plan_id}</td>
                  <td>{p.plan_name}</td>
                  <td>{p.provider}</td>
                  <td>{p.plan_type}</td>
                  <td>{p.premium}</td>
                  <td>
                    {p.brochure_path ? (
                      <a
                        href={`http://localhost:5000/${p.brochure_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => navigate(`/addInsurancePlan/${p.plan_id}`)}
                    >
                      <FaPencilAlt />
                    </button>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.plan_id)}
                      onChange={() => handleSelect(p.plan_id)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No plans found</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ===== Pagination ===== */}
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Previous
          </button>
          <span className="page-num">{page}/{totalPages}</span>
          <button
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
