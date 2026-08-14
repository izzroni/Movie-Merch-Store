import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/shop.css";
import { Heart, ShoppingCart } from "lucide-react";
import { debounce } from "lodash";
import Navbar from "./Navbar";

const Shop = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSubcategories, setSelectedSubcategories] = useState([]);
    const [sortBy, setSortBy] = useState("");
    const [wishlistItems, setWishlistItems] = useState(new Set());
    const navigate = useNavigate();
    const location = useLocation();
    const abortControllerRef = useRef(null);
    const previousItemsRef = useRef([]);

    const fetchItems = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setLoading(true);

        try {
            console.log(`Fetching items`);
            const response = await axios.get(`http://localhost:5000/api/items`, {
                signal: controller.signal,
            });
            console.log(`Fetched items:`, response.data.length, response.data);
            previousItemsRef.current = items;
            setItems(response.data || []);
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error fetching items:", error);
                setItems(previousItemsRef.current);
            } else {
                console.log("Request aborted:", error);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [items]);

    const fetchWishlistItems = useCallback(async () => {
        const custId = localStorage.getItem('cust_id');
        const token = localStorage.getItem('token');
        if (!custId || !token) {
            setWishlistItems(new Set());
            return;
        }
        try {
            const response = await axios.get(`http://localhost:5000/api/wishlist/${custId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const wishlistSet = new Set(response.data.map(item => item.item_id));
            setWishlistItems(wishlistSet);
        } catch (error) {
            console.error("Error fetching wishlist:", error);
            setWishlistItems(new Set());
        }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const category = params.get("category");
        const subcategory = params.get("subcategory");

        if (category) {
            setSelectedCategories([category]);
            setSelectedSubcategories([]);
        } else if (subcategory) {
            setSelectedSubcategories([subcategory]);
            setSelectedCategories([]);
        }

        if (!items.length) {
            console.log(`Initial fetch`);
            fetchItems();
            fetchWishlistItems();
        }
    }, [location.search, items.length, fetchItems, fetchWishlistItems]);

    useEffect(() => {
        const handleScroll = () => {
            const shopContainer = document.querySelector(".shop-container");
            if (shopContainer) {
                const rect = shopContainer.getBoundingClientRect();
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleAddToWishlist = async (item, e) => {
        e.stopPropagation();
        try {
            const custId = localStorage.getItem('cust_id');
            const token = localStorage.getItem('token');
            if (!custId || !token) {
                alert("Please log in to add items to your wishlist.");
                navigate("/login");
                return;
            }
            const response = await axios.post(
                'http://localhost:5000/api/wishlist',
                { cust_id: parseInt(custId), item_id: item.item_id },
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.message) {
                setWishlistItems(prev => new Set([...prev, item.item_id]));
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
            const custId = localStorage.getItem('cust_id');
            const token = localStorage.getItem('token');
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
            const cartData = {
                cust_id: parsedCustId,
                item_id: item.item_id,
                quantity: 1,
                discount_percentage: item.discount_percentage || 0,
            };
            if (item.category_name === "Apparel") {
                const sizes = JSON.parse(item.sizes);
                const firstAvailableSize = Object.keys(sizes).find(size => sizes[size] > 0);
                if (!firstAvailableSize) {
                    alert("No sizes available for this item.");
                    return;
                }
                cartData.size = firstAvailableSize;
            }
            const response = await axios.post(
                'http://localhost:5000/api/cart',
                cartData,
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.message) {
                const discount = item.discount_percentage || 0;
                const discountedPrice = discount ? (item.price * (1 - discount / 100)).toFixed(2) : item.price;
                alert(`Added to cart at ₹${discountedPrice}${discount ? ` (Save ${discount}%)` : ''}!`);
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            alert("Failed to add item to cart. Please try again.");
        }
    };

    const categoryData = {
        Apparel: ["T-Shirts", "Hoodies", "Jackets", "Caps"],
        Accessories: ["Phone Cases", "Key Chains", "Bag pins"],
        Collectibles: ["Action Figures", "Masks"],
        "Posters & Wall Art": ["Classic Posters", "Artistic Wall Decor"],
    };

    const toggleCategory = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
        );
        navigate(`/shop?category=${encodeURIComponent(category)}`);
    };

    const toggleSubcategory = (subcategory) => {
        setSelectedSubcategories((prev) =>
            prev.includes(subcategory) ? prev.filter((s) => s !== subcategory) : [...prev, subcategory]
        );
        navigate(`/shop?subcategory=${encodeURIComponent(subcategory)}`);
    };

    const displayItems = useMemo(() => {
        return loading && previousItemsRef.current.length > 0 ? previousItemsRef.current : items;
    }, [items, loading]);

    const filteredItems = useMemo(() => {
        return displayItems
            .filter((item) => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter((item) =>
                selectedCategories.length > 0 ? selectedCategories.includes(item.category_name) : true
            )
            .filter((item) =>
                selectedSubcategories.length > 0 ? selectedSubcategories.includes(item.subcategory_name) : true
            );
    }, [displayItems, searchQuery, selectedCategories, selectedSubcategories]);

    console.log(`Current items state:`, items.length, items);
    console.log(`Display items:`, displayItems.length, displayItems);
    console.log(`Filtered items:`, filteredItems.length, filteredItems);
    console.log(`Loading state:`, loading);

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sortBy === "price-low-high") return a.price - b.price;
        if (sortBy === "price-high-low") return b.price - a.price;
        if (sortBy === "name-asc") return a.item_name.localeCompare(b.item_name);
        if (sortBy === "name-desc") return b.item_name.localeCompare(a.item_name);
        return 0;
    });

    const getTotalStock = (item) => {
        if (item.category_name === "Apparel" && item.sizes) {
            const sizes = JSON.parse(item.sizes);
            return Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
        }
        return item.stock_quantity;
    };

    return (
        <div className="shop-page-wrapper">
            <Navbar isShopPage={location.pathname === "/shop"} /> {/* Pass prop to indicate shop page */}
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
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="shop-product-grid">
                            {sortedItems.length > 0 ? (
                                sortedItems.map((item) => {
                                    const discount = item.discount_percentage || 0;
                                    const discountedPrice = discount ? (item.price * (1 - discount / 100)).toFixed(2) : item.price;
                                    const totalStock = getTotalStock(item);
                                    const isOutOfStock = totalStock <= 0;
                                    return (
                                        <div key={item.item_id} className="shop-product-card">
                                            <div
                                                className="shop-product-clickable"
                                                onClick={() => navigate(`/product/${item.item_id}`)}
                                            >
                                                <div className="shop-image-container">
                                                    <img
                                                        src={`http://localhost:5000/uploads/${item.img_url}`}
                                                        alt={item.item_name}
                                                        className="shop-product-image"
                                                    />
                                                    {isOutOfStock && (
                                                        <div className="shop-out-of-stock-overlay">Out of Stock</div>
                                                    )}
                                                    <button
                                                        className={`shop-wishlist-heart ${wishlistItems.has(item.item_id) ? 'shop-in-wishlist' : ''}`}
                                                        onClick={(e) => handleAddToWishlist(item, e)}
                                                        disabled={wishlistItems.has(item.item_id)}
                                                        aria-label={wishlistItems.has(item.item_id) ? 'In Wishlist' : 'Add to Wishlist'}
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
                                                <button
                                                    className="shop-add-to-cart"
                                                    onClick={(e) => handleAddToCart(item, e)}
                                                    disabled={isOutOfStock}
                                                >
                                                    <ShoppingCart color="white" size={20} />
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
                                        </div>
                                    );
                                })
                            ) : loading && previousItemsRef.current.length === 0 ? (
                                <p>Loading items...</p>
                            ) : (
                                <p className="shop-no-results">No items found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Shop;