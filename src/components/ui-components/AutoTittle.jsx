"use client";

import { usePathname } from "next/navigation";
import Head from "next/head";
import pageTitles from "@/utils/pageTittle";

export default function AutoTitle() {
  const pathname = usePathname();

  const title =
    pageTitles[pathname] || pageTitles["*"] || "PocPoc";

  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}
