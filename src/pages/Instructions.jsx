import React, { useState, useEffect, useCallback } from "react";
import {
    FiPlus, FiSettings, FiActivity, FiTrash2,
    FiEdit2, FiChevronRight, FiCheckSquare,
    FiSquare, FiCheckCircle, FiInfo
} from "react-icons/fi";
import Swal from "sweetalert2";
import Select from 'react-select';
import { API_URL } from "../shared/constants";
import CreateActionModal from "../modals/CreateActionModal";
import InstructionFormModal from "../modals/InstructionFormModal";
import "../styles/instructions.css";
import "../styles/actionsmanager.css";

export default function Instructions() {
    const [instructionTypes, setInstructionTypes] = useState([]);
    const [docStatuses, setDocStatuses] = useState([]);
    const [availableActions, setAvailableActions] = useState([]);
    const [instructionMap, setInstructionMap] = useState([]);
    const [documentPermissions, setDocumentPermissions] = useState([]);
    const [selectedInstId, setSelectedInstId] = useState(null);
    const [selectedCurrentDocStatus, setSelectedCurrentDocStatus] = useState(null);
    const [selectedNextDocStatus, setSelectedNextDocStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('routing');

    // Modals State
    const [showActionModal, setShowActionModal] = useState(false);
    const [showInstModal, setShowInstModal] = useState(false);
    const [selectedInst, setSelectedInst] = useState(null);
    const [actionFormData, setActionFormData] = useState({
        action_name: '',
        action_result: 'Proceed',
        outcome: '',
        description: ''
    });

    const callApi = async (url, formData) => {
        try {
            const response = await fetch(url, { method: "POST", body: formData });
            return await response.json();
        } catch (error) {
            return { success: 0, message: "Network error" };
        }
    };

    const fetchData = useCallback(async () => {
        const instFd = new FormData(); instFd.append("tag", "getall");
        const actFd = new FormData(); actFd.append("tag", "getall");
        const statFd = new FormData(); statFd.append("tag", "getall");
        const mapFd = new FormData(); mapFd.append("tag", "get_all_mappings");
        const permFd = new FormData(); permFd.append("tag", "getpermissions");

        const [instRes, actRes, docStatusRes, mapRes, permRes] = await Promise.all([
            callApi(`${API_URL}/instructiontypes.php`, instFd),
            callApi(`${API_URL}/actions.php`, actFd),
            callApi(`${API_URL}/docstatus.php`, statFd),
            callApi(`${API_URL}/instructionmap.php`, mapFd),
            callApi(`${API_URL}/rolepermission.php`, permFd)
        ]);

        if (instRes.success) setInstructionTypes(instRes.data);
        if (docStatusRes.success) setDocStatuses(docStatusRes.data);
        if (actRes.success) setAvailableActions(actRes.data);
        if (mapRes.success) setInstructionMap(mapRes.data);
        if (permRes.success) setDocumentPermissions(permRes.data);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const currentInstruction = instructionTypes.find(i => i.id === selectedInstId);

    // --- Instruction Management Logic ---
    const handleEditInstruction = (inst) => {
        setSelectedInst(inst);
        setShowInstModal(true);
    };

    const handleDeleteInstruction = async (id, e) => {
        e.stopPropagation();
        const result = await Swal.fire({
            title: 'Delete Instruction?',
            text: "This will remove all associated action mappings.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#820d0d',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "delete");
            fd.append("id", id);
            const res = await callApi(`${API_URL}/instructiontypes.php`, fd);
            if (res.success) {
                if (selectedInstId === id) setSelectedInstId(null);
                fetchData();
            }
        }
    };

    // --- Action & Mapping Logic ---
    const handleCreateAction = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        Object.keys(actionFormData).forEach(key => fd.append(key, actionFormData[key]));
        fd.append("tag", "insert");

        const res = await callApi(`${API_URL}/actions.php`, fd);
        if (res.success) {
            setShowActionModal(false);
            setActionFormData({ action_name: '', action_result: 'Proceed', outcome: '', description: '' });
            fetchData();
        }
    };

    const handleDeleteAction = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Global Action?',
            text: "This will remove this action from ALL instructions.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#820d0d'
        });

        if (result.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "delete");
            fd.append("id", id);
            const res = await callApi(`${API_URL}/actions.php`, fd);
            if (res.success) fetchData();
        }
    };

    const statusOptions = docStatuses.map(s => ({ value: s.id, label: s.status_name }));
    const instructionOptions = instructionTypes.map(i => ({ value: i.id, label: "GO TO: " + i.instruction_name }));

    // Add a "Clear/None" option for next steps
    const nextStepOptions = [
        { value: "", label: "Process Done" },
        ...instructionOptions
    ];

    const toggleMapping = async (actionId, nextInstId = null, nextDocStatusId = null) => {
        // 1. Identify the search context: 
        // If we are changing the current status via dropdown, we need to find the record 
        // that EXISTS before the change. 
        // Otherwise, we use the currently selected global status.
        const searchStatus = selectedCurrentDocStatus || docStatuses[0]?.id;

        if (!selectedInstId) {
            Swal.fire("Note", "Please select an Instruction type from the sidebar first.", "info");
            return;
        }

        // 2. Find the existing record BEFORE we apply new changes
        const mapping = instructionMap.find(m => {
            const matchInst = String(m.instruction_type_id) === String(selectedInstId);
            const matchAction = String(m.action_id) === String(action.id);

            // Check if the status matches OR if both are effectively empty/null
            const currentStatus = m.current_document_status_id;
            const matchStatus = (!currentStatus && !selectedCurrentDocStatus) ||
                String(currentStatus) === String(selectedCurrentDocStatus) ||
                (currentStatus === null && selectedCurrentDocStatus === docStatuses[0]?.id);

            return matchInst && matchAction && matchStatus;
        });

        const fd = new FormData();

        if (mapping) {
            // If we found a record, check if we are updating it or deleting it
            const isUpdate = nextInstId !== null || nextDocStatusId !== null;

            if (isUpdate) {
                fd.append("tag", "update");
                fd.append("id", mapping.id);
                // Use the NEW status if provided, otherwise keep the old one
                fd.append("next_instruction_id", nextInstId !== null ? nextInstId : (mapping.next_instruction_id || ""));
                fd.append("next_status_id", nextDocStatusId !== null ? nextDocStatusId : (mapping.next_document_status_id || ""));
            } else {
                // No dropdowns changed? This is a toggle-off click (Delete)
                fd.append("tag", "delete");
                fd.append("instruction_type_id", selectedInstId);
                fd.append("action_id", actionId);
            }
        } else {
            // No existing mapping found? This is a first-time activation (Insert)
            const insertStatus = selectedCurrentDocStatus || docStatuses[0]?.id;

            fd.append("tag", "insert");
            fd.append("instruction_type_id", selectedInstId);
            fd.append("action_id", actionId);
            fd.append("next_status_id", insertStatus);
            fd.append("next_instruction_id", nextInstId || "");
        }

        try {
            const response = await fetch(`${API_URL}/instructionmap.php`, {
                method: "POST",
                body: fd
            });
            const res = await response.json();

            if (res.success) {
                await fetchData();
            } else {
                Swal.fire("Error", res.message || "Failed to process request", "error");
            }
        } catch (error) {
            console.error("Mapping Error:", error);
        }
    };

    return (
        <div className="instructions-container">
            <h1 className="page-title">Instruction Routing Config</h1>
            <div className="tab-switcher">
                <button className={`tab-btn ${activeTab === 'routing' ? 'active' : ''}`} onClick={() => setActiveTab('routing')}>
                    Workflow Routing
                </button>
                <button className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>
                    Manage Global Actions
                </button>
            </div>

            {activeTab === 'routing' ? (
                <div className="routing-grid">
                    {/* Left Panel: List */}
                    <div className="instruction-sidebar">
                        <div className="panel-header">
                            <h3>Instructions</h3>
                            <button className="icon-btn" onClick={() => { setSelectedInst(null); setShowInstModal(true); }}>
                                <FiPlus />
                            </button>
                        </div>
                        <div className="instruction-list">
                            {instructionTypes.map(type => (
                                <div
                                    key={type.id}
                                    className={`instruction-item ${selectedInstId === type.id ? 'active' : ''}`}
                                    onClick={() => setSelectedInstId(type.id)}
                                >
                                    <div className="inst-details">
                                        <span className="inst-name">{type.instruction_name}</span>
                                        <span className="inst-desc">{type.description}</span>
                                    </div>
                                    <FiChevronRight className="chevron-icon" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Configuration */}
                    <div className="mapping-panel">
                        {selectedInstId ? (
                            <div className="table-card">
                                <div className="panel-header">
                                    <div className="header-details">
                                        <h3>Configuring: {currentInstruction?.instruction_name}</h3>
                                        <p className="text-muted">{currentInstruction?.description}</p>
                                    </div>
                                    <div className="header-management-actions">
                                        <button className="secondary-btn" onClick={() => handleEditInstruction(currentInstruction)}>
                                            <FiEdit2 /> Edit
                                        </button>
                                        <button className="icon-btn delete" onClick={(e) => handleDeleteInstruction(currentInstruction.id, e)}>
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>

                                <div className="mapping-section-label">Available Action Links</div>

                                <div className="actions-grid">
                                    {availableActions.map(action => {
                                        const activeStatusContext = selectedCurrentDocStatus || docStatuses[0]?.id;

                                        const mapping = instructionMap.find(m => {
                                            const matchInst = String(m.instruction_type_id) === String(selectedInstId);
                                            const matchAction = String(m.action_id) === String(action.id);

                                            // Check if the status matches OR if both are effectively empty/null
                                            const currentStatus = m.current_document_status_id;
                                            const matchStatus = (!currentStatus && !selectedCurrentDocStatus) ||
                                                String(currentStatus) === String(selectedCurrentDocStatus) ||
                                                (currentStatus === null && selectedCurrentDocStatus === docStatuses[0]?.id);

                                            return matchInst && matchAction && matchStatus;
                                        });

                                        const isMapped = !!mapping;
                                        return (
                                            <div key={action.id} className={`action-selector-card ${isMapped ? 'selected' : ''}`}>
                                                <div className="card-main-info"
                                                    onClick={() => toggleMapping(
                                                        action.id,                 // actionId
                                                        null,                      // nextInstId
                                                        null                       // nextDocStatusId
                                                    )}>
                                                    {isMapped ? <FiCheckSquare className="check-icon" /> : <FiSquare className="check-icon" />}
                                                    <div className="card-info">
                                                        <span className="action-label">{action.action_name}</span>
                                                        <span className={`status-pill ${action.action_result?.toLowerCase()}`}>
                                                            {action.action_result}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isMapped && (
                                                    <>
                                                        <div className="next-step-config">
                                                            <label>Next Step</label>
                                                            <Select
                                                                className="react-select-container"
                                                                classNamePrefix="react-select"
                                                                placeholder="Next Step..."
                                                                // Ensure you are using nextStepOptions which contains the "End Process" object
                                                                options={nextStepOptions}
                                                                // Logic: Find the match, OR find the "End Process" option (value: ""), OR default to null
                                                                value={
                                                                    nextStepOptions.find(opt => String(opt.value) === String(mapping?.next_instruction_id)) ||
                                                                    nextStepOptions.find(opt => opt.value === "") ||
                                                                    null
                                                                }
                                                                onChange={(selected) => toggleMapping(action.id, selected ? selected.value : "", null, null)}
                                                                isClearable
                                                            />
                                                        </div>
                                                        <div className="next-step-config">
                                                            <label>Next Document Status</label>
                                                            <Select
                                                                className="react-select-container"
                                                                classNamePrefix="react-select"
                                                                placeholder="Next Status..."
                                                                options={statusOptions}
                                                                value={statusOptions.find(opt => String(opt.value) === String(mapping?.next_document_status_id)) || null}
                                                                onChange={(selected) => toggleMapping(action.id, null, null, selected ? selected.value : "")}
                                                                isClearable
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <FiInfo size={40} />
                                <p>Select an instruction from the left to manage its workflow and actions.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Actions Management Tab */
                <div className="actions-tab-content">
                    <div className="table-card">
                        <div className="table-toolbar">
                            <h3>Global Action Registry</h3>
                            <button className="primary-btn" onClick={() => setShowActionModal(true)}>
                                <FiPlus /> Create New Action
                            </button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Action Name</th>
                                    <th>Behavior</th>
                                    <th>Description</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableActions.map(action => (
                                    <tr key={action.id}>
                                        <td className="fw-bold">{action.action_name}</td>
                                        <td>
                                            <span className={`status-pill ${action.action_result?.toLowerCase()}`}>
                                                {action.action_result}
                                            </span>
                                        </td>
                                        <td className="text-muted">{action.description}</td>
                                        <td className="text-end">
                                            <button className="icon-btn delete" onClick={() => handleDeleteAction(action.id)}>
                                                <FiTrash2 />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <InstructionFormModal
                show={showInstModal}
                onClose={() => setShowInstModal(false)}
                instruction={selectedInst}
                permissions={documentPermissions}
                onSuccess={fetchData}
            />

            <CreateActionModal
                show={showActionModal}
                onClose={() => setShowActionModal(false)}
                formData={actionFormData}
                setFormData={setActionFormData}
                onSubmit={handleCreateAction}
            />
        </div>
    );
}