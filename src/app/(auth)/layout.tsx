export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              LUNA
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Learn &middot; Understand &middot; Navigate &middot; Apply
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
