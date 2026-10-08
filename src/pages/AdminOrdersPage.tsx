import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Truck,
  ChefHat,
  XCircle,
  Phone,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  TrendingUp,
  PackageCheck,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  ArrowUpDown
} from 'lucide-react';
import { getAllOrdersForAdmin, updateOrderStatusByAdmin } from '../lib/supabase';
import type { Order, OrderStatus } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { AdminGuard } from '../components/admin/AdminGuard';

interface AdminOrdersPageProps {
  onOpenAuth?: () => void;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  placed: {
    label: 'Placed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: Clock,
  },
  preparing: {
    label: 'Preparing',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: ChefHat,
  },
  ready: {
    label: 'Ready for Pickup',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: PackageCheck,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
};

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'placed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const AdminOrdersContent: React.FC = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());

  const fetchOrders = async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await getAllOrdersForAdmin();
      setOrders(data);
      setLastUpdatedTime(new Date());
    } catch (err: any) {
      console.error('Failed to load admin orders:', err);
      setErrorMessage(err.message || 'Unable to fetch orders from Supabase.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleOrderPlaced = () => {
      fetchOrders(true);
    };

    window.addEventListener('order-placed', handleOrderPlaced);
    window.addEventListener('order-status-updated', handleOrderPlaced);

    return () => {
      window.removeEventListener('order-placed', handleOrderPlaced);
      window.removeEventListener('order-status-updated', handleOrderPlaced);
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const updated = await updateOrderStatusByAdmin(orderId, newStatus);
      if (updated) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
        );
      }
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      alert(`Error updating order status: ${err.message || 'Please try again.'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter and Search logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'placed' && (order.order_status === 'placed' || order.order_status === 'confirmed')) {
          // match placed
        } else if (order.order_status !== statusFilter) {
          return false;
        }
      }

      // Search query filter (Order ID, Customer name, Phone)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = (order.id || '').toLowerCase().includes(query);
        const matchesName = (order.customer_name || '').toLowerCase().includes(query);
        const matchesPhone = (order.customer_phone || '').toLowerCase().includes(query);
        const matchesPaymentId = (order.razorpay_payment_id || '').toLowerCase().includes(query);

        if (!matchesId && !matchesName && !matchesPhone && !matchesPaymentId) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Sorting
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'amount_high':
        return list.sort((a, b) => b.total_amount - a.total_amount);
      case 'amount_low':
        return list.sort((a, b) => a.total_amount - b.total_amount);
      default:
        return list;
    }
  }, [filteredOrders, sortBy]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const activeCount = orders.filter((o) =>
      ['placed', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.order_status)
    ).length;
    const deliveredCount = orders.filter((o) => o.order_status === 'delivered').length;
    const cancelledCount = orders.filter((o) => o.order_status === 'cancelled').length;

    const totalRevenue = orders
      .filter((o) => o.order_status !== 'cancelled' && (o.payment_status === 'paid' || o.order_status === 'delivered'))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return {
      totalCount,
      activeCount,
      deliveredCount,
      cancelledCount,
      totalRevenue,
    };
  }, [orders]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      {/* Top Admin Header Bar */}
      <div className="bg-stone-900 text-stone-100 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Authorized (role: {profile?.role || 'admin'})
                </span>
                <span className="text-stone-400 text-xs hidden sm:inline">
                  • Last refreshed {lastUpdatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mt-1.5">
                Order Management Dashboard
              </h1>
              <p className="text-stone-400 text-sm mt-0.5">
                View live customer orders, manage preparation & delivery status, and track revenue.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchOrders(true)}
                disabled={isLoading || isRefreshing}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Orders'}</span>
              </button>

              <Link
                to="/"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Customer Store</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Error Alert Banner if fetch fails */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Unable to fetch orders</p>
              <p className="text-rose-700 text-xs mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => fetchOrders(true)}
              className="text-xs font-semibold underline text-rose-800 hover:text-rose-950"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Orders</span>
              <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                <ShoppingBag className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-2">
              {isLoading ? '...' : stats.totalCount}
            </p>
            <p className="text-xs text-stone-500 mt-1">All orders in Supabase</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs bg-gradient-to-br from-white to-amber-50/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800 uppercase tracking-wider">Active Queue</span>
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                <ChefHat className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-900 mt-2">
              {isLoading ? '...' : stats.activeCount}
            </p>
            <p className="text-xs text-amber-700 mt-1">Placed, Preparing & Out</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs bg-gradient-to-br from-white to-emerald-50/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Delivered</span>
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-900 mt-2">
              {isLoading ? '...' : stats.deliveredCount}
            </p>
            <p className="text-xs text-emerald-700 mt-1">Fulfilled successfully</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Revenue</span>
              <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-2 font-mono">
              {isLoading ? '...' : `₹${stats.totalRevenue.toLocaleString('en-IN')}`}
            </p>
            <p className="text-xs text-stone-500 mt-1">From non-cancelled orders</p>
          </div>
        </div>

        {/* Filter Tabs & Search / Sort Toolbar */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs mb-6 space-y-4">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('placed')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'placed'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Placed ({orders.filter((o) => o.order_status === 'placed' || o.order_status === 'confirmed').length})
            </button>
            <button
              onClick={() => setStatusFilter('preparing')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'preparing'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Preparing ({orders.filter((o) => o.order_status === 'preparing').length})
            </button>
            <button
              onClick={() => setStatusFilter('out_for_delivery')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'out_for_delivery'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              Out for Delivery ({orders.filter((o) => o.order_status === 'out_for_delivery').length})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Delivered ({orders.filter((o) => o.order_status === 'delivered').length})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Cancelled ({orders.filter((o) => o.order_status === 'cancelled').length})
            </button>
          </div>

          {/* Search bar and Sort Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, Customer Name, Phone..."
                className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all text-stone-800 placeholder-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 whitespace-nowrap flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 font-medium text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Highest Amount</option>
                <option value="amount_low">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-amber-700 animate-spin mx-auto mb-3" />
            <p className="text-stone-600 font-medium text-sm">Fetching orders from Supabase...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200/90 p-12 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-400">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">No Orders Found</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders match your current filter or search criteria.'
                : 'No customer orders have been placed yet in the database.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

        {/* Orders List */}
        {!isLoading && sortedOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <span>Showing <strong>{sortedOrders.length}</strong> of {orders.length} orders</span>
            </div>

            {sortedOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.placed;
              const StatusIcon = statusCfg.icon;
              const isExpanded = Boolean(expandedOrders[order.id]);
              const isUpdating = updatingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-sm transition-all overflow-hidden"
                >
                  {/* Order Card Header */}
                  <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}>
                          <StatusIcon className="w-4.5 h-4.5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-stone-900">
                              #{order.id.slice(0, 8)}...
                            </span>
                            <button
                              onClick={() => copyToClipboard(order.id, `id_${order.id}`)}
                              className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-1 p-0.5 rounded transition-colors"
                              title="Copy full Order UUID"
                            >
                              {copiedKey === `id_${order.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-xs text-stone-400">•</span>
                            <span className="text-xs text-stone-500 font-medium">
                              {formatDate(order.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-stone-800">
                              {order.customer_name || 'Guest Customer'}
                            </span>
                            <span className="text-stone-300">•</span>
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="text-xs text-amber-800 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Phone className="w-3 h-3" />
                              {order.customer_phone || 'No phone'}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Status Selector & Payment Indicator */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        {/* Payment Status Pill */}
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                            order.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : order.payment_status === 'failed'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <CreditCard className="w-3 h-3" />
                          {order.payment_status || 'pending'}
                        </span>

                        {/* Status Dropdown */}
                        <div className="relative">
                          <select
                            value={order.order_status}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            className={`text-xs font-semibold rounded-xl px-3 py-1.5 border appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-amber-700/20 cursor-pointer disabled:opacity-50 transition-colors ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-white text-stone-900 font-normal">
                                Status: {STATUS_CONFIG[opt]?.label || opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary Body */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Customer & Address Details */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2 text-stone-600">
                          <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-stone-800 block">Delivery Address:</span>
                            <p className="text-stone-600 leading-relaxed mt-0.5">
                              {order.delivery_address || 'No delivery address provided'}
                            </p>
                          </div>
                        </div>

                        {/* Razorpay transaction details if present */}
                        {order.razorpay_payment_id && (
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-mono">Razorpay: {order.razorpay_payment_id}</span>
                            <button
                              onClick={() => copyToClipboard(order.razorpay_payment_id || '', `rzp_${order.id}`)}
                              className="text-stone-400 hover:text-stone-700 p-0.5"
                              title="Copy Razorpay Payment ID"
                            >
                              {copiedKey === `rzp_${order.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Items Overview */}
                      <div className="space-y-1.5 md:col-span-1">
                        <span className="text-xs font-semibold text-stone-800 block">
                          Ordered Items ({(order.order_items || []).length}):
                        </span>
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {(order.order_items || []).map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center justify-between text-xs text-stone-700">
                              <span className="truncate max-w-[180px]">
                                <strong className="font-semibold text-stone-900">{item.quantity}x</strong>{' '}
                                {item.item_name || item.menu_items?.name || 'Menu Item'}
                              </span>
                              <span className="font-mono text-stone-600 ml-2">
                                ₹{item.total_price || (item.quantity * item.unit_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing & Quick Actions */}
                      <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 flex flex-col justify-between">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-stone-500">
                            <span>Subtotal:</span>
                            <span className="font-mono">₹{order.subtotal || 0}</span>
                          </div>
                          <div className="flex justify-between text-stone-500">
                            <span>Delivery Fee:</span>
                            <span className="font-mono">₹{order.delivery_fee || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                            <span>Total Amount:</span>
                            <span className="font-mono text-amber-900">₹{order.total_amount || 0}</span>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between gap-2">
                          <button
                            onClick={() => toggleExpand(order.id)}
                            className="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <span>Hide Details</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>Full Details</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>

                          <Link
                            to={`/order-confirmation/${order.id}`}
                            className="text-[11px] font-medium text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1"
                            title="View Customer Confirmation Screen"
                          >
                            <span>Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Order Details Panel */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-stone-200/80 bg-stone-50/70 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4 animate-in fade-in duration-150">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                            Item Breakdown & Customizations
                          </h4>
                          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden text-xs">
                            {(order.order_items || []).map((item, idx) => (
                              <div key={item.id || idx} className="p-3 flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-stone-900">
                                    {item.quantity}x {item.item_name || item.menu_items?.name || 'Menu Item'}
                                  </p>
                                  <p className="text-stone-500 text-[11px]">
                                    Unit Price: ₹{item.unit_price}
                                  </p>
                                </div>
                                <div className="text-right font-mono font-bold text-stone-800">
                                  ₹{item.total_price || (item.quantity * item.unit_price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick status transition button shortcuts */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                            Quick Status Update
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {ORDER_STATUS_OPTIONS.map((statusKey) => {
                              const isCurrent = order.order_status === statusKey;
                              return (
                                <button
                                  key={statusKey}
                                  disabled={isCurrent || isUpdating}
                                  onClick={() => handleStatusChange(order.id, statusKey)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    isCurrent
                                      ? 'bg-stone-900 text-white font-bold cursor-default shadow-xs'
                                      : 'bg-white hover:bg-stone-200/80 text-stone-700 border border-stone-200'
                                  } disabled:opacity-50`}
                                >
                                  Mark as {STATUS_CONFIG[statusKey]?.label || statusKey}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminOrdersPage: React.FC<AdminOrdersPageProps> = ({ onOpenAuth }) => {
  return (
    <AdminGuard onOpenAuth={onOpenAuth}>
      <AdminOrdersContent />
    </AdminGuard>
  );
};
