import { Inter, Roboto_Mono } from "next/font/google";
import ThemeProvider from "@/providers/ThemeProvider"
import Script from "next/script";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata = {
  title: "Đăng nhập/ Đăng ký",
  description: "Mạng xã hội kết nối mọi người",
  icons: {
    icon: "/pocpoc.png", // hoặc .png/.svg tùy loại file
  },
};
export default function MainLayout({ children }) {
  
  return (
    
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
    </div>
  );
}