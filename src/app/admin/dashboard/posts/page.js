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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  FileText,
  Heart,
  MessageCircle,
  Share2,
  Paperclip,
  TrendingUp,
  Calendar,
  Clock,
  Globe,
  Lock,
} from "lucide-react"
import { useRouter } from "next/navigation"
import adminApi from "@/utils/adminInterception";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

const StatCard = ({ title, value, icon: Icon, color, trend, onClick }) => (
  <div
    className={`bg-gradient-to-r ${color} p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-transform duration-200 ${onClick ? 'cursor-pointer' : ''}`}
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

const LoadingSpinner = () => (
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

const ErrorDisplay = ({ error }) => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center p-8 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <p className="text-red-600 font-medium">{error}</p>
    </div>
  </div>
)

const HottestPost = ({ post }) => (
  <div
    className="p-4 rounded-lg hover:shadow-md transition-shadow"
    style={{ backgroundColor: "var(--accent)", border: "1px solid var(--border)" }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
          {post.author.givenName[0]}
        </div>
        <div>
          <p className="font-semibold" style={{ color: "var(--accent-foreground)" }}>
            {post.author.givenName} {post.author.familyName}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            @{post.author.username}
          </p>
        </div>
        <div
          className={`w-3 h-3 rounded-full ${post.author.isOnline ? "bg-green-400" : "bg-gray-300"}`}
        ></div>
      </div>
      <div className="flex items-center space-x-2">
        {post.privacy === "PUBLIC" ? (
          <Globe className="w-4 h-4 text-green-500" />
        ) : (
          <Lock className="w-4 h-4 text-yellow-500" />
        )}
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>

    {post.content && (
      <p
        className="mb-3 p-3 rounded-lg"
        style={{ color: "var(--card-foreground)", backgroundColor: "var(--card)" }}
      >
        {post.content}
      </p>
    )}
    
    {post.files && post.files.length > 0 && (
      <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
        <div className="flex items-center text-blue-600">
          <Paperclip className="w-4 h-4 mr-1" />
          <span className="text-sm">{post.files.length} file(s) attached</span>
        </div>
      </div>
    )}
    
    <div
      className="flex items-center justify-between pt-3"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-pink-500">
          <Heart className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{post.likeCount}</span>
        </div>
        <div className="flex items-center text-blue-500">
          <MessageCircle className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{post.commentCount}</span>
        </div>
        <div className="flex items-center text-green-500">
          <Share2 className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{post.shareCount}</span>
        </div>
      </div>
    </div>
  </div>
)

export default function PostsPage() {
  const [postsData, setPostsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const [week, setWeek]= useState("");
  const [month, setMonth]= useState("");
  const [year, setYear]= useState("");
  const [date, setDate]= useState("");
  const fetchPostsStatistics = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await adminApi.get("/v2/statistics/posts")
      setPostsData(res.data.body)
      console.log(res.data.body)
    } catch (err) {
      setError(`Không thể tải thống kê posts: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (week !== "") {
      const fetchData = async () => {
        try {
          const res = await adminApi.get(`/v2/statistics/posts/week?week=${week}`);
          if (res.data.code === 200) {
            setPostsData((pre) => ({
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
          const res = await adminApi.get(`/v2/statistics/posts/month?month=${month}`);
          if (res.data.code === 200) {
            setPostsData((pre) => ({
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
          const res = await adminApi.get(`/v2/statistics/posts/online?date=${date}`);
          if (res.data.code === 200) {
            setPostsData((pre) => ({
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
          const res = await adminApi.get(`/v2/statistics/posts/year?year=${year}`);
          if (res.data.code === 200) {
            setPostsData((pre) => ({
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
  const handleTotalPostsClick = () => {
    router.push('/admin/dashboard/viewposts')
  }

  useEffect(() => {
    fetchPostsStatistics()
  }, [])

  // Transform data functions
  const transformData = {
    weekly: (data) => {
      if (!data) return []
      return Object.entries(data).map(([day, value]) => ({
        day: day.substring(0, 3),
        value: value === null ? 0 : value,
      }))
    },
    monthly: (data) => {
      if (!data) return []
      return Object.entries(data).map(([date, value]) => ({
        date: `Ngày ${date}`,
        value: value === null ? 0 : value,
      }))
    },
    yearly: (data) => {
      if (!data) return []
      return Object.entries(data)
        .filter(([month, value]) => value !== null)
        .map(([month, value]) => ({
          month: month.substring(0, 3),
          value: value,
        }))
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} />

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Bài viết"
          value={postsData.totalPosts}
          icon={FileText}
          color="from-indigo-500 to-indigo-600"
          trend={`+${postsData.newPostsThisMonth} this month`}
          onClick={handleTotalPostsClick}
        />
        <StatCard title="Tổng lượt like" value={postsData.totalLikes} icon={Heart} color="from-pink-500 to-pink-600" />
        <StatCard title="Bình luận" value={postsData.totalComments} icon={MessageCircle} color="from-blue-500 to-blue-600" />
        <StatCard title="Lượt chia sẻ" value={postsData.totalShares} icon={Share2} color="from-green-500 to-green-600" />
        <StatCard title="Files đính kèm" value={postsData.totalFiles} icon={Paperclip} color="from-yellow-500 to-yellow-600" />
        <StatCard title="Bài viết đã xóa" value={postsData.deletedPostCount} icon={FileText} color="from-yellow-300 to-red-600" />

      </div>

      {/* Weekly & Yearly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Chart */}
        <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
          <div className="flex justify-between">
          <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: "var(--card-foreground)" }}>
            <Calendar className="w-5 h-5 mr-2 text-green-500" />
             Bài viết trong tuần
          </h3>
            <input type="week" id="week" name="week" onChange={(e)=>{setWeek(e.target.value)}} />

          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={transformData.weekly(postsData.thisWeekStatistics)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--card-foreground)",
                }}
              />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Yearly Chart */}
        <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
          <div className="flex justify-between">
          <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: "var(--card-foreground)" }}>
            <Clock className="w-5 h-5 mr-2 text-purple-500" />
            Bài viết trong năm
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
            <LineChart data={transformData.yearly(postsData.thisYearStatistics)}>
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

      {/* Monthly Chart - Full Width */}
      <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
<div className="flex justify-between">
        <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: "var(--card-foreground)" }}>
          <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
          Bài viết trong tháng
        </h3>
        <input  onChange={(e)=>{setMonth(e.target.value)}} type="month" id="month" name="month"/>

</div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={transformData.monthly(postsData.thisMonthStatistics)}>
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
            <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engagement Pie Chart */}
        <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
          <h3 className="text-xl font-semibold mb-4" style={{ color: "var(--card-foreground)" }}>
            Phân loại bài viết
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: "Riêng tư", value: postsData.privatePostCount },
                  { name: "Công khai", value: postsData.publicPostCount },
                  { name: "Bạn bè", value: postsData.friendPostCount },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {[
                  { name: "Likes", value: postsData.totalLikes },
                  { name: "Comments", value: postsData.totalComments },
                  { name: "Shares", value: postsData.totalShares },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--card-foreground)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Additional Metrics */}
        <div className="lg:col-span-2 p-6 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)" }}>
          <h3 className="text-xl font-semibold mb-4" style={{ color: "var(--card-foreground)" }}>
            Biểu đồ phụ
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Bài viết mới trong ngày", value: postsData.newPostsToday },
              { label: "Bài viết mới trong tuần", value: postsData.newPostsThisWeek },
              { label: "Bài viết mới trong tháng", value: postsData.newPostsThisMonth },
              { label: "Bài viết mới trong năm", value: postsData.newPostsThisYear },
            ].map((metric, index) => (
              <div key={index} className="p-4 rounded-lg" style={{ backgroundColor: "var(--accent)" }}>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {metric.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: "var(--accent-foreground)" }}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}