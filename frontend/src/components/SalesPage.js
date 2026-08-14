import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Heart, ShoppingCart } from "lucide-react";
import "../styles/shop.css";
import Navbar from "./Navbar"; // Import Navbar

const SalesPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wishlistItems, setWishlistItems] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSubcategories, setSelectedSubcategories] = useState([]);
    const [sortBy, setSortBy] = useState("");
    const navigate = useNavigate();

    const categoryData = {
        Apparel: ["T-Shirts", "Hoodies", "Jackets", "Caps"],
        Accessories: ["Phone Cases", "Key Chains", "Bag pins"],
        Collectibles: ["Action Figures", "Masks"],
        "Posters & Wall Art": ["Classic Posters", "Artistic Wall Decor"],
    };

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/items`);
            console.log(`Fetched items:`, response.data);
            const allItems = response.data || [];
            const discountedItems = allItems.filter(item => (item.discount_percentage || 0) > 0);
            setItems(discountedItems);
        } catch (error) {
            console.error("Error fetching items:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchWishlistItems = async () => {
        const custId = localStorage.getItem("cust_id");
        const token = localStorage.getItem("token");
        if (!custId || !token) {
            setWishlistItems(new Set());
            return;
        }
        try {
            const response = await axios.get(`http://localhost:5000/api/wishlist/${custId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setWishlistItems(new Set(response.data.map((item) => item.item_id)));
        } catch (error) {
            console.error("Error fetching wishlist:", error);
            setWishlistItems(new Set());
        }
    };

    useEffect(() => {
        fetchItems();
        fetchWishlistItems();
    }, [fetchItems]);

    const handleAddToWishlist = async (item, e) => {
        e.stopPropagation();
        try {
            const custId = localStorage.getItem("cust_id");
            const token = localStorage.getItem("token");
            if (!custId || !token) {
                alert("Please log in to add items to your wishlist.");
                navigate("/login");
                return;
            }
            const response = await axios.post(
                "http://localhost:5000/api/wishlist",
                { cust_id: parseInt(custId), item_id: item.item_id },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
            if (response.data.message) {
                setWishlistItems((prev) => new Set([...prev, item.item_id]));
            }
        } catch (error) {
            if (error.response?.data?.error === "Item already in wishlist") {
                alert("This item is already in your wishlist");
            } else {
                alert("Failed to add item to wishlist");
            }
        }
    };

    const handleAddToCart = async (item, e) => {
        e.stopPropagation();
        try {
            const custId = localStorage.getItem("cust_id");
            const token = localStorage.getItem("token");
            if (!custId || !token) {
                alert("Please log in to add items to your cart.");
                navigate("/login");
                return;
            }
            const parsedCustId = parseInt(custId);
            if (isNaN(parsedCustId)) {
                alert("Invalid customer ID. Please log in again.");
                localStorage.clear();
                navigate("/login");
                return;
            }
            const discount = item.discount_percentage || 0;
            const discountedPrice = discount ? (item.price * (1 - discount / 100)).toFixed(2) : item.price;
            const cartData = {
                cust_id: parsedCustId,
                item_id: item.item_id,
                quantity: 1,
                discount_percentage: discount
            };
            const response = await axios.post("http://localhost:5000/api/cart", cartData, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (response.data.message) {
                alert(`Added to cart at ₹${discountedPrice} (Save ${discount}%)!`);
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            alert("Failed to add item to cart. Please try again.");
        }
    };

    const toggleCategory = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
        );
    };

    const toggleSubcategory = (subcategory) => {
        setSelectedSubcategories((prev) =>
            prev.includes(subcategory) ? prev.filter((s) => s !== subcategory) : [...prev, subcategory]
        );
    };

    const filteredItems = items
        .filter((item) => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter((item) =>
            selectedCategories.length > 0 ? selectedCategories.includes(item.category_name) : true
        )
        .filter((item) =>
            selectedSubcategories.length > 0 ? selectedSubcategories.includes(item.subcategory_name) : true
        );

    console.log(`Filtered sale items:`, filteredItems);

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sortBy === "price-low-high") return a.price - b.price;
        if (sortBy === "price-high-low") return b.price - a.price;
        if (sortBy === "name-asc") return a.item_name.localeCompare(b.item_name);
        if (sortBy === "name-desc") return b.item_name.localeCompare(a.item_name);
        return 0;
    });

    return (
        <div className="shop-page-wrapper">
            <Navbar isShopPage={true} /> {/* Add Navbar with isShopPage=true */}
            <div className="shop-container">

                <div className="shop-layout">
                    <div className="shop-sidebar">
                        <div className="shop-filter-section">
                            <h3>Categories</h3>
                            {Object.keys(categoryData).map((category) => (
                                <label key={category} className="shop-filter-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(category)}
                                        onChange={() => toggleCategory(category)}
                                    />
                                    {category}
                                </label>
                            ))}
                        </div>

                        {selectedCategories.length > 0 && (
                            <div className="shop-filter-section">
                                <h3>Subcategories</h3>
                                {selectedCategories.map((category) =>
                                    categoryData[category].map((sub) => (
                                        <label key={sub} className="shop-filter-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedSubcategories.includes(sub)}
                                                onChange={() => toggleSubcategory(sub)}
                                            />
                                            {sub}
                                        </label>
                                    ))
                                )}
                            </div>
                        )}

                        <div className="shop-filter-section">
                            <h3>Sort By</h3>
                            <select
                                className="shop-sort-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="">Sort By</option>
                                <option value="price-low-high">Price: Low to High</option>
                                <option value="price-high-low">Price: High to Low</option>
                                <option value="name-asc">Name: A to Z</option>
                                <option value="name-desc">Name: Z to A</option>
                            </select>
                        </div>
                    </div>

                    <div className="shop-product-section">
                        <div className="shop-search-bar">
                            <input
                                type="text"
                                placeholder="Search sale items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="shop-product-grid">
                            {loading ? (
                                <p>Loading sale items...</p>
                            ) : sortedItems.length > 0 ? (
                                sortedItems.map((item) => {
                                    const discount = item.discount_percentage || 0;
                                    const discountedPrice = discount ? (item.price * (1 - discount / 100)).toFixed(2) : item.price;
                                    return (
                                        <div key={item.item_id} className="shop-product-card">
                                            <div className="shop-product-clickable" onClick={() => navigate(`/product/${item.item_id}`)}>
                                                <div className="shop-image-container">
                                                    <img
                                                        src={`http://localhost:5000/uploads/${item.img_url}`}
                                                        alt={item.item_name}
                                                        className="shop-product-image"
                                                    />
                                                    <button
                                                        className={`shop-wishlist-heart ${wishlistItems.has(item.item_id) ? "shop-in-wishlist" : ""}`}
                                                        onClick={(e) => handleAddToWishlist(item, e)}
                                                        disabled={wishlistItems.has(item.item_id)}
                                                        aria-label={wishlistItems.has(item.item_id) ? "In Wishlist" : "Add to Wishlist"}
                                                    >
                                                        <Heart
                                                            className="shop-heart-icon"
                                                            fill={wishlistItems.has(item.item_id) ? "#ff3131" : "none"}
                                                        />
                                                    </button>
                                                </div>
                                                <div className="shop-product-details">
                                                    <h3 className="shop-product-name">{item.item_name}</h3>
                                                    <p className="shop-product-category">
                                                        {item.category_name} - {item.subcategory_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shop-product-actions">
                                                <button className="shop-add-to-cart" onClick={(e) => handleAddToCart(item, e)}>
                                                    <ShoppingCart color="white" size={20} />
                                                    <span className="shop-cart-price">
                                                        ₹{discountedPrice}{" "}
                                                        <span style={{ textDecoration: "line-through", color: "#bbb", fontSize: "0.9rem" }}>
                                                            ₹{item.price}
                                                        </span>{" "}
                                                        <span style={{ color: "#ff6161", fontSize: "0.9rem" }}>({discount}% OFF)</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="shop-no-results">No sale items found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesPage;