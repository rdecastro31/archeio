import React, { useState, useEffect, useCallback } from "react";
import {
    FiArrowDownLeft,
    FiArrowUpRight,
    FiUser,
    FiChevronDown,
    FiChevronUp,
    FiClock,
    FiAlertCircle,
    FiCheckCircle
} from "react-icons/fi";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import { PDFDocument, rgb } from 'pdf-lib';
import Swal from "sweetalert2";
import "../styles/transactions.css";
import FileViewerModal from './../modals/ViewFileModal';
import RouteDocumentModal from "../modals/RouteDocumentModal";

export default function Transactions() {
    const { user: currentUser } = useOutletContext();
    const [groupedTransactions, setGroupedTransactions] = useState([]);
    const [expandedDocs, setExpandedDocs] = useState({});

    const [docHistories, setDocHistories] = useState({});
    const [historyLoading, setHistoryLoading] = useState({});

    const [actionsMap, setActionsMap] = useState({});
    const [allActions, setAllActions] = useState({});
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingFile, setViewingFile] = useState(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchDocumentHistory = async (documentId) => {
        setHistoryLoading(prev => ({ ...prev, [documentId]: true }));
        const fd = new FormData();
        fd.append("tag", "view_transaction_history");
        fd.append("document_id", documentId);

        try {
            const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());
            if (res.success && res.history) {
                const sortedHistory = res.history.sort((a, b) => parseInt(b.id) - parseInt(a.id));
                setDocHistories(prev => ({ ...prev, [documentId]: sortedHistory }));
                return sortedHistory;
            } else {
                setDocHistories(prev => ({ ...prev, [documentId]: [] }));
                return [];
            }
        } catch (error) {
            console.error("Failed to fetch historical steps:", error);
            return [];
        } finally {
            setHistoryLoading(prev => ({ ...prev, [documentId]: false }));
        }
    };

    const toggleAccordion = (docId) => {
        const matchingState = !expandedDocs[docId];
        setExpandedDocs(prev => ({ ...prev, [docId]: matchingState }));

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
        fd.append("from_department_id", transaction.from_department_id || currentUser.department_id);
        fd.append("to_department_id", currentUser.department_id);
        fd.append("instruction_type_id", transaction.instruction_type_id);
        fd.append("due_date", transaction.due_date || "");
        fd.append("transaction_status", "Received");
        // Keep the exact JSON string in remarks intact when receiving the row
        fd.append("remarks", transaction.remarks || "");

        try {
            const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());
            if (res.success) {
                Swal.fire({ title: "Received", icon: "success", timer: 800, showConfirmButton: false });
                fetchDocumentHistory(transaction.document_id);
                fetchData();
            } else {
                Swal.fire("Error", res.message || "Failed to mark transaction as Received.", "error");
            }
        } catch (err) {
            Swal.fire("Connection Error", "Could not reach processing server.", "error");
        }
    };

    const handleActionClick = (transaction, action) => {
        let parsedRemarksObj = null;
        try {
            if (transaction.remarks && (transaction.remarks.trim().startsWith('{') || transaction.remarks.trim().startsWith('['))) {
                parsedRemarksObj = JSON.parse(transaction.remarks);
            }
        } catch (e) {
            parsedRemarksObj = null;
        }

        if (action.action_result === 'Proceed') {

            const processDigitalSigningWorkflow = async () => {
                try {
                    Swal.fire({
                        title: 'Stamping Digital Signature...',
                        text: 'Please hold while your verified signature is appended directly into the document structure.',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    let activeHistoryTrail = docHistories[transaction.document_id];
                    if (!activeHistoryTrail) {
                        activeHistoryTrail = await fetchDocumentHistory(transaction.document_id);
                    }

                    console.log("RAW HISTORY TRAIL FROM API:", activeHistoryTrail[0].remarks);

                    let latestDocumentTransactionRemark = JSON.parse(activeHistoryTrail[0].remarks)

                    // --- READ DIRECTLY FROM THE LATEST TRANSACTION REMARKS ---
                    let signatureCountIndex = latestDocumentTransactionRemark.routing_chain.length + 1;

                    console.log("Calculated current signature stamp placement index:", signatureCountIndex);

                    const currentFileTarget = `${API_URL}/storage/user_${transaction.originating_user_id}/${transaction.storage_file_path}/${transaction.storage_file_name}`;

                    const signatureUrlSource = currentUser.signature_path
                        ? `${API_URL}/${currentUser.signature_path}`
                        : "/default_stamp.png";

                    const textualStampLabel = `Digitally Certified By:\n${currentUser.fullname || 'Authorized User'}`;

                    const signedBlob = await appendSignatureToPdf(
                        currentFileTarget,
                        signatureUrlSource,
                        textualStampLabel,
                        signatureCountIndex
                    );

                    const uploadFormData = new FormData();
                    uploadFormData.append("tag", "addFileAndLinkToDocument");
                    uploadFormData.append("userid", transaction.originating_user_id);
                    uploadFormData.append("document_id", transaction.document_id);
                    uploadFormData.append("path", "Documents");
                    uploadFormData.append("file", signedBlob, transaction.storage_file_name || "signed_document.pdf");

                    const uploadResponse = await fetch(`${API_URL}/filestorage.php`, {
                        method: "POST",
                        body: uploadFormData
                    }).then(r => r.json());

                    if (!uploadResponse.success) {
                        throw new Error(uploadResponse.message || "Failed to commit binary file revision.");
                    }

                    Swal.close();
                    return true;
                } catch (err) {
                    console.error(err);
                    Swal.fire("Signing Aborted", `Execution interrupted: ${err.message}`, "error");
                    return false;
                }
            };

            if (parsedRemarksObj && parsedRemarksObj.routing_chain && parsedRemarksObj.routing_chain.length > 0) {
                Swal.fire({
                    title: "Proceed to Next Recipient?",
                    text: "This document will automatically advance to the next step recipient in sequence.",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonColor: "#820d0d"
                }).then(async (result) => {
                    if (result.isConfirmed) {

                        const signedOk = await processDigitalSigningWorkflow();
                        if (!signedOk) return;

                        const nextStep = parsedRemarksObj.routing_chain[0];
                        const remainingSteps = parsedRemarksObj.routing_chain.slice(1);

                        const nextRemarksPayload = {
                            user_remarks: nextStep.remarks,
                            routing_chain: remainingSteps
                        };

                        const fd = new FormData();
                        fd.append("tag", "insert");
                        fd.append("document_id", transaction.document_id);
                        fd.append("from_user_id", currentUser.id);
                        fd.append("from_department_id", currentUser.department_id);
                        fd.append("to_user_id", nextStep.to_user_id);
                        fd.append("to_department_id", nextStep.to_department_id || currentUser.department_id);
                        fd.append("instruction_type_id", nextStep.instruction_type_id);
                        fd.append("action_id", action.id);
                        fd.append("due_date", transaction.due_date || "");
                        fd.append("transaction_status", "Pending");
                        fd.append("remarks", JSON.stringify(nextRemarksPayload));

                        const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());
                        if (res.success) {
                            Swal.fire("Forwarded", "Document successfully advanced to the next recipient.", "success");
                            fetchDocumentHistory(transaction.document_id);
                            fetchData();
                        } else {
                            Swal.fire("Error", "Failed to forward step chain row execution.", "error");
                        }
                    }
                });
                return;
            } else {
                Swal.fire({
                    title: "What would you like to do?",
                    text: "There are no remaining automated steps in the chain. You can choose to finalize this document workflow or manually route it to another recipient.",
                    icon: "question",
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonColor: "#820d0d",
                    denyButtonColor: "#3085d6",
                    confirmButtonText: "Complete Document",
                    denyButtonText: "Route Document",
                    cancelButtonText: "Cancel",
                    allowOutsideClick: false
                }).then(async (result) => {
                    if (result.isConfirmed) {

                        const signedOk = await processDigitalSigningWorkflow();
                        if (!signedOk) return;

                        const fd = new FormData();
                        fd.append("tag", "insert");
                        fd.append("document_id", transaction.document_id);
                        fd.append("from_user_id", currentUser.id);
                        fd.append("from_department_id", currentUser.department_id);
                        fd.append("to_user_id", transaction.from_user_id);
                        fd.append("to_department_id", transaction.from_department_id || currentUser.department_id);
                        fd.append("instruction_type_id", transaction.instruction_type_id);
                        fd.append("action_id", action.id);
                        fd.append("due_date", transaction.due_date || "");
                        fd.append("transaction_status", "Completed");
                        fd.append("remarks", `Action: Completed document workflow. ${parsedRemarksObj ? (parsedRemarksObj.user_remarks || '') : (transaction.remarks || '')}`);

                        const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());

                        const docFd = new FormData();
                        docFd.append("tag", "update_status");
                        docFd.append("id", transaction.document_id);
                        docFd.append("document_status", 4);
                        await fetch(`${API_URL}/document.php`, { method: "POST", body: docFd });

                        if (res.success) {
                            Swal.fire("Success", "Document workflow completed successfully.", "success");
                            fetchDocumentHistory(transaction.document_id);
                            fetchData();
                        } else {
                            Swal.fire("Error", "Failed to complete transaction.", "error");
                        }

                    } else if (result.isDenied) {
                        setSelectedDocForRouting(transaction);
                        setShowRouteModal(true);
                    }
                });
                return;
            }
        }

        Swal.fire({
            title: `Confirm ${action.action_name}?`,
            text: `This will mark the document as ${action.action_result}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#820d0d'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const isFinalAction = action.action_result === 'Complete';

                if (!isFinalAction && parsedRemarksObj && parsedRemarksObj.routing_chain && parsedRemarksObj.routing_chain.length > 0) {
                    const nextStep = parsedRemarksObj.routing_chain[0];
                    const remainingSteps = parsedRemarksObj.routing_chain.slice(1);

                    const nextRemarksPayload = {
                        user_remarks: nextStep.remarks,
                        routing_chain: remainingSteps
                    };

                    const fd = new FormData();
                    fd.append("tag", "insert");
                    fd.append("document_id", transaction.document_id);
                    fd.append("from_user_id", currentUser.id);
                    fd.append("from_department_id", currentUser.department_id);
                    fd.append("to_user_id", nextStep.to_user_id);
                    fd.append("to_department_id", nextStep.to_department_id || currentUser.department_id);
                    fd.append("instruction_type_id", nextStep.instruction_type_id);
                    fd.append("action_id", action.id);
                    fd.append("due_date", transaction.due_date || "");
                    fd.append("transaction_status", "Pending");
                    fd.append("remarks", JSON.stringify(nextRemarksPayload));

                    const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());
                    if (res.success) {
                        Swal.fire("Advanced", "Action captured; document shifted to next node workflow step.", "success");
                        fetchDocumentHistory(transaction.document_id);
                        fetchData();
                        return;
                    }
                }

                const fd = new FormData();
                fd.append("tag", "insert");
                fd.append("document_id", transaction.document_id);
                fd.append("from_user_id", currentUser.id);
                fd.append("from_department_id", currentUser.department_id);
                fd.append("to_user_id", transaction.from_user_id);
                fd.append("to_department_id", transaction.from_department_id || currentUser.department_id);
                fd.append("instruction_type_id", transaction.instruction_type_id);
                fd.append("action_id", action.id);
                fd.append("due_date", transaction.due_date || "");
                fd.append("transaction_status", isFinalAction ? 'Completed' : 'Pending');
                fd.append("remarks", `Action: ${action.action_name}. ${parsedRemarksObj ? (parsedRemarksObj.user_remarks || '') : (transaction.remarks || '')}`);

                const res = await fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: fd }).then(r => r.json());

                if (isFinalAction) {
                    const docFd = new FormData();
                    docFd.append("tag", "update_status");
                    docFd.append("id", transaction.document_id);
                    docFd.append("document_status", 4);
                    await fetch(`${API_URL}/document.php`, { method: "POST", body: docFd });
                }

                if (res.success) {
                    Swal.fire("Success", "Action processed.", "success");
                    fetchDocumentHistory(transaction.document_id);
                    fetchData();
                }
            }
        });
    };

    /**
     * DYNAMIC HORIZONTAL SHIFTING SIGNATURE RENDERING SUITE 
     * Starts at bottom right, shifts systematically leftward, and wraps rows upward when it runs out of space.
     */
    async function appendSignatureToPdf(pdfUrl, signatureImgUrl, defaultTextStamp = "Digitally Signed", signatureIndex = 0) {
        const arrayBuffer = await fetch(pdfUrl).then(res => {
            if (!res.ok) throw new Error(`HTTP network error! status: ${res.status}`);
            return res.arrayBuffer();
        });

        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const helveticaFont = await pdfDoc.embedFont('Helvetica-Bold');

        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();

        const containerWidth = 85;
        const containerHeight = 85;
        const pageMargin = 30;

        // Space step increments between individual stamps
        const horizontalShiftStep = containerWidth + 40;

        // Determine how many items fit on a single line safely
        const itemsPerRow = Math.floor((width - (pageMargin * 2)) / horizontalShiftStep);

        let finalComputedX = pageMargin;
        let finalComputedY = pageMargin + 35;

        if (itemsPerRow > 0) {
            const currentComputedRow = Math.floor(signatureIndex / itemsPerRow);
            const currentComputedColumn = signatureIndex % itemsPerRow;

            // Shift positions right-to-left dynamically using column tracking blocks
            finalComputedX = width - containerWidth - pageMargin - (currentComputedColumn * horizontalShiftStep);
            finalComputedY = (pageMargin + 35) + (currentComputedRow * 140);
        }

        try {
            if (!signatureImgUrl) throw new Error("No image target context resolved.");

            const imgBuffer = await fetch(signatureImgUrl).then(res => res.arrayBuffer());
            const isPng = signatureImgUrl.toLowerCase().endsWith('.png') || signatureImgUrl.startsWith('data:image/png');

            const embeddedImage = isPng ? await pdfDoc.embedPng(imgBuffer) : await pdfDoc.embedJpg(imgBuffer);

            lastPage.drawImage(embeddedImage, {
                x: finalComputedX,
                y: finalComputedY,
                width: containerWidth,
                height: containerHeight,
            });

            const textFontSize = 8;
            const currentStampDate = new Date().toLocaleDateString();

            const textLines = [
                "Digitally Certified By:",
                currentUser.fullname || 'Authorized User',
                `Date: ${currentStampDate}`
            ];

            textLines.forEach((line, index) => {
                const textLineWidth = helveticaFont.widthOfTextAtSize(line, textFontSize);
                const centeredX = finalComputedX + (containerWidth - textLineWidth) / 2;
                const adjustedY = finalComputedY - 12 - (index * 10);

                lastPage.drawText(line, {
                    x: centeredX,
                    y: adjustedY,
                    size: textFontSize,
                    font: helveticaFont,
                    color: rgb(0.82, 0.18, 0.18),
                });
            });

        } catch (e) {
            console.warn("Falling back to plain text metadata injection:", e.message);
            lastPage.drawText(`${defaultTextStamp}\nDate: ${new Date().toLocaleDateString()}`, {
                x: finalComputedX,
                y: pageMargin + 20,
                size: 9,
                lineHeight: 11
            });
        }

        const modifiedPdfBytes = await pdfDoc.save();
        return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    }

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
                                        <td className="doc-cell" onClick={() => { setViewingFile({ name: t.storage_file_name, path: t.storage_file_path, user: t.originating_user_id }); setShowViewModal(true); }}>
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
                                                <button className="dynamic-action-btn" onClick={() => handleReceive(t)}>Receive</button>
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
                                                                    {hist.remarks && (
                                                                        <div className="hist-remarks">
                                                                            {(() => {
                                                                                try {
                                                                                    if (hist.remarks.trim().startsWith('{') || hist.remarks.trim().startsWith('[')) {
                                                                                        const parsed = JSON.parse(hist.remarks);
                                                                                        return parsed.user_remarks || "No step remarks provided.";
                                                                                    }
                                                                                } catch (e) { }
                                                                                return hist.remarks;
                                                                            })()}
                                                                        </div>
                                                                    )}
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
                    fetchDocumentHistory(selectedDocForRouting.document_id);
                    fetchData();
                }}
            />
        </div>
    );
}