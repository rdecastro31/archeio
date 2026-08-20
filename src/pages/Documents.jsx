import React, { useState, useEffect, useCallback } from "react";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiFileText, FiCalendar, FiEye, FiSend, FiArchive } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import DocumentFormModal from "../modals/DocumentFormModal";
import ViewFileModal from "../modals/ViewFileModal";
import "../styles/documents.css";
import RouteDocumentModal from "../modals/RouteDocumentModal";
import { useOutletContext } from "react-router-dom";

// --- Confidence Badge Helpers ---
const getConfidenceConfig = (confidence) => {
    if (confidence === null || confidence === undefined) {
        return {
            label: "Unavailable",
            bg: "#f1f5f9",
            color: "#475569",
            border: "#cbd5e1",
            dot: "#94a3b8"
        };
    }

    const score = Number(confidence);

    if (score >= 95) {
        return {
            label: `${score.toFixed(0)}% Very Reliable`,
            bg: "#ecfdf5",
            color: "#047857",
            border: "#a7f3d0",
            dot: "#059669"
        };
    }
    if (score >= 84) {
        return {
            label: `${score.toFixed(0)}% Good`,
            bg: "#f0fdf4",
            color: "#15803d",
            border: "#bbf7d0",
            dot: "#16a34a"
        };
    }
    if (score >= 60) {
        return {
            label: `${score.toFixed(0)}% Review Needed`,
            bg: "#fffbeb",
            color: "#b45309",
            border: "#fde68a",
            dot: "#d97706"
        };
    }
    return {
        label: `${score.toFixed(0)}% Low Confidence`,
        bg: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
        dot: "#dc2626"
    };
};

const ConfidenceBadge = ({ confidence }) => {
    const config = getConfidenceConfig(confidence);

    return (
        <span
            className="ocr-confidence-badge"
            title={`OCR Confidence: ${confidence !== null && confidence !== undefined ? confidence + '%' : 'Unavailable'}`}
            style={{
                backgroundColor: config.bg,
                color: config.color,
                borderColor: config.border
            }}
        >
            <span className="ocr-badge-dot" style={{ backgroundColor: config.dot }} />
            {config.label}
        </span>
    );
};

export default function Documents() {
    const { user } = useOutletContext();
    const USER_ID = user?.id || null;
    const [documents, setDocuments] = useState([]);
    const [docTypes, setDocTypes] = useState([]);
    const [transTypes, setTransTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);

    const [showViewModal, setShowViewModal] = useState(false);
    const [fileToView, setFileToView] = useState(null);

    const [showRouteModal, setShowRouteModal] = useState(false);
    const [documentToRoute, setDocumentToRoute] = useState(null);

    const callApi = async (url, formData) => {
        try {
            const response = await fetch(url, { method: "POST", body: formData });
            return await response.json();
        } catch (error) {
            return { success: 0, message: "Network error" };
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        const docFd = new FormData();
        docFd.append("tag", "getcreatedbyuser");
        docFd.append("user_id", USER_ID);
        const docData = await callApi(`${API_URL}/document.php`, docFd);

        const typeFd = new FormData();
        typeFd.append("tag", "getall");
        const typeData = await callApi(`${API_URL}/doctype.php`, typeFd);

        const transFd = new FormData();
        transFd.append("tag", "getall");
        const transData = await callApi(`${API_URL}/transactiontypes.php`, transFd);

        if (docData.success) setDocuments(docData.data);
        if (typeData.success) setDocTypes(typeData.data);
        if (transData.success) setTransTypes(transData.data);
        setLoading(false);
    }, [USER_ID]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRoute = (doc) => {
        setDocumentToRoute(doc);
        setShowRouteModal(true);
    };

    const handleViewFile = (doc) => {
        if (!doc.filename) {
            Swal.fire("Notice", "No file attached to this document.", "info");
            return;
        }

        setFileToView({
            name: doc.filename,
            path: doc.file_path,
            user: doc.created_by
        });
        setShowViewModal(true);
    };

    const handleDelete = async (doc) => {
        const res = await Swal.fire({
            title: 'Delete Document?',
            text: `Remove "${doc.title}"? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#820d0d',
            confirmButtonText: 'Yes, delete'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "delete");
            fd.append("id", doc.id);
            const data = await callApi(`${API_URL}/document.php`, fd);
            if (data.success) {
                fetchData();
                Swal.fire("Deleted!", data.message, "success");
            }
        }
    };

    const handleArchive = async (doc) => {
        const res = await Swal.fire({
            title: 'Archive Document?',
            text: `Are you sure you want to archive "${doc.title}"? The associated file will be securely transferred into the Archive.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2e7d32',
            confirmButtonText: 'Yes, archive'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "archive");
            fd.append("id", doc.id);

            const data = await callApi(`${API_URL}/document.php`, fd);
            if (data.success) {
                fetchData();
                Swal.fire("Archived!", data.message, "success");
            } else {
                Swal.fire("Error", data.message || "Failed to complete archive execution.", "error");
            }
        }
    };

    const filteredDocs = documents.filter(d =>
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.document_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="docs-container">
            <div className="page-header">
                <div><h1 className="page-title">Document Management</h1></div>
                <button className="primary-btn" onClick={() => { setSelectedDocument(null); setShowModal(true); }}>
                    <FiPlus /><span>Create Document</span>
                </button>
            </div>

            <div className="table-card">
                <div className="table-toolbar">
                    <div className="search-box">
                        <FiSearch className="search-icon-main" />
                        <input type="text" placeholder="Search by number or title..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Document Info</th>
                                <th>Type & Dept</th>
                                <th>Confidence</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center">Loading documents...</td></tr>
                            ) : filteredDocs.map(doc => (
                                <tr key={doc.id}>
                                    <td>
                                        <div className="doc-info-cell">
                                            <div className="doc-icon-square"><FiFileText /></div>
                                            <div>
                                                <span className="doc-no">{doc.document_no}</span>
                                                <span className="doc-title-text">{doc.title}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="meta-cell">
                                            <span className="type-text">{doc.type_name || 'Uncategorized'}</span>
                                            <span className="dept-subtext">{doc.department_name || 'General'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {doc.filename ? (
                                            <ConfidenceBadge confidence={doc.confidence} />
                                        ) : (
                                            <span className="text-muted small">--</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${doc.document_status_name?.toLowerCase().replace(' ', '-')}`}>
                                            {doc.document_status_name}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="date-cell">
                                            <FiCalendar /> <span>{new Date(doc.date_created).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="text-end">
                                        <div className="actions-wrapper">
                                            <button
                                                className="icon-btn view"
                                                title="View Attachment"
                                                onClick={() => handleViewFile(doc)}
                                            >
                                                <FiEye />
                                            </button>

                                            {doc.document_status_name === 'Draft' && (
                                                <>
                                                    <button
                                                        className="icon-btn route"
                                                        title="Route Document"
                                                        onClick={() => handleRoute(doc)}
                                                    >
                                                        <FiSend />
                                                    </button>
                                                    <button className="icon-btn edit" onClick={() => { setSelectedDocument(doc); setShowModal(true); }}><FiEdit2 /></button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(doc)}><FiTrash2 /></button>
                                                </>
                                            )}

                                            {(doc.document_status_name === 'Completed' || doc.document_status_name === 'Cancelled') && (
                                                <button
                                                    className="icon-btn archive"
                                                    title="Archive Document"
                                                    onClick={() => handleArchive(doc)}
                                                >
                                                    <FiArchive />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <DocumentFormModal
                show={showModal}
                onClose={() => setShowModal(false)}
                document={selectedDocument}
                docTypes={docTypes}
                transTypes={transTypes}
                onSuccess={fetchData}
            />

            <ViewFileModal
                show={showViewModal}
                onClose={() => setShowViewModal(false)}
                file={fileToView}
            />

            <RouteDocumentModal
                show={showRouteModal}
                onClose={() => setShowRouteModal(false)}
                document={documentToRoute}
                onSuccess={fetchData}
            />
        </div>
    );
}