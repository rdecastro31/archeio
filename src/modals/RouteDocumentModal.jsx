import React, { useState, useEffect } from "react";
import Select from "react-select"; // Import react-select
import {
  FiX,
  FiSend,
  FiUser,
  FiInfo,
  FiCalendar,
} from "react-icons/fi";
import Swal from "sweetalert2";
import axios from "axios";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import "../styles/routedocumentmodal.css";

export default function RouteDocumentModal({ show, onClose, document, onSuccess }) {
  const { user: currentUser } = useOutletContext();

  const [users, setUsers] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [formData, setFormData] = useState({
    to_user_id: "",
    to_department_id: "",
    instruction_type_id: "",
    remarks: "",
    due_date: "",
  });

  const resetModal = () => {
    setFormData({
      to_user_id: "",
      to_department_id: "",
      instruction_type_id: "",
      remarks: "",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  };

  useEffect(() => {
    if (show) {
      resetModal();
      fetchInitialData();
    }
  }, [show]);

  const fetchInitialData = async () => {
    setLoadingData(true);
    try {
      const userFd = new FormData();
      userFd.append("tag", "getall");
      const instFd = new FormData();
      instFd.append("tag", "getall");

      const [userRes, instRes] = await Promise.all([
        axios.post(`${API_URL}/users.php`, userFd),
        axios.post(`${API_URL}/instructiontypes.php`, instFd),
      ]);

      if (userRes.data.success) {
        // Filter out current user
        const filteredUsers = userRes.data.data.filter(u => parseInt(u.id) !== parseInt(currentUser.id));
        setUsers(filteredUsers);
      }
      if (instRes.data.success) setInstructions(instRes.data.data);
    } catch (error) {
      console.error("Error fetching modal data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  // --- REACT-SELECT DATA TRANSFORMATION ---
  // 1. Group users by department
  const groupedData = users.reduce((acc, user) => {
    const deptName = user.department_name || "Unassigned";
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push({
      value: user.id,
      label: user.fullname,
      deptName: deptName, // Store department name here for searching
      deptId: user.department_id,
      job: user.job_title
    });
    return acc;
  }, {});

  // 2. Format for react-select: [{ label: 'Dept', options: [...] }]
  const selectOptions = Object.keys(groupedData).sort().map(dept => ({
    label: dept,
    options: groupedData[dept]
  }));

  const handleSelectChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      to_user_id: selectedOption ? selectedOption.value : "",
      to_department_id: selectedOption ? selectedOption.deptId : ""
    }));
  };

  // Custom styling for react-select to match your theme
  const customSelectStyles = {
    control: (base) => ({
      ...base,
      padding: '2px',
      borderRadius: '8px',
      borderColor: '#cbd5e1',
      '&:hover': { borderColor: '#820d0d' }
    }),
    groupHeading: (base) => ({
      ...base,
      color: '#820d0d',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      backgroundColor: '#f8fafc',
      padding: '5px 10px'
    })
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.to_user_id) {
      Swal.fire("Required", "Please select a recipient.", "warning");
      return;
    }

    setIsProcessing(true);
    const targetDocId = document.document_id || document.id;

    const transFd = new FormData();
    transFd.append("tag", "insert");
    transFd.append("document_id", targetDocId);
    transFd.append("from_user_id", currentUser.id);
    transFd.append("from_department_id", currentUser.department_id);
    transFd.append("to_user_id", formData.to_user_id);
    transFd.append("to_department_id", formData.to_department_id);
    transFd.append("instruction_type_id", formData.instruction_type_id);
    transFd.append("remarks", formData.remarks);
    transFd.append("due_date", formData.due_date);
    transFd.append("transaction_status", "Pending");

    const docUpdateFd = new FormData();
    docUpdateFd.append("tag", "update_status");
    docUpdateFd.append("id", targetDocId);
    docUpdateFd.append("document_status", 2);

    try {
      const [transRes, docRes] = await Promise.all([
        axios.post(`${API_URL}/document_transaction.php`, transFd),
        axios.post(`${API_URL}/document.php`, docUpdateFd),
      ]);

      if (transRes.data.success && docRes.data.success) {
        Swal.fire("Routed!", "Document assigned successfully.", "success");
        onSuccess();
        onClose();
      }
    } catch (error) {
      Swal.fire("Error", "A server error occurred.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content medium-modal animate-slide-up">
        <div className="modal-header">
          <div className="header-icon-container"><FiSend /></div>
          <div className="header-text">
            <h3>Route Document</h3>
            <p>Search and select the recipient</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="doc-preview-banner">
          <FiInfo />
          <span>Routing: <strong>{document?.document_no}</strong> - {document?.title}</span>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group full-width">
            <label><FiUser /> Recipient (Search by name or department)</label>
            <Select
              options={selectOptions}
              onChange={handleSelectChange}
              placeholder="Search by name or department..."
              isClearable
              isLoading={loadingData}
              styles={customSelectStyles}
              // This custom filter checks both the user name and the department name
              filterOption={(option, inputValue) => {
                const term = inputValue.toLowerCase();
                const nameMatch = option.data.label.toLowerCase().includes(term);
                const deptMatch = option.data.deptName.toLowerCase().includes(term);
                return nameMatch || deptMatch;
              }}
              formatOptionLabel={option => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>{option.label}</div>
                    <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{option.deptName}</small>
                  </div>
                  {option.job && <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{option.job}</small>}
                </div>
              )}
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label><FiInfo /> Instruction</label>
              <select
                className="form-input-styled"
                required
                value={formData.instruction_type_id}
                onChange={(e) => setFormData(p => ({ ...p, instruction_type_id: e.target.value }))}
              >
                <option value="">Select Instruction...</option>
                {instructions.map(i => <option key={i.id} value={i.id}>{i.instruction_name}</option>)}
              </select>
            </div>

            <div className="form-group flex-1">
              <label><FiCalendar /> Due Date</label>
              <input
                type="date"
                className="form-input-styled"
                required
                value={formData.due_date}
                onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Remarks</label>
            <textarea
              className="form-input-styled textarea-fixed"
              placeholder="Notes for the recipient..."
              value={formData.remarks}
              onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
            />
          </div>

          <div className="modal-actions-horizontal">
            <div className="d-flex justify-content-between">
              <button type="submit" className="primary-btn" disabled={isProcessing}>
                {isProcessing ? "Routing..." : "Confirm Route"}
              </button>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}