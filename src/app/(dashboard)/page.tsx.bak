import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import {
  dashboardStats,
  formatCurrency,
  deals,
  activities,
  tasks,
  pipelineStages,
  getPriorityColor,
  getPriorityLabel,
  getTaskStatusColor,
  getTaskStatusLabel,
} from "@/lib/mock-data";

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "call":
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
      );
    case "email":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case "meeting":
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      );
    case "deal":
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      );
  }
}

export default function DashboardPage() {
  const openDeals = deals.filter((d) => !d.stage.startsWith("closed"));
  const upcomingTasks = tasks.filter((t) => t.status !== "done").slice(0, 5);

  // Pipeline summary
  const pipelineSummary = pipelineStages
    .filter((s) => s.key !== "closed-won" && s.key !== "closed-lost")
    .map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage.key);
      return {
        ...stage,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
    });

  return (
    <>
      <Header title="แดชบอร์ด" />
      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="ลูกค้าทั้งหมด"
            value={dashboardStats.totalCustomers.toString()}
            subtitle={`${dashboardStats.activeCustomers} ใช้งาน`}
            color="bg-blue-100"
            icon={
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            title="ดีลที่เปิดอยู่"
            value={dashboardStats.openDeals.toString()}
            subtitle={`จากทั้งหมด ${dashboardStats.totalDeals} ดีล`}
            color="bg-green-100"
            icon={
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <StatCard
            title="มูลค่า Pipeline"
            value={formatCurrency(dashboardStats.pipelineValue)}
            subtitle={`อัตราปิดดีล ${dashboardStats.conversionRate}%`}
            color="bg-yellow-100"
            icon={
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="รายได้ (ปิดดีลแล้ว)"
            value={formatCurrency(dashboardStats.totalRevenue)}
            subtitle={`${dashboardStats.tasksDue} งานที่ค้างอยู่`}
            color="bg-purple-100"
            icon={
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>

        {/* Pipeline Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Pipeline Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineSummary.map((stage) => (
              <div key={stage.key} className="text-center p-4 rounded-lg bg-gray-50">
                <div className={`inline-block w-3 h-3 rounded-full ${stage.color} mb-2`}></div>
                <p className="text-sm text-gray-500">{stage.label}</p>
                <p className="text-xl font-bold text-gray-800">{stage.count}</p>
                <p className="text-xs text-gray-400">{formatCurrency(stage.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Deals */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">ดีลล่าสุด</h3>
              <a href="/deals" className="text-sm text-green-600 hover:text-green-700 font-medium">ดูทั้งหมด →</a>
            </div>
            <div className="space-y-3">
              {openDeals.slice(0, 5).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{deal.title}</p>
                    <p className="text-xs text-gray-500">{deal.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800 text-sm">{formatCurrency(deal.value)}</p>
                    <p className="text-xs text-gray-400">{deal.probability}% โอกาส</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">กิจกรรมล่าสุด</h3>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <ActivityIcon type={activity.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(activity.timestamp).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} • {activity.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">งานที่ต้องทำ</h3>
            <a href="/tasks" className="text-sm text-green-600 hover:text-green-700 font-medium">ดูทั้งหมด →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">งาน</th>
                  <th className="pb-3 font-medium">ผู้รับผิดชอบ</th>
                  <th className="pb-3 font-medium">ความสำคัญ</th>
                  <th className="pb-3 font-medium">สถานะ</th>
                  <th className="pb-3 font-medium">กำหนด</th>
                </tr>
              </thead>
              <tbody>
                {upcomingTasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium text-gray-800">{task.title}</p>
                      {task.relatedCustomer && (
                        <p className="text-xs text-gray-400">{task.relatedCustomer}</p>
                      )}
                    </td>
                    <td className="py-3 text-gray-600">{task.assignee}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                        {getTaskStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(task.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
