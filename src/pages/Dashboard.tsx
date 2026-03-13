import { useEffect, useState } from "react";
import {
  Ship,
  UsersRound,
  TrendingUp,
  TrendingDown,
  Wrench,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { dashboardApi, shipsApi, FleetSummary, MyTasksResponse } from "../services/api";
import { toast } from "sonner";

/* ---------------- UTILS ---------------- */

function getDaysRemainingColor(days: number) {
  if (days <= 30) return "bg-destructive text-destructive-foreground";
  if (days <= 60) return "bg-warning text-warning-foreground";
  return "bg-accent text-accent-foreground";
}

/* ---------------- COMPONENT ---------------- */

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fleetData, setFleetData] = useState<FleetSummary | null>(null);
  const [myTasks, setMyTasks] = useState<MyTasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMaster = user?.role === "master";
  const isCrew = user?.role === "crew";
  const isStaff = user?.role === "staff";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isMaster) {
          // Master gets fleet summary
          const response = await dashboardApi.getFleetSummary();
          if (response.error) {
            throw new Error(response.error);
          }
          setFleetData(response.data || null);
        } else {
          // Crew and Staff get their tasks/operations data
          const response = await dashboardApi.getMyTasks();
          if (response.error) {
            throw new Error(response.error);
          }
          setMyTasks(response.data || null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error("Dashboard data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, isMaster]);

  // Generate KPI data from real backend data
  const dashboardKpiData = (() => {
    if (isMaster && fleetData) {
      return [
        {
          title: "Total Ships",
          value: fleetData.total_ships.toString(),
          change: "+0",
          trend: "up" as const,
          icon: Ship,
          chartData: [fleetData.total_ships, fleetData.total_ships, fleetData.total_ships, fleetData.total_ships, fleetData.total_ships, fleetData.total_ships],
        },
        {
          title: "Active Vessels",
          value: fleetData.active_ships.toString(),
          change: "0",
          trend: "up" as const,
          icon: Ship,
          chartData: [fleetData.active_ships, fleetData.active_ships, fleetData.active_ships, fleetData.active_ships, fleetData.active_ships, fleetData.active_ships],
        },
        {
          title: "Total Crew",
          value: fleetData.total_crew.toString(),
          change: "+0%",
          trend: "up" as const,
          icon: UsersRound,
          chartData: [fleetData.total_crew, fleetData.total_crew, fleetData.total_crew, fleetData.total_crew, fleetData.total_crew, fleetData.total_crew],
        },
        {
          title: "Pending PMS Tasks",
          value: fleetData.pending_pms_tasks.toString(),
          change: "0",
          trend: "down" as const,
          icon: Wrench,
          chartData: [fleetData.pending_pms_tasks, fleetData.pending_pms_tasks, fleetData.pending_pms_tasks, fleetData.pending_pms_tasks, fleetData.pending_pms_tasks, fleetData.pending_pms_tasks],
        },
        {
          title: "Pending Approvals",
          value: fleetData.pending_approvals.toString(),
          change: "+0",
          trend: "up" as const,
          icon: AlertCircle,
          chartData: [fleetData.pending_approvals, fleetData.pending_approvals, fleetData.pending_approvals, fleetData.pending_approvals, fleetData.pending_approvals, fleetData.pending_approvals],
        },
      ];
    } else if (isCrew && myTasks) {
      return [
        {
          title: "My Tasks",
          value: myTasks.total_tasks?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: Wrench,
          chartData: [myTasks.total_tasks || 0, myTasks.total_tasks || 0, myTasks.total_tasks || 0, myTasks.total_tasks || 0, myTasks.total_tasks || 0, myTasks.total_tasks || 0],
        },
        {
          title: "Pending Tasks",
          value: myTasks.pending_tasks?.toString() || "0",
          change: "0",
          trend: "down" as const,
          icon: Clock,
          chartData: [myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0],
        },
        {
          title: "In Progress",
          value: myTasks.in_progress_tasks?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: Wrench,
          chartData: [myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0],
        },
        {
          title: "Completed",
          value: myTasks.completed_tasks?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: CheckCircle2,
          chartData: [myTasks.completed_tasks || 0, myTasks.completed_tasks || 0, myTasks.completed_tasks || 0, myTasks.completed_tasks || 0, myTasks.completed_tasks || 0, myTasks.completed_tasks || 0],
        },
        {
          title: "Overdue",
          value: myTasks.overdue_tasks?.toString() || "0",
          change: "0",
          trend: "down" as const,
          icon: AlertCircle,
          chartData: [myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0],
        },
        {
          title: "Submissions",
          value: myTasks.pending_submissions?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: CheckCircle2,
          chartData: [myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0],
        },
      ];
    } else if (isStaff && myTasks) {
      // Staff sees only their assigned vessel's data
      return [
        {
          title: "Assigned Vessel",
          value: myTasks.ship_name || "Not Assigned",
          change: "",
          trend: "up" as const,
          icon: Ship,
          chartData: [1, 1, 1, 1, 1, 1],
        },
        {
          title: "Vessel Crew",
          value: myTasks.total_crew?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: UsersRound,
          chartData: [myTasks.total_crew || 0, myTasks.total_crew || 0, myTasks.total_crew || 0, myTasks.total_crew || 0, myTasks.total_crew || 0, myTasks.total_crew || 0],
        },
        {
          title: "Pending Tasks",
          value: myTasks.pending_tasks?.toString() || "0",
          change: "0",
          trend: "down" as const,
          icon: Clock,
          chartData: [myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0, myTasks.pending_tasks || 0],
        },
        {
          title: "In Progress",
          value: myTasks.in_progress_tasks?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: Wrench,
          chartData: [myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0, myTasks.in_progress_tasks || 0],
        },
        {
          title: "Overdue",
          value: myTasks.overdue_tasks?.toString() || "0",
          change: "0",
          trend: "down" as const,
          icon: AlertCircle,
          chartData: [myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0, myTasks.overdue_tasks || 0],
        },
        {
          title: "Submissions",
          value: myTasks.pending_submissions?.toString() || "0",
          change: "0",
          trend: "up" as const,
          icon: CheckCircle2,
          chartData: [myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0, myTasks.pending_submissions || 0],
        },
      ];
    }
    return [];
  })();

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-[#02283F] p-6 rounded-2xl shadow-lg">
        <h1 className="text-white text-2xl font-semibold mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-white/80">
          {isMaster && fleetData && `Managing ${fleetData.total_ships} ships across the fleet`}
          {isCrew && myTasks?.ship_name && `Assigned to ${myTasks.ship_name}`}
          {isStaff && myTasks?.ship_name && `Managing operations for ${myTasks.ship_name}`}
          {isStaff && !myTasks?.ship_name && !loading && "No vessel assigned - contact administrator"}
          {loading && "Loading dashboard data..."}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex justify-between mb-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800">Failed to load dashboard data</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State - KPI Cards */}
      {!loading && !error && (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${
            isMaster || isCrew || isStaff ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-4"
          } gap-6`}
        >
          {dashboardKpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown;

            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{kpi.title}</p>
                      <div className="text-3xl font-semibold">{kpi.value}</div>
                      <div className="flex items-center gap-1 text-sm">
                        <TrendIcon className="w-4 h-4" />
                        {kpi.change}
                      </div>
                    </div>
                    <Icon className="w-6 h-6 text-primary" />
                  </div>

                  <ResponsiveContainer width="100%" height={48}>
                    <LineChart
                      data={kpi.chartData.map((v, i) => ({ value: v, i }))}
                    >
                      <Line
                        dataKey="value"
                        stroke={kpi.trend === "up" ? "#1ABC9C" : "#E74C3C"}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Master-specific Fleet Overview */}
      {!loading && !error && isMaster && fleetData && (
        <Card>
          <CardHeader>
            <CardTitle>Fleet Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fleetData.ships_stats.map((ship) => (
                <Card key={ship.ship_id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm">{ship.ship_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {ship.crew_count} crew
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>PMS: {ship.pending_pms_tasks} pending, {ship.overdue_pms_tasks} overdue</div>
                      <div>Invoices: {ship.pending_invoices} pending</div>
                      <div>Amount: ${ship.total_invoice_amount.toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crew-specific Task List */}
      {!loading && !error && isCrew && myTasks?.tasks && (
        <Card>
          <CardHeader>
            <CardTitle>My Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTasks.tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{task.task_description}</h4>
                    <p className="text-xs text-muted-foreground">{task.equipment_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {task.status}
                    </Badge>
                    {task.is_form && <Badge className="bg-blue-100 text-blue-800 border-blue-200">Form</Badge>}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        if (task.is_form) {
                           window.location.href = '/documents/submissions';
                        } else {
                           window.location.hash = 'pms';
                        }
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
              {myTasks.tasks.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No tasks assigned</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff-specific Vessel Overview */}
      {!loading && !error && isStaff && myTasks?.ship_name && (
        <Card>
          <CardHeader>
            <CardTitle>Vessel Operations Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm mb-2">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/crew-logs'}>
                    View Work Logs
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/cargo'}>
                    Cargo Operations
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/bunkering'}>
                    Bunkering
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/invoices'}>
                    Invoices
                  </Button>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm mb-2">Vessel Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Vessel:</span>
                    <span className="font-medium">{myTasks.ship_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crew Members:</span>
                    <span className="font-medium">{myTasks.total_crew || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Tasks:</span>
                    <span className="font-medium">{myTasks.pending_tasks || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff with no vessel assigned */}
      {!loading && !error && isStaff && !myTasks?.ship_name && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">No Vessel Assigned</h3>
                <p className="text-sm text-yellow-600">
                  You have not been assigned to a vessel yet. Please contact the administrator to get vessel access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export default Dashboard;
