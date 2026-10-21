// src/middlewares/owner.middleware.js
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export const protectOwner = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Lấy token
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Không tìm thấy token, yêu cầu bị từ chối.' });
      }

      // 2. Giải mã token (dùng chung JWT_SECRET)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. (Khác biệt) Tìm trong bảng CHU_HOMESTAY
      const currentOwner = await prisma.cHU_HOMESTAY.findUnique({
        where: { MaChu: decoded.ownerId }, // Nhớ lại lúc login ta đã lưu 'ownerId'
        select: {
          MaChu: true,
          HoTen: true,
          Email: true,
          Quyen: true,
          isActive: true,
        },
      });

      if (!currentOwner) {
        return res.status(401).json({ message: 'Chủ homestay không tồn tại.' });
      }

      if (currentOwner.isActive === false) {
        return res.status(403).json({ message: 'Tài khoản đã bị khóa.' });
      }

      // 4. (Khác biệt) Gắn vào req.owner
      req.owner = currentOwner;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token, yêu cầu bị từ chối.' });
  }
};
