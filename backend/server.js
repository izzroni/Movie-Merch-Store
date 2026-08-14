const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Secure HTTP headers (allowing cross-origin resource sharing for static media uploads)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Rate limiter for authentication routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/login", authLimiter);
app.use("/api/signup", authLimiter);
app.use("/api/courier/login", authLimiter);

const db = require("./db");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Not an image! Please upload an image."), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const verifyAdmin = (req, res, next) => {
  const tokenHeader = req.headers.authorization;
  if (!tokenHeader || !tokenHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided or token format invalid" });
  }
  const token = tokenHeader.split(" ")[1].trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key");
    if (!decoded.isAdmin) return res.status(403).json({ error: "Access denied. Admins only." });
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user; // This sets req.user.courier_id
    next();
  });
}

db.getConnection((err, connection) => {
  if (err) console.error("Database connection failed: ", err.message);
  else {
    console.log("Connected to MySQL");
    connection.release();
  }
});

// Signup Route
app.post("/api/signup", async (req, res) => {
  const { f_name, l_name, email, phone_number, password, house_add, area_add, state, city, pincode } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO tbl_customers (f_name, l_name, email, phone_number, password, house_add, area_add, state, city, pincode, cust_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    db.query(query, [f_name, l_name, email, phone_number, hashedPassword, house_add, area_add, state, city, pincode], (err) => {
      if (err) return res.status(500).json({ error: "Error creating account." });
      res.status(201).json({ message: "Account created successfully!" });
    });
  } catch (error) {
    res.status(500).json({ error: "Error hashing password." });
  }
});

// Login Route
// Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // Check couriers first
  db.query(`SELECT * FROM tbl_courier WHERE courier_email = ?`, [email], async (err, courierResult) => {
    if (courierResult.length > 0) {
      const courier = courierResult[0];
      const isMatch = await bcrypt.compare(password, courier.courier_password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password." });

      const token = jwt.sign(
        { courier_id: courier.courier_id, isCourier: true },
        process.env.JWT_SECRET || "your_jwt_secret_key",
        { expiresIn: "1h" }
      );

      const userData = {
        courier_id: courier.courier_id,
        f_name: courier.courier_name,
        email: courier.courier_email,
        role: "courier"
      };

      return res.status(200).json({
        token,
        isAdmin: false,
        isCourier: true,
        user: userData
      });
    }

    // Check customers if no courier found
    db.query(`SELECT * FROM tbl_customers WHERE email = ?`, [email], async (err, customerResult) => {
      if (customerResult.length === 0) return res.status(404).json({ error: "User not found." });

      const customer = customerResult[0];

      // Check if the customer's status is Active
      if (customer.cust_status === "Inactive") {
        return res.status(403).json({ error: "Account is inactive. Please contact support." });
      }

      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password." });

      const token = jwt.sign(
        { userId: customer.cust_id, isAdmin: customer.role === "admin" },
        process.env.JWT_SECRET || "your_jwt_secret_key",
        { expiresIn: "1h" }
      );

      const userData = {
        cust_id: customer.cust_id,
        f_name: customer.f_name,
        email: customer.email,
        role: customer.role
      };

      return res.status(200).json({
        token,
        isAdmin: customer.role === "admin",
        isCourier: false,
        user: userData
      });
    });
  });
});

// Get all customers (Admin only)
// Get all customers (Admin only) - Only 'customer' role
app.get("/api/customers", verifyAdmin, async (req, res) => {
  try {
    const [customers] = await db.promise().query(
      "SELECT cust_id, f_name, l_name, email, phone_number, house_add, area_add, state, city, pincode, cust_status, cust_date AS created_at FROM tbl_customers WHERE cust_status IN ('Active', 'Inactive') AND role = 'customer'"
    );
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Update customer status (Admin only)
app.put("/api/customers/:custId/status", verifyAdmin, async (req, res) => {
  const { custId } = req.params;
  const { status } = req.body;

  if (!status || !["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value. Use 'Active' or 'Inactive'" });
  }

  try {
    const [result] = await db.promise().query(
      "UPDATE tbl_customers SET cust_status = ? WHERE cust_id = ?",
      [status, custId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ message: "Customer status updated successfully" });
  } catch (error) {
    console.error("Error updating customer status:", error);
    res.status(500).json({ error: "Failed to update customer status" });
  }
});

// Profile Route
app.get("/profile", (req, res) => {
  const tokenHeader = req.headers.authorization;
  if (!tokenHeader || !tokenHeader.startsWith("Bearer ")) return res.status(403).json({ error: "No token provided." });
  const token = tokenHeader.split(" ")[1].trim();
  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token." });
    db.query(`SELECT * FROM tbl_customers WHERE id = ?`, [decoded.userId], (err, result) => {
      if (err) return res.status(500).json({ error: "Error fetching user data." });
      res.status(200).json(result[0]);
    });
  });
});

// Category Routes
app.post("/api/categories", (req, res) => {
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ error: "Category name required" });
  const sql = "INSERT INTO tbl_category (category_name, cat_date) VALUES (?, NOW())";
  db.query(sql, [category_name], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json({ message: "Category added successfully", categoryId: result.insertId });
  });
});

app.get("/api/categories", (req, res) => {
  const sql = "SELECT * FROM tbl_category ORDER BY cat_date DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    res.status(200).json(results);
  });
});

// Edit Category
app.put("/api/categories/:categoryId", verifyAdmin, (req, res) => {
  const { categoryId } = req.params;
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ error: "Category name is required" });

  const sql = "UPDATE tbl_category SET category_name = ? WHERE category_id = ?";
  db.query(sql, [category_name, categoryId], (err, result) => {
    if (err) {
      console.error("Error updating category:", err);
      return res.status(500).json({ error: "Server error" });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category updated successfully" });
  });
});

// Delete Category
app.delete("/api/categories/:categoryId", verifyAdmin, (req, res) => {
  const { categoryId } = req.params;

  // Check for dependent subcategories
  db.query("SELECT COUNT(*) as subcatCount FROM tbl_subcategory WHERE category_id = ?", [categoryId], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (result[0].subcatCount > 0) return res.status(400).json({ error: "Cannot delete category with subcategories" });

    const sql = "DELETE FROM tbl_category WHERE category_id = ?";
    db.query(sql, [categoryId], (err, result) => {
      if (err) {
        console.error("Error deleting category:", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: "Category not found" });
      res.json({ message: "Category deleted successfully" });
    });
  });
});
// Subcategory Routes
app.post("/api/subcategories", (req, res) => {
  const { category_id, subcategory_name } = req.body;
  if (!category_id || !subcategory_name) return res.status(400).json({ error: "All fields required" });
  const sql = "INSERT INTO tbl_subcategory (category_id, subcategory_name, subcat_date) VALUES (?, ?, NOW())";
  db.query(sql, [category_id, subcategory_name], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.json({ message: "Subcategory added successfully", subcategoryId: result.insertId });
  });
});



app.get("/api/subcategories/:category_id", (req, res) => {
  const { category_id } = req.params;
  const sql = "SELECT * FROM tbl_subcategory WHERE category_id = ? ORDER BY subcat_date DESC";
  db.query(sql, [category_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    res.status(200).json(results);
  });
});

app.get("/api/subcategories", (req, res) => {
  const sql = "SELECT subcategory_id, category_id, subcategory_name, subcat_date FROM tbl_subcategory ORDER BY subcat_date DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.status(200).json(results);
  });
});

// Edit Subcategory
app.put("/api/subcategories/:subcategoryId", verifyAdmin, (req, res) => {
  const { subcategoryId } = req.params;
  const { category_id, subcategory_name } = req.body;
  if (!category_id || !subcategory_name) return res.status(400).json({ error: "Category ID and subcategory name are required" });

  // Verify category exists
  db.query("SELECT category_id FROM tbl_category WHERE category_id = ?", [category_id], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (result.length === 0) return res.status(400).json({ error: "Invalid category ID" });

    const sql = "UPDATE tbl_subcategory SET category_id = ?, subcategory_name = ? WHERE subcategory_id = ?";
    db.query(sql, [category_id, subcategory_name, subcategoryId], (err, result) => {
      if (err) {
        console.error("Error updating subcategory:", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: "Subcategory not found" });
      res.json({ message: "Subcategory updated successfully" });
    });
  });
});

// Delete Subcategory
app.delete("/api/subcategories/:subcategoryId", verifyAdmin, (req, res) => {
  const { subcategoryId } = req.params;

  // Check for dependent items
  db.query("SELECT COUNT(*) as itemCount FROM tbl_items WHERE subcategory_id = ?", [subcategoryId], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (result[0].itemCount > 0) return res.status(400).json({ error: "Cannot delete subcategory with items" });

    const sql = "DELETE FROM tbl_subcategory WHERE subcategory_id = ?";
    db.query(sql, [subcategoryId], (err, result) => {
      if (err) {
        console.error("Error deleting subcategory:", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: "Subcategory not found" });
      res.json({ message: "Subcategory deleted successfully" });
    });
  });
});
//Item
app.get("/api/items", (req, res) => {
  let sql = `
      SELECT i.*, s.subcategory_name, c.category_name 
      FROM tbl_items i
      JOIN tbl_subcategory s ON i.subcategory_id = s.subcategory_id
      JOIN tbl_category c ON s.category_id = c.category_id
      WHERE i.expiry_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  `;
  sql += " ORDER BY i.item_added DESC";
  console.log("Executing SQL:", sql);
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error." });
    }
    console.log("Query results:", results);
    res.status(200).json(results);
  });
});
app.post("/api/items", verifyAdmin, upload.single("img_url"), (req, res) => {
  const { subcategory_id, item_name, description, price, stock_quantity, batch_no, expiry_date, discount_percentage, sizes } = req.body;
  if (!subcategory_id || !item_name || !description || !price || !batch_no || !expiry_date) {
    return res.status(400).json({ error: "All fields are required. Discount_percentage and sizes/stock_quantity are conditional." });
  }
  if (!req.file) return res.status(400).json({ error: "Image file is required." });

  db.query("SELECT subcategory_id, category_id FROM tbl_subcategory WHERE subcategory_id = ?", [subcategory_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length === 0) {
      fs.unlink(req.file.path, (unlinkErr) => console.error("Error deleting file:", unlinkErr));
      return res.status(400).json({ error: "Invalid subcategory_id." });
    }

    const categoryId = results[0].category_id;
    db.query("SELECT category_name FROM tbl_category WHERE category_id = ?", [categoryId], (err, catResult) => {
      if (err) return res.status(500).json({ error: "Server error" });
      const isApparel = catResult[0].category_name === "Apparel";

      if (isApparel && !sizes) {
        fs.unlink(req.file.path, (unlinkErr) => console.error("Error deleting file:", unlinkErr));
        return res.status(400).json({ error: "Sizes are required for apparel items." });
      }
      if (!isApparel && !stock_quantity) {
        fs.unlink(req.file.path, (unlinkErr) => console.error("Error deleting file:", unlinkErr));
        return res.status(400).json({ error: "Stock quantity is required for non-apparel items." });
      }

      const itemData = {
        subcategory_id: Number.parseInt(subcategory_id),
        item_name,
        description,
        price: Number.parseFloat(price),
        stock_quantity: isApparel ? null : Number.parseInt(stock_quantity),
        sizes: isApparel ? sizes : null,
        batch_no,
        expiry_date,
        discount_percentage: discount_percentage ? Number.parseFloat(discount_percentage) : 0,
        img_url: req.file.filename,
        item_added: new Date(),
      };

      const sql = `
        INSERT INTO tbl_items 
        (subcategory_id, item_name, description, price, stock_quantity, sizes, batch_no, expiry_date, discount_percentage, img_url, item_added)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sql, Object.values(itemData), (err, result) => {
        if (err) {
          fs.unlink(req.file.path, (unlinkErr) => console.error("Error deleting file:", unlinkErr));
          return res.status(500).json({ error: "Server error: " + err.message });
        }
        res.status(201).json({ message: "Item added successfully", itemId: result.insertId, item: itemData });
      });
    });
  });
});
app.delete("/api/items/:id", verifyAdmin, (req, res) => {
  const itemId = req.params.id;
  const sql = "DELETE FROM tbl_items WHERE item_id = ?";
  db.query(sql, [itemId], (err) => {
    if (err) return res.status(500).json({ error: "Server error." });
    res.json({ message: "Item deleted successfully" });
  });
});

app.put("/api/items/:id", verifyAdmin, upload.single("img_url"), (req, res) => {
  const itemId = req.params.id;
  const {
    item_name,
    description,
    price,
    stock_quantity,
    batch_no,
    expiry_date,
    subcategory_id,
    discount_percentage,
    sizes,
  } = req.body;
  const image = req.file ? req.file.filename : null;

  // Fetch the existing item to get current values
  db.query("SELECT * FROM tbl_items WHERE item_id = ?", [itemId], (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    if (result.length === 0) return res.status(404).json({ error: "Item not found" });

    const existingItem = result[0];
    const existingImage = existingItem.img_url;
    const currentSubcategoryId = existingItem.subcategory_id;

    // Determine the subcategory and category
    db.query(
      "SELECT category_id FROM tbl_subcategory WHERE subcategory_id = ?",
      [subcategory_id || currentSubcategoryId],
      (err, subcatResult) => {
        if (err) {
          console.error("Subcategory query error:", err);
          return res.status(500).json({ error: "Server error" });
        }
        if (subcatResult.length === 0) {
          return res.status(400).json({ error: "Invalid subcategory_id" });
        }

        const categoryId = subcatResult[0].category_id;
        db.query(
          "SELECT category_name FROM tbl_category WHERE category_id = ?",
          [categoryId],
          (err, catResult) => {
            if (err) {
              console.error("Category query error:", err);
              return res.status(500).json({ error: "Server error" });
            }

            const isApparel = catResult[0].category_name === "Apparel";

            // Prepare update fields dynamically
            const updateFields = {};
            if (item_name) updateFields.item_name = item_name;
            if (description) updateFields.description = description;
            if (price) updateFields.price = Number.parseFloat(price);
            if (batch_no) updateFields.batch_no = batch_no;
            if (expiry_date) updateFields.expiry_date = expiry_date;
            if (subcategory_id) updateFields.subcategory_id = subcategory_id;
            if (discount_percentage !== undefined)
              updateFields.discount_percentage = Number.parseFloat(discount_percentage);

            // Handle stock_quantity and sizes based on apparel status
            if (isApparel) {
              if (sizes) {
                try {
                  const parsedSizes = sizes.trim() ? JSON.parse(sizes) : {};
                  if (typeof parsedSizes !== "object" || Array.isArray(parsedSizes)) {
                    console.error("Invalid sizes format:", sizes);
                    return res.status(400).json({ error: "Invalid sizes format. Must be a valid JSON object." });
                  }
                  updateFields.sizes = JSON.stringify(parsedSizes);
                  updateFields.stock_quantity = null;
                } catch (e) {
                  console.error("JSON parsing error for sizes:", e, "Raw sizes:", sizes);
                  return res.status(400).json({ error: "Invalid JSON format for sizes." });
                }
              }
            } else {
              if (stock_quantity !== undefined) {
                updateFields.stock_quantity = Number.parseInt(stock_quantity);
                updateFields.sizes = null;
              }
            }

            if (image) {
              updateFields.img_url = image;
              if (existingImage) {
                const oldImagePath = path.join(__dirname, "uploads", existingImage);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
              }
            }

            // If no fields to update, return an error
            if (Object.keys(updateFields).length === 0) {
              return res.status(400).json({ error: "No fields provided to update" });
            }

            // Build the SQL query dynamically
            const fields = Object.keys(updateFields)
              .map((key) => `${key} = ?`)
              .join(", ");
            const values = [...Object.values(updateFields), itemId];

            const sql = `UPDATE tbl_items SET ${fields} WHERE item_id = ?`;

            console.log("Executing SQL:", sql);
            console.log("Values:", values);

            db.query(sql, values, (err) => {
              if (err) {
                console.error("Database update error:", err);
                return res.status(500).json({ error: "Server error: " + err.message });
              }
              console.log("Update successful for item:", itemId);
              res.json({ message: "Item updated successfully" });
            });
          }
        );
      }
    );
  });
});
app.get("/api/items/out-of-stock", verifyAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        i.item_id, 
        i.item_name, 
        i.description, 
        i.price, 
        i.stock_quantity, 
        i.sizes, 
        i.batch_no, 
        i.expiry_date, 
        i.subcategory_id, 
        i.discount_percentage, 
        i.img_url, 
        i.item_added, 
        s.subcategory_name, 
        c.category_name 
      FROM tbl_items i
      JOIN tbl_subcategory s ON i.subcategory_id = s.subcategory_id
      JOIN tbl_category c ON s.category_id = c.category_id
      WHERE i.expiry_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    `;
    
    const [items] = await db.promise().query(sql);

    const outOfStockItems = items.filter(item => {
      const isApparel = item.category_name === "Apparel";
      
      if (isApparel && item.sizes) {
        const parsedSizes = JSON.parse(item.sizes || "{}");
        return Object.values(parsedSizes).every(quantity => quantity === 0);
      } else {
        return item.stock_quantity === 0;
      }
    });

    res.status(200).json(outOfStockItems);
  } catch (error) {
    console.error("Error fetching out-of-stock items:", error);
    res.status(500).json({ error: "Failed to fetch out-of-stock items" });
  }
});
app.get("/api/items/:id", (req, res) => {
  const itemId = req.params.id;
  const sql = `
    SELECT i.*, s.subcategory_name, c.category_name 
    FROM tbl_items i
    JOIN tbl_subcategory s ON i.subcategory_id = s.subcategory_id
    JOIN tbl_category c ON s.category_id = c.category_id
    WHERE i.item_id = ? AND i.expiry_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  `;
  db.query(sql, [itemId], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (result.length === 0) return res.status(404).json({ error: "Item not found or expired" });
    const item = result[0];
    if (item.sizes && typeof item.sizes === "object") {
      item.sizes = JSON.stringify(item.sizes);
    }
    res.status(200).json(item);
  });
});

// Get out-of-stock items (Admin only)

app.post("/api/cart", async (req, res) => {
  const { cust_id, item_id, quantity, discount_percentage, buy_now, size } = req.body;
  let connection;

  if (!cust_id || !item_id || !quantity) {
    return res.status(400).json({ error: "Missing required fields: cust_id, item_id, and quantity are required" });
  }

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [itemResult] = await connection.query(
      "SELECT price, discount_percentage, stock_quantity, sizes, subcategory_id FROM tbl_items WHERE item_id = ?",
      [item_id]
    );
    if (itemResult.length === 0) throw new Error("Item not found");
    const { price, discount_percentage: dbDiscount, stock_quantity, sizes, subcategory_id } = itemResult[0];

    const [catResult] = await connection.query(
      "SELECT c.category_name FROM tbl_subcategory s JOIN tbl_category c ON s.category_id = c.category_id WHERE s.subcategory_id = ?",
      [subcategory_id]
    );
    const isApparel = catResult[0].category_name === "Apparel";

    let availableStock;
    if (isApparel) {
      if (!size) throw new Error("Size is required for apparel items");
      const parsedSizes = sizes ? JSON.parse(sizes) : {};
      if (!(size in parsedSizes)) throw new Error(`Size ${size} not available for this item`);
      availableStock = parsedSizes[size];
    } else {
      availableStock = stock_quantity;
    }

    const price_per_item = price;
    const itemDiscount = discount_percentage !== undefined ? Number.parseFloat(discount_percentage) : dbDiscount || 0;

    let cart_master_id;
    if (buy_now) {
      const [newCart] = await connection.query(
        "INSERT INTO tbl_cart_master (cust_id, cart_date, cart_status) VALUES (?, NOW(), 'buy_now')",
        [cust_id]
      );
      cart_master_id = newCart.insertId;
    } else {
      const [cartMaster] = await connection.query(
        "SELECT cart_master_id FROM tbl_cart_master WHERE cust_id = ? AND cart_status = 'active' ORDER BY cart_date DESC LIMIT 1",
        [cust_id]
      );
      if (cartMaster.length === 0) {
        const [newCart] = await connection.query(
          "INSERT INTO tbl_cart_master (cust_id, cart_date, cart_status) VALUES (?, NOW(), 'active')",
          [cust_id]
        );
        cart_master_id = newCart.insertId;
      } else {
        cart_master_id = cartMaster[0].cart_master_id;
      }
    }

    const [existingItem] = await connection.query(
      "SELECT cart_child_id, quantity FROM tbl_cart_child WHERE cart_master_id = ? AND item_id = ? AND cart_item_status = 'active' AND (size = ? OR size IS NULL)",
      [cart_master_id, item_id, size || null]
    );

    const totalQuantity = existingItem.length > 0 ? existingItem[0].quantity + quantity : quantity;
    if (availableStock < totalQuantity) throw new Error(`Insufficient stock: only ${availableStock} available for size ${size || 'default'}`);

    if (existingItem.length > 0) {
      await connection.query(
        "UPDATE tbl_cart_child SET quantity = ?, discount_percentage = ? WHERE cart_child_id = ?",
        [totalQuantity, itemDiscount, existingItem[0].cart_child_id]
      );
    } else {
      await connection.query(
        "INSERT INTO tbl_cart_child (cart_master_id, item_id, price_per_item, quantity, discount_percentage, cart_item_status, size) VALUES (?, ?, ?, ?, ?, 'active', ?)",
        [cart_master_id, item_id, price_per_item, quantity, itemDiscount, size || null]
      );
    }

    await updateCartTotal(connection, cart_master_id);
    await connection.commit();
    res.json({ message: "Item added to cart successfully", cart_master_id, buy_now });
  } catch (error) {
    console.error("Cart error:", error.message);
    if (connection) await connection.rollback();
    res.status(error.message.includes("Insufficient stock") || error.message.includes("Item not found") || error.message.includes("Size") ? 400 : 500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});
async function updateCartTotal(connection, cart_master_id) {
  const [activeItems] = await connection.query(
    `SELECT price_per_item, quantity, discount_percentage 
     FROM tbl_cart_child 
     WHERE cart_master_id = ? AND cart_item_status = 'active' AND quantity > 0`,
    [cart_master_id]
  );

  let total_amount = 0;
  for (const item of activeItems) {
    const discount = item.discount_percentage || 0;
    const discountedPrice = item.price_per_item * (1 - discount / 100);
    total_amount += discountedPrice * item.quantity;
  }

  await connection.query(
    "UPDATE tbl_cart_master SET cart_tot_amt = ? WHERE cart_master_id = ?",
    [total_amount, cart_master_id]
  );
  return { total_amount, items_count: activeItems.length };
}

// Get out-of-stock items (Admin only)
// Get out-of-stock items (Admin only)

app.get("/api/cart/:custId", async (req, res) => {
  const { custId } = req.params;
  let connection;
  try {
    connection = await db.promise().getConnection();
    const [cartMaster] = await connection.query(
      "SELECT cart_master_id FROM tbl_cart_master WHERE cust_id = ? AND cart_status = 'active' ORDER BY cart_date DESC LIMIT 1",
      [custId]
    );
    if (cartMaster.length === 0) return res.json([]);

    const cart_master_id = cartMaster[0].cart_master_id;
    const query = `
      SELECT 
        cc.cart_child_id, cc.item_id, i.item_name, i.img_url, cc.price_per_item, 
        cc.quantity, cc.discount_percentage, 
        (cc.price_per_item * (1 - IFNULL(cc.discount_percentage, 0) / 100) * cc.quantity) as total_price,
        cc.cart_item_status, cc.cart_master_id, cc.size
      FROM tbl_cart_child cc
      JOIN tbl_items i ON cc.item_id = i.item_id
      WHERE cc.cart_master_id = ? AND cc.cart_item_status = 'active' AND cc.quantity > 0
    `;
    const [cartItems] = await connection.query(query, [cart_master_id]);
    res.json(cartItems);
  } catch (error) {
    console.error("Error retrieving cart items:", error);
    res.status(500).json({ error: "Error retrieving cart items" });
  } finally {
    if (connection) connection.release();
  }
});
app.put("/api/cart/update-status/:cart_master_id", async (req, res) => {
  const { cart_master_id } = req.params;
  const { cart_status } = req.body;
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.query(
      "UPDATE tbl_cart_master SET cart_status = ? WHERE cart_master_id = ?",
      [cart_status, cart_master_id]
    );
    res.json({ message: "Cart status updated" });
  } catch (error) {
    console.error("Error updating cart status:", error);
    res.status(500).json({ error: "Failed to update cart status" });
  } finally {
    if (connection) connection.release();
  }
});


app.put("/api/cart/:cartChildId", async (req, res) => {
  const { cartChildId } = req.params;
  const { quantity } = req.body;
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [cartItem] = await connection.query(
      "SELECT cart_master_id, item_id, size FROM tbl_cart_child WHERE cart_child_id = ?",
      [cartChildId]
    );
    if (cartItem.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Cart item not found" });
    }

    const { cart_master_id, item_id, size } = cartItem[0];
    const [itemResult] = await connection.query(
      "SELECT stock_quantity, sizes, subcategory_id FROM tbl_items WHERE item_id = ?",
      [item_id]
    );
    const { stock_quantity, sizes, subcategory_id } = itemResult[0];

    const [catResult] = await connection.query(
      "SELECT c.category_name FROM tbl_subcategory s JOIN tbl_category c ON s.category_id = c.category_id WHERE s.subcategory_id = ?",
      [subcategory_id]
    );
    const isApparel = catResult[0].category_name === "Apparel";

    let availableStock;
    if (isApparel && size) {
      const parsedSizes = sizes ? JSON.parse(sizes) : {};
      availableStock = parsedSizes[size] || 0;
    } else {
      availableStock = stock_quantity;
    }

    if (quantity > availableStock) throw new Error(`Insufficient stock: only ${availableStock} available for size ${size || 'default'}`);

    if (quantity <= 0) {
      await connection.query("DELETE FROM tbl_cart_child WHERE cart_child_id = ?", [cartChildId]);
    } else {
      await connection.query("UPDATE tbl_cart_child SET quantity = ? WHERE cart_child_id = ?", [quantity, cartChildId]);
    }

    await updateCartTotal(connection, cart_master_id);
    await connection.commit();
    res.json({ message: quantity <= 0 ? "Item removed from cart" : "Cart updated successfully" });
  } catch (error) {
    console.error("Error updating cart item:", error);
    if (connection) await connection.rollback();
    res.status(error.message.includes("Insufficient stock") ? 400 : 500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/cart/buy-now/:cartMasterId", async (req, res) => {
  const { cartMasterId } = req.params;
  let connection;
  try {
    connection = await db.promise().getConnection();
    const query = `
      SELECT 
        cc.cart_child_id, cc.item_id, i.item_name, i.img_url, cc.price_per_item, 
        cc.quantity, cc.discount_percentage, cc.cart_item_status, cc.cart_master_id,
        cc.size  -- Added size field
      FROM tbl_cart_child cc
      JOIN tbl_items i ON cc.item_id = i.item_id
      WHERE cc.cart_master_id = ? AND cc.cart_item_status = 'active' AND cc.quantity > 0
    `;
    const [cartItems] = await connection.query(query, [cartMasterId]);
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving Buy Now cart items" });
  } finally {
    if (connection) connection.release();
  }
});
app.delete("/api/cart/:id", async (req, res) => {
  const cartId = req.params.id;
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [cartItem] = await connection.query("SELECT cart_master_id FROM tbl_cart_child WHERE cart_child_id = ?", [cartId]);
    if (cartItem.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Cart item not found" });
    }

    const cart_master_id = cartItem[0].cart_master_id;
    const [result] = await connection.query("DELETE FROM tbl_cart_child WHERE cart_child_id = ?", [cartId]);
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Cart item not found" });
    }

    await updateCartTotal(connection, cart_master_id);
    await connection.commit();
    res.json({ message: "Cart item removed successfully" });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    if (connection) await connection.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    if (connection) connection.release();
  }
});



// Payment Routes


app.get("/api/customers/:id", authenticateToken, (req, res) => {
  const custId = req.params.id;

  // Ensure the authenticated user can only access their own profile unless admin
  if (req.user.userId !== parseInt(custId) && !req.user.isAdmin) {
    return res.status(403).json({ error: "Access denied. You can only view your own profile." });
  }

  const sql = `
    SELECT cust_id, f_name, l_name, email, phone_number, house_add, area_add, state, city, pincode, profile_pic 
    FROM tbl_customers 
    WHERE cust_id = ?
  `;
  db.query(sql, [custId], (err, result) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (result.length === 0) return res.status(404).json({ error: "Customer not found" });
    res.status(200).json(result[0]);
  });
});

app.put("/api/customers/:id", authenticateToken, upload.single("profile_pic"), async (req, res) => {
  const custId = req.params.id;

  // Ensure the authenticated user can only update their own profile unless admin
  if (req.user.userId !== parseInt(custId) && !req.user.isAdmin) {
    return res.status(403).json({ error: "Access denied. You can only update your own profile." });
  }

  const updateData = req.body;
  const updateFields = [];
  const values = [];

  // Handle text fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined && key !== "profile_pic") {
      updateFields.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });

  // Handle profile picture
  if (req.file) {
    // Fetch existing profile picture to delete it
    const [existing] = await db.promise().query("SELECT profile_pic FROM tbl_customers WHERE cust_id = ?", [custId]);
    if (existing.length > 0 && existing[0].profile_pic) {
      const oldImagePath = path.join(__dirname, "uploads", existing[0].profile_pic);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }

    updateFields.push("profile_pic = ?");
    values.push(req.file.filename);
  }

  if (updateFields.length === 0) return res.status(400).json({ error: "No fields to update" });
  values.push(custId);

  const sql = `UPDATE tbl_customers SET ${updateFields.join(", ")} WHERE cust_id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      if (req.file) fs.unlink(req.file.path, (unlinkErr) => console.error("Error deleting file:", unlinkErr));
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: "Customer not found" });

    // Fetch updated customer data to return
    db.query(
      "SELECT cust_id, f_name, l_name, email, phone_number, house_add, area_add, state, city, pincode, profile_pic FROM tbl_customers WHERE cust_id = ?",
      [custId],
      (err, updatedResult) => {
        if (err) return res.status(500).json({ error: "Server error" });
        res.json({ message: "Customer updated successfully", customer: updatedResult[0] });
      }
    );
  });
});

// POST /api/customer/reorder

// Card Routes
app.post("/api/cards", async (req, res) => {
  const { cust_id, card_number, card_expiry, cardholder_name } = req.body;
  if (!cust_id || !card_number || !card_expiry || !cardholder_name) return res.status(400).json({ error: "Missing required card information" });

  try {
    const [existingCards] = await db.promise().query("SELECT COUNT(*) as cardCount FROM tbl_card WHERE cust_id = ?", [cust_id]);
    if (existingCards[0].cardCount >= 4) return res.status(400).json({ error: "Maximum card limit reached (4)" });

    const [month, shortYear] = card_expiry.split("/");
    const fullYear = "20" + shortYear;
    const lastDayOfMonth = new Date(Number.parseInt(fullYear), Number.parseInt(month), 0).getDate();
    const formattedExpiryDate = `${fullYear}-${month}-${lastDayOfMonth}`;

    const [result] = await db.promise().query(
      "INSERT INTO tbl_card (cust_id, card_number, card_expiry, cardholder_name) VALUES (?, ?, ?, ?)",
      [cust_id, card_number, formattedExpiryDate, cardholder_name]
    );

    if (result.affectedRows === 0) return res.status(500).json({ error: "Failed to save card" });
    const cardId = result.insertId;
    const maskedNumber = "**** **** **** " + card_number.slice(-4);
    res.status(201).json({ message: "Card saved successfully", card_id: cardId, masked_number: maskedNumber });
  } catch (error) {
    console.error("Error saving card:", error);
    res.status(500).json({ error: "Server error while saving card" });
  }
});

app.get("/api/cards/:custId", async (req, res) => {
  const { custId } = req.params;
  try {
    const [cards] = await db.promise().query(
      "SELECT card_id, card_number, DATE_FORMAT(card_expiry, '%m/%y') as card_expiry, cardholder_name FROM tbl_card WHERE cust_id = ?",
      [custId]
    );
    const maskedCards = cards.map(card => ({
      ...card,
      card_number: card.card_number.slice(-4).padStart(card.card_number.length, "*"),
    }));
    res.json(maskedCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ error: "Failed to retrieve saved cards" });
  }
});

app.delete("/api/cards/:cardId", async (req, res) => {
  const { cardId } = req.params;
  try {
    const [result] = await db.promise().query("DELETE FROM tbl_card WHERE card_id = ?", [cardId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Card not found" });
    res.json({ message: "Card deleted successfully" });
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({ error: "Failed to delete card" });
  }
});

// Payment Processing
app.post("/api/payment", async (req, res) => {
  const { cart_master_id, cust_id, payment_amount, payment_status } = req.body;
  let connection;

  if (!payment_amount || (!cart_master_id && !cust_id)) {
    return res.status(400).json({ error: "Missing required fields: payment_amount and either cart_master_id or cust_id are required" });
  }

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    let finalCartMasterId = cart_master_id;
    if (!cart_master_id && cust_id) {
      const [cartResult] = await connection.query(
        "SELECT cart_master_id FROM tbl_cart_master WHERE cust_id = ? AND cart_status = 'active' ORDER BY cart_date DESC LIMIT 1",
        [cust_id]
      );
      if (cartResult.length === 0) throw new Error("No active cart found for this customer");
      finalCartMasterId = cartResult[0].cart_master_id;
    }

    const [cartCheck] = await connection.query(
      "SELECT cart_master_id, cust_id FROM tbl_cart_master WHERE cart_master_id = ?",
      [finalCartMasterId]
    );
    if (cartCheck.length === 0) throw new Error(`Invalid cart_master_id: ${finalCartMasterId}`);

    const [cartItems] = await connection.query(
      `SELECT item_id, quantity, size FROM tbl_cart_child 
       WHERE cart_master_id = ? AND cart_item_status = 'active'`,
      [finalCartMasterId]
    );

    for (const item of cartItems) {
      const [itemResult] = await connection.query(
        "SELECT stock_quantity, sizes, subcategory_id FROM tbl_items WHERE item_id = ?",
        [item.item_id]
      );
      const { stock_quantity, sizes, subcategory_id } = itemResult[0];

      const [catResult] = await connection.query(
        "SELECT c.category_name FROM tbl_subcategory s JOIN tbl_category c ON s.category_id = c.category_id WHERE s.subcategory_id = ?",
        [subcategory_id]
      );
      const isApparel = catResult[0].category_name === "Apparel";

      if (isApparel && item.size) {
        const parsedSizes = sizes ? JSON.parse(sizes) : {};
        const currentStock = parsedSizes[item.size] || 0;
        const newStock = currentStock - item.quantity;
        if (newStock < 0) throw new Error(`Insufficient stock for item ${item.item_id}, size ${item.size}`);

        parsedSizes[item.size] = newStock;
        await connection.query(
          "UPDATE tbl_items SET sizes = ? WHERE item_id = ?",
          [JSON.stringify(parsedSizes), item.item_id]
        );

        if (newStock === 0) {
          const [wishlistUsers] = await connection.query(
            "SELECT DISTINCT cust_id FROM tbl_wishlist WHERE item_id = ?",
            [item.item_id]
          );
          for (const user of wishlistUsers) {
            await addNotification(user.cust_id, `Item with ID ${item.item_id} (size ${item.size}) in your wishlist is now out of stock`);
          }
        }
      } else {
        const newStock = stock_quantity - item.quantity;
        if (newStock < 0) throw new Error(`Insufficient stock for item ${item.item_id}`);

        await connection.query(
          "UPDATE tbl_items SET stock_quantity = ? WHERE item_id = ?",
          [newStock, item.item_id]
        );

        if (newStock === 0) {
          const [wishlistUsers] = await connection.query(
            "SELECT DISTINCT cust_id FROM tbl_wishlist WHERE item_id = ?",
            [item.item_id]
          );
          for (const user of wishlistUsers) {
            await addNotification(user.cust_id, `Item with ID ${item.item_id} in your wishlist is now out of stock`);
          }
        }
      }
    }

    const [paymentResult] = await connection.query(
      "INSERT INTO tbl_payment (cart_master_id, payment_amount, payment_status) VALUES (?, ?, ?)",
      [finalCartMasterId, Number(payment_amount), payment_status || "completed"]
    );

    await connection.query(
      "UPDATE tbl_cart_master SET cart_status = 'completed' WHERE cart_master_id = ?",
      [finalCartMasterId]
    );

    await connection.commit();
    await addNotification(cust_id || cartCheck[0].cust_id, `Payment successful for order #${paymentResult.insertId}`);
    res.status(201).json({ message: "Payment processed successfully", payment_id: paymentResult.insertId });
  } catch (error) {
    console.error("Payment error:", error.message, error.stack);
    if (connection) await connection.rollback();
    res.status(error.message.includes("Insufficient stock") ? 400 : 500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});
app.get("/api/payment/:paymentId", async (req, res) => {
  const paymentId = req.params.paymentId;
  if (!paymentId) return res.status(400).json({ error: "Payment ID is required" });

  try {
    const sql = `
      SELECT p.*, c.cust_id 
      FROM tbl_payment p
      LEFT JOIN tbl_cart_master c ON p.cart_master_id = c.cart_master_id
      WHERE p.payment_id = ?
    `;
    const [results] = await db.promise().query(sql, [paymentId]);
    if (results.length === 0) return res.status(404).json({ error: "Payment not found" });
    res.json(results[0]);
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add this after the existing /api/payments/completed route
app.get("/api/payments/pending", verifyAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.payment_id,
        p.cart_master_id,
        p.payment_amount AS amount,
        p.payment_date
      FROM tbl_payment p
      LEFT JOIN tbl_cassign ca ON p.cart_master_id = ca.cart_master_id
      WHERE p.payment_status = 'completed' 
      AND ca.cassign_id IS NULL
      ORDER BY p.payment_date DESC
    `;
    const [results] = await db.promise().query(sql);
    res.status(200).json(results.map(payment => ({
      ...payment,
      status: "Pending"
    })));
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get cart master details including customer state
app.get("/api/cart-master/:cartMasterId", verifyAdmin, async (req, res) => {
  const { cartMasterId } = req.params;
  try {
    const sql = `
      SELECT cm.cart_master_id, c.state
      FROM tbl_cart_master cm
      JOIN tbl_customers c ON cm.cust_id = c.cust_id
      WHERE cm.cart_master_id = ?
    `;
    const [results] = await db.promise().query(sql, [cartMasterId]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Cart not found" });
    }
    res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error fetching cart master details:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ... (Previous imports and middleware remain unchanged)

// ... (Previous imports and middleware remain unchanged)

app.post("/api/payment/finalize/:paymentId", authenticateToken, async (req, res) => {
  const { paymentId } = req.params;
  const { custId } = req.body;
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Verify payment exists and belongs to the customer
    const [payment] = await connection.query(
      `SELECT p.payment_id, p.cart_master_id, cm.cust_id
       FROM tbl_payment p
       JOIN tbl_cart_master cm ON p.cart_master_id = cm.cart_master_id
       WHERE p.payment_id = ? AND p.payment_status = 'completed'`,
      [paymentId]
    );
    if (!payment.length) {
      throw new Error("Payment not found or not completed");
    }
    if (payment[0].cust_id !== parseInt(custId) && !req.user.isAdmin) {
      throw new Error("Unauthorized: Payment does not belong to this customer");
    }

    // Update cart status
    await connection.query(
      "UPDATE tbl_cart_master SET cart_status = 'completed' WHERE cart_master_id = ?",
      [payment[0].cart_master_id]
    );

    await connection.commit();
    res.status(200).json({ message: "Payment finalized successfully" });
  } catch (error) {
    console.error("Error finalizing payment:", error.message);
    if (connection) await connection.rollback();
    res.status(error.message.includes("Unauthorized") ? 403 : 400).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/bill/:paymentId", authenticateToken, async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.userId;
  let connection;

  try {
    connection = await db.promise().getConnection();

    // Fetch payment and customer details
    const [paymentResult] = await connection.query(
      `SELECT 
        p.payment_id,
        p.payment_amount,
        p.payment_date,
        p.cart_master_id,
        cm.cust_id,
        c.f_name,
        c.l_name,
        c.email,
        c.house_add,
        c.area_add,
        c.city,
        c.state,
        c.pincode
      FROM tbl_payment p
      JOIN tbl_cart_master cm ON p.cart_master_id = cm.cart_master_id
      JOIN tbl_customers c ON cm.cust_id = c.cust_id
      WHERE p.payment_id = ? AND p.payment_status = 'completed'`,
      [paymentId]
    );

    if (!paymentResult.length) {
      console.error(`No payment found for paymentId: ${paymentId}`);
      return res.status(404).json({ error: "Payment not found or not completed" });
    }

    const payment = paymentResult[0];

    // Verify authorization
    if (payment.cust_id !== userId && !req.user.isAdmin) {
      console.error(`Unauthorized access attempt by userId: ${userId} for paymentId: ${paymentId}`);
      return res.status(403).json({ error: "Access denied: Not your payment" });
    }

    // Fetch cart items
    const [cartItems] = await connection.query(
      `SELECT 
        cc.item_id,
        i.item_name,
        cc.quantity,
        cc.price_per_item,
        cc.discount_percentage,
        cc.size
      FROM tbl_cart_child cc
      JOIN tbl_items i ON cc.item_id = i.item_id
      WHERE cc.cart_master_id = ? AND cc.cart_item_status = 'active'`,
      [payment.cart_master_id]
    );

    console.log(`Cart items for cart_master_id ${payment.cart_master_id}:`, cartItems);

    // Calculate totals
    let subtotal = 0;
    const items = cartItems.map(item => {
      const discount = item.discount_percentage || 0;
      const discountedPrice = item.price_per_item * (1 - discount / 100);
      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;
      return {
        item_id: item.item_id,
        item_name: item.item_name || "Unknown Item",
        quantity: item.quantity || 0,
        price_per_item: Number(item.price_per_item || 0).toFixed(2),
        discount_percentage: Number(discount).toFixed(2),
        total: Number(itemTotal).toFixed(2),
        size: item.size || null,
      };
    });

    const tax = 0; // Adjust as needed
    const shipping = 0; // Adjust as needed
    const total = subtotal + tax + shipping;

    const bill = {
      payment_id: payment.payment_id,
      customer: {
        name: `${payment.f_name || ''} ${payment.l_name || ''}`.trim() || "Unknown Customer",
        email: payment.email || "N/A",
        address: [
          payment.house_add,
          payment.area_add,
          payment.city,
          payment.state,
          payment.pincode
        ].filter(Boolean).join(", ") || "N/A",
      },
      date: payment.payment_date || new Date().toISOString(),
      items,
      summary: {
        subtotal: Number(subtotal).toFixed(2),
        tax: Number(tax).toFixed(2),
        shipping: Number(shipping).toFixed(2),
        total: Number(total).toFixed(2),
      },
    };

    res.status(200).json(bill);
  } catch (error) {
    console.error(`Error generating bill for paymentId ${paymentId}:`, error.message);
    res.status(500).json({ error: `Failed to generate bill: ${error.message}` });
  } finally {
    if (connection) connection.release();
  }
});

// ... (Rest of server.js remains unchanged)
// ... (Rest of the server.js remains unchanged)




// Wishlist Routes
app.post("/api/wishlist", async (req, res) => {
  const { cust_id, item_id } = req.body;
  try {
    const [existingItem] = await db.promise().query("SELECT * FROM tbl_wishlist WHERE cust_id = ? AND item_id = ?", [cust_id, item_id]);
    if (existingItem.length > 0) return res.status(400).json({ error: "Item already in wishlist" });

    const [result] = await db.promise().query("INSERT INTO tbl_wishlist (cust_id, item_id, wishlist_date) VALUES (?, ?, NOW())", [cust_id, item_id]);
    res.json({ message: "Item added to wishlist successfully", wishlist_id: result.insertId });
  } catch (error) {
    console.error("Wishlist error:", error);
    res.status(500).json({ error: "Error adding item to wishlist" });
  }
});

app.get("/api/wishlist/:custId", authenticateToken, async (req, res) => {
  const { custId } = req.params;

  // Ensure the authenticated user can only access their own wishlist
  if (req.user.userId !== parseInt(custId) && !req.user.isAdmin) {
    return res.status(403).json({ error: "Access denied. You can only view your own wishlist." });
  }

  let query = `
    SELECT 
      w.wishlist_id,
      w.item_id,
      i.item_name,
      i.description,
      i.price,
      i.discount_percentage,
      i.img_url,
      i.stock_quantity,
      i.sizes,
      c.category_name,
      s.subcategory_name,
      w.wishlist_date
    FROM tbl_wishlist w
    JOIN tbl_items i ON w.item_id = i.item_id
    JOIN tbl_subcategory s ON i.subcategory_id = s.subcategory_id
    JOIN tbl_category c ON s.category_id = c.category_id
    WHERE w.cust_id = ? AND i.expiry_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  `;
  const params = [custId];

  query += " ORDER BY w.wishlist_date DESC";

  try {
    const [wishlistItems] = await db.promise().query(query, params);

    // Process items to determine stock availability
    const processedItems = wishlistItems.map(item => {
      let isOutOfStock = false;
      if (item.category_name === "Apparel" && item.sizes) {
        const parsedSizes = JSON.parse(item.sizes);
        isOutOfStock = Object.values(parsedSizes).every(stock => stock === 0);
      } else {
        isOutOfStock = item.stock_quantity === 0;
      }
      return { ...item, isOutOfStock };
    });

    res.json(processedItems);
  } catch (error) {
    console.error("Error retrieving wishlist items:", error.message);
    res.status(500).json({ error: "Error retrieving wishlist items: " + error.message });
  }
});

app.delete("/api/wishlist/:wishlistId", async (req, res) => {
  const { wishlistId } = req.params;
  try {
    const [result] = await db.promise().query("DELETE FROM tbl_wishlist WHERE wishlist_id = ?", [wishlistId]);
    if (result.affectedRows > 0) res.json({ message: "Item removed from wishlist successfully" });
    else res.status(404).json({ error: "Wishlist item not found" });
  } catch (error) {
    console.error("Error removing item from wishlist:", error);
    res.status(500).json({ error: "Error removing item from wishlist" });
  }
});

// Courier Routes
app.get("/api/couriers", verifyAdmin, (req, res) => {
  const sql = "SELECT * FROM tbl_courier ORDER BY courier_id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    res.status(200).json(results);
  });
});

app.post("/api/couriers", verifyAdmin, async (req, res) => {
  const { courier_name, courier_email, courier_password, phone_number, courier_state, status } = req.body;
  if (!courier_name || !courier_email || !courier_password || !phone_number || !courier_state) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let connection;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(courier_password, salt);

    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [courierResults] = await connection.query("SELECT * FROM tbl_courier WHERE courier_email = ?", [courier_email]);
    if (courierResults.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Email already exists" });
    }

    const [customerResults] = await connection.query("SELECT * FROM tbl_customers WHERE email = ?", [courier_email]);
    if (customerResults.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Email already exists in customer database" });
    }

    const courierSql = `
      INSERT INTO tbl_courier 
      (courier_name, courier_email, courier_password, phone_number, courier_state, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [courierResult] = await connection.query(courierSql, [courier_name, courier_email, hashedPassword, phone_number, courier_state, status || "Active"]);
    const courierId = courierResult.insertId;

    const customerSql = `
      INSERT INTO tbl_customers 
      (f_name, l_name, email, password, phone_number, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    let firstName = courier_name;
    let lastName = "";
    if (courier_name.includes(" ")) {
      const nameParts = courier_name.split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }
    const [customerResult] = await connection.query(customerSql, [firstName, lastName, courier_email, hashedPassword, phone_number, "courier"]);

    await connection.commit();
    const newCourier = {
      courier_id: courierId,
      courier_name,
      courier_email,
      phone_number,
      courier_state,
      status: status || "Active",
      customer_id: customerResult.insertId,
    };
    res.status(201).json(newCourier);
  } catch (error) {
    console.error("Error adding courier:", error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
});

app.patch("/api/couriers/:courierId", verifyAdmin, (req, res) => {
  const { courierId } = req.params;
  const { status } = req.body;
  if (!status || !["Active", "Inactive"].includes(status)) return res.status(400).json({ message: "Invalid status value" });

  const sql = "UPDATE tbl_courier SET status = ? WHERE courier_id = ?";
  db.query(sql, [status, courierId], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Courier not found" });
    res.status(200).json({ message: "Status updated successfully" });
  });
});

app.get("/api/couriers/:courierId", verifyAdmin, (req, res) => {
  const { courierId } = req.params;
  const sql = "SELECT * FROM tbl_courier WHERE courier_id = ?";
  db.query(sql, [courierId], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length === 0) return res.status(404).json({ message: "Courier not found" });
    const courier = results[0];
    delete courier.courier_password;
    res.status(200).json(courier);
  });
});

// Get unique courier states
app.get("/api/courier-states", verifyAdmin, async (req, res) => {
  try {
    const sql = "SELECT DISTINCT courier_state FROM tbl_courier WHERE courier_state IS NOT NULL ORDER BY courier_state";
    const [results] = await db.promise().query(sql);
    const states = results.map(row => row.courier_state);
    res.status(200).json(states);
  } catch (error) {
    console.error("Error fetching courier states:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get couriers filtered by state
app.get("/api/couriers/by-state/:state", verifyAdmin, async (req, res) => {
  const { state } = req.params;
  try {
    const sql = "SELECT * FROM tbl_courier WHERE courier_state = ? AND status = 'Active' ORDER BY courier_id DESC";
    const [results] = await db.promise().query(sql, [state]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching couriers by state:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/courier/login", async (req, res) => {
  const { email, password } = req.body;
  db.query(`SELECT * FROM tbl_courier WHERE courier_email = ?`, [email], async (err, result) => {
    if (err) return res.status(500).json({ error: "Error fetching courier." });
    if (result.length === 0) return res.status(404).json({ error: "Courier not found." });

    const courier = result[0];
    const isMatch = await bcrypt.compare(password, courier.courier_password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password." });

    const token = jwt.sign(
      { courier_id: courier.courier_id, isCourier: true },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "1h" }
    );

    const userData = {
      courier_id: courier.courier_id, // Use courier_id instead of cust_id
      f_name: courier.courier_name,
      email: courier.courier_email,
      role: "courier"
    };

    return res.status(200).json({
      token,
      isAdmin: false,
      isCourier: true,
      user: userData
    });
  });
});

// Add this after the /api/courier-assignments POST route
app.delete("/api/courier-assignments/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [assignment] = await db.promise().query(
      "SELECT cassign_id FROM tbl_cassign WHERE cassign_id = ?",
      [id]
    );
    if (assignment.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await db.promise().query(
      "DELETE FROM tbl_cassign WHERE cassign_id = ?",
      [id]
    );
    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/refresh-token", (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key", { ignoreExpiration: true }, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    // Re-issue a new token with the same user data
    const newToken = jwt.sign(
      {
        userId: user.userId,
        isAdmin: user.isAdmin,
        isCourier: user.isCourier,
        courier_id: user.courier_id, // Ensure courier_id is carried over
      },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "1h" }
    );
    res.json({ token: newToken });
  });
});
// Add these routes after your existing courier routes

// Get completed payments
app.get("/api/payments/completed", verifyAdmin, (req, res) => {
  const sql = `
    SELECT payment_id, cart_master_id, payment_amount, payment_date
    FROM tbl_payment 
    WHERE payment_status = 'completed'
    ORDER BY payment_date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.status(200).json(results);
  });
});

// Get all assignments
app.get("/api/courier-assignments", verifyAdmin, (req, res) => {
  const sql = `
    SELECT ca.cassign_id, ca.cart_master_id, c.courier_name, ca.cassign_date
    FROM tbl_cassign ca
    JOIN tbl_courier c ON ca.courier_id = c.courier_id
    ORDER BY ca.cassign_date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.status(200).json(results);
  });
});

// Assign courier
// Assign courier
app.post("/api/courier-assignments", verifyAdmin, async (req, res) => {
  const { cart_master_id, courier_id } = req.body;

  if (!cart_master_id || !courier_id) {
    return res.status(400).json({ message: "Cart master ID and Courier ID are required" });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [payment] = await connection.query(
      "SELECT payment_id FROM tbl_payment WHERE cart_master_id = ? AND payment_status = 'completed'",
      [cart_master_id]
    );
    if (payment.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "No completed payment found for this cart" });
    }

    const [assignment] = await connection.query(
      "SELECT COUNT(*) as count FROM tbl_cassign WHERE cart_master_id = ?",
      [cart_master_id]
    );
    if (assignment[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Courier already assigned" });
    }

    const [courierCheck] = await connection.query(
      "SELECT courier_id FROM tbl_courier WHERE courier_id = ? AND status = 'Active'",
      [courier_id]
    );
    if (courierCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Courier not found or inactive" });
    }

    const [result] = await connection.query(
      "INSERT INTO tbl_cassign (cart_master_id, courier_id, cassign_date) VALUES (?, ?, NOW())",
      [cart_master_id, courier_id]
    );

    await connection.commit();
    res.status(201).json({
      message: "Courier assigned successfully",
      cassign_id: result.insertId,
      assigned_courier_id: courier_id,
    });
  } catch (error) {
    console.error("Assignment error:", error.message, error.stack);
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Add this after your existing courier routes

// Get assignments for a specific courier
app.get("/api/courier/assignments", authenticateToken, async (req, res) => {
  const courierId = req.user.courier_id;
  if (!req.user.isCourier) {
    return res.status(403).json({ message: "Access denied. Couriers only." });
  }
  try {
    const sql = `
      SELECT 
        ca.cassign_id,
        ca.cart_master_id,
        ca.cassign_date,
        cm.cust_id,
        COALESCE(cm.cart_tot_amt, 0) AS cart_tot_amt, -- Ensure no NULL values
        c.f_name AS customer_first_name,
        c.l_name AS customer_last_name,
        CONCAT(c.house_add, ', ', c.area_add, ', ', c.city, ', ', c.state, ' ', c.pincode) AS delivery_address
      FROM tbl_cassign ca
      JOIN tbl_cart_master cm ON ca.cart_master_id = cm.cart_master_id
      JOIN tbl_customers c ON cm.cust_id = c.cust_id
      WHERE ca.courier_id = ?
      ORDER BY ca.cassign_date DESC
    `;
    const [results] = await db.promise().query(sql, [courierId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching courier assignments:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/notifications/:custId", authenticateToken, async (req, res) => {
  const { custId } = req.params;
  try {
    const [notifications] = await db.promise().query(
      "SELECT id, message, created_at FROM tbl_notifications WHERE cust_id = ? ORDER BY created_at DESC",
      [custId]
    );
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/delivery", authenticateToken, async (req, res) => {
  const { cassign_id } = req.body;
  const courierId = req.user.courier_id;

  if (!req.user.isCourier) {
    return res.status(403).json({ message: "Access denied. Couriers only." });
  }

  try {
    const [assignment] = await db.promise().query(
      "SELECT * FROM tbl_cassign WHERE cassign_id = ? AND courier_id = ?",
      [cassign_id, courierId]
    );
    if (assignment.length === 0) {
      return res.status(404).json({ message: "Assignment not found or not assigned to this courier" });
    }

    const [existingDelivery] = await db.promise().query(
      "SELECT * FROM tbl_delivery WHERE cassign_id = ?",
      [cassign_id]
    );
    if (existingDelivery.length > 0) {
      return res.status(400).json({ message: "Delivery already initiated for this assignment" });
    }

    const [result] = await db.promise().query(
      "INSERT INTO tbl_delivery (cassign_id, del_status, del_date) VALUES (?, 'Pending', NOW())",
      [cassign_id]
    );

    res.status(201).json({
      message: "Delivery initiated successfully",
      del_id: result.insertId,
    });
  } catch (error) {
    console.error("Error initiating delivery:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/delivery/:delId", authenticateToken, async (req, res) => {
  const { delId } = req.params;
  const { del_status } = req.body;
  const courierId = req.user.courier_id;

  if (!req.user.isCourier) {
    return res.status(403).json({ message: "Access denied. Couriers only." });
  }

  if (!["Pending", "Delivered"].includes(del_status)) {
    return res.status(400).json({ message: "Invalid delivery status" });
  }

  try {
    const [delivery] = await db.promise().query(
      "SELECT d.*, ca.courier_id FROM tbl_delivery d JOIN tbl_cassign ca ON d.cassign_id = ca.cassign_id WHERE d.del_id = ?",
      [delId]
    );
    if (delivery.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    if (delivery[0].courier_id !== courierId) {
      return res.status(403).json({ message: "Not authorized to update this delivery" });
    }

    await db.promise().query(
      "UPDATE tbl_delivery SET del_status = ?, del_date = NOW() WHERE del_id = ?",
      [del_status, delId]
    );

    if (del_status === "Delivered") {
      await db.promise().query(
        "UPDATE tbl_cassign SET status = 'Delivered' WHERE cassign_id = ?",
        [delivery[0].cassign_id]
      );
      const [cartMaster] = await db.promise().query(
        "SELECT cust_id FROM tbl_cart_master WHERE cart_master_id = (SELECT cart_master_id FROM tbl_cassign WHERE cassign_id = ?)",
        [delivery[0].cassign_id]
      );
      if (cartMaster.length > 0) {
        await addNotification(cartMaster[0].cust_id, `Your order #${delivery[0].cassign_id} has been delivered!`);
      }
    }

    res.status(200).json({ message: "Delivery status updated successfully" });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/deliveries", verifyAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        d.del_id,
        d.cassign_id,
        d.del_status,
        d.del_date,
        ca.cart_master_id,
        c.courier_name,
        ca.cassign_date
      FROM tbl_delivery d
      JOIN tbl_cassign ca ON d.cassign_id = ca.cassign_id
      JOIN tbl_courier c ON ca.courier_id = c.courier_id
      ORDER BY d.del_date DESC
    `;
    const [results] = await db.promise().query(sql);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/courier/deliveries", authenticateToken, async (req, res) => {
  const courierId = req.user.courier_id;
  if (!req.user.isCourier) {
    return res.status(403).json({ message: "Access denied. Couriers only." });
  }
  try {
    const sql = `
      SELECT 
        d.del_id,
        d.cassign_id,
        d.del_status,
        d.del_date
      FROM tbl_delivery d
      JOIN tbl_cassign ca ON d.cassign_id = ca.cassign_id
      WHERE ca.courier_id = ?
      ORDER BY d.del_date DESC
    `;
    const [results] = await db.promise().query(sql, [courierId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching courier deliveries:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/customer/delivery/:cartMasterId", authenticateToken, async (req, res) => {
  const { cartMasterId } = req.params;
  const custId = req.user.userId;
  try {
    const sql = `
      SELECT 
        d.del_id,
        d.del_status,
        d.del_date,
        ca.courier_id,
        c.courier_name
      FROM tbl_delivery d
      JOIN tbl_cassign ca ON d.cassign_id = ca.cassign_id
      JOIN tbl_courier c ON ca.courier_id = c.courier_id
      JOIN tbl_cart_master cm ON ca.cart_master_id = cm.cart_master_id
      WHERE cm.cart_master_id = ? AND cm.cust_id = ?
    `;
    const [results] = await db.promise().query(sql, [cartMasterId, custId]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Delivery not found for this order" });
    }
    res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error fetching customer delivery:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/customer/orders/:custId", authenticateToken, async (req, res) => {
  const { custId } = req.params;
  const userId = req.user.userId;

  // Restrict access to user's own orders unless admin
  if (custId !== userId.toString() && !req.user.isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const sql = `
      SELECT 
        cm.cart_master_id,
        cm.cart_tot_amt,
        p.payment_id, -- Added payment_id
        p.payment_date,
        d.del_status,
        d.del_date,
        cc.item_id,
        i.item_name,
        cc.quantity,
        cc.price_per_item,
        cc.size -- Added size for completeness
      FROM tbl_cart_master cm
      LEFT JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      LEFT JOIN tbl_cassign ca ON cm.cart_master_id = ca.cart_master_id
      LEFT JOIN tbl_delivery d ON ca.cassign_id = d.cassign_id
      LEFT JOIN tbl_cart_child cc ON cm.cart_master_id = cc.cart_master_id
      LEFT JOIN tbl_items i ON cc.item_id = i.item_id
      WHERE cm.cust_id = ? AND p.payment_status = 'completed'
      ORDER BY p.payment_date DESC
    `;
    const [results] = await db.promise().query(sql, [custId]);

    // Group items by order
    const orders = results.reduce((acc, row) => {
      const order = acc.find((o) => o.cart_master_id === row.cart_master_id);
      if (!order) {
        acc.push({
          cart_master_id: row.cart_master_id,
          cart_tot_amt: row.cart_tot_amt,
          payment_id: row.payment_id, // Include payment_id
          payment_date: row.payment_date,
          del_status: row.del_status,
          del_date: row.del_date,
          items: row.item_id
            ? [{
                item_id: row.item_id,
                item_name: row.item_name,
                quantity: row.quantity,
                price_per_item: row.price_per_item,
                size: row.size || null // Include size
              }]
            : [],
        });
      } else if (row.item_id) {
        order.items.push({
          item_id: row.item_id,
          item_name: row.item_name,
          quantity: row.quantity,
          price_per_item: row.price_per_item,
          size: row.size || null
        });
      }
      return acc;
    }, []);

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});


app.post("/api/feedback", authenticateToken, async (req, res) => {
  const { cust_id, item_id, feedback_text, rating } = req.body;

  // Validate input
  if (!cust_id || !item_id || !feedback_text || !rating) {
    return res.status(400).json({ error: "Missing required fields: cust_id, item_id, feedback_text, and rating are required" });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  try {
    // Verify customer and item exist
    const [customer] = await db.promise().query("SELECT cust_id FROM tbl_customers WHERE cust_id = ?", [cust_id]);
    if (customer.length === 0) return res.status(404).json({ error: "Customer not found" });

    const [item] = await db.promise().query("SELECT item_id FROM tbl_items WHERE item_id = ?", [item_id]);
    if (item.length === 0) return res.status(404).json({ error: "Item not found" });

    // Check if feedback already exists for this customer and item (optional, adjust as needed)
    const [existingFeedback] = await db.promise().query(
      "SELECT feedback_id FROM tbl_feedback WHERE cust_id = ? AND item_id = ?",
      [cust_id, item_id]
    );
    if (existingFeedback.length > 0) {
      return res.status(400).json({ error: "Feedback already submitted for this item" });
    }

    // Insert feedback
    const [result] = await db.promise().query(
      "INSERT INTO tbl_feedback (cust_id, item_id, feedback_text, rating) VALUES (?, ?, ?, ?)",
      [cust_id, item_id, feedback_text, rating]
    );

    res.status(201).json({ message: "Feedback submitted successfully", feedback_id: result.insertId });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/feedback", verifyAdmin, async (req, res) => {
  const { rating, startDate, endDate } = req.query;

  try {
    let sql = `
      SELECT 
        f.feedback_id,
        f.cust_id,
        c.f_name AS customer_name,
        f.item_id,
        i.item_name,
        f.feedback_text,
        f.rating,
        f.fb_date
      FROM tbl_feedback f
      JOIN tbl_customers c ON f.cust_id = c.cust_id
      JOIN tbl_items i ON f.item_id = i.item_id
    `;
    const params = [];

    // Add WHERE clauses based on filters
    const conditions = [];
    if (rating) {
      conditions.push("f.rating = ?");
      params.push(Number(rating));
    }
    if (startDate) {
      conditions.push("f.fb_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("f.fb_date <= ?");
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY f.fb_date DESC";

    const [results] = await db.promise().query(sql, params);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.delete("/api/feedback/:feedbackId", verifyAdmin, async (req, res) => {
  const { feedbackId } = req.params;

  try {
    const [result] = await db.promise().query("DELETE FROM tbl_feedback WHERE feedback_id = ?", [feedbackId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }
    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/feedback/customer/:custId", authenticateToken, async (req, res) => {
  const { custId } = req.params;

  try {
    const [results] = await db.promise().query(
      "SELECT feedback_id, item_id, feedback_text, rating, fb_date FROM tbl_feedback WHERE cust_id = ? ORDER BY fb_date DESC",
      [custId]
    );
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching customer feedback:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get feedback for a specific item
app.get("/api/feedback/item/:itemId", async (req, res) => {
  const { itemId } = req.params;

  try {
    // Validate itemId
    if (!Number.isInteger(Number(itemId))) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    // Query to fetch feedback for the item, joining with tbl_customers for customer name
    const sql = `
      SELECT 
        f.feedback_id,
        f.feedback_text,
        f.rating,
        f.fb_date,
        CONCAT(c.f_name, ' ', c.l_name) AS customer_name
      FROM tbl_feedback f
      JOIN tbl_customers c ON f.cust_id = c.cust_id
      JOIN tbl_items i ON f.item_id = i.item_id
      WHERE f.item_id = ? AND i.expiry_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      ORDER BY f.fb_date DESC
    `;
    const [results] = await db.promise().query(sql, [itemId]);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching feedback for item:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Report Routes
app.get("/api/reports/sales", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  try {
    const sql = `
      SELECT 
        p.payment_id,
        p.payment_amount,
        p.payment_date,
        COUNT(DISTINCT cc.item_id) as items_sold,
        SUM(cc.quantity) as total_quantity,
        c.f_name as customer_name
      FROM tbl_payment p
      JOIN tbl_cart_master cm ON p.cart_master_id = cm.cart_master_id
      JOIN tbl_cart_child cc ON cm.cart_master_id = cc.cart_master_id
      JOIN tbl_customers c ON cm.cust_id = c.cust_id
      WHERE p.payment_status = 'completed'
      AND p.payment_date BETWEEN ? AND ?
      GROUP BY p.payment_id, p.payment_amount, p.payment_date, c.f_name
      ORDER BY p.payment_date DESC
    `;
    const [results] = await db.promise().query(sql, [startDate, endDate]);

    const totalSales = results.reduce((sum, row) => sum + Number(row.payment_amount), 0);
    const totalItemsSold = results.reduce((sum, row) => sum + Number(row.total_quantity), 0);

    res.status(200).json({
      reportType: "sales",
      period: { startDate, endDate },
      data: results,
      summary: {
        totalSales: totalSales.toFixed(2),
        totalItemsSold,
        totalTransactions: results.length
      }
    });
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({ error: "Failed to generate sales report" });
  }
});

app.get("/api/reports/orders", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  try {
    const sql = `
      SELECT 
        cm.cart_master_id,
        p.payment_id,
        p.payment_amount,
        p.payment_date,
        d.del_status,
        c.f_name as customer_name,
        COUNT(cc.item_id) as item_count
      FROM tbl_cart_master cm
      LEFT JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      LEFT JOIN tbl_cassign ca ON cm.cart_master_id = ca.cart_master_id
      LEFT JOIN tbl_delivery d ON ca.cassign_id = d.cassign_id
      JOIN tbl_cart_child cc ON cm.cart_master_id = cc.cart_master_id
      JOIN tbl_customers c ON cm.cust_id = c.cust_id
      WHERE p.payment_status = 'completed'
      AND p.payment_date BETWEEN ? AND ?
      GROUP BY cm.cart_master_id, p.payment_id, p.payment_amount, p.payment_date, d.del_status, c.f_name
      ORDER BY p.payment_date DESC
    `;
    const [results] = await db.promise().query(sql, [startDate, endDate]);

    const statusCount = results.reduce((acc, row) => {
      acc[row.del_status || "Pending"] = (acc[row.del_status || "Pending"] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      reportType: "orders",
      period: { startDate, endDate },
      data: results,
      summary: {
        totalOrders: results.length,
        statusBreakdown: statusCount
      }
    });
  } catch (error) {
    console.error("Error generating orders report:", error);
    res.status(500).json({ error: "Failed to generate orders report" });
  }
});

app.get("/api/reports/customers", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  try {
    const sql = `
      SELECT 
        c.cust_id,
        c.f_name,
        c.l_name,
        c.email,
        COUNT(p.payment_id) as order_count,
        SUM(p.payment_amount) as total_spent,
        MAX(p.payment_date) as last_purchase
      FROM tbl_customers c
      LEFT JOIN tbl_cart_master cm ON c.cust_id = cm.cust_id
      LEFT JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      WHERE p.payment_status = 'completed'
      AND p.payment_date BETWEEN ? AND ?
      GROUP BY c.cust_id, c.f_name, c.l_name, c.email
      HAVING order_count > 0
      ORDER BY total_spent DESC
    `;
    const [results] = await db.promise().query(sql, [startDate, endDate]);

    const totalCustomers = results.length;
    const totalRevenue = results.reduce((sum, row) => sum + Number(row.total_spent), 0);

    res.status(200).json({
      reportType: "customers",
      period: { startDate, endDate },
      data: results,
      summary: {
        totalCustomers,
        totalRevenue: totalRevenue.toFixed(2),
        averageSpendPerCustomer: totalCustomers > 0 ? (totalRevenue / totalCustomers).toFixed(2) : "0.00"
      }
    });
  } catch (error) {
    console.error("Error generating customers report:", error);
    res.status(500).json({ error: "Failed to generate customers report" });
  }
});

app.get("/api/reports/inventory", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  try {
    const sql = `
      SELECT 
        i.item_id,
        i.item_name,
        i.price,
        i.stock_quantity,
        i.sizes,
        c.category_name,
        s.subcategory_name,
        SUM(cc.quantity) as sold_quantity,
        i.expiry_date
      FROM tbl_items i
      JOIN tbl_subcategory s ON i.subcategory_id = s.subcategory_id
      JOIN tbl_category c ON s.category_id = c.category_id
      LEFT JOIN tbl_cart_child cc ON i.item_id = cc.item_id
      LEFT JOIN tbl_cart_master cm ON cc.cart_master_id = cm.cart_master_id
      LEFT JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      WHERE (p.payment_status = 'completed' AND p.payment_date BETWEEN ? AND ?)
      OR p.payment_id IS NULL
      GROUP BY i.item_id, i.item_name, i.price, i.stock_quantity, i.sizes, c.category_name, s.subcategory_name, i.expiry_date
      ORDER BY sold_quantity DESC
    `;
    const [results] = await db.promise().query(sql, [startDate, endDate]);

    const processedItems = results.map(item => {
      let totalStock = item.stock_quantity;
      let isOutOfStock = false;
      if (item.category_name === "Apparel" && item.sizes) {
        const parsedSizes = JSON.parse(item.sizes || "{}");
        totalStock = Object.values(parsedSizes).reduce((sum, qty) => sum + qty, 0);
        isOutOfStock = totalStock === 0;
      } else {
        isOutOfStock = item.stock_quantity === 0;
      }
      return {
        ...item,
        totalStock,
        isOutOfStock,
        sold_quantity: item.sold_quantity || 0
      };
    });

    const outOfStockCount = processedItems.filter(item => item.isOutOfStock).length;
    const totalInventoryValue = processedItems.reduce((sum, item) => sum + (item.price * item.totalStock), 0);

    res.status(200).json({
      reportType: "inventory",
      period: { startDate, endDate },
      data: processedItems,
      summary: {
        totalItems: processedItems.length,
        outOfStockCount,
        totalInventoryValue: totalInventoryValue.toFixed(2)
      }
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    res.status(500).json({ error: "Failed to generate inventory report" });
  }
});

// Helper function to add notification
const addNotification = async (custId, message) => {
  await db.promise().query(
    "INSERT INTO tbl_notifications (cust_id, message) VALUES (?, ?)",
    [custId, message]
  );
};
// Most Sold Product
app.get("/api/reports/most-sold-product", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: "startDate cannot be after endDate" });
  }
  try {
    let sql = `
      SELECT 
        i.item_id,
        i.item_name,
        SUM(cc.quantity) as total_quantity_sold
      FROM tbl_items i
      JOIN tbl_cart_child cc ON i.item_id = cc.item_id
      JOIN tbl_cart_master cm ON cc.cart_master_id = cm.cart_master_id
      JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      WHERE p.payment_status = 'completed'
    `;
    const params = [];
    if (startDate && endDate) {
      sql += " AND p.payment_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    sql += " GROUP BY i.item_id, i.item_name ORDER BY total_quantity_sold DESC LIMIT 1";
    const [result] = await db.promise().query(sql, params);
    
    if (result.length === 0) {
      return res.status(200).json({
        item_id: null,
        item_name: "N/A",
        total_quantity_sold: 0
      });
    }

    const totalQuantitySold = Number(result[0].total_quantity_sold);
    if (isNaN(totalQuantitySold)) {
      console.error("total_quantity_sold is not a number:", result[0].total_quantity_sold);
      return res.status(500).json({ error: "Invalid quantity data from database" });
    }

    res.status(200).json({
      item_id: result[0].item_id,
      item_name: result[0].item_name,
      total_quantity_sold: totalQuantitySold
    });
  } catch (error) {
    console.error("Error fetching most sold product:", error);
    res.status(500).json({ error: "Failed to fetch most sold product" });
  }
});

// Least Sold Product
app.get("/api/reports/least-sold-product", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: "startDate cannot be after endDate" });
  }
  try {
    let sql = `
      SELECT 
        i.item_id,
        i.item_name,
        SUM(cc.quantity) as total_quantity_sold
      FROM tbl_items i
      JOIN tbl_cart_child cc ON i.item_id = cc.item_id
      JOIN tbl_cart_master cm ON cc.cart_master_id = cm.cart_master_id
      JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      WHERE p.payment_status = 'completed'
    `;
    const params = [];
    if (startDate && endDate) {
      sql += " AND p.payment_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    sql += " GROUP BY i.item_id, i.item_name ORDER BY total_quantity_sold ASC LIMIT 1";    
    const [result] = await db.promise().query(sql, params);
    
    if (result.length === 0) {
      return res.status(200).json({
        item_id: null,
        item_name: "N/A",
        total_quantity_sold: 0
      });
    }

    const totalQuantitySold = Number(result[0].total_quantity_sold);
    if (isNaN(totalQuantitySold)) {
      console.error("total_quantity_sold is not a number:", result[0].total_quantity_sold);
      return res.status(500).json({ error: "Invalid quantity data from database" });
    }

    res.status(200).json({
      item_id: result[0].item_id,
      item_name: result[0].item_name,
      total_quantity_sold: totalQuantitySold
    });
  } catch (error) {
    console.error("Error fetching least sold product:", error);
    res.status(500).json({ error: "Failed to fetch least sold product" });
  }
});
// Best Selling Category
app.get("/api/reports/best-selling-category", verifyAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.category_id,
        c.category_name,
        SUM(cc.quantity) as total_quantity_sold
      FROM tbl_category c
      JOIN tbl_subcategory s ON c.category_id = s.category_id
      JOIN tbl_items i ON s.subcategory_id = i.subcategory_id
      JOIN tbl_cart_child cc ON i.item_id = cc.item_id
      JOIN tbl_cart_master cm ON cc.cart_master_id = cm.cart_master_id
      JOIN tbl_payment p ON cm.cart_master_id = p.cart_master_id
      WHERE p.payment_status = 'completed'
      GROUP BY c.category_id, c.category_name
      ORDER BY total_quantity_sold DESC
      LIMIT 1
    `;
    const [result] = await db.promise().query(sql);
    
    if (result.length === 0) {
      return res.status(200).json({
        category_id: null,
        category_name: "N/A",
        total_quantity_sold: 0
      });
    }

    const totalQuantitySold = Number(result[0].total_quantity_sold);
    if (isNaN(totalQuantitySold)) {
      console.error("total_quantity_sold is not a number:", result[0].total_quantity_sold);
      return res.status(500).json({ error: "Invalid quantity data from database" });
    }

    res.status(200).json({
      category_id: result[0].category_id,
      category_name: result[0].category_name,
      total_quantity_sold: totalQuantitySold
    });
  } catch (error) {
    console.error("Error fetching best selling category:", error);
    res.status(500).json({ error: "Failed to fetch best selling category" });
  }
});
// Serve Images and Start Server
app.use("/uploads", express.static("uploads"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));