import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ManageItems.css";

const ManageItems = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);

    useEffect(() => {
        axios
            .get("http://localhost:5000/api/items", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            })
            .then((response) => setItems(response.data))
            .catch((error) => console.error("Error fetching items:", error));
    }, []);

    const handleEdit = (id) => {
        navigate(`/edit-item/${id}`);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            axios
                .delete(`http://localhost:5000/api/items/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                })
                .then(() => {
                    alert("Item deleted successfully");
                    setItems(items.filter((item) => item.item_id !== id));
                })
                .catch((error) => console.error("Error deleting item:", error));
        }
    };

    const formatExpiryDate = (isoDate) => {
        if (!isoDate) return "N/A";
        return new Date(isoDate).toISOString().split("T")[0];
    };

    const displayStock = (item) => {
        if (item.category_name === "Apparel" && item.sizes) {
            const sizes = JSON.parse(item.sizes);
            return Object.entries(sizes)
                .map(([size, qty]) => `${size}: ${qty}`)
                .join(", ");
        }
        return item.stock_quantity;
    };

    return (
        <div className="manage-items">
            <h1>Manage Items</h1>
            <div className="items-container">
                {items.map((item) => (
                    <div key={item.item_id} className="item-card">
                        <div className="item-image">
                            {item.img_url && (
                                <img
                                    src={`http://localhost:5000/uploads/${item.img_url}`}
                                    alt={item.item_name}
                                />
                            )}
                        </div>
                        <div className="item-details">
                            <h3>{item.item_name}</h3>
                            <p className="item-description">{item.description}</p>
                            <p><strong>Price:</strong> ₹{item.price}</p>
                            <p><strong>Stock:</strong> {displayStock(item)}</p>
                            <p><strong>Batch No:</strong> {item.batch_no}</p>
                            <p><strong>Expiry Date:</strong> {formatExpiryDate(item.expiry_date)}</p>
                        </div>
                        <div className="item-actions">
                            <button onClick={() => handleEdit(item.item_id)} className="edit-button">
                                Edit
                            </button>
                            <button onClick={() => handleDelete(item.item_id)} className="delete-button">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManageItems;