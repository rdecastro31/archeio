import { useEffect, useMemo, useState } from "react"
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi"
import axios from "axios"
import Swal from "sweetalert2"

import "../styles/categories.css"
import AddCategoryModal from "../modals/AddCategoryModal"
import EditCategoryModal from "../modals/EditCategoryModal"
import { API_URL } from "../shared/constants"

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
    status: "Active",
  })

  useEffect(() => {
    getAllCategories()
  }, [])

  const filteredCategories = useMemo(() => {
    const keyword = String(searchTerm || "").toLowerCase()

    return categories.filter((category) => {
      const categoryName = String(category.category_name || "").toLowerCase()
      const description = String(category.description || "").toLowerCase()
      const status = String(category.status || "").toLowerCase()

      return (
        categoryName.includes(keyword) ||
        description.includes(keyword) ||
        status.includes(keyword)
      )
    })
  }, [categories, searchTerm])

  const resetForm = () => {
    setFormData({
      category_name: "",
      description: "",
      status: "Active",
    })
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

  const openEditModal = (category) => {
    setSelectedId(category.id)

    setFormData({
      category_name: category.category_name || "",
      description: category.description || "",
      status: category.status || "Active",
    })

    setShowEditModal(true)
  }

  const closeEditModal = () => {
    resetForm()
    setSelectedId(null)
    setShowEditModal(false)
  }

  const getAllCategories = async () => {
    try {
      setLoading(true)

   

      const fd = new FormData()
      fd.append("tag", "getall")

      const response = await axios.post(`${API_URL}/category.php`, fd)
      console.log(response.data)  

      if (Number(response.data.success) === 1) {
        setCategories(response.data.data || [])
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to load categories.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while loading categories.",
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

  const handleCreateCategory = async (e) => {
    e.preventDefault()

    const categoryName = String(formData.category_name || "").trim()
    const description = String(formData.description || "").trim()
    const status = String(formData.status || "Active")

    if (!categoryName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Category Name",
        text: "Category name is required.",
      })
      return
    }

    try {

      const user = JSON.parse(localStorage.getItem("user"));
      const fd = new FormData()
      fd.append("tag", "insert")
      fd.append("userid", user.id)
      fd.append("category_name", categoryName)
      fd.append("description", description)
      fd.append("status", status)

      const response = await axios.post(`${API_URL}/category.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllCategories()
        closeAddModal()

        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Category has been added successfully.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to create category.",
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

  const handleUpdateCategory = async (e) => {
    e.preventDefault()

    const categoryName = String(formData.category_name || "").trim()
    const description = String(formData.description || "").trim()
    const status = String(formData.status || "Active")

    if (!categoryName) {
      Swal.fire({
        icon: "warning",
        title: "Missing Category Name",
        text: "Category name is required.",
      })
      return
    }

    if (!selectedId) {
      Swal.fire({
        icon: "warning",
        title: "No Category Selected",
        text: "Please select a category to update.",
      })
      return
    }

    try {
      const fd = new FormData()
      const user = JSON.parse(localStorage.getItem("user"));
      fd.append("tag", "update")
      fd.append("id", selectedId)
      fd.append("userid", user.id)
      fd.append("category_name", categoryName)
      fd.append("description", description)
      fd.append("status", status)

      const response = await axios.post(`${API_URL}/category.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllCategories()
        closeEditModal()

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Category has been updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to update category.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while updating category.",
      })
    }
  }

  const handleDeleteCategory = async (id) => {
    const result = await Swal.fire({
      title: "Delete Category?",
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
      const fd = new FormData()
      const user = JSON.parse(localStorage.getItem("user"));
      fd.append("tag", "delete")
      fd.append("id", id)
      fd.append("userid", user.id)

      const response = await axios.post(`${API_URL}/category.php`, fd)

      if (Number(response.data.success) === 1) {
        await getAllCategories()

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Category has been removed.",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: response.data.message || "Failed to delete category.",
        })
      }
    } catch (error) {
      console.error(error)

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while deleting category.",
      })
    }
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            Manage document categories used for classifying records.
          </p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          <FiPlus />
          <span>Add New Category</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="record-count">
            {filteredCategories.length} record
            {filteredCategories.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Category Name</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length > 0 ? (
                filteredCategories.map((category, index) => (
                  <tr key={category.id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">
                      {category.category_name || "-"}
                    </td>
                    <td>{category.description || "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${category.status === "Active"
                          ? "status-active"
                          : "status-inactive"
                          }`}
                      >
                        {category.status || "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="icon-btn edit-btn"
                          onClick={() => openEditModal(category)}
                          title="Update"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          className="icon-btn delete-btn"
                          onClick={() => handleDeleteCategory(category.id)}
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
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddCategoryModal
        show={showAddModal}
        isEditing={false}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleCreateCategory}
        onClose={closeAddModal}
      />

      <EditCategoryModal
        show={showEditModal}
        formData={formData}
        setFormData={setFormData}
        onClose={closeEditModal}
        onUpdate={handleUpdateCategory}
      />
    </div>
  )
}