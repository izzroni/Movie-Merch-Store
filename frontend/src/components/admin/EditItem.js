import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EditItem.css";

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState({
    item_name: "",
    description: "",
    price: "",
    stock_quantity: "",
    batch_no: "",
    expiry_date: "",
    subcategory_id: "",
    discount_percentage: "",
    sizes: {},
    img_url: null,
  });
  const [isApparel, setIsApparel] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [newImage, setNewImage] = useState(null);
  const [sizeQuantities, setSizeQuantities] = useState({});

  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        const itemResponse = await axios.get(`http://localhost:5000/api/items/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const itemData = itemResponse.data;
        const parsedSizes = itemData.sizes ? JSON.parse(itemData.sizes || "{}") : {};
        setItem({
          ...itemData,
          discount_percentage: itemData.discount_percentage ?? "",
          stock_quantity: itemData.stock_quantity ?? "",
          expiry_date: itemData.expiry_date ? new Date(itemData.expiry_date).toISOString().split("T")[0] : "",
          sizes: parsedSizes,
        });
        setSizeQuantities(parsedSizes);
        console.log("Fetched item sizes:", itemData.sizes);

        const subcatResponse = await axios.get(`http://localhost:5000/api/subcategories`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("Subcategory response:", subcatResponse.data);
        const subcategory = subcatResponse.data.find(sub => sub.subcategory_id === itemData.subcategory_id);
        if (!subcategory || !subcategory.category_id) {
          console.error("Subcategory not found for subcategory_id:", itemData.subcategory_id);
          return;
        }

        const categoryResponse = await axios.get(`http://localhost:5000/api/categories`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("Categories response:", categoryResponse.data);
        const categories = categoryResponse.data;
        const category = categories.find((cat) => cat.category_id === subcategory.category_id);
        if (category) {
          const isApparelCategory = category.category_name.trim() === "Apparel" || category.category_name.trim() === "Clothing";
          const hasSizes = Object.keys(parsedSizes).length > 0;
          if (hasSizes && !isApparelCategory) {
            console.warn(
              `Mismatch detected: Item has sizes (${JSON.stringify(parsedSizes)}), but category is "${category.category_name}". Forcing isApparel to true.`
            );
            setIsApparel(true);
          } else {
            setIsApparel(isApparelCategory);
          }
          console.log("Category name:", category.category_name);
          console.log("isApparel:", isApparelCategory);
        } else {
          console.error("Category not found for category_id:", subcategory.category_id);
          setIsApparel(false);
        }
      } catch (error) {
        console.error("Error fetching item details:", error);
      }
    };

    const fetchSubcategories = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/subcategories", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setSubcategories(response.data);
      } catch (error) {
        console.error("Error fetching subcategories:", error);
      }
    };

    fetchItemDetails();
    fetchSubcategories();
  }, [id]);

  const handleChange = (e) => {
    console.log("Field changed:", e.target.name, "Value:", e.target.value);
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  const handleSizeChange = (size, value) => {
    setSizeQuantities((prev) => ({
      ...prev,
      [size]: value ? parseInt(value, 10) || 0 : 0,
    }));
  };

  const handleAddSize = () => {
    const newSize = prompt("Enter new size (e.g., S, M, L):");
    if (newSize && !sizeQuantities[newSize]) {
      setSizeQuantities((prev) => ({ ...prev, [newSize]: 0 }));
    }
  };

  const handleRemoveSize = (size) => {
    setSizeQuantities((prev) => {
      const newSizes = { ...prev };
      delete newSizes[size];
      return newSizes;
    });
  };

  const handleFileChange = (e) => {
    setNewImage(e.target.files[0]);
  };

  const handleSubcategoryChange = async (e) => {
    const subcategoryId = e.target.value;
    setItem({ ...item, subcategory_id: subcategoryId });

    try {
      const subcatResponse = await axios.get(`http://localhost:5000/api/subcategories/${subcategoryId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const categoryResponse = await axios.get(`http://localhost:5000/api/categories`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const category = categoryResponse.data.find((cat) => cat.category_id === subcatResponse.data[0]?.category_id);
      setIsApparel(category?.category_name.trim() === "Apparel" || category?.category_name.trim() === "Clothing");
    } catch (error) {
      console.error("Error checking category:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("item_name", item.item_name);
    formData.append("description", item.description);
    formData.append("price", item.price);
    if (!isApparel) {
      formData.append("stock_quantity", item.stock_quantity || 0);
    } else {
      const sizesToSave = sizeQuantities || {};
      formData.append("sizes", JSON.stringify(sizesToSave));
    }
    formData.append("batch_no", item.batch_no);
    formData.append("expiry_date", item.expiry_date);
    formData.append("subcategory_id", item.subcategory_id);
    formData.append("discount_percentage", item.discount_percentage || 0);
    if (newImage) {
      formData.append("img_url", newImage);
    }
    console.log("Form data being sent:", {
      item_name: item.item_name,
      description: item.description,
      price: item.price,
      stock_quantity: item.stock_quantity,
      sizes: sizeQuantities,
      batch_no: item.batch_no,
      expiry_date: item.expiry_date,
      subcategory_id: item.subcategory_id,
      discount_percentage: item.discount_percentage,
      newImage: newImage ? "uploaded" : "none",
    });

    axios
      .put(`http://localhost:5000/api/items/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        alert("Item updated successfully!");
        navigate("/manage-items");
      })
      .catch((error) => {
        console.error("Error updating item:", error.response ? error.response.data : error.message);
        alert("Failed to update item: " + (error.response?.data?.error || "Unknown error"));
      });
  };

  return (
    <div className="edit-item">
      <h1>Edit Item</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <label>Item Name:</label>
        <input type="text" name="item_name" value={item.item_name} onChange={handleChange} required />

        <label>Description:</label>
        <textarea name="description" value={item.description} onChange={handleChange} required />

        <label>Price:</label>
        <input type="number" name="price" value={item.price} onChange={handleChange} required step="0.01" />

        {!isApparel ? (
          <div>
            <label>Stock Quantity:</label>
            <input type="number" name="stock_quantity" value={item.stock_quantity} onChange={handleChange} required />
          </div>
        ) : (
          <div>
            <label>Sizes Stock Quantities:</label>
            {Object.entries(sizeQuantities).map(([size, quantity]) => (
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
        )}

        <label>Batch Number:</label>
        <input type="text" name="batch_no" value={item.batch_no} onChange={handleChange} required />

        <label>Expiry Date:</label>
        <input type="date" name="expiry_date" value={item.expiry_date} onChange={handleChange} required />

        <label>Subcategory:</label>
        <select name="subcategory_id" value={item.subcategory_id} onChange={handleSubcategoryChange} required>
          <option value="">Select a subcategory</option>
          {subcategories.map((sub) => (
            <option key={sub.subcategory_id} value={sub.subcategory_id}>
              {sub.subcategory_name}
            </option>
          ))}
        </select>

        <label>Discount Percentage (Optional):</label>
        <input
          type="number"
          name="discount_percentage"
          value={item.discount_percentage}
          onChange={handleChange}
          step="0.1"
          min="0"
          max="100"
          placeholder="e.g., 10 for 10%"
        />

        <label>Current Image:</label>
        {item.img_url && (
          <img src={`http://localhost:5000/uploads/${item.img_url}`} alt="Current Item" className="current-img" />
        )}

        <label>Upload New Image (Optional):</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />

        <button type="submit" className="update-button">Update Item</button>
      </form>
    </div>
  );
};

export default EditItem;