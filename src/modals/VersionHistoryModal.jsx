import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiDownload, FiClock, FiFileText } from 'react-icons/fi';
import '../styles/versionhistorymodal.css';
import { API_URL } from '../shared/constants';

export default function VersionHistoryModal({ show, onClose, file }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(null);

    const fetchVersionHistory = useCallback(async () => {
        if (!file) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("tag", "getFileHistory");
            fd.append("userid", file.user);
            fd.append("filename", file.name);
            fd.append("path", file.path || "");

            const response = await fetch(`${API_URL}/filestorage.php`, {
                method: "POST",
                body: fd,
            });
            const data = await response.json();

            if (data.success && data.history) {
                // Reverse the history array so the newest historical updates appear at the top
                setHistory([...data.history].reverse());
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error("Error fetching version tracking details:", error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [file]);

    useEffect(() => {
        if (show && file) {
            fetchVersionHistory();
            setSelectedVersion(null); // Default view to the live version
        }
    }, [show, file, fetchVersionHistory]);

    if (!show || !file) return null;

    const baseUrl = `${API_URL}/storage`;
    const userFolder = `user_${file.user || '1'}`;

    let subPath = "";
    if (file.path && file.path !== "/" && file.path !== "undefined") {
        subPath = file.path.endsWith("/") ? file.path : `${file.path}/`;
    }

    const activeFileName = selectedVersion ? selectedVersion.name : file.name;
    const activeFileUrl = `${baseUrl}/${userFolder}/${subPath}${activeFileName}`;

    return (
        <div className="modal-overlay">
            <div className="vh-modal-container">

                {/* Right Interactive Preview Board Frame */}
                <div className="vh-main-preview-area">
                    <div className="vh-preview-header">
                        <div className="vh-header-details">
                            <h2>
                                {activeFileName}
                                {selectedVersion && <span className="vh-history-badge">Archived Copy</span>}
                            </h2>
                            <p>Directory: {(!file.path || file.path === "/") ? "Root" : file.path}</p>
                        </div>
                        <div className="vh-header-actions">
                            <a href={activeFileUrl} download className="icon-btn" title="Download This Version">
                                <FiDownload />
                            </a>
                            <button className="modal-close-btn" onClick={onClose} title="Close History">
                                <FiX />
                            </button>
                        </div>
                    </div>

                    <div className="vh-preview-body">
                        {/* Left Sidebar Layout Frame (Latest -> Oldest Stack) */}
                        <div className="vh-left-sidebar">
                            <div className="vh-sidebar-scroll-area">
                                {/* Current/Live Version - Always pinned to top as the absolute latest state */}
                                <div
                                    className={`vh-version-card ${!selectedVersion ? 'active' : ''}`}
                                    onClick={() => setSelectedVersion(null)}
                                >
                                    <FiFileText className="vh-card-icon current" />
                                    <div className="vh-card-meta">
                                        <span className="vh-card-title">Current Version</span>
                                        <small className="vh-card-date">Active Live File</small>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="vh-loader-text">Loading archives...</div>
                                ) : history.length === 0 ? (
                                    <div className="vh-empty-state-text">No older versions found.</div>
                                ) : (
                                    history.map((version, index) => {
                                        // Dynamic badge configuration helper
                                        const isMostRecentHistory = index === 0;
                                        return (
                                            <div
                                                key={index}
                                                className={`vh-version-card ${selectedVersion?.name === version.name ? 'active' : ''}`}
                                                onClick={() => setSelectedVersion(version)}
                                            >
                                                <FiClock className="vh-card-icon" />
                                                <div className="vh-card-meta">
                                                    <span className="vh-card-title">
                                                        {version.name}
                                                        {isMostRecentHistory}
                                                    </span>
                                                    <small className="vh-card-date">{version.date}</small>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        <div>
                            {activeFileName?.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`${activeFileUrl}#toolbar=0`}
                                    width="100%"
                                    height="100%"
                                    title="Version Preview Canvas"
                                    style={{ border: 'none', borderRadius: '8px' }}
                                />
                            ) : (
                                <div className="vh-unsupported-placeholder">
                                    <p>Interactive preview rendering is limited to PDF files.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}