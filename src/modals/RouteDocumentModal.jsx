import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  FiX,
  FiSend,
  FiUser,
  FiInfo,
  FiPlus,
  FiTrash2
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

  // Tracks explicit step parameters
  const [steps, setSteps] = useState([
    { to_user_id: "", to_department_id: "", instruction_type_id: "", remarks: "" }
  ]);

  useEffect(() => {
    if (show) {
      setSteps([{ to_user_id: "", to_department_id: "", instruction_type_id: "", remarks: "" }]);
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
        // Exclude current sender from recipient dropdown selection options
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

  const addStep = () => {
    setSteps([...steps, { to_user_id: "", to_department_id: "", instruction_type_id: "", remarks: "" }]);
  };

  const removeStep = (index) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...steps];
    updatedSteps[index][field] = value;
    setSteps(updatedSteps);
  };

  // Group database users by their department names for clear layout structure
  const groupedData = users.reduce((acc, user) => {
    const deptName = user.department_name || "Unassigned";
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push({
      value: user.id,
      label: user.fullname,
      deptId: user.department_id, // Explicit numeric mapping parameter
      job: user.job_title
    });
    return acc;
  }, {});

  const selectOptions = Object.keys(groupedData).sort().map(dept => ({
    label: dept,
    options: groupedData[dept]
  }));

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

    // Verification check step loop
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].to_user_id || !steps[i].instruction_type_id) {
        Swal.fire("Required Fields", `Please finish filling out step #${i + 1}`, "warning");
        return;
      }
    }

    setIsProcessing(true);
    const targetDocId = document?.document_id || document?.id;
    const fallbackDueDate = document?.due_date || null;

    const firstStep = steps[0];

    // Helper lookup to extract destination department ID straight from our data options if missing
    const getVerifiedDeptId = (stepObj) => {
      if (stepObj.to_department_id && parseInt(stepObj.to_department_id) !== 1) {
        return stepObj.to_department_id;
      }
      const matchedUser = users.find(u => parseInt(u.id) === parseInt(stepObj.to_user_id));
      return matchedUser ? matchedUser.department_id : currentUser.department_id;
    };

    // Process remaining steps in chain array strings
    const remainingChain = steps.slice(1).map((step, idx) => {
      const stepFromUser = steps[idx].to_user_id;
      const matchedFromUser = users.find(u => parseInt(u.id) === parseInt(stepFromUser));
      const calculatedFromDept = matchedFromUser ? matchedFromUser.department_id : currentUser.department_id;

      return {
        to_user_id: step.to_user_id,
        to_department_id: getVerifiedDeptId(step),
        instruction_type_id: step.instruction_type_id,
        remarks: step.remarks,
        due_date: fallbackDueDate,
        from_user_id: stepFromUser,
        from_department_id: calculatedFromDept
      };
    });

    const remarksPayload = {
      user_remarks: firstStep.remarks,
      routing_chain: remainingChain
    };

    const firstStepDeptId = getVerifiedDeptId(firstStep);

    const transFd = new FormData();
    transFd.append("tag", "insert");
    transFd.append("document_id", targetDocId);
    transFd.append("from_user_id", currentUser.id);
    transFd.append("from_department_id", currentUser.department_id);
    transFd.append("to_user_id", firstStep.to_user_id);
    transFd.append("to_department_id", firstStepDeptId); // Pass verified department integer
    transFd.append("instruction_type_id", firstStep.instruction_type_id);
    transFd.append("remarks", JSON.stringify(remarksPayload));
    transFd.append("due_date", fallbackDueDate || "");
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
        Swal.fire("Routed!", `Document workflow initialized across ${steps.length} step(s).`, "success");
        onSuccess();
        onClose();
      } else {
        Swal.fire("Execution Error", transRes.data.message || "Database rejected transaction record creation.", "error");
      }
    } catch (error) {
      Swal.fire("Error", "A server error occurred during chain deployment.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content medium-modal animate-slide-up" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="modal-header">
          <div className="d-flex align-items-center gap-2">
            <FiSend className="modal-icon" />
            <h2 className="modal-title">Multi-Recipient Document Routing</h2>
          </div>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
            {steps.map((step, index) => {
              const currentSelection = selectOptions.flatMap(g => g.options).find(o => o.value === step.to_user_id) || null;

              return (
                <div key={index} style={{ borderBottom: '2px dashed #e2e8f0', marginBottom: '20px', paddingBottom: '15px' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{ fontWeight: 'bold', color: '#820d0d' }}>Step {index + 1} Recipient Route</span>
                    {steps.length > 1 && (
                      <button type="button" className="btn-link" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => removeStep(index)}>
                        <FiTrash2 /> Remove Step
                      </button>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-2">
                      <label><FiUser /> Recipient User</label>
                      <Select
                        options={selectOptions}
                        styles={customSelectStyles}
                        placeholder="Search employee or department..."
                        isClearable
                        value={currentSelection}
                        onChange={(sel) => {
                          console.log(sel)
                          handleStepChange(index, "to_user_id", sel ? sel.value : "");
                          handleStepChange(index, "to_department_id", sel ? sel.deptId : "");
                        }}
                      />
                    </div>

                    <div className="form-group flex-2">
                      <label><FiInfo /> Instruction Assignment</label>
                      <select
                        className="form-input-styled"
                        required
                        value={step.instruction_type_id}
                        onChange={(e) => handleStepChange(index, "instruction_type_id", e.target.value)}
                      >
                        <option value="">Select Instruction...</option>
                        {instructions.map(i => <option key={i.id} value={i.id}>{i.instruction_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group mt-2">
                    <label>Step Remarks / Directives</label>
                    <textarea
                      rows="2"
                      className="form-input-styled textarea-fixed"
                      placeholder={`Directives targeted specifically for step ${index + 1}...`}
                      value={step.remarks}
                      onChange={(e) => handleStepChange(index, "remarks", e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="d-flex justify-content-start mb-3">
            <button type="button" className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={addStep}>
              <FiPlus /> Add Next Routing Step
            </button>
          </div>

          <div className="modal-actions-horizontal">
            <div className="d-flex justify-content-between">
              <button type="submit" className="primary-btn" disabled={isProcessing}>
                {isProcessing ? "Processing Routing Chain..." : "Confirm & Deploy Route"}
              </button>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}