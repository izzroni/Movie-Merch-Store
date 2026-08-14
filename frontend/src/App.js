import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import LoginSignupPage from './components/LoginSignupPage';
import Notifications from './components/Notifications';
import Profile from './components/Profile';
import AdminDashboard from './components/admin/AdminDashboard';
import CourierManagement from "./components/admin/CourierManagement";
import CourierDashboard from './components/admin/CourierDashboard';
import CourierAssignment from './components/admin/CourierAssignment';
import CategoryManagement from "./components/admin/CategoryManagement";
import SubcategoryManagement from "./components/admin/SubcategoryManagement";
import AddItem from "./components/admin/AddItem";
import ManageItems from "./components/admin/ManageItems";
import EditItem from "./components/admin/EditItem";
import CartPage from './components/CartPage';
import CheckoutAddressPage from './components/CheckoutAddressPage';
import CheckoutPaymentPage from './components/CheckoutPaymentPage';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import ProductDetail from "./components/ProductDetail";
import OrderHistory from './components/OrderHistory';
import DeliveryTracking from "./components/DeliveryTracking";
import Shop from "./components/Shop";
import CategoriesPage from "./components/CategoriesPage";
import SalesPage from "./components/SalesPage";
import Wishlist from "./components/wishlist";
import AboutUs from "./components/AboutUs"; // Add this import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/product/:itemId" element={<ProductDetail />} />
        <Route path="/login" element={<LoginSignupPage />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/courier-dashboard" element={<CourierDashboard />} />
        <Route path="/courier-management" element={<CourierManagement />} />
        <Route path="/courier-assignment" element={<CourierAssignment />} />
        <Route path="/admin/categories" element={<CategoryManagement />} />
        <Route path="/admin/subcategories" element={<SubcategoryManagement />} />
        <Route path="/add-item" element={<AddItem />} />
        <Route path="/manage-items" element={<ManageItems />} />
        <Route path="/edit-item/:id" element={<EditItem />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<CheckoutAddressPage />} />
        <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
        <Route path="/payment-success/:paymentId" element={<PaymentSuccessPage />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/track-delivery/:cartMasterId" element={<DeliveryTracking />} />
        <Route path="/about-us" element={<AboutUs />} /> {/* Add this route */}
      </Routes>
    </Router>
  );
}

export default App;