// src/services/booking.service.js
import prisma from '../config/prisma.js';

/**
 * Cập nhật trạng thái của một đơn đặt phòng (Xác nhận/Hủy)
 * @param {number} bookingId - ID của đơn đặt (MaDatPhong)
 * @param {number} ownerId - ID của chủ homestay (từ req.owner)
 * @param {string} newStatus - Trạng thái mới ('DaXacNhan' hoặc 'DaHuy')
 * @param {string} content - Nội dung khiếu nại (từ req.body)
 * @param {number} userId - ID của người dùng (từ req.user)
 * 
 */
export const updateBookingStatus = async (bookingId, ownerId, newStatus) => {
  const allowedStatuses = ['DaXacNhan', 'DaHuy', 'DangLuuTru', 'DaHoanThanh'];
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error('Trạng thái cập nhật không hợp lệ');
  }

  // 1. Tìm đơn đặt VÀ xác thực quyền sở hữu của chủ nhà
  const booking = await prisma.dAT_PHONG.findFirst({
    where: {
      MaDatPhong: bookingId,
      CHI_TIET_DAT_PHONG: {
        some: {
          HOMESTAY: {
            MaChu: ownerId,
          },
        },
      },
    },
    include: {
      CHI_TIET_DAT_PHONG: true,
    },
  });

  if (!booking) {
    throw new Error(
      'Không tìm thấy đơn đặt, hoặc bạn không có quyền quản lý đơn này'
    );
  }

  // 2. Kiểm tra tính hợp lệ của luồng chuyển đổi trạng thái
  if (newStatus === 'DaXacNhan') {
    if (booking.TrangThai !== 'ChoXacNhan') {
      throw new Error('Chỉ có thể xác nhận đơn đặt phòng đang ở trạng thái Chờ xác nhận');
    }

    // KIỂM TRA LẠI LỊCH TRÙNG TRƯỚC KHI XÁC NHẬN
    const homestayId = booking.CHI_TIET_DAT_PHONG[0]?.MaHomestay;
    if (homestayId) {
      const conflict = await prisma.dAT_PHONG.findFirst({
        where: {
          MaDatPhong: { not: bookingId },
          CHI_TIET_DAT_PHONG: {
            some: { MaHomestay: homestayId },
          },
          TrangThai: {
            in: ['DaXacNhan', 'DangLuuTru'],
          },
          AND: [
            { NgayNhan: { lt: booking.NgayTra } },
            { NgayTra: { gt: booking.NgayNhan } },
          ],
        },
      });

      if (conflict) {
        throw new Error('Không thể xác nhận đơn này vì đã có đơn khác được xác nhận trong cùng khoảng thời gian.');
      }
    }
  } else if (newStatus === 'DangLuuTru') {
    if (booking.TrangThai !== 'DaXacNhan') {
      throw new Error('Chỉ có thể chuyển sang Đang lưu trú khi đơn đã được xác nhận');
    }
  } else if (newStatus === 'DaHoanThanh') {
    if (booking.TrangThai !== 'DangLuuTru' && booking.TrangThai !== 'DaXacNhan') {
      throw new Error('Chỉ có thể hoàn thành đơn đã được xác nhận hoặc đang lưu trú');
    }
  } else if (newStatus === 'DaHuy') {
    if (booking.TrangThai === 'DaHoanThanh') {
      throw new Error('Không thể hủy đơn đặt phòng đã hoàn thành lưu trú');
    }
  }

  // 3. Cập nhật trạng thái mới
  const updatedBooking = await prisma.dAT_PHONG.update({
    where: {
      MaDatPhong: bookingId,
    },
    data: {
      TrangThai: newStatus,
    },
    include: {
      NGUOI_DUNG: {
        select: {
          HoTen: true,
          Email: true,
          SoDienThoai: true,
        },
      },
      CHI_TIET_DAT_PHONG: {
        include: {
          HOMESTAY: {
            select: { TenHomestay: true },
          },
        },
      },
      GIAO_DICH: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  return updatedBooking;
};

export const createComplaint = async (bookingId, userId, content) => {
  // 1. Tìm đơn đặt phòng
  const booking = await prisma.dAT_PHONG.findUnique({
    where: { MaDatPhong: bookingId },
  });

  if (!booking) {
    throw new Error('Không tìm thấy đơn đặt phòng'); // Lỗi 404
  }

  // 2. (Quan trọng) Kiểm tra xem người dùng có phải chủ đơn không
  if (booking.MaNguoiDung !== userId) {
    throw new Error('Bạn không có quyền khiếu nại đơn này'); // Lỗi 403
  }

  // Kiểm tra trạng thái đơn: chỉ cho phép khiếu nại khi đơn đã xác nhận, đang lưu trú hoặc đã hoàn thành
  const allowedComplaintStatuses = ['DaXacNhan', 'DangLuuTru', 'DaHoanThanh'];
  if (!allowedComplaintStatuses.includes(booking.TrangThai)) {
    throw new Error('Chỉ có thể gửi khiếu nại đối với đơn đặt phòng đã được xác nhận, đang lưu trú hoặc đã hoàn thành'); // Lỗi 400
  }

  // 3. Kiểm tra xem đã khiếu nại đơn này chưa
  // 'kHIEU_NAI' là tên model Prisma
  const existingComplaint = await prisma.kHIEU_NAI.findFirst({
    where: { MaDatPhong: bookingId },
  });

  if (existingComplaint) {
    throw new Error('Bạn đã khiếu nại đơn này rồi'); // Lỗi 409
  }

  // 4. Tạo khiếu nại
  const newComplaint = await prisma.kHIEU_NAI.create({
    data: {
      MaDatPhong: bookingId,
      MaNguoiDung: userId,
      NoiDung: content,
      TrangThai: 'ChuaXuLy', // Mặc định
    },
  });

  return newComplaint;
};

export const cancelMyBooking = async (bookingId, userId) => {
  // 1. Tìm đơn đặt
  const booking = await prisma.dAT_PHONG.findUnique({
    where: { MaDatPhong: bookingId },
  });

  if (!booking) {
    throw new Error('Không tìm thấy đơn đặt phòng');
  }

  // 2. (Quan trọng) Kiểm tra xem có đúng là chủ đơn không
  if (booking.MaNguoiDung !== userId) {
    throw new Error('Bạn không có quyền hủy đơn này'); // Lỗi 403
  }
  
  // 3. (Quan trọng) Chỉ cho phép hủy khi đang "Chờ Xác Nhận"
  if (booking.TrangThai !== 'ChoXacNhan') {
    throw new Error('Không thể hủy đơn đã được xác nhận hoặc đã bị hủy'); // Lỗi 400
  }

  // 4. Cập nhật trạng thái thành "DaHuy" kèm đầy đủ thông tin chi tiết để UI không bị crash
  const updatedBooking = await prisma.dAT_PHONG.update({
    where: { MaDatPhong: bookingId },
    data: {
      TrangThai: 'DaHuy',
    },
    include: {
      CHI_TIET_DAT_PHONG: {
        include: {
          HOMESTAY: {
            include: {
              HINH_ANH: true,
            },
          },
        },
      },
      GIAO_DICH: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  return updatedBooking;
};

/**
 * Tạo đơn đặt phòng mới cho người dùng (Đã đồng bộ kiểm tra điều kiện và chống trùng lịch)
 */
export const createBooking = async (userId, homestayId, bookingData) => {
  const { NgayNhan, NgayTra, SoLuong } = bookingData; // Bỏ 'Gia' ở đây, ta sẽ tự tính

  // 1. Lấy thông tin Homestay để lấy GIÁ GỐC
  const homestay = await prisma.hOMESTAY.findUnique({
    where: { MaHomestay: homestayId }
  });

  if (!homestay) {
    throw new Error('Homestay không tồn tại');
  }

  if (homestay.isActive === false || homestay.TrangThaiDuyet !== 'DaDuyet') {
    throw new Error('Homestay hiện không nhận đặt phòng');
  }

  const parsedGuests = parseInt(SoLuong);
  if (isNaN(parsedGuests) || parsedGuests < 1) {
    throw new Error('Số lượng khách phải từ 1 người trở lên');
  }
  if (parsedGuests > homestay.SoKhachToiDa) {
    throw new Error('Số lượng khách vượt quá mức cho phép');
  }

  // 2. Tính toán và kiểm tra ngày lưu trú
  const startDate = new Date(NgayNhan);
  const endDate = new Date(NgayTra);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Ngày nhận hoặc ngày trả phòng không hợp lệ');
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (startDate < todayStart) {
    throw new Error('Ngày nhận phòng không được nằm trong quá khứ');
  }

  // Tính hiệu số mili-giây: (1000ms * 60s * 60m * 24h = 86400000)
  const differenceInTime = endDate.getTime() - startDate.getTime();
  const soNgay = Math.ceil(differenceInTime / (1000 * 3600 * 24));

  if (soNgay <= 0) {
    throw new Error('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm');
  }

  // 3. TÍNH TỔNG TIỀN = Giá gốc * Số ngày
  const tongTien = parseFloat(homestay.Gia) * soNgay;

  // 4. Tạo đơn với giá đã tính toán và kiểm tra chống trùng lịch trong Transaction
  const newBooking = await prisma.$transaction(async (tx) => {
    const conflictBooking = await tx.dAT_PHONG.findFirst({
      where: {
        CHI_TIET_DAT_PHONG: {
          some: { MaHomestay: homestayId },
        },
        TrangThai: {
          in: ['ChoXacNhan', 'DaXacNhan', 'DangLuuTru'],
        },
        AND: [
          { NgayNhan: { lt: endDate } },
          { NgayTra: { gt: startDate } },
        ],
      },
    });

    if (conflictBooking) {
      throw new Error('Khoảng thời gian này đã có khách đặt hoặc đang chờ xác nhận. Vui lòng chọn ngày khác.');
    }

    return await tx.dAT_PHONG.create({
      data: {
        MaNguoiDung: userId,
        NgayNhan: startDate,
        NgayTra: endDate,
        SoLuong: parsedGuests,
        Gia: tongTien, // <--- Lưu giá do Backend tính
        TrangThai: 'ChoXacNhan',
        TrangThaiThanhToan: 'ChuaThanhToan',
        CHI_TIET_DAT_PHONG: {
          create: {
            MaHomestay: homestayId,
            SoLuongPhong: 1, 
          },
        },
      },
      include: {
        CHI_TIET_DAT_PHONG: {
          include: { HOMESTAY: true },
        },
        NGUOI_DUNG: true,
      },
    });
  });

  return newBooking;
};
