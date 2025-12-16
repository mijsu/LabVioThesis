import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Heart,
  Utensils,
  Dumbbell,
  Stethoscope,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  AlertTriangle,
  Info,
  BarChart3,
  Target,
  MapPin,
  Phone,
  Navigation,
  Star,
  Clock,
  Download,
  Trash2
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { type HealthAnalysis } from "@shared/schema";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface Hospital {
  id: string;
  name: string;
  address: string;
  distance: number;
  specialties: string[];
  rating: number;
  phoneNumber: string;
  isOpen24Hours: boolean;
  latitude: number;
  longitude: number;
}

interface Specialist {
  type: string;
  reason: string;
  urgency?: 'routine' | 'soon' | 'urgent';
}

interface AnalysisResultModalProps {
  open: boolean;
  onClose: () => void;
  analysis: HealthAnalysis;
  onViewDashboard: () => void;
}

const getRiskConfig = (riskLevel: string) => {
  switch (riskLevel) {
    case "low":
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        icon: CheckCircle2,
        label: "Low Risk",
        gradient: "from-green-500 to-green-600",
        strokeColor: "#22c55e", // green-500
        strokeColorEnd: "#16a34a", // green-600
      };
    case "moderate":
      return {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        icon: AlertCircle,
        label: "Moderate Risk",
        gradient: "from-amber-500 to-amber-600",
        strokeColor: "#f59e0b", // amber-500
        strokeColorEnd: "#d97706", // amber-600
      };
    case "high":
      return {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        icon: AlertTriangle,
        label: "High Risk",
        gradient: "from-red-500 to-red-600",
        strokeColor: "#ef4444", // red-500
        strokeColorEnd: "#dc2626", // red-600
      };
    default:
      return {
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-500/10",
        borderColor: "border-gray-500/20",
        icon: Info,
        label: "Unknown",
        gradient: "from-gray-500 to-gray-600",
        strokeColor: "#6b7280", // gray-500
        strokeColorEnd: "#4b5563", // gray-600
      };
  }
};

// Process lab values for charts
// Normal ranges for lab values
const LAB_NORMAL_RANGES = {
  wbc: { min: 4.5, max: 11.0, unit: "K/uL", name: "WBC" },
  rbc: { min: 4.2, max: 5.9, unit: "M/uL", name: "RBC" },
  hemoglobin: { min: 12.0, max: 17.5, unit: "g/dL", name: "Hemoglobin" },
  platelets: { min: 150, max: 400, unit: "K/uL", name: "Platelets" },
  cholesterol: { min: 0, max: 200, unit: "mg/dL", name: "Cholesterol" },
  hdl: { min: 40, max: 100, unit: "mg/dL", name: "HDL" },
  ldl: { min: 0, max: 100, unit: "mg/dL", name: "LDL" },
  triglycerides: { min: 0, max: 150, unit: "mg/dL", name: "Triglycerides" },
  glucose: { min: 70, max: 100, unit: "mg/dL", name: "Glucose" },
  a1c: { min: 0, max: 5.7, unit: "%", name: "A1C" },
};

// Normalize lab value to health score (100 = optimal, 0 = critically abnormal)
function normalizeLabValue(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 100;
  if (value < min) {
    const percentBelow = ((min - value) / min) * 100;
    const score = 100 - percentBelow;
    return Math.max(0, score);
  }
  if (value > max) {
    const percentAbove = ((value - max) / max) * 100;
    const score = 100 - percentAbove;
    return Math.max(0, score);
  }
  return 100;
}

// Calculate risk contribution from a lab value (0-100 scale)
function calculateRiskContribution(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 0;
  if (value < min) {
    const percentBelow = ((min - value) / min) * 100;
    return Math.min(percentBelow, 100);
  } else {
    const percentAbove = ((value - max) / max) * 100;
    return Math.min(percentAbove, 100);
  }
}

function processLabDataForCharts(labValueBreakdown: any) {
  const radarData: Array<{ subject: string; value: number; fullMark: 100 }> = [];
  const barData: Array<{ name: string; contribution: number; color: string }> = [];
  
  const colors = ["#3B82F6", "#6366F1", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];
  let colorIndex = 0;

  if (!Array.isArray(labValueBreakdown) || labValueBreakdown.length === 0) {
    return { radarData, barData };
  }

  labValueBreakdown.forEach((lab: any) => {
    const numValue = parseFloat(lab.value);
    
    if (!isNaN(numValue)) {
      // Find matching normal range with flexible matching
      const paramLower = lab.parameter.toLowerCase();
      let rangeEntry = null;

      // Try exact match first
      let paramKey = paramLower.replace(/\s+/g, '');
      rangeEntry = Object.entries(LAB_NORMAL_RANGES).find(([key]) => 
        key.toLowerCase().replace(/\s+/g, '') === paramKey
      );

      // If no exact match, try substring matching
      if (!rangeEntry) {
        rangeEntry = Object.entries(LAB_NORMAL_RANGES).find(([key]) => 
          paramLower.includes(key.toLowerCase()) || key.toLowerCase().includes(paramKey.split('(')[0].trim())
        );
      }

      if (rangeEntry) {
        const [, range] = rangeEntry;
        
        // For radar chart: 100 = healthy, lower = more concerning
        const healthScore = normalizeLabValue(numValue, range.min, range.max);
        radarData.push({
          subject: range.name,
          value: Math.round(healthScore),
          fullMark: 100,
        });

        // For bar chart: only show values that contribute to risk (outside normal range)
        const contribution = calculateRiskContribution(numValue, range.min, range.max);
        if (contribution > 0) {
          barData.push({
            name: range.name,
            contribution: Math.round(contribution),
            color: colors[colorIndex % colors.length],
          });
          colorIndex++;
        }
      }
    }
  });

  return { radarData, barData };
}

// Generate PDF report from analysis data
function generatePDFReport(analysis: HealthAnalysis) {
  const doc = new jsPDF('p', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 60;
  const leftMargin = 40;
  const rightMargin = 40;
  const maxWidth = pageWidth - leftMargin - rightMargin;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // primary-600
  doc.text("LabVio Health Analysis Report", leftMargin, yPos);
  yPos += 30;

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date(analysis.analyzedAt).toLocaleString()}`, leftMargin, yPos);
  yPos += 30;

  // Risk Assessment
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Risk Assessment", leftMargin, yPos);
  yPos += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const riskColor: [number, number, number] = analysis.riskLevel === 'low' ? [34, 197, 94] : analysis.riskLevel === 'moderate' ? [245, 158, 11] : [239, 68, 68];
  doc.setTextColor(...riskColor);
  doc.text(`Risk Level: ${analysis.riskLevel.toUpperCase()}`, leftMargin, yPos);
  yPos += 18;
  doc.setTextColor(0, 0, 0);
  doc.text(`Risk Score: ${analysis.riskScore}/100`, leftMargin, yPos);
  yPos += 30;

  // Findings
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Medical Findings", leftMargin, yPos);
  yPos += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const findingsLines = doc.splitTextToSize(analysis.comprehensiveAnalysis?.detailedFindings || analysis.findings, maxWidth);
  doc.text(findingsLines, leftMargin, yPos);
  yPos += findingsLines.length * 14 + 20;

  // Lab Values Breakdown
  if (analysis.comprehensiveAnalysis?.labValueBreakdown && analysis.comprehensiveAnalysis.labValueBreakdown.length > 0) {
    if (yPos > 680) { doc.addPage(); yPos = 60; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Lab Values Breakdown", leftMargin, yPos);
    yPos += 20;

    doc.setFontSize(10);
    analysis.comprehensiveAnalysis.labValueBreakdown.forEach((lab) => {
      if (yPos > 720) { doc.addPage(); yPos = 60; }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${lab.parameter}: ${lab.value}`, leftMargin, yPos);
      yPos += 14;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Normal Range: ${lab.normalRange}`, leftMargin + 10, yPos);
      yPos += 14;
      
      const statusColor: [number, number, number] = lab.status === 'normal' ? [34, 197, 94] : lab.status === 'borderline' ? [245, 158, 11] : [239, 68, 68];
      doc.setTextColor(...statusColor);
      doc.text(`Status: ${lab.status.toUpperCase()}`, leftMargin + 10, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 14;
      
      const interpretationLines = doc.splitTextToSize(lab.interpretation, maxWidth - 10);
      doc.text(interpretationLines, leftMargin + 10, yPos);
      yPos += interpretationLines.length * 12 + 10;
    });
    yPos += 10;
  }

  // Lifestyle Recommendations
  const lifestyleRecs = analysis.comprehensiveAnalysis?.lifestyleRecommendations && analysis.comprehensiveAnalysis.lifestyleRecommendations.length > 0
    ? analysis.comprehensiveAnalysis.lifestyleRecommendations
    : analysis.lifestyleRecommendations?.map((rec, idx) => ({ category: 'General', recommendation: rec, rationale: '' })) || [];
  
  if (lifestyleRecs.length > 0) {
    if (yPos > 680) { doc.addPage(); yPos = 60; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Lifestyle Recommendations", leftMargin, yPos);
    yPos += 20;

    doc.setFontSize(10);
    lifestyleRecs.forEach((rec, idx) => {
      if (yPos > 700) { doc.addPage(); yPos = 60; }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. [${rec.category}]`, leftMargin, yPos);
      yPos += 14;
      
      doc.setFont("helvetica", "normal");
      const recLines = doc.splitTextToSize(rec.recommendation, maxWidth - 10);
      doc.text(recLines, leftMargin + 10, yPos);
      yPos += recLines.length * 12 + 8;
      
      if (rec.rationale) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const rationaleLines = doc.splitTextToSize(`Rationale: ${rec.rationale}`, maxWidth - 10);
        doc.text(rationaleLines, leftMargin + 10, yPos);
        doc.setFontSize(10);
        yPos += rationaleLines.length * 11 + 10;
      }
    });
    yPos += 10;
  }

  // Dietary Recommendations
  const dietaryRecs = analysis.comprehensiveAnalysis?.dietaryRecommendations && analysis.comprehensiveAnalysis.dietaryRecommendations.length > 0
    ? analysis.comprehensiveAnalysis.dietaryRecommendations
    : analysis.dietaryRecommendations?.map((rec, idx) => ({ category: 'General', recommendation: rec, rationale: '' })) || [];
  
  if (dietaryRecs.length > 0) {
    if (yPos > 680) { doc.addPage(); yPos = 60; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Dietary Recommendations", leftMargin, yPos);
    yPos += 20;

    doc.setFontSize(10);
    dietaryRecs.forEach((rec, idx) => {
      if (yPos > 700) { doc.addPage(); yPos = 60; }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. [${rec.category}]`, leftMargin, yPos);
      yPos += 14;
      
      doc.setFont("helvetica", "normal");
      const recLines = doc.splitTextToSize(rec.recommendation, maxWidth - 10);
      doc.text(recLines, leftMargin + 10, yPos);
      yPos += recLines.length * 12 + 8;
      
      if (rec.rationale) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const rationaleLines = doc.splitTextToSize(`Rationale: ${rec.rationale}`, maxWidth - 10);
        doc.text(rationaleLines, leftMargin + 10, yPos);
        doc.setFontSize(10);
        yPos += rationaleLines.length * 11 + 10;
      }
    });
    yPos += 10;
  }

  // Specialists
  const specialists = analysis.comprehensiveAnalysis?.suggestedSpecialists && analysis.comprehensiveAnalysis.suggestedSpecialists.length > 0
    ? analysis.comprehensiveAnalysis.suggestedSpecialists
    : analysis.suggestedSpecialists?.map(spec => ({ type: spec, reason: 'Consultation recommended based on your lab results', urgency: 'routine' as const })) || [];
  
  if (specialists.length > 0) {
    if (yPos > 680) { doc.addPage(); yPos = 60; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Recommended Specialists", leftMargin, yPos);
    yPos += 20;

    doc.setFontSize(10);
    specialists.forEach((spec, idx) => {
      if (yPos > 720) { doc.addPage(); yPos = 60; }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${spec.type}`, leftMargin, yPos);
      yPos += 14;
      
      doc.setFont("helvetica", "normal");
      const reasonLines = doc.splitTextToSize(spec.reason, maxWidth - 10);
      doc.text(reasonLines, leftMargin + 10, yPos);
      yPos += reasonLines.length * 12 + 8;
      
      if (spec.urgency) {
        const urgencyColor: [number, number, number] = spec.urgency === 'urgent' ? [239, 68, 68] : spec.urgency === 'soon' ? [245, 158, 11] : [100, 100, 100];
        doc.setTextColor(...urgencyColor);
        doc.text(`Urgency: ${spec.urgency.toUpperCase()}`, leftMargin + 10, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 16;
      }
    });
  }

  // Disclaimer
  doc.addPage();
  yPos = 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(245, 158, 11); // amber
  doc.text("Medical Disclaimer", leftMargin, yPos);
  yPos += 20;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const disclaimerText = "This analysis is powered by AI and should not replace professional medical advice. Always consult with qualified healthcare providers for diagnosis and treatment decisions. The information provided is for educational purposes only.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, maxWidth);
  doc.text(disclaimerLines, leftMargin, yPos);

  // Footer on all pages
  const totalPages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 30, { align: 'center' });
    doc.text("Generated by LabVio - AI-Powered Health Analysis", pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
  }

  // Save
  const filename = `LabVio-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export default function AnalysisResultModal({
  open,
  onClose,
  analysis,
  onViewDashboard,
}: AnalysisResultModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recommendedHospital, setRecommendedHospital] = useState<Hospital | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'detecting' | 'found' | 'denied' | 'unavailable' | 'prompt'>('detecting');
  const [manualLocationRequested, setManualLocationRequested] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const riskConfig = getRiskConfig(analysis.riskLevel);
  const RiskIcon = riskConfig.icon;

  const handleDownloadPDF = () => {
    generatePDFReport(analysis);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      // Get Firebase ID token
      const idToken = await user.getIdToken();
      
      // Use apiRequest with custom Authorization header
      const response = await apiRequest(
        'DELETE',
        `/api/analyses/${analysis.id}`,
        undefined,
        { 'Authorization': `Bearer ${idToken}` }
      );
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/user', user?.uid, 'data'] });
      
      toast({
        title: "Record deleted",
        description: "The analysis record has been successfully removed.",
      });
      
      // Close the modal
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message || "Failed to delete the record. Please try again.",
      });
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };
  
  // Process lab data for charts from labValueBreakdown
  const { radarData, barData } = processLabDataForCharts(
    (analysis.comprehensiveAnalysis?.labValueBreakdown as any) || []
  );

  // Calculate stroke dasharray for circular progress (circumference = 2πr)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (analysis.riskScore / 100) * circumference;

  // Detect if user is on mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Save location to database
  const saveLocationToDatabase = async (location: {lat: number; lng: number}, accuracy: number) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/user/${user.uid}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          accuracy: accuracy,
        }),
      });
      
      if (response.ok) {
        console.log('[Hospital Recommendation] Location saved to database');
      }
    } catch (error) {
      console.error('[Hospital Recommendation] Failed to save location:', error);
    }
  };

  // Fetch saved location from database
  const fetchSavedLocation = async (): Promise<{lat: number; lng: number} | null> => {
    if (!user || !user.uid) return null;
    
    try {
      const response = await fetch(`/api/user/${user.uid}/location`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('[Hospital Recommendation] Location API returned non-JSON response');
        return null;
      }
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.success && data.data && data.data.locationEnabled) {
        console.log('[Hospital Recommendation] Found saved location in database:', data.data);
        return {
          lat: data.data.latitude,
          lng: data.data.longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('[Hospital Recommendation] Failed to fetch saved location:', error);
      return null;
    }
  };

  // Request user location
  const requestLocation = (saveToDb: boolean = false) => {
    if (!navigator.geolocation) {
      console.warn('[Hospital Recommendation] Geolocation not supported');
      setLocationStatus('unavailable');
      return;
    }

    console.log('[Hospital Recommendation] Requesting geolocation in background...');
    setLocationStatus('detecting');
    
    // Short timeout - we'll show defaults quickly
    const timeoutId = setTimeout(() => {
      console.warn('[Hospital Recommendation] Geolocation timeout - using default location');
      setLocationStatus('unavailable');
      navigator.geolocation.clearWatch(watchId);
    }, 8000); // 8 second timeout - much faster
    
    // Use watchPosition for better accuracy over time
    let bestAccuracy = Infinity;
    let updateCount = 0;
    const MAX_UPDATES = 3;
    const MIN_ACCURACY = 100; // 100 meters
    
    let watchId = 0;
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateCount++;
        const accuracy = position.coords.accuracy;
        
        console.log(`[Hospital Recommendation] GPS Update #${updateCount} - Accuracy: ${accuracy.toFixed(0)}m`);
        
        // Only update if this reading is more accurate
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('[Hospital Recommendation] Improved location found:', location, `Accuracy: ±${accuracy.toFixed(0)}m`);
          setUserLocation(location);
          setLocationStatus('found');
          fetchNearbyHospital(location); // Update hospitals with actual location
          
          // Save to database if requested (user manually enabled location)
          if (saveToDb) {
            saveLocationToDatabase(location, accuracy);
          }
        }
        
        // Stop watching if we get good accuracy or max updates
        if (accuracy < MIN_ACCURACY || updateCount >= MAX_UPDATES) {
          clearTimeout(timeoutId);
          navigator.geolocation.clearWatch(watchId);
          console.log(`[Hospital Recommendation] GPS lock complete. Final accuracy: ±${accuracy.toFixed(0)}m`);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.warn('[Hospital Recommendation] Geolocation error:', error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else {
          setLocationStatus('unavailable');
        }
      },
      {
        enableHighAccuracy: false, // Don't force GPS - use faster methods
        timeout: 8000, // 8 seconds max
        maximumAge: 0 // Never use cached position
      }
    );
  };

  // Fetch nearby hospitals when modal opens
  useEffect(() => {
    if (open) {
      // Reset state on each open
      setRecommendedHospital(null);
      setUserLocation(null);
      setManualLocationRequested(false);
      
      // IMMEDIATELY load default hospitals (no waiting)
      fetchNearbyHospital(null);
      
      // First, try to load saved location from database
      const initializeLocation = async () => {
        const savedLocation = await fetchSavedLocation();
        
        if (savedLocation) {
          // Use saved location from database
          console.log('[Hospital Recommendation] Using saved location from database');
          setUserLocation(savedLocation);
          setLocationStatus('found');
          fetchNearbyHospital(savedLocation);
        } else {
          // No saved location - show prompt on mobile, try geolocation on desktop
          if (isMobile) {
            setLocationStatus('prompt');
          } else {
            // Desktop: try automatic location in background (non-blocking)
            requestLocation(false);
          }
        }
      };
      
      initializeLocation();
    } else {
      // Clear state when modal closes
      setRecommendedHospital(null);
      setUserLocation(null);
      setLocationStatus('detecting');
      setManualLocationRequested(false);
    }
  }, [open, analysis.suggestedSpecialists, user]);

  const handleManualLocationRequest = () => {
    setManualLocationRequested(true);
    // Save to database when user manually enables location
    requestLocation(true);
  };

  const fetchNearbyHospital = async (location: {lat: number; lng: number} | null) => {
    try {
      const url = location 
        ? `/api/hospitals/nearby?lat=${location.lat}&lng=${location.lng}`
        : '/api/hospitals/nearby';
      
      console.log('[Hospital Recommendation] Fetching hospitals with URL:', url);
      console.log('[Hospital Recommendation] Location object:', location);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch hospitals');
      
      const hospitals: Hospital[] = await response.json();
      console.log('[Hospital Recommendation] Received hospitals:', hospitals.length, 'hospitals');
      
      // Ensure we have hospitals
      if (!hospitals || hospitals.length === 0) {
        console.warn('No hospitals returned from API');
        setRecommendedHospital(null);
        return;
      }
      
      // If we have suggested specialists, try to match with hospital specialties
      if (analysis.suggestedSpecialists.length > 0) {
        const specialistTypes = analysis.suggestedSpecialists.map(s => s.type.toLowerCase());
        
        // Find hospital that matches suggested specialists
        const matchedHospital = hospitals.find(hospital => 
          hospital.specialties.some(specialty => 
            specialistTypes.some(type => 
              specialty.toLowerCase().includes(type) || 
              type.includes(specialty.toLowerCase())
            )
          )
        );
        
        // Use matched hospital or first hospital
        setRecommendedHospital(matchedHospital || hospitals[0]);
      } else {
        // No specialist suggestions, use nearest hospital
        setRecommendedHospital(hospitals[0]);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      // Set to null to prevent showing stale data
      setRecommendedHospital(null);
    }
  };

  // Determine icon and label for lab status badges
  const renderStatusForLab = (lab: any) => {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    if (lab.status === 'normal') return { Icon: CheckCircle2, label: capitalize(lab.status) };
    if (lab.status === 'borderline') return { Icon: AlertCircle, label: capitalize(lab.status) };

    // abnormal: decide if value is below or above the normal range
    const valueNum = typeof lab.value === 'number' ? lab.value : parseFloat(String(lab.value));
    let Icon = ArrowUp;
    let label = 'Elevate';

    const match = String(lab.normalRange).match(/(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)/);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(valueNum)) {
        if (valueNum < min) {
          Icon = ArrowDown;
          label = 'Decreased';
        } else if (valueNum > max) {
          Icon = ArrowUp;
          label = 'Elevate';
        }
      }
    }

    return { Icon, label };
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const getDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent hideClose className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden" data-testid="modal-analysis-result">
        <DialogHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${riskConfig.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="truncate">Analysis Complete</span>
              </DialogTitle>
              <DialogDescription className="mt-1 sm:mt-2 text-xs sm:text-base line-clamp-2">
                Your lab results have been analyzed using our AI-powered health assessment system.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex-shrink-0"
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* Risk Score Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              {/* Circular Risk Score Visualization */}
              <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center px-3 sm:px-6 pb-3 sm:pb-6">
                  {/* Circular Progress */}
                  <div className="relative h-32 w-32 sm:h-48 sm:w-48">
                    <svg className="transform -rotate-90 h-32 w-32 sm:h-48 sm:w-48">
                      <defs>
                        <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={riskConfig.strokeColor} />
                          <stop offset="100%" stopColor={riskConfig.strokeColorEnd} />
                        </linearGradient>
                      </defs>
                      {/* Background circle */}
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted/20 sm:hidden"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted/20 hidden sm:block"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="url(#riskGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 - (analysis.riskScore / 100) * 2 * Math.PI * 50}
                        className="transition-all duration-1000 ease-out sm:hidden"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        stroke="url(#riskGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out hidden sm:block"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl sm:text-4xl font-bold ${riskConfig.color}`} data-testid="text-risk-score">
                        {analysis.riskScore}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground">Risk Score</span>
                    </div>
                  </div>

                  {/* Risk Level Badge */}
                  <div className="mt-3 sm:mt-6 flex items-center gap-2">
                    <Badge
                      className={`${riskConfig.bgColor} ${riskConfig.color} ${riskConfig.borderColor} border px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold`}
                      data-testid="badge-risk-level"
                    >
                      <RiskIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      {riskConfig.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Medical Analysis */}
              <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="truncate">Comprehensive Medical Analysis</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Detailed interpretation of your lab results</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line" data-testid="text-detailed-findings">
                    {analysis.comprehensiveAnalysis?.detailedFindings || analysis.findings}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Complete Lab Value Breakdown */}
            {analysis.comprehensiveAnalysis?.labValueBreakdown && analysis.comprehensiveAnalysis.labValueBreakdown.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                  <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Complete Lab Value Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Detailed analysis of each parameter</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="space-y-3 sm:space-y-4">
                      {analysis.comprehensiveAnalysis.labValueBreakdown.map((lab, index) => {
                        const { Icon: StatusIcon, label: statusLabel } = renderStatusForLab(lab);

                        return (
                        <div
                          key={index}
                          className="p-3 sm:p-4 rounded-lg border border-border/50 bg-gradient-to-br from-background/50 to-background/30 hover-elevate"
                          data-testid={`lab-value-${index}`}
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-xs sm:text-sm text-foreground">{lab.parameter}</h4>
                                <Badge
                                  className={`text-xs ${
                                    lab.status === 'normal'
                                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                      : lab.status === 'borderline'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                  }`}
                                  data-testid={`badge-status-${index}`}
                                >
                                  {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                  {statusLabel}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground mb-2 flex-wrap">
                                <span className="font-medium">Value: <span className="text-foreground">{lab.value}</span></span>
                                <span className="text-xs">Normal: {lab.parameter && lab.parameter.toLowerCase() === 'ph' ? '7' : lab.normalRange}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{lab.interpretation}</p>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analytics Charts Section */}
            {(radarData.length > 0 || barData.length > 0) && (
              <>
                <Separator className="my-3 sm:my-6" />
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-xl font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Lab Value Analytics
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                    {/* Radar Chart - Lab Value Breakdown */}
                    {radarData.length > 0 && (
                      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Lab Value Breakdown
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm">Your lab values relative to normal ranges</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center px-2 sm:px-6 pb-3 sm:pb-6">
                          <ResponsiveContainer width="100%" height={250}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <Radar
                                name="Lab Values"
                                dataKey="value"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.5}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Bar Chart - Factor Contributions */}
                    {barData.length > 0 && (
                      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Risk Factor Contributions
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm">Factors contributing to your overall risk</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center px-2 sm:px-6 pb-3 sm:pb-6">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              />
                              <YAxis
                                label={{ value: 'Risk Impact', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                              />
                              <Bar dataKey="contribution" radius={[8, 8, 0, 0]}>
                                {barData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-3 sm:my-6" />

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              {/* Lifestyle Recommendations */}
              {(analysis.comprehensiveAnalysis?.lifestyleRecommendations || analysis.lifestyleRecommendations.length > 0) && (
                <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                  <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <span className="truncate">Lifestyle Recommendations</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Personalized activities and habits based on your results</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="space-y-3 sm:space-y-4" data-testid="list-lifestyle-recommendations">
                      {analysis.comprehensiveAnalysis?.lifestyleRecommendations ? (
                        analysis.comprehensiveAnalysis.lifestyleRecommendations.map((rec, index) => (
                          <div
                            key={index}
                            className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/10"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <h4 className="font-semibold text-xs sm:text-sm text-foreground">{rec.category}</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground/90 mb-1.5 sm:mb-2">{rec.recommendation}</p>
                            <p className="text-xs text-muted-foreground italic border-l-2 border-blue-500/30 pl-2 sm:pl-3">
                              Why: {rec.rationale}
                            </p>
                          </div>
                        ))
                      ) : (
                        <ul className="space-y-2 sm:space-y-3">
                          {analysis.lifestyleRecommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                              <span className="text-foreground/90">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dietary Recommendations */}
              {(analysis.comprehensiveAnalysis?.dietaryRecommendations || analysis.dietaryRecommendations.length > 0) && (
                <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                  <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                        <Utensils className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <span className="truncate">Dietary Recommendations</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Nutrition guidance tailored to your lab results</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="space-y-3 sm:space-y-4" data-testid="list-dietary-recommendations">
                      {analysis.comprehensiveAnalysis?.dietaryRecommendations ? (
                        analysis.comprehensiveAnalysis.dietaryRecommendations.map((rec, index) => (
                          <div
                            key={index}
                            className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-green-500/5 to-green-600/5 border border-green-500/10"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              <Utensils className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <h4 className="font-semibold text-xs sm:text-sm text-foreground">{rec.category}</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground/90 mb-1.5 sm:mb-2">{rec.recommendation}</p>
                            <p className="text-xs text-muted-foreground italic border-l-2 border-green-500/30 pl-2 sm:pl-3">
                              Why: {rec.rationale}
                            </p>
                          </div>
                        ))
                      ) : (
                        <ul className="space-y-2 sm:space-y-3">
                          {analysis.dietaryRecommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                              <span className="text-foreground/90">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Suggested Specialists */}
            {(() => {
              // Get specialists from multiple sources
              let specialists: Specialist[] = [];
              
              // First try comprehensiveAnalysis
              if (Array.isArray(analysis.comprehensiveAnalysis?.suggestedSpecialists)) {
                specialists = analysis.comprehensiveAnalysis.suggestedSpecialists as Specialist[];
              } 
              // Then try direct suggestedSpecialists (from rules-based analysis)
              else if (Array.isArray(analysis.suggestedSpecialists)) {
                const specs = analysis.suggestedSpecialists as any[];
                // Handle both string and object formats
                specialists = specs.map(spec => 
                  typeof spec === 'string' 
                    ? { type: spec, reason: 'Consultation recommended based on your lab results', urgency: 'routine' as const }
                    : { 
                        type: spec.type || 'Specialist',
                        reason: spec.reason || 'Consultation recommended based on your lab results',
                        urgency: spec.urgency || 'routine' as const
                      }
                );
              }
              
              if (specialists.length === 0) return null;
              
              return (
                <Card className="backdrop-blur-sm bg-card/50 border-border/50">
                  <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <span className="truncate">Recommended Specialists</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Healthcare professionals to consult based on your results</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="grid grid-cols-1 gap-2 sm:gap-3" data-testid="list-specialists">
                      {specialists.map((specialist, index) => {
                        const urgency = specialist.urgency;
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/30 border border-border/30 hover-elevate"
                          >
                            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-xs sm:text-sm text-foreground">{specialist.type}</h4>
                                {urgency && (
                                  <Badge
                                    className={
                                      urgency === 'urgent'
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                        : urgency === 'soon'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                    }
                                  >
                                    {urgency === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                    {urgency === 'soon' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {urgency === 'routine' && <Info className="h-3 w-3 mr-1" />}
                                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{specialist.reason}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Recommended Hospital */}
            {recommendedHospital && (
              <>
                <Separator className="my-3 sm:my-6" />
                
                {/* Location Prompt for Mobile */}
                {locationStatus === 'prompt' && !manualLocationRequested && (
                  <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 mb-3 sm:mb-4">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm mb-1">Find Hospitals Near You</h4>
                          <p className="text-xs text-muted-foreground mb-2 sm:mb-3">
                            Allow location access to find the nearest hospitals based on your current location
                          </p>
                          <Button
                            onClick={handleManualLocationRequest}
                            className="w-full text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                            data-testid="button-enable-location"
                          >
                            <MapPin className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Enable Location Services
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="backdrop-blur-sm bg-card/50 border-border/50 overflow-hidden" data-testid="card-recommended-hospital">
                  <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          </div>
                          <span className="truncate">Best Hospital</span>
                        </CardTitle>
                        <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                          {locationStatus === 'found' && 'Based on your current location and analysis'}
                          {locationStatus === 'prompt' && 'Enable location for personalized hospital recommendations'}
                          {locationStatus === 'denied' && 'Based on default location (location access denied)'}
                          {locationStatus === 'unavailable' && 'Based on default location (location unavailable)'}
                          {locationStatus === 'detecting' && 'Detecting your location...'}
                        </CardDescription>
                      </div>
                      {locationStatus === 'found' && (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 shrink-0">
                          GPS
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                    {/* Hospital Info */}
                    <div className="rounded-lg bg-gradient-to-br from-primary-500/5 to-primary-600/5 dark:from-primary-500/10 dark:to-primary-600/10 p-3 sm:p-4 border border-primary-500/20">
                      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-foreground" data-testid="text-hospital-name">
                              {recommendedHospital.name}
                            </h3>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ml-2">
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                                Best Option
                              </Badge>

                              {recommendedHospital.isOpen24Hours && (
                                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  24/7
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                            <span data-testid="text-hospital-address">{recommendedHospital.address}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                            <div className="flex items-center gap-1 text-primary">
                              <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span className="font-semibold" data-testid="text-hospital-distance">
                                {recommendedHospital.distance.toFixed(1)} miles away
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                              <span className="font-semibold" data-testid="text-hospital-rating">
                                {recommendedHospital.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        {recommendedHospital.specialties.map((specialty, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="text-xs bg-background/50 hover:bg-background/70"
                            data-testid={`badge-specialty-${index}`}
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button
                          onClick={() => handleCall(recommendedHospital.phoneNumber)}
                          className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600"
                          data-testid="button-call-hospital"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Call {recommendedHospital.phoneNumber}
                        </Button>
                        <Button
                          onClick={() => getDirections(recommendedHospital.name + ', ' + recommendedHospital.address)}
                          variant="outline"
                          className="flex-1"
                          data-testid="button-directions"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Get Directions
                        </Button>
                      </div>
                    </div>
                    
                    {/* Map with Directions */}
                    <div className="rounded-lg overflow-hidden border border-border/50 bg-muted/20">
                      <iframe
                        width="100%"
                        height="350"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={
                          userLocation 
                            ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation.lat},${userLocation.lng}&destination=${encodeURIComponent(recommendedHospital.name + ', ' + recommendedHospital.address)}&mode=driving`
                            : `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(recommendedHospital.name + ', ' + recommendedHospital.address)}&zoom=15`
                        }
                        title="Hospital Location Map with Directions"
                        data-testid="iframe-hospital-map"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Medical Disclaimer */}
            <div className="p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-xs sm:text-sm text-foreground/80">
                  <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Medical Disclaimer</p>
                  <p className="text-xs leading-relaxed">
                    This analysis is powered by AI and should not replace professional medical advice. 
                    Always consult with qualified healthcare providers for diagnosis and treatment decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-border/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 bg-muted/20 flex-shrink-0">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" data-testid="button-close">
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-delete-record"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Record'}
            </Button>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20"
              data-testid="button-download-pdf"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={() => {
                // Invalidate dashboard query cache to fetch fresh data
                queryClient.invalidateQueries({ queryKey: ['/api/user', user?.uid, 'data'] });
                onViewDashboard();
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md"
              data-testid="button-view-dashboard"
            >
              <Activity className="mr-2 h-4 w-4" />
              View Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent data-testid="alert-delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Analysis Record?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this health analysis and its associated lab result. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
