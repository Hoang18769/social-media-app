
// Định nghĩa các thông báo lỗi bằng tiếng Việt
export const ERROR_MESSAGES = {
  // Account errors (1000-1999)
  1000: "Tài khoản không tồn tại",
  1001: "Tài khoản chưa được xác thực",
  1002: "Tài khoản đã bị khóa",
  1003: "Xác thực thất bại",
  1004: "Mật khẩu không hợp lệ",
  1005: "Email không hợp lệ",
  1006: "Email là bắt buộc",
  1007: "Mật khẩu là bắt buộc",
  1008: "Không tìm thấy mã xác thực",
  1009: "Mã xác thực không đúng hoặc đã hết hạn",
  1010: "Refresh token là bắt buộc",
  1011: "Refresh token không hợp lệ hoặc đã hết hạn",
  1012: "Tài khoản đã tồn tại",
  1013: "Token không hợp lệ",
  1014: "Token đã hết hạn",
  1015: "Mã xác thực là bắt buộc",
  1016: "Tài khoản đã được xác thực",

  // User profile errors (2000-2999)
  2000: "Họ là bắt buộc",
  2001: "Tên là bắt buộc",
  2002: "Ngày sinh là bắt buộc",
  2003: "Bạn phải trên 16 tuổi",
  2004: "Họ quá dài",
  2005: "Tên quá dài",
  2006: "Chưa đủ 30 ngày kể từ lần thay đổi ngày sinh gần nhất",
  2007: "Chưa đủ 30 ngày kể từ lần thay đổi tên gần nhất",
  2008: "Chưa đủ 30 ngày kể từ lần thay đổi username gần nhất",
  2009: "Email chưa được xác thực",
  2010: "Người dùng không tồn tại",
  2011: "Username là bắt buộc",
  2012: "Username đã tồn tại",
  2013: "Ảnh đại diện là bắt buộc",
  2014: "Không có gì thay đổi",

  // File storage errors (3000-3999)
  3000: "Lỗi khởi tạo bộ nhớ",
  3001: "File là bắt buộc",
  3002: "File không hợp lệ",
  3003: "Tải file thất bại",
  3004: "Không tìm thấy file",
  3005: "Xóa file thất bại",
  3006: "Tải file thất bại",
  3007: "Chỉ chấp nhận file hình ảnh",
  3008: "Kích thước file không hợp lệ",
  3009: "Danh sách chứa file không hợp lệ",
  3010: "Chỉ chấp nhận file hình ảnh hoặc video",

  // Friend/relationship errors (4000-4999)
  4000: "Không thể thực hiện hành động với chính mình",
  4001: "Gửi lời mời kết bạn thất bại",
  4002: "Đã đạt giới hạn gửi lời mời kết bạn",
  4003: "Đã đạt giới hạn nhận lời mời kết bạn",
  4004: "Không tìm thấy lời mời",
  4005: "Chấp nhận lời mời thất bại",
  4006: "Đã chặn người dùng này",
  4007: "Bạn đã bị chặn",
  4008: "Chưa chặn người dùng này",
  4009: "Đã đạt giới hạn chặn",
  4010: "Không thể chặn chính mình",
  4011: "Không tìm thấy người dùng bị chặn",
  4012: "Không tìm thấy bạn bè",

  // Post errors (5000-5999)
  5000: "Nội dung bài viết và file đính kèm không thể để trống",
  5001: "Độ dài nội dung bài viết không hợp lệ",
  5002: "Số lượng file đính kèm không hợp lệ",
  5003: "Không tìm thấy bài viết",
  5005: "Chỉ có thể chia sẻ bài viết công khai",
  5006: "Quyền riêng tư không thay đổi",
  5007: "Xóa file đính kèm không hợp lệ",
  5008: "Nội dung bài viết không thay đổi",
  5009: "Đã thích bài viết này",
  5010: "Chưa thích bài viết này",
  5011: "Bài viết đã bị xóa",

  // Comment errors (6000-6999)
  6000: "Không tìm thấy bình luận",
  6001: "Nội dung bình luận và file đính kèm không thể để trống",
  6002: "Độ dài nội dung bình luận không hợp lệ",
  6003: "ID bài viết là bắt buộc",
  6004: "ID bình luận gốc là bắt buộc",
  6005: "Đã thích bình luận này",
  6006: "Chưa thích bình luận này",
  6007: "Không thể trả lời bình luận đã được trả lời",

  // Chat/Message errors (7000-7999)
  7000: "Không tìm thấy cuộc trò chuyện",
  7001: "Username là bắt buộc",
  7002: "Độ dài nội dung tin nhắn không hợp lệ",
  7003: "ID cuộc trò chuyện và ID người dùng không thể để trống",
  7004: "Không tìm thấy tin nhắn",
  7005: "Không thể xóa tin nhắn",
  7006: "Nội dung tin nhắn văn bản là bắt buộc",
  7007: "Nội dung tin nhắn văn bản không thay đổi",
  7008: "Không thể chỉnh sửa tin nhắn file",
  7009: "Không thể chỉnh sửa tin nhắn",
  7010: "Tin nhắn file là bắt buộc",
  7011: "Bạn đang trong cuộc gọi",
  7012: "Người nhận đang trong cuộc gọi",
  7013: "Không tìm thấy cuộc gọi",
  7014: "Chưa sẵn sàng cho cuộc gọi",

  // Search errors (9000-9999)
  9000: "Từ khóa tìm kiếm là bắt buộc",
  9992: "Kênh websocket không hợp lệ",
  9993: "Chỉ chấp nhận chữ cái",
  9994: "Không có quyền truy cập",
  9995: "Dữ liệu đầu vào không hợp lệ",
  9996: "UUID không hợp lệ",
  9997: "Chưa đăng nhập",
  9998: "Không tìm thấy tài nguyên",
  9999: "Có lỗi xảy ra",
};

/**
 * Xử lý lỗi API và trả về thông báo lỗi phù hợp
 * @param {Error} error - Lỗi từ API
 * @returns {string} Thông báo lỗi đã được xử lý
 */
export function parseApiError(error) {
  console.log('🔍 Parsing API error:', error);
  
  // Kiểm tra lỗi có response không
  if (error.response) {
    const { data, status } = error.response;
    
    // Kiểm tra có mã lỗi từ server không
    if (data && data.code) {
      const errorMessage = ERROR_MESSAGES[data.code];
      if (errorMessage) {
        console.log(`📋 Found error message for code ${data.code}: ${errorMessage}`);
        return errorMessage;
      }
      
      // Nếu không tìm thấy mã lỗi trong danh sách, dùng message từ server
      if (data.message) {
        console.log(`📋 Using server message: ${data.message}`);
        return data.message;
      }
    }
    
    // Xử lý theo HTTP status code
    switch (status) {
      case 400:
        return "Dữ liệu không hợp lệ";
      case 401:
        return "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn";
      case 403:
        return "Không có quyền truy cập";
      case 404:
        return "Không tìm thấy tài nguyên";
      case 409:
        return "Dữ liệu đã tồn tại";
      case 422:
        return "Dữ liệu không hợp lệ";
      case 429:
        return "Quá nhiều yêu cầu, vui lòng thử lại sau";
      case 500:
        return "Lỗi máy chủ, vui lòng thử lại sau";
      case 502:
        return "Lỗi kết nối máy chủ";
      case 503:
        return "Dịch vụ tạm thời không khả dụng";
      default:
        return `Lỗi ${status}: ${data?.message || 'Có lỗi xảy ra'}`;
    }
  }
  
  // Xử lý lỗi network
  if (error.request) {
    console.log('🌐 Network error:', error.message);
    return "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet";
  }
  
  // Xử lý lỗi khác
  console.log('❌ Unknown error:', error.message);
  return error.message || "Có lỗi không xác định xảy ra";
}

/**
 * Xử lý lỗi API với chi tiết hơn, trả về object
 * @param {Error} error - Lỗi từ API
 * @returns {Object} Object chứa thông tin lỗi chi tiết
 */
export function parseApiErrorDetailed(error) {
  const message = parseApiError(error);
  
  return {
    message,
    code: error.response?.data?.code || null,
    status: error.response?.status || null,
    type: error.response ? 'api' : error.request ? 'network' : 'unknown',
    originalError: error
  };
}

/**
 * Kiểm tra xem có phải lỗi xác thực không
 * @param {Error} error - Lỗi từ API
 * @returns {boolean} True nếu là lỗi xác thực
 */
export function isAuthenticationError(error) {
  if (!error.response) return false;
  
  const { status, data } = error.response;
  const authErrorCodes = [1001, 1003, 1011, 1013, 1014, 2009, 9997];
  
  return status === 401 || (data?.code && authErrorCodes.includes(data.code));
}

/**
 * Kiểm tra xem có phải lỗi validation không
 * @param {Error} error - Lỗi từ API
 * @returns {boolean} True nếu là lỗi validation
 */
export function isValidationError(error) {
  if (!error.response) return false;
  
  const { status, data } = error.response;
  const validationErrorCodes = [
    1004, 1005, 1006, 1007, 1015, // Auth validation
    2000, 2001, 2002, 2003, 2004, 2005, 2011, 2013, // User validation
    3001, 3002, 3007, 3008, 3009, 3010, // File validation
    5000, 5001, 5002, // Post validation
    6001, 6002, 6003, 6004, // Comment validation
    7001, 7002, 7006, 7010, // Message validation
    9000, 9993, 9995, 9996 // General validation
  ];
  
  return status === 400 || status === 422 || (data?.code && validationErrorCodes.includes(data.code));
}