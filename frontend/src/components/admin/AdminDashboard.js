import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./adminDashboard.css";
import CourierManagement from "./CourierManagement";
import CourierAssignment from "./CourierAssignment";
import DeliveryManagement from "./DeliveryManagement";
import FeedbackManagement from "./FeedbackManagement";
import CategoryManagement from "./CategoryManagement";
import SubcategoryManagement from "./SubcategoryManagement";
import CustomerManagement from "./CustomerManagement";
import RestockAvailability from "./RestockAvailability";
import ReportGeneration from "./ReportGeneration";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalRevenue: "0.00",
    totalProducts: 0,
    mostSoldProduct: { item_name: "Loading...", total_quantity_sold: 0 },
    leastSoldProduct: { item_name: "Loading...", total_quantity_sold: 0 },
    bestSellingCategory: { category_name: "Loading...", total_quantity_sold: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    endDate: new Date(),
  });

  // Add functions for reset and presets
  const resetDateRange = () => {
    setDateRange({
      startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      endDate: new Date(),
    });
  };

  const setLast30Days = () => {
    setDateRange({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
    });
  };

  const setThisYear = () => {
    setDateRange({
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(),
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const startDateStr = dateRange.startDate.toISOString().split("T")[0];
        const endDateStr = dateRange.endDate.toISOString().split("T")[0];

        // Fetch Total Orders
        const ordersRes = await fetch("http://localhost:5000/api/payments/completed", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ordersData = await ordersRes.json();
        if (!ordersRes.ok) throw new Error(ordersData.message || "Failed to fetch orders");

        // Fetch Total Revenue
        const revenueRes = await fetch(
          `http://localhost:5000/api/reports/sales?startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const revenueData = await revenueRes.json();
        if (!revenueRes.ok) throw new Error(revenueData.error || "Failed to fetch revenue");

        // Fetch Total Products
        const productsRes = await fetch("http://localhost:5000/api/items", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const productsData = await productsRes.json();
        if (!productsRes.ok) throw new Error(productsData.error || "Failed to fetch products");

        // Fetch Most Sold Product
        const mostSoldRes = await fetch(
          `http://localhost:5000/api/reports/most-sold-product?startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const mostSoldData = await mostSoldRes.json();
        if (!mostSoldRes.ok) throw new Error(mostSoldData.error || "Failed to fetch most sold product");

        // Fetch Least Sold Product
        const leastSoldRes = await fetch(
          `http://localhost:5000/api/reports/least-sold-product?startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const leastSoldData = await leastSoldRes.json();
        if (!leastSoldRes.ok) throw new Error(leastSoldData.error || "Failed to fetch least sold product");

        // Fetch Best Selling Category
        const categoryRes = await fetch(
          `http://localhost:5000/api/reports/best-selling-category?startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const categoryData = await categoryRes.json();
        if (!categoryRes.ok) throw new Error(categoryData.error || "Failed to fetch best selling category");

        setDashboardData({
          totalOrders: ordersData.length,
          totalRevenue: revenueData.summary.totalSales,
          totalProducts: productsData.length,
          mostSoldProduct: mostSoldData,
          leastSoldProduct: leastSoldData,
          bestSellingCategory: categoryData,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (activePage === "dashboard") {
      fetchDashboardData();
    }
  }, [activePage, dateRange]);

  const handleAddItem = () => {
    navigate("/add-item");
  };

  const renderContent = () => {
    switch (activePage) {
      case "courier":
        return <CourierManagement />;
      case "courier-assignment":
        return <CourierAssignment />;
      case "delivery-management":
        return <DeliveryManagement />;
      case "feedback-management":
        return <FeedbackManagement />;
      case "category-management":
        return <CategoryManagement />;
      case "subcategory-management":
        return <SubcategoryManagement />;
      case "customer-management":
        return <CustomerManagement />;
      case "restock-availability":
        return <RestockAvailability />;
      case "reports":
        return <ReportGeneration />;
      case "dashboard":
      default:
        return (
          <>
            <h1>Welcome to the Admin Dashboard</h1>
            <div className="date-range-picker">
              <label>Start Date: </label>
              <DatePicker
                selected={dateRange.startDate}
                onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                dateFormat="yyyy-MM-dd"
                maxDate={dateRange.endDate}
                className="date-picker-input"
              />
              <label>End Date: </label>
              <DatePicker
                selected={dateRange.endDate}
                onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                dateFormat="yyyy-MM-dd"
                minDate={dateRange.startDate}
                maxDate={new Date()}
                className="date-picker-input"
              />
              <button onClick={resetDateRange} className="reset-date-btn">Reset</button>
              <button onClick={setLast30Days} className="preset-btn">Last 30 Days</button>
              <button onClick={setThisYear} className="preset-btn">This Year</button>
            </div>
            {loading && <p>Loading dashboard data...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && (
              <div className="cadashboard-overview">
                <div className="castats-card">
                  <h3>Total Orders</h3>
                  <p>{dashboardData.totalOrders}</p>
                </div>
                <div className="castats-card">
                  <h3>Total Revenue</h3>
                  <p>₹{dashboardData.totalRevenue}</p>
                </div>
                <div className="castats-card">
                  <h3>Total Products</h3>
                  <p>{dashboardData.totalProducts}</p>
                </div>
                <div className="castats-card">
                  <h3>Most Sold Product</h3>
                  <p>{dashboardData.mostSoldProduct.item_name}</p>
                  <small>{dashboardData.mostSoldProduct.total_quantity_sold} units sold</small>
                </div>
                <div className="castats-card">
                  <h3>Least Sold Product</h3>
                  <p>{dashboardData.leastSoldProduct.item_name}</p>
                  <small>{dashboardData.leastSoldProduct.total_quantity_sold} units sold</small>
                </div>
                <div className="castats-card">
                  <h3>Best Selling Category</h3>
                  <p>{dashboardData.bestSellingCategory.category_name}</p>
                  <small>{dashboardData.bestSellingCategory.total_quantity_sold} units</small>
                </div>
              </div>
            )}
            <div className="caquick-actions">
              <h2>Quick Actions</h2>
              <div className="caquick-action-buttons">
                <button onClick={handleAddItem}>Add New Item</button>
                <button onClick={() => navigate("/manage-items")}>Manage Items</button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="cadmin-dashboard">
      <div className="csidebar">
        <div className="ologo">
          <img src="/images/logo1.png" alt="Logo" />
        </div>
        <ul className="csidebar-links">
          <li>
            <button onClick={() => setActivePage("dashboard")} className={activePage === "dashboard" ? "active" : ""}>
              Dashboard
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("courier")} className={activePage === "courier" ? "active" : ""}>
              Courier Management
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("category-management")} className={activePage === "category-management" ? "active" : ""}>
              Category Management
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("subcategory-management")} className={activePage === "subcategory-management" ? "active" : ""}>
              Subcategory Management
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("customer-management")} className={activePage === "customer-management" ? "active" : ""}>
              Customer Management
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("courier-assignment")} className={activePage === "courier-assignment" ? "active" : ""}>
              Courier Assignment
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("delivery-management")} className={activePage === "delivery-management" ? "active" : ""}>
              Delivery Management
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("feedback-management")} className={activePage === "feedback-management" ? "active" : ""}>
              Feedback Management
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("restock-availability")} className={activePage === "restock-availability" ? "active" : ""}>
              Restock Availability
            </button>
          </li>
          <li>
            <button onClick={() => setActivePage("reports")} className={activePage === "reports" ? "active" : ""}>
              Reports
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("isAdmin");
                localStorage.removeItem("user");
                navigate("/");
              }}
            >
              Log Out
            </button>
          </li>
        </ul>
      </div>
      <div className="cadashboard-content">{renderContent()}</div>
    </div>
  );
};

export default AdminDashboard;
