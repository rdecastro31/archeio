import React, { useState, useEffect, useCallback } from "react";
import { FiPlus, FiSettings, FiCheckSquare, FiSquare, FiInfo, FiTrash2, FiEdit2 } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import "../styles/instructions.css";

export default function Instructions() {
    const [instructionTypes, setInstructionTypes] = useState([]);
    const [availableActions, setAvailableActions] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);

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
        // Fetch Instruction Types
        const instFd = new FormData();
        instFd.append("tag", "getall");
        const instRes = await callApi(`${API_URL}/instructiontypes.php`, instFd);

        // Fetch Actions
        const actionFd = new FormData();
        actionFd.append("tag", "getall");
        const actionRes = await callApi(`${API_URL}/actions.php`, actionFd);

        if (instRes.success) setInstructionTypes(instRes.data);
        if (actionRes.success) setAvailableActions(actionRes.data);

        if (instRes.data?.length > 0 && !selectedId) {
            setSelectedId(instRes.data[0].id);
        }
        setLoading(false);
    }, [selectedId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddInstruction = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'New Instruction Type',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="Instruction Name">' +
                '<textarea id="swal-input2" class="swal2-textarea" placeholder="Description"></textarea>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#820d0d',
            preConfirm: () => [
                document.getElementById('swal-input1').value,
                document.getElementById('swal-input2').value
            ]
        });

        if (formValues && formValues[0]) {
            const fd = new FormData();
            fd.append("tag", "insert");
            fd.append("instruction_name", formValues[0]);
            fd.append("description", formValues[1]);
            const res = await callApi(`${API_URL}/instructiontypes.php`, fd);
            if (res.success) fetchData();
        }
    };

    const toggleActionMapping = async (actionId, isLinked) => {
        const fd = new FormData();
        // Note: Your InstructionMap.php currently only has 'insert'. 
        // You might need a 'delete' tag in your entry point later for unmapping.
        fd.append("tag", isLinked ? "delete_map" : "insert");
        fd.append("instruction_type_id", selectedId);
        fd.append("action_id", actionId);

        const res = await callApi(`${API_URL}/instructionmap.php`, fd);
        if (res.success) {
            fetchData(); // Refresh to update visual state
        }
    };

    const currentInstruction = instructionTypes.find(i => i.id === selectedId);

    return (
        <div className="instructions-container">
            <div className="table-toolbar">
                <div className="toolbar-left">
                    <h1 className="page-title">Instruction Routing</h1>
                    <p className="page-subtitle">Configure available actions per routing instruction</p>
                </div>
                <button className="primary-btn" onClick={handleAddInstruction}>
                    <FiPlus /> <span>Add Instruction Type</span>
                </button>
            </div>

            <div className="instruction-grid">
                {/* Panel 1: Instruction Types */}
                <div className="table-card list-panel">
                    <div className="panel-header">
                        <FiSettings /> <span>Instruction Types</span>
                    </div>
                    <div className="instruction-list">
                        {instructionTypes.map((type) => (
                            <div
                                key={type.id}
                                className={`instruction-item ${selectedId === type.id ? 'active' : ''}`}
                                onClick={() => setSelectedId(type.id)}
                            >
                                <div className="inst-content">
                                    <span className="inst-name">{type.instruction_name}</span>
                                    <span className="inst-desc">{type.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel 2: Dynamic Mapping */}
                <div className="table-card mapping-panel">
                    {currentInstruction ? (
                        <>
                            <div className="panel-header border-b">
                                <h3>Actions for: {currentInstruction.instruction_name}</h3>
                            </div>
                            <div className="actions-grid">
                                {availableActions.map(action => {
                                    // Logic to check if mapped (requires API to return mapped IDs)
                                    const isLinked = false; // Placeholder: compare with mapped data from API
                                    return (
                                        <div
                                            key={action.id}
                                            className={`action-selector-card ${isLinked ? 'linked' : ''}`}
                                            onClick={() => toggleActionMapping(action.id, isLinked)}
                                        >
                                            <div className="check-icon">
                                                {isLinked ? <FiCheckSquare color="#820d0d" /> : <FiSquare />}
                                            </div>
                                            <div className="action-info">
                                                <span className="action-label">{action.action_name}</span>
                                                <span className={`outcome-pill ${action.outcome.toLowerCase()}`}>
                                                    {action.outcome}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <FiInfo size={40} />
                            <p>Select an instruction type to manage its actions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}