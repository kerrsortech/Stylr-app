import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, LayoutDashboard } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="z-10 max-w-4xl w-full items-center justify-between">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-center bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Stylr Demo
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto">
          AI powered shopping assistant plugin
        </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Demo E-commerce Store</CardTitle>
              </div>
              <CardDescription className="text-base">
                Visit the complete demo e-commerce store with product listings, categories, and integrated AI features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/store">
                <Button className="w-full" size="lg">
                  Visit Store
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
              </div>
              <CardDescription className="text-base">
                Access the organization admin dashboard to manage catalog, policies, analytics, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full" size="lg" variant="outline">
                  Admin Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Choose a route above to get started</p>
        </div>
      </div>
    </main>
  )
}

