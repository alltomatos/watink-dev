import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Chart from "../../../pages/Dashboard/Chart.tsx";

const AttendanceChart: React.FC = () => {
  return (
    <div className="col-span-12">
      <Card className="p-4 flex overflow-auto flex-col h-60">
        <CardContent className="p-0">
          <Chart />
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceChart;
