import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|api/widget|widget|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
