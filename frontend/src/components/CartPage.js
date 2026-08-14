import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/shop.css";
import Navbar from "./Navbar"; // Import Navbar

const CartPage = () => {
    const [cartItems, setCartItems] = useState([]);
    const [summary, setSummary] = useState({ total_items: 0, total_quantity: 0, total_amount: 0 });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const custId = localStorage.getItem("cust_id");
    const baseUrl = "http://localhost:5000";

    useEffect(() => {
        if (!token || !custId) {
            navigate("/login", { replace: true });
            return;
        }
        fetchCartData();
    }, [token, custId, navigate]);

    const fetchCartData = async () => {
        try {
            setLoading(true);
            setError("");
            const cartRes = await fetch(`${baseUrl}/api/cart/${custId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!cartRes.ok) throw new Error(`Failed to fetch cart: ${cartRes.status}`);
            const cartData = await cartRes.json();
            setCartItems(cartData);
            updateSummary(cartData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateSummary = (items) => {
        const total_items = items.length;
        const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const total_amount = items.reduce((sum, item) => {
            const discount = item.discount_percentage || 0;
            return sum + item.price_per_item * (1 - discount / 100) * item.quantity;
        }, 0);
        setSummary({ total_items, total_quantity, total_amount });
    };

    const updateQuantity = async (cartChildId, newQuantity) => {
        try {
            setError("");
            const response = await fetch(`${baseUrl}/api/cart/${cartChildId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ quantity: newQuantity }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update quantity");
            }
            fetchCartData();
        } catch (err) {
            setError(err.message);
        }
    };

    const removeItem = async (cartChildId) => {
        try {
            setError("");
            const response = await fetch(`${baseUrl}/api/cart/${cartChildId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to remove item");
            }
            fetchCartData();
        } catch (err) {
            setError(err.message);
        }
    };

    const proceedToCheckout = () => {
        if (cartItems.length === 0) {
            setError("Your cart is empty");
            return;
        }
        sessionStorage.removeItem("isBuyNow");
        sessionStorage.removeItem("buyNowCartId");
        navigate("/checkout", { state: { cartItems, isBuyNow: false } });
    };

    if (loading) return (
        <div className="shop-page-wrapper">
            <Navbar isShopPage={true} />
            <div className="cart-container"><div className="loading-spinner"></div></div>
        </div>
    );
    if (!token || !custId) return (
        <div className="shop-page-wrapper">
            <Navbar isShopPage={true} />
            <div className="cart-container">
                <div className="error-message">
                    Please login to view your cart
                    <button className="primary-button" onClick={() => navigate("/login")}>Go to Login</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="shop-page-wrapper">
            <Navbar isShopPage={true} /> {/* Add Navbar with isShopPage=true */}
            <div className="cart-container">
                <h1 className="cart-title">Your Shopping Cart</h1>
                {error && <div className="error-message">{error}</div>}
                {cartItems.length === 0 ? (
                    <div className="empty-cart">
                        <p>Your cart is empty</p>
                        <button className="primary-button" onClick={() => navigate("/")}>Continue Shopping</button>
                    </div>
                ) : (
                    <>
                        <div className="cart-items">
                            {cartItems.map((item) => {
                                const discount = item.discount_percentage || 0;
                                const discountedPrice = (item.price_per_item * (1 - discount / 100)).toFixed(2);
                                const totalPrice = (discountedPrice * item.quantity).toFixed(2);
                                return (
                                    <div
                                        key={item.cart_child_id}
                                        className="cart-item"
                                        onClick={() => navigate(`/product/${item.item_id}`)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <div className="item-image">
                                            <img
                                                src={`${baseUrl}/uploads/${item.img_url}`}
                                                alt={item.item_name}
                                                onError={(e) => (e.target.src = "/placeholder-image.jpg")}
                                            />
                                        </div>
                                        <div className="item-details">
                                            <h3>{item.item_name}</h3>
                                            {item.size && <p>Size: {item.size}</p>}
                                            <p className="item-price">
                                                ₹{discountedPrice}
                                                {discount > 0 && (
                                                    <>
                                                        {" "}
                                                        <span style={{ textDecoration: "line-through", color: "#bbb" }}>
                                                            ₹{item.price_per_item}
                                                        </span>{" "}
                                                        <span style={{ color: "#ff6161" }}>({discount}% OFF)</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                                            <div className="quantity-controls">
                                                <button
                                                    className="quantity-button"
                                                    onClick={() => updateQuantity(item.cart_child_id, item.quantity - 1)}
                                                >
                                                    -
                                                </button>
                                                <span className="quantity">{item.quantity}</span>
                                                <button
                                                    className="quantity-button"
                                                    onClick={() => updateQuantity(item.cart_child_id, item.quantity + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="item-total">₹{totalPrice}</div>
                                            <button
                                                className="remove-button"
                                                onClick={() => removeItem(item.cart_child_id)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="cart-summary">
                            <div className="summary-item">
                                <span>Total Items:</span>
                                <span>{summary.total_items}</span>
                            </div>
                            <div className="summary-item">
                                <span>Total Quantity:</span>
                                <span>{summary.total_quantity}</span>
                            </div>
                            <div className="summary-item total">
                                <span>Total Amount:</span>
                                <span>₹{summary.total_amount.toFixed(2)}</span>
                            </div>
                            <div className="cart-actions">
                                <button className="secondary-button" onClick={() => navigate("/")}>Continue Shopping</button>
                                <button className="primary-button" onClick={proceedToCheckout}>Proceed to Checkout</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CartPage;