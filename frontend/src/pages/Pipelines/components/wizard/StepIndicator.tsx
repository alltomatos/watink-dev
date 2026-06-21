import React from "react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
    steps: string[];
    activeStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, activeStep }) => (
    <div className="flex items-center w-full mb-6">
        {steps.map((label, index) => (
            <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                            index < activeStep
                                ? "bg-primary border-primary text-primary-foreground"
                                : index === activeStep
                                ? "border-primary text-primary bg-background"
                                : "border-muted-foreground text-muted-foreground bg-background"
                        )}
                    >
                        {index + 1}
                    </div>
                    <span className="text-xs mt-1 text-muted-foreground whitespace-nowrap">
                        {label}
                    </span>
                </div>
                {index < steps.length - 1 && (
                    <div
                        className={cn(
                            "flex-1 h-0.5 mx-2 transition-colors",
                            index < activeStep ? "bg-primary" : "bg-muted"
                        )}
                    />
                )}
            </React.Fragment>
        ))}
    </div>
);

export default StepIndicator;
