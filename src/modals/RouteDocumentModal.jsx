import React, { useState, useEffect } from "react";
import {
  FiX,
  FiSend,
  FiUser,
  FiInfo,
  FiCalendar,
  FiBriefcase,
} from "react-icons/fi";
import Swal from "sweetalert2";
import axios from "axios";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import "../styles/routedocumentmodal.css";

export default function RouteDocumentModal({
  show,
  onClose,
  document,
  onSuccess,
}) {
  const { user: currentUser } = useOutletContext();

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [instructions, setInstructions] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    department_id: "",
    to_user_id: "",
    instruction_type_id: "",
    remarks: "",
    due_date: "",
  });

  const resetModal = () => {
    setFormData({
      department_id: "",
      to_user_id: "",
      instruction_type_id: "",
      remarks: "",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    });
    setUsers([]);
  };

  useEffect(() => {
    if (show) {
      resetModal();
      fetchInitialData();
    }
  }, [show]);

  const fetchInitialData = async () => {
    try {
      const deptFd = new FormData();
      deptFd.append("tag", "getall");
      const instFd = new FormData();
      instFd.append("tag", "getall");

      const [deptRes, instRes] = await Promise.all([
        axios.post(`${API_URL}/department.php`, deptFd),
        axios.post(`${API_URL}/instructiontypes.php`, instFd),
      ]);

      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (instRes.data.success) setInstructions(instRes.data.data);
    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
  };

  useEffect(() => {
    if (formData.department_id) {
      const fetchUsers = async () => {
        setIsLoadingUsers(true);
        const fd = new FormData();
        fd.append("tag", "getbydept");
        fd.append("department_id", formData.department_id);

        try {
          const res = await axios.post(`${API_URL}/users.php`, fd);
          if (res.data.success) {
            // Prevent routing to self
            setUsers(res.data.data.filter(u => parseInt(u.id) !== parseInt(currentUser.id)));
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [formData.department_id, currentUser.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.to_user_id || !formData.instruction_type_id) {
      Swal.fire("Required", "Please select a recipient and instruction.", "warning");
      return;
    }

    setIsProcessing(true);

    // Normalize Document ID (handles both Documents and Transactions view)
    const targetDocId = document.document_id || document.id;

    // 1. Transaction Log (Audit Trail)
    const transFd = new FormData();
    transFd.append("tag", "insert");
    transFd.append("document_id", targetDocId);
    transFd.append("from_user_id", currentUser.id);
    transFd.append("from_department_id", currentUser.department_id);
    transFd.append("to_user_id", formData.to_user_id);
    transFd.append("to_department_id", formData.department_id);
    transFd.append("instruction_type_id", formData.instruction_type_id);
    transFd.append("remarks", formData.remarks);
    transFd.append("due_date", formData.due_date);
    transFd.append("transaction_status", "Pending");

    // 2. Document Master Update (Global Status)
    const docUpdateFd = new FormData();
    docUpdateFd.append("tag", "update_status");
    docUpdateFd.append("id", targetDocId);
    docUpdateFd.append("document_status", 2); // '2' usually denotes 'Routed' or 'In Progress'

    try {
      const [transRes, docRes] = await Promise.all([
        axios.post(`${API_URL}/document_transaction.php`, transFd),
        axios.post(`${API_URL}/document.php`, docUpdateFd),
      ]);

      if (transRes.data.success && docRes.data.success) {
        Swal.fire("Routed!", "Document assigned and status updated.", "success");
        onSuccess();
        onClose();
      } else {
        Swal.fire("Error", "One or more updates failed. Check database logs.", "error");
      }
    } catch (error) {
      console.error("Routing error:", error);
      Swal.fire("Error", "Connection failed.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content medium-modal animate-slide-up">
        <div className="modal-header">
          <div className="header-icon-container">
            <FiSend className="header-icon" />
          </div>
          <div className="header-text">
            <h3>Route Document</h3>
            <p>Assign this document to a user or department</p>
          </div>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="doc-preview-banner">
          <FiInfo />
          <span>Routing: <strong>{document?.document_no || "N/A"}</strong> - {document?.title}</span>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group flex-1">
              <label><FiBriefcase /> Target Department</label>
              <select
                className="form-input-styled"
                required
                value={formData.department_id}
                onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value, to_user_id: "" }))}
              >
                <option value="">Select Department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label><FiUser /> Target User</label>
              <select
                className="form-input-styled"
                required
                disabled={!formData.department_id || isLoadingUsers}
                value={formData.to_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, to_user_id: e.target.value }))}
              >
                <option value="">{isLoadingUsers ? "Loading..." : "Select User..."}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.fullname}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label><FiInfo /> Instruction Type</label>
              <select
                className="form-input-styled"
                required
                value={formData.instruction_type_id}
                onChange={(e) => setFormData(prev => ({ ...prev, instruction_type_id: e.target.value }))}
              >
                <option value="">Select Instruction...</option>
                {instructions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.instruction_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label><FiCalendar /> Deadline / Due Date</label>
              <input
                type="date"
                className="form-input-styled"
                required
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label>Remarks / Special Instructions</label>
              <textarea
                className="form-input-styled textarea-fixed"
                placeholder="Enter notes for the recipient..."
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </div>

          <div className="modal-actions-horizontal balanced-actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isProcessing}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={isProcessing || isLoadingUsers}>
              {isProcessing ? <><span className="spinner"></span> Routing...</> : <><FiSend style={{ marginRight: "8px" }} /> Confirm Route</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}