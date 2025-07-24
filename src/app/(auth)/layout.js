import {Inter, Roboto_Mono} from "next/font/google";

const geistSans = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Roboto_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
export const metadata = {
    title: "PocPoc - Đăng nhập / Đăng ký",
    description: "PocPoc là nơi bạn gặp gỡ bạn mới, chia sẻ câu chuyện và luôn được là chính mình. Đăng nhập hoặc tạo tài khoản miễn phí để bắt đầu kết nối!",
    icons: {
        icon: "/pocpoc.png",
    },
};
export default function MainLayout({children}) {

    return (

        <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            {children}
        </div>
    );
}