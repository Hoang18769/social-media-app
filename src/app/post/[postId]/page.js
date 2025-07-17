"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PostCard from "@/components/social-app-component/PostCard";
import api, {getAuthInfo} from "@/utils/axios";
import toast from "react-hot-toast";
import usePostActions from "@/hooks/usePostAction";
import { House } from "lucide-react";
export default function PostPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.postId;
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);

    const { toggleLike } = usePostActions({ post, setPost })
    const handleRouterBack=()=>{

            router.push("/");
    }
    // Check authentication status
    useEffect(() => {
        const authInfo = getAuthInfo();
        if (!authInfo) {
            router.push("/register");
            return;
        }
        if (!authInfo.token || !authInfo.userId || !authInfo.userName) {
            router.push("/register");
            return;
        }

        // Set user info from authInfo
        setIsLoggedIn(true);
        setUser({
            id: authInfo.userId,
            name: authInfo.userName,
            username: authInfo.userName
        });
    }, [router]);

    // Fetch post data
    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return;

            try {
                setLoading(true);
                setError(null);

                const response = await api.get(`/v1/posts/${postId}`);
                console.log(response);
                const postData = response.data.body;

                setPost(postData);
                setLiked(postData.isLiked || false);
                setLikeCount(postData.likeCount || 0);

            } catch (err) {
                console.error("Error fetching post:", err);

                // Handle specific error code 5003
                if (err.response?.data?.code === 5003) {
                    setError("Nội dung không tồn tại hoặc không khả dụng lúc này");
                    toast.error("Nội dung không tồn tại hoặc không khả dụng lúc này");
                } else {
                    setError(err.response?.data?.message || "Không thể tải bài viết");
                    toast.error("Không thể tải bài viết");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    // Handle login redirect
    const handleLogin = () => {
        router.push('/login');
    };

    // Handle post deletion
    const handlePostDeleted = (deletedPostId) => {
        // Redirect to home or previous page after deletion
        toast.success("Bài viết đã được xóa");
        router.push("/"); // Or router.back()
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="bg-[var(--card)] p-8 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span className="text-[var(--card-foreground)]">Đang tải bài viết...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="bg-[var(--card)] p-8 rounded-xl shadow-lg text-center max-w-md">
                    <div className="text-red-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">
                        Lỗi tải bài viết
                    </h3>
                    <p className="text-[var(--muted-foreground)] mb-4">
                        {error}
                    </p>
                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Thử lại
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-lg hover:opacity-80 transition-opacity"
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No post found
    if (!post) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="bg-[var(--card)] p-8 rounded-xl shadow-lg text-center max-w-md">
                    <div className="text-[var(--muted-foreground)] mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">
                        Không tìm thấy bài viết
                    </h3>
                    <p className="text-[var(--muted-foreground)] mb-4">
                        Bài viết có thể đã bị xóa hoặc không tồn tại
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    // Render PostCard
    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header with back button and login */}
            <div className="sticky top-0 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] z-10">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRouterBack}
                                className="p-2 rounded-full hover:bg-[var(--input)] transition-colors"
                                aria-label="Go back"
                            >
                                <House/>
                            </button>

                        </div>

                        {/* Login button - only show if not logged in */}
                        {!isLoggedIn && (
                            <button
                                onClick={handleLogin}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                            >
                                Đăng nhập
                            </button>
                        )}

                        {/* User info - show if logged in */}
                        {isLoggedIn && user && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                    {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                                </div>
                                <span className="text-sm text-[var(--card-foreground)] hidden sm:block">
                                    {user.name || user.username}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Post content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <PostCard
                    post={post}
                    liked={liked}
                    onLikeToggle={()=>toggleLike(post.id)}
                    onPostDeleted={handlePostDeleted}
                    size="large"
                    className="shadow-lg"
                />
            </div>
        </div>
    );
}