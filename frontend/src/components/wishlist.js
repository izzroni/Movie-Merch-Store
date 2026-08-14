import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/shop.css";
import Navbar from "./Navbar"; // Import Navbar

const Wishlist = () => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSubcategories, setSelectedSubcategories] = useState([]);
    const [sortBy, setSortBy] = useState("");
    const navigate = useNavigate();

    const fetchWishlistItems = useCallback(async () => {
        setLoading(true);
        try {
            const custId = localStorage.getItem('cust_id');
            const token = localStorage.getItem('token');

            if (!custId || !token) {
                alert("Please log in to view your wishlist.");
                navigate("/login");
                return;
            }

            const response = await axios.get(
                `http://localhost:5000/api/wishlist/${custId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            console.log(`Fetched wishlist items:`, response.data);
            setWishlistItems(response.data || []);
        } catch (error) {
            console.error("Error fetching wishlist items:", error);
            if (error.response?.status === 401) {
                navigate("/login");
            }
            setWishlistItems([]);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchWishlistItems();
    }, [fetchWishlistItems]);

    const handleRemoveFromWishlist = async (wishlistId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `http://localhost:5000/api/wishlist/${wishlistId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            fetchWishlistItems();
            alert("Item removed from wishlist successfully!");
        } catch (error) {
            console.error("Error removing from wishlist:", error);
            alert("Failed to remove item from wishlist");
        }
    };

    const handleAddToCart = async (item) => {
        try {
            const custId = localStorage.getItem('cust_id');
            const token = localStorage.getItem('token');
            
            if (!custId || !token) {
                alert("Please log in to add items to your cart.");
                navigate("/login");
                return;
            }

            const cartData = {
                cust_id: parseInt(custId),
                item_id: item.item_id,
                quantity: 1
            };

            const response = await axios.post(
                'http://localhost:5000/api/cart',
                cartData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.message) {
                alert("Added to cart successfully!");
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            alert("Failed to add item to cart");
        }
    };

    const handleNavigateToProduct = (itemId) => {
        navigate(`/product/${itemId}`);
    };

    const categoryData = {};
    wishlistItems.forEach(item => {
        if (!categoryData[item.category_name]) {
            categoryData[item.category_name] = new Set();
        }
        categoryData[item.category_name].add(item.subcategory_name);
    });

    const toggleCategory = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const toggleSubcategory = (subcategory) => {
        setSelectedSubcategories(prev =>
            prev.includes(subcategory) ? prev.filter(s => s !== subcategory) : [...prev, subcategory]
        );
    };

    const filteredItems = wishlistItems
        .filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(item =>
            selectedCategories.length > 0 ? selectedCategories.includes(item.category_name) : true
        )
        .filter(item =>
            selectedSubcategories.length > 0 ? selectedSubcategories.includes(item.subcategory_name) : true
        );

    console.log(`Filtered wishlist items:`, filteredItems);

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sortBy === "price-low-high") return a.price - b.price;
        if (sortBy === "price-high-low") return b.price - a.price;
        if (sortBy === "name-asc") return a.item_name.localeCompare(b.item_name);
        if (sortBy === "name-desc") return b.item_name.localeCompare(a.item_name);
        if (sortBy === "date-new-old") return new Date(b.wishlist_date) - new Date(a.wishlist_date);
        if (sortBy === "date-old-new") return new Date(a.wishlist_date) - new Date(b.wishlist_date);
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
                                {selectedCategories.map(category =>
                                    Array.from(categoryData[category]).map(sub => (
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
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="shop-sort-select">
                                <option value="">Select an option</option>
                                <option value="date-new-old">Date Added: Newest First</option>
                                <option value="date-old-new">Date Added: Oldest First</option>
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
                                placeholder="Search wishlist items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="shop-product-grid">
                            {loading ? (
                                <p>Loading wishlist...</p>
                            ) : sortedItems.length > 0 ? (
                                sortedItems.map((item) => {
                                    const discount = item.discount_percentage || 0;
                                    const discountedPrice = discount ? (item.price * (1 - discount / 100)).toFixed(2) : item.price;
                                    const isOutOfStock = item.stock_quantity <= 0;

                                    return (
                                        <div key={item.wishlist_id} className="shop-product-card">
                                            <div 
                                                className="shop-product-clickable"
                                                onClick={() => handleNavigateToProduct(item.item_id)}
                                            >
                                                <div className="shop-image-container">
                                                    <img
                                                        src={`http://localhost:5000/uploads/${item.img_url}`}
                                                        alt={item.item_name}
                                                        className="shop-product-image"
                                                    />
                                                    {isOutOfStock && (
                                                        <div className="shop-out-of-stock-overlay">
                                                            Out of Stock
                                                        </div>
                                                    )}
                                                    <button 
                                                        className="shop-wishlist-heart"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFromWishlist(item.wishlist_id);
                                                        }}
                                                    >
                                                        <svg className="shop-heart-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="shop-product-details">
                                                    <h3 className="shop-product-name">{item.item_name}</h3>
                                                    <p className="shop-product-category">
                                                        {item.category_name} - {item.subcategory_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                className="shop-add-to-cart"
                                                onClick={() => handleAddToCart(item)}
                                                disabled={isOutOfStock}
                                            >
                                                <span className="shop-cart-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="9" cy="21" r="1"></circle>
                                                        <circle cx="20" cy="21" r="1"></circle>
                                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                                    </svg>
                                                </span>
                                                <span className="shop-cart-price">
                                                    {isOutOfStock ? "Out of Stock" : (
                                                        <>
                                                            ₹{discountedPrice}
                                                            {discount > 0 && (
                                                                <>
                                                                    {" "}
                                                                    <span style={{ textDecoration: "line-through", color: "#bbb", fontSize: "0.9rem" }}>
                                                                        ₹{item.price}
                                                                    </span>
                                                                    {" "}
                                                                    <span style={{ color: "#ff6161", fontSize: "0.9rem" }}>
                                                                        ({discount}% OFF)
                                                                    </span>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="shop-no-results">No items found in wishlist.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wishlist;