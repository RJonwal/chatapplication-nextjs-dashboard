import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import { getToken } from "next-auth/jwt";

interface DecodedToken {
  exp: number;
  [key: string]: any;
}

const PUBLIC_AUTH_ROUTES = ["/signin", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Try to get custom JWT
  const customToken = req.cookies.get("token")?.value;

  // 2. Try to get NextAuth token
  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If no token at all
  if (!customToken && !nextAuthToken) {
    if (PUBLIC_AUTH_ROUTES.includes(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  // If user is logged in and tries to access login/register → go to dashboard
  if ((customToken || nextAuthToken) && PUBLIC_AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Validate custom token if exists
  if (customToken) {
    try {
      const decoded = jwtDecode<DecodedToken>(customToken);
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp < currentTime) {
        return NextResponse.redirect(new URL("/signin", req.url));
      }
    } catch (err) {
      console.error("Invalid JWT:", err);
      return NextResponse.redirect(new URL("/signin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
