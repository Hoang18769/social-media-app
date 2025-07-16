"use client";

import React, { useEffect, useState } from "react";
import api from "@/utils/axios";
import PostCard from "@/components/social-app-component/PostCard";
import Input from "@/components/ui-components/Input";
import UserHeader from "@/components/social-app-component/UserHeader";
import { useRouter } from "next/navigation";
import {pageMetadata, usePageMetadata} from "@/utils/clientMetadata";

let debounceTimeout = null;

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ USER: [], POST: [] });
  const [loading, setLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const router = useRouter();
  usePageMetadata(pageMetadata.search());

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        const res = await api.get("/v1/friends/suggested");
        console.log("Suggested users:", res.data.body); // Log body để debug
        setSuggestedUsers(res.data.body || []);
      } catch (err) {
        console.error("Lỗi lấy gợi ý bạn bè", err);
      }
    };
    fetchSuggestedUsers();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ USER: [], POST: [] });
      return;
    }

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      fetchSearch(query.trim());
    }, 1000);

    return () => clearTimeout(debounceTimeout);
  }, [query]);

  const fetchSearch = async (keyword) => {
    try {
      setLoading(true);
      const res = await api.get("/v1/search", {
        params: {
          query: keyword,
          type: "NOT_SET",
          page: 0,
          size: 10,
        },
      });
      console.log("Search results:", res.data.body); // Log kết quả
      setResults(res.data.body);
    } catch (err) {
      console.error("Lỗi tìm kiếm", err);
    } finally {
      setLoading(false);
    }
  };

  const goToProfile = (username) => {
    if (username) router.push(`/profile/${username}`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 px-4 py-6">
      {/* Cột trái */}
      <div className="flex-1 space-y-6">
        <h1 className="text-xl font-bold">Khám phá</h1>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng hoặc bài viết..."
            className="flex-1"
          />
        </div>

        {loading && <p className="text-sm text-gray-500">Đang tìm kiếm...</p>}

        {!loading && query && results.USER.length === 0 && results.POST.length === 0 && (
          <p className="text-gray-500">Không có kết quả.</p>
        )}

        {results.USER.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Người dùng</h2>
            <ul className="space-y-2">
              {results.USER.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                  onClick={() => goToProfile(user.username)}
                >
                  <UserHeader
                    user={{
                      familyName: user.familyName,
                      givenName: user.givenName,
                      profilePictureUrl: user.profilePictureUrl,
                      lastOnline: user.isOnline ? "Online" : user.lastOnline,
                    }}
                    showOptions={false}
                    className="p-0"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.POST.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Bài viết</h2>
            {results.POST.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Cột phải */}
      <div className="w-full lg:w-[300px] shrink-0">
        <div className="sticky top-20 space-y-4">
          <h2 className="text-lg font-semibold">Gợi ý cho bạn</h2>
          <ul className="space-y-3">
            {suggestedUsers.length === 0 ? (
              <p className="text-sm text-gray-500">Không có gợi ý nào.</p>
            ) : (
              suggestedUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 cursor-pointer"
                  onClick={() => goToProfile(user.username)}
                >
                  <UserHeader
                    user={{
                      familyName: user.familyName,
                      givenName: user.givenName,
                      profilePictureUrl: user.avatar || user.profilePictureUrl,
                      lastOnline: user.isOnline ? "Online" : user.lastOnline,
                    }}
                    showOptions={false}
                    className="p-0"
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
