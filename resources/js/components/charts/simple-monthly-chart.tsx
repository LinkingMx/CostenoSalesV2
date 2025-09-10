import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface SimpleMonthlyChartProps {
  className?: string;
}

interface MonthData {
  month: string;
  monthName: string;
  sales: number;
  formatted: string;
}

const useLastThreeMonthsData = () => {
  const [data, setData] = React.useState<MonthData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        const monthsData: MonthData[] = [];

        // Get last 3 months data
        for (let i = 2; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
          const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
          
          const response = await fetch(`/api/dashboard/main-data?start_date=${startDate}&end_date=${endDate}`, {
            headers: {
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
          });

          if (!response.ok) {
            throw new Error(`Error fetching data for ${format(monthDate, 'MMMM yyyy', { locale: es })}`);
          }

          const result = await response.json();
          
          if (result.success && result.data) {
            const sales = parseFloat(result.data.total_sales || 0);
            monthsData.push({
              month: format(monthDate, 'yyyy-MM'),
              monthName: format(monthDate, 'MMM', { locale: es }).charAt(0).toUpperCase() + 
                        format(monthDate, 'MMM', { locale: es }).slice(1),
              sales,
              formatted: new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(sales)
            });
          } else {
            monthsData.push({
              month: format(monthDate, 'yyyy-MM'),
              monthName: format(monthDate, 'MMM', { locale: es }).charAt(0).toUpperCase() + 
                        format(monthDate, 'MMM', { locale: es }).slice(1),
              sales: 0,
              formatted: '$0'
            });
          }
        }

        setData(monthsData);
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: value >= 1000000 ? 'compact' : 'standard',
    compactDisplay: 'short'
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="text-sm font-medium text-foreground mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          {data.monthName}
        </p>
        <p className="text-sm text-muted-foreground">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Ventas: {data.formatted}
        </p>
      </div>
    );
  }
  return null;
};

export function SimpleMonthlyChart({ className }: SimpleMonthlyChartProps) {
  const { data, loading, error } = useLastThreeMonthsData();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ventas Mensuales
          </CardTitle>
          <CardDescription>Últimos 3 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Cargando datos...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ventas Mensuales
          </CardTitle>
          <CardDescription>Últimos 3 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Error al cargar los datos</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const maxSales = Math.max(...data.map(item => item.sales));
  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  const growth = previousMonth && previousMonth.sales > 0 
    ? ((currentMonth.sales - previousMonth.sales) / previousMonth.sales) * 100 
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Ventas Mensuales
        </CardTitle>
        <CardDescription>
          Últimos 3 meses • Total: {formatCurrency(totalSales)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="monthName"
                axisLine={false}
                tickLine={false}
                className="text-xs text-muted-foreground"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs text-muted-foreground"
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="sales" 
                className="fill-primary"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Growth indicator */}
        {growth !== 0 && (
          <div className="flex items-center justify-center mt-4 pt-4 border-t">
            <div className={`flex items-center gap-1 text-sm ${
              growth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 ${growth < 0 ? 'rotate-180' : ''}`} />
              <span>
                {growth > 0 ? '+' : ''}{growth.toFixed(1)}% vs mes anterior
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SimpleMonthlyChart;