import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  Brain, 
  TrendingUp, 
  Shield, 
  Activity,
  Smartphone,
  Clock,
  Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: Upload,
    title: "Easy Upload",
    description: "Upload existing lab results (blood tests, urinalysis, lipid profile)",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced machine learning models interpret your lab values and provide instant health insights",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    description: "Monitor health trends over time with interactive charts and historical comparisons",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your medical data is encrypted and secure. Delete your data anytime with one click",
  },
  {
    icon: Activity,
    title: "Personalized Recommendations",
    description: "Get tailored lifestyle and dietary suggestions based on your specific lab results",
  },
  {
    icon: Smartphone,
    title: "Accessible Anywhere",
    description: "Access your health insights on any device with our responsive, mobile-friendly interface",
  },
];

const steps = [
  {
    number: "1",
    title: "Upload a File",
    description: "Take a photo or upload your lab results (blood tests, urinalysis, lipid profile)",
  },
  {
    number: "2",
    title: "AI Analysis",
    description: "Our advanced ML model extracts and interprets your health data instantly",
  },
  {
    number: "3",
    title: "Get Insights",
    description: "Receive personalized health insights, risk scores, and specialist recommendations",
  },
];

const trustIndicators = [
  { icon: Shield, label: "Secure & Private" },
  { icon: Brain, label: "AI-Powered" },
  { icon: Clock, label: "Instant Results" },
  { icon: Star, label: "Trusted by Users" },
];

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();

  // Set default location on page load
  useEffect(() => {
    // Default location: General Santos Ave, Taguig, 1632 Metro Manila, Philippines
    const defaultLocation = {
      lat: 14.5176,
      lng: 121.0509,
      timestamp: Date.now()
    };

    // Check if location is already cached
    const cachedLocation = sessionStorage.getItem('userLocation');
    if (!cachedLocation) {
      // Set default location
      sessionStorage.setItem('userLocation', JSON.stringify(defaultLocation));
    }

    // Optionally try to get actual location (but use default as fallback)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Update with actual location if available
          sessionStorage.setItem('userLocation', JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          }));
        },
        (error) => {
          // Silently handle error - default location already set
          console.log('Using default location (Taguig, Manila):', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />
        
        {/* Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Understand Your Health,
            <br />
            <span className="text-blue-100">Powered by AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-50 mb-8 max-w-2xl mx-auto">
            Upload your lab results and get instant AI-powered health insights, personalized recommendations, and specialist guidance
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {user ? (
              <Link href="/upload">
                <Button size="lg" variant="default" className="text-lg px-8 shadow-xl" data-testid="button-get-started">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Lab Results
                </Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 shadow-xl" data-testid="button-sign-up">
                  Get Started Free
                </Button>
              </Link>
            )}
            <Link href="/tips">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20" data-testid="button-learn-more">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-white/90">
            {trustIndicators.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How LabVio Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get professional-grade health insights in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" style={{ top: '3rem' }} />
            
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <Card className="text-center h-full hover-elevate">
                  <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                      {step.number}
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to take control of your health
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Take Control of Your Health?
          </h2>
            <p className="text-xl mb-8 text-primary-foreground/90">
            Join thousands of users who trust LabVio for their health insights
          </p>
          {user ? (
            <Link href="/upload">
              <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-cta-upload">
                <Upload className="mr-2 h-5 w-5" />
                Upload Your First Lab Result
              </Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-cta-sign-up">
                Get Started for Free
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
