import React, { useEffect, useState } from "react";
import "../styles/insurancePlanManagement.css";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { getAllPlans, deletePlans } from "../api/insurancePlanAPI";
import { FaPencilAlt, FaPlus, FaTrashAlt } from "react-icons/fa";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function InsurancePlanManagement() {
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [planType, setPlanType] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0); 
  const [selectAll, setSelectAll] = useState(false);
  const [openRemoveConfirm, setOpenRemoveConfirm] = useState(false);
  const limit = 10;
  const navigate = useNavigate();
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(true);


  useEffect(() => {
    if (location.state) {
      setIsRestoring(true);

      setSearch(location.state.search || "");
      setPlanType(location.state.planType || "All");
      setPage(location.state.page || 1);

      // allow next effect to run after values restored
      setTimeout(() => setIsRestoring(false), 0);
    } else {
      setIsRestoring(false);
    }
  }, [location.state]);

  const fetchPlans = async () => {
    try {
      const searchQuery = search.trim();
      const { data } = await getAllPlans(searchQuery, page, limit, planType);

      const filteredPlans =
        planType === "All"
          ? data.plans
          : data.plans.filter(
              (p) => p.plan_type.toLowerCase() === planType.toLowerCase()
            );

      setPlans(filteredPlans || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalRecords(data.pagination?.totalRecords || 0);
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load insurance plans");
    }
  };

  useEffect(() => { setPage(1); }, [search, planType]);

  useEffect(() => {
    if (!isRestoring) {
      fetchPlans();
    }
  }, [search, planType, page, isRestoring]);

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

  const handleDelete = () => {
    const removedPlans = plans.filter((p) => selectedIds.includes(p.plan_id));
    setPlans((prev) => prev.filter((p) => !selectedIds.includes(p.plan_id)));

    let undoClicked = false;

    const undoToast = toast(
      <div>
        Plan(s) deleted.
        <button
          onClick={() => {
            setPlans((prev) => [...prev, ...removedPlans]);
            undoClicked = true; // mark undo as clicked
            toast.dismiss(undoToast);
          }}
          style={{
            color: "var(--main-pink)",
            background: "none",
            border: "none",
            padding: "0",
            margin: "0px",
            marginLeft: "5px",
            cursor: "pointer",
          }}
        >
          Undo
        </button>
      </div>,
      { autoClose: 5000 }
    );

    // Wait 5 seconds before actually deleting
    setTimeout(async () => {
      if (undoClicked) return; // skip deletion if Undo pressed
      try {
        await deletePlans(selectedIds);
        toast.success("Selected plan(s) deleted successfully");
        fetchPlans();
      } catch (err) {
        toast.error("Failed to delete plans");
      }
    }, 5000);
  };


  return (
    <div className="insurance-plan-container">
      <h2>Insurance Plan Management</h2>

      <ConfirmDialog
        open={openRemoveConfirm}
        action="delete"
        subject="insurance plan"
        message="Do you confirm to delete the selected plan(s)?"
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setOpenRemoveConfirm(false)}
        onConfirm={() => {
          setOpenRemoveConfirm(false);
          handleDelete();
        }}
      />

      {/* Filter Bar */}
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
            <option value="Life + Medical">Life + Medical</option>
          </select>
        </div>

        <div className="button-area">
            <button className="delete-btn" 
              onClick={() => {
                if (selectedIds.length === 0)
                  return toast.warning("Please select at least one plan to delete");
                else setOpenRemoveConfirm(true)} } 
            >
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

      <p className="record-line">{totalRecords} records found.</p>

      {/* Table Section */}
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
                        href={`${import.meta.env.VITE_CLIENT_URL}/${p.brochure_path}`}
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
                      onClick={() =>
                        navigate(`/addInsurancePlan/${p.plan_id}`, {
                          state: { search, planType, page }
                        })
                      }
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

        {/* Pagination */}
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
