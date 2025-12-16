import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, Shield, FileCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { uploadLabResult, LabValidationError } from "@/lib/api";
import AnalysisResultModal from "@/components/AnalysisResultModal";
import { AnalyzingLoaderModal } from "@/components/AnalyzingLoaderModal";
import { type HealthAnalysis, type ValidationError } from "@shared/schema";

type LabType = "cbc" | "urinalysis" | "lipid";

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [labType, setLabType] = useState<LabType>("cbc");
  const [consentGiven, setConsentGiven] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysis | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showAnalyzingModal, setShowAnalyzingModal] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary-50/20 dark:to-primary-950/10">
        <Card className="max-w-md backdrop-blur-sm bg-card/95 border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30">
              <Upload className="h-10 w-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Sign In Required</CardTitle>
              <CardDescription className="mt-2">
                Please sign in to upload and analyze your lab results
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/signin">
              <Button size="lg" className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md" data-testid="button-sign-in-upload">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 10MB",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image file",
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadSuccess(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile || !consentGiven || !user) return;

    setUploading(true);
    setShowAnalyzingModal(true);
    try {
      const result = await uploadLabResult(selectedFile, labType, user.uid);

      setUploadSuccess(true);

      // Construct full HealthAnalysis object from API response
      const fullAnalysis: HealthAnalysis = {
        id: result.data.analysisId,
        labResultId: result.data.labResultId,
        userId: user.uid,
        analyzedAt: new Date(result.data.uploadedAt),
        riskLevel: result.data.analysis.riskLevel,
        riskScore: result.data.analysis.riskScore,
        findings: result.data.analysis.findings,
        healthInsights: result.data.analysis.healthInsights,
        lifestyleRecommendations: result.data.analysis.lifestyleRecommendations,
        dietaryRecommendations: result.data.analysis.dietaryRecommendations,
        suggestedSpecialists: result.data.analysis.suggestedSpecialists,
        comprehensiveAnalysis: result.data.analysis.comprehensiveAnalysis,
        extractedData: {
          rawText: result.data.ocrResult.text,
          parsedValues: result.data.ocrResult.parsedValues,
        },
      };

      // Hide analyzing modal and show result modal
      setShowAnalyzingModal(false);
      setAnalysisResult(fullAnalysis);
      setShowResultModal(true);

      toast({
        title: "Analysis complete!",
        description: `Your lab results have been analyzed successfully.`,
      });
    } catch (error: any) {
      setShowAnalyzingModal(false);

      // Check if this is a validation error
      if (error instanceof LabValidationError) {
        setValidationError({
          code: error.code as 'INVALID_LAB_IMAGE' | 'MISMATCHED_LAB_TYPE',
          message: error.message,
          details: error.details,
        });
        setShowValidationErrorModal(true);
      } else {
        // Generic error toast for non-validation errors
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: error.message,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleViewDashboard = () => {
    setShowResultModal(false);
    setLocation("/dashboard");
  };

  const handleCloseModal = () => {
    setShowResultModal(false);
    // Reset form
    setSelectedFile(null);
    setPreviewUrl(null);
    setConsentGiven(false);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary-50/10 dark:to-primary-950/5">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Upload Lab Results
          </h1>
          <p className="text-muted-foreground">
            Upload your medical test results for instant AI-powered analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lab Type Selection */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Test Type
                </CardTitle>
                <CardDescription>Select the type of lab test you're uploading</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={labType} onValueChange={(value) => setLabType(value as LabType)}>
                  <SelectTrigger className="w-full" data-testid="select-lab-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cbc">Complete Blood Count (CBC)</SelectItem>
                    <SelectItem value="urinalysis">Urinalysis</SelectItem>
                    <SelectItem value="lipid">Lipid Profile</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Upload Zone */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Document
                </CardTitle>
                <CardDescription>Drag and drop or click to select your lab result image</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-2xl p-12 text-center cursor-pointer transition-all hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
                    data-testid="dropzone"
                  >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Drop your file here</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, PNG • Max size: 10MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File Preview */}
                    <div className="relative rounded-2xl overflow-visible border-2 border-border bg-muted/30">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-64 object-contain"
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-11 w-11 rounded-full shadow-xl z-50 ring-2 ring-white/90 dark:ring-black/80 border border-white/30 hover:scale-125 transition-transform"
                        onClick={removeFile}
                        data-testid="button-remove-file"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                    </div>

                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      {uploadSuccess && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                  data-testid="input-file"
                />
              </CardContent>
            </Card>

            {/* Privacy Consent */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Privacy & Consent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                    data-testid="checkbox-consent"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="consent" className="text-sm font-medium cursor-pointer">
                      I agree to the privacy policy and terms of use
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Your data is encrypted and secure. View our{" "}
                      <button
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-primary hover:underline"
                        data-testid="link-privacy-policy"
                      >
                        privacy policy
                      </button>
                      .
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md disabled:opacity-50"
                  disabled={!selectedFile || !consentGiven || uploading}
                  onClick={handleUpload}
                  data-testid="button-analyze"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : uploadSuccess ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Analysis Complete!
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* How It Works */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary font-semibold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm">Select Test Type</p>
                    <p className="text-xs text-muted-foreground mt-1">Choose your lab test category</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary font-semibold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm">Upload Image</p>
                    <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to upload</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary font-semibold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm">Get AI Analysis</p>
                    <p className="text-xs text-muted-foreground mt-1">Receive instant health insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50 border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Secure & Private
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <p>End-to-end encryption</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <p>HIPAA compliant storage</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <p>Delete data anytime</p>
                </div>
              </CardContent>
            </Card>

            {/* Need Help */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/tips">
                  <Button variant="outline" className="w-full justify-start" data-testid="link-health-tips">
                    <FileText className="mr-2 h-4 w-4" />
                    View Health Tips
                  </Button>
                </Link>
                {/* Removed AI Assistant link */}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy Policy
            </DialogTitle>
            <DialogDescription>
              Your privacy and data security are our top priorities
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">Data Collection</h3>
              <p className="text-muted-foreground">
                We collect only the information necessary to provide our services: your uploaded lab results,
                basic account information (email), and analysis history. We do not sell or share your personal
                health information with third parties.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Data Security</h3>
              <p className="text-muted-foreground">
                All data is encrypted in transit and at rest. We use industry-standard security measures
                including TLS encryption, secure authentication, and regular security audits to protect your
                information.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Data Usage</h3>
              <p className="text-muted-foreground">
                Your lab results are analyzed using AI to provide health insights. The analysis is performed
                securely and your data is never used to train public AI models without explicit consent.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Your Rights</h3>
              <p className="text-muted-foreground">
                You have the right to access, modify, or delete your data at any time. You can export your
                data or request complete deletion from your account settings.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Medical Disclaimer</h3>
              <p className="text-muted-foreground">
                This service provides AI-generated insights for informational purposes only. It does not
                constitute medical advice, diagnosis, or treatment. Always consult with qualified healthcare
                professionals for medical decisions.
              </p>
            </section>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPrivacyModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analyzing Loader Modal */}
      <AnalyzingLoaderModal open={showAnalyzingModal} />

      {/* Validation Error Modal */}
      {validationError && (
        <Dialog 
          open={showValidationErrorModal} 
          onOpenChange={(open) => {
            setShowValidationErrorModal(open);
            if (!open) {
              setValidationError(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Image Validation Failed
              </DialogTitle>
              <DialogDescription>
                {validationError.message}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Lab Type Info */}
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border border-border">
                <FileCheck className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Selected Test Type</p>
                  <p className="text-sm text-muted-foreground">{validationError.details.selectedLabType}</p>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Confidence Level</Label>
                  <span className={`text-sm font-semibold ${
                    validationError.details.confidenceTier === 'low' ? 'text-destructive' :
                    validationError.details.confidenceTier === 'medium' ? 'text-yellow-600 dark:text-yellow-500' :
                    'text-green-600 dark:text-green-500'
                  }`}>
                    {Math.max(0, Math.min(100, validationError.details.confidence))}% ({validationError.details.confidenceTier})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      validationError.details.confidenceTier === 'low' ? 'bg-destructive' :
                      validationError.details.confidenceTier === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, validationError.details.confidence))}%` }}
                  />
                </div>
              </div>

              {/* Reasons */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Why did this fail?</Label>
                <div className="space-y-2">
                  {validationError.details.reasons.map((reason, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">What can you do?</Label>
                <div className="space-y-2">
                  {validationError.details.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowValidationErrorModal(false)}
                data-testid="button-close-validation-error"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setShowValidationErrorModal(false);
                  setValidationError(null);
                  removeFile();
                }}
                data-testid="button-try-different-image"
              >
                Try Different Image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Analysis Result Modal */}
      {analysisResult && (
        <AnalysisResultModal
          open={showResultModal}
          onClose={handleCloseModal}
          analysis={analysisResult}
          onViewDashboard={handleViewDashboard}
        />
      )}
    </div>
  );
}