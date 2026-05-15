import { useEffect, useMemo, useState } from "react"
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi"
import axios from "axios"
import Swal from "sweetalert2"

import "../styles/docstatus.css"
import DocStatusFormModal from "../modals/DocStatusFormModal"
import { API_URL } from "../shared/constants"

export default function DocumentStatuses() {
    const [statuses, setStatuses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [selectedId, setSelectedId] = useState(null)

    const [formData, setFormData] = useState({
        status_name: "",
        description: "",
        status: "Active",
    })

    useEffect(() => { getStatuses() }, [])

    const getStatuses = async () => {
        try {
            setLoading(true)
            const fd = new FormData()
            fd.append("tag", "getall")
            const response = await axios.post(`${API_URL}/docstatus.php`, fd)
            if (Number(response.data.success) === 1) setStatuses(response.data.data || [])
        } catch (error) {
            console.error(error)
        } finally { setLoading(false) }
    }

    const filteredData = useMemo(() => {
        const keyword = searchTerm.toLowerCase()
        return statuses.filter(s =>
            s.status_name.toLowerCase().includes(keyword) ||
            s.description.toLowerCase().includes(keyword)
        )
    }, [statuses, searchTerm])

    const handleOpenModal = (status = null) => {
        if (status) {
            setIsEditing(true)
            setSelectedId(status.id)
            setFormData({ status_name: status.status_name, description: status.description, is_system: status.is_system, status: status.status })
        } else {
            setIsEditing(false)
            setSelectedId(null)
            setFormData({ status_name: "", description: "", is_system: 0, status: "Active" })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const user = JSON.parse(localStorage.getItem("user"))
        const fd = new FormData()
        fd.append("tag", isEditing ? "update" : "insert")
        if (isEditing) fd.append("id", selectedId)
        fd.append("userid", user.id)
        fd.append("status_name", formData.status_name)
        fd.append("description", formData.description)
        fd.append("status", formData.status)

        const response = await axios.post(`${API_URL}/docstatus.php`, fd)
        if (Number(response.data.success) === 1) {
            getStatuses()
            setShowModal(false)
            Swal.fire({ icon: 'success', title: 'Success', timer: 1500, showConfirmButton: false })
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Delete Status?",
            text: "This may affect documents using this status.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#820d0d"
        })

        if (result.isConfirmed) {
            const user = JSON.parse(localStorage.getItem("user"))
            const fd = new FormData()
            fd.append("tag", "delete")
            fd.append("id", id)
            fd.append("userid", user.id)
            await axios.post(`${API_URL}/docstatus.php`, fd)
            getStatuses()
        }
    }

    return (
        <div className="docstatus-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Document Statuses</h1>
                    <p className="page-subtitle">Configure status types for document workflows.</p>
                </div>
                <button className="primary-btn" onClick={() => handleOpenModal()}>
                    <FiPlus /> <span>Add Status</span>
                </button>
            </div>

            <div className="table-card">
                <div className="table-toolbar">
                    <div className="search-box">
                        <FiSearch />
                        <input type="text" placeholder="Search statuses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="record-count">{filteredData.length} records</div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Status Name</th>
                                <th>Description</th>
                                <th>Visibility</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="5" className="empty-state">Loading...</td></tr> :
                                filteredData.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td className="fw-semibold">{item.status_name}</td>
                                        <td>{item.description}</td>
                                        <td>
                                            <span className={`status-badge ${item.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="icon-btn edit-btn" onClick={() => handleOpenModal(item)}><FiEdit2 /></button>
                                                {Number(item.is_system) !== 1 &&
                                                    <button
                                                        className="icon-btn delete-btn"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <DocStatusFormModal
                show={showModal}
                isEditing={isEditing}
                formData={formData}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                onSubmit={handleSubmit}
                onClose={() => setShowModal(false)}
            />
        </div>
    )
}