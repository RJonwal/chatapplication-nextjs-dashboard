import ChatMessages from "@/components/chat/ChatMessages";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Chat | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Chat page for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};
export default function page() {
  return (
    <div>
      <ChatMessages />
    </div>
  );
}
