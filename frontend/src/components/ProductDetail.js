import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Heart } from "lucide-react";
import "../styles/productDetail.css";
import Navbar from "./Navbar"; // Import Navbar

const ProductDetail = () => {
  const { itemId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [inWishlist, setInWishlist] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const custId = localStorage.getItem("cust_id");
  const baseUrl = "http://localhost:5000";

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/api/items/${itemId}`);
        setProduct(response.data);
        if (token && custId) {
          checkWishlistStatus(response.data.item_id);
        }
      } catch (error) {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [itemId, token, custId]);

  const checkWishlistStatus = async (itemId) => {
    try {
      const response = await axios.get(`${baseUrl}/api/wishlist/${custId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInWishlist(response.data.some((item) => item.item_id === Number.parseInt(itemId)));
    } catch (error) {
      console.error("Error checking wishlist:", error);
    }
  };

  const getTotalStock = () => {
    if (product?.category_name === "Apparel" && product?.sizes) {
      const sizes = JSON.parse(product.sizes);
      return Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
    }
    return product?.stock_quantity || 0;
  };

  const getAvailableSizes = () => {
    if (product?.category_name === "Apparel" && product?.sizes) {
      const sizes = JSON.parse(product.sizes);
      return Object.entries(sizes)
        .filter(([_, qty]) => qty > 0)
        .map(([size]) => size);
    }
    return [];
  };

  const handleQuantityChange = (e) => {
    const value = Number.parseInt(e.target.value) || 1;
    const maxStock = product?.category_name === "Apparel" 
      ? (selectedSize ? JSON.parse(product.sizes)[selectedSize] : getTotalStock()) 
      : product.stock_quantity;
    setQuantity(Math.max(1, Math.min(value, maxStock)));
  };

  const handleSizeChange = (e) => {
    setSelectedSize(e.target.value);
    setQuantity(1); // Reset quantity when size changes
  };

  const handleAddToCart = async () => {
    if (!token || !custId) {
      navigate("/login");
      return;
    }
    if (product.category_name === "Apparel" && !selectedSize) {
      alert("Please select a size before adding to cart!");
      return;
    }
    try {
      const cartData = {
        cust_id: Number.parseInt(custId),
        item_id: product.item_id,
        quantity,
        discount_percentage: product.discount_percentage,
      };
      if (product.category_name === "Apparel") {
        cartData.size = selectedSize;
      }
      const response = await axios.post(
        `${baseUrl}/api/cart`,
        cartData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.message) {
        alert("Added to cart successfully!");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Failed to add to cart");
    }
  };

  const handleBuyNow = async () => {
    if (!token || !custId) {
      navigate("/login");
      return;
    }
    if (product.category_name === "Apparel" && !selectedSize) {
      alert("Please select a size before proceeding!");
      return;
    }
    try {
      const cartData = {
        cust_id: Number.parseInt(custId),
        item_id: product.item_id,
        quantity,
        discount_percentage: product.discount_percentage,
        buy_now: true,
        size: product.category_name === "Apparel" ? selectedSize : null,
      };
  
      const response = await axios.post(
        `${baseUrl}/api/cart`,
        cartData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.data.message) {
        sessionStorage.setItem("isBuyNow", "true");
        sessionStorage.setItem("buyNowCartId", response.data.cart_master_id);
        navigate("/checkout", {
          state: { isBuyNow: true, cart_master_id: response.data.cart_master_id },
        });
      }
    } catch (error) {
      alert(error.response?.data?.error || "Failed to process Buy Now");
    }
  };

  const toggleWishlist = async () => {
    if (!token || !custId) {
      navigate("/login");
      return;
    }
    try {
      if (inWishlist) {
        await axios.delete(`${baseUrl}/api/wishlist/${custId}/${product.item_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInWishlist(false);
      } else {
        await axios.post(
          `${baseUrl}/api/wishlist`,
          { cust_id: custId, item_id: product.item_id },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        setInWishlist(true);
      }
    } catch (error) {
      alert(error.response?.data?.error || "Failed to update wishlist");
    }
  };

  if (loading) {
    return (
      <div className="shop-page-wrapper">
        <Navbar isShopPage={true} />
        <div className="pd-container">
          <div className="pd-loading">
            <div className="pd-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="shop-page-wrapper">
        <Navbar isShopPage={true} />
        <div className="pd-container">
          <div className="pd-error">
            <h2>Product Not Found</h2>
            <button className="pd-back-button" onClick={() => navigate("/shop")}>
              Back to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const discountedPrice = product.discount_percentage
    ? (product.price * (1 - product.discount_percentage / 100)).toFixed(2)
    : product.price;
  const totalStock = getTotalStock();
  const availableSizes = getAvailableSizes();

  return (
    <div className="shop-page-wrapper">
      <Navbar isShopPage={true} /> {/* Add Navbar with isShopPage=true */}
      <div className="pd-container">
        <div className="pd-content">
          <div className="pd-back-nav">
            <button className="pd-back-button" onClick={() => navigate("/shop")}>
              ← Back to Shop
            </button>
          </div>
          <div className="pd-product-layout">
            <div className="pd-image-section">
              <div className="pd-image-container">
                <img
                  src={`${baseUrl}/uploads/${product.img_url}`}
                  alt={product.item_name}
                  className="pd-product-image"
                  onError={(e) => (e.target.src = "/placeholder-image.jpg")}
                />
                <button
                  className={`pd-wishlist-heart ${inWishlist ? "pd-in-wishlist" : ""}`}
                  onClick={toggleWishlist}
                >
                  <Heart
                    className="pd-heart-icon"
                    fill={inWishlist ? "#ff3131" : "none"}
                    stroke={inWishlist ? "#ff3131" : "#000"}
                  />
                </button>
              </div>
            </div>
            <div className="pd-details-section">
              <h1 className="pd-product-title">{product.item_name}</h1>
              <div className="pd-product-category">
                <span>{product.category_name}</span> / <span>{product.subcategory_name}</span>
              </div>
              {totalStock > 0 ? (
                <>
                  <div className="pd-product-price">
                    ₹{discountedPrice}
                    {product.discount_percentage > 0 && (
                      <>
                        {" "}
                        <span style={{ textDecoration: "line-through", color: "#bbb" }}>
                          ₹{product.price}
                        </span>{" "}
                        <span style={{ color: "#ff6161" }}>
                          ({product.discount_percentage}% OFF)
                        </span>
                      </>
                    )}
                  </div>
                  {product.category_name === "Apparel" && (
                    <div className="pd-size-selector">
                      <label htmlFor="size" className="pd-quantity-label">
                        Size:
                      </label>
                      <select
                        id="size"
                        value={selectedSize}
                        onChange={handleSizeChange}
                        className="pd-size-dropdown"
                      >
                        <option value="">Select Size</option>
                        {availableSizes.map((size) => (
                          <option key={size} value={size}>
                            {size} ({JSON.parse(product.sizes)[size]} available)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="pd-quantity-selector">
                    <label htmlFor="quantity" className="pd-quantity-label">
                      Quantity:
                    </label>
                    <div className="pd-quantity-controls">
                      <button
                        className="pd-quantity-btn"
                        onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                      >
                        -
                      </button>
                      <input
                        id="quantity"
                        type="number"
                        min="1"
                        max={
                          product.category_name === "Apparel" && selectedSize
                            ? JSON.parse(product.sizes)[selectedSize]
                            : totalStock
                        }
                        value={quantity}
                        onChange={handleQuantityChange}
                        className="pd-quantity-input"
                      />
                      <button
                        className="pd-quantity-btn"
                        onClick={() =>
                          quantity <
                            (product.category_name === "Apparel" && selectedSize
                              ? JSON.parse(product.sizes)[selectedSize]
                              : totalStock) && setQuantity(quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="pd-action-buttons">
                    <button className="pd-add-to-cart" onClick={handleAddToCart}>
                      Add to Cart
                    </button>
                    <button className="pd-buy-now" onClick={handleBuyNow}>
                      Buy Now
                    </button>
                  </div>
                </>
              ) : (
                <div className="pd-out-of-stock">Out of Stock</div>
              )}
              <div className="pd-product-description">
                <h3 className="pd-section-title">Description</h3>
                <p>{product.description || "No description available."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;