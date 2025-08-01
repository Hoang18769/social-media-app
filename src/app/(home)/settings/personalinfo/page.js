"use client";

import { useState, useEffect } from "react";
import Input from "@/components/ui-components/Input";
import Avatar from "@/components/ui-components/Avatar";
import api from "@/utils/axios";

export default function PersonalInfoPage() {
  const [user, setUser] = useState(null);           // Dữ liệu người dùng
  const [originalUser, setOriginalUser] = useState(null); // Bản sao gốc
  const [avatarFile, setAvatarFile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessages, setSuccessMessages] = useState([]);
  const [token, setToken] = useState(null);         // Token

  useEffect(() => {
    const tokenFromLocalStorage = localStorage.getItem("accessToken");
    setToken(tokenFromLocalStorage);

    const username = localStorage.getItem("userName");

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/v1/users/${username}`, {
          headers: { Authorization: `Bearer ${tokenFromLocalStorage}` },
        });

        if (res.data.code === 200) {
          setUser(res.data.body);
          setOriginalUser(res.data.body);
        } else {
          setErrors((prev) => ({ ...prev, fetch: res.data.message }));
        }
      } catch {
        setErrors((prev) => ({ ...prev, fetch: "Không tải được thông tin người dùng" }));
      } finally {
        setLoadingUser(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e2) => {
        setUser((prev) => ({ ...prev, profilePictureUrl: e2.target.result }));
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!originalUser) return;
    setLoading(true);
    setErrors({});
    setSuccessMessages([]);

    const updates = [
      {
        label: "Name",
        check: user.givenName !== originalUser.givenName || user.familyName !== originalUser.familyName,
        request: () =>
            api.patch(
                `/v1/users/update-name?givenName=${encodeURIComponent(user.givenName)}&familyName=${encodeURIComponent(
                    user.familyName
                )}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            ),
        errorKey: "name",
      },
      {
        label: "Username",
        check: user.username !== originalUser.username,
        request: () =>
            api.patch(`/v1/users/update-username?username=${encodeURIComponent(user.username)}`, {}, { headers: { Authorization: `Bearer ${token}` } }),
        errorKey: "username",
      },
      {
        label: "Birthday",
        check: user.birthdate !== originalUser.birthdate,
        request: () =>
            api.patch(`/v1/users/update-birthday?birthdate=${encodeURIComponent(user.birthdate)}`, {}, { headers: { Authorization: `Bearer ${token}` } }),
        errorKey: "birthday",
      },
      {
        label: "Bio",
        check: user.bio !== originalUser.bio,
        request: () =>
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/users/update-bio?bio=${encodeURIComponent(user.bio)}`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}` },
            }).then((res) => {
              if (!res.ok) return res.json().then((err) => Promise.reject(err));
              return res.json();
            }),
        errorKey: "bio",
      },
      {
        label: "Avatar",
        check: !!avatarFile,
        request: () => {
          const form = new FormData();
          form.append("file", avatarFile);
          return api.patch("/v1/users/update-profile-picture", form, {
            headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
          });
        },
        errorKey: "avatar",
      },
    ];

    let successCount = 0;

    for (const item of updates) {
      if (item.check) {
        try {
          await item.request();
          setSuccessMessages((prev) => [...prev, `${item.label} updated successfully`]);
          successCount++;
        } catch (err) {
          setErrors((prev) => ({
            ...prev,
            [item.errorKey]: err?.response?.data?.message || `Failed to update ${item.label.toLowerCase()}`,
          }));
        }
      }
    }

    setLoading(false);
    if (successCount > 0) {
      setOriginalUser({ ...user }); // đồng bộ bản gốc
    }
  };

  if (loadingUser) {
    return (
        <main className="flex-1 w-full p-4 sm:p-8 text-center">
          <div className="animate-pulse text-[var(--muted-foreground)]">Đang tải thông tin cá nhân...</div>
        </main>
    );
  }

  if (!user) {
    return (
        <main className="flex-1 w-full p-4 sm:p-8 text-center text-red-500">
          {errors.fetch || "Không tải được thông tin"}
        </main>
    );
  }

  return (
      <div className="flex min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
        <main className="flex-1 w-full p-4 sm:p-8 space-y-6">
          <h1 className="text-xl sm:text-2xl font-bold">Thông tin cá nhân</h1>

          {successMessages.length > 0 && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-md text-green-700 text-sm">
                <ul>{successMessages.map((m, i) => <li key={i}>✅ {m}</li>)}</ul>
              </div>
          )}

          {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-700 text-sm">
                <ul>{Object.keys(errors).map((k) => errors[k] && <li key={k}>❌ {errors[k]}</li>)}</ul>
              </div>
          )}

          <div className="bg-[var(--card)] p-4 sm:p-6 rounded-lg shadow-md space-y-6">
            {/* Avatar section - Responsive layout */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Avatar - Fixed size on mobile */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-16 sm:h-16 md:w-20 md:h-20">
                  <Avatar
                      src={user.profilePictureUrl}
                      className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>

              {/* User info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="font-semibold text-lg truncate">{user.username}</div>
                <div className="text-[var(--muted-foreground)] truncate">
                  {user.familyName} {user.givenName}
                </div>
              </div>

              {/* File input button */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <label className="block">
                  <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                  />
                  <span className="inline-block w-full sm:w-auto bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] px-4 py-2 rounded-md cursor-pointer text-center text-sm">
                  Thay đổi ảnh
                </span>
                </label>
              </div>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                  label="Họ"
                  name="familyName"
                  value={user.familyName}
                  onChange={handleInputChange}
              />
              <Input
                  label="Tên"
                  name="givenName"
                  value={user.givenName}
                  onChange={handleInputChange}
              />
            </div>

            <Input
                label="Tên người dùng"
                name="username"
                value={user.username}
                onChange={handleInputChange}
            />

            <Input
                label="Ngày sinh"
                name="birthdate"
                value={user.birthdate}
                onChange={handleInputChange}
                type="date"
            />

            <div>
              <Input
                  label="Tiểu sử"
                  name="bio"
                  value={user.bio}
                  onChange={handleInputChange}
                  maxLength={150}
              />
              <div className="text-xs text-[var(--muted-foreground)] mt-1 text-right">
                {user.bio?.length || 0} / 150
              </div>
            </div>

            <button
                onClick={handleSave}
                disabled={loading}
                className={`w-full sm:w-auto bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-md ${
                    loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                }`}
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </main>
      </div>
  );
}