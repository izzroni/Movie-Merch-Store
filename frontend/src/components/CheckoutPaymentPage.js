"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/CheckoutPage.css";

const CheckoutPaymentPage = () => {
    const [cartItems, setCartItems] = useState([]);
    const [summary, setSummary] = useState({ total_items: 0, total_quantity: 0, total_amount: 0 });
    const [savedCards, setSavedCards] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [saveCardDetails, setSaveCardDetails] = useState(false);
    const [addressData, setAddressData] = useState(null);
    const [cardData, setCardData] = useState({
        card_number: "",
        card_expiry: "",
        cardholder_name: "",
        cvv: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const token = localStorage.getItem("token");
    const custId = localStorage.getItem("cust_id");
    const baseUrl = "http://localhost:5000";

    useEffect(() => {
        if (!token || !custId) {
            console.error("Missing token or customer ID");
            navigate("/login", { replace: true });
            return;
        }

        const isBuyNow = sessionStorage.getItem("isBuyNow") === "true";
        const buyNowCartId = sessionStorage.getItem("buyNowCartId");

        const fetchData = async () => {
            try {
                setLoading(true);
                setError("");

                try {
                    await fetch(`${baseUrl}/api/fix-cart-items/${custId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    console.log("Fixed cart items status");
                } catch (fixErr) {
                    console.warn("Could not fix cart items:", fixErr);
                }

                const customerRes = await fetch(`${baseUrl}/api/customers/${custId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!customerRes.ok) throw new Error("Failed to fetch customer data");
                const customerData = await customerRes.json();
                setAddressData(customerData);

                let cartData;
                if (isBuyNow && buyNowCartId) {
                    const response = await fetch(`${baseUrl}/api/cart/buy-now/${buyNowCartId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!response.ok) throw new Error(`Failed to fetch Buy Now cart: ${response.status}`);
                    cartData = await response.json();
                } else {
                    const response = await fetch(`${baseUrl}/api/cart/${custId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!response.ok) throw new Error(`Failed to fetch cart: ${response.status}`);
                    cartData = await response.json();
                }

                const activeItems = cartData.filter(
                    (item) => item.cart_item_status === "active" && Number(item.quantity) > 0
                );
                setCartItems(activeItems);
                const calculatedSummary = calculateCartSummary(activeItems);
                setSummary(calculatedSummary);

                try {
                    await fetch(`${baseUrl}/api/cart/update-total/${custId}`, {
                        method: "PUT",
                        headers: { Authorization: `Bearer ${token}` },
                    });
                } catch (updateErr) {
                    console.warn("Could not update cart total:", updateErr);
                }

                try {
                    const cardsRes = await fetch(`${baseUrl}/api/cards/${custId}`, {
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    });
                    if (cardsRes.ok) {
                        const cardsData = await cardsRes.json();
                        setSavedCards(cardsData);
                    } else {
                        console.warn("Could not fetch saved cards, status:", cardsRes.status);
                        setSavedCards([]);
                        if (cardsRes.status === 403) navigate("/login", { replace: true });
                    }
                } catch (cardErr) {
                    console.warn("Could not fetch saved cards:", cardErr);
                    setSavedCards([]);
                }
            } catch (err) {
                console.error("Data fetch error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, custId, navigate]);

    const calculateCartSummary = (items) => {
        const activeItems = items.filter(
            (item) => item.cart_item_status === "active" && Number(item.quantity) > 0
        );

        const totalItems = activeItems.length;
        let totalQuantity = 0;
        let totalAmount = 0;

        activeItems.forEach((item) => {
            const quantity = Number.parseInt(item.quantity, 10) || 0;
            const price = Number.parseFloat(item.price_per_item) || 0;
            const discount = Number.parseFloat(item.discount_percentage) || 0;
            const discountedPrice = price * (1 - discount / 100);
            const itemTotal = discountedPrice * quantity;

            totalQuantity += quantity;
            totalAmount += itemTotal;
        });

        return { total_items: totalItems, total_quantity: totalQuantity, total_amount: totalAmount };
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === "card_number") {
            const formattedValue = value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 16);
            let formatted = "";
            for (let i = 0; i < formattedValue.length; i += 4) {
                formatted += formattedValue.slice(i, i + 4) + " ";
            }
            setCardData((prev) => ({ ...prev, [name]: formatted.trim() }));
            return;
        }

        if (name === "card_expiry") {
            const digits = value.replace(/\D/g, "").slice(0, 4);
            let formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
            setCardData((prev) => ({ ...prev, [name]: formatted }));
            return;
        }

        if (name === "cvv") {
            const cvvValue = value.replace(/\D/g, "").slice(0, 4);
            setCardData((prev) => ({ ...prev, [name]: cvvValue }));
            return;
        }

        setCardData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCardSelect = (cardId) => {
        if (selectedCardId === cardId) {
            setSelectedCardId(null);
            setCardData({ card_number: "", card_expiry: "", cardholder_name: "", cvv: "" });
        } else {
            setSelectedCardId(cardId);
            const selectedCard = savedCards.find((card) => card.card_id === cardId);
            if (selectedCard) {
                const maskedNumber = "**** **** **** " + selectedCard.card_number.slice(-4);
                setCardData({
                    card_number: maskedNumber,
                    card_expiry: selectedCard.card_expiry,
                    cardholder_name: selectedCard.cardholder_name,
                    cvv: "",
                });
            }
        }
    };

    const validateCardData = () => {
        if (selectedCardId) return cardData.cvv.length >= 3;
        const cardNumberWithoutSpaces = cardData.card_number.replace(/\s/g, "");
        return (
            cardNumberWithoutSpaces.length === 16 &&
            cardData.card_expiry.length === 5 &&
            cardData.cardholder_name.length >= 3 &&
            cardData.cvv.length >= 3
        );
    };

    const deleteCard = async (cardId) => {
        try {
            const response = await fetch(`${baseUrl}/api/cards/${cardId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to delete card");
            setSavedCards(savedCards.filter((card) => card.card_id !== cardId));
            if (selectedCardId === cardId) {
                setSelectedCardId(null);
                setCardData({ card_number: "", card_expiry: "", cardholder_name: "", cvv: "" });
            }
        } catch (err) {
            console.error("Delete card error:", err);
            setError(err.message);
        }
    };

    const placeOrder = async () => {
        if (!validateCardData()) {
            setError("Please enter valid card details");
            return;
        }

        setLoading(true);
        try {
            let cardId = selectedCardId;

            if (saveCardDetails && !selectedCardId) {
                const cardNumberWithoutSpaces = cardData.card_number.replace(/\s/g, "");
                const cardResponse = await fetch(`${baseUrl}/api/cards`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        cust_id: custId,
                        card_number: cardNumberWithoutSpaces,
                        card_expiry: cardData.card_expiry,
                        cardholder_name: cardData.cardholder_name,
                    }),
                });
                if (!cardResponse.ok) throw new Error("Failed to save card details");
                const newCardData = await cardResponse.json();
                cardId = newCardData.card_id;
            }

            const cartMasterId = cartItems.length > 0 ? cartItems[0].cart_master_id : null;
            if (!cartMasterId) throw new Error("Cart information missing");

            const paymentResponse = await fetch(`${baseUrl}/api/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    cart_master_id: cartMasterId,
                    cust_id: custId,
                    payment_amount: summary.total_amount,
                    payment_status: "completed",
                }),
            });

            if (!paymentResponse.ok) {
                const errorData = await paymentResponse.json();
                throw new Error(errorData.error || "Failed to process payment");
            }

            const paymentData = await paymentResponse.json();

            sessionStorage.removeItem("isBuyNow");
            sessionStorage.removeItem("buyNowCartId");

            navigate(`/payment-success/${paymentData.payment_id}`, { replace: true });
        } catch (err) {
            console.error("Payment processing error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="checkout-container"><div className="checkout-loading-spinner"></div></div>;

    const displayItems = cartItems.filter(
        (item) => item.cart_item_status === "active" && Number(item.quantity) > 0
    );

    return (
        <div className="checkout-container">
            <div className="checkout-bg-overlay"></div>
            <div className="checkout-content">
                <h1 className="checkout-title">Checkout</h1>
                <div className="checkout-progress">
                    <div className="progress-step completed">1. Shipping Address</div>
                    <div className="progress-step active">2. Payment</div>
                </div>
                {error && <div className="checkout-error-message">{error}</div>}
                <div className="checkout-flex-container">
                    <div className="checkout-summary-section">
                        <div className="checkout-card">
                            <h2 className="checkout-section-title">Order Summary</h2>
                            {addressData && (
                                <div className="checkout-address-summary">
                                    <h3 className="checkout-subsection-title">Shipping Address</h3>
                                    <div className="checkout-address-details">
                                        <p><strong>{addressData.f_name} {addressData.l_name}</strong></p>
                                        <p>{addressData.house_add}</p>
                                        {addressData.area_add && <p>{addressData.area_add}</p>}
                                        <p>{addressData.city}, {addressData.state} {addressData.pincode}</p>
                                        <p>Phone: {addressData.phone_number}</p>
                                    </div>
                                    <div className="checkout-address-actions">
                                        <button
                                            type="button"
                                            className="checkout-link-button"
                                            onClick={() => navigate("/checkout")}
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="checkout-items-list">
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => {
                                        const discount = item.discount_percentage || 0;
                                        const discountedPrice = discount
                                            ? (item.price_per_item * (1 - discount / 100)).toFixed(2)
                                            : item.price_per_item;
                                        const totalPrice = (discountedPrice * item.quantity).toFixed(2);
                                        return (
                                            <div
                                                key={item.cart_child_id || `item-${item.item_id}`}
                                                className="checkout-item"
                                            >
                                                <div className="checkout-item-image">
                                                    <img
                                                        src={
                                                            item.img_url
                                                                ? item.img_url.startsWith("http")
                                                                    ? item.img_url
                                                                    : `${baseUrl}/uploads/${item.img_url}`
                                                                : "/placeholder-image.jpg"
                                                        }
                                                        alt={item.item_name || "Product"}
                                                        onError={(e) => (e.target.src = "/placeholder-image.jpg")}
                                                    />
                                                </div>
                                                <div className="checkout-item-details">
                                                    <h3 className="checkout-item-name">{item.item_name || "Product"}</h3>
                                                    {item.size && <p className="checkout-item-size">Size: {item.size}</p>}
                                                    <p className="checkout-item-price">
                                                        ₹{discountedPrice} × {item.quantity}
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
                                                <div className="checkout-item-total">₹{totalPrice}</div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="checkout-empty-cart"><p>No items in cart.</p></div>
                                )}
                            </div>
                            <div className="checkout-summary-totals">
                                <div className="checkout-summary-row">
                                    <span>Subtotal ({summary.total_quantity} items)</span>
                                    <span>₹{Number(summary.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="checkout-summary-row">
                                    <span>Shipping</span>
                                    <span>₹0.00</span>
                                </div>
                                <div className="checkout-summary-row">
                                    <span>Tax</span>
                                    <span>₹0.00</span>
                                </div>
                                <div className="checkout-summary-row total">
                                    <span>Total</span>
                                    <span>₹{Number(summary.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="checkout-payment-section">
                        <div className="checkout-card">
                            <h2 className="checkout-section-title">Payment Details</h2>
                            {savedCards.length > 0 && (
                                <div className="checkout-saved-cards">
                                    <h3 className="checkout-subsection-title">Your Saved Cards</h3>
                                    {savedCards.length >= 4 && (
                                        <div className="checkout-info-message">
                                            You've reached the maximum of 4 saved cards. Delete a card to add a new one.
                                        </div>
                                    )}
                                    <div className="checkout-cards-list">
                                        {savedCards.map((card) => (
                                            <div
                                                key={card.card_id}
                                                className={`checkout-saved-card ${selectedCardId === card.card_id ? "selected" : ""}`}
                                            >
                                                <div
                                                    className="checkout-card-content"
                                                    onClick={() => handleCardSelect(card.card_id)}
                                                >
                                                    <div className="checkout-card-icon">💳</div>
                                                    <div className="checkout-card-details">
                                                        <div className="checkout-card-number">
                                                            **** **** **** {card.card_number.slice(-4)}
                                                        </div>
                                                        <div className="checkout-card-name">{card.cardholder_name}</div>
                                                        <div className="checkout-card-expiry">Expires: {card.card_expiry}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="checkout-card-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteCard(card.card_id);
                                                    }}
                                                    title="Delete card"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="checkout-or-divider"><span>OR</span></div>
                                </div>
                            )}
                            <form className="checkout-form">
                                <h3 className="checkout-subsection-title">
                                    {selectedCardId ? "Verify Card Details" : "Enter Card Details"}
                                </h3>
                                <div className="checkout-form-group">
                                    <label className="checkout-label">Card Number</label>
                                    <input
                                        type="text"
                                        name="card_number"
                                        className="checkout-input"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardData.card_number}
                                        onChange={handleInputChange}
                                        readOnly={!!selectedCardId}
                                        required
                                    />
                                </div>
                                <div className="checkout-form-row">
                                    <div className="checkout-form-group">
                                        <label className="checkout-label">Expiry Date</label>
                                        <input
                                            type="text"
                                            name="card_expiry"
                                            className="checkout-input"
                                            placeholder="MM/YY"
                                            value={cardData.card_expiry}
                                            onChange={handleInputChange}
                                            readOnly={!!selectedCardId}
                                            required
                                        />
                                    </div>
                                    <div className="checkout-form-group">
                                        <label className="checkout-label">CVV</label>
                                        <input
                                            type="text"
                                            name="cvv"
                                            className="checkout-input"
                                            placeholder="123"
                                            value={cardData.cvv}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="checkout-form-group">
                                    <label className="checkout-label">Cardholder Name</label>
                                    <input
                                        type="text"
                                        name="cardholder_name"
                                        className="checkout-input"
                                        placeholder="John Doe"
                                        value={cardData.cardholder_name}
                                        onChange={handleInputChange}
                                        readOnly={!!selectedCardId}
                                        required
                                    />
                                </div>
                                {!selectedCardId && (
                                    <div className="checkout-form-group checkout-checkbox">
                                        <input
                                            type="checkbox"
                                            id="saveCard"
                                            checked={saveCardDetails}
                                            onChange={() => setSaveCardDetails(!saveCardDetails)}
                                            disabled={savedCards.length >= 4}
                                        />
                                        <label htmlFor="saveCard" className="checkout-checkbox-label">
                                            Save card for future purchases (CVV will not be saved)
                                            {savedCards.length >= 4 && " - Maximum limit reached"}
                                        </label>
                                    </div>
                                )}
                                <div className="checkout-actions">
                                    <button
                                        type="button"
                                        className="checkout-button secondary"
                                        onClick={() => navigate("/checkout")}
                                    >
                                        Back to Address
                                    </button>
                                    <button
                                        type="button"
                                        className="checkout-button primary"
                                        onClick={placeOrder}
                                        disabled={displayItems.length === 0 || loading}
                                    >
                                        {loading ? "Processing..." : "Place Order"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPaymentPage;