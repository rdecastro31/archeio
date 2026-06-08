import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FiShield, FiCheckCircle, FiSearch } from "react-icons/fi";
import { API_URL } from "../shared/constants";
import "../styles/roles.css";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");

  const endpoint = `${API_URL}/rolepermission.php`;

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const postData = async (formData) => {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    return await response.json();
  };

  const loadRoles = async () => {
    const formData = new FormData();
    formData.append("tag", "getroles");

    const res = await postData(formData);

    if (res.success === 1) {
      setRoles(res.data || []);

      if ((res.data || []).length > 0) {
        loadRolePermissions(res.data[0]);
      }
    }
  };

  const loadPermissions = async () => {
    const formData = new FormData();
    formData.append("tag", "getpermissions");

    const res = await postData(formData);

    if (res.success === 1) {
      setPermissions(res.data || []);
    }
  };

  const loadRolePermissions = async (role) => {
    setSelectedRole(role);
    setLoading(true);

    const formData = new FormData();
    formData.append("tag", "getrolepermissions");
    formData.append("role_id", role.id);

    const res = await postData(formData);

    if (res.success === 1) {
      setSelectedPermissions((res.data || []).map((item) => String(item.id)));
    } else {
      setSelectedPermissions([]);
    }

    setLoading(false);
  };

  const handlePermissionToggle = async (permission) => {
    if (!selectedRole) return;

    const permissionId = String(permission.id);
    const isAssigned = selectedPermissions.includes(permissionId);

    const formData = new FormData();
    formData.append("tag", isAssigned ? "removepermission" : "assignpermission");
    formData.append("role_id", selectedRole.id);
    formData.append("permission_id", permission.id);

    const res = await postData(formData);

    if (res.success === 1) {
      setSelectedPermissions((prev) =>
        isAssigned
          ? prev.filter((id) => id !== permissionId)
          : [...prev, permissionId]
      );
    } else {
      Swal.fire("Error", res.message || "Failed to update permission.", "error");
    }
  };

  const filteredPermissions = useMemo(() => {
    const keyword = permissionSearch.toLowerCase();

    return permissions.filter((permission) => {
      const name = permission.permission_name?.toLowerCase() || "";
      const description = permission.description?.toLowerCase() || "";

      return name.includes(keyword) || description.includes(keyword);
    });
  }, [permissions, permissionSearch]);

  const groupedPermissions = filteredPermissions.reduce((groups, permission) => {
    const groupName = permission.permission_name?.split(".")[0] || "Others";

    if (!groups[groupName]) groups[groupName] = [];

    groups[groupName].push(permission);
    return groups;
  }, {});

  return (
    <div className="roles-container">
      <div className="roles-title-row">
        <div>
          <h2>Roles & Permissions</h2>
          <p>Control which users can review, approve, receive, and acknowledge documents.</p>
        </div>
      </div>

      <div className="roles-main-card">
        <div className="roles-sidebar">
          <div className="roles-sidebar-header">
            <h5>System Roles</h5>
            <span>{roles.length}</span>
          </div>

          <div className="roles-list">
            {roles.length > 0 ? (
              roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-row ${selectedRole?.id === role.id ? "active" : ""}`}
                  onClick={() => loadRolePermissions(role)}
                >
                  <div className="role-icon">
                    <FiShield />
                  </div>

                  <div className="role-details">
                    <strong>{role.role_name}</strong>
                    <small>{role.description || "No description available"}</small>
                  </div>
                </button>
              ))
            ) : (
              <div className="roles-empty">No roles found.</div>
            )}
          </div>
        </div>

        <div className="permissions-panel">
          {selectedRole ? (
            <>
              <div className="permissions-topbar">
                <div>
                  <h4>{selectedRole.role_name}</h4>
                  <p>
                    {selectedPermissions.length} of {permissions.length} permissions enabled
                  </p>
                </div>

                <div className="permission-search">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="roles-empty large">Loading permissions...</div>
              ) : (
                <div className="permissions-content">
                  {Object.keys(groupedPermissions).length > 0 ? (
                    Object.keys(groupedPermissions).map((group) => (
                      <div className="permission-section" key={group}>
                        <div className="permission-section-title">
                          <span>{group}</span>
                        </div>

                        <div className="permission-list">
                          {groupedPermissions[group].map((permission) => {
                            const checked = selectedPermissions.includes(String(permission.id));

                            return (
                              <button
                                type="button"
                                key={permission.id}
                                className={`permission-row ${checked ? "enabled" : ""}`}
                                onClick={() => handlePermissionToggle(permission)}
                              >
                                <div className="permission-check">
                                  {checked && <FiCheckCircle />}
                                </div>

                                <div className="permission-text">
                                  <strong>{permission.permission_name}</strong>
                                  <small>{permission.description || "No description available"}</small>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="roles-empty large">No permissions found.</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="roles-empty large">Select a role to manage permissions.</div>
          )}
        </div>
      </div>
    </div>
  );
}