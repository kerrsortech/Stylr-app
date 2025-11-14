'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Target, Tag, Package, FileText, Ticket, BarChart3, Plus, Trash2, TestTube, ExternalLink, CheckCircle2, XCircle, Upload, Download, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface OrganizationStats {
  organization: {
    name: string;
    shopDomain: string;
    status: string;
  };
  plan: {
    name: string;
    displayName: string;
    priceCents: number;
    imageResolution: string;
  };
  usage: {
    imageGenerationsUsed: number;
    imageGenerationsLimit: number;
    imageGenerationsRemaining: number;
    chatOutputsUsed: number;
    chatOutputsLimit: number;
    chatOutputsRemaining: number;
    month: string;
  };
}

interface AnalyticsData {
  kpis: {
    tryOns: number;
    tryOnsChange: number;
    conversionRate: number;
    previousConversionRate: number;
    topItem: {
      name: string;
      tryOns: number;
    } | null;
  };
  products: Array<{
    productId: string;
    name: string;
    category: string;
    image: string | null;
    price: number; // Price in cents
    tryOns: number;
    conversionRate: number;
  }>;
  period: number;
}

// Helper function to get API URL
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  
  // Get the API URL from environment
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Always check for placeholder values, especially in development
  if (envApiUrl) {
    // Common placeholder patterns from documentation/examples
    const placeholderPatterns = [
      'your-domain.com',
      'example.com',
      'your-actual-domain.com',
      'placeholder',
    ];
    
    const isPlaceholder = placeholderPatterns.some(pattern => 
      envApiUrl.toLowerCase().includes(pattern)
    );
    
    // If it's a placeholder, always use current origin
    if (isPlaceholder) {
      console.warn(`⚠️ NEXT_PUBLIC_API_URL is set to a placeholder value: "${envApiUrl}"`);
      console.warn(`   Using current origin instead: ${window.location.origin}`);
      console.warn(`   To fix: Comment out or remove NEXT_PUBLIC_API_URL from .env.local for local development`);
      return window.location.origin;
    }
    
    // For localhost development, if env var points to a different origin, prefer current origin
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const envUrl = new URL(envApiUrl);
        const currentUrl = new URL(window.location.origin);
        
        // If env URL is not localhost or points to different port, use current origin
        if (envUrl.hostname !== 'localhost' && envUrl.hostname !== '127.0.0.1') {
          console.warn(`⚠️ NEXT_PUBLIC_API_URL points to ${envApiUrl} but you're on localhost. Using current origin: ${window.location.origin}`);
          return window.location.origin;
        }
        
        // If ports don't match on localhost, use current origin
        if (envUrl.port !== currentUrl.port && currentUrl.port) {
          console.warn(`⚠️ NEXT_PUBLIC_API_URL port (${envUrl.port || 'default'}) doesn't match current port (${currentUrl.port}). Using current origin: ${window.location.origin}`);
          return window.location.origin;
        }
      } catch (e) {
        // Invalid URL in env var, use current origin
        console.warn(`⚠️ NEXT_PUBLIC_API_URL contains invalid URL: "${envApiUrl}". Using current origin: ${window.location.origin}`);
        return window.location.origin;
      }
    }
    
    return envApiUrl;
  }
  
  // Default: use current origin (automatically gets the correct port)
  return window.location.origin;
};

export default function AdminDashboard() {
  const [adminEmail, setAdminEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Catalog sources state
  const [catalogSources, setCatalogSources] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [newSourceType, setNewSourceType] = useState<string>('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceConfig, setNewSourceConfig] = useState<string>('{}');
  const [testingSource, setTestingSource] = useState<number | null>(null);
  const [addingSource, setAddingSource] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  // Policies state
  const [policyFiles, setPolicyFiles] = useState<any[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>('shipping');
  
  // Brand guidelines state
  const [brandGuidelines, setBrandGuidelines] = useState<any>(null);
  const [brandGuidelinesLoading, setBrandGuidelinesLoading] = useState(false);
  const [uploadingBrandGuidelines, setUploadingBrandGuidelines] = useState(false);
  const [uploadingAboutBrand, setUploadingAboutBrand] = useState(false);
  
  // Tickets state
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  
  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    // Test API connectivity first
    const testConnection = async () => {
      try {
        const apiUrl = getApiUrl();
        const healthCheck = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          cache: 'no-store',
        });
        
        if (!healthCheck.ok) {
          console.warn('Health check failed:', healthCheck.status);
        } else {
          const healthData = await healthCheck.json();
          console.log('API health check passed:', healthData);
        }
      } catch (err) {
        console.error('API health check failed:', err);
        // Don't set error here, just log it
      }
    };

    testConnection();

    // Check if already authenticated (from localStorage)
    const savedEmail = localStorage.getItem('closelook_admin_email');
    if (savedEmail) {
      setAdminEmail(savedEmail);
      fetchStats(savedEmail);
      fetchAnalytics(savedEmail);
      fetchCatalogSources(savedEmail);
      fetchPolicyFiles(savedEmail);
      fetchBrandGuidelines(savedEmail);
      fetchTickets(savedEmail);
      fetchProducts(savedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh products when catalog tab is opened
  useEffect(() => {
    if (activeTab === 'catalog' && isAuthenticated && adminEmail) {
      fetchProducts(adminEmail);
      fetchCatalogSources(adminEmail);
    }
  }, [activeTab, isAuthenticated, adminEmail]);

  const fetchStats = async (email: string) => {
    setIsLoading(true);
    setError(null);

    const apiUrl = getApiUrl();
    try {
      
      console.log('Fetching stats from:', `${apiUrl}/api/admin/stats`);
      if (typeof window !== 'undefined') {
        console.log('Current origin:', window.location.origin);
        console.log('Current port:', window.location.port || 'default (3000)');
      }
      
      const response = await fetch(`${apiUrl}/api/admin/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminEmail: email }),
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch stats';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
          if (data.suggestion) {
            errorMessage += ` (${data.suggestion})`;
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `Server returned ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setStats(data);
      setIsAuthenticated(true);
      localStorage.setItem('closelook_admin_email', email);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      
      let errorMessage = 'Failed to load dashboard';
      
      // Check for different types of network errors
      if (err instanceof TypeError) {
        if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
          const currentPort = typeof window !== 'undefined' ? (window.location.port || '3000') : '3000';
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
          const apiEndpoint = apiUrl ? `${apiUrl}/api/admin/stats` : '/api/admin/stats';
          errorMessage = `Unable to connect to server. The API request to ${apiEndpoint} failed. 

Please check:
1. The development server is running (try: npm run dev)
2. You're accessing the page from the same port as the server (current: ${currentOrigin})
3. There are no browser extensions blocking the request
4. Check the browser console (F12) for more details

If the server is running on a different port, make sure you're accessing the admin page from that same port.`;
        } else {
          errorMessage = err.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async (email: string) => {
    setAnalyticsLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminEmail: email, days: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Analytics data received:', data);
        console.log('Try-ons count:', data.kpis?.tryOns);
        console.log('Products count:', data.products?.length);
        console.log('Full KPIs:', data.kpis);
        console.log('Top Item:', data.kpis?.topItem);
        
        // Validate data structure
        if (!data.kpis) {
          console.error('Missing kpis in response:', data);
        }
        if (!data.products) {
          console.error('Missing products in response:', data);
        }
        
        // Validate and set analytics data
        if (data && data.kpis) {
          console.log('Setting analytics data:', {
            tryOns: data.kpis.tryOns,
            productsCount: data.products?.length || 0,
            topItem: data.kpis.topItem
          });
        setAnalytics(data);
        } else {
          console.error('Invalid analytics data structure:', data);
          // Set empty analytics to prevent errors
          setAnalytics({
            kpis: {
              tryOns: 0,
              tryOnsChange: 0,
              conversionRate: 0,
              previousConversionRate: 0,
              topItem: null,
            },
            products: [],
            period: 30,
          });
        }
      } else {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        console.error('Failed to fetch analytics', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          rawResponse: errorText
        });
        // Set empty analytics on error to prevent UI crashes
        setAnalytics({
          kpis: {
            tryOns: 0,
            tryOnsChange: 0,
            conversionRate: 0,
            previousConversionRate: 0,
            topItem: null,
          },
          products: [],
          period: 30,
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      // Set empty analytics on error to prevent UI crashes
      setAnalytics({
        kpis: {
          tryOns: 0,
          tryOnsChange: 0,
          conversionRate: 0,
          previousConversionRate: 0,
          topItem: null,
        },
        products: [],
        period: 30,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchCatalogSources = async (email: string) => {
    setCatalogLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/catalog-sources?adminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setCatalogSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to fetch catalog sources', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchProducts = async (email: string) => {
    setProductsLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/products?adminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleTestSource = async (sourceId: number) => {
    setTestingSource(sourceId);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/catalog-sources/${sourceId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const message = data.productCount !== undefined && data.categoryCount !== undefined
            ? `Connection test successful! Found ${data.productCount} products and ${data.categoryCount} categories.`
            : 'Connection test successful!';
          alert(message);
        } else {
          alert(`Connection test failed: ${data.error}`);
        }
        fetchCatalogSources(adminEmail);
        fetchProducts(adminEmail);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to test connection');
      }
    } catch (err) {
      alert('Failed to test connection');
    } finally {
      setTestingSource(null);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!confirm('Are you sure you want to delete this catalog source?')) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/catalog-sources/${sourceId}?adminEmail=${encodeURIComponent(adminEmail)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCatalogSources(adminEmail);
        fetchProducts(adminEmail);
      }
    } catch (err) {
      alert('Failed to delete source');
    }
  };

  const handleAddSource = async () => {
    if (!newSourceType || !newSourceName) {
      alert('Please fill in all required fields');
      return;
    }

    // Parse JSON config
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(newSourceConfig);
    } catch (err) {
      alert('Invalid JSON configuration. Please check your connection config.');
      return;
    }

    setAddingSource(true);
    setConnectionStatus({ type: null, message: '' });

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/catalog-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail,
          name: newSourceName,
          sourceType: newSourceType,
          connectionConfig: parsedConfig,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus({ 
          type: 'success', 
          message: `Connection successful! Found ${data.productCount || 0} products and ${data.categoryCount || 0} categories.` 
        });
        
        // Wait a moment to show success message, then close dialog and refresh
        setTimeout(() => {
          setShowAddSourceDialog(false);
          setNewSourceType('');
          setNewSourceName('');
          setNewSourceConfig('{}');
          setConnectionStatus({ type: null, message: '' });
          fetchCatalogSources(adminEmail);
        fetchProducts(adminEmail);
        }, 2000);
      } else {
        setConnectionStatus({ 
          type: 'error', 
          message: data.error || 'Failed to create source' 
        });
      }
    } catch (err: any) {
      setConnectionStatus({ 
        type: 'error', 
        message: err.message || 'Failed to create source' 
      });
    } finally {
      setAddingSource(false);
    }
  };

  const fetchPolicyFiles = async (email: string) => {
    setPolicyLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/policies?adminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setPolicyFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch policy files', err);
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchBrandGuidelines = async (email: string) => {
    setBrandGuidelinesLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/brand-guidelines?adminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setBrandGuidelines(data.guidelines);
      }
    } catch (err) {
      console.error('Failed to fetch brand guidelines', err);
    } finally {
      setBrandGuidelinesLoading(false);
    }
  };

  const handleUploadPolicy = async (file: File) => {
    if (!file) return;

    setUploadingPolicy(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Content = (e.target?.result as string).split(',')[1];
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/api/admin/policies`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adminEmail,
              policyType: selectedPolicyType,
              fileName: file.name,
              fileContent: base64Content,
              mimeType: file.type || 'application/pdf',
            }),
          });

          if (response.ok) {
            fetchPolicyFiles(adminEmail);
            alert('Policy file uploaded successfully!');
          } else {
            const data = await response.json();
            alert(data.error || 'Failed to upload policy file');
          }
        } catch (err) {
          alert('Failed to upload policy file');
        } finally {
          setUploadingPolicy(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Failed to upload policy file');
      setUploadingPolicy(false);
    }
  };

  const handleDeletePolicy = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this policy file?')) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/policies?adminEmail=${encodeURIComponent(adminEmail)}&fileId=${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPolicyFiles(adminEmail);
      } else {
        alert('Failed to delete policy file');
      }
    } catch (err) {
      alert('Failed to delete policy file');
    }
  };

  const handleUploadBrandGuidelines = async (file: File, fileType: 'brand_guidelines' | 'about_brand') => {
    if (!file) return;

    if (fileType === 'brand_guidelines') {
      setUploadingBrandGuidelines(true);
    } else {
      setUploadingAboutBrand(true);
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Content = (e.target?.result as string).split(',')[1];
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/api/admin/brand-guidelines`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adminEmail,
              fileType,
              fileName: file.name,
              fileContent: base64Content,
              mimeType: file.type || 'application/pdf',
            }),
          });

          if (response.ok) {
            fetchBrandGuidelines(adminEmail);
            alert(`${fileType === 'brand_guidelines' ? 'Brand guidelines' : 'About brand'} file uploaded successfully!`);
          } else {
            const data = await response.json();
            alert(data.error || 'Failed to upload file');
          }
        } catch (err) {
          alert('Failed to upload file');
        } finally {
          if (fileType === 'brand_guidelines') {
            setUploadingBrandGuidelines(false);
          } else {
            setUploadingAboutBrand(false);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Failed to upload file');
      if (fileType === 'brand_guidelines') {
        setUploadingBrandGuidelines(false);
      } else {
        setUploadingAboutBrand(false);
      }
    }
  };

  const handleDeleteBrandGuidelines = async (fileType: 'brand_guidelines' | 'about_brand') => {
    if (!confirm(`Are you sure you want to delete the ${fileType === 'brand_guidelines' ? 'brand guidelines' : 'about brand'} file?`)) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/brand-guidelines?adminEmail=${encodeURIComponent(adminEmail)}&fileType=${fileType}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBrandGuidelines(adminEmail);
      } else {
        alert('Failed to delete file');
      }
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const fetchTickets = async (email: string, status?: string) => {
    setTicketsLoading(true);
    try {
      const apiUrl = getApiUrl();
      const filterStatus = status || ticketStatusFilter;
      const statusParam = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
      const response = await fetch(`${apiUrl}/api/admin/tickets?adminEmail=${encodeURIComponent(email)}${statusParam}`);
      if (response.ok) {
        const data = await response.json();
        setTicketsList(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleUpdateTicket = async (ticketId: string, status?: string, priority?: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/admin/tickets`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail,
          ticketId,
          status,
          priority,
        }),
      });

      if (response.ok) {
        fetchTickets(adminEmail);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update ticket');
      }
    } catch (err) {
      alert('Failed to update ticket');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-500';
      case 'high':
        return 'bg-orange-500/20 text-orange-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'low':
        return 'bg-blue-500/20 text-blue-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/20 text-blue-500';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'resolved':
        return 'bg-green-500/20 text-green-500';
      case 'closed':
        return 'bg-gray-500/20 text-gray-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail) {
      fetchStats(adminEmail);
      fetchAnalytics(adminEmail);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setStats(null);
    setAnalytics(null);
    setAdminEmail('');
    localStorage.removeItem('closelook_admin_email');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Enter your admin email to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="demo@stylr.app"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Demo email: <span className="font-mono">demo@stylr.app</span>
                </p>
              </div>
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">Error</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                  {error.includes('Organization not found') && (
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p>💡 Make sure to run the setup script to create the demo organization:</p>
                      <code className="bg-muted px-2 py-1 rounded block">npm run demo:setup</code>
                    </div>
                  )}
                  {error.includes('Database connection') && (
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p>💡 Database connection issues:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Check your DATABASE_URL in .env.local</li>
                        <li>Ensure the database is running</li>
                        <li>Verify network connectivity</li>
                      </ul>
                    </div>
                  )}
                  {error.includes('connect to server') && (
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p>💡 Server connection issues:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Make sure the development server is running</li>
                        <li>Check if the server is accessible at the API URL</li>
                        <li>Verify NEXT_PUBLIC_API_URL in .env.local (if set)</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                <p className="font-medium mb-1">Demo Credentials:</p>
                <p className="font-mono">demo@stylr.app</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getConfigPlaceholder = (sourceType: string): string => {
    switch (sourceType) {
      case 'shopify':
        return JSON.stringify({
          shopDomain: 'mystore.myshopify.com',
          accessToken: 'your-access-token',
        }, null, 2);
      case 'woocommerce':
        return JSON.stringify({
          url: 'https://yourstore.com',
          consumerKey: 'your-consumer-key',
          consumerSecret: 'your-consumer-secret',
        }, null, 2);
      case 'bigcommerce':
        return JSON.stringify({
          storeHash: 'your-store-hash',
          accessToken: 'your-access-token',
        }, null, 2);
      case 'magento':
        return JSON.stringify({
          url: 'https://yourstore.com',
          accessToken: 'your-access-token',
        }, null, 2);
      case 'api_rest':
        return JSON.stringify({
          url: 'https://api.example.com/products',
          method: 'GET',
          headers: {},
          apiKey: 'your-api-key',
          authType: 'bearer',
        }, null, 2);
      case 'csv':
        return JSON.stringify({
          fileUrl: 'https://example.com/products.csv',
          hasHeader: true,
          delimiter: ',',
        }, null, 2);
      default:
        return '{}';
    }
  };

  const getConfigDescription = (sourceType: string): string => {
    switch (sourceType) {
      case 'shopify':
        return 'Enter your Shopify shop domain and access token. Get access token from Shopify Admin > Apps > Private apps.';
      case 'woocommerce':
        return 'Enter your WooCommerce store URL, consumer key, and consumer secret. Create API keys in WooCommerce > Settings > Advanced > REST API.';
      case 'bigcommerce':
        return 'Enter your BigCommerce store hash and access token. Create API credentials in BigCommerce Control Panel > Advanced Settings > API Accounts.';
      case 'magento':
        return 'Enter your Magento store URL and access token. Create integration in Magento Admin > System > Integrations.';
      case 'api_rest':
        return 'Enter your REST API endpoint URL, authentication method, and credentials. Products should be returned as JSON array. For database access, create a REST API endpoint that queries your database.';
      case 'csv':
        return 'Enter the URL to your CSV file. First row should contain headers. We\'ll auto-detect the schema.';
      default:
        return 'Enter connection configuration as JSON.';
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('jacket') || categoryLower.includes('coat')) {
      return '👔';
    } else if (categoryLower.includes('sunglass') || categoryLower.includes('glasses')) {
      return '🕶️';
    } else if (categoryLower.includes('bag') || categoryLower.includes('wallet')) {
      return '👜';
    } else if (categoryLower.includes('shoe') || categoryLower.includes('sneaker')) {
      return '👟';
    } else if (categoryLower.includes('necklace') || categoryLower.includes('jewelry')) {
      return '💎';
    }
    return '👕';
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {stats.organization.name} ({stats.organization.shopDomain})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost">
                Home
              </Button>
            </Link>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <Package className="h-4 w-4 mr-2" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="policies">
              <FileText className="h-4 w-4 mr-2" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <Ticket className="h-4 w-4 mr-2" />
              Tickets
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Usage Stats - Moved to top */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Image Generations</CardTitle>
                  <CardDescription>Usage for {stats.usage.month}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span className="font-semibold">
                        {stats.usage.imageGenerationsUsed.toLocaleString()} / {stats.usage.imageGenerationsLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (stats.usage.imageGenerationsUsed / stats.usage.imageGenerationsLimit) * 100 > 90 ? 'bg-destructive' :
                          (stats.usage.imageGenerationsUsed / stats.usage.imageGenerationsLimit) * 100 > 75 ? 'bg-yellow-500' :
                          'bg-primary'
                        }`}
                        style={{ width: `${Math.min((stats.usage.imageGenerationsUsed / stats.usage.imageGenerationsLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats.usage.imageGenerationsRemaining.toLocaleString()} remaining
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chat Outputs</CardTitle>
                  <CardDescription>Usage for {stats.usage.month}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span className="font-semibold">
                        {stats.usage.chatOutputsUsed.toLocaleString()} / {stats.usage.chatOutputsLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (stats.usage.chatOutputsUsed / stats.usage.chatOutputsLimit) * 100 > 90 ? 'bg-destructive' :
                          (stats.usage.chatOutputsUsed / stats.usage.chatOutputsLimit) * 100 > 75 ? 'bg-yellow-500' :
                          'bg-primary'
                        }`}
                        style={{ width: `${Math.min((stats.usage.chatOutputsUsed / stats.usage.chatOutputsLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats.usage.chatOutputsRemaining.toLocaleString()} remaining
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Try-Ons KPI */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Try-Ons</p>
                        <p className="text-3xl font-bold mt-1">
                          {analytics?.kpis?.tryOns ? analytics.kpis.tryOns.toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>
                    {analytics?.kpis?.tryOnsChange !== undefined && analytics.kpis.tryOnsChange > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                        +{analytics.kpis.tryOnsChange}%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Conversion Rate KPI */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conv. Rate</p>
                        <p className="text-3xl font-bold mt-1">
                          {analytics?.kpis?.conversionRate ?? 0}%
                        </p>
                      </div>
                    </div>
                    {analytics?.kpis?.previousConversionRate !== undefined && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                        vs {analytics.kpis.previousConversionRate}%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Item KPI */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Top Item</p>
                        <p className="text-2xl font-bold mt-1">
                          {analytics?.kpis.topItem?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {analytics?.kpis.topItem && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                        {analytics.kpis.topItem.tryOns}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Most Tried-On Products Table */}
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Most Tried-On Products</CardTitle>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  Last {analytics?.period || 7} days
                </span>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : analytics && analytics.products && analytics.products.length > 0 ? (
                  <div className="space-y-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm text-muted-foreground">
                      <div className="col-span-1"></div>
                      <div className="col-span-4">Product</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-1 text-right">Price</div>
                      <div className="col-span-2 text-right">Try-Ons</div>
                      <div className="col-span-2 text-right">Conv. Rate</div>
                    </div>
                    {/* Table Rows */}
                    {analytics.products.map((product, index) => (
                      <div
                        key={product.productId}
                        className="grid grid-cols-12 gap-4 items-center py-3 px-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="col-span-1">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                            {getCategoryIcon(product.category)}
                          </div>
                        </div>
                        <div className="col-span-4">
                          <p className="font-medium text-sm">{product.name}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        <div className="col-span-1 text-right">
                          <p className="text-sm font-medium">
                            ${(product.price / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="font-medium">{product.tryOns.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                            {product.conversionRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No try-on data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Catalog Sources</h2>
                <p className="text-muted-foreground mt-1">
                  Connect your product catalog from any platform. Products are fetched dynamically, not stored.
                </p>
              </div>
              <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Source
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Catalog Source</DialogTitle>
                    <DialogDescription>
                      Connect your product catalog from any platform. We&apos;ll fetch products dynamically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Source Name</label>
                      <Input
                        placeholder="My Shopify Store"
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Source Type</label>
                      <Select 
                      value={newSourceType} 
                      onValueChange={(value) => {
                        setNewSourceType(value);
                        setNewSourceConfig(getConfigPlaceholder(value));
                        setConnectionStatus({ type: null, message: '' });
                      }}
                    >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shopify">Shopify</SelectItem>
                          <SelectItem value="woocommerce">WooCommerce</SelectItem>
                          <SelectItem value="bigcommerce">BigCommerce</SelectItem>
                          <SelectItem value="magento">Magento</SelectItem>
                          <SelectItem value="api_rest">REST API (Recommended)</SelectItem>
                          <SelectItem value="csv">CSV File</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newSourceType && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Connection Config (JSON)</label>
                        {newSourceType === 'api_rest' && (
                          <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                            <p className="text-sm font-semibold text-blue-600 mb-1">💡 Tip</p>
                            <p className="text-xs text-blue-700">
                              For database access, create a REST API endpoint on your server that queries your database and returns products as JSON. 
                              This keeps your database credentials secure and allows you to control access.
                            </p>
                          </div>
                        )}
                        <Textarea
                          placeholder={getConfigPlaceholder(newSourceType)}
                          value={newSourceConfig}
                          onChange={(e) => {
                            setNewSourceConfig(e.target.value);
                            setConnectionStatus({ type: null, message: '' });
                          }}
                          className="font-mono text-sm"
                          rows={10}
                          disabled={addingSource}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {getConfigDescription(newSourceType)}
                        </p>
                        {connectionStatus.type && (
                          <div className={`mt-2 p-2 rounded-md text-sm ${
                            connectionStatus.type === 'success' 
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {connectionStatus.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddSourceDialog(false);
                        setNewSourceType('');
                        setNewSourceName('');
                        setNewSourceConfig('{}');
                        setConnectionStatus({ type: null, message: '' });
                      }}
                      disabled={addingSource}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddSource} disabled={addingSource || !newSourceType || !newSourceName}>
                      {addingSource ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        'Add Source'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {catalogLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : catalogSources.length === 0 ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Product Catalog</CardTitle>
                        <CardDescription>
                          Your organization&apos;s product catalog
                        </CardDescription>
                      </div>
                      <Button onClick={() => setShowAddSourceDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Catalog Source
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {productsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-sm font-medium">
                            <div className="col-span-1"></div>
                            <div className="col-span-4">Product</div>
                            <div className="col-span-2">Category</div>
                            <div className="col-span-2">Vendor</div>
                            <div className="col-span-2 text-right">Price</div>
                            <div className="col-span-1 text-center">Stock</div>
                          </div>
                          {/* Table Rows */}
                          <div className="divide-y">
                            {products.length === 0 ? (
                              <div className="p-12 text-center">
                                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                                <p className="text-muted-foreground mb-4">
                                  Add a catalog source to connect your products
                                </p>
                                <Button onClick={() => setShowAddSourceDialog(true)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Your First Source
                                </Button>
                              </div>
                            ) : (
                              products.map((product, index) => (
                                <div key={product.id || index} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors">
                                  <div className="col-span-1 flex items-center">
                                    {product.images && product.images.length > 0 ? (
                                      <img 
                                        src={product.images[0]} 
                                        alt={product.title}
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                        <Package className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-4">
                                    <div className="font-medium">{product.title || 'Untitled Product'}</div>
                                    {product.description && (
                                      <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                        {product.description}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-2 text-sm text-muted-foreground">
                                    {product.category || 'N/A'}
                                  </div>
                                  <div className="col-span-2 text-sm text-muted-foreground">
                                    {product.vendor || 'N/A'}
                                  </div>
                                  <div className="col-span-2 text-right font-medium">
                                    ${((product.price || 0) / 100).toFixed(2)}
                                  </div>
                                  <div className="col-span-1 text-center">
                                    {product.inStock !== false ? (
                                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        In Stock
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        Out of Stock
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        {products.length > 0 && (
                          <div className="text-sm text-muted-foreground text-center">
                            Showing {products.length} product{products.length !== 1 ? 's' : ''} from database
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4">
                {catalogSources.map((source) => (
                  <Card key={source.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{source.name}</h3>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted">
                              {source.sourceType.replace(/_/g, ' ')}
                            </span>
                            {source.status === 'active' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : source.status === 'error' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : null}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {source.productCount !== undefined && source.productCount !== null && (
                              <p className="font-medium">Products: {source.productCount.toLocaleString()}</p>
                            )}
                            {source.categoryCount !== undefined && source.categoryCount !== null && (
                              <p className="font-medium">Categories: {source.categoryCount.toLocaleString()}</p>
                            )}
                            {source.lastSyncAt && (
                              <p>Last synced: {new Date(source.lastSyncAt).toLocaleString()}</p>
                            )}
                            {source.lastSyncError && (
                              <p className="text-red-500">Error: {source.lastSyncError}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestSource(source.id)}
                            disabled={testingSource === source.id}
                          >
                            {testingSource === source.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4 mr-2" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSource(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            {/* Policies Card */}
            <Card>
              <CardHeader>
                <CardTitle>Shop Policies</CardTitle>
                <CardDescription>
                  Upload your store policies (shipping, return, refund, privacy, terms). The chatbot will use these to answer customer questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {policyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Upload Section */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Policy Type</label>
                        <Select value={selectedPolicyType} onValueChange={setSelectedPolicyType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shipping">Shipping Policy</SelectItem>
                            <SelectItem value="return">Return Policy</SelectItem>
                            <SelectItem value="refund">Refund Policy</SelectItem>
                            <SelectItem value="privacy">Privacy Policy</SelectItem>
                            <SelectItem value="terms">Terms of Service</SelectItem>
                            <SelectItem value="custom">Custom Policy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Upload Policy File</label>
                        <input
                          type="file"
                          accept=".pdf,.txt,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadPolicy(file);
                            }
                          }}
                          disabled={uploadingPolicy}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Supported formats: PDF, TXT, DOC, DOCX
                        </p>
                      </div>
                    </div>

                    {/* Uploaded Files */}
                    {policyFiles.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Uploaded Policies</h3>
                        <div className="space-y-2">
                          {policyFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{file.fileName}</span>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted">
                                    {file.policyType}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-muted rounded-md"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() => handleDeletePolicy(file.id)}
                                  className="p-2 hover:bg-muted rounded-md text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No policy files uploaded yet</p>
                        <p className="text-sm mt-2">Upload your policies to help the chatbot answer customer questions</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Brand Guidelines Card */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Guidelines & About Brand</CardTitle>
                <CardDescription>
                  Upload your brand guidelines and about brand information. The chatbot will use these to match your brand&apos;s voice and style.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {brandGuidelinesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Brand Guidelines Upload */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Brand Guidelines</label>
                        <input
                          type="file"
                          accept=".pdf,.txt,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadBrandGuidelines(file, 'brand_guidelines');
                            }
                          }}
                          disabled={uploadingBrandGuidelines}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Upload your brand guidelines document
                        </p>
                      </div>
                      {brandGuidelines?.brandGuidelinesFileName && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">{brandGuidelines.brandGuidelinesFileName}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={brandGuidelines.brandGuidelinesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-muted rounded-md"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteBrandGuidelines('brand_guidelines')}
                              className="p-2 hover:bg-muted rounded-md text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* About Brand Upload */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">About Brand</label>
                        <input
                          type="file"
                          accept=".pdf,.txt,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadBrandGuidelines(file, 'about_brand');
                            }
                          }}
                          disabled={uploadingAboutBrand}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Upload information about your brand
                        </p>
                      </div>
                      {brandGuidelines?.aboutBrandFileName && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">{brandGuidelines.aboutBrandFileName}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={brandGuidelines.aboutBrandUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-muted rounded-md"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteBrandGuidelines('about_brand')}
                              className="p-2 hover:bg-muted rounded-md text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!brandGuidelines?.brandGuidelinesFileName && !brandGuidelines?.aboutBrandFileName && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No brand guidelines uploaded yet</p>
                        <p className="text-sm mt-2">Upload your brand guidelines to help the chatbot match your brand&apos;s voice</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Support Tickets</CardTitle>
                    <CardDescription>View and manage customer support tickets</CardDescription>
                  </div>
                  <Select value={ticketStatusFilter} onValueChange={(value) => {
                    setTicketStatusFilter(value);
                    fetchTickets(adminEmail, value);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tickets</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : ticketsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tickets found</p>
                    <p className="text-sm mt-2">Tickets will appear here when customers create support requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketsList.map((ticket) => (
                      <Card 
                        key={ticket.id} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{ticket.ticketId}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Category:</strong> {ticket.issueCategory}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}
                                </p>
                                {ticket.customerName && (
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Customer:</strong> {ticket.customerName}
                                  </p>
                                )}
                                {ticket.customerEmail && (
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Email:</strong> {ticket.customerEmail}
                                  </p>
                                )}
                                {ticket.customerId && (
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Customer ID:</strong> {ticket.customerId}
                                  </p>
                                )}
                              </div>
                              
                              <div className="border-t pt-3">
                                <p className="text-sm">
                                  <strong>Issue:</strong>
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                  {ticket.issueDescription}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                              {ticket.status === 'open' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateTicket(ticket.ticketId, 'in_progress')}
                                >
                                  Start
                                </Button>
                              )}
                              {ticket.status === 'in_progress' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateTicket(ticket.ticketId, 'resolved')}
                                  >
                                    Resolve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateTicket(ticket.ticketId, 'closed')}
                                  >
                                    Close
                                  </Button>
                                </>
                              )}
                              {ticket.status === 'resolved' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateTicket(ticket.ticketId, 'closed')}
                                >
                                  Close
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket Details Dialog */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ticket Details</DialogTitle>
                  <DialogDescription>
                    View complete ticket information
                  </DialogDescription>
                </DialogHeader>
                {selectedTicket && (
                  <div className="space-y-6 py-4">
                    {/* Ticket ID and Status */}
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div>
                        <h3 className="text-xl font-bold">{selectedTicket.ticketId}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Customer Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTicket.customerName && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Customer Name</p>
                            <p className="text-base">{selectedTicket.customerName}</p>
                          </div>
                        )}
                        {selectedTicket.customerEmail && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Customer Email</p>
                            <p className="text-base">{selectedTicket.customerEmail}</p>
                          </div>
                        )}
                        {selectedTicket.customerId && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Customer ID</p>
                            <p className="text-base font-mono text-sm">{selectedTicket.customerId}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Complaint Category */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">Complaint Category</h4>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-base font-medium">{selectedTicket.issueCategory}</p>
                      </div>
                    </div>

                    {/* Complaint Description */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">Complaint Details</h4>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-base whitespace-pre-wrap">{selectedTicket.issueDescription}</p>
                      </div>
                    </div>

                    {/* Additional Information */}
                    {selectedTicket.metadata && Object.keys(selectedTicket.metadata).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg">Additional Information</h4>
                        <div className="p-4 bg-muted rounded-lg">
                          <pre className="text-sm overflow-auto">
                            {JSON.stringify(selectedTicket.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {selectedTicket.updatedAt && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
                          <p className="text-sm">{new Date(selectedTicket.updatedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {selectedTicket.resolvedAt && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Resolved At</p>
                          <p className="text-sm">{new Date(selectedTicket.resolvedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <div className="flex gap-2 w-full">
                    {selectedTicket?.status === 'open' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleUpdateTicket(selectedTicket.ticketId, 'in_progress');
                          setSelectedTicket(null);
                        }}
                        className="flex-1"
                      >
                        Start Working
                      </Button>
                    )}
                    {selectedTicket?.status === 'in_progress' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            handleUpdateTicket(selectedTicket.ticketId, 'resolved');
                            setSelectedTicket(null);
                          }}
                          className="flex-1"
                        >
                          Mark as Resolved
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            handleUpdateTicket(selectedTicket.ticketId, 'closed');
                            setSelectedTicket(null);
                          }}
                          className="flex-1"
                        >
                          Close Ticket
                        </Button>
                      </>
                    )}
                    {selectedTicket?.status === 'resolved' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleUpdateTicket(selectedTicket.ticketId, 'closed');
                          setSelectedTicket(null);
                        }}
                        className="flex-1"
                      >
                        Close Ticket
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedTicket(null)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
