import React, { useState, useEffect, useCallback } from "react";
import {
    FiArrowDownLeft,
    FiArrowUpRight,
    FiUser,
    FiActivity,
    FiChevronDown,
    FiChevronUp,
    FiClock,
    FiAlertCircle,
    FiCheckCircle
} from "react-icons/fi";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";
import "../styles/transactions.css";
import FileViewerModal from './../modals/ViewFileModal';
import RouteDocumentModal from "../modals/RouteDocumentModal";

export default function Transactions() {
    const { user: currentUser } = useOutletContext();
    const [groupedTransactions, setGroupedTransactions] = useState([]);
    const [expandedDocs, setExpandedDocs] = useState({});

    // Direct history storage keyed by document_id
    const [docHistories, setDocHistories] = useState({});
    const [historyLoading, setHistoryLoading] = useState({});

    const [actionsMap, setActionsMap] = useState({});
    const [allActions, setAllActions] = useState({});
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingFile, setViewingFile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Routing Modal State
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [selectedDocForRouting, setSelectedDocForRouting] = useState(null);

    const calculateDaysRemaining = (dueDate) => {
        if (!dueDate) return null;
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const renderTimeRemaining = (dueDate, status) => {
        if (status === 'Completed') return <span className="time-pill done"><FiCheckCircle /> Finished</span>;
        const days = calculateDaysRemaining(dueDate);
        if (days === null) return <span className="time-pill none">No Deadline</span>;
        if (days < 0) return <span className="time-pill overdue"><FiAlertCircle /> {Math.abs(days)}d Overdue</span>;
        if (days === 0) return <span className="time-pill warning">Due Today</span>;
        return <span className="time-pill active">{days}d remaining</span>;
    };

    /**
     * Initial Tracking Core Data Fetching
     */
    const fetchData = useCallback(async () => {
        setLoading(true);
        const transFd = new FormData(); transFd.append("tag", "getall");
        const mapFd = new FormData(); mapFd.append("tag", "get_all_mappings");
        const actFd = new FormData(); actFd.append("tag", "getall");

        try {
            const [transRes, mapRes, actRes] = await Promise.all([
                fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: transFd }).then(r => r.json()),
                fetch(`${API_URL}/instructionmap.php`, { method: "POST", body: mapFd }).then(r => r.json()),
                fetch(`${API_URL}/actions.php`, { method: "POST", body: actFd }).then(r => r.json())
            ]);

            if (actRes.success) {
                const lookup = {};
                actRes.data.forEach(a => { lookup[a.id] = a; });
                setAllActions(lookup);
            }

            if (mapRes.success) {
                const groupedMap = {};
                mapRes.data.forEach(m => {
                    if (!groupedMap[m.instruction_type_id]) groupedMap[m.instruction_type_id] = [];
                    groupedMap[m.instruction_type_id].push(m.action_id);
                });
                setActionsMap(groupedMap);
            }

            if (transRes.success) {
                const groups = {};
                transRes.data.forEach(t => {
                    if (!groups[t.document_id]) groups[t.document_id] = [];
                    groups[t.document_id].push(t);
                });

                const visibleGroups = Object.values(groups).filter(history => {
                    return history.some(step =>
                        parseInt(step.from_user_id) === parseInt(currentUser.id) ||
                        parseInt(step.to_user_id) === parseInt(currentUser.id)
                    );
                }).map(history => {
                    const sortedHistory = history.sort((a, b) => parseInt(b.id) - parseInt(a.id));
                    const latest = sortedHistory[0];

                    return {
                        ...latest,
                        direction: parseInt(latest.to_user_id) === parseInt(currentUser.id) ? 'incoming' : 'outgoing'
                    };
                });

                setGroupedTransactions(visibleGroups.sort((a, b) => b.id - a.id));
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /**
     * Lazily fetch history trail for a specific document on accordion expansion
     */
    const fetchDocumentHistory = async (documentId) => {
        setHistoryLoading(prev => ({ ...prev, [documentId]: true }));
        const fd = new FormData();
        fd.append("tag", "view_transaction_history");
        fd.append("document_id", documentId);

        try {
            const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());
            if (res.success && res.history) {
                // Ensure layout matches newest-to-oldest sequence
                const sortedHistory = res.history.sort((a, b) => parseInt(b.id) - parseInt(a.id));
                setDocHistories(prev => ({ ...prev, [documentId]: sortedHistory }));
            } else {
                setDocHistories(prev => ({ ...prev, [documentId]: [] }));
            }
        } catch (error) {
            console.error("Failed to fetch historical steps:", error);
        } finally {
            setHistoryLoading(prev => ({ ...prev, [documentId]: false }));
        }
    };

    const toggleAccordion = (docId) => {
        const matchingState = !expandedDocs[docId];
        setExpandedDocs(prev => ({ ...prev, [docId]: matchingState }));

        // Trigger network request if moving to opened state and no historical cash exists
        if (matchingState && !docHistories[docId]) {
            fetchDocumentHistory(docId);
        }
    };

    const handleReceive = async (transaction) => {
        const fd = new FormData();
        fd.append("tag", "insert");
        fd.append("document_id", transaction.document_id);
        fd.append("from_user_id", transaction.from_user_id);
        fd.append("to_user_id", currentUser.id);
        fd.append("from_department_id", transaction.from_department_id);
        fd.append("to_department_id", currentUser.department_id);
        fd.append("instruction_type_id", transaction.instruction_type_id);
        fd.append("due_date", transaction.due_date);
        fd.append("transaction_status", "Received");
        fd.append("remarks", "Document physically received.");

        const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());
        if (res.success) {
            Swal.fire({ title: "Received", icon: "success", timer: 800, showConfirmButton: false });
            // Refresh main table and reset target history cache so it re-fetches updated logs
            setDocHistories(prev => { const c = { ...prev }; delete c[transaction.document_id]; return c; });
            fetchData();
        }
    };

    const handleActionClick = (transaction, action) => {
        if (action.action_result === 'Proceed') {
            setSelectedDocForRouting(transaction);
            setShowRouteModal(true);
            return;
        }

        Swal.fire({
            title: `Confirm ${action.action_name}?`,
            text: `This will mark the document as ${action.action_result}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#820d0d'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append("tag", "insert");
                fd.append("document_id", transaction.document_id);
                fd.append("from_user_id", currentUser.id);
                fd.append("from_department_id", currentUser.department_id);
                fd.append("to_user_id", transaction.from_user_id);
                fd.append("to_department_id", transaction.from_department_id);
                fd.append("instruction_type_id", transaction.instruction_type_id);
                fd.append("action_id", action.id);
                fd.append("due_date", transaction.due_date);
                fd.append("transaction_status", action.action_result === 'Complete' ? 'Completed' : 'Pending');
                fd.append("remarks", `Action: ${action.action_name}`);

                const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());

                if (action.action_result === 'Complete') {
                    const docFd = new FormData();
                    docFd.append("tag", "update_status");
                    docFd.append("id", transaction.document_id);
                    docFd.append("document_status", 3);
                    await fetch(`${API_URL}/document.php`, { method: "POST", body: docFd });
                }

                if (res.success) {
                    Swal.fire("Success", "Action processed.", "success");
                    setDocHistories(prev => { const c = { ...prev }; delete c[transaction.document_id]; return c; });
                    fetchData();
                }
            }
        });
    };

    return (
        <div className="transactions-page">
            <div className="trans-header">
                <div className="header-title">
                    <h1>Document Tracking</h1>
                    <p>Manage your document workflow and activity history.</p>
                </div>
            </div>

            <div className="table-card">
                <table className="trans-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}></th>
                            <th>Direction</th>
                            <th>Document</th>
                            <th>Time Left</th>
                            <th>Participant</th>
                            <th>Current Task</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center">Loading transactions...</td></tr>
                        ) : groupedTransactions.length === 0 ? (
                            <tr><td colSpan="7" className="text-center">No trackable documents found.</td></tr>
                        ) : groupedTransactions.map(t => {
                            const isCurrentlyWithMe = parseInt(t.to_user_id) === parseInt(currentUser.id);
                            const currentHistory = docHistories[t.document_id] || [];
                            const isHistoryLoading = historyLoading[t.document_id];

                            return (
                                <React.Fragment key={t.id}>
                                    <tr className={`row-direction-${t.direction}`}>
                                        <td>
                                            <button className="btn-icon-only" onClick={() => toggleAccordion(t.document_id)}>
                                                {expandedDocs[t.document_id] ? <FiChevronUp /> : <FiChevronDown />}
                                            </button>
                                        </td>
                                        <td>
                                            <div className={`dir-indicator ${t.direction}`}>
                                                {t.direction === 'incoming' ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                                                <span>{t.direction.toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="doc-cell" onClick={() => { setViewingFile({ name: t.storage_file_name, path: t.storage_file_path }); setShowViewModal(true); }}>
                                            <div className="doc-info">
                                                <span className="doc-no">{t.document_no}</span>
                                                <span className="doc-title">{t.title}</span>
                                            </div>
                                        </td>
                                        <td>{renderTimeRemaining(t.due_date, t.transaction_status)}</td>
                                        <td>
                                            <div className="user-info">
                                                <FiUser /> <span>{isCurrentlyWithMe ? `From: ${t.from_user_fullname}` : `Currently with: ${t.to_user_fullname}`}</span>
                                            </div>
                                        </td>
                                        <td><span className="instruction-tag">{t.instruction_name}</span></td>
                                        <td className="text-end">
                                            {isCurrentlyWithMe && t.transaction_status === 'Pending' ? (
                                                <button className="dynamic-action-btn receive-btn" onClick={() => handleReceive(t)}>Receive</button>
                                            ) : isCurrentlyWithMe && t.transaction_status === 'Received' ? (
                                                <div className="action-buttons-group">
                                                    {(actionsMap[t.instruction_type_id] || []).map(id => (
                                                        <button key={id} className="dynamic-action-btn" onClick={() => handleActionClick(t, allActions[id])}>
                                                            {allActions[id]?.action_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className={`status-pill status-${t.transaction_status.toLowerCase()}`}>{t.transaction_status}</span>
                                            )}
                                        </td>
                                    </tr>

                                    {expandedDocs[t.document_id] && (
                                        <tr className="history-row">
                                            <td colSpan="7">
                                                <div className="history-container">
                                                    <div className="history-header"><FiClock /> Activity Trail</div>

                                                    {isHistoryLoading ? (
                                                        <div className="p-3 text-muted text-center">Loading trail details...</div>
                                                    ) : currentHistory.length === 0 ? (
                                                        <div className="p-3 text-muted text-center">No structural details found for this document lifecycle.</div>
                                                    ) : currentHistory.map((hist) => {
                                                        // Fallbacks to handle naming differences between both endpoints cleanly
                                                        const sender = hist.from_user_name || hist.from_user_fullname;
                                                        const receiver = hist.to_user_name || hist.to_user_fullname;

                                                        return (
                                                            <div key={hist.id} className="history-item">
                                                                <div className="hist-line"></div>
                                                                <div className="hist-dot"></div>
                                                                <div className="hist-content">
                                                                    <div className="hist-meta">
                                                                        <span className="hist-status">{hist.transaction_status}</span>
                                                                        <span className="hist-date">{new Date(hist.date_created).toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="hist-details">
                                                                        <strong>{sender}</strong>
                                                                        {receiver ? ` sent to ${receiver}` : ''}
                                                                        {hist.action_name ? ` (${hist.action_name})` : ""}
                                                                    </div>
                                                                    {hist.remarks && <div className="hist-remarks">{hist.remarks}</div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <FileViewerModal show={showViewModal} onClose={() => setShowViewModal(false)} file={viewingFile} />

            <RouteDocumentModal
                show={showRouteModal}
                onClose={() => setShowRouteModal(false)}
                document={selectedDocForRouting}
                onSuccess={() => {
                    setDocHistories(prev => { const c = { ...prev }; delete c[selectedDocForRouting.document_id]; return c; });
                    fetchData();
                }}
            />
        </div>
    );
}