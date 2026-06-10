import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { API_URL } from '../shared/constants';
import Swal from 'sweetalert2';

export default function InstructionFormModal({ show, onClose, instruction, permissions, onSuccess }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [selectedPermission, setSelectedPermission] = useState('');

    useEffect(() => {
        if (instruction) {
            setName(instruction.instruction_name || '');
            setDesc(instruction.description || '');
            // Handle "0" or falsy permission IDs gracefully by falling back to empty string
            setSelectedPermission(instruction.permission_id == "0" ? "" : instruction.permission_id);
        } else {
            setName('');
            setDesc('');
            setSelectedPermission('');
        }
    }, [instruction, show]);

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append("tag", instruction ? "update" : "insert");
        if (instruction) fd.append("id", instruction.id);
        fd.append("instruction_name", name);
        fd.append("description", desc);
        fd.append("permission_id", selectedPermission); // Added this so it actually updates on the backend!

        const response = await fetch(`${API_URL}/instructiontypes.php`, { method: "POST", body: fd });
        const res = await response.json();

        if (res.success) {
            Swal.fire({ icon: 'success', title: 'Saved!', timer: 1000, showConfirmButton: false });
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="category-modal">
                <div className="modal-header">
                    <h2>{instruction ? 'Edit Instruction' : 'New Instruction'}</h2>
                    <button className="modal-close-btn" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit} className="category-form">
                    <div className="form-group">
                        <label>Instruction Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Document Permission</label>
                        <select
                            className="form-input-styled"
                            required
                            value={selectedPermission} // Changed from instruction.permission_id to state
                            onChange={(e) => setSelectedPermission(e.target.value)}
                        >
                            <option value="" disabled>Select Instruction...</option>
                            {permissions
                                .filter(i =>
                                    i.permission_name.startsWith("Documents.") &&
                                    !["Documents.View", "Documents.Create"].includes(i.permission_name)
                                )
                                .map(i => (
                                    <option key={i.id} value={i.id}>
                                        {i.permission_name.replace("Documents.", "")}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}