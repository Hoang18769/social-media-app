"use client";

import { useState } from "react";
import Button from "@/components/ui-components/Button";
import Input from "@/components/ui-components/Input";
import Textarea from "@/components/ui-components/TextArea";
import NewPostModal from "@/components/social-app-component/CreatePostForm";

export default function DemoPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div>
        <Button variant="primary">Đăng bài</Button>
        <Button variant="ghost">Hủy</Button>
        <Button variant="outline" disabled>
          Đang tải...
        </Button>
      </div>

      <div>
        <Input label="Email" name="email" field />
        <Input label="Password" name="password" type="password" />
        <Input label="Search" placeholder="Tìm kiếm..." />
      </div>

      <div>
        <Textarea label="Mô tả" placeholder="Nhập nội dung..." />
        <Textarea label="Trả lời" field rows={1} />
      </div>

      <div>
        <button
          className="btn-base bg-[var(--primary)] text-[var(--primary-foreground)]"
          onClick={() => setShowModal(true)}
        >
          Create Post
        </button>

        <NewPostModal isOpen={showModal} onClose={() => setShowModal(false)} />
        <div className="border p-4 rounded-xl bg-[var(--card)] text-[var(--card-foreground)]">
      <Badge>Tiêu đề phụ</Badge>
      <h2 className="text-xl font-bold mt-1">Đây là tiêu đề chính</h2>
      <p className="text-sm mt-2">Nội dung phần mô tả ở đây...</p>
    </div>
      </div>
    </>
  );
}
