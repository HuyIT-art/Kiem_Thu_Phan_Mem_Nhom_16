// src/controllers/booking.controller.js
import * as bookingService from '../services/booking.service.js';

/**
 * Controller để cập nhật trạng thái đơn đặt
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id); // Lấy MaDatPhong từ URL
    const ownerId = req.owner.MaChu; // Lấy từ middleware
    const { trangThai } = req.body; // Lấy trạng thái mới từ body

    const updatedBooking = await bookingService.updateBookingStatus(
      bookingId,
      ownerId,
      trangThai
    );

    res.status(200).json({
      message: `Cập nhật trạng thái đơn thành '${trangThai}' thành công!`,
      data: updatedBooking,
    });
  } catch (error) {
    if (error.message.includes('Không tìm thấy đơn đặt')) {
      res.status(404).json({ message: error.message }); // 404 Not Found
    } else if (error.message.includes('không có quyền')) {
      res.status(403).json({ message: error.message }); // 403 Forbidden
    } else if (error.message.includes('đã có đơn khác được xác nhận')) {
      res.status(409).json({ message: error.message }); // 409 Conflict
    } else if (
      error.message.includes('Trạng thái cập nhật không hợp lệ') ||
      error.message.includes('Chỉ có thể xác nhận') ||
      error.message.includes('Chỉ có thể chuyển sang') ||
      error.message.includes('Chỉ có thể hoàn thành') ||
      error.message.includes('Không thể hủy')
    ) {
      res.status(400).json({ message: error.message }); // 400 Bad Request
    } else {
      console.error('LỖI KHI CẬP NHẬT TRẠNG THÁI ĐƠN:', error);
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  }
};

/**
 * Controller để tạo khiếu nại
 */
export const createComplaint = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id); // Lấy MaDatPhong
    const userId = req.user.MaNguoiDung; // Lấy từ middleware 'protect'
    const { noiDung } = req.body; // Lấy nội dung từ body

    if (!noiDung || !noiDung.trim()) {
      return res.status(400).json({ message: 'Nội dung không được để trống' });
    }

    const complaint = await bookingService.createComplaint(
      bookingId,
      userId,
      noiDung.trim()
    );

    res.status(201).json({
      message: 'Gửi khiếu nại thành công!',
      data: complaint,
    });
  } catch (error) {
    if (error.message.includes('Không tìm thấy')) {
      res.status(404).json({ message: error.message });
    } else if (error.message.includes('không có quyền')) {
      res.status(403).json({ message: error.message });
    } else if (error.message.includes('đã khiếu nại')) {
      res.status(409).json({ message: error.message });
    } else if (error.message.includes('Chỉ có thể gửi khiếu nại')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  }
};

/**
 * Controller để người dùng tự hủy đơn
 */
export const cancelMyBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.MaNguoiDung; // Lấy từ middleware 'protect'

    const updatedBooking = await bookingService.cancelMyBooking(bookingId, userId);

    res.status(200).json({
      message: 'Hủy đơn đặt phòng thành công!',
      data: updatedBooking,
    });
  } catch (error) {
    if (error.message.includes('Không tìm thấy')) {
      res.status(404).json({ message: error.message });
    } else if (error.message.includes('không có quyền')) {
      res.status(403).json({ message: error.message });
    } else if (error.message.includes('Không thể hủy')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  }
};

export const createBooking = async (req, res) => {
  try {
    const userId = req.user.MaNguoiDung;
    
    const { MaHomestay, NgayNhan, NgayTra, SoLuong } = req.body;

    const booking = await bookingService.createBooking(userId, MaHomestay, {
      NgayNhan,
      NgayTra,
      SoLuong,
      
    });

    res.status(201).json({
      message: 'Đặt phòng thành công!',
      data: booking,
    });
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('Không tìm thấy')) {
      res.status(404).json({ message: error.message });
    } else if (error.message.includes('đã có khách đặt')) {
      res.status(409).json({ message: error.message });
    } else if (
      error.message.includes('Số lượng khách') ||
      error.message.includes('Ngày nhận') ||
      error.message.includes('Ngày trả') ||
      error.message.includes('không nhận đặt phòng')
    ) {
      res.status(400).json({ message: error.message });
    } else {
      console.error('Lỗi khi tạo đơn đặt phòng:', error);
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  }
};
