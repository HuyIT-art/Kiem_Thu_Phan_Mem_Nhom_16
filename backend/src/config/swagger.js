// src/config/swagger.js
// Đặc tả OpenAPI 3.0 cho Homestay API (truy cập tại /api-docs)

const idParam = (name = 'id', description = 'ID') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer' },
});

const json = (properties, required) => ({
  required: true,
  content: {
    'application/json': {
      schema: { type: 'object', ...(required && { required }), properties },
    },
  },
});

const str = (example) => ({ type: 'string', example });
const num = (example) => ({ type: 'number', example });

const ok = { 200: { description: 'Thành công' } };
const std = {
  ...ok,
  401: { description: 'Chưa đăng nhập / token không hợp lệ' },
  403: { description: 'Không đủ quyền' },
  404: { description: 'Không tìm thấy' },
};

const user = [{ bearerAuth: [] }];

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Homestay API - Nhóm 16',
    version: '1.0.0',
    description:
      'RESTful API hệ thống đặt phòng homestay trực tuyến.\n\nĐăng nhập qua `/api/auth/login` (khách) hoặc `/api/owner/login` (chủ homestay), sau đó bấm **Authorize** và dán JWT token.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  tags: [
    { name: 'Auth', description: 'Xác thực & hồ sơ người dùng' },
    { name: 'Homestays', description: 'Homestay, đánh giá, yêu thích, đặt phòng' },
    { name: 'Owner', description: 'Chủ homestay' },
    { name: 'Bookings', description: 'Đơn đặt phòng & thanh toán mô phỏng' },
    { name: 'Complaints', description: 'Khiếu nại' },
    { name: 'Admin', description: 'Quản trị viên' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    // ---------------- AUTH ----------------
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng ký tài khoản khách',
        requestBody: json(
          { email: str('user@example.com'), password: str('123456'), fullName: str('Nguyễn Văn A'), soDienThoai: str('0901234567') },
          ['email', 'password', 'fullName']
        ),
        responses: { 201: { description: 'Đăng ký thành công' }, 400: { description: 'Dữ liệu không hợp lệ / email đã tồn tại' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập (khách)',
        requestBody: json({ email: str('user@example.com'), password: str('123456') }, ['email', 'password']),
        responses: { ...ok, 401: { description: 'Sai thông tin đăng nhập' } },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Quên mật khẩu',
        requestBody: json({ email: str('user@example.com') }, ['email']),
        responses: ok,
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Đặt lại mật khẩu',
        requestBody: json({ token: str('reset-token'), newPassword: str('newpass123') }, ['token', 'newPassword']),
        responses: { ...ok, 400: { description: 'Token không hợp lệ' } },
      },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Lấy thông tin tài khoản hiện tại', security: user, responses: std },
      put: {
        tags: ['Auth'],
        summary: 'Cập nhật hồ sơ',
        security: user,
        requestBody: json({ HoTen: str('Nguyễn Văn A'), SoDienThoai: str('0901234567'), DiaChi: str('Hà Nội') }),
        responses: std,
      },
    },
    '/api/auth/me/complaints': {
      get: { tags: ['Auth'], summary: 'Khiếu nại của tôi', security: user, responses: std },
    },
    '/api/auth/me/favorites': {
      get: { tags: ['Auth'], summary: 'Danh sách homestay yêu thích', security: user, responses: std },
    },
    '/api/auth/me/bookings': {
      get: { tags: ['Auth'], summary: 'Lịch sử đặt phòng của tôi', security: user, responses: std },
    },

    // ---------------- HOMESTAYS ----------------
    '/api/homestays': {
      get: {
        tags: ['Homestays'],
        summary: 'Danh sách homestay (công khai, đã duyệt)',
        parameters: [
          { name: 'searchQuery', in: 'query', schema: { type: 'string' }, description: 'Từ khóa tên/địa điểm' },
          { name: 'soKhachToiDa', in: 'query', schema: { type: 'integer' } },
          { name: 'giaMin', in: 'query', schema: { type: 'number' } },
          { name: 'giaMax', in: 'query', schema: { type: 'number' } },
        ],
        responses: ok,
      },
      post: {
        tags: ['Homestays'],
        summary: 'Tạo homestay (chủ homestay)',
        security: user,
        requestBody: json({
          tenHomestay: str('Homestay Hồ Tây'),
          diaDiem: str('Hà Nội'),
          gia: num(500000),
          soKhachToiDa: { type: 'integer', example: 4 },
          tienIch: str('Wifi, Bếp, Điều hòa'),
          moTa: str('Mô tả homestay'),
        }),
        responses: { 201: { description: 'Tạo thành công' }, 401: std[401], 403: std[403] },
      },
    },
    '/api/homestays/{id}': {
      get: { tags: ['Homestays'], summary: 'Chi tiết homestay', parameters: [idParam()], responses: { ...ok, 404: std[404] } },
      put: {
        tags: ['Homestays'],
        summary: 'Cập nhật homestay (chủ)',
        security: user,
        parameters: [idParam()],
        requestBody: json({
          tenHomestay: str('Homestay Hồ Tây'),
          diaDiem: str('Hà Nội'),
          gia: num(500000),
          soKhachToiDa: { type: 'integer', example: 4 },
          tienIch: str('Wifi'),
          moTa: str('Mô tả'),
        }),
        responses: std,
      },
      delete: { tags: ['Homestays'], summary: 'Xóa homestay (chủ)', security: user, parameters: [idParam()], responses: std },
    },
    '/api/homestays/{id}/availability': {
      get: { tags: ['Homestays'], summary: 'Lịch phòng trống', parameters: [idParam()], responses: ok },
    },
    '/api/homestays/{id}/images': {
      post: {
        tags: ['Homestays'],
        summary: 'Upload ảnh homestay (tối đa 10 ảnh, chủ)',
        security: user,
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } },
              },
            },
          },
        },
        responses: std,
      },
    },
    '/api/homestays/{id}/favorite': {
      post: { tags: ['Homestays'], summary: 'Thêm vào yêu thích', security: user, parameters: [idParam()], responses: std },
      delete: { tags: ['Homestays'], summary: 'Bỏ yêu thích', security: user, parameters: [idParam()], responses: std },
    },
    '/api/homestays/{id}/reviews': {
      post: {
        tags: ['Homestays'],
        summary: 'Gửi đánh giá',
        security: user,
        parameters: [idParam()],
        requestBody: json({ soSao: { type: 'integer', minimum: 1, maximum: 5, example: 5 }, binhLuan: str('Rất tuyệt!') }),
        responses: std,
      },
    },
    '/api/homestays/{id}/can-review': {
      get: { tags: ['Homestays'], summary: 'Kiểm tra có thể đánh giá', security: user, parameters: [idParam()], responses: std },
    },
    '/api/homestays/{id}/book': {
      post: {
        tags: ['Homestays'],
        summary: 'Đặt phòng',
        security: user,
        parameters: [idParam()],
        requestBody: json(
          { ngayNhan: str('2026-11-01'), ngayTra: str('2026-11-03'), soLuongKhach: { type: 'integer', example: 2 } },
          ['ngayNhan', 'ngayTra', 'soLuongKhach']
        ),
        responses: { 201: { description: 'Đặt phòng thành công' }, 400: { description: 'Dữ liệu không hợp lệ / hết phòng' }, 401: std[401] },
      },
    },

    // ---------------- OWNER ----------------
    '/api/owner/register': {
      post: {
        tags: ['Owner'],
        summary: 'Đăng ký chủ homestay',
        requestBody: json(
          {
            email: str('owner@example.com'),
            password: str('123456'),
            hoTen: str('Trần Văn B'),
            soCCCD: str('012345678901'),
            soDienThoai: str('0901234567'),
            diaChi: str('Đà Lạt'),
          },
          ['email', 'password', 'hoTen', 'soCCCD']
        ),
        responses: { 201: { description: 'Đăng ký thành công' }, 400: { description: 'Dữ liệu không hợp lệ' } },
      },
    },
    '/api/owner/login': {
      post: {
        tags: ['Owner'],
        summary: 'Đăng nhập chủ homestay',
        requestBody: json({ email: str('owner@example.com'), password: str('123456') }, ['email', 'password']),
        responses: { ...ok, 401: { description: 'Sai thông tin đăng nhập' } },
      },
    },
    '/api/owner/forgot-password': {
      post: { tags: ['Owner'], summary: 'Quên mật khẩu (chủ)', requestBody: json({ email: str('owner@example.com') }, ['email']), responses: ok },
    },
    '/api/owner/reset-password': {
      post: {
        tags: ['Owner'],
        summary: 'Đặt lại mật khẩu (chủ)',
        requestBody: json({ token: str('reset-token'), newPassword: str('newpass123') }, ['token', 'newPassword']),
        responses: ok,
      },
    },
    '/api/owner/me/homestays': {
      get: { tags: ['Owner'], summary: 'Homestay của tôi', security: user, responses: std },
    },
    '/api/owner/me/bookings': {
      get: { tags: ['Owner'], summary: 'Đơn đặt phòng của tôi', security: user, responses: std },
    },
    '/api/owner/me/complaints': {
      get: { tags: ['Owner'], summary: 'Khiếu nại liên quan', security: user, responses: std },
    },
    '/api/owner/me/dashboard-stats': {
      get: { tags: ['Owner'], summary: 'Thống kê dashboard', security: user, responses: std },
    },
    '/api/owner/me/transactions': {
      get: { tags: ['Owner'], summary: 'Giao dịch của tôi', security: user, responses: std },
    },
    '/api/owner/me/profile': {
      get: { tags: ['Owner'], summary: 'Xem hồ sơ chủ', security: user, responses: std },
      put: {
        tags: ['Owner'],
        summary: 'Cập nhật hồ sơ chủ',
        security: user,
        requestBody: json({ hoTen: str('Trần Văn B'), soDienThoai: str('0901234567'), diaChi: str('Đà Lạt'), soCCCD: str('012345678901') }),
        responses: std,
      },
    },

    // ---------------- BOOKINGS ----------------
    '/api/bookings/{id}/status': {
      put: {
        tags: ['Bookings'],
        summary: 'Cập nhật trạng thái đơn (chủ)',
        security: user,
        parameters: [idParam('id', 'Mã đặt phòng')],
        requestBody: json(
          { trangThai: { type: 'string', enum: ['DaXacNhan', 'DangLuuTru', 'DaHoanThanh', 'DaHuy'] } },
          ['trangThai']
        ),
        responses: std,
      },
    },
    '/api/bookings/{id}/complain': {
      post: {
        tags: ['Bookings'],
        summary: 'Gửi khiếu nại cho đơn',
        security: user,
        parameters: [idParam('id', 'Mã đặt phòng')],
        requestBody: json({ noiDung: str('Nội dung khiếu nại') }, ['noiDung']),
        responses: std,
      },
    },
    '/api/bookings/{id}/cancel': {
      put: { tags: ['Bookings'], summary: 'Khách hủy đơn (khi ChoXacNhan)', security: user, parameters: [idParam('id', 'Mã đặt phòng')], responses: std },
    },
    '/api/bookings/{id}/payment-info': {
      get: { tags: ['Bookings'], summary: 'Thông tin thanh toán & QR demo', security: user, parameters: [idParam('id', 'Mã đặt phòng')], responses: std },
    },
    '/api/bookings/{id}/payment/select-method': {
      post: {
        tags: ['Bookings'],
        summary: 'Chọn phương thức thanh toán',
        security: user,
        parameters: [idParam('id', 'Mã đặt phòng')],
        requestBody: json({ method: { type: 'string', enum: ['ChuyenKhoanQR', 'TienMat'] } }, ['method']),
        responses: std,
      },
    },
    '/api/bookings/{id}/payment/simulate': {
      post: {
        tags: ['Bookings'],
        summary: 'Mô phỏng kết quả thanh toán QR',
        security: user,
        parameters: [idParam('id', 'Mã đặt phòng')],
        requestBody: json({ result: { type: 'string', enum: ['success', 'failed'] }, reason: str('Lý do (nếu thất bại)') }, ['result']),
        responses: { ...std, 400: { description: 'Thanh toán thất bại / tham số sai' } },
      },
    },
    '/api/bookings/{id}/payment/confirm-cash': {
      post: { tags: ['Bookings'], summary: 'Xác nhận đã thu tiền mặt (chủ)', security: user, parameters: [idParam('id', 'Mã đặt phòng')], responses: std },
    },
    '/api/bookings/{id}/transactions': {
      get: { tags: ['Bookings'], summary: 'Lịch sử giao dịch của đơn', security: user, parameters: [idParam('id', 'Mã đặt phòng')], responses: std },
    },

    // ---------------- COMPLAINTS ----------------
    '/api/complaints/{id}/resolve': {
      post: {
        tags: ['Complaints'],
        summary: 'Chủ giải quyết khiếu nại',
        security: user,
        parameters: [idParam('id', 'Mã khiếu nại')],
        requestBody: json({ ketQua: str('Nội dung giải quyết') }, ['ketQua']),
        responses: std,
      },
    },

    // ---------------- ADMIN ----------------
    '/api/admin/dashboard-stats': { get: { tags: ['Admin'], summary: 'Thống kê toàn hệ thống', security: user, responses: std } },
    '/api/admin/users': { get: { tags: ['Admin'], summary: 'Danh sách người dùng', security: user, responses: std } },
    '/api/admin/owners': { get: { tags: ['Admin'], summary: 'Danh sách chủ homestay', security: user, responses: std } },
    '/api/admin/homestays': { get: { tags: ['Admin'], summary: 'Tất cả homestay', security: user, responses: std } },
    '/api/admin/homestays/{id}/approval': {
      put: {
        tags: ['Admin'],
        summary: 'Duyệt / từ chối homestay',
        security: user,
        parameters: [idParam()],
        requestBody: json({ trangThaiDuyet: { type: 'string', example: 'DaDuyet' } }, ['trangThaiDuyet']),
        responses: std,
      },
    },
    '/api/admin/homestays/{id}': {
      delete: { tags: ['Admin'], summary: 'Xóa homestay', security: user, parameters: [idParam()], responses: std },
    },
    '/api/admin/users/{id}/status': {
      put: {
        tags: ['Admin'],
        summary: 'Khóa / mở khóa người dùng',
        security: user,
        parameters: [idParam()],
        requestBody: json({ isActive: { type: 'boolean', example: false } }, ['isActive']),
        responses: std,
      },
    },
    '/api/admin/owners/{id}/status': {
      put: {
        tags: ['Admin'],
        summary: 'Khóa / mở khóa chủ homestay',
        security: user,
        parameters: [idParam()],
        requestBody: json({ isActive: { type: 'boolean', example: false } }, ['isActive']),
        responses: std,
      },
    },
    '/api/admin/owners/{id}/role': {
      put: {
        tags: ['Admin'],
        summary: 'Cập nhật vai trò chủ',
        security: user,
        parameters: [idParam()],
        requestBody: json({ role: str('admin') }, ['role']),
        responses: std,
      },
    },
    '/api/admin/reviews': { get: { tags: ['Admin'], summary: 'Tất cả đánh giá', security: user, responses: std } },
    '/api/admin/reviews/{id}': {
      delete: { tags: ['Admin'], summary: 'Xóa đánh giá', security: user, parameters: [idParam()], responses: std },
    },
    '/api/admin/bookings': { get: { tags: ['Admin'], summary: 'Tất cả đơn đặt phòng', security: user, responses: std } },
    '/api/admin/bookings/{id}/status': {
      put: {
        tags: ['Admin'],
        summary: 'Cập nhật trạng thái đơn',
        security: user,
        parameters: [idParam()],
        requestBody: json({ trangThai: str('DaXacNhan') }, ['trangThai']),
        responses: std,
      },
    },
    '/api/admin/transactions': { get: { tags: ['Admin'], summary: 'Tất cả giao dịch', security: user, responses: std } },
    '/api/admin/complaints': { get: { tags: ['Admin'], summary: 'Tất cả khiếu nại', security: user, responses: std } },
    '/api/admin/complaints/{id}/resolve': {
      post: {
        tags: ['Admin'],
        summary: 'Admin giải quyết khiếu nại',
        security: user,
        parameters: [idParam()],
        requestBody: json({ ketQua: str('Nội dung giải quyết') }, ['ketQua']),
        responses: std,
      },
    },
  },
};

export default swaggerSpec;

