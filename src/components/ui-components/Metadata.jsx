// components/Metadata.jsx
"use client";

import Head from "next/head";

export default function Metadata({
  title = "PocPoc",
  description = "Mạng xã hội kết nối mọi người",
  icon = "/pocpoc.png",
}) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="icon" href={icon} />
    </Head>
  );
}
