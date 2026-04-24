import { useState, useEffect } from 'react';

export default function ExpiryPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9s_x0FnbDTy5ouSDYvQWqptLYwOOoi3exViww1SH6zklxF9a1Rg_lltsO1F3beY1Y9mHMPaJDAYrC/pub?output=csv";

  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then(res => res.text())
      .then(csvText => {
        const rows = csvText.split('\n').slice(1);
        const parsedData = rows.map(row => {
          const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          return {
            name: (columns[0]?.replace(/"/g, '').trim() || '').toUpperCase(),
            dateStr: columns[1]?.replace(/"/g, '').trim() || '',
            quantity: columns[2]?.replace(/"/g, '').trim() || '',
            location: columns[3]?.replace(/"/g, '').trim() || ''
          };
        }).filter(item => item.name); // Bỏ qua dòng trống

        // Xử lý ngày tháng & Sắp xếp
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sortedData = parsedData.map(item => {
          // Cắt chuỗi DD/MM/YYYY
          const parts = item.dateStr.split('/');
          let expDate = new Date();
          if (parts.length === 3) {
            // Đưa về form YYYY-MM-DD để JS hiểu
            expDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
          }
          
          // Tính số ngày còn lại
          const diffTime = expDate - today;
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return { ...item, daysLeft };
        }).sort((a, b) => a.daysLeft - b.daysLeft); // Sắp xếp tăng dần

        setData(sortedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải dữ liệu:", err);
        setLoading(false);
      });
  }, []);

  // Hàm quyết định màu sắc cảnh báo
  const getStatus = (daysLeft) => {
    if (daysLeft < 0) return { text: `ĐÃ HẾT HẠN (${Math.abs(daysLeft)} ngày)`, class: 'expired' };
    if (daysLeft === 0) return { text: 'HẾT HẠN HÔM NAY', class: 'expired' };
    if (daysLeft <= 2) return { text: `CÒN ${daysLeft} NGÀY`, class: 'warn' };
    return { text: `CÒN ${daysLeft} NGÀY`, class: 'ok' };
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="mas-search-bar">
        <h2 style={{ fontSize: '18px', color: 'var(--green-dark)', padding: '4px 0' }}>Sản phẩm cận date</h2>
      </div>

      <div className="mas-list">
        {loading ? (
          <div className="mas-loading-container">
            <div className="mas-spinner"></div>
            <div className="mas-loading-text">Đang tải dữ liệu hạn sử dụng...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="mas-empty">Chưa có dữ liệu</div>
        ) : (
          data.map((item, i) => {
            const status = getStatus(item.daysLeft);
            return (
              <div key={i} className={`exp-card ${status.class}`}>
                <div className="exp-info">
                  <div className="exp-name">{item.name}</div>
                  
                  <div className="exp-row">
                    <span className="exp-label">Hạn sử dụng:</span>
                    <span className="exp-val">{item.dateStr}</span>
                  </div>
                  
                  <div className="exp-row">
                    <span className="exp-label">Vị trí:</span>
                    <span className="exp-val">{item.location || 'Chưa rõ'}</span>
                  </div>
                  
                  <div className="exp-row">
                    <span className="exp-label">Số lượng:</span>
                    <span className="exp-val" style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                  </div>
                  
                  <div className={`exp-badge ${status.class}`}>
                    {status.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
