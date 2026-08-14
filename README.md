# Movie Merch Store (Capes and Creeps)

**Movie Merch Store** is a direct-to-consumer (DTC) e-commerce platform specializing in horror and superhero-themed merchandise. The platform provides a seamless shopping experience for movie fans while offering management tools for store administrators and in-house delivery teams.

---

## 🌟 Features & System Modules

### 👤 1. User & Authentication Management
- Secure Registration and Login with encrypted passwords (bcrypt).
- Role-based Access Control: **Customer**, **Administrator**, and **Courier**.
- Profile management with custom profile picture uploads and address handling.

### 📦 2. Product Management
- **Category & Subcategory Organization**: Product categorization across Apparel (Hoodies, T-Shirts), Collectibles (Action Figures, Masks), Accessories (Keychains, Bag Pins), and Posters & Wall Art.
- **Inventory & Item Control**: Manage item details, stock quantities, size variants (XS-XXXL), batch numbers, expiry dates, and discount percentages.

### 🛒 3. Shopping, Cart & Wishlist
- **Product Listing & Filtering**: Real-time search, category filtering, subcategory filtering, and sorting (price low-to-high, high-to-low, name A-Z).
- **Interactive Wishlist**: Save favorite items for future purchases.
- **Cart & Checkout**: Multi-item cart management, price calculation with discount application, size selection for apparel, and address/payment confirmation.

### 🚚 4. Courier & Delivery Management
- **Dedicated Courier Dashboard**: Couriers can log in to view assigned delivery orders, customer delivery addresses, and update shipment status (*Pending*, *In Progress*, *Delivered*).
- **Courier Assignment**: Admin panel for assigning pending orders to available couriers.
- **Delivery Tracking**: Customers can track real-time delivery status for their orders.

### 📊 5. Sales & Report Generation
- **Admin Dashboard**: Comprehensive analytics including Total Sales, Total Transactions, Most Sold Products, Least Sold Products, Best Selling Categories, and Out of Stock Alerts.
- **Exportable PDF Reports**: Downloadable Sales Reports and Inventory Reports with custom date ranges.

### 💬 6. Customer Feedback
- Ratings (1–5 stars) and reviews on purchased items.

---

## 🛠️ Technology Stack

- **Front-End**: React.js, React Router, CSS3, Lucide React Icons
- **Back-End**: Node.js, Express.js, JSON Web Tokens (JWT), Multer (File Uploads)
- **Database**: MySQL / Embedded SQLite (Auto-provisioning fallback)

---

## 💻 Hardware & Software Requirements

### Hardware Specifications
- **Processor**: Intel Core i5 (3.3 GHz) or above
- **RAM**: 4 GB or above
- **Storage**: 512 GB or above

### Software Specifications
- **Operating System**: Windows 7/8/8.1/10/11
- **Environment**: Node.js (v16+), npm

---

## 🚀 Installation & Running Locally

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.name.git
cd YOUR_REPOSITORY.name
```

### 2. Install Dependencies
Install dependencies for root, backend, and frontend:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Run the Application
Start both the Backend API server (Port 5000) and Frontend React application (Port 3000) with a single command:

```bash
npm start
```
*Alternatively, you can run `node start-all.js` directly.*

### 4. Access URLs
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Default Credentials

- **Admin Account**: `admin@yahoo.com` / `adminpassword`
- **Courier Account**: `courier@yahoo.com` / `courierpassword`
- **Customer Account**: Register via the Sign Up page or use `customer@yahoo.com`
