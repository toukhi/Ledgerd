import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Bell, Plus, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import logoSmall from "../../public/logo-small.png";
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NotificationsDrawer } from './NotificationsDrawer';

export function Navigation() {
  const location = useLocation();
  const notifications = useAppStore((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RainbowKitProvider
  theme={lightTheme({
    accentColor: '#c7395c', 
    accentColorForeground: 'white',
    borderRadius: 'medium',
  })}
>
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <img src={logoSmall} alt="Logo" className="h-8 w-8 rounded-lg" />
              <span className="text-3xl font-bold mb-0 bg-gradient-to-r from-[#c7395c] to-[#a9667e] bg-clip-text text-transparent">
                Ledgerd
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Certificates
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative ml-3 md:ml-0">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Notifications</SheetTitle>
                  <SheetDescription>
                    Pending certificates awaiting your action
                  </SheetDescription>
                </SheetHeader>
                <NotificationsDrawer />
              </SheetContent>
            </Sheet>

            <Link to="/issue">
              <Button
                className="gap-2 bg-[#c7395c] text-white hover:bg-[#a9667e] border-none px-2 py-1 hidden md:flex"
              >
                <Plus className="h-4 w-4" />
                <span className="ml-2">Create</span>
              </Button>
            </Link>

            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
    </RainbowKitProvider>
  );
}
