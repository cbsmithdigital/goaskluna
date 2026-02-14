export { auth as middleware } from "@/lib/auth/config";

export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|api/widget|widget|sign-in|sign-up|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
