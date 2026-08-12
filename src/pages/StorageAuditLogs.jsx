import React, { useState, useEffect, useCallback } from "react";
import { FiSearch, FiDownload, FiActivity, FiUser, FiCalendar, FiFilter, FiRefreshCw, FiEye, FiFileText } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import "../styles/storageauditlogs.css";

export default function StorageAuditLogs() {
    const { user } = useOutletContext();
    const USER_ID = user?.id || null;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAction, setSelectedAction] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const callApi = async (url, formData) => {
        try {
            const response = await fetch(url, { method: "POST", body: formData });
            return await response.json();
        } catch (error) {
            return { success: 0, msg: "Network error" };
        }
    };

    const fetchAuditReport = useCallback(async () => {
        setLoading(true);
        const fd = new FormData();
        fd.append("tag", "getAuditReport");
        if (USER_ID) fd.append("userid", USER_ID);
        if (selectedAction) fd.append("action_filter", selectedAction);
        fd.append("limit", "500");

        const data = await callApi(`${API_URL}/filestorage.php`, fd);

        if (data.success) {
            setLogs(data.report || []);
        } else {
            Swal.fire("Error", data.msg || "Failed to retrieve audit trail.", "error");
        }
        setLoading(false);
    }, [USER_ID, selectedAction]);

    useEffect(() => {
        fetchAuditReport();
    }, [fetchAuditReport]);

    // Client-side Filtering for Real-time Search and Date Range
    const filteredLogs = logs.filter((log) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            log.action.toLowerCase().includes(search) ||
            String(log.user_id).includes(search) ||
            (log.fullname && log.fullname.toLowerCase().includes(search)) ||
            (log.email && log.email.toLowerCase().includes(search)) ||
            (log.filename && log.filename.toLowerCase().includes(search)) ||
            log.ip_address.includes(search) ||
            JSON.stringify(log.details).toLowerCase().includes(search);

        let matchesDate = true;
        if (startDate || endDate) {
            const logDate = new Date(log.created_at).getTime();
            if (startDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                matchesDate = matchesDate && logDate >= start;
            }
            if (endDate) {
                const end = new Date(endDate).setHours(23, 59, 59, 999);
                matchesDate = matchesDate && logDate <= end;
            }
        }

        return matchesSearch && matchesDate;
    });

    const formatDetails = (details) => {
        if (!details) return "--";
        if (typeof details === "object") {
            return Object.entries(details)
                .map(([key, val]) => `${key}: ${val}`)
                .join(" | ");
        }
        return String(details);
    };

    const handleViewDetails = (log) => {
        const formattedJson = typeof log.details === "object"
            ? JSON.stringify(log.details, null, 2)
            : log.details;

        Swal.fire({
            title: `Log #${log.id} - ${log.action}`,
            html: `
                <div style="text-align: left; font-size: 0.88rem;">
                    <p style="margin-bottom: 6px;"><strong>User Information:</strong></p>
                    <p style="margin-bottom: 4px; padding-left: 8px;">• Name: <strong>${log.fullname || "Unknown User"}</strong> (ID: #${log.user_id})</p>
                    <p style="margin-bottom: 4px; padding-left: 8px;">• Email: ${log.email || "N/A"}</p>
                    <p style="margin-bottom: 8px; padding-left: 8px;">• Role / Position: ${log.userlevel || "N/A"} ${log.position ? `(${log.position})` : ""}</p>
                    
                    <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e2e8f0;" />
                    
                    <p style="margin-bottom: 6px;"><strong>File Metadata:</strong></p>
                    ${log.filename ? `
                        <p style="margin-bottom: 4px; padding-left: 8px;">• Name: <strong>${log.filename}</strong> (ID: #${log.file_id})</p>
                        <p style="margin-bottom: 4px; padding-left: 8px;">• Path: <code>${log.file_path}</code></p>
                        <p style="margin-bottom: 8px; padding-left: 8px;">• Type & Size: ${log.file_type || 'N/A'} | ${log.file_size || 'N/A'}</p>
                    ` : '<p style="margin-bottom: 8px; padding-left: 8px; color: #64748b;">No direct file record associated.</p>'}

                    <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e2e8f0;" />

                    <p style="margin-bottom: 4px;"><strong>IP Address:</strong> <code>${log.ip_address}</code></p>
                    <p style="margin-bottom: 8px;"><strong>Timestamp:</strong> ${new Date(log.created_at).toLocaleString()}</p>
                    
                    <p style="margin-top: 12px; margin-bottom: 6px;"><strong>Logged Details Payload:</strong></p>
                    <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; overflow-x: auto; max-height: 200px; font-size: 0.82rem; text-align: left;">${formattedJson || "No details payload."}</pre>
                </div>
            `,
            width: "650px",
            confirmButtonText: "Close",
            confirmButtonColor: "#3b82f6"
        });
    };

    const handleExportCSV = () => {
        if (filteredLogs.length === 0) {
            Swal.fire("Notice", "No records available to export.", "info");
            return;
        }

        const headers = ["Log ID", "User ID", "User Full Name", "User Email", "File ID", "File Name", "File Path", "Action", "Details", "IP Address", "Timestamp"];
        const csvRows = [headers.join(",")];

        filteredLogs.forEach((log) => {
            const detailsText = typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "";
            const row = [
                log.id,
                `"${log.fullname || "N/A"}"`,
                `"${log.email || "N/A"}"`,
                `"${log.filename || "N/A"}"`,
                `"${log.file_path || "N/A"}"`,
                `"${log.action}"`,
                `"${detailsText.replace(/"/g, '""')}"`,
                `"${log.ip_address}"`,
                `"${log.created_at}"`
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="audit-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Storage Audit Trail</h1>
                </div>
                <button className="primary-btn" onClick={handleExportCSV}>
                    <FiDownload /><span>Export CSV</span>
                </button>
            </div>

            <div className="table-card">
                <div className="table-toolbar audit-toolbar">
                    <div className="search-box">
                        <FiSearch className="search-icon-main" />
                        <input
                            type="text"
                            placeholder="Search by user, email, file, action, details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filters-wrapper">
                        <div className="filter-select-group">
                            <FiFilter className="filter-icon" />
                            <select
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                            >
                                <option value="">All Actions</option>
                                <option value="UPLOAD_FILE">UPLOAD_FILE</option>
                                <option value="CREATE_FOLDER">CREATE_FOLDER</option>
                                <option value="MOVE_RENAME">MOVE_RENAME</option>
                                <option value="DELETE_FILE">DELETE_FILE</option>
                                <option value="ACCESS_ITEM">ACCESS_ITEM</option>
                                <option value="VERSION_ARCHIVE">VERSION_ARCHIVE</option>
                                <option value="OCR_ERROR">OCR_ERROR</option>
                            </select>
                        </div>

                        <div className="date-filter-group">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                title="Start Date"
                            />
                            <span>to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                title="End Date"
                            />
                        </div>

                        <button
                            className="icon-btn refresh-btn"
                            title="Reload Logs"
                            onClick={fetchAuditReport}
                        >
                            <FiRefreshCw />
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Action & Event</th>
                                <th>User</th>
                                <th>Target File</th>
                                <th>Details</th>
                                <th>IP Address</th>
                                <th>Timestamp</th>
                                <th className="text-end">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center">Loading audit report...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center">No logs found.</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            <div className="doc-info-cell">
                                                <div className="doc-icon-square">
                                                    <FiActivity />
                                                </div>
                                                <div>
                                                    <span className={`status-badge action-badge action-${log.action.toLowerCase()}`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="meta-cell">
                                                <span className="type-text">
                                                    <FiUser style={{ marginRight: 4 }} />
                                                    {log.fullname || `User #${log.user_id}`}
                                                </span>
                                                <span className="dept-subtext">
                                                    {log.email || `ID: #${log.user_id}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            {log.filename ? (
                                                <div className="meta-cell">
                                                    <span className="type-text">
                                                        <FiFileText style={{ marginRight: 4 }} />
                                                        {log.filename}
                                                    </span>
                                                    <span className="dept-subtext">{log.file_path}</span>
                                                </div>
                                            ) : (
                                                <span className="dept-subtext">N/A</span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className="details-text clickable-details"
                                                onClick={() => handleViewDetails(log)}
                                                title="Click to view full details"
                                            >
                                                {formatDetails(log.details)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="ip-text">{log.ip_address}</span>
                                        </td>
                                        <td>
                                            <div className="date-cell">
                                                <FiCalendar /> <span>{new Date(log.created_at).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className="icon-btn view"
                                                title="View Full Payload"
                                                onClick={() => handleViewDetails(log)}
                                            >
                                                <FiEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}