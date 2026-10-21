// src/middlewares/admin.middleware.js
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

// Middleware này kiểm tra 2 điều:
// 1. Đã đăng nhập (giống 'protectOwner')
// 2. Phải có Quyen = 'admin'

export const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Không tìm thấy token.' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const admin = await prisma.cHU_HOMESTAY.findUnique({
        where: { MaChu: decoded.ownerId },
      });

      // Kiểm tra 1: User có tồn tại không?
      if (!admin) {
        return res.status(401).json({ message: 'Người dùng không tồn tại.' });
      }

      // Kiểm tra trạng thái hoạt động của tài khoản Admin
      if (admin.isActive === false) {
        return res.status(403).json({ message: 'Tài khoản quản trị viên đã bị khóa.' });
      }

      // Kiểm tra 2: User có phải là admin không?
      if (admin.Quyen !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền truy cập.' }); // 403 Forbidden
      }
      
      req.owner = admin; // Vẫn lưu là req.owner cho nhất quán
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token.' });
  }
};
