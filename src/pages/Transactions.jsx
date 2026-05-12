import React, { useState, useEffect, useCallback } from "react";
import {
    FiArrowDownLeft,
    FiArrowUpRight,
    FiUser,
    FiActivity,
    FiPlay,
    FiXCircle,
    FiPauseCircle,
    FiCornerUpLeft,
    FiCheckCircle,
    FiFileText
} from "react-icons/fi";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";
import "../styles/transactions.css";
import FileViewerModal from './../modals/ViewFileModal';

export default function Transactions() {
    const { user: currentUser } = useOutletContext();
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [actionsMap, setActionsMap] = useState({}); // Stores which instructions map to which action IDs
    const [allActions, setAllActions] = useState({}); // Stores action details keyed by ID
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingFile, setViewingFile] = useState(null);
    const [loading, setLoading] = useState(true);

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

            // 1. Process Actions into a lookup table
            if (actRes.success) {
                const actionLookup = {};
                actRes.data.forEach(a => { actionLookup[a.id] = a; });
                setAllActions(actionLookup);
            }

            // 2. Process Mappings (Group action IDs by instruction_type_id)
            if (mapRes.success) {
                const groupedMap = {};
                mapRes.data.forEach(m => {
                    if (!groupedMap[m.instruction_type_id]) groupedMap[m.instruction_type_id] = [];
                    groupedMap[m.instruction_type_id].push(m.action_id);
                });
                setActionsMap(groupedMap);
            }

            // 3. Process Transactions
            if (transRes.success) {
                setIncoming(transRes.data.filter(t =>
                    parseInt(t.to_user_id) === parseInt(currentUser.id) &&
                    t.transaction_status === 'Pending'
                ));
                setOutgoing(transRes.data.filter(t =>
                    parseInt(t.from_user_id) === parseInt(currentUser.id)
                ));
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleActionClick = (transaction, action) => {
        Swal.fire({
            title: `Confirm ${action.action_name}?`,
            text: `Document: ${transaction.document_no} - ${transaction.title}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, proceed',
            confirmButtonColor: '#820d0d'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Check if the result is 'Complete'
                if (action.action_result === 'Complete') {

                    // 1. Prepare data for document_transaction.php
                    // We update the transaction record to show it was acted upon
                    const transFd = new FormData();
                    transFd.append("tag", "updatestatus"); // Assuming your backend has a status update tag
                    transFd.append("id", transaction.id);
                    transFd.append("transaction_status", "Completed");

                    // 2. Prepare data for document.php
                    // We update the master document status to 'Completed'
                    const docFd = new FormData();
                    docFd.append("tag", "update_status");
                    docFd.append("id", transaction.document_id);
                    docFd.append("document_status", "Completed");

                    try {
                        const [resTrans, resDoc] = await Promise.all([
                            fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: transFd }).then(r => r.json()),
                            fetch(`${API_URL}/document.php`, { method: "POST", body: docFd }).then(r => r.json())
                        ]);

                        if (resTrans.success && resDoc.success) {
                            Swal.fire({
                                title: "Completed",
                                text: "The document and transaction have been marked as completed.",
                                icon: "success",
                                confirmButtonColor: "#820d0d"
                            });
                            fetchData(); // Refresh the tables
                        } else {
                            Swal.fire("Error", "Failed to update record status.", "error");
                        }
                    } catch (error) {
                        console.error("Completion error:", error);
                        Swal.fire("Error", "Network error occurred.", "error");
                    }
                } else {
                    // Handle other results (Proceed, Terminate, etc.) here
                    console.log("Other action triggered:", action.action_result);
                }
            }
        });
    };

    const getActionIcon = (actionName) => {
        switch (actionName) {
            case 'Proceed': return <FiPlay />;
            case 'Terminate': return <FiXCircle />;
            case 'Hold': return <FiPauseCircle />;
            case 'Return': return <FiCornerUpLeft />;
            case 'Complete': return <FiCheckCircle />;
            default: return <FiActivity />;
        }
    };

    const renderActionButtons = (transaction) => {
        // 1. If the transaction is already completed, show a status message instead of buttons
        if (transaction.transaction_status === 'Completed') {
            return (
                <div className="action-buttons-group">
                    <span className="status-pill status-completed" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        <FiCheckCircle style={{ marginRight: '4px' }} /> Completed
                    </span>
                </div>
            );
        }

        const instructionId = transaction.instruction_type_id;
        const mappedActionIds = actionsMap[instructionId] || [];

        return (
            <div className="action-buttons-group">
                {mappedActionIds.length > 0 ? (
                    mappedActionIds.map((actionId) => {
                        const action = allActions[actionId];
                        if (!action) return null;

                        const btnStyle = action.action_result?.startsWith('#')
                            ? { backgroundColor: action.action_result }
                            : {};

                        return (
                            <button
                                key={actionId}
                                className={`dynamic-action-btn ${!btnStyle.backgroundColor ? 'btn-primary' : ''}`}
                                style={btnStyle}
                                onClick={() => handleActionClick(transaction, action)}
                            >
                                {getActionIcon(action.action_result)}
                                <span>{action.action_name}</span>
                            </button>
                        );
                    })
                ) : (
                    /* 2. Message when the transaction is Pending but no map exists */
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No actions available
                    </span>
                )}
            </div>
        );
    };

    const handleViewDocument = (t) => {
        if (!t.storage_file_name) {
            Swal.fire("Info", "No attachment available for this document.", "info");
            return;
        }

        // Mapping transaction data to the structure ViewFileModal expects
        const fileData = {
            name: t.storage_file_name,
            path: t.storage_file_path || "/",
            user: t.originating_user_id || "1", // Use the owner of the file
        };

        setViewingFile(fileData);
        setShowViewModal(true);
    };

    return (
        <div className="transactions-page">
            <div className="trans-header">
                <div className="header-title">
                    <h1>Document Transactions</h1>
                    <p>Manage your incoming tasks and track sent items.</p>
                </div>
            </div>

            <div className="trans-grid">
                {/* INCOMING SECTION (Full Width Row) */}
                <section className="trans-section">
                    <div className="section-title">
                        <div className="title-icon in"><FiArrowDownLeft /></div>
                        <div className="title-text">
                            <h2>Incoming Document</h2>
                            <span>Items waiting for your action</span>
                        </div>
                        <div className="count-badge">{incoming.length}</div>
                    </div>

                    <div className="table-card">
                        <table className="trans-table">
                            <thead>
                                <tr>
                                    <th>Document</th>
                                    <th>From</th>
                                    <th>Instruction</th>
                                    <th className="text-end">Available Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incoming.map(t => (
                                    <tr key={t.id}>
                                        <td className="doc-cell" onClick={() => handleViewDocument(t)} style={{ cursor: 'pointer' }}>
                                            <div className="doc-info">
                                                <span className="doc-no">{t.document_no}</span>
                                                <span className="doc-title">{t.title} <FiFileText style={{ marginLeft: '4px', opacity: 0.5 }} /></span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-info">
                                                <FiUser /> <span>{t.from_user_fullname}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="instruction-tag">{t.instruction_name}</span>
                                        </td>
                                        <td className="text-end">
                                            {renderActionButtons(t)}
                                        </td>
                                    </tr>
                                ))}
                                {incoming.length === 0 && (
                                    <tr><td colSpan="4" className="empty-state">No pending incoming documents.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* OUTGOING SECTION (Full Width Row) */}
                <section className="trans-section">
                    <div className="section-title">
                        <div className="title-icon out"><FiArrowUpRight /></div>
                        <div className="title-text">
                            <h2>Outgoing History</h2>
                            <span>Documents you have forwarded</span>
                        </div>
                    </div>

                    <div className="table-card">
                        <table className="trans-table">
                            <thead>
                                <tr>
                                    <th>Document</th>
                                    <th>Sent To</th>
                                    <th>Status</th>
                                    <th className="text-end">Date Sent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outgoing.map(t => (
                                    <tr key={t.id}>
                                        <td className="doc-cell" onClick={() => handleViewDocument(t)} style={{ cursor: 'pointer' }}>
                                            <div className="doc-info">
                                                <span className="doc-no">{t.document_no}</span>
                                                <span className="doc-title">{t.title} <FiFileText style={{ marginLeft: '4px', opacity: 0.5 }} /></span>
                                            </div>
                                        </td>
                                        <td>{t.to_user_fullname}</td>
                                        <td>
                                            <span className={`status-pill status-${t.transaction_status.toLowerCase()}`}>
                                                {t.transaction_status}
                                            </span>
                                        </td>
                                        <td className="text-end date-text">
                                            {new Date(t.date_created).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
            <FileViewerModal
                show={showViewModal}
                onClose={() => setShowViewModal(false)}
                file={viewingFile}
            />
        </div>
    );
}