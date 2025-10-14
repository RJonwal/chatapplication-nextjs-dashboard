import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SessionProviders } from '@/utils/sessionproviders';
import { Providers } from './providerWrapper';
import { ToastContainer } from "react-toastify";

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ToastContainer
        style={{ zIndex: 999999999999 }}
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
      />
         <SessionProviders>
          <Providers>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
        </Providers>
         </SessionProviders>
      </body>
    </html>
  );
}
