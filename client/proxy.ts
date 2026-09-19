import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getNeonPocAuth } from "@/lib/neon-auth/server";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ??
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ??
  ""
)
  .trim()
  .toLowerCase();

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/buy-credits(.*)",
  "/interactive-story(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

const handleClerkRequest = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) || isAdminRoute(req)) {
    await auth.protect();
  }

  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const claims = sessionClaims as Record<string, unknown> | null | undefined;
    let email = String(
      claims?.email ??
        claims?.primary_email_address ??
        claims?.primaryEmailAddress ??
        ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email =
        clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
    }

    if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const hasNeonVerifier = request.nextUrl.searchParams.has(
    "neon_auth_session_verifier"
  );

  if (
    request.nextUrl.pathname.startsWith("/platform-poc/protected") ||
    hasNeonVerifier
  ) {
    return getNeonPocAuth()
      .middleware({
        loginUrl: hasNeonVerifier
          ? "/platform-poc/oauth-session-required"
          : "/platform-poc/sign-in",
      })(request);
  }

  return handleClerkRequest(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
