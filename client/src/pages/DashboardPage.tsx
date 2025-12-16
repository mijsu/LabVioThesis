import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  TrendingUp, 
  FileText, 
  AlertCircle, 
  Calendar,
  Download,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Heart,
  Droplet,
  Zap,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AnalysisResultModal from "@/components/AnalysisResultModal";

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "low":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "moderate":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "high":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch user's lab results and analyses
  const { data: userData, isLoading } = useQuery<any>({
    queryKey: ['/api/user', user?.uid, 'data'],
    enabled: !!user?.uid,
  });

  const labResults = userData?.data?.labResults || [];
  const analyses = userData?.data?.analyses || [];

  // Calculate metrics from real data
  const totalAnalyses = analyses.length;
  const latestAnalysis = analyses.length > 0 ? analyses[0] : null; // First item is most recent (sorted desc)
  const overallRiskLevel = latestAnalysis?.riskLevel || "unknown";
  const totalRecommendations = analyses.reduce((count: number, analysis: any) => {
    return count + (analysis.lifestyleRecommendations?.length || 0) + (analysis.dietaryRecommendations?.length || 0);
  }, 0);

  // Format date helper - handle Firestore Timestamps serialized as objects
  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    // Firestore Timestamp serialized as { _seconds, _nanoseconds }
    if (date._seconds !== undefined) {
      return new Date(date._seconds * 1000);
    }
    // Already a Date object
    if (date instanceof Date) return date;
    // Try parsing as string
    try {
      return new Date(date);
    } catch {
      return null;
    }
  };

  const formatDate = (date: any) => {
    const d = parseDate(date);
    if (!d || isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (date: any) => {
    const d = parseDate(date);
    if (!d || isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDaysAgo = (date: any) => {
    const d = parseDate(date);
    if (!d || isNaN(d.getTime())) return "";
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const handleViewAnalysis = (analysis: any) => {
    setSelectedAnalysis(analysis);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAnalysis(null);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary-50/20 dark:to-primary-950/10">
        <Card className="max-w-md backdrop-blur-sm bg-card/95 border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30">
              <Activity className="h-10 w-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Sign In Required</CardTitle>
              <CardDescription className="mt-2">
                Access your personal health analytics dashboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/signin">
              <Button size="lg" className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md" data-testid="button-sign-in-dashboard">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary-50/10 dark:to-primary-950/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
          <p className="text-muted-foreground">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary-50/10 dark:to-primary-950/5">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Health Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <span className="text-sm">Welcome back,</span>
              <span className="font-medium text-foreground">{user.displayName || user.email?.split('@')[0]}</span>
            </p>
          </div>
          <Link href="/upload">
            <Button size="lg" className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md" data-testid="button-new-upload">
              <FileText className="mr-2 h-5 w-5" />
              New Analysis
            </Button>
          </Link>
        </div>

        {/* Metrics Grid - Premium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Analyses */}
          <Card className="relative overflow-hidden backdrop-blur-sm bg-card/50 border-border/50 hover-elevate transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent" />
            <CardHeader className="relative z-10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Analyses</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/30">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold" data-testid="text-total-analyses">{totalAnalyses}</div>
              {totalAnalyses > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Health analyses completed</p>
              )}
            </CardContent>
          </Card>

          {/* Risk Score */}
          <Card className="relative overflow-hidden backdrop-blur-sm bg-card/50 border-border/50 hover-elevate transition-all duration-200">
            <div className={`absolute inset-0 bg-gradient-to-br ${
              overallRiskLevel === 'low' ? 'from-green-500/5' :
              overallRiskLevel === 'moderate' ? 'from-amber-500/5' :
              overallRiskLevel === 'high' ? 'from-red-500/5' :
              'from-gray-500/5'
            } to-transparent`} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Risk</CardTitle>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${
                  overallRiskLevel === 'low' ? 'from-green-500 to-green-600 shadow-green-500/30' :
                  overallRiskLevel === 'moderate' ? 'from-amber-500 to-amber-600 shadow-amber-500/30' :
                  overallRiskLevel === 'high' ? 'from-red-500 to-red-600 shadow-red-500/30' :
                  'from-gray-500 to-gray-600 shadow-gray-500/30'
                } flex items-center justify-center shadow-md`}>
                  <Heart className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold capitalize ${
                overallRiskLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                overallRiskLevel === 'moderate' ? 'text-amber-600 dark:text-amber-400' :
                overallRiskLevel === 'high' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`} data-testid="text-risk-score">
                {totalAnalyses > 0 ? overallRiskLevel : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {totalAnalyses > 0 ? 'Based on latest analysis' : 'No data yet'}
              </p>
            </CardContent>
          </Card>

          {/* Active Insights */}
          <Card className="relative overflow-hidden backdrop-blur-sm bg-card/50 border-border/50 hover-elevate transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Insights</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Zap className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-recommendations">{totalRecommendations}</div>
              <p className="text-xs text-muted-foreground mt-2">Personalized recommendations</p>
            </CardContent>
          </Card>

          {/* Last Check */}
          <Card className="relative overflow-hidden backdrop-blur-sm bg-card/50 border-border/50 hover-elevate transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Analysis</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-last-check">
                {latestAnalysis ? formatDate(latestAnalysis.analyzedAt) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {latestAnalysis ? getDaysAgo(latestAnalysis.analyzedAt) : 'No analyses yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Health Trends Chart - Only show if user has data */}
        {analyses.length > 0 && (
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Health Summary</CardTitle>
                  <CardDescription className="mt-1">Your recent health analysis overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Latest Risk Score</h4>
                  <div className="text-5xl font-bold text-primary-600 dark:text-primary-400">
                    {latestAnalysis?.riskScore || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Based on your latest lab results</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Total Lab Results</h4>
                  <div className="text-5xl font-bold text-primary-600 dark:text-primary-400">
                    {labResults.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Lab results analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Analyses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent Analyses</h2>
            {analyses.length > 5 && (
              <Badge variant="secondary" className="text-xs px-2 py-1" data-testid="badge-total-analyses">
                {analyses.length} total
              </Badge>
            )}
          </div>

          <div className="max-h-[600px] sm:max-h-[800px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {analyses.length > 0 ? (
              analyses.map((analysis: any) => (
                <Card key={analysis.id} className="backdrop-blur-sm bg-card/50 border-border/50 hover-elevate transition-all duration-200">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg font-semibold">Health Analysis</CardTitle>
                          <Badge className={`${getRiskColor(analysis.riskLevel)} border font-medium`} data-testid={`badge-risk-${analysis.id}`}>
                            {analysis.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          {formatDateFull(analysis.analyzedAt)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Key Findings</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{analysis.findings}</p>
                    </div>
                    {analysis.healthInsights && analysis.healthInsights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Health Insights</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {analysis.healthInsights.slice(0, 2).map((insight: string, idx: number) => (
                            <li key={idx}>• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Risk Score:</span>
                        <span className={`font-bold ${
                          analysis.riskScore < 30 ? 'text-green-600 dark:text-green-400' :
                          analysis.riskScore < 70 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {analysis.riskScore}%
                        </span>
                      </div>
                      <Button 
                        onClick={() => handleViewAnalysis(analysis)}
                        variant="outline"
                        size="sm"
                        className="gap-2 w-full sm:w-auto"
                        data-testid={`button-view-analysis-${analysis.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : null}
          </div>
        </div>

        {/* Empty State (shown when no data) */}
        {analyses.length === 0 && (
          <Card className="text-center py-16 px-6 backdrop-blur-sm bg-card/50 border-border/50 border-dashed">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Analyses Yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Upload your first lab result to start tracking your health journey with AI-powered insights
            </p>
            <Link href="/upload">
              <Button size="lg" className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md" data-testid="button-upload-first">
                <FileText className="mr-2 h-5 w-5" />
                Upload Lab Result
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <AnalysisResultModal
          open={isModalOpen}
          onClose={handleCloseModal}
          analysis={selectedAnalysis}
          onViewDashboard={handleCloseModal}
        />
      )}
    </div>
  );
}
