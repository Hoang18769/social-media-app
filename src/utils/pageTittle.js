// lib/pageMeta.js

const metaMap = {
  "/home": {
    title: "Trang chủ - PocPoc",
  },
  "/profile": {
    title: "Hồ sơ cá nhân - PocPoc",
  },
  "/register": {
    title: "Đăng ký và Đăng nhập - PocPoc",
  },

  "/forgot-password": {
    title: "Quên mật khẩu - PocPoc",
  },
  "/reset-password": {
    title: "Đặt lại mật khẩu - PocPoc",
  },
  "*": {
    title: "PocPoc - Mạng xã hội",
  },
};

export function getPageMetadata(pathname) {
  const meta = metaMap[pathname] || metaMap["*"];

  return {
    title: meta.title,
    description: "Mạng xã hội kết nối mọi người",
    icons: {
      icon: "/pocpoc.png",
    },
  };
}
