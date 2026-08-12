import React, { useState, useRef, useEffect } from "react";
import {
    FiUser, FiLayout, FiBell, FiShield,
    FiUpload, FiSave, FiRefreshCcw, FiCheck, FiLock,
    FiSun, FiMoon
} from "react-icons/fi";
import Swal from "sweetalert2";
import "../styles/settings.css";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";

export default function Settings() {
    const { user } = useOutletContext();
    const [activeTab, setActiveTab] = useState("branding");
    const [logoFile, setLogoFile] = useState(null);
    const logoInputRef = useRef(null);

    // Branding & Theme State
    const [branding, setBranding] = useState({
        primaryColor: "#820d0d",
        appName: "ArcheIO",
        logoPreview: null,
        theme: "dark" // "light" or "dark"
    });

    useEffect(() => {
        // Fetch saved settings from API on component load
        const fetchSettings = async () => {
            try {
                const response = await fetch(`${API_URL}/settings.php`);
                const result = await response.json();
                if (result.success === 1 && result.data) {
                    setBranding(prev => ({
                        ...prev,
                        primaryColor: result.data.primary_color || "#d4af37",
                        appName: result.data.app_name || "ArcheIO",
                        logoPreview: result.data.logo_url ? `${API_URL}/${result.data.logo_url}` : null,
                        theme: result.data.theme || "dark"
                    }));
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };

        fetchSettings();
    }, []);

    const colors = [
        { name: "Classic Red", value: "#820d0d" },
        { name: "Luxury Gold", value: "#d4af37" },
        { name: "Ocean Blue", value: "#1a73e8" },
        { name: "Deep Teal", value: "#00695c" },
        { name: "Slate Grey", value: "#455a64" },
        { name: "Midnight", value: "#212121" }
    ];

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBranding(prev => ({ ...prev, logoPreview: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveLogoSettings = async () => {
        const formData = new FormData();
        formData.append("tag", "updateBranding");
        formData.append("primaryColor", branding.primaryColor);
        formData.append("appName", branding.appName);
        formData.append("theme", branding.theme);

        if (logoFile) {
            formData.append("logo", logoFile);
        }

        try {
            const response = await fetch(`${API_URL}/settings.php`, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success === 1) {
                // Apply theme immediately to document body/root element
                document.documentElement.setAttribute("data-theme", branding.theme);

                Swal.fire({
                    title: 'Updating System...',
                    timer: 1500,
                    didOpen: () => Swal.showLoading(),
                    willClose: () => {
                        Swal.fire("Success", result.message, "success");
                        window.location.reload();
                    }
                });
            } else {
                Swal.fire("Error", result.message || "Failed to update settings", "error");
            }
        } catch (err) {
            console.error("Save Error:", err);
            Swal.fire("Error", "Server connection failed.", "error");
        }
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                </div>
            </div>

            <div className="settings-container">
                {/* Sidebar Navigation */}
                <div className="settings-sidebar">
                    <button
                        className={`sidebar-item ${activeTab === 'branding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('branding')}
                    >
                        <FiLayout /> Branding & UI
                    </button>
                    <button
                        className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <FiUser /> Profile Account
                    </button>
                </div>

                {/* Content Area */}
                <div className="settings-content table-card">
                    {activeTab === 'branding' && (
                        <div className="settings-section">
                            <div className="section-header-simple">
                                <div>
                                    <h2 className="section-subtitle">Branding & Appearance</h2>
                                    <p className="text-muted">Customize how ArcheIO looks for your organization.</p>
                                </div>
                                <div className="action-buttons">
                                    <button className="secondary-btn">
                                        <FiRefreshCcw /><span>Reset to Default</span>
                                    </button>
                                    <button className="primary-btn" onClick={handleSaveLogoSettings}>
                                        <FiSave /><span>Save Changes</span>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-grid">
                                {/* Appearance Mode Selection */}
                                <div className="settings-group">
                                    <label>Theme Mode</label>
                                    <div className="theme-selector">
                                        <div
                                            className={`theme-card ${branding.theme === 'light' ? 'selected' : ''}`}
                                            onClick={() => setBranding(prev => ({ ...prev, theme: 'light' }))}
                                        >
                                            <div className="theme-card-icon">
                                                <FiSun size={24} />
                                            </div>
                                            <div className="theme-card-info">
                                                <span className="theme-title">Light Mode</span>
                                                <span className="theme-desc">Bright theme with high contrast</span>
                                            </div>
                                            {branding.theme === 'light' && <FiCheck className="theme-check" />}
                                        </div>

                                        <div
                                            className={`theme-card ${branding.theme === 'dark' ? 'selected' : ''}`}
                                            onClick={() => setBranding(prev => ({ ...prev, theme: 'dark' }))}
                                        >
                                            <div className="theme-card-icon">
                                                <FiMoon size={24} />
                                            </div>
                                            <div className="theme-card-info">
                                                <span className="theme-title">Dark Mode</span>
                                                <span className="theme-desc">Sleek, dark background layout</span>
                                            </div>
                                            {branding.theme === 'dark' && <FiCheck className="theme-check" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Logo Upload */}
                                <div className="settings-group">
                                    <label>Application Logo</label>
                                    <div className="logo-upload-area">
                                        <div className="logo-preview">
                                            {branding.logoPreview ? (
                                                <img src={branding.logoPreview} alt="Logo" />
                                            ) : (
                                                <div className="logo-placeholder">ArcheIO</div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            onChange={handleLogoChange}
                                            hidden
                                            accept="image/*"
                                        />
                                        <button
                                            className="secondary-btn"
                                            onClick={() => logoInputRef.current.click()}
                                        >
                                            <FiUpload /> Change Logo
                                        </button>
                                    </div>
                                </div>

                                {/* Color Scheme */}
                                <div className="settings-group">
                                    <label>Primary Theme Color</label>
                                    <div className="color-grid">
                                        {colors.map((color) => (
                                            <div
                                                key={color.value}
                                                className={`color-option ${branding.primaryColor === color.value ? 'selected' : ''}`}
                                                style={{ backgroundColor: color.value }}
                                                onClick={() => setBranding(prev => ({ ...prev, primaryColor: color.value }))}
                                                title={color.name}
                                            >
                                                {branding.primaryColor === color.value && <FiCheck color="#fff" />}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="custom-color-picker">
                                        <span>Custom Hex:</span>
                                        <input
                                            type="text"
                                            value={branding.primaryColor}
                                            onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <div className="section-header-simple">
                                <div>
                                    <h2 className="section-subtitle">Account Information</h2>
                                    <p className="text-muted">Update your Account Name and Email here.</p>
                                </div>
                            </div>
                            <div className="settings-grid">
                                <div className="settings-group">
                                    <label>Full Name</label>
                                    <input type="text" placeholder="Full Name" className="form-input" value={user?.fullname || ''} readOnly />
                                </div>
                                <div className="settings-group">
                                    <label>Email Address</label>
                                    <input type="email" placeholder="allan@example.com" className="form-input" value={user?.email || ''} readOnly />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}