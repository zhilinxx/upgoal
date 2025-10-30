import React, { useEffect, useState } from "react";
import "../styles/accountManagement.css";
import { toast } from "react-toastify";
import { getAllAccounts, updateAccountStatus } from "../api/accountAPI";

export default function AccountManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const [selectAll, setSelectAll] = useState(false); 

  const fetchUsers = async () => {
    try {
      const { data } = await getAllAccounts(search, statusFilter, page, limit);
      setUsers(data.users);
      setTotalPages(data.pagination?.totalPages || 1);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter]);

  const handleSelect = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // ✅ Select all rows
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      const allIds = users.map((u) => u.user_id);
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  
  const updateStatus = async (newStatus) => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one user");
      return;
    }
    try {
      await updateAccountStatus(selectedIds, newStatus);
      toast.success(`User(s) ${newStatus === "Active" ? "activated" : "deactivated"} successfully`);
      fetchUsers();
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user status");
    }
  };

  // const formatStatus = (value) => {
  //   if (value = 1){
  //     return "Active";
  //   }
  //   if (value = 0) {
  //     return "Inactive";
  //   }
  // }

  return (
    <div className="account-container">
      <h2>User Accounts</h2>

      <div className="filter-bar">
        <div className="search-area">
          <input
            type="text"
            placeholder="Search by user id or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="button-area">
          <button onClick={() => updateStatus("Active")} className="activate-btn">
            Activate
          </button>
          <button onClick={() => updateStatus("Inactive")} className="deactivate-btn">
            Deactivate
          </button>
        </div>
      </div>
      
      <p className="record-line">{users.length} records found.</p>
      <div className="table-container">
        <table className="account-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Status</th>
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
            {users.length > 0 ? (
              users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.user_id}</td>
                  <td>{u.email}</td>
                  <td>{u.status}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.user_id)}
                      onChange={() => handleSelect(u.user_id)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No users found</td>
              </tr>
            )}
          </tbody>
        </table>

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
