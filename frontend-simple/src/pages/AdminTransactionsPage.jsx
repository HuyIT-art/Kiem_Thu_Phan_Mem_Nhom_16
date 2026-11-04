// src/pages/AdminTransactionsPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { getTransactionOwners, summarizeOwnerRevenue } from '../utils/ownerRevenue';
import { Search, CreditCard, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ADMIN_API_URL = 'http://localhost:3000/api/admin';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const token = localStorage.getItem('ownerAuthToken');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [res, ownersRes] = await Promise.all([
        axios.get(`${ADMIN_API_URL}/transactions`, config),
        axios.get(`${ADMIN_API_URL}/owners`, config),
      ]);
      setTransactions(res.data.data || []);
      setOwners(ownersRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải lịch sử giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const filteredTransactions = transactions.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      t.MaGiaoDich?.toLowerCase().includes(term) ||
      t.MaDatPhong?.toString().includes(term) ||
      t.NguoiThaoTac?.toLowerCase().includes(term) ||
      t.DAT_PHONG?.NGUOI_DUNG?.HoTen?.toLowerCase().includes(term) ||
      getTransactionOwners(t).some(owner => `${owner.HoTen} ${owner.Email}`.toLowerCase().includes(term)) ||
      t.DAT_PHONG?.CHI_TIET_DAT_PHONG?.[0]?.HOMESTAY?.TenHomestay?.toLowerCase().includes(term);

    const matchMethod = methodFilter === 'ALL' || t.PhuongThuc === methodFilter;
    const matchOwner = ownerFilter === 'ALL' || getTransactionOwners(t).some(owner => String(owner.MaChu) === ownerFilter);
    return matchSearch && matchMethod && matchOwner;
  });

  const ownerRevenue = summarizeOwnerRevenue(filteredTransactions, owners)
    .filter(owner => (ownerFilter === 'ALL' || String(owner.MaChu) === ownerFilter)
      && (!searchTerm || owner.revenue > 0 || `${owner.HoTen} ${owner.Email}`.toLowerCase().includes(searchTerm.toLowerCase())));

  const totalSuccessAmount = filteredTransactions
    .filter((t) => t.TrangThai === 'ThanhCong')
    .reduce((sum, t) => sum + parseFloat(t.SoTien || 0), 0);

  return (
    <AdminLayout
      title="Quản Lý Giao Dịch & Thanh Toán"
      subtitle="Nhật ký toàn bộ các giao dịch thanh toán mô phỏng và xác nhận tiền mặt trong cơ sở dữ liệu"
      actions={
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="transaction-filter-select" aria-label="Lọc theo chủ nhà" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="ALL">Tất cả chủ nhà</option>
            {owners.map(owner => <option key={owner.MaChu} value={String(owner.MaChu)}>{owner.HoTen} — {owner.Email}</option>)}
          </select>
          <select
            className="transaction-filter-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="ALL">Tất cả phương thức</option>
            <option value="ChuyenKhoanQR">📱 QR Code Demo</option>
            <option value="TienMat">💵 Tiền mặt khi nhận phòng</option>
          </select>

          <div className="search-input-box">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Tìm mã GD, tên khách, chủ nhà..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button onClick={fetchTransactions} className="button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={15} />
            <span>Làm mới</span>
          </button>
        </div>
      }
    >
      {/* Summary Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#EFF6FF',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid #BFDBFE',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase' }}>
            Tổng số tiền giao dịch thành công (theo bộ lọc)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E3A8A', marginTop: '0.2rem' }}>
            {totalSuccessAmount.toLocaleString('vi-VN')} đ
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#1E40AF', fontWeight: 600 }}>
          {filteredTransactions.length} giao dịch
        </div>
      </div>

      <div className="data-table-card">
        <div className="data-table-header">
          <h3 className="data-table-title">Doanh thu theo chủ nhà</h3>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Giao dịch thành công · Theo bộ lọc</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead><tr><th>Chủ nhà</th><th>Email</th><th>Giao dịch thành công</th><th>Doanh thu</th><th>Chi tiết</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5">Đang tải doanh thu...</td></tr> : ownerRevenue.length ? ownerRevenue.map(owner => (
                <tr key={owner.MaChu}>
                  <td>{owner.HoTen}</td>
                  <td>{owner.Email}</td>
                  <td>{owner.successfulTransactions}</td>
                  <td style={{ color: '#15803D', fontWeight: 700, whiteSpace: 'nowrap' }}>{owner.revenue.toLocaleString('vi-VN')} đ</td>
                  <td><button type="button" className="button-secondary" onClick={() => setOwnerFilter(String(owner.MaChu))}>Xem giao dịch</button></td>
                </tr>
              )) : <tr><td colSpan="5">Không có chủ nhà phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="data-table-card">
        <div className="data-table-header">
          <h3 className="data-table-title">Chi tiết lịch sử giao dịch</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Mã Giao Dịch</th>
                <th>Mã Đơn</th>
                <th>Khách hàng</th>
                <th>Homestay</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th>Người thao tác</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    Đang tải danh sách giao dịch...
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.MaGiaoDich}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#2563EB' }}>
                      {t.MaGiaoDich}
                    </td>
                    <td style={{ fontWeight: 700 }}>#{t.MaDatPhong}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.DAT_PHONG?.NGUOI_DUNG?.HoTen || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.DAT_PHONG?.NGUOI_DUNG?.Email}</div>
                    </td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.DAT_PHONG?.CHI_TIET_DAT_PHONG?.[0]?.HOMESTAY?.TenHomestay || 'Homestay'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#15803D' }}>
                      {parseFloat(t.SoTien).toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      <span className="status-pill neutral">
                        {t.PhuongThuc === 'ChuyenKhoanQR' || t.PhuongThuc === 'QR_DEMO' ? '📱 QR Code' : '💵 Tiền mặt'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${
                        t.TrangThai === 'ThanhCong' ? 'success' :
                        t.TrangThai === 'ChoThanhToan' ? 'warning' : 'danger'
                      }`}>
                        {t.TrangThai === 'ThanhCong' ? <CheckCircle2 size={13} /> :
                         t.TrangThai === 'ChoThanhToan' ? <Clock size={13} /> : <XCircle size={13} />}
                        {t.TrangThai === 'ThanhCong' ? 'Thành công' :
                         t.TrangThai === 'ChoThanhToan' ? 'Chờ thanh toán' : 'Thất bại'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.NguoiThaoTac || 'Hệ thống'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{t.VaiTroNguoiThaoTac || 'user'}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {new Date(t.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    Chưa có giao dịch nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
