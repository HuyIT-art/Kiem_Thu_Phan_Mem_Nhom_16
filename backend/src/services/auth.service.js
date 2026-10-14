// src/services/auth.service.js
import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const registerUser = async (userData) => {
  const normalizedEmail = userData.email?.trim().toLowerCase();
  // 1. Kiểm tra email
  const existingUser = await prisma.nGUOI_DUNG.findUnique({
    where: { Email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('Email đã tồn tại');
  }

  // 2. Băm mật khẩu
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  // 3. Tạo user - Ánh xạ tới đúng tên trường trong schema
  const user = await prisma.nGUOI_DUNG.create({
    data: {
      HoTen: userData.fullName?.trim(), 
      Email: normalizedEmail,    
      MatKhau: hashedPassword, 
      SoDienThoai: userData.soDienThoai?.trim() || null,
      isActive: true,
    },
  });

  // 4. Xóa mật khẩu trước khi trả về
  delete user.MatKhau; 
  return user;
};

// Thêm hàm loginUser
export const loginUser = async (userData) => {
  const normalizedEmail = userData.email?.trim().toLowerCase();
  // 1. Tìm người dùng bằng email
  const user = await prisma.nGUOI_DUNG.findUnique({
    where: { Email: normalizedEmail },
  });

  if (!user) {
    throw new Error('Email không tồn tại');
  }
  if (user.isActive === false) {
    throw new Error('Tài khoản của bạn đã bị khóa'); // Lỗi mới
  }
  // 2. So sánh mật khẩu
  const isPasswordMatch = await bcrypt.compare(userData.password, user.MatKhau);

  if (!isPasswordMatch) {
    throw new Error('Mật khẩu không chính xác');
  }

  // 3. Tạo Token (JWT)
  // Lấy 'MaNguoiDung' để định danh user trong token
  const token = jwt.sign(
    { userId: user.MaNguoiDung }, // payload
    process.env.JWT_SECRET,        // secret key
    { expiresIn: '5h' }           // Hết hạn sau 5 giờ
  );

  // 4. Xóa mật khẩu và trả về
  delete user.MatKhau;
  return { user, token };
};