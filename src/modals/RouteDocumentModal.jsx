import React, { useState, useEffect } from "react";
import { FiX, FiSend, FiUser, FiInfo, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import "../styles/documentformmodal.css";

export default function RouteDocumentModal({ show, onClose, document, onSuccess }) {
    const { user: currentUser } = useOutletContext();
    const [users, setUsers] = useState([]);
    const [instructions, setInstructions] = useState([]); // 1. State for dynamic instructions
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        to_user_id: "",
        instruction_type_id: "",
        remarks: "",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    useEffect(() => {
        if (show) {
            fetchInitialData();
        }
    }, [show]);

    const fetchInitialData = async () => {
        // Fetch Users
        const userFd = new FormData();
        userFd.append("tag", "getall");

        // Fetch Instruction Types
        const insFd = new FormData();
        insFd.append("tag", "getall");

        try {
            const [userRes, insRes] = await Promise.all([
                fetch(`${API_URL}/users.php`, { method: "POST", body: userFd }).then(r => r.json()),
                fetch(`${API_URL}/instructiontypes.php`, { method: "POST", body: insFd }).then(r => r.json())
            ]);

            if (userRes.success) {
                setUsers(userRes.data.filter(u => u.id !== currentUser.id));
                // setUsers(userRes.data);
            }

            if (insRes.success) {
                setInstructions(insRes.data);
                // Set default instruction to the first one in the list
                if (insRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, instruction_type_id: insRes.data[0].id }));
                }
            }
        } catch (error) {
            console.error("Error loading modal data:", error);
        }
    };

    if (!show || !document) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);

        const targetUser = users.find(u => u.id === parseInt(formData.to_user_id));

        // 1. Prepare Transaction Data
        const transFd = new FormData();
        transFd.append("tag", "insert");
        transFd.append("document_id", document.id);
        transFd.append("from_user_id", currentUser.id);
        transFd.append("from_department_id", currentUser.department_id);
        transFd.append("to_user_id", formData.to_user_id);
        transFd.append("to_department_id", targetUser?.department_id || "");
        transFd.append("instruction_type_id", formData.instruction_type_id);
        transFd.append("remarks", formData.remarks);
        transFd.append("due_date", formData.due_date);

        // 2. Prepare Document Status Update Data
        const docUpdateFd = new FormData();
        docUpdateFd.append("tag", "update_status");
        docUpdateFd.append("id", document.id);
        docUpdateFd.append("document_status", "Pending");

        try {
            // Run both requests: Creating the transaction and updating the document status
            const [transRes, docRes] = await Promise.all([
                fetch(`${API_URL}/document_transaction.php`, { method: "POST", body: transFd }).then(r => r.json()),
                fetch(`${API_URL}/document.php`, { method: "POST", body: docUpdateFd }).then(r => r.json())
            ]);

            if (transRes.success && docRes.success) {
                Swal.fire({
                    title: "Success",
                    text: "Document routed and status updated to Pending",
                    icon: "success",
                    confirmButtonColor: "#820d0d"
                });
                onSuccess();
                onClose();
            } else {
                const errorMsg = !transRes.success ? transRes.message : docRes.message;
                Swal.fire("Error", errorMsg || "Routing failed", "error");
            }
        } catch (error) {
            console.error("Routing error:", error);
            Swal.fire("Error", "Network error occurred", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="doc-modal-card-horizontal">
                <div className="modal-header">
                    <div className="header-text">
                        <h2>Route Document</h2>
                        <p>Forwarding: <strong>{document.document_no}</strong></p>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </div>

                <form onSubmit={handleSubmit} className="doc-form-horizontal">
                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label><FiUser /> Forward To</label>
                            <select
                                className="form-input-styled"
                                required
                                value={formData.to_user_id}
                                onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                            >
                                <option value="">Select Recipient</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.fullname} ({u.department_name})</option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Updated Dynamic Instruction Dropdown */}
                        <div className="form-group flex-1">
                            <label><FiInfo /> Purpose / Instruction</label>
                            <select
                                className="form-input-styled"
                                required
                                value={formData.instruction_type_id}
                                onChange={(e) => setFormData({ ...formData, instruction_type_id: e.target.value })}
                            >
                                {instructions.map(ins => (
                                    <option key={ins.id} value={ins.id}>
                                        {ins.instruction_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group flex-1">
                            <label><FiCalendar /> Deadline</label>
                            <input
                                type="date"
                                className="form-input-styled"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-2">
                            <label>Remarks / Special Instructions</label>
                            <textarea
                                className="form-input-styled textarea-fixed"
                                placeholder="Enter details..."
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-actions-horizontal">
                        <button type="button" className="secondary-btn" onClick={onClose} disabled={isProcessing}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={isProcessing}>
                            {isProcessing ? <><span className="spinner"></span> Routing...</> : <><FiSend style={{ marginRight: '8px' }} /> Route Document</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}