import { useEffect, useMemo, useState } from "react"
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi"
import axios from "axios"
import Swal from "sweetalert2"

import "../styles/categories.css"
import { API_URL } from "../shared/constants"
import AddTypesModal from "../modals/AddTypesModal"
import EditTypesModal from "../modals/EditTypesModal"

export default function Types() {
  const [types, setTypes] = useState([])
  const [classifications, setClassifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)


  const [formData, setFormData] = useState({
    type_name: "",
    short_name: "",
    description: "",
    retention_period: "",
    retention_unit: "Year",
    classification_id: "",
  })

  useEffect(() => {
    getAllTypes()
    getAllClassifications()
  }, [])


  const handleEdit = (type) => {
    setSelectedId(type.id)

    setFormData({
      id: type.id,
      type_name: type.type_name || "",
      short_name: type.short_name || "",
      description: type.description || "",
      retention_period: type.retention_period || "",
      retention_unit: type.retention_unit || "Year",
      classification_id: type.classification_id || "",
      status: type.status || "Active",
    })

    setShowEditModal(true)
  }

  const handleUpdateType = async (e) => {
    e.preventDefault()

    try {
       const user = JSON.parse(localStorage.getItem("user"));
      const fd = new FormData()
      fd.append("tag", "update")
      fd.append("id", formData.id)
      fd.append("type_name", formData.type_name)
      fd.append("short_name", formData.short_name)
      fd.append("description", formData.description)
      fd.append("retention_period", formData.retention_period)
      fd.append("retention_unit", formData.retention_unit)
      fd.append("classification_id", formData.classification_id)
      fd.append("status", formData.status)
      fd.append("userid", user.id)

      const response = await axios.post(`${API_URL}/doctype.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllTypes()
        closeEditModal()

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Document type has been updated.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Update failed.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong.",
      })
    }
  }

  const closeEditModal = () => {
    setShowEditModal(false)
  }


  const getAllTypes = async () => {
    try {
      setLoading(true)

      const fd = new FormData()
      fd.append("tag", "getall")

      const response = await axios.post(`${API_URL}/doctype.php`, fd)

      if (Number(response.data.success) === 1) {
        setTypes(response.data.data || [])
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to load document types.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while loading document types.",
      })
    } finally {
      setLoading(false)
    }
  }

  const getAllClassifications = async () => {
    try {
      const fd = new FormData()
      fd.append("tag", "getall")

      const response = await axios.post(`${API_URL}/classification.php`, fd)

      if (Number(response.data.success) === 1) {
        setClassifications(response.data.data || [])
      }
    } catch (error) {
      console.error(error)
    }
  }

  const filteredTypes = useMemo(() => {
    const keyword = String(searchTerm || "").toLowerCase()

    return types.filter((type) => {
      return (
        String(type.type_name || "").toLowerCase().includes(keyword) ||
        String(type.short_name || "").toLowerCase().includes(keyword) ||
        String(type.classification_name || "").toLowerCase().includes(keyword) ||
        String(type.description || "").toLowerCase().includes(keyword) ||
        String(type.retention_period || "").toLowerCase().includes(keyword) ||
        String(type.retention_unit || "").toLowerCase().includes(keyword) ||
        String(type.status || "").toLowerCase().includes(keyword)
      )
    })
  }, [types, searchTerm])

  const resetForm = () => {
    setFormData({
      type_name: "",
      short_name: "",
      description: "",
      retention_period: "",
      retention_unit: "Year",
      classification_id: "",
    })
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    resetForm()
    setShowAddModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: name === "short_name" ? value.toUpperCase() : value,
    }))
  }

  const handleCreateType = async (e) => {
    e.preventDefault()

    const typeName = String(formData.type_name || "").trim()
    const shortName = String(formData.short_name || "").trim()
    const description = String(formData.description || "").trim()
    const retentionPeriod = String(formData.retention_period || "").trim()
    const retentionUnit = String(formData.retention_unit || "").trim()
    const classificationId = String(formData.classification_id || "").trim()

    if (!typeName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Type Name",
        text: "Type name is required.",
      })
      return
    }

    if (!shortName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Short Name",
        text: "Short name is required.",
      })
      return
    }

    if (!classificationId) {
      Swal.fire({
        icon: "warning",
        title: "Missing Classification",
        text: "Please select a classification.",
      })
      return
    }

    if (!retentionPeriod || !retentionUnit) {
      Swal.fire({
        icon: "warning",
        title: "Missing Retention",
        text: "Retention period and unit are required.",
      })
      return
    }

    try {
       const user = JSON.parse(localStorage.getItem("user"));
      const fd = new FormData()
      fd.append("tag", "insert")
      fd.append("type_name", typeName)
      fd.append("short_name", shortName)
      fd.append("description", description)
      fd.append("retention_period", retentionPeriod)
      fd.append("retention_unit", retentionUnit)
      fd.append("classification_id", classificationId)
      fd.append("userid", user.id)

      const response = await axios.post(`${API_URL}/doctype.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllTypes()
        closeAddModal()

        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Document type has been added successfully.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to create document type.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while creating document type.",
      })
    }
  }

  const handleDeleteType = async (id) => {
    const result = await Swal.fire({
      title: "Delete Document Type?",
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

      const response = await axios.post(`${API_URL}/doctype.php`, fd)

      if (Number(response.data.success) === 1) {
        setTypes((prev) => prev.filter((type) => type.id !== id))

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Document type has been removed.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to delete document type.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while deleting document type.",
      })
    }
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Types</h1>
          <p className="page-subtitle">
            Manage document types, retention periods, and linked classifications.
          </p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          <FiPlus />
          <span>Add New Type</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search document type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="record-count">
            {filteredTypes.length} record
            {filteredTypes.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type Name</th>
                <th>Short Name</th>
                <th>Classification</th>
                <th>Retention</th>
                <th>Description</th>
                <th>Status</th>
                <th>Date Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    Loading document types...
                  </td>
                </tr>
              ) : filteredTypes.length > 0 ? (
                filteredTypes.map((type, index) => (
                  <tr key={type.id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">{type.type_name || "-"}</td>

                    <td>
                      <span className="short-name-badge">
                        {type.short_name || "-"}
                      </span>
                    </td>

                    <td>{type.classification_name || "-"}</td>

                    <td>
                      {type.retention_period
                        ? `${type.retention_period} ${type.retention_unit || ""}`
                        : "-"}
                    </td>

                    <td>{type.description || "-"}</td>

                    <td>
                      <span
                        className={`status-badge ${type.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                          }`}
                      >
                        {type.status || "Inactive"}
                      </span>
                    </td>

                    <td>{type.date_created || "-"}</td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="icon-btn edit-btn"
                          onClick={() => handleEdit(type)}
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          className="icon-btn delete-btn"
                          title="Delete"
                          onClick={() => handleDeleteType(type.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    No document types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddTypesModal
        show={showAddModal}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleCreateType}
        onClose={closeAddModal}
        classifications={classifications}
      />

      <EditTypesModal
        show={showEditModal}
        formData={formData}
        setFormData={setFormData}
        classifications={classifications}
        onClose={closeEditModal}
        onUpdate={handleUpdateType}
      />
    </div>
  )
}