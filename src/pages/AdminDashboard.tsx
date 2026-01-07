import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, Zap, RefreshCw, Users, User } from 'lucide-react';
import { getVisitStats } from '../services/visitTracker';

interface DailyCost {
  date: string;
  cost: number;
  tokens: number;
  calls: number;
}

interface MonthlyCost {
  month: string;
  totalCost: number;
  totalTokens: number;
  callCount: number;
}

interface DailyUsage {
  date: string;
  count: number;
}

/**
 * Admin Dashboard Page
 *
 * Displays cost monitoring, rate limit usage, and AI usage statistics
 * for administrators to track application costs and usage.
 */
export default function AdminDashboard() {
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonthCost, setCurrentMonthCost] = useState(0);
  const [currentMonthCalls, setCurrentMonthCalls] = useState(0);
  const [todayUsage, setTodayUsage] = useState(0);
  const [todayCost, setTodayCost] = useState(0);
  const [totalUserVisits, setTotalUserVisits] = useState(0);
  const [totalAdminVisits, setTotalAdminVisits] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current month
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // "2024-12"
      const today = now.toISOString().split("T")[0]; // "2024-12-18"

      console.log('[AdminDashboard] Loading data for:', { today, currentMonth });

      // Load daily costs (last 30 days)
      // Try with orderBy first, fallback to no orderBy if index missing
      let dailyCostsSnapshot;
      try {
        const dailyCostsRef = collection(db, 'appUsage', 'costs', 'daily');
        const dailyCostsQuery = query(dailyCostsRef, orderBy('date', 'desc'), limit(30));
        dailyCostsSnapshot = await getDocs(dailyCostsQuery);
      } catch (orderByError: any) {
        console.warn('[AdminDashboard] orderBy failed, trying without:', orderByError);
        // Fallback: get all and sort in memory
        const dailyCostsRef = collection(db, 'appUsage', 'costs', 'daily');
        dailyCostsSnapshot = await getDocs(dailyCostsRef);
      }

      const dailyCostsData: DailyCost[] = [];
      dailyCostsSnapshot.forEach((doc) => {
        const data = doc.data();
        const docDate = data.date || doc.id;
        dailyCostsData.push({
          date: docDate,
          cost: Number(data.cost) || 0,
          tokens: Number(data.tokens) || 0,
          calls: Number(data.calls) || 0,
        });
      });
      
      // Sort by date descending if we didn't use orderBy
      dailyCostsData.sort((a, b) => b.date.localeCompare(a.date));
      const sortedDailyCosts = dailyCostsData.slice(0, 30);
      
      console.log('[AdminDashboard] Daily costs loaded:', sortedDailyCosts.length, 'documents');
      setDailyCosts(sortedDailyCosts);

      // Calculate today's cost
      const todayCostData = sortedDailyCosts.find((d) => d.date === today);
      if (todayCostData) {
        console.log('[AdminDashboard] Today cost:', todayCostData.cost);
        setTodayCost(todayCostData.cost);
      } else {
        console.log('[AdminDashboard] No data found for today:', today);
      }

      // Load monthly costs (last 12 months)
      let monthlyCostsSnapshot;
      try {
        const monthlyCostsRef = collection(db, 'appUsage', 'costs', 'monthly');
        const monthlyCostsQuery = query(monthlyCostsRef, orderBy('month', 'desc'), limit(12));
        monthlyCostsSnapshot = await getDocs(monthlyCostsQuery);
      } catch (orderByError: any) {
        console.warn('[AdminDashboard] Monthly orderBy failed, trying without:', orderByError);
        const monthlyCostsRef = collection(db, 'appUsage', 'costs', 'monthly');
        monthlyCostsSnapshot = await getDocs(monthlyCostsRef);
      }

      const monthlyCostsData: MonthlyCost[] = [];
      monthlyCostsSnapshot.forEach((doc) => {
        const data = doc.data();
        monthlyCostsData.push({
          month: data.month || doc.id,
          totalCost: Number(data.totalCost) || 0,
          totalTokens: Number(data.totalTokens) || 0,
          callCount: Number(data.callCount) || 0,
        });
      });
      
      // Sort by month descending if we didn't use orderBy
      monthlyCostsData.sort((a, b) => b.month.localeCompare(a.month));
      const sortedMonthlyCosts = monthlyCostsData.slice(0, 12);
      
      console.log('[AdminDashboard] Monthly costs loaded:', sortedMonthlyCosts.length, 'documents');
      setMonthlyCosts(sortedMonthlyCosts);

      // Calculate current month cost
      const currentMonthData = sortedMonthlyCosts.find((m) => m.month === currentMonth);
      if (currentMonthData) {
        console.log('[AdminDashboard] Current month cost:', currentMonthData.totalCost, 'calls:', currentMonthData.callCount);
        setCurrentMonthCost(currentMonthData.totalCost);
        setCurrentMonthCalls(currentMonthData.callCount);
      } else {
        console.log('[AdminDashboard] No data found for current month:', currentMonth);
      }

      // Load daily usage (last 30 days)
      let dailyUsageSnapshot;
      try {
        const dailyUsageRef = collection(db, 'appUsage', 'aiCalls', 'daily');
        const dailyUsageQuery = query(dailyUsageRef, orderBy('date', 'desc'), limit(30));
        dailyUsageSnapshot = await getDocs(dailyUsageQuery);
      } catch (orderByError: any) {
        console.warn('[AdminDashboard] Daily usage orderBy failed, trying without:', orderByError);
        const dailyUsageRef = collection(db, 'appUsage', 'aiCalls', 'daily');
        dailyUsageSnapshot = await getDocs(dailyUsageRef);
      }

      const dailyUsageData: DailyUsage[] = [];
      dailyUsageSnapshot.forEach((doc) => {
        const data = doc.data();
        dailyUsageData.push({
          date: data.date || doc.id,
          count: Number(data.count) || 0,
        });
      });
      
      // Sort by date descending if we didn't use orderBy
      dailyUsageData.sort((a, b) => b.date.localeCompare(a.date));
      const sortedDailyUsage = dailyUsageData.slice(0, 30);
      
      console.log('[AdminDashboard] Daily usage loaded:', sortedDailyUsage.length, 'documents');
      setDailyUsage(sortedDailyUsage);

      // Calculate today's usage
      const todayUsageData = sortedDailyUsage.find((d) => d.date === today);
      if (todayUsageData) {
        console.log('[AdminDashboard] Today usage:', todayUsageData.count);
        setTodayUsage(todayUsageData.count);
      } else {
        console.log('[AdminDashboard] No usage data found for today:', today);
      }

      // Load visit statistics
      const visitStats = await getVisitStats();
      console.log('[AdminDashboard] Visit stats:', visitStats);
      setTotalUserVisits(visitStats.totalUserVisits);
      setTotalAdminVisits(visitStats.totalAdminVisits);
    } catch (error) {
      console.error('[AdminDashboard] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor AI usage, costs, and application statistics
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Today's Cost */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(todayCost)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Current Month Cost */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Month
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(currentMonthCost)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Today's Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Calls
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(todayUsage)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Monthly Calls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Month Calls
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(currentMonthCalls)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* User Visits */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  User Visits
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(totalUserVisits)}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Admin Visits */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  My Visits
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(totalAdminVisits)}
                </p>
              </div>
              <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-full">
                <User className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Budget Alert */}
        {currentMonthCost > 8 && (
          <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Budget Alert
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Current month cost ({formatCurrency(currentMonthCost)}) is approaching your $10/month budget.
              </p>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Costs Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Daily Costs (Last 30 Days)
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
              {dailyCosts.length > 0 ? (
                dailyCosts.map((daily) => (
                  <div
                    key={daily.date}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(daily.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(daily.cost)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(daily.calls)} calls
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Monthly Costs Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Costs (Last 12 Months)
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
              {monthlyCosts.length > 0 ? (
                monthlyCosts.map((monthly) => (
                  <div
                    key={monthly.month}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getMonthName(monthly.month)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(monthly.totalCost)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(monthly.callCount)} calls
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Daily Usage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Daily AI Calls (Last 30 Days)
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
            {dailyUsage.length > 0 ? (
              dailyUsage.map((usage) => (
                <div
                  key={usage.date}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(usage.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatNumber(usage.count)} calls
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No data available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

