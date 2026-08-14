-- Capes and Creeps Database Schema
-- Database Name: moviestore1

CREATE DATABASE IF NOT EXISTS moviestore1;
USE moviestore1;

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS tbl_customers (
    cust_id INT AUTO_INCREMENT PRIMARY KEY,
    f_name VARCHAR(100) NOT NULL,
    l_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    house_add VARCHAR(255),
    area_add VARCHAR(255),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    cust_status ENUM('Active', 'Inactive') DEFAULT 'Active',
    cust_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) DEFAULT 'customer',
    profile_pic VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Admin User (admin@yahoo.com / adminpassword)
INSERT INTO tbl_customers (f_name, l_name, email, password, role, cust_status, cust_date)
SELECT 'Admin', 'User', 'admin@yahoo.com', '$2a$10$wpMLotwAFlyMAY5Q5YqCBuMZ4iH/ClC6SBzu9bxeb3RUzqiKhkgUC', 'admin', 'Active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM tbl_customers WHERE email = 'admin@yahoo.com');


-- 2. Couriers Table
CREATE TABLE IF NOT EXISTS tbl_courier (
    courier_id INT AUTO_INCREMENT PRIMARY KEY,
    courier_name VARCHAR(100) NOT NULL,
    courier_email VARCHAR(150) NOT NULL UNIQUE,
    courier_password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    courier_state VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 3. Categories Table
CREATE TABLE IF NOT EXISTS tbl_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    cat_date DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 4. Subcategories Table
CREATE TABLE IF NOT EXISTS tbl_subcategory (
    subcategory_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_name VARCHAR(100) NOT NULL,
    subcat_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES tbl_category(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 5. Items Table
CREATE TABLE IF NOT EXISTS tbl_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    subcategory_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    batch_no VARCHAR(100),
    expiry_date DATE,
    item_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    img_url VARCHAR(255),
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    sizes VARCHAR(255),
    FOREIGN KEY (subcategory_id) REFERENCES tbl_subcategory(subcategory_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 6. Cart Master Table
CREATE TABLE IF NOT EXISTS tbl_cart_master (
    cart_master_id INT AUTO_INCREMENT PRIMARY KEY,
    cust_id INT NOT NULL,
    cart_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    cart_status VARCHAR(50) NOT NULL DEFAULT 'active',
    cart_tot_amt DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (cust_id) REFERENCES tbl_customers(cust_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 7. Cart Child Table
CREATE TABLE IF NOT EXISTS tbl_cart_child (
    cart_child_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_master_id INT,
    item_id INT NOT NULL,
    price_per_item DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    cart_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    cart_item_status VARCHAR(50) DEFAULT 'active',
    size VARCHAR(50),
    FOREIGN KEY (cart_master_id) REFERENCES tbl_cart_master(cart_master_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES tbl_items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 8. Card Table (Saved Payments)
CREATE TABLE IF NOT EXISTS tbl_card (
    card_id INT AUTO_INCREMENT PRIMARY KEY,
    cust_id INT NOT NULL,
    card_number VARCHAR(50) NOT NULL,
    card_expiry DATE NOT NULL,
    cardholder_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (cust_id) REFERENCES tbl_customers(cust_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 9. Payments Table
CREATE TABLE IF NOT EXISTS tbl_payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_master_id INT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'completed',
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_master_id) REFERENCES tbl_cart_master(cart_master_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 10. Courier Assignments Table
CREATE TABLE IF NOT EXISTS tbl_cassign (
    cassign_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_master_id INT NOT NULL,
    courier_id INT NOT NULL,
    cassign_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (cart_master_id) REFERENCES tbl_cart_master(cart_master_id) ON DELETE CASCADE,
    FOREIGN KEY (courier_id) REFERENCES tbl_courier(courier_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 11. Deliveries Table
CREATE TABLE IF NOT EXISTS tbl_delivery (
    del_id INT AUTO_INCREMENT PRIMARY KEY,
    cassign_id INT NOT NULL,
    del_status VARCHAR(50) DEFAULT 'Pending',
    del_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cassign_id) REFERENCES tbl_cassign(cassign_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 12. Wishlists Table
CREATE TABLE IF NOT EXISTS tbl_wishlist (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    cust_id INT NOT NULL,
    item_id INT NOT NULL,
    wishlist_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cust_id) REFERENCES tbl_customers(cust_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES tbl_items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS tbl_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cust_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cust_id) REFERENCES tbl_customers(cust_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 14. Feedbacks Table
CREATE TABLE IF NOT EXISTS tbl_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    cust_id INT NOT NULL,
    item_id INT NOT NULL,
    feedback_text TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    fb_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cust_id) REFERENCES tbl_customers(cust_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES tbl_items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
