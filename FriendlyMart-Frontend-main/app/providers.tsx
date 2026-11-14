"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";

import theme from "./theme";
import Header from "@/components/Header";
import Footer from "@/components/footer";

export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/");

  const isDashboardRoute = pathname.startsWith("/dashboard/");

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {!isAuthRoute && !isDashboardRoute && <Header />}

        {children}

        {!isAuthRoute && !isDashboardRoute && <Footer />}

        <ToastContainer
          position="top-right"
          autoClose={2500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
        />
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}