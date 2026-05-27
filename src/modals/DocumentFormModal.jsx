import React, { useState, useEffect } from "react";
import { FiX, FiUpload, FiFile, FiCheckCircle, FiInfo } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import "../styles/documentformmodal.css";

export default function DocumentFormModal({ show, onClose, document, docTypes, transTypes, onSuccess }) {
    const { user: currentUser } = useOutletContext();
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        document_no: "",
        title: "",
        description: "",
        document_type_id: "",
        transaction_type_id: "",
        document_status: 1,
        originating_department_id: ""
    });

    useEffect(() => {
        if (show) {
            if (document) {
                setFormData({
                    ...document,
                    description: document.description || ""
                });
            } else {
                setFormData({
                    document_no: `DOC-${Date.now()}`,
                    title: "",
                    description: "",
                    document_type_id: docTypes[0]?.id || "",
                    transaction_type_id: transTypes[0]?.id || "",
                    document_status: 1,
                    originating_department_id: currentUser?.department_id || ""
                });
            }
            setSelectedFile(null);
        }
    }, [document, show, docTypes, transTypes, currentUser]);

    if (!show) return null;

    const uploadFile = async () => {
        if (!selectedFile) return document?.storage_file_id || null;

        // 1. Safely pull the correct document number
        const baseName = formData.document_no || (document ? document.document_no : `DOC-${Date.now()}`);

        // 2. Safe extension extraction
        const hasExtension = selectedFile.name.includes('.');
        const extension = hasExtension ? selectedFile.name.split('.').pop() : '';
        const finalFileName = extension ? `${baseName}.${extension}` : baseName;

        // 3. Instantiate a new File object with the updated name
        const renamedFile = new File([selectedFile], finalFileName, { type: selectedFile.type });

        const fileFd = new FormData();
        fileFd.append("tag", "addFile");
        fileFd.append("file", renamedFile);
        fileFd.append("path", "Documents");
        fileFd.append("userid", currentUser?.id);

        try {
            const response = await fetch(`${API_URL}/filestorage.php`, { method: "POST", body: fileFd });
            const data = await response.json();
            console.log(data);
            return data.success ? data.file_id : null;
        } catch (error) {
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const fileId = await uploadFile();
            console.log(fileId);
            const docFd = new FormData();
            docFd.append("tag", document ? "update" : "insert");
            if (document) docFd.append("id", document.id);
            Object.keys(formData).forEach(key => docFd.append(key, formData[key]));
            docFd.append("storage_file_id", fileId || "");
            // Assuming selectedTransTypeId is the ID you are currently working with
            const selectedType = transTypes.find(type => parseInt(type.id) === parseInt(formData.transaction_type_id));

            // Access the duration
            const duration = setDueDate(selectedType ? selectedType.processing_duration : 0);
            docFd.append("due_date", duration)
            if (!document) {
                docFd.append("current_holder_id", currentUser?.id);
                docFd.append("created_by", currentUser?.id);
            }

            const response = await fetch(`${API_URL}/document.php`, { method: "POST", body: docFd });
            const result = await response.json();

            if (result.success) {
                Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
                onSuccess();
                onClose();
            } else {
                Swal.fire("Error", result.message, "error");
            }
        } catch (error) {
            Swal.fire("Error", "An unexpected error occurred.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const setDueDate = (daysForDue) => {
        const todayDate = new Date();
        todayDate.setDate(todayDate.getDate() + daysForDue);

        // Format to YYYY-MM-DD

        return todayDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    return (
        <div className="modal-overlay">
            <div className="doc-modal-card-horizontal">
                <div className="modal-header">
                    <div className="header-text">
                        <h2>{document ? "Edit Document" : "Create New Document"}</h2>
                        <p>Manage document metadata and attachments.</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><FiX /></button>
                </div>

                <form onSubmit={handleSubmit} className="doc-form-horizontal">
                    <div className="form-row">
                        <div className="form-group flex-2">
                            <label>Document Title</label>
                            <input className="form-input-styled" type="text" required placeholder="Enter title..."
                                value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="form-group flex-1">
                            <label>Reference No.</label>
                            <input className="form-input-styled read-only" type="text" readOnly value={formData.document_no} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Transaction Type</label>
                            <select className="form-input-styled" value={formData.transaction_type_id}
                                onChange={(e) => setFormData({ ...formData, transaction_type_id: e.target.value })} required>
                                <option value="">Select Transaction...</option>
                                {transTypes.map(t => <option key={t.id} value={t.id}>{t.transaction_name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Document Type</label>
                            <select className="form-input-styled" value={formData.document_type_id}
                                onChange={(e) => setFormData({ ...formData, document_type_id: e.target.value })} required>
                                <option value="">Select Type...</option>
                                {docTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row content-area">
                        <div className="form-group flex-1">
                            <label>Description / Remarks</label>
                            <textarea className="form-input-styled textarea-fixed" placeholder="Add notes here..."
                                value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                        </div>
                        <div className="form-group flex-1">
                            <label>Attachment</label>
                            <div className="file-upload-area-compact">
                                <input type="file" id="doc-file" hidden onChange={(e) => setSelectedFile(e.target.files[0])} />
                                <label htmlFor="doc-file" className={`file-drop-zone-compact ${selectedFile ? 'has-file' : ''}`}>
                                    {selectedFile ? (
                                        <div className="file-selected-info">
                                            <FiCheckCircle className="icon-success" />
                                            <span className="file-name-truncate">{selectedFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="file-placeholder-compact">
                                            <FiUpload />
                                            <span>Upload Attachment</span>
                                            {/* Added a small helper text to fill vertical space if needed */}
                                            <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>PDF, DOCX, or Images</small>
                                        </div>
                                    )}
                                </label>
                                {document?.storage_file_id && !selectedFile && (
                                    <div className="existing-file-info">
                                        <FiFile /> <span>File currently linked</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions-horizontal">
                        <button type="button" className="secondary-btn" onClick={onClose} disabled={isProcessing}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={isProcessing}>
                            {isProcessing ? <><span className="spinner"></span> Saving...</> : "Save Document"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}