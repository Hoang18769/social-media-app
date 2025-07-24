"use client"

import api from "@/utils/axios"
import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import { useRouter } from "next/navigation"
import { Users, TrendingUp, Calendar, Clock, Eye, UserCheck, UserX } from "lucide-react"
import adminApi from "@/utils/adminInterception";

export default function UsersPage() {
  const [usersData, setUsersData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const [week, setWeek]= useState("");
  const [month, setMonth]= useState("");
  const [year, setYear]= useState("");
  const [date, setDate]= useState("");

  const fetchUsersStatistics = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await adminApi.get("/v2/statistics/users")
      setUsersData(res.data.body)
    } catch (err) {
      setError(`Không thể tải thống kê users: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsersStatistics()
  }, [])
  useEffect(() => {
    if (week !== "") {
      const fetchData = async () => {
        try {
          const res = await adminApi.get(`/v2/statistics/users/week?week=${week}`);
          if (res.data.code === 200) {
            setUsersData((pre) => ({
              ...pre,
              thisWeekStatistics: res.data.body,
            }));
          }
        } catch (error) {
          console.error("Lỗi khi lấy thống kê tuần:", error);
        }
      };

      fetchData();
    }
  }, [week]);
  useEffect(() => {
    if (month !== "") {
      const fetchData = async () => {
        try {
          const res = await adminApi.get(`/v2/statistics/users/month?month=${month}`);
          if (res.data.code === 200) {
            setUsersData((pre) => ({
              ...pre,
              thisMonthStatistics: res.data.body,
            }));
          }
        } catch (error) {
          console.error("Lỗi khi lấy thống kê tuần:", error);
        }
      };

      fetchData();
    }
  }, [month]);
  useEffect(() => {
    if (date !== "") {
      const fetchData = async () => {
        try {
          const res = await adminApi.get(`/v2/statistics/users/online?date=${date}`);
          if (res.data.code === 200) {
            setUsersData((pre) => ({
              ...pre,
              onlineStatistics: res.data.body,
            }));
          }
        } catch (error) {
          console.error("Lỗi khi lấy thống kê tuần:", error);
        }
      };

      fetchData();
    }
  }, [date]);
  useEffect(() => {
    if (year !== "") {
      const fetchData = async () => {
        try {
          const res = await adminApi.get(`/v2/statistics/users/year?year=${year}`);
          if (res.data.code === 200) {
            setUsersData((pre) => ({
              ...pre,
              thisYearStatistics: res.data.body,
            }));
          }
        } catch (error) {
          console.error("Lỗi khi lấy thống kê tuần:", error);
        }
      };

      fetchData();
    }
  }, [year]);


  const transformByMinute = (rawLogs) => {
    if (!Array.isArray(rawLogs)) return [];

    const map = new Map();

    rawLogs.forEach((log) => {
      const date = log.timestamp;
      map.set(date, log.onlineCount);
    });

    return Array.from(map.entries())
        .map(([date, value]) => ({
          time: date.slice(0, 16).replace("T", " "),
          value: value === null ? 0 : value,
        }));
  };

  const transformMonthlyData = (data) => {
    if (!data) return []
    return Object.entries(data).map(([date, value]) => ({
      date: `${date}`,
      value: value === null ? 0 : value,
    }))
  }

  // Transform data for charts - handle null values properly
  const transformWeeklyData = (data) => {
    if (!data) return []
    return Object.entries(data).map(([day, value]) => ({
      day: day.substring(0, 3),
      value: value === null ? 0 : value,
    }))
  }

  const transformYearlyData = (data) => {
    if (!data) return []
    return Object.entries(data)
      .filter(([month, value]) => value !== null)
      .map(([month, value]) => ({
        month: month.substring(0, 3),
        value: value,
      }))
  }

  const StatCard = ({ title, value, icon: Icon, color, trend, onClick }) => (
    <div
      className={`bg-gradient-to-r ${color} p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-transform duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-white/90">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">{trend}</span>
            </div>
          )}
        </div>
        <Icon className="w-12 h-12 text-white/80" />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--primary)" }}
          ></div>
          <p style={{ color: "var(--primary)" }} className="font-medium">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {usersData && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Người dùng"
              value={usersData.totalUsers}
              icon={Users}
              color="from-blue-500 to-blue-600"
              trend={`+${usersData.newUsersThisMonth} this month`}
              onClick={() => {
                router.push('/admin/dashboard/viewusers')
              }}
            />
            <StatCard
              title="Đang trực tuyến"
              value={usersData.onlineUsersNow}
              icon={Eye}
              color="from-green-500 to-green-600"
            />
            <StatCard
              title="Người dùng mới hôm nay"
              value={usersData.newUsersToday}
              icon={UserCheck}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              title="Chưa xác thực"
              value={usersData.notVerifiedUsers}
              icon={UserX}
              color="from-orange-500 to-orange-600"
            />
          </div>

          {/* Charts Section */}
          {/* Weekly & Yearly Charts - 50% Width Each */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weekly Chart */}
            <div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: "var(--card)"}}>
              <div className="flex justify-between">
              <h3 className="text-xl font-semibold mb-4 flex items-center" style={{color: "var(--card-foreground)"}}>
                <Calendar className="w-5 h-5 mr-2 text-blue-500"/>
                Người dùng trong tuần
              </h3>
                <div>

              <input type="week" id="week" name="week" onChange={(e)=>{setWeek(e.target.value)}} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={transformWeeklyData(usersData.thisWeekStatistics)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="day" stroke="var(--muted-foreground)"/>
                  <YAxis stroke="var(--muted-foreground)"/>
                  <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--card-foreground)",
                      }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: "var(--card)" }}>
              <div className="flex justify-between">
                <h3 className="text-xl font-semibold mb-4 flex items-center" style={{color: "var(--card-foreground)"}}>
                  <Clock className="w-5 h-5 mr-2 text-purple-500"/>
                  Người dùng trong năm
                </h3>
                <input
                    onChange={(e)=>{setYear(e.target.value)}}
                    type="number"
                    id="year"
                    name="year"
                    min="2025"
                    max="2025"
                    step="1"
                    defaultValue={2025}
                    placeholder="Nhập năm"
                />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={transformYearlyData(usersData.thisYearStatistics)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--card-foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
            <div className="flex justify-between">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: "var(--card-foreground)" }}>
              <Clock className="w-5 h-5 mr-2 text-purple-500" />
              Trực tuyến hôm nay
            </h3>
              <input type="date" id="date" name="date" onChange={(e)=>{setDate(e.target.value)}} />

            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={transformByMinute(usersData.onlineStatistics)}>
                <YAxis stroke="var(--muted-foreground)" />
                <XAxis
                    dataKey="time"
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      return value.slice(11, 16);
                    }}
                />

                <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--card-foreground)",
                    }}
                />
                <Area type="monotone" dataKey="value" stroke="#F5CBCB" fill="#FFEAEA" fillOpacity={0.5} />

              </AreaChart>
            </ResponsiveContainer>
          </div>




          {/* Monthly Chart - Full Width */}
          <div className="w-full">
            <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
              <div className="flex justify-between">
              <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: "var(--card-foreground)" }}>
                <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                Người dùng trong tháng
              </h3>
                  <input  onChange={(e)=>{setMonth(e.target.value)}} type="month" id="month" name="month"/>


              </div>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={transformMonthlyData(usersData.thisMonthStatistics)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--card-foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  )
}