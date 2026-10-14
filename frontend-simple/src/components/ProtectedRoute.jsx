// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export function ProtectedRoute({ children, role = 'user' }) {
  if (role === 'admin') {
    const token = localStorage.getItem('ownerAuthToken');
    const ownerStr = localStorage.getItem('ownerAuthUser');
    let owner = null;
    try {
      owner = ownerStr ? JSON.parse(ownerStr) : null;
    } catch {
      owner = null;
    }

    if (!token || !owner || owner.Quyen !== 'admin') {
      toast.error('Bạn không có quyền truy cập trang Quản trị viên (Admin).');
      return <Navigate to="/owner/login" replace />;
    }
  } else if (role === 'owner') {
    const token = localStorage.getItem('ownerAuthToken');
    const ownerStr = localStorage.getItem('ownerAuthUser');

    if (!token || !ownerStr) {
      toast.error('Vui lòng đăng nhập kênh Chủ nhà để tiếp tục.');
      return <Navigate to="/owner/login" replace />;
    }
  } else if (role === 'user') {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập để tiếp tục.');
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
