import React from 'react';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';

// Themed to match the app's carbon dark aesthetic. Shown by ProtectedRoute when
// the platform reports the signed-in user is not registered to use the app.
const UserNotRegisteredError = () => {
  const handleRetry = () => window.location.reload();
  const handleSignIn = async () => {
    try { await base44.auth.logout(); } catch {}
    window.location.href = '/login';
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 pt-safe pb-safe">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/40 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-accent-foreground" />
          </div>
          <h1 className="font-heading text-xl font-bold">Access restricted</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn't registered to use this app yet. If you just signed up, try reloading — otherwise sign out and back in with the right account.
          </p>
          <div className="flex gap-2 justify-center pt-1">
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Reload
            </Button>
            <Button onClick={handleSignIn} className="gap-2">
              <LogOut className="w-4 h-4" /> Switch account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserNotRegisteredError;