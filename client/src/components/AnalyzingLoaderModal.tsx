import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface AnalyzingLoaderModalProps {
  open: boolean;
}

const analyzeSteps = [
  "Extracting lab values from image...",
  "Processing with ML models...",
  "Calculating risk assessment...",
  "Generating comprehensive analysis...",
  "Finalizing your health report...",
];

export function AnalyzingLoaderModal({ open }: AnalyzingLoaderModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setDots("");
      return;
    }

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    // Progress main steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < analyzeSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2400);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(stepInterval);
    };
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-md sm:max-w-lg border bg-card shadow-lg p-6 sm:p-8 [&>button]:hidden" 
        data-testid="modal-analyzing-loader"
      >
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
          {/* Icon with subtle animation */}
          <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          </div>

          {/* Current step text */}
          <div className="text-center space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {analyzeSteps[currentStep]}
              <span className="inline-block w-8 text-left">{dots}</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              This may take a few moments
            </p>
          </div>

          {/* Simple progress bar */}
          <div className="w-full">
            <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${currentStep === analyzeSteps.length - 1 ? 95 : ((currentStep + 1) / analyzeSteps.length) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 text-center">
              {currentStep === analyzeSteps.length - 1 ? 95 : Math.round(((currentStep + 1) / analyzeSteps.length) * 100)}% Complete
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}