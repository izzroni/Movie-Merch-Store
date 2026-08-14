import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const ReportGeneration = () => {
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/reports/${reportType}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const { reportType, period, data, summary } = reportData;

    // Set document properties for consistent styling
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80); // #2c3e50 from your CSS
    doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, 14, 20);

    // Period styling
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51); // #333 for readability
    doc.text(`Period: ${period.startDate} to ${period.endDate}`, 14, 30);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Summary', 14, 40);
    let yPos = 50;

    // Draw summary background box
    doc.setFillColor(44, 62, 80); // #2c3e50 background
    doc.rect(14, 45, 182, reportType === 'orders' ? 20 : 30, 'F'); // Adjust height based on content

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255); // White text on dark background
    if (reportType === 'sales') {
      doc.text(`Total Sales: ${formatter.format(Number(summary.totalSales))}`, 16, yPos);
      doc.text(`Total Items Sold: ${summary.totalItemsSold}`, 16, yPos + 5);
      doc.text(`Total Transactions: ${summary.totalTransactions}`, 16, yPos + 10);
      yPos += 25;
    } else if (reportType === 'orders') {
      doc.text(`Total Orders: ${summary.totalOrders}`, 16, yPos);
      const statusText = `Status Breakdown: ${Object.entries(summary.statusBreakdown)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ')}`;
      doc.text(statusText, 16, yPos + 5, { maxWidth: 180 }); // Wrap text if too long
      yPos += 20;
    } else if (reportType === 'customers') {
      doc.text(`Total Customers: ${summary.totalCustomers}`, 16, yPos);
      doc.text(`Total Revenue: ${formatter.format(Number(summary.totalRevenue))}`, 16, yPos + 5);
      doc.text(`Avg. Spend per Customer: ${formatter.format(Number(summary.averageSpendPerCustomer))}`, 16, yPos + 10);
      yPos += 25;
    } else if (reportType === 'inventory') {
      doc.text(`Total Items: ${summary.totalItems}`, 16, yPos);
      doc.text(`Out of Stock: ${summary.outOfStockCount}`, 16, yPos + 5);
      doc.text(`Total Inventory Value: ${formatter.format(Number(summary.totalInventoryValue))}`, 16, yPos + 10);
      yPos += 25;
    }

    // Table Configuration
    let tableHead = [];
    const tableData = data.map(row => {
      if (reportType === 'sales') {
        tableHead = ['Payment ID', 'Amount', 'Date', 'Items Sold', 'Quantity', 'Customer'];
        return [
          row.payment_id,
          formatter.format(Number(row.payment_amount)),
          new Date(row.payment_date).toLocaleDateString(),
          row.items_sold,
          row.total_quantity,
          row.customer_name
        ];
      } else if (reportType === 'orders') {
        tableHead = ['Order ID', 'Payment ID', 'Amount', 'Date', 'Status', 'Customer', 'Items'];
        return [
          row.cart_master_id,
          row.payment_id,
          formatter.format(Number(row.payment_amount)),
          new Date(row.payment_date).toLocaleDateString(),
          row.del_status || 'Pending',
          row.customer_name,
          row.item_count
        ];
      } else if (reportType === 'customers') {
        tableHead = ['ID', 'Name', 'Email', 'Orders', 'Total Spent', 'Last Purchase'];
        return [
          row.cust_id,
          `${row.f_name} ${row.l_name}`,
          row.email,
          row.order_count,
          formatter.format(Number(row.total_spent)),
          new Date(row.last_purchase).toLocaleDateString()
        ];
      } else if (reportType === 'inventory') {
        tableHead = ['ID', 'Name', 'Category', 'Subcategory', 'Price', 'Stock', 'Sold', 'Expiry'];
        return [
          row.item_id,
          row.item_name,
          row.category_name,
          row.subcategory_name,
          formatter.format(Number(row.price)),
          row.totalStock,
          row.sold_quantity,
          new Date(row.expiry_date).toLocaleDateString()
        ];
      }
      return [];
    });

    autoTable(doc, {
      startY: yPos,
      head: [tableHead],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [52, 152, 219], // #3498db from your buttons
        textColor: [255, 255, 255], // White text
        fontSize: 12,
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [44, 62, 80], // #2c3e50 for body text
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250], // #f5f7fa for alternate rows
      },
      margin: { top: 20, left: 14, right: 14 },
      styles: {
        font: 'helvetica',
        lineColor: [224, 224, 224], // #e0e0e0 for borders
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Adjust column widths as needed
      },
      didDrawCell: (data) => {
        if (reportType === 'orders' && data.column.index === 4) { // Status column
          const status = data.cell.text[0].toLowerCase();
          let bgColor;
          if (status === 'delivered') bgColor = [40, 167, 69]; // #28a745
          else if (status === 'pending') bgColor = [255, 204, 0]; // #ffcc00
          if (bgColor) {
            doc.setFillColor(...bgColor);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(255, 255, 255); // White text on colored background
            doc.text(status, data.cell.x + 2, data.cell.y + 5);
          }
        }
      },
    });

    // Add footer with page number
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141); // #7f8c8d for footer
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    doc.save(`${reportType}_report_${period.startDate}_to_${period.endDate}.pdf`);
  };

  const renderReportPreview = () => {
    if (loading) return <p>Loading...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!reportData) return <p>Select report parameters above to generate a preview</p>;

    const { reportType, period, data, summary } = reportData;

    return (
      <div>
        <div className="report-header">
          <h3>{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h3>
          <button onClick={exportToPDF} className="export-pdf-btn">
            Export to PDF
          </button>
        </div>
        
        <p>Period: {period.startDate} to {period.endDate}</p>
        
        <div className="report-summary">
          <h4>Summary</h4>
          {reportType === 'sales' && (
            <>
              <p>Total Sales: {formatter.format(Number(summary.totalSales))}</p>
              <p>Total Items Sold: {summary.totalItemsSold}</p>
              <p>Total Transactions: {summary.totalTransactions}</p>
            </>
          )}
          {reportType === 'orders' && (
            <>
              <p>Total Orders: {summary.totalOrders}</p>
              <p>Status Breakdown: {Object.entries(summary.statusBreakdown).map(([status, count]) => `${status}: ${count}`).join(', ')}</p>
            </>
          )}
          {reportType === 'customers' && (
            <>
              <p>Total Customers: {summary.totalCustomers}</p>
              <p>Total Revenue: {formatter.format(Number(summary.totalRevenue))}</p>
              <p>Avg. Spend per Customer: {formatter.format(Number(summary.averageSpendPerCustomer))}</p>
            </>
          )}
          {reportType === 'inventory' && (
            <>
              <p>Total Items: {summary.totalItems}</p>
              <p>Out of Stock: {summary.outOfStockCount}</p>
              <p>Total Inventory Value: {formatter.format(Number(summary.totalInventoryValue))}</p>
            </>
          )}
        </div>

        <table className="report-table">
          <thead>
            <tr>
              {reportType === 'sales' && (
                <>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Items Sold</th>
                  <th>Quantity</th>
                  <th>Customer</th>
                </>
              )}
              {reportType === 'orders' && (
                <>
                  <th>Order ID</th>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Items</th>
                </>
              )}
              {reportType === 'customers' && (
                <>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Last Purchase</th>
                </>
              )}
              {reportType === 'inventory' && (
                <>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Subcategory</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Sold</th>
                  <th>Expiry</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {reportType === 'sales' && (
                  <>
                    <td>{row.payment_id}</td>
                    <td>{formatter.format(Number(row.payment_amount))}</td>
                    <td>{new Date(row.payment_date).toLocaleDateString()}</td>
                    <td>{row.items_sold}</td>
                    <td>{row.total_quantity}</td>
                    <td>{row.customer_name}</td>
                  </>
                )}
                {reportType === 'orders' && (
                  <>
                    <td>{row.cart_master_id}</td>
                    <td>{row.payment_id}</td>
                    <td>{formatter.format(Number(row.payment_amount))}</td>
                    <td>{new Date(row.payment_date).toLocaleDateString()}</td>
                    <td>{row.del_status || 'Pending'}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.item_count}</td>
                  </>
                )}
                {reportType === 'customers' && (
                  <>
                    <td>{row.cust_id}</td>
                    <td>{row.f_name} {row.l_name}</td>
                    <td>{row.email}</td>
                    <td>{row.order_count}</td>
                    <td>{formatter.format(Number(row.total_spent))}</td>
                    <td>{new Date(row.last_purchase).toLocaleDateString()}</td>
                  </>
                )}
                {reportType === 'inventory' && (
                  <>
                    <td>{row.item_id}</td>
                    <td>{row.item_name}</td>
                    <td>{row.category_name}</td>
                    <td>{row.subcategory_name}</td>
                    <td>{formatter.format(Number(row.price))}</td>
                    <td>{row.totalStock}</td>
                    <td>{row.sold_quantity}</td>
                    <td>{new Date(row.expiry_date).toLocaleDateString()}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="reports-container">
      <h1>Reports</h1>
      
      <div className="report-form">
        <h2>Generate Report</h2>
        <div className="report-options">
          <div className="report-input-group">
            <label htmlFor="report-type">Report Type</label>
            <select
              id="report-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="">Select Report Type</option>
              <option value="sales">Sales Report</option>
              <option value="orders">Orders Report</option>
              <option value="customers">Customer Report</option>
              <option value="inventory">Inventory Report</option>
            </select>
          </div>
          
          <div className="report-input-group">
            <label htmlFor="start-date">Start Date</label>
            <input
              type="date"
              id="start-date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          
          <div className="report-input-group">
            <label htmlFor="end-date">End Date</label>
            <input
              type="date"
              id="end-date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
        
        <button 
          className="generate-report-btn"
          onClick={handleGenerateReport}
          disabled={!reportType || !dateRange.startDate || !dateRange.endDate || loading}
        >
          Generate Report
        </button>
      </div>

      <div className="report-preview">
        <h2>Report Preview</h2>
        {renderReportPreview()}
      </div>
    </div>
  );
};

// Additional CSS for the updated layout (add this to your adminDashboard.css)
const additionalStyles = `
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .report-header h3 {
    margin: 0;
    font-size: 20px;
    color: #2c3e50;
    font-weight: 600;
  }

  .export-pdf-btn {
    background-color: #e67e22;
    color: white;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    border-radius: 6px;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 12px;
    box-shadow: 0 3px 6px rgba(230, 126, 34, 0.2);
  }

  .export-pdf-btn:hover {
    background-color: #d35400;
    transform: translateY(-3px);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
  }
`;

export default ReportGeneration;