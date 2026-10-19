const messages: Record<string, string> = {
  AUTH_SESSION_INVALID: "Your session has ended. Sign in again to continue.",
  GITHUB_REQUIRED: "Connect GitHub to create a Classic story on the Free trial, or choose Creator to use your current sign-in method.",
  CREATOR_REQUIRED: "This feature is included with Creator. View Plans to upgrade.",
  PLATFORM_BUDGET_REACHED: "Image generation is temporarily unavailable. Please try later. Check My Stories for any saved draft before starting again.",
  INVALID_EMAIL_OR_PASSWORD: "The email or password doesn't match. Try again or use Forgot password.",
  EMAIL_NOT_VERIFIED: "Verify your email before signing in. Check your inbox for the verification code.",
  USER_ALREADY_EXISTS: "An account already uses this email. Sign in or reset your password.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account already uses this email. Sign in or reset your password.",
  INVALID_OTP: "That code doesn't match. Check the code in your latest email and try again.",
  OTP_EXPIRED: "That code has expired. Request a new code and try again.",
  PASSWORD_TOO_SHORT: "Choose a password with at least 8 characters.",
};

export function apiErrorMessage(message: string | undefined, status: number, code?: string) {
  if (code && messages[code]) return messages[code];
  if (/payment provider authentication|checkout is not configured|billing plan|subscriptions are not available/i.test(message ?? "")) return "Checkout is temporarily unavailable. Please try later or contact us if you need help.";
  if (/invalid payment signature|subscription plan mismatch/i.test(message ?? "")) return "We couldn't confirm your payment yet. Check your subscription status before paying again.";
  if (/already active/i.test(message ?? "")) return "Creator is already active on your account. Refresh your subscription status to see it.";
  if (/already in progress/i.test(message ?? "")) return "Your previous request is still being processed. Please wait before trying again.";
  if (/reconnect your Pollinations|Pollinations.*(expired|permission|model|balance)|insufficient.*(balance|pollen)/i.test(message ?? "")) return "Check your Pollinations key, image permissions, and available balance, then reconnect it from Create Story.";
  if (/already locked|already completed|maximum depth/i.test(message ?? "")) return "This story path is complete or already has a choice. Reopen it from My Stories to continue where you left off.";
  if (/payment history cannot be deleted/i.test(message ?? "")) return "This account has payment records and cannot be deleted here.";
  if (status === 401) return "We couldn't confirm access. Sign in again if your session has ended.";
  if (status === 403) return "You don't have access to this action. Check that you're using the right account and plan.";
  if (status === 404) return "We couldn't find this item. It may have been removed or may not be available to your account.";
  if (status === 413) return "This file is too large. Choose a smaller image and try again.";
  if (status === 429) return "There have been too many attempts. Wait a moment before trying again.";
  if (status === 425) return "Your request is still processing. Please wait before trying again.";
  if (status === 408 || status === 504) return "This is taking longer than expected. Check your saved work or payment status before starting again.";
  if (status >= 500) return "We couldn't complete this right now. Please try later. If it keeps happening, contact us for help.";
  if (status === 400 || status === 422) return "We couldn't use these details. Check your entries and try again.";
  return "We couldn't complete your request. Please try again.";
}

export function userErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!error || typeof error !== "object") return fallback;
  const value = error as { name?: string; code?: string; status?: number; message?: string };
  if (value.code && messages[value.code]) return messages[value.code];
  if (value.name === "AuthSessionExpiredError") return messages.AUTH_SESSION_INVALID;
  if (value.name === "AuthTokenUnavailableError") return "We couldn't check your account right now. Please try again shortly.";
  if (value.name === "ApiClientError" && value.message) return value.message;
  if (value.name === "TypeError" && /fetch|network|load failed/i.test(value.message ?? "")) return "We couldn't connect. Check your internet connection and try again.";
  if (value.status === 429) return apiErrorMessage(undefined, 429);
  return fallback;
}
