interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

interface HttpLikeError {
  status?: number;
  message?: string;
  error?: ErrorEnvelope | { code?: string; message?: string };
}

export function callApiErrorCode(error: unknown): string | undefined {
  const candidate = error as HttpLikeError;
  const payload = candidate?.error as ErrorEnvelope | undefined;
  return payload?.error?.code ?? (candidate?.error as { code?: string } | undefined)?.code;
}

export function callApiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as HttpLikeError;
  const payload = candidate?.error as ErrorEnvelope | undefined;
  return (
    payload?.error?.message ??
    (candidate?.error as { message?: string } | undefined)?.message ??
    candidate?.message ??
    fallback
  );
}

export function callApiStatus(error: unknown): number | undefined {
  return (error as HttpLikeError)?.status;
}
