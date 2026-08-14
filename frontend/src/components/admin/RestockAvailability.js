import React, { useEffect, useState } from "react";
import axios from "axios";
import "./RestockAvailability.css";

const RestockAvailability = () => {
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    stock_quantity: "",
    price: "",
    batch_no: "",
    expiry_date: "", // Add expiry_date to formData
    sizes: "{}",
  });

  // Fetch items with stock_quantity = 0 or all sizes = 0
  useEffect(() => {
    const fetchOutOfStockItems = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/items/out-of-stock", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("Out-of-stock items fetched:", response.data);
        setOutOfStockItems(response.data);
      } catch (error) {
        console.error("Error fetching out-of-stock items:", error.response ? error.response.data : error.message);
        alert("Failed to fetch out-of-stock items. Check console for details. Error: " + (error.response?.data?.error || error.message));
      }
    };

    fetchOutOfStockItems();
  }, []);

  // Handle Edit button click
  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData({
      stock_quantity: item.stock_quantity || "",
      price: item.price || "",
      batch_no: item.batch_no || "",
      expiry_date: item.expiry_date || "", // Initialize expiry_date
      sizes: item.sizes || "{}",
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle size changes for apparel items
  const handleSizeChange = (size, value) => {
    setFormData((prev) => {
      const parsedSizes = JSON.parse(prev.sizes || "{}");
      parsedSizes[size] = parseInt(value, 10) || 0;
      return { ...prev, sizes: JSON.stringify(parsedSizes) };
    });
  };

  // Handle adding a new size for apparel items
  const handleAddSize = () => {
    const newSize = prompt("Enter new size (e.g., S, M, L):");
    if (newSize) {
      setFormData((prev) => {
        const parsedSizes = JSON.parse(prev.sizes || "{}");
        if (!parsedSizes[newSize]) {
          parsedSizes[newSize] = 0;
        }
        return { ...prev, sizes: JSON.stringify(parsedSizes) };
      });
    }
  };

  // Handle removing a size for apparel items
  const handleRemoveSize = (size) => {
    setFormData((prev) => {
      const parsedSizes = JSON.parse(prev.sizes || "{}");
      delete parsedSizes[size];
      return { ...prev, sizes: JSON.stringify(parsedSizes) };
    });
  };

  // Handle form submission to update the item
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isApparel = editingItem.category_name === "Apparel";
      const payload = {
        price: formData.price,
        batch_no: formData.batch_no,
        expiry_date: formData.expiry_date, // Include expiry_date in payload
      };

      if (isApparel) {
        payload.sizes = formData.sizes;
      } else {
        payload.stock_quantity = formData.stock_quantity;
      }

      await axios.put(
        `http://localhost:5000/api/items/${editingItem.item_id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      alert("Item updated successfully!");

      // Update the local state to reflect the change
      setOutOfStockItems((prev) =>
        prev.filter((item) => item.item_id !== editingItem.item_id)
      );
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item: " + (error.response?.data?.error || "Unknown error"));
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingItem(null);
    setFormData({
      stock_quantity: "",
      price: "",
      batch_no: "",
      expiry_date: "", // Reset expiry_date
      sizes: "{}",
    });
  };

  return (
    <div className="restock-availability">
      <h1>Restock Availability</h1>
      {outOfStockItems.length === 0 ? (
        <div className="restock-no-data">No items are currently out of stock.</div>
      ) : (
        <div className="restock-table-container">
          <h2>Out of Stock Items</h2>
          <div className="restock-table-responsive">
            <table className="restock-table">
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Quantity</th>
                  <th>Sizes (Apparel)</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th> {/* Add Expiry Date column */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockItems.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_id}</td>
                    <td>{item.item_name}</td>
                    <td>{item.category_name}</td>
                    <td>{item.price}</td>
                    <td>{item.stock_quantity !== null ? item.stock_quantity : "N/A"}</td>
                    <td>{item.sizes ? JSON.stringify(JSON.parse(item.sizes)) : "N/A"}</td>
                    <td>{item.batch_no}</td>
                    <td>{item.expiry_date}</td> {/* Display expiry_date */}
                    <td>
                      <button onClick={() => handleEditClick(item)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="edit-form">
          <h2>Edit Item: {editingItem.item_name}</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Price:
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                required
              />
            </label>
            <label>
              Batch Number:
              <input
                type="text"
                name="batch_no"
                value={formData.batch_no}
                onChange={handleInputChange}
                required
              />
            </label>
            <label>
              Expiry Date:
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date.split(" ")[0]} // Format for date input (YYYY-MM-DD)
                onChange={handleInputChange}
                required
              />
            </label>
            {editingItem.category_name === "Apparel" ? (
              <div>
                <label>Sizes Stock Quantities:</label>
                {Object.entries(JSON.parse(formData.sizes || "{}")).map(([size, quantity]) => (
                  <div key={size} style={{ margin: "10px 0" }}>
                    <input
                      type="text"
                      value={size}
                      readOnly
                      style={{ width: "50px", marginRight: "10px" }}
                    />
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleSizeChange(size, e.target.value)}
                      min="0"
                      style={{ width: "100px", marginRight: "10px" }}
                    />
                    <button type="button" onClick={() => handleRemoveSize(size)}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={handleAddSize} style={{ marginTop: "10px" }}>
                  Add Size
                </button>
              </div>
            ) : (
              <label>
                Stock Quantity:
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  required
                />
              </label>
            )}
            <div className="form-actions">
              <button type="submit">Update</button>
              <button type="button" onClick={handleCancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RestockAvailability;