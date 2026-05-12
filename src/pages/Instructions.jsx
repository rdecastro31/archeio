import React, { useState, useEffect, useCallback } from "react";
import {
    FiPlus, FiSettings, FiActivity, FiTrash2,
    FiEdit2, FiChevronRight, FiInfo,
    FiCheckSquare,
    FiSquare,
    FiPlay,
    FiXCircle,
    FiPauseCircle,
    FiCornerUpLeft,
    FiCheckCircle
} from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import CreateActionModal from "../modals/CreateActionModal";
import InstructionFormModal from "../modals/InstructionFormModal"; // New Modal
import "../styles/instructions.css";
import "../styles/actionsmanager.css";

export default function Instructions() {
    const [instructionTypes, setInstructionTypes] = useState([]);
    const [availableActions, setAvailableActions] = useState([]);
    const [instructionMap, setInstructionMap] = useState([]);
    const [selectedInstId, setSelectedInstId] = useState(null);
    const [activeTab, setActiveTab] = useState('routing');

    // Modals State
    const [showActionModal, setShowActionModal] = useState(false);
    const [showInstModal, setShowInstModal] = useState(false);
    const [selectedInst, setSelectedInst] = useState(null); // For Editing
    const [actionFormData, setActionFormData] = useState({
        action_name: '',
        action_result: 'Proceed', // Default to 'Proceed' instead of ''
        outcome: '',
        description: ''
    });

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
        const mapFd = new FormData(); mapFd.append("tag", "get_all_mappings");

        const [instRes, actRes, mapRes] = await Promise.all([
            callApi(`${API_URL}/instructiontypes.php`, instFd),
            callApi(`${API_URL}/actions.php`, actFd),
            callApi(`${API_URL}/instructionmap.php`, mapFd)
        ]);

        if (instRes.success) {
            setInstructionTypes(instRes.data);
            if (instRes.data.length > 0 && !selectedInstId) {
                setSelectedInstId(instRes.data[0].id);
            }
        }
        if (actRes.success) setAvailableActions(actRes.data);
        if (mapRes.success) setInstructionMap(mapRes.data);
    }, [selectedInstId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- INSTRUCTION CRUD ---
    const handleEditInstruction = (inst) => {
        setSelectedInst(inst);
        setShowInstModal(true);
    };

    const handleDeleteInstruction = async (id, e) => {
        e.stopPropagation(); // Prevent changing selection when clicking delete
        const result = await Swal.fire({
            title: 'Delete Instruction Type?',
            text: "This will remove all associated mappings.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#820d0d'
        });

        if (result.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "delete");
            fd.append("id", id);
            const res = await callApi(`${API_URL}/instructiontypes.php`, fd);
            if (res.success) fetchData();
        }
    };

    // --- ACTION HANDLES ---

    const handleCreateAction = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        Object.keys(actionFormData).forEach(key => fd.append(key, actionFormData[key]));
        fd.append("tag", "insert");

        const res = await callApi(`${API_URL}/actions.php`, fd);
        if (res.success) {
            setShowActionModal(false);
            setActionFormData({ action_name: '', action_result: '', outcome: '', description: '' });
            fetchData();
            Swal.fire({ icon: 'success', title: 'Action Created', timer: 1500, showConfirmButton: false });
        }
    };

    const handleDeleteAction = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Action?',
            text: "This may affect instructions currently mapped to this action.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#820d0d',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "delete");
            fd.append("id", id);

            const res = await callApi(`${API_URL}/actions.php`, fd);

            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'The action has been removed.',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchData(); // Refresh both actions and mappings
            } else {
                Swal.fire('Error', res.message || 'Failed to delete action', 'error');
            }
        }
    };

    // --- MAPPING LOGIC ---
    const toggleMapping = async (actionId, isMapped) => {
        const fd = new FormData();
        fd.append("tag", isMapped ? "delete" : "insert");
        fd.append("instruction_type_id", selectedInstId);
        fd.append("action_id", actionId);
        const res = await callApi(`${API_URL}/instructionmap.php`, fd);
        if (res.success) fetchData();
    };

    const currentInstruction = instructionTypes.find(i => i.id === selectedInstId);

    return (
        <div className="instructions-container">
            <div className="table-toolbar" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 className="page-title">Instruction Routing Config</h1>
                    <div className="tab-switcher">
                        <button className={`tab-btn ${activeTab === 'routing' ? 'active' : ''}`} onClick={() => setActiveTab('routing')}>
                            Routing Setup
                        </button>
                        <button className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>
                            Manage Actions
                        </button>
                    </div>
                </div>
                <div className="toolbar-actions">
                    {activeTab === 'routing' && (
                        <button className="secondary-btn" style={{ marginRight: '10px' }} onClick={() => { setSelectedInst(null); setShowInstModal(true); }}>
                            <FiPlus /> <span>New Instruction</span>
                        </button>
                    )}
                    {activeTab === 'actions' && (
                        <button className="primary-btn" onClick={() => setShowActionModal(true)}>
                            <FiPlus /> <span>New Action</span>
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'routing' ? (
                <div className="instruction-grid">
                    {/* Left Panel: Instruction List with Edit/Delete */}
                    <div className="table-card">
                        <div className="panel-header">
                            <FiSettings /> <span>Instruction Types</span>
                        </div>
                        <div className="instruction-list">
                            {instructionTypes.map(type => (
                                <div
                                    key={type.id}
                                    className={`d-flex justify-content-between align-items-center instruction-item ${selectedInstId === type.id ? 'active' : ''}`}
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

                    {/* Right Panel: Action Mapping */}
                    <div className="table-card">
                        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="header-details">
                                <h3 style={{ marginBottom: '4px' }}>
                                    Configuring: {currentInstruction?.instruction_name || 'Select Instruction'}
                                </h3>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    {currentInstruction?.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Management Controls moved here */}
                            {currentInstruction && (
                                <div className="header-management-actions">
                                    <button
                                        className="secondary-btn"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', marginRight: '8px' }}
                                        onClick={() => handleEditInstruction(currentInstruction)}
                                    >
                                        <FiEdit2 style={{ marginRight: '6px' }} /> Edit Details
                                    </button>
                                    <button
                                        className="icon-btn delete"
                                        title="Delete Instruction Type"
                                        onClick={(e) => handleDeleteInstruction(currentInstruction.id, e)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mapping-section-label" style={{ padding: '16px 20px 0', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Mapped Actions
                        </div>

                        <div className="actions-grid">
                            {availableActions.map(action => {
                                // Logic to check if this action is currently mapped to the selected instruction
                                const isMapped = instructionMap.some(m =>
                                    parseInt(m.instruction_type_id) === parseInt(selectedInstId) &&
                                    parseInt(m.action_id) === parseInt(action.id)
                                );

                                return (
                                    <div
                                        key={action.id}
                                        className={`action-selector-card ${isMapped ? 'selected' : ''}`}
                                        onClick={() => toggleMapping(action.id, isMapped)}
                                    >
                                        <div className="selection-indicator">
                                            {isMapped ? <FiCheckSquare /> : <FiSquare />}
                                        </div>
                                        <div className="card-info">
                                            <span className="action-label">{action.action_name}</span>
                                            <span className={`status-pill ${action.action_result?.toLowerCase()}`}>
                                                {action.action_result}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* SECTION 2: GLOBAL ACTION POOL MANAGEMENT */
                <div className="table-card">
                    <div className="panel-header">
                        <FiActivity /> <span>Global Action Management</span>
                    </div>
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Action Name</th>
                                    <th>Result Label</th>
                                    <th>Description</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableActions.map(action => (
                                    <tr key={action.id}>
                                        <td>
                                            <div className="action-info-cell">
                                                <div className="action-icon-box">{getActionIcon(action.action_result)}</div>
                                                <span style={{ fontWeight: 600 }}>{action.action_name}</span>
                                            </div>
                                        </td>
                                        <td>{action.action_result}</td>
                                        <td className="text-muted">{action.description}</td>
                                        <td className="d-flex justify-content-end">
                                            <button
                                                className="icon-btn delete"
                                                onClick={() => handleDeleteAction(action.id)}
                                            >
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

            {/* Modals */}
            <InstructionFormModal
                show={showInstModal}
                onClose={() => setShowInstModal(false)}
                instruction={selectedInst}
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