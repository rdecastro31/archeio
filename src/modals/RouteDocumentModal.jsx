import React, { useState, useEffect } from "react";
import {
  FiX,
  FiSend,
  FiUser,
  FiInfo,
  FiCalendar,
  FiBriefcase,
} from "react-icons/fi";
import Swal from "sweetalert2";
import axios from "axios";
import { API_URL } from "../shared/constants";
import { useOutletContext } from "react-router-dom";
import "../styles/documentformmodal.css";

export default function RouteDocumentModal({
  show,
  onClose,
  document,
  onSuccess,
}) {
  const { user: currentUser } = useOutletContext();

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [instructions, setInstructions] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    department_id: "",
    to_user_id: "",
    instruction_type_id: "",
    remarks: "",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  useEffect(() => {
    if (show) {
      resetModal();
      fetchInitialData();
    }
  }, [show]);

  const resetModal = () => {
    setUsers([]);

    setFormData((prev) => ({
      ...prev,
      department_id: "",
      to_user_id: "",
      remarks: "",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    }));
  };

  const fetchInitialData = async () => {
    const deptFd = new FormData();
    deptFd.append("tag", "getall");

    const insFd = new FormData();
    insFd.append("tag", "getall");

    try {
      const [deptRes, insRes] = await Promise.all([
        axios.post("https://archeio.layon.ph/api/department.php", deptFd),
        axios.post(`${API_URL}/instructiontypes.php`, insFd),
      ]);

      const deptData = deptRes.data;
      const insData = insRes.data;

      if (deptData.success === 1 || deptData.success === true) {
        setDepartments(deptData.data || []);
      } else {
        setDepartments([]);
      }

      if (insData.success === 1 || insData.success === true) {
        setInstructions(insData.data || []);

        if (insData.data?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            instruction_type_id: insData.data[0].id,
          }));
        }
      } else {
        setInstructions([]);
      }
    } catch (error) {
      console.error("Error loading modal data:", error);

      Swal.fire({
        title: "Error",
        text: "Unable to load departments or instruction types.",
        icon: "error",
        confirmButtonColor: "#820d0d",
      });
    }
  };

  const fetchUsersByDepartment = async (departmentId) => {
  if (!departmentId) {
    setUsers([]);
    return;
  }

  setIsLoadingUsers(true);
  setUsers([]);

  const fd = new FormData();
  fd.append("tag", "getbydept");
  fd.append("deptid", departmentId);

  try {
    const response = await axios.post(
      "https://archeio.layon.ph/api/users.php",
      fd
    );

    const data = response.data;

    console.log("GET USERS BY DEPARTMENT:", data);

    if (data.success === 1 || data.success === true) {
      setUsers(data.data || []);
    } else {
      setUsers([]);
    }
  } catch (error) {
    console.error("Error fetching users by department:", error);
    setUsers([]);
  } finally {
    setIsLoadingUsers(false);
  }
};

  const handleDepartmentChange = (departmentId) => {
    setFormData((prev) => ({
      ...prev,
      department_id: departmentId,
      to_user_id: "",
    }));

    fetchUsersByDepartment(departmentId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department_id || !formData.to_user_id) {
      Swal.fire({
        title: "Missing Required Fields",
        text: "Please select a department and recipient.",
        icon: "warning",
        confirmButtonColor: "#820d0d",
      });
      return;
    }

    setIsProcessing(true);

    const transFd = new FormData();
    transFd.append("tag", "insert");
    transFd.append("document_id", document.id);
    transFd.append("from_user_id", currentUser.id);
    transFd.append("from_department_id", currentUser.department_id);
    transFd.append("to_user_id", formData.to_user_id);
    transFd.append("to_department_id", formData.department_id);
    transFd.append("instruction_type_id", formData.instruction_type_id);
    transFd.append("remarks", formData.remarks);
    transFd.append("due_date", formData.due_date);

    const docUpdateFd = new FormData();
    docUpdateFd.append("tag", "update_status");
    docUpdateFd.append("id", document.id);
    docUpdateFd.append("document_status", "Pending");

    try {
      const [transRes, docRes] = await Promise.all([
        axios.post(`${API_URL}/document_transaction.php`, transFd),
        axios.post(`${API_URL}/document.php`, docUpdateFd),
      ]);

      const transData = transRes.data;
      const docData = docRes.data;

      if (
        (transData.success === 1 || transData.success === true) &&
        (docData.success === 1 || docData.success === true)
      ) {
        Swal.fire({
          title: "Success",
          text: "Document routed and status updated to Pending.",
          icon: "success",
          confirmButtonColor: "#820d0d",
        });

        onSuccess();
        onClose();
      } else {
        const errorMsg =
          transData.success !== 1 && transData.success !== true
            ? transData.message
            : docData.message;

        Swal.fire({
          title: "Error",
          text: errorMsg || "Routing failed.",
          icon: "error",
          confirmButtonColor: "#820d0d",
        });
      }
    } catch (error) {
      console.error("Routing error:", error);

      Swal.fire({
        title: "Error",
        text: "Network error occurred while routing the document.",
        icon: "error",
        confirmButtonColor: "#820d0d",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show || !document) return null;

  return (
    <div className="modal-overlay">
      <div className="doc-modal-card-horizontal">
        <div className="modal-header">
          <div className="header-text">
            <h2>Route Document</h2>
            <p>
              Forwarding: <strong>{document.document_no}</strong>
            </p>
          </div>

          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="doc-form-horizontal">
          <div className="form-grid-two">
            <div className="form-group">
              <label>
                <FiBriefcase /> Department
              </label>

              <select
                className="form-input-styled"
                required
                value={formData.department_id}
                onChange={(e) => handleDepartmentChange(e.target.value)}
              >
                <option value="">Select Department</option>

                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department_name || dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <FiUser /> Forward To
              </label>

              <select
                className="form-input-styled"
                required
                disabled={!formData.department_id || isLoadingUsers}
                value={formData.to_user_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    to_user_id: e.target.value,
                  }))
                }
              >
                <option value="">
                  {!formData.department_id
                    ? "Select department first"
                    : isLoadingUsers
                    ? "Loading recipients..."
                    : users.length === 0
                    ? "No active users found"
                    : "Select Recipient"}
                </option>

                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullname}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <FiInfo /> Purpose / Instruction
              </label>

              <select
                className="form-input-styled"
                required
                value={formData.instruction_type_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instruction_type_id: e.target.value,
                  }))
                }
              >
                {instructions.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.instruction_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <FiCalendar /> Deadline
              </label>

              <input
                type="date"
                className="form-input-styled"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label>Remarks / Special Instructions</label>

              <textarea
                className="form-input-styled textarea-fixed"
                placeholder="Enter details..."
                value={formData.remarks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="modal-actions-horizontal balanced-actions">
            <button
              type="button"
              className="secondary-btn cancel-route-btn"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-btn route-submit-btn"
              disabled={isProcessing || isLoadingUsers}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span> Routing...
                </>
              ) : (
                <>
                  <FiSend style={{ marginRight: "8px" }} /> Route Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}