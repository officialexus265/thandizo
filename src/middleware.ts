import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Edge guard for /admin/* (except login).
 * Only JWT role "admin" may proceed. Fundraiser sessions are rejected.
 */
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return token?.role === "admin";
      },
    },
    pages: {
      signIn: "/admin/login",
    },
  }
);

export const config = {
  matcher: ["/admin/((?!login).*)"],
};
