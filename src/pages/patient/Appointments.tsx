import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { bookingApi, cancelUpdateBooking } from '../../api/patientApi/bookingAPI';
import type { Booking, Slot } from '../../api/patientApi/bookingAPI';
import { bookingApiForBookingPage } from '../../api/patientApi/bookingApiForBookingPage';

const AppointmentDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ánh xạ trạng thái từ database sang hiển thị tiếng Việt
  const mapStatusToDisplay = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Đã đặt lịch';
      case 'cancelled':
      case 'đã hủy':
        return 'Đã hủy';
      case 'chờ thanh toán':
        return 'Chờ thanh toán';
      case 'đã quá hạn':
        return 'Đã quá hạn';
      case 'đã khám':
        return 'Đã khám';
      default:
        return status;
    }
  };

  useEffect(() => {
    const fetchBookingDetail = async () => {
      try {
        setLoading(true);
        if (!bookingId) {
          throw new Error('Không tìm thấy ID lịch hẹn');
        }

        // Lấy danh sách booking và tìm booking theo bookingId
        const bookings = await bookingApi.getMyBookings();
        const bookingData = bookings.find(b => b.bookingId === bookingId);
        if (!bookingData) {
          throw new Error('Không tìm thấy dữ liệu lịch hẹn');
        }

        // Lấy thông tin slot từ bookingData (slot đã được backend ràng buộc đúng)
        setSlot(bookingData.slot || null);
        setBooking(bookingData);
      } catch (error: any) {
        console.error("Lỗi khi lấy chi tiết lịch hẹn:", error);
        setError(error.message || "Không thể lấy thông tin chi tiết lịch hẹn. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetail();
  }, [bookingId]);

  const handleCancelBooking = async () => {
  if (!booking) return;

  if (hoursToAppointment < minHoursToCancel) {
    alert(`Không thể hủy lịch hẹn khi ${timeRemainingText} đến lịch hẹn. Vui lòng liên hệ trực tiếp với phòng khám để hủy lịch hẹn.`);
    return;
  }

  if (!window.confirm("Bạn có chắc chắn muốn hủy lịch hẹn này?")) return;

  try {
    setCancelLoading(true);
    await cancelUpdateBooking(booking.bookingId);

    setBooking(prev => prev ? { ...prev, status: "cancelled" } : null);
    alert("Hủy lịch hẹn thành công!");
  } catch (err: any) {
    console.error("Lỗi khi hủy lịch hẹn:", err);
    alert(err.message || "Hủy lịch hẹn thất bại. Vui lòng thử lại sau.");
  } finally {
    setCancelLoading(false);
  }
};

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link to="/patient/dashboard" className="text-blue-500 hover:text-blue-700">
          ← Quay lại Dashboard
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Không tìm thấy thông tin lịch hẹn.
        </div>
        <Link to="/patient/dashboard" className="text-blue-500 hover:text-blue-700">
          ← Quay lại Dashboard
        </Link>
      </div>
    );
  }

  const canCancelBooking = booking.status !== "Đã khám" && 
                         booking.status !== "cancelled" && 
                         booking.status !== "Đã hủy" && 
                         new Date(booking.dateBooking) > new Date();

  // Tính thời gian còn lại đến lịch hẹn (theo giờ) - sử dụng thông tin slot chính xác
  const calculateHoursToAppointment = () => {
    if (!booking) return 0;

    // Ưu tiên dùng slot từ state slot
    if (slot && slot.startTime) {
      const appointmentDate = booking.dateBooking.split('T')[0];
      const startTime = slot.startTime; // "08:00"
      const appointmentDateTime = new Date(`${appointmentDate}T${startTime}:00+07:00`);
      const appointmentTime = appointmentDateTime.getTime();
      const currentTime = new Date().getTime();
      const diffInMs = appointmentTime - currentTime;
      console.log('appointmentDate:', appointmentDate);
console.log('startTime:', startTime);
console.log('appointmentDateTime:', appointmentDateTime.toString());
console.log('currentTime:', new Date().toString());
      return Math.round(diffInMs / (1000 * 60 * 60));
    }

    // Nếu không có slot, fallback về dateBooking
    const appointmentTime = new Date(booking.dateBooking).getTime();
    const currentTime = new Date().getTime();
    const diffInMs = appointmentTime - currentTime;
    return Math.round(diffInMs / (1000 * 60 * 60));
  };

  const hoursToAppointment = calculateHoursToAppointment();
  
  // Kiểm tra nếu thời gian còn lại ít hơn hoặc bằng 24 giờ thì không cho phép hủy
  const minHoursToCancel = 24;
  const canCancelByTime = hoursToAppointment > minHoursToCancel;

  // Định dạng thời gian còn lại thành dạng dễ đọc
  const formatTimeRemaining = (hours: number) => {
    if (hours < 0) return "Đã quá thời gian hẹn";
    if (hours < 1) return "Còn dưới 1 giờ";
    if (hours <= 24) return `Còn ${hours} giờ`;
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours === 0) {
      return `Còn ${days} ngày`;
    } else {
      return `Còn ${days} ngày ${remainingHours} giờ`;
    }
  };

  const timeRemainingText = formatTimeRemaining(hoursToAppointment);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link to="/patient/dashboard" className="text-blue-500 hover:text-blue-700">
          ← Quay lại Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">Chi tiết lịch hẹn</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Thông tin lịch hẹn</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">ID lịch hẹn:</span> 
                <span className="ml-2">{booking.bookingId}</span>
              </div>
              <div>
                <span className="font-medium">Ngày hẹn:</span> 
                <span className="ml-2">{new Date(booking.dateBooking).toLocaleDateString('vi-VN',{timeZone:'UTC'})}</span>
              </div>
              <div>
                <span className="font-medium">Thời gian:</span> 
                <span className="ml-2">{booking.slot?.startTime} - {booking.slot?.endTime}</span>
              </div>
              {new Date(booking.dateBooking) > new Date() && (
                <div>
                  <span className="font-medium">Thời gian còn lại:</span> 
                  <span className={`ml-2 ${
                    hoursToAppointment < 24 ? "text-red-600 font-semibold" : "text-green-600"
                  }`}>
                    {timeRemainingText}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium">Trạng thái:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-sm ${
                  booking.status.toLowerCase() === "pending" ? "bg-green-100 text-green-800" :
                  booking.status.toLowerCase() === "cancelled" || booking.status === "Đã hủy" ? "bg-red-100 text-red-800" :
                  booking.status === "Chờ thanh toán" ? "bg-yellow-100 text-yellow-800" :
                  booking.status === "Đã quá hạn" ? "bg-red-100 text-red-800" :
                  booking.status === "Đã khám" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {mapStatusToDisplay(booking.status)}
                </span>
              </div>
              <div>
                <span className="font-medium">Mô tả:</span> 
                <p className="mt-1 text-gray-700">{booking.note || "Không có ghi chú"}</p>
              </div>
              <div>
                <span className="font-medium">Ghi chú:</span> 
                <p className="mt-1 text-gray-700">{booking.description || "Không có mô tả"}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Thông tin dịch vụ và bác sĩ</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Dịch vụ:</span> 
                <span className="ml-2">{booking.service?.name || "Không có thông tin"}</span>
              </div>
              <div>
                <span className="font-medium">Giá dịch vụ:</span> 
                <span className="ml-2">{booking.service?.price?.toLocaleString('vi-VN') || "N/A"} VND</span>
              </div>
              <div>
                <span className="font-medium">Bác sĩ:</span> 
                <span className="ml-2">{booking.doctor?.doctorName || "Không có thông tin"}</span>
              </div>
              <div>
                <span className="font-medium">Chuyên môn:</span> 
                <span className="ml-2">{booking.doctor?.specialization || "Không có thông tin"}</span>
              </div>
              <div>
                <span className="font-medium">Liên hệ bác sĩ:</span> 
                <div className="mt-1">
                  <div>Email: {booking.doctor?.email || "Không có thông tin"}</div>
                  <div>Điện thoại: {booking.doctor?.phone || "Không có thông tin"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {booking.payment && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Thông tin thanh toán</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">ID thanh toán:</span> 
                <span className="ml-2">{booking.payment.paymentId}</span>
              </div>
              <div>
                <span className="font-medium">Số tiền:</span> 
                <span className="ml-2">{booking.payment.totalAmount?.toLocaleString('vi-VN') || "N/A"} VND</span>
              </div>
              <div>
                <span className="font-medium">Phương thức:</span> 
                <span className="ml-2">{booking.payment.method || "Không có thông tin"}</span>
              </div>
              <div>
                <span className="font-medium">Trạng thái thanh toán:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-sm ${
                  booking.payment.status === "done" ? "bg-green-100 text-green-800" :
                  booking.payment.status === "tryAgain" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {booking.payment.status === "done" ? "Bạn đã thanh toán, chờ cập nhật mới nhất từ hệ thống" : 
                   booking.payment.status === "tryAgain" ? "Vui lòng thanh toán" : 
                   booking.payment.status || "Thông tin sẽ được cập nhật sau khi thanh toán"}
                </span>
                {booking.payment.status === "tryAgain" && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 text-sm">
                      Bạn đã hoàn tất thủ tục thanh toán, vui lòng chờ lịch hẹn và khám bệnh. 
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

       {/* Khối thanh toán riêng biệt */}
{(
  (booking.status.toLowerCase() === "pending" || !booking.payment || (booking.payment && booking.payment.status.toLowerCase() === "pending")) && booking.status !== "cancelled"
) && (
  <div className="mt-6 border-t pt-6">
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 {booking.payment?.status === "pending"
              ? "Lịch hẹn sẽ được cập nhật sau"
              : "Hoàn tất thanh toán "}
          </h3>
          <p className="text-blue-700 mb-3">
            {booking.payment?.status === "done"
              ? "Bạn đã thanh toán thành công. Vui lòng chờ admin xác nhận, lịch hẹn sẽ được cập nhật trạng thái."
              : "Lịch hẹn của bạn sẽ được cập nhật sau khi thanh toán thành công."}
          </p>
          <div className="text-sm text-blue-600">
            <div className="mb-1">
              <span className="font-medium">Dịch vụ:</span> {booking.service?.name || "N/A"}
            </div>
            <div className="mb-1">
              <span className="font-medium">Bác sĩ:</span> {booking.doctor?.doctorName || "N/A"}
            </div>
            <div>
              <span className="font-medium">Tổng tiền:</span>
              <span className="text-lg font-bold text-blue-800 ml-1">
                {(booking.payment?.totalAmount || booking.service?.price)?.toLocaleString('vi-VN') || "N/A"} VND
              </span>
            </div>
          </div>
        </div>
        {(!booking.payment || booking.payment.status !== "done") && (
          <div className="ml-6">
            <Link
              to={`/patient/payment/${booking.bookingId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Thanh toán ngay
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
)}

        {booking.examination && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Thông tin khám bệnh</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">ID khám bệnh:</span> 
                <span className="ml-2">{booking.examination.examinationId}</span>
              </div>
              <div>
                <span className="font-medium">Ngày khám:</span> 
                <span className="ml-2">{new Date(booking.examination.examinationDate).toLocaleDateString('vi-VN')}</span>
              </div>
              <div>
                <span className="font-medium">Mô tả khám:</span> 
                <p className="mt-1 text-gray-700">{booking.examination.examinationDescription || "Không có mô tả"}</p>
              </div>
              <div>
                <span className="font-medium">Kết quả:</span> 
                <p className="mt-1 text-gray-700">{booking.examination.result || "Chưa có kết quả"}</p>
              </div>
              <div>
                <span className="font-medium">Trạng thái khám:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-sm ${
                  booking.examination.status === "Completed" ? "bg-green-100 text-green-800" :
                  booking.examination.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                  booking.examination.status === "Scheduled" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {booking.examination.status === "Completed" ? "Đã hoàn thành" : 
                   booking.examination.status === "in-progress" ? "Đang tiến hành" :
                   booking.examination.status === "Scheduled" ? "Đã lên lịch" :
                   booking.examination.status || "Không có thông tin"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-end space-y-3">
  {/* Thông báo phí hủy lịch hẹn */}
  {canCancelBooking && canCancelByTime && (
    <div className="mb-2 w-full lg:w-auto">
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm">
        ⚠️ Khi hủy lịch hẹn, bạn sẽ mất phí đặt lịch.
      </div>
    </div>
  )}
  <div className="flex justify-end space-x-4 w-full">
    <Link 
      to="/patient/dashboard"
      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
    >
      Quay lại
    </Link>

    {canCancelBooking && canCancelByTime && (
      <button 
        className={`px-4 py-2 rounded-md text-white ${
          cancelLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
        }`}
        onClick={handleCancelBooking}
        disabled={cancelLoading}
      >
        {cancelLoading ? "Đang hủy..." : "Hủy lịch hẹn"}
      </button>
    )}
  </div>
</div>
      </div>
    </div>
  );
}

export default AppointmentDetail;