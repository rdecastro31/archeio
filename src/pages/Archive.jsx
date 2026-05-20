import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FiFile, FiFolder, FiChevronRight, FiGrid, FiList,
    FiSearch, FiMoreVertical, FiTrash2, FiRefreshCw,
    FiArrowLeft, FiClock, FiDownload, FiUser
} from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import { useOutletContext, useNavigate } from "react-router-dom";

import "../styles/storage.css";
import ContextMenu from './../components/ContextMenu';
import FileViewerModal from "../modals/ViewFileModal";

export default function Archive() {
    const { user } = useOutletContext();
    const USER_ID = user?.id;
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");

    // Viewer State
    const [viewFile, setViewFile] = useState(null);
    const [showViewer, setShowViewer] = useState(false);

    const [contextMenu, setContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        targetItem: null
    });

    const callApi = async (formData) => {
        try {
            const response = await fetch(`${API_URL}/filestorage.php`, {
                method: "POST",
                body: formData,
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: 0, msg: "Connection failed" };
        }
    };

    const fetchArchive = useCallback(async () => {
        setLoading(true);
        const fd = new FormData();
        fd.append("tag", "listItems");
        fd.append("userid", USER_ID);
        fd.append("path", "Archive"); // Specifically lock to Archive folder

        const data = await callApi(fd);
        if (data.success) {
            setItems(data.items);
        }
        setLoading(false);
    }, [USER_ID]);

    useEffect(() => {
        if (USER_ID) fetchArchive();
    }, [fetchArchive, USER_ID]);

    const handleRestore = async (item) => {
        const res = await Swal.fire({
            title: `Restore ${item.name}?`,
            text: "This will move the item back to your main storage.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, restore it',
            confirmButtonColor: '#820d0d'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "restoreItem");
            fd.append("userid", USER_ID);
            fd.append("itemname", item.name);
            fd.append("targetPath", ""); // Restores to root

            const data = await callApi(fd);
            if (data.success) {
                fetchArchive();
                Swal.fire('Restored!', 'Item is back in your main files.', 'success');
            } else {
                Swal.fire('Error', data.msg || 'Failed to restore', 'error');
            }
        }
    };

    const handlePermanentDelete = async (item) => {
        const res = await Swal.fire({
            title: 'Delete Permanently?',
            text: `Are you sure you want to delete ${item.name}? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "deleteItem");
            fd.append("userid", USER_ID);
            fd.append("path", "Archive");
            fd.append("itemname", item.name);

            const data = await callApi(fd);
            if (data.success) {
                fetchArchive();
                Swal.fire('Deleted', 'Item removed permanently.', 'success');
            }
        }
    };

    const handleContextMenu = (e, item, isButtonClick = false) => {
        e.preventDefault();
        e.stopPropagation();
        let x, y;
        if (isButtonClick) {
            const rect = e.currentTarget.getBoundingClientRect();
            x = rect.right - 185;
            y = rect.bottom + 8;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        setContextMenu({ show: true, x, y, targetItem: item });
    };

    const closeContextMenu = useCallback(() => {
        if (contextMenu.show) setContextMenu(prev => ({ ...prev, show: false }));
    }, [contextMenu.show]);

    useEffect(() => {
        window.addEventListener("click", closeContextMenu);
        return () => window.removeEventListener("click", closeContextMenu);
    }, [closeContextMenu]);

    const menuOptions = useMemo(() => {
        const item = contextMenu.targetItem;
        if (!item) return [];

        return [
            {
                label: "Restore",
                icon: <FiRefreshCw />,
                onClick: () => handleRestore(item)
            },
            {
                label: "View Info",
                icon: <FiSearch />,
                onClick: () => {
                    setViewFile({ ...item, user: USER_ID, path: "Archive" });
                    setShowViewer(true);
                }
            },
            { divider: true },
            {
                label: "Delete Permanently",
                icon: <FiTrash2 className="text-danger" />,
                className: "text-danger",
                onClick: () => handlePermanentDelete(item)
            }
        ];
    }, [contextMenu.targetItem]);

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="storage-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Archive</h1>
                </div>
            </div>

            <div className="table-card">
                <div className="table-toolbar">
                    <div className="search-box">
                        <FiSearch className="search-icon-main" />
                        <input
                            type="text"
                            placeholder="Search archived files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="view-switcher">
                        <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><FiList /></button>
                        <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><FiGrid /></button>
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="empty-state-container">
                        <div className="empty-state-content">
                            <div className="empty-icon-circle"><FiTrash2 size={32} /></div>
                            <h3>Archive is empty</h3>
                            <p>Items you archive will appear here.</p>
                        </div>
                    </div>
                ) : (
                    viewMode === 'list' ? (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(item => (
                                        <tr key={item.id} onContextMenu={(e) => handleContextMenu(e, item)}>
                                            <td className="fw-semibold">
                                                <div className="d-flex align-items-center gap-2">
                                                    {item.type === 'folder' ? <FiFolder className="primary-text" /> : <FiFile />}
                                                    <span>{item.name}</span>
                                                </div>
                                            </td>
                                            <td>{item.type}</td>
                                            <td className="d-flex justify-content-end">
                                                <button className="icon-btn" onClick={(e) => handleContextMenu(e, item, true)}><FiMoreVertical /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="file-grid">
                            {filteredItems.map((item) => (
                                <div key={item.id} className="drive-preview-card" onContextMenu={(e) => handleContextMenu(e, item)}>
                                    <div className="preview-card-header">
                                        <div className="header-left">
                                            {item.type === 'folder' ? <FiFolder className="primary-text" size={18} /> : <FiFile size={18} />}
                                            <span className="file-name-text">{item.name}</span>
                                        </div>
                                        <button className="icon-btn-tiny" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item, true); }}><FiMoreVertical /></button>
                                    </div>
                                    <div className="preview-card-body">
                                        <div className="preview-placeholder">
                                            {item.type === 'folder' ? <FiFolder size={40} /> : <FiFile size={40} />}
                                        </div>
                                    </div>
                                    <div className="preview-card-footer">
                                        <div className="user-avatar-small"><FiUser /></div>
                                        <span className="activity-text">Archived item</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                show={contextMenu.show}
                options={menuOptions}
                onClose={closeContextMenu}
            />
            <FileViewerModal show={showViewer} onClose={() => setShowViewer(false)} file={viewFile} />
        </div>
    );
}