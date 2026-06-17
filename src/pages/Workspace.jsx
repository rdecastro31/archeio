import React, { useState, useEffect, useCallback } from "react";
import { FiStar, FiFolder, FiFile, FiUser } from "react-icons/fi";
import Storage from "./Storage"; // Import the base component
import { API_URL } from "../shared/constants";

import '../styles/workspace.css'
import { useOutletContext } from "react-router-dom";

export default function Workspace() {
    const { user } = useOutletContext();
    const [suggestedItems, setSuggestedItems] = useState([]);
    const USER_ID = user?.id;

    const fetchSuggested = useCallback(async () => {
        const fd = new FormData();
        fd.append("tag", "getSuggested");
        fd.append("userid", USER_ID);
        try {
            const response = await fetch(`${API_URL}/filestorage.php`, {
                method: "POST",
                body: fd,
            });
            const data = await response.json();
            console.log(data);
            if (data.success) setSuggestedItems(data.items);
        } catch (error) {
            console.error("Error fetching suggested:", error);
        }
    }, []);

    useEffect(() => {
        fetchSuggested();
    }, [fetchSuggested]);

    return (
        <div className="workspace-container">
            {/* 1. Header (Common for both) */}
            <div className="page-header">
                <h1 className="page-title">My Drive</h1>
            </div>

            {/* 2. RECENTLY OPENED SECTION (Google Drive Style) */}
            {suggestedItems.length > 0 && (
                <div className="table-card suggested-wrapper mb-4">
                    <div className="card-header-simple">
                        <h5 className="section-subtitle">
                            <FiStar className="text-warning me-2" /> Recently Opened
                        </h5>
                    </div>
                    <div className="suggested-grid">
                        {suggestedItems.map((item, idx) => (
                            <div key={idx} className="suggested-card">
                                <div className="suggested-icon">
                                    {item.type === 'folder' ? <FiFolder className="primary-text" /> : <FiFile />}
                                </div>
                                <div className="suggested-info">
                                    <span className="suggested-name">{item.name}</span>
                                    <small className="text-muted">You opened recently</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. MAIN STORAGE COMPONENT (Imported) */}
            {/* We hide the header inside Storage because Workspace provides its own header */}
            <Storage hideHeader={true} isEmbedded={true} onFetchSuggested={fetchSuggested} />
        </div>
    );
}