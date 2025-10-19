import '@rainbow-me/rainbowkit/styles.css';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from './lib/wagmi';
import { Navigation } from './components/Navigation';
import Chatbot from './components/Chatbot';
import Home from "./pages/Home";
import CertificateDetail from "./pages/CertificateDetail";
import IssueCertificate from "./pages/IssueCertificate";
import NotFound from "./pages/NotFound";
import CreateFab from './components/CreateFab';
import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function App() {
    useEffect(() => {
        sdk.actions.ready();
    }, []);
    return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: 'hsl(220, 90%, 56%)',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen flex flex-col">
                <Navigation />
                <Chatbot />
                <CreateFab />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/cert/:id" element={<CertificateDetail />} />
                  <Route path="/issue" element={<IssueCertificate />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
