// src/components/PatientTreatments.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Pill,
  Syringe,
  FileText,
  Calendar,
  TestTube,
  ArrowUpRight,
  Microscope,
  Bookmark,
  BarChart,
  Info
} from "lucide-react";
import { Button } from "../../components/ui/button";
import treatmentPlanAPI from "../../api/patientApi/treatmentPlanAPI";
import type { TreatmentPlan, TreatmentProcess } from "../../api/patientApi/treatmentPlanAPI";
import { bookingApi } from "../../api/patientApi/bookingAPI";
import type { Booking } from "../../api/patientApi/bookingAPI";

// Interface cho dữ liệu điều trị (tương tự mock data)
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  instructions: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  purpose: string;
  status: string;
}

interface TestResult {
  date: string;
  type: string;
  result: string;
  details: string;
}

interface Stage {
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  description: string;
}

interface Treatment {
  id: string;
  type: string;
  startDate: string;
  endDate?: string;
  doctor: string;
  status: string;
  progress: number;
  currentStage?: string;
  nextStage?: string;
  nextDate?: string;
  notes: string;
  result?: string;
  medications: Medication[];
  appointments: Appointment[];
  testResults: TestResult[];
  stages: Stage[];
}

const PatientTreatments = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Hàm ánh xạ TreatmentPlan và Booking sang Treatment
  const mapToTreatment = (plan: TreatmentPlan, bookings: Booking[]): Treatment => {
    // Xác định tiến độ dựa trên trạng thái và số giai đoạn hoàn thành
    const completedProcesses = plan.treatmentProcesses.filter(p => p.status === "Completed").length;
    const totalProcesses = plan.treatmentProcesses.length;
    const progress = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;

    // Lấy giai đoạn hiện tại và tiếp theo
    const currentProcess = plan.treatmentProcesses.find(p => p.status === "InProgress");
    const nextProcess = plan.treatmentProcesses.find(p => p.status === "Pending");

    // Ánh xạ bookings thành appointments
    const appointments: Appointment[] = bookings
      .filter(b => b.doctorId === plan.doctorId && b.dateBooking >= plan.startDate)
      .map(b => ({
        id: b.bookingId,
        date: b.dateBooking,
        time: b.slot?.startTime || "N/A",
        purpose: b.description || b.service?.name || "Tư vấn",
        status: b.examination?.status || "upcoming"
      }));

    // Dữ liệu giả cho medications, testResults (vì API không cung cấp)
    const medications: Medication[] = []; // Cần API bổ sung
    const testResults: TestResult[] = []; // Cần API bổ sung

    // Ánh xạ treatmentProcesses thành stages
    const stages: Stage[] = plan.treatmentProcesses.map(p => ({
      name: p.method,
      startDate: p.actualDate || p.scheduledDate,
      endDate: p.status === "Completed" ? p.actualDate : null,
      status: p.status === "InProgress" ? "current" : p.status === "Completed" ? "completed" : "upcoming",
      description: p.result || `Giai đoạn ${p.method}`
    }));

    return {
      id: plan.treatmentPlanId,
      type: plan.method,
      startDate: plan.startDate,
      endDate: plan.endDate,
      doctor: plan.doctor.doctorName,
      status: plan.status.toLowerCase(),
      progress,
      currentStage: currentProcess?.method,
      nextStage: nextProcess?.method,
      nextDate: nextProcess?.scheduledDate,
      notes: plan.treatmentDescription || "Không có ghi chú",
      result: plan.treatmentProcesses.find(p => p.result)?.result,
      medications,
      appointments,
      testResults,
      stages
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Giả sử userId được lưu trong localStorage
        const currentUser = localStorage.getItem("userInfo");
        const userId = currentUser ? JSON.parse(currentUser).userId : null;
        if (!userId) {
          throw new Error("Vui lòng đăng nhập để xem thông tin điều trị");
        }

        // Lấy patientId từ userId
        const patientId = await treatmentPlanAPI.getPatientIdFromUserId(userId);
        console.log("Patient ID:", patientId);

        // Lấy danh sách TreatmentPlan
        const treatmentPlans = await treatmentPlanAPI.getAllTreatmentPlansByPatient(patientId);
        console.log("Treatment Plans:", treatmentPlans);

        // Lấy danh sách Booking
        const bookings = await bookingApi.getMyBookings();
        console.log("Bookings:", bookings);

        // Ánh xạ dữ liệu sang định dạng Treatment
        const mappedTreatments = treatmentPlans.map(plan => mapToTreatment(plan, bookings));
        setTreatments(mappedTreatments);
        setSelectedTreatment(mappedTreatments[0] || null);
      } catch (err) {
        setError("Không thể tải dữ liệu điều trị. Vui lòng thử lại sau.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Filter treatments
  const filteredTreatments = treatments.filter(treatment => {
    const matchesSearch = 
      treatment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      activeFilter === "all" || 
      treatment.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  if (error) {
    return (
      <div className="py-20 flex justify-center items-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Giữ nguyên phần render của component, chỉ thay đổi dữ liệu đầu vào
  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý quá trình điều trị</h1>
          <Link to="/booking">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Đặt lịch tư vấn
            </Button>
          </Link>
        </div>
        
        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setActiveFilter("in-progress")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilter === "in-progress"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Đang thực hiện
              </button>
              <button
                onClick={() => setActiveFilter("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilter === "completed"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Đã hoàn thành
              </button>
              <button
                onClick={() => setActiveFilter("cancelled")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilter === "cancelled"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Đã hủy
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm theo loại điều trị, bác sĩ, mã điều trị..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Tìm kiếm
              </Button>
            </form>
          </div>
        </div>
        
        {filteredTreatments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Treatments List */}
            <div className="md:col-span-1 space-y-4">
              {filteredTreatments.map((treatment) => (
                <motion.div
                  key={treatment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
                    selectedTreatment?.id === treatment.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-100'
                  }`}
                  onClick={() => {
                    setSelectedTreatment(treatment);
                    setActiveTab("overview");
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        treatment.status === 'in-progress' 
                          ? 'bg-blue-100 text-blue-800' 
                          : treatment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {treatment.status === 'in-progress' 
                          ? 'Đang thực hiện' 
                          : treatment.status === 'completed'
                            ? 'Đã hoàn thành'
                            : 'Đã hủy'}
                      </span>
                      <span className="text-xs text-gray-500">{treatment.id}</span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900">Điều trị {treatment.type}</h3>
                    <p className="text-gray-600 text-sm mt-1">{treatment.doctor}</p>
                    
                    <div className="flex items-center mt-3 text-gray-500 text-sm">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Bắt đầu: {treatment.startDate}</span>
                    </div>
                    
                    {treatment.status === 'in-progress' && (
                      <div className="mt-3">
                        <div className="flex justify-between mb-1 text-xs">
                          <span className="font-medium text-gray-700">Tiến độ</span>
                          <span className="font-medium text-gray-700">{treatment.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${treatment.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {treatment.status === 'completed' && treatment.result && (
                      <div className="mt-3 text-sm">
                        <span className="font-medium text-gray-700">Kết quả: </span>
                        <span className={`font-medium ${treatment.result === 'Thành công' ? 'text-green-600' : 'text-red-600'}`}>
                          {treatment.result}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Treatment Detail */}
            <div className="md:col-span-3">
              {selectedTreatment && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Treatment Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Điều trị {selectedTreatment.type} - {selectedTreatment.id}
                        </h2>
                        <p className="text-gray-600">Bác sĩ phụ trách: {selectedTreatment.doctor}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTreatment.status === 'in-progress' 
                          ? 'bg-blue-100 text-blue-800' 
                          : selectedTreatment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedTreatment.status === 'in-progress' 
                          ? 'Đang thực hiện' 
                          : selectedTreatment.status === 'completed'
                            ? 'Đã hoàn thành'
                            : 'Đã hủy'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-500">Ngày bắt đầu</p>
                          <p className="font-medium">{selectedTreatment.startDate}</p>
                        </div>
                      </div>
                      
                      {selectedTreatment.status === 'completed' && selectedTreatment.endDate && (
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-500">Ngày kết thúc</p>
                            <p className="font-medium">{selectedTreatment.endDate}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedTreatment.status === 'in-progress' && selectedTreatment.nextDate && (
                        <div className="flex items-center">
                          <CalendarClock className="h-5 w-5 mr-2 text-yellow-600" />
                          <div>
                            <p className="text-sm text-gray-500">Ngày tiếp theo</p>
                            <p className="font-medium">{selectedTreatment.nextDate}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="border-b border-gray-100">
                    <div className="flex overflow-x-auto">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`py-3 px-6 font-medium text-sm focus:outline-none whitespace-nowrap ${
                          activeTab === "overview"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Tổng quan
                      </button>
                      <button
                        onClick={() => setActiveTab("medications")}
                        className={`py-3 px-6 font-medium text-sm focus:outline-none whitespace-nowrap ${
                          activeTab === "medications"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Thuốc điều trị
                      </button>
                      <button
                        onClick={() => setActiveTab("appointments")}
                        className={`py-3 px-6 font-medium text-sm focus:outline-none whitespace-nowrap ${
                          activeTab === "appointments"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Lịch hẹn
                      </button>
                      <button
                        onClick={() => setActiveTab("test-results")}
                        className={`py-3 px-6 font-medium text-sm focus:outline-none whitespace-nowrap ${
                          activeTab === "test-results"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Kết quả xét nghiệm
                      </button>
                      <button
                        onClick={() => setActiveTab("stages")}
                        className={`py-3 px-6 font-medium text-sm focus:outline-none whitespace-nowrap ${
                          activeTab === "stages"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Các giai đoạn
                      </button>
                    </div>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                      <div>
                        {selectedTreatment.status === 'in-progress' && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiến độ điều trị</h3>
                            <div className="mb-4">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Hoàn thành</span>
                                <span className="text-sm font-medium text-gray-700">{selectedTreatment.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${selectedTreatment.progress}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-start">
                                  <div className="mt-0.5 mr-3">
                                    <Bookmark className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500 mb-1">Giai đoạn hiện tại</p>
                                    <p className="font-medium text-gray-900">{selectedTreatment.currentStage}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-start">
                                  <div className="mt-0.5 mr-3">
                                    <ArrowUpRight className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500 mb-1">Giai đoạn tiếp theo</p>
                                    <p className="font-medium text-gray-900">{selectedTreatment.nextStage}</p>
                                    <p className="text-sm text-blue-600 mt-1">Ngày: {selectedTreatment.nextDate}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {selectedTreatment.status === 'completed' && selectedTreatment.result && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kết quả điều trị</h3>
                            <div className={`p-4 rounded-lg ${
                              selectedTreatment.result === 'Thành công'
                                ? 'bg-green-50 border border-green-100'
                                : 'bg-red-50 border border-red-100'
                            }`}>
                              <div className="flex items-start">
                                <div className="mt-0.5 mr-3">
                                  {selectedTreatment.result === 'Thành công' ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className={`font-medium ${
                                    selectedTreatment.result === 'Thành công'
                                      ? 'text-green-800'
                                      : 'text-red-800'
                                  }`}>
                                    {selectedTreatment.result}
                                  </p>
                                  <p className="text-gray-600 mt-1">{selectedTreatment.notes}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú từ bác sĩ</h3>
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <div className="flex items-start">
                              <div className="mt-0.5 mr-3">
                                <Info className="h-5 w-5 text-yellow-600" />
                              </div>
                              <p className="text-gray-700">{selectedTreatment.notes}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-start">
                                <div className="mt-0.5 mr-3">
                                  <Pill className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Thuốc điều trị</p>
                                  <p className="text-sm text-gray-600">{selectedTreatment.medications.length} loại thuốc</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-start">
                                <div className="mt-0.5 mr-3">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Lịch hẹn</p>
                                  <p className="text-sm text-gray-600">{selectedTreatment.appointments.length} lịch hẹn</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-start">
                                <div className="mt-0.5 mr-3">
                                  <TestTube className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Xét nghiệm</p>
                                  <p className="text-sm text-gray-600">{selectedTreatment.testResults.length} kết quả</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Medications Tab */}
                    {activeTab === "medications" && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thuốc điều trị</h3>
                        
                        {selectedTreatment.medications.length > 0 ? (
                          <div className="space-y-4">
                            {selectedTreatment.medications.map((medication, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                    {medication.name.includes('inject') || medication.instructions.includes('Tiêm') ? (
                                      <Syringe className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <Pill className="h-5 w-5 text-blue-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-medium text-gray-900">{medication.name}</h4>
                                    <p className="text-gray-600">{medication.dosage}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                  <div>
                                    <p className="text-sm text-gray-500">Tần suất</p>
                                    <p className="font-medium">{medication.frequency}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Ngày bắt đầu</p>
                                    <p className="font-medium">{medication.startDate}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Ngày kết thúc</p>
                                    <p className="font-medium">{medication.endDate}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                  <p className="text-sm text-gray-500">Hướng dẫn sử dụng</p>
                                  <p className="text-gray-700">{medication.instructions}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Không có thông tin về thuốc điều trị.</p>
                        )}
                        
                        <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-900">Lưu ý quan trọng</p>
                              <p className="text-gray-600 mt-1">
                                Luôn tuân thủ chính xác liều lượng và thời gian dùng thuốc. Nếu có bất kỳ tác dụng phụ nào, hãy liên hệ ngay với bác sĩ.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Appointments Tab */}
                    {activeTab === "appointments" && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch hẹn</h3>
                        
                        {selectedTreatment.appointments.length > 0 ? (
                          <div className="space-y-4">
                            {selectedTreatment.appointments.map((appointment, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                  <div className="flex items-center mb-3 md:mb-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                      <Calendar className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">{appointment.purpose}</h4>
                                      <div className="flex items-center mt-1 text-gray-500 text-sm">
                                        <Calendar className="h-4 w-4 mr-1" /> {appointment.date}
                                        <Clock className="h-4 w-4 ml-3 mr-1" /> {appointment.time}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      appointment.status === 'upcoming' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : appointment.status === 'completed'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                    }`}>
                                      {appointment.status === 'upcoming' 
                                        ? 'Sắp tới' 
                                        : appointment.status === 'completed'
                                          ? 'Đã hoàn thành'
                                          : 'Đã hủy'}
                                    </span>
                                  </div>
                                </div>
                                
                                {appointment.status === 'upcoming' && (
                                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                                    <Link to={`/patient/appointments`}>
                                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                        Xem chi tiết
                                      </Button>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Không có thông tin về lịch hẹn.</p>
                        )}
                      </div>
                    )}
                    
                    {/* Test Results Tab */}
                    {activeTab === "test-results" && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kết quả xét nghiệm</h3>
                        
                        {selectedTreatment.testResults.length > 0 ? (
                          <div className="space-y-4">
                            {selectedTreatment.testResults.map((result, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center mb-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                    {result.type.includes('Xét nghiệm') ? (
                                      <TestTube className="h-5 w-5 text-blue-600" />
                                    ) : result.type.includes('Siêu âm') ? (
                                      <BarChart className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <Microscope className="h-5 w-5 text-blue-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{result.type}</h4>
                                    <p className="text-sm text-gray-500">{result.date}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-3">
                                  <div className="flex items-center mb-2">
                                    <span className="text-sm text-gray-500 mr-2">Kết quả:</span>
                                    <span className={`font-medium ${
                                      result.result === 'Tốt' || result.result === 'Bình thường' || result.result === 'Dương tính'
                                        ? 'text-green-600'
                                        : result.result === 'Cần theo dõi'
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                    }`}>
                                      {result.result}
                                    </span>
                                  </div>
                                  
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-700">{result.details}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Không có thông tin về kết quả xét nghiệm.</p>
                        )}
                      </div>
                    )}
                    
                    {/* Stages Tab */}
                    {activeTab === "stages" && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Các giai đoạn điều trị</h3>
                        
                        {selectedTreatment.stages.length > 0 ? (
                          <div className="relative">
                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            
                            <div className="space-y-6">
                              {selectedTreatment.stages.map((stage, index) => (
                                <div key={index} className="relative flex items-start">
                                  <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                    stage.status === 'completed'
                                      ? 'bg-green-100'
                                      : stage.status === 'current'
                                        ? 'bg-blue-100'
                                        : 'bg-gray-100'
                                  }`}>
                                    {stage.status === 'completed' ? (
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : stage.status === 'current' ? (
                                      <Clock className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <span className="h-2.5 w-2.5 bg-gray-400 rounded-full"></span>
                                    )}
                                  </div>
                                  
                                  <div className="ml-16">
                                    <h4 className={`font-medium ${
                                      stage.status === 'completed'
                                        ? 'text-green-600'
                                        : stage.status === 'current'
                                          ? 'text-blue-600'
                                          : 'text-gray-400'
                                    }`}>
                                      {stage.name}
                                    </h4>
                                    
                                    <p className="text-gray-600 mt-1">{stage.description}</p>
                                    
                                    {(stage.startDate || stage.endDate) && (
                                      <div className="flex flex-wrap gap-x-4 mt-2 text-sm text-gray-500">
                                        {stage.startDate && (
                                          <span>Bắt đầu: {stage.startDate}</span>
                                        )}
                                        {stage.endDate && (
                                          <span>Kết thúc: {stage.endDate}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">Không có thông tin về các giai đoạn điều trị.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy quá trình điều trị</h3>
            <p className="text-gray-500 mb-6">
              {activeFilter === "all" 
                ? "Bạn chưa có quá trình điều trị nào. Hãy đặt lịch tư vấn để bắt đầu." 
                : `Không tìm thấy quá trình điều trị nào ở trạng thái "${
                    activeFilter === "in-progress" 
                      ? "đang thực hiện" 
                      : activeFilter === "completed" 
                        ? "đã hoàn thành" 
                        : "đã hủy"
                  }".`}
            </p>
            <Link to="/booking">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Đặt lịch tư vấn
              </Button>
            </Link>
          </div>
        )}
        
        {/* Treatment Guidelines */}
        <div className="mt-10 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Hướng dẫn về quá trình điều trị</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Quá trình IUI</h4>
              <p className="text-gray-600 text-sm mb-4">
                Quá trình IUI thường kéo dài 2-3 tuần cho một chu kỳ, bao gồm kích thích buồng trứng, theo dõi nang trứng, và bơm tinh trùng vào tử cung.
              </p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Ít xâm lấn hơn IVF</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Chi phí thấp hơn</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Thường được thử trước IVF</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Quá trình IVF</h4>
              <p className="text-gray-600 text-sm mb-4">
                Quá trình IVF thường kéo dài 4-6 tuần cho một chu kỳ, bao gồm kích thích buồng trứng, chọc hút trứng, thụ tinh trong phòng thí nghiệm và chuyển phôi.
              </p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Tỷ lệ thành công cao hơn IUI</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Phù hợp cho nhiều loại vô sinh</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Có thể trữ đông phôi cho lần sau</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTreatments;