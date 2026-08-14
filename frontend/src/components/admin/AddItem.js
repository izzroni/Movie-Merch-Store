import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AddItem.css";

const AddItem = () => {
    const [subcategories, setSubcategories] = useState([]);
    const [itemData, setItemData] = useState({
        subcategory_id: "",
        item_name: "",
        description: "",
        price: "",
        stock_quantity: "",
        batch_no: "",
        expiry_date: "",
        discount_percentage: "",
        sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
        img_url: null,
    });
    const [isApparel, setIsApparel] = useState(false);

    const navigate = useNavigate();
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    useEffect(() => {
        if (!isAdmin) {
            alert("Access Denied! Admins only.");
            navigate("/");
        }
    }, [isAdmin, navigate]);

    useEffect(() => {
        axios.get("http://localhost:5000/api/subcategories")
            .then(res => {
                setSubcategories(res.data);
            })
            .catch(err => console.error("Error fetching subcategories:", err));
    }, []);

    const handleSubcategoryChange = (e) => {
        const subcategoryId = e.target.value;
        setItemData({ ...itemData, subcategory_id: subcategoryId });
        const selectedSubcategory = subcategories.find(sub => sub.subcategory_id === Number.parseInt(subcategoryId));
        const apparelStatus = selectedSubcategory?.category_id === 1; // Adjust based on your Apparel category_id
        setIsApparel(apparelStatus);
        setItemData(prev => ({
            ...prev,
            subcategory_id: subcategoryId,
            stock_quantity: apparelStatus ? "" : prev.stock_quantity,
            sizes: apparelStatus ? prev.sizes : { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 }
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setItemData({ ...itemData, [name]: value });
    };

    const handleSizeChange = (e) => {
        const { name, value } = e.target;
        setItemData({
            ...itemData,
            sizes: { ...itemData.sizes, [name]: Number.parseInt(value) || 0 },
        });
    };

    const handleFileChange = (e) => {
        setItemData({ ...itemData, img_url: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("subcategory_id", itemData.subcategory_id);
        formData.append("item_name", itemData.item_name);
        formData.append("description", itemData.description);
        formData.append("price", itemData.price);
        if (!isApparel) {
            formData.append("stock_quantity", itemData.stock_quantity);
        } else {
            formData.append("sizes", JSON.stringify(itemData.sizes));
        }
        formData.append("batch_no", itemData.batch_no);
        formData.append("expiry_date", itemData.expiry_date);
        if (itemData.discount_percentage) {
            formData.append("discount_percentage", itemData.discount_percentage);
        }
        formData.append("img_url", itemData.img_url);

        try {
            const adminToken = localStorage.getItem("token");
            if (!adminToken) {
                alert("Unauthorized: Admin token missing!");
                return;
            }
            await axios.post("http://localhost:5000/api/items", formData, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            alert("Item added successfully!");
            setItemData({
                subcategory_id: "",
                item_name: "",
                description: "",
                price: "",
                stock_quantity: "",
                batch_no: "",
                expiry_date: "",
                discount_percentage: "",
                sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
                img_url: null,
            });
            setIsApparel(false);
            document.querySelector('input[type="file"]').value = "";
        } catch (err) {
            console.error("Error adding item:", err.response ? err.response.data : err.message);
            alert("Error adding item! Check the console for details.");
        }
    };

    return isAdmin ? (
        <div className="add-item-container">
            <h2>Add Item</h2>
            <form onSubmit={handleSubmit} className="add-item-form">
                <label>Subcategory:</label>
                <select name="subcategory_id" value={itemData.subcategory_id} onChange={handleSubcategoryChange} required>
                    <option value="">Select Subcategory</option>
                    {subcategories.map(sub => (
                        <option key={sub.subcategory_id} value={sub.subcategory_id}>
                            {sub.subcategory_name}
                        </option>
                    ))}
                </select>

                <label>Item Name:</label>
                <input type="text" name="item_name" value={itemData.item_name} onChange={handleChange} required />

                <label>Description:</label>
                <textarea name="description" value={itemData.description} onChange={handleChange} required />

                <label>Price:</label>
                <input type="number" name="price" value={itemData.price} onChange={handleChange} step="0.01" required />

                {isApparel ? (
                    <>
                        <label>Sizes (Stock Quantity):</label>
                        {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map(size => (
                            <div key={size} style={{ marginBottom: "10px" }}>
                                <label>{size}:</label>
                                <input
                                    type="number"
                                    name={size}
                                    value={itemData.sizes[size]}
                                    onChange={handleSizeChange}
                                    min="0"
                                    style={{ width: "60px", marginLeft: "10px" }}
                                />
                            </div>
                        ))}
                    </>
                ) : (
                    <>
                        <label>Stock Quantity:</label>
                        <input type="number" name="stock_quantity" value={itemData.stock_quantity} onChange={handleChange} required />
                    </>
                )}

                <label>Batch No:</label>
                <input type="text" name="batch_no" value={itemData.batch_no} onChange={handleChange} required />

                <label>Expiry Date:</label>
                <input type="date" name="expiry_date" value={itemData.expiry_date} onChange={handleChange} required />

                <label>Discount Percentage (Optional):</label>
                <input
                    type="number"
                    name="discount_percentage"
                    value={itemData.discount_percentage}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="e.g., 10 for 10%"
                />

                <label>Upload Image:</label>
                <input type="file" name="img_url" accept="image/*" onChange={handleFileChange} required />

                <button type="submit">Add Item</button>
            </form>
        </div>
    ) : null;
};

export default AddItem;