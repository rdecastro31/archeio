import React, { useEffect, useState } from "react";
import {
  FiUsers,
  FiFileText,
  FiRepeat,
  FiAlertTriangle,
  FiHardDrive,
  FiActivity,
  FiLayers,
  FiDatabase,
} from "react-icons/fi";
import { API_URL } from "../shared/constants";
import "../styles/dashboard.css";

const ADMIN_DASHBOARD_URL = `${API_URL}/dashboardadmin.php`;

export default function DashboardAdmin() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const callAdminDashboard = async () => {
    const fd = new FormData();
    fd.append("tag", "get_admin_dashboard");

    const response = await fetch(ADMIN_DASHBOARD_URL, {
      method: "POST",
      body: fd,
    });

    return await response.json();
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const result = await callAdminDashboard();

        if (result.success === 1) {
          setDashboard(result.data);
        }
      } catch (error) {
        console.error("Admin Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const storage = dashboard?.storage_stats || {};

  const recentTransactions = dashboard?.recent_system_activity?.slice(0, 10) || [];
  const documentsByStatus = dashboard?.documents_by_status?.slice(0, 5) || [];
  const usersByLevel = dashboard?.users_by_level?.slice(0, 5) || [];
  const latestDocuments = dashboard?.latest_documents?.slice(0, 10) || [];
  const transactionsByDepartment =
    dashboard?.transactions_by_department?.slice(0, 5) || [];

  const statCards = [
    {
      title: "Total Users",
      value: summary.total_users || 0,
      meta: "Registered accounts",
      icon: <FiUsers />,
    },
    {
      title: "Total Documents",
      value: summary.total_documents || 0,
      meta: "Created documents",
      icon: <FiFileText />,
    },
    {
      title: "Active Transactions",
      value: summary.active_transactions || 0,
      meta: "Currently in process",
      icon: <FiRepeat />,
    },
    {
      title: "Overdue Documents",
      value: summary.overdue_documents || 0,
      meta: "Past due date",
      icon: <FiAlertTriangle />,
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-stats-grid">
        {statCards.map((item, index) => (
          <div className="dashboard-stat-card" key={index}>
            <div className="dashboard-stat-top">
              <div className="dashboard-stat-icon">{item.icon}</div>
              <span>{item.meta}</span>
            </div>
            <h3>{item.value}</h3>
            <p>{item.title}</p>
          </div>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-card dashboard-card-large">
          <div className="dashboard-card-header">
            <div>
              <span className="card-kicker">System Activity</span>
              <h3>Recent Transactions</h3>
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Document No.</th>
                  <th>Title</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Instruction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((item) => (
                    <tr key={item.transaction_id}>
                      <td>{item.document_no || "-"}</td>
                      <td>{item.title || "-"}</td>
                      <td>{item.from_user || item.from_department || "-"}</td>
                      <td>{item.to_user || item.to_department || "-"}</td>
                      <td>{item.instruction_name || "-"}</td>
                      <td>
                        <span className="status-pill">
                          {item.transaction_status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">No recent activity found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <span className="card-kicker">Storage Monitor</span>
              <h3>Server Storage</h3>
            </div>
            <FiHardDrive />
          </div>

          <div className="summary-list">
            <div className="summary-row">
              <span>Total Space</span>
              <strong>{storage.server_disk_total || "0 B"}</strong>
            </div>
            <div className="summary-row">
              <span>Used Space</span>
              <strong>{storage.server_disk_used || "0 B"}</strong>
            </div>
            <div className="summary-row">
              <span>Free Space</span>
              <strong>{storage.server_disk_free || "0 B"}</strong>
            </div>
            <div className="summary-row">
              <span>Used Percentage</span>
              <strong>{storage.server_disk_used_percent || 0}%</strong>
            </div>
          </div>

          <div className="ai-progress-wrap" style={{ marginTop: 18 }}>
            <div className="ai-progress-info">
              <span>Disk Usage</span>
              <strong>{storage.server_disk_used_percent || 0}%</strong>
            </div>
            <div className="ai-progress-bar">
              <div
                style={{
                  width: `${storage.server_disk_used_percent || 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <span className="card-kicker">Documents</span>
              <h3>By Status</h3>
            </div>
            <FiLayers />
          </div>

          <div className="summary-list">
            {documentsByStatus.length > 0 ? (
              documentsByStatus.map((item, index) => (
                <div className="summary-row" key={index}>
                  <span>{item.status_name || "Unknown"}</span>
                  <strong>{item.total}</strong>
                </div>
              ))
            ) : (
              <p>No status data found.</p>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <span className="card-kicker">Users</span>
              <h3>By Level</h3>
            </div>
            <FiUsers />
          </div>

          <div className="summary-list">
            {usersByLevel.length > 0 ? (
              usersByLevel.map((item, index) => (
                <div className="summary-row" key={index}>
                  <span>{item.userlevel || "Unknown"}</span>
                  <strong>{item.total}</strong>
                </div>
              ))
            ) : (
              <p>No user level data found.</p>
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-card-large">
          <div className="dashboard-card-header">
            <div>
              <span className="card-kicker">Latest Records</span>
              <h3>Recent Documents</h3>
            </div>
            <FiDatabase />
          </div>

          <div className="document-group-list">
            {latestDocuments.length > 0 ? (
              latestDocuments.map((doc) => (
                <div className="document-group-item" key={doc.id}>
                  <div className="document-group-icon">
                    <FiFileText />
                  </div>

                  <div className="document-group-content">
                    <h4>{doc.document_no}</h4>
                    <p>{doc.title}</p>
                  </div>

                  <div className="document-group-total">
                    <strong>{doc.document_status || "-"}</strong>
                    <span>{doc.document_type || "Document"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p>No recent documents found.</p>
            )}
          </div>
        </div>

        <div className="dashboard-card">npm
          <div className="dashboard-card-header">
            <div>
              <span className="card-kicker">Departments</span>
              <h3>Transaction Volume</h3>
            </div>
            <FiActivity />
          </div>

          <div className="summary-list">
            {transactionsByDepartment.length > 0 ? (
              transactionsByDepartment.map((item, index) => (
                <div className="summary-row" key={index}>
                  <span>{item.department_name || "Unknown"}</span>
                  <strong>{item.total_transactions}</strong>
                </div>
              ))
            ) : (
              <p>No department transaction data found.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}