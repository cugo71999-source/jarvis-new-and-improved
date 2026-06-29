import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import JarvisHUD from "@/pages/JarvisHUD";
import { JarvisProvider } from "@/store/JarvisProvider";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={JarvisHUD} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <JarvisProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </JarvisProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
