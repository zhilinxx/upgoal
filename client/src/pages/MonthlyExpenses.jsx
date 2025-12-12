import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend as ChartLegend } from "chart.js";
import { FiTrash2, FiPlus, FiEdit2, FiChevronLeft } from "react-icons/fi";
import { toast } from "react-toastify";

import {
  fetchMonthlyExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../api/expensesAPI";

import { API } from "../api/auth";              
import ExpenseDialog from "../components/ExpenseDialog.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import "../styles/MonthlyExpenses.css";

ChartJS.register(ArcElement, Tooltip, ChartLegend);

const CATEGORY_COLORS = {
  "Food & Drink": "#B9E5B1",
  Utility: "#F9A9A9",
  Other: "#F6D47E",
};

export default function MonthlyExpenses() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const pageParam = Number(params.get("page") || 1);
  const searchParam = params.get("search") || "";
  const catParam = params.get("cat") || "All";
  const monthParam = params.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

  const [currency, setCurrency] = useState("RM");
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(pageParam);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const hasNoRows = !loading && records.length === 0;
  const [otherThisMonth, setOtherThisMonth] = useState(0);
  const [netIncome, setNetIncome] = useState(0);

  const [searchInput, setSearchInput] = useState(searchParam);
  useEffect(() => { setSearchInput(searchParam); }, [searchParam]);

  // dialogs + selection
  const [selected, setSelected] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setParam = (k, v) => {
    const n = new URLSearchParams(params);
    if (v === "" || v === "All") n.delete(k);
    else n.set(k, v);

    // whenever a filter (not page) changes, reset paging to 1
    if (k !== "page") {
      n.set("page", "1");
      setPage(1);
    }
    setParams(n, { replace: true });
  };

  const monthLabel = new Date(`${monthParam}-01`).toLocaleString("en", {
    month: "short",
    year: "numeric",
  });

  const refetch = async () => {
    const res = await fetchMonthlyExpenses({
      month: monthParam,
      page,
      pageSize,
      search: searchParam, 
      category: catParam === "All" ? "" : catParam,
    });

    const nextTotalPages = Math.max(1, res.totalPages || 1);
    setTotalPages(nextTotalPages);

    if (page > nextTotalPages) {
      const next = nextTotalPages;
      setPage(next);
      const n = new URLSearchParams(params);
      n.set("page", String(next));
      setParams(n, { replace: true });
      return; 
    }

    setRecords(res.items || []);
    setCategoryTotals(res.categoryTotals || {});
    setCurrency(res.currency || "RM");
    setOtherThisMonth(Number(res.otherThisMonth || 0));     
    setSelected(new Set());
  };

  // fetch expenses data when inputs change
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        await refetch();
      } catch (e) {
        console.error("fetchMonthlyExpenses failed:", e);
        toast.error("Failed to load expenses.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [page, pageSize, searchParam, catParam, monthParam]);

  useEffect(() => {
    (async () => {
      try {
        const userId = Number(localStorage.getItem("userId"));
        if (!userId) return;
        const { data } = await API.get("/income/setup", { params: { userId } });
        setNetIncome(Number(data?.netIncome || 0));
      } catch (e) {
        console.error("Failed to load netIncome for alert:", e);
      }
    })();
  }, [monthParam]); 

  const chartLabels = useMemo(() => Object.keys(categoryTotals), [categoryTotals]);
  const chartValues = useMemo(
    () => chartLabels.map((k) => Number(categoryTotals[k] || 0)),
    [chartLabels, categoryTotals]
  );
  const chartColors = useMemo(
    () => chartLabels.map((k) => CATEGORY_COLORS[k] || "#ddd"),
    [chartLabels]
  );
  const monthTotal = useMemo(() => chartValues.reduce((s, v) => s + v, 0), [chartValues]);

  const chartData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          data: chartValues,
          backgroundColor: chartColors,
          borderWidth: 5,
          borderColor: "rgba(255,255,255,0)",
          hoverOffset: 0,
          hoverBorderWidth: 5,
          hoverBorderColor: "white",
        },
      ],
    }),
    [chartLabels, chartValues, chartColors]
  );

  const chartOptions = useMemo(
    () => ({
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${currency} ${ctx.formattedValue}` },
        },
      },
    }),
    [currency]
  );

  // ---- Selection ----
  const toggleRow = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const allChecked =
    records.length > 0 && records.every((r) => selected.has(r.expenses_id));

  const toggleAll = () => {
    setSelected((prev) => {
      if (records.length === 0) return prev;
      const n = new Set(prev);
      const every = records.every((r) => n.has(r.expenses_id));
      if (every) records.forEach((r) => n.delete(r.expenses_id));
      else records.forEach((r) => n.add(r.expenses_id));
      return n;
    });
  };

  const onAddClick = () => setAddOpen(true);
  const onEditClick = (row) => { setEditing(row); setEditOpen(true); };
  const onDeleteSelected = () => {
    if (selected.size === 0) {
      toast.error("Please select at least one expense to delete!");
      return;
    }
    setConfirmOpen(true);
  };

  const handleCreate = async (payload) => {
    try {
      await createExpense(payload);
      toast.success("Expense saved");

      const createdMonth = payload.expenses_date?.slice(0, 7); 
      if (createdMonth && createdMonth !== monthParam) {
        setParam("month", createdMonth); 
      } else {
        await refetch();
      }
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save expense.");
    }
  };

  const handleUpdate = async (payload) => {
    try {
      await updateExpense(payload.expenses_id, payload);
      toast.success("Expense updated.");

      const updatedMonth = payload.expenses_date?.slice(0, 7);
      if (updatedMonth && updatedMonth !== monthParam) {
        setParam("month", updatedMonth);
      } else {
        await refetch();
      }
      setEditOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update expense.");
    }
  };

  const confirmDelete = async () => {
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => deleteExpense(id)));
      setSelected(new Set());
      setConfirmOpen(false);
      await refetch();
      toast.success("Expense(s) deleted.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete expense(s).");
    }
  };

  //Pagination
  const goPrev = () => {
    const next = Math.max(1, page - 1);
    setPage(next);
    setParam("page", String(next));
  };
  const goNext = () => {
    const next = Math.min(totalPages, page + 1);
    setPage(next);
    setParam("page", String(next));
  };

  //Alert visibility
  const showOtherAlert = netIncome > 0 && otherThisMonth > netIncome * 0.1;
  const pct = showOtherAlert
    ? ((otherThisMonth / netIncome) * 100).toFixed(1)
    : "0.0";

  //hide center label/amount when total is zero
  const hasSpending = Number.isFinite(monthTotal) && monthTotal > 0;

  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <button className="expenses-back-btn" onClick={() => navigate(-1)} title="Go Back">
          <FiChevronLeft />
        </button>
        <h2 className="expenses-title">Monthly Expenses</h2>
        <span className="expenses-header-spacer" aria-hidden="true"></span>
      </div>

      {/* Filters */}
      <div className="top-controls">
        <input
          type="month"
          className="calendar-icon"
          value={monthParam}
          onChange={(e) => setParam("month", e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter expense name"
          className="search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParam("search", searchInput.trim())}
        />

        <select
          className="category-filter"
          value={catParam}
          onChange={(e) => setParam("cat", e.target.value)}
        >
          <option>All</option>
          <option>Food & Drink</option>
          <option>Utility</option>
          <option>Other</option>
        </select>

        <div className="icon-actions">
          <button
            className="icon-btn delete-btn"
            title="Delete expense (selected)"
            onClick={onDeleteSelected}
          >
            <FiTrash2 />
          </button>
          <button className="icon-btn add-btn" title="Add expense" onClick={onAddClick}>
            <FiPlus />
          </button>
        </div>
      </div>

      {/* Doughnut + legend */}
      <div className="expenses-summary-section">
        <div className="expenses-doughnut-container">
          <Doughnut
            data={chartData}
            options={{
              maintainAspectRatio: false,
              cutout: "70%",
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.label}: ${currency} ${ctx.formattedValue}`,
                  },
                },
              },
            }}
          />

          {/* Only show center label when there is spending */}
          {hasSpending && (
            <div className="expenses-chart-center">
              <p className="expenses-chart-label">{monthLabel} Total</p>
              <h3 className="expenses-chart-amount">
                {currency} {monthTotal.toFixed(2)}
              </h3>
            </div>
          )}
        </div>

        <div className="expenses-legend-area">
          <ul className="expenses-legend-list">
            {chartLabels.map((name) => {
              const val = Number(categoryTotals[name] || 0);
              return (
                <li key={name} className="expenses-legend-item">
                  <span className="expenses-legend-left">
                    <span
                      className="expenses-color-dot"
                      style={{ backgroundColor: CATEGORY_COLORS[name] || "#ddd" }}
                    />
                    <span className="expenses-legend-name">{name}</span>
                  </span>
                  <span className="expenses-legend-value">
                    {currency} {val.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* INLINE ALERT directly under the legend */}
          {showOtherAlert && (
            <div className="expenses-warning-inline" role="alert">
              <strong>⚠️ Warning:</strong> “Other” expenses for {monthLabel} reached{" "}
              <strong>{pct}%</strong> of your net income
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll-x">
        <table className="expense-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Expenses</th>
              <th>Amount ({currency})</th>
              <th>Category</th>
              <th>Date</th>
              <th></th>
              <th>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
            </tr>
          </thead>
          <tbody>
            {hasNoRows && (
              <tr className="no-rows">
                <td colSpan={7}>No records.</td>
              </tr>
            )}
            {records.map((item) => (
              <tr key={item.expenses_id}>
                <td>{item.rowNo}</td>
                <td>{item.expenses_name}</td>
                <td>{Number(item.expenses_amt).toFixed(2)}</td>
                <td>{item.expenses_category}</td>
                <td>{item.expenses_date}</td>
                <td>
                  <button
                    className="icon-btn edit-btn"
                    title="Edit"
                    onClick={() => setEditOpen(true) || setEditing(item)}
                  >
                    <FiEdit2 />
                  </button>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(item.expenses_id)}
                    onChange={() => toggleRow(item.expenses_id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="page-btn" disabled={page <= 1} onClick={goPrev}>
          Previous
        </button>
        <span className="page-number">{page}</span>
        <button className="page-btn" disabled={page >= totalPages} onClick={goNext}>
          Next
        </button>
      </div>

      {/* Add (create) dialog */}
      <ExpenseDialog
        open={addOpen}
        mode="create"
        onClose={() => setAddOpen(false)}
        onSave={handleCreate}
      />

      {/* Edit dialog */}
      <ExpenseDialog
        open={editOpen}
        mode="edit"
        initial={editing || {}}
        onClose={() => setEditOpen(false)}
        onSave={handleUpdate}
      />

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmOpen}
        action="delete"
        subject={`${selected.size} selected expense(s)`}
        variant="danger"
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
