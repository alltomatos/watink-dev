import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import AttendanceChart from "../../../components/Dashboard/Widgets/AttendanceChart";

interface DashboardAttendanceCardProps {
  totalCount: number;
}

const DashboardAttendanceCard: React.FC<DashboardAttendanceCardProps> = ({
  totalCount,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-info)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <CardTitle>Atendimentos por Hora</CardTitle>
            <CardDescription>Hoje — {totalCount} total</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AttendanceChart />
      </CardContent>
    </Card>
  );
};

export default DashboardAttendanceCard;
