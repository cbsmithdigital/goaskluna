import "@/app/globals.css";

export const metadata = {
  title: "LUNA Widget",
};

export default function WidgetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-transparent antialiased">{children}</body>
    </html>
  );
}
