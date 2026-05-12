import { useEffect, useMemo, useState } from "react"
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi"
import axios from "axios"
import Swal from "sweetalert2"

import "../styles/categories.css"
import AddDepartmentModal from "../modals/AddDepartmentModal"
import EditDepartmentModal from "../modals/EditDepartmentModal"
import { API_URL } from "../shared/constants"

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const [formData, setFormData] = useState({
    department_name: "",
    description: "",
    status: "Active",
  })

  useEffect(() => {
    getAllDepartments()
  }, [])

  const filteredDepartments = useMemo(() => {
    const keyword = String(searchTerm || "").toLowerCase()

    return departments.filter((department) => {
      const departmentName = String(department.department_name || "").toLowerCase()
      const description = String(department.description || "").toLowerCase()
      const status = String(department.status || "").toLowerCase()

      return (
        departmentName.includes(keyword) ||
        description.includes(keyword) ||
        status.includes(keyword)
      )
    })
  }, [departments, searchTerm])

  const resetForm = () => {
    setFormData({
      department_name: "",
      description: "",
      status: "Active",
    })
  }

  const getAllDepartments = async () => {
    try {
      setLoading(true)

      const fd = new FormData()
      fd.append("tag", "getall")

      const response = await axios.post(`${API_URL}/department.php`, fd)

      if (Number(response.data.success) === 1) {
        setDepartments(response.data.data || [])
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to load departments.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while loading departments.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const openAddModal = () => {
    resetForm()
    setSelectedId(null)
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    resetForm()
    setSelectedId(null)
    setShowAddModal(false)
  }

  const openEditModal = (department) => {
    setSelectedId(department.id)

    setFormData({
      department_name: department.department_name || "",
      description: department.description || "",
      status: department.status || "Active",
    })

    setShowEditModal(true)
  }

  const closeEditModal = () => {
    resetForm()
    setSelectedId(null)
    setShowEditModal(false)
  }

  const handleCreateDepartment = async (e) => {
    e.preventDefault()

    const departmentName = String(formData.department_name || "").trim()
    const description = String(formData.description || "").trim()
    const status = String(formData.status || "Active")

    if (!departmentName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Department Name",
        text: "Department name is required.",
      })
      return
    }

    try {
      const fd = new FormData()
      const user = JSON.parse(localStorage.getItem("user"));
      fd.append("tag", "insert")
      fd.append("department_name", departmentName)
      fd.append("description", description)
      fd.append("status", status)
      fd.append("userid", user.id)
      

      const response = await axios.post(`${API_URL}/department.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllDepartments()
        closeAddModal()

        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Department has been added successfully.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to create department.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while creating department.",
      })
    }
  }

  const handleUpdateDepartment = async (e) => {
    e.preventDefault()

    const departmentName = String(formData.department_name || "").trim()
    const description = String(formData.description || "").trim()
    const status = String(formData.status || "Active")

    if (!departmentName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Department Name",
        text: "Department name is required.",
      })
      return
    }

    if (!selectedId) {
      Swal.fire({
        icon: "warning",
        title: "No Department Selected",
        text: "Please select a department to update.",
      })
      return
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const fd = new FormData()
      fd.append("tag", "update")
      fd.append("id", selectedId)
      fd.append("userid", user.id)
      fd.append("department_name", departmentName)
      fd.append("description", description)
      fd.append("status", status)

      const response = await axios.post(`${API_URL}/department.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllDepartments()
        closeEditModal()

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Department has been updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to update department.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while updating department.",
      })
    }
  }

  const handleDeleteDepartment = async (id) => {
    const result = await Swal.fire({
      title: "Delete Department?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const fd = new FormData()
      fd.append("tag", "delete")
      fd.append("id", id)
      fd.append("userid", user.id)
      const response = await axios.post(`${API_URL}/department.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllDepartments()

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Department has been removed.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to delete department.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while deleting department.",
      })
    }
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">
            Manage departments responsible for document ownership and routing.
          </p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          <FiPlus />
          <span>Add Department</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="record-count">
            {filteredDepartments.length} record
            {filteredDepartments.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Department Name</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Loading departments...
                  </td>
                </tr>
              ) : filteredDepartments.length > 0 ? (
                filteredDepartments.map((department, index) => (
                  <tr key={department.id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">
                      {department.department_name || "-"}
                    </td>
                    <td>{department.description || "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${department.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                          }`}
                      >
                        {department.status || "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="icon-btn edit-btn"
                          onClick={() => openEditModal(department)}
                          title="Update"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          className="icon-btn delete-btn"
                          onClick={() => handleDeleteDepartment(department.id)}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No departments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddDepartmentModal
        show={showAddModal}
        isEditing={false}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleCreateDepartment}
        onClose={closeAddModal}
      />

      <EditDepartmentModal
        show={showEditModal}
        formData={formData}
        setFormData={setFormData}
        onClose={closeEditModal}
        onUpdate={handleUpdateDepartment}
      />
    </div>
  )
}