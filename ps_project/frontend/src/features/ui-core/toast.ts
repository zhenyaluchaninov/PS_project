"use client";

import { toast, type ExternalToast } from "sonner";

type ToastOptions = ExternalToast | undefined;

export const toastSuccess = (
  title: string,
  description?: string,
  options?: ToastOptions
) => toast.success(title, { description, ...options });

export const toastError = (
  title: string,
  description?: string,
  options?: ToastOptions
) => toast.error(title, { description, ...options });

export const toastInfo = (
  title: string,
  description?: string,
  options?: ToastOptions
) => toast.message(title, { description, ...options });

export const toastWarning = (
  title: string,
  description?: string,
  options?: ToastOptions
) => toast.warning(title, { description, ...options });

export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
  options?: ExternalToast
) => toast.promise(promise, messages, options);
