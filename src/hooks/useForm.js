// hooks/useForm.js
import { useState, useCallback } from "react";

export const useForm = (onSubmit) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, []);

  const removeFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const reset = useCallback(() => {
    setContent("");
    removeFile();
  }, [removeFile]);

  const submit = useCallback(async (e, ...args) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, file, ...args);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  }, [content, file, onSubmit, reset]);

  return {
    content,
    setContent,
    file,
    previewUrl,
    isSubmitting,
    handleFileChange,
    removeFile,
    submit
  };
};
