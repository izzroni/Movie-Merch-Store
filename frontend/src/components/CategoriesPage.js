import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/categories.css";
import Navbar from "./Navbar";
import Footer from "./Footer";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const cachedCategories = useMemo(() => categories, [categories]);

  const fetchCategories = async (retryCount = 2) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/categories`);
      const categoriesData = response.data;

      const categoriesWithSubs = await Promise.all(
        categoriesData.map(async (category) => {
          try {
            const subResponse = await axios.get(`${API_URL}/subcategories/${category.category_id}`);
            return { ...category, subcategories: subResponse.data || [] };
          } catch (subError) {
            console.error(`Failed to fetch subcategories for ${category.category_name}:`, subError);
            return { ...category, subcategories: [] };
          }
        })
      );
      setCategories(categoriesWithSubs);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      if (retryCount > 0) {
        setTimeout(() => fetchCategories(retryCount - 1), 1000);
      } else {
        setError("Could not load categories. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryName) => {
    navigate(`/shop?category=${encodeURIComponent(categoryName)}`);
  };

  const handleSubcategoryClick = (subcategoryName) => {
    navigate(`/shop?subcategory=${encodeURIComponent(subcategoryName)}`);
  };

  if (loading) {
    return (
      <div className="categories-wrapper">
        <Navbar isShopPage={true} />
        <div className="cat-container">
          <div className="cat-loading" role="status" aria-live="polite">
            <div className="cat-spinner" aria-hidden="true"></div>
            <p>Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="categories-wrapper">
        <Navbar isShopPage={true} />
        <div className="cat-container">
          <p className="cat-no-results" role="alert">
            {error} <button onClick={() => fetchCategories()} className="cat-retry-button">Retry</button>
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="categories-wrapper">
      <Navbar isShopPage={true} />
      <div className="cat-container">
        <div className="cat-categories-grid" role="grid">
          {cachedCategories.length > 0 ? (
            cachedCategories.map((category) => (
              <div key={category.category_id} className="cat-category-card" role="gridcell">
                <div
                  className="cat-category-clickable"
                  onClick={() => handleCategoryClick(category.category_name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCategoryClick(category.category_name);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Explore ${category.category_name}`}
                >
                  <h3 className="cat-category-name">{category.category_name}</h3>
                </div>
                <div className="cat-subcategories-list" role="list">
                  {category.subcategories.length > 0 ? (
                    category.subcategories.map((sub) => (
                      <div
                        key={sub.subcategory_id}
                        className="cat-subcategory-item"
                        onClick={() => handleSubcategoryClick(sub.subcategory_name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSubcategoryClick(sub.subcategory_name);
                          }
                        }}
                        tabIndex={0}
                        role="listitem"
                        aria-label={`View ${sub.subcategory_name}`}
                      >
                        {sub.subcategory_name}
                      </div>
                    ))
                  ) : (
                    <p className="cat-no-subcategories">No subcategories</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="cat-no-results">No categories available</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CategoriesPage;