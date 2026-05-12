import { useEffect, useMemo, useState } from "react"
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi"
import axios from "axios"
import Swal from "sweetalert2"

import "../styles/categories.css"
import { API_URL } from "../shared/constants"

import EditClassificationModal from "../modals/EditClassificationModal"
import AddClassificationModal from "../modals/AddClassificationModal"


export default function Classifications() {
  const [classifications, setClassifications] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClassification, setSelectedClassification] = useState(null)

  const [showAddModal, setShowAddModal] = useState(false)

  const [formData, setFormData] = useState({
        id: "",
        classification_name: "",
        short_name: "",
        description: "",
        category_id: "",
        status: "Active",
  })

  const [categories, setCategories] = useState([])

  const fetchClassifications = async () => {
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("tag", "getall")

      const response = await axios.post(
        `${API_URL}/classification.php`,
        formData
      )

      if (response.data.success === 1) {
        setClassifications(response.data.data || [])
      } else {
        alert(response.data.message || "Failed to load classifications.")
      }
    } catch (error) {
      console.error(error)
      alert("Something went wrong while loading classifications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassifications()
    fetchCategories()
  }, [])

  const filteredClassifications = useMemo(() => {
    const keyword = searchTerm.toLowerCase()

    return classifications.filter((item) => {
      return (
        String(item.category_name || "").toLowerCase().includes(keyword) ||
        String(item.classification_name || "").toLowerCase().includes(keyword) ||
        String(item.short_name || "").toLowerCase().includes(keyword) ||
        String(item.description || "").toLowerCase().includes(keyword) ||
        String(item.status || "").toLowerCase().includes(keyword)
      )
    })
  }, [classifications, searchTerm])

  const handleAdd = () => {
  setFormData({
    id: "",
    classification_name: "",
    short_name: "",
    description: "",
    category_id: "",
    status: "Active",
  })

  setShowAddModal(true)
}

const closeAddModal = () => {
  setShowAddModal(false)
}

const handleCreateClassification = async (e) => {
  e.preventDefault()

  if (!formData.classification_name.trim()) {
    alert("Classification name is required.")
    return
  }

  if (!formData.category_id) {
    alert("Please select a category.")
    return
  }

  try {
     const user = JSON.parse(localStorage.getItem("user"));
    const data = new FormData()
    data.append("tag", "insert")
    data.append("classification_name", formData.classification_name)
    data.append("short_name", formData.short_name)
    data.append("description", formData.description)
    data.append("category_id", formData.category_id)
    data.append("userid", user.id)

    const response = await axios.post(
      `${API_URL}/classification.php`,
      data
    )

    if (response.data.success === 1) {
       Swal.fire({
                icon: "success",
                title: "Saved!",
                text: "Classification has been added successfully.",
                timer: 1500,
                showConfirmButton: false,
              })
      closeAddModal()
      fetchClassifications()
    } else {
         Swal.fire({
              icon: "error",
              title: "Error",
              text: "Something went wrong while creating classification.",
            })
    }
  } catch (error) {
    console.error(error)
       Swal.fire({
            icon: "error",
            title: "Error",
            text: "Something went wrong while creating category.",
          })
  }
}

const handleEdit = (classification) => {
  setFormData({
    id: classification.id,
    classification_name: classification.classification_name,
    short_name: classification.short_name,
    description: classification.description || "",
    category_id: classification.category_id,
    status: classification.status,
  })

  setShowEditModal(true)
}

const handleUpdateClassification = async (e) => {
  e.preventDefault()

  if (!formData.classification_name.trim()) {
    alert("Classification name is required.")
    return
  }

  if (!formData.category_id) {
    alert("Please select a category.")
    return
  }

  try {
     const user = JSON.parse(localStorage.getItem("user"));
    const data = new FormData()
    data.append("tag", "update")
    data.append("id", formData.id)
    data.append("classification_name", formData.classification_name.trim())
    data.append("short_name", formData.short_name.trim())
    data.append("description", formData.description.trim())
    data.append("category_id", formData.category_id)
    data.append("status", formData.status)
    data.append("userid", user.id)

    const response = await axios.post(
      `${API_URL}/classification.php`,
      data
    )

    if (response.data.success === 1) {
      Swal.fire({
                icon: "success",
                title: "Saved!",
                text: "Classification has been updated successfully.",
                timer: 1500,
                showConfirmButton: false,
              })
      closeEditModal()
      fetchClassifications()
    } else {
       Swal.fire({
            icon: "error",
            title: "Error",
            text: response.data.message || "Failed to update classification.",
          })
      
    }
  } catch (error) {
    console.error(error)
    alert("Something went wrong while updating classification.")
  }
}

const closeEditModal = () => {
  setShowEditModal(false)
}

const fetchCategories = async () => {
  try {
    const formData = new FormData()
    formData.append("tag", "getall")

    const response = await axios.post(
      `${API_URL}/category.php`,
      formData
    )

    if (response.data.success === 1) {
      setCategories(response.data.data || [])
    }
  } catch (error) {
    console.error(error)
  }
}
 const handleDelete = async (id) => {
  const result = await Swal.fire({
    title: "Delete Classification?",
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
    const data = new FormData()
    const user = JSON.parse(localStorage.getItem("user"));
    data.append("tag", "delete")
    data.append("id", id)
    data.append("userid", user.id)

    const response = await axios.post(
      `${API_URL}/classification.php`,
      data
    )

    if (response.data.success === 1) {
      // remove from UI
      setClassifications((prev) =>
        prev.filter((item) => item.id !== id)
      )

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Classification has been removed.",
        timer: 1500,
        showConfirmButton: false,
      })
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: response.data.message || "Failed to delete.",
      })
    }
  } catch (error) {
    console.error(error)

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Something went wrong while deleting.",
    })
  }
}

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Classifications</h1>
          <p className="page-subtitle">
            Manage document classifications linked to document categories.
          </p>
        </div>

        <button className="primary-btn" onClick={handleAdd}>
          <FiPlus />
          <span>Add New Classification</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search classification..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="record-count">
            {filteredClassifications.length} record
            {filteredClassifications.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>
                <th>Classification Name</th>
                <th>Short Name</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Loading classifications...
                  </td>
                </tr>
              ) : filteredClassifications.length > 0 ? (
                filteredClassifications.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>

                    <td className="fw-semibold">
                      {item.category_name || "-"}
                    </td>

                    <td>{item.classification_name || "-"}</td>

                    <td>
                        {item.short_name ? (
                          <span className="short-name-badge">
                            {item.short_name}
                          </span>
                        ) : "-"}
                </td>

                    <td>{item.description || "-"}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          item.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="icon-btn edit-btn"
                          onClick={() => handleEdit(item)}
                          title="Update"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          className="icon-btn delete-btn"
                          onClick={() => handleDelete(item.id)}
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
                  <td colSpan="7" className="empty-state">
                    No classifications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

<AddClassificationModal
  show={showAddModal}
  formData={formData}
  setFormData={setFormData}
  categories={categories}
  onClose={closeAddModal}
  onSubmit={handleCreateClassification}
/>

    <EditClassificationModal
  show={showEditModal}
  formData={formData}
  categories={categories}
  setFormData={setFormData}
  onClose={closeEditModal}
  onUpdate={handleUpdateClassification}
/>
    </div>
  )
}