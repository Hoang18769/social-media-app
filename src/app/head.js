// app/head.js
import pageTitles from "@/utils/pageTittle";
import { headers } from "next/headers";

export default function Head() {
  const headersList = headers();
  const pathname = headersList.get("x-invoke-path") || "/";

  const cleanPath = pathname.split("?")[0];
  const title = pageTitles[cleanPath] || pageTitles["*"];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content="Mạng xã hội kết nối mọi người" />
      <link rel="icon" href="/pocpoc.png" />
    </>
  );
}
