// import React, { useState } from "react";
// import "../styles/MonthlyExpenses.css";

// function MonthlyExpenses() {
//   const [expenses, setExpenses] = useState([
//     { id: 5, name: "Tar Kopitiam", amount: 10.5, category: "Food & Drink" },
//     { id: 4, name: "Digi topup", amount: 30.0, category: "Utility" },
//     { id: 3, name: "Shopee", amount: 20.5, category: "Other" },
//     { id: 2, name: "Milk tea", amount: 9.0, category: "Food & Drink" },
//     { id: 1, name: "Earphones", amount: 9.0, category: "Other" },
//   ]);

//   return (
//     <div className="expenses-container">
//       <h2 className="title">Monthly Expenses</h2>

//       <div className="top-controls">
//         <input type="text" placeholder="Enter expense name" className="search-input" />
//         <select className="category-filter">
//           <option>All Categories</option>
//         </select>
//         <button className="icon-btn delete-btn">🗑</button>
//         <button className="icon-btn add-btn">＋</button>
//       </div>

//       <div className="chart-section">
//         <div className="donut-chart-placeholder">
//           Aug Total <br /> RM 79.00
//         </div>
//         <ul className="legend">
//           <li><span className="dot food"></span>Food & Drink • RM 19.50</li>
//           <li><span className="dot utility"></span>Utility • RM 30.00</li>
//           <li><span className="dot other"></span>Other • RM 29.50</li>
//         </ul>
//       </div>

//       <table className="expense-table">
//         <thead>
//           <tr>
//             <th>No</th>
//             <th>Expenses</th>
//             <th>Amount (RM)</th>
//             <th>Category</th>
//             <th></th>
//           </tr>
//         </thead>
//         <tbody>
//           {expenses.map((item) => (
//             <tr key={item.id}>
//               <td>{item.id}</td>
//               <td>{item.name}</td>
//               <td>{item.amount.toFixed(2)}</td>
//               <td>{item.category}</td>
//               <td>
//                 <button className="icon-btn edit-btn">✏️</button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <div className="pagination">
//         <button className="page-btn">Previous</button>
//         <span className="page-number">1</span>
//         <button className="page-btn">Next</button>
//       </div>
//     </div>
//   );
// }

// export default MonthlyExpenses;
//--------------------------------------------------------------------
// client/src/pages/MonthlyExpenses.jsx
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

  // ---- URL params (single source of truth) ----
  const pageParam   = Number(params.get("page") || 1);
  const searchParam = params.get("search") || "";
  const catParam    = params.get("cat") || "All";
  const monthParam  = params.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

  // ---- Local state ----
  const [currency, setCurrency] = useState("RM");
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(pageParam);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [loading, setLoading] = useState(true);

  // search input is controlled and mirrors URL param
  const [searchInput, setSearchInput] = useState(searchParam);
  useEffect(() => { setSearchInput(searchParam); }, [searchParam]);

  // dialog + selection
  const [selected, setSelected] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ---- Helpers ----
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

  // ---- Fetch with page auto-recovery ----
  const refetch = async () => {
    const res = await fetchMonthlyExpenses({
      month: monthParam,
      page,
      pageSize,
      search: searchParam,                 // server expects "search"
      category: catParam === "All" ? "" : catParam,
    });

    const nextTotalPages = Math.max(1, res.totalPages || 1);
    setTotalPages(nextTotalPages);

    // If current page is now out of range, jump to last page and let useEffect refetch
    if (page > nextTotalPages) {
      const next = nextTotalPages;
      setPage(next);
      const n = new URLSearchParams(params);
      n.set("page", String(next));
      setParams(n, { replace: true });
      return; // useEffect will trigger another refetch with corrected page
    }

    setRecords(res.items || []);
    setCategoryTotals(res.categoryTotals || {});
    setCurrency(res.currency || "RM");

    // Clear selection after every successful refetch
    setSelected(new Set());
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchParam, catParam, monthParam]);

  // ---- Chart ----
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
  const allChecked = records.length > 0 && records.every((r) => selected.has(r.expenses_id));
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

  // ---- Dialog handlers ----
  const onAddClick = () => setAddOpen(true);
  const onEditClick = (row) => { setEditing(row); setEditOpen(true); };
  const onDeleteSelected = () => { if (selected.size) setConfirmOpen(true); };

  const handleCreate = async (payload) => {
    try {
      await createExpense(payload);
      toast.success("Expense saved");

      const createdMonth = payload.expenses_date?.slice(0, 7); // "YYYY-MM"
      if (createdMonth && createdMonth !== monthParam) {
        setParam("month", createdMonth); // triggers refetch via useEffect
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
      toast.success("Expense updated");

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
      toast.success("Deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete expense(s).");
    }
  };

  // ---- Pagination (compute next page before setting) ----
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

  return (
    <div className="expenses-container">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiChevronLeft />
        </button>
        <h2 className="title">Monthly Expenses</h2>
      </div>

      {/* Filters */}
      <div className="top-controls">
        <input
          type="month"
          className="month-picker"
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
            title="Bulk delete (selected)"
            onClick={onDeleteSelected}
            disabled={selected.size === 0}
          >
            <FiTrash2 />
          </button>
          <button className="icon-btn add-btn" title="Add expense" onClick={onAddClick}>
            <FiPlus />
          </button>
        </div>
      </div>

      {/* Doughnut + legend */}
      <div className="chart-section">
        <div className="doughnut-container">
          <Doughnut data={chartData} options={chartOptions} />
          <div className="chart-center">
            <p className="chart-label">{monthLabel} Total</p>
            <h3 className="chart-total">
              {currency} {monthTotal.toFixed(2)}
            </h3>
          </div>
        </div>

        <ul className="legend">
          {chartLabels.map((name) => {
            const val = Number(categoryTotals[name] || 0);
            return (
              <li key={name}>
                <span className="dot" style={{ background: CATEGORY_COLORS[name] || "#ddd" }} />
                <span className="legend-label">{name}</span>
                <span className="legend-amount">• {currency} {val.toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
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
              <th>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                  No records.
                </td>
              </tr>
            )}
            {records.map((item) => (
              <tr key={item.expenses_id}>
                <td>{item.rowNo}</td>
                <td>{item.expenses_name}</td>
                <td>{Number(item.expenses_amt).toFixed(2)}</td>
                <td>{item.expenses_category}</td>
                <td>{item.expenses_date}</td>
                <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className="icon-btn edit-btn"
                    title="Edit"
                    onClick={() => onEditClick(item)}
                  >
                    <FiEdit2 />
                  </button>
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

      {/* Dialogs */}
      <ExpenseDialog
        open={addOpen}
        mode="create"
        onClose={() => setAddOpen(false)}
        onSave={handleCreate}
      />

      <ExpenseDialog
        open={editOpen}
        mode="edit"
        initial={editing || {}}
        onClose={() => setEditOpen(false)}
        onSave={handleUpdate}
      />

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

