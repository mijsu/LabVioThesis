import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Apple, 
  Dumbbell, 
  Moon, 
  Heart, 
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: "nutrition" | "exercise" | "sleep" | "mental-health" | "prevention";
  icon: typeof Apple;
}

const healthTips: HealthTip[] = [
  {
    id: "1",
    title: "Stay Hydrated",
    content: "Drink at least 8 glasses of water daily. Proper hydration supports kidney function, helps regulate body temperature, and aids in nutrient transportation throughout your body.",
    category: "nutrition",
    icon: Apple,
  },
  {
    id: "2",
    title: "Regular Exercise",
    content: "Aim for 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week. Regular exercise strengthens your cardiovascular system and boosts immunity.",
    category: "exercise",
    icon: Dumbbell,
  },
  {
    id: "3",
    title: "Quality Sleep",
    content: "Get 7-9 hours of sleep each night. Quality sleep is essential for cellular repair, memory consolidation, and maintaining a healthy immune system.",
    category: "sleep",
    icon: Moon,
  },
  {
    id: "4",
    title: "Stress Management",
    content: "Practice mindfulness, meditation, or deep breathing exercises. Managing stress effectively reduces cortisol levels and improves overall health outcomes.",
    category: "mental-health",
    icon: Heart,
  },
  {
    id: "5",
    title: "Regular Check-ups",
    content: "Schedule annual health screenings and follow up on lab results. Early detection of health issues significantly improves treatment outcomes.",
    category: "prevention",
    icon: Shield,
  },
  {
    id: "6",
    title: "Balanced Diet",
    content: "Include a variety of fruits, vegetables, whole grains, and lean proteins. A balanced diet provides essential nutrients for optimal body function.",
    category: "nutrition",
    icon: Apple,
  },
  {
    id: "7",
    title: "Strength Training",
    content: "Incorporate resistance training 2-3 times per week. Building muscle mass improves metabolism, bone density, and overall functional fitness.",
    category: "exercise",
    icon: Dumbbell,
  },
  {
    id: "8",
    title: "Consistent Sleep Schedule",
    content: "Go to bed and wake up at the same time daily. A consistent sleep schedule helps regulate your circadian rhythm for better sleep quality.",
    category: "sleep",
    icon: Moon,
  },
];

const categories = [
  { value: "all", label: "All Tips", icon: Sparkles },
  { value: "nutrition", label: "Nutrition", icon: Apple },
  { value: "exercise", label: "Exercise", icon: Dumbbell },
  { value: "sleep", label: "Sleep", icon: Moon },
  { value: "mental-health", label: "Mental Health", icon: Heart },
  { value: "prevention", label: "Prevention", icon: Shield },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "nutrition":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "exercise":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "sleep":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    case "mental-health":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20";
    case "prevention":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  }
};

const getCategoryGradient = (category: string) => {
  switch (category) {
    case "nutrition":
      return "from-green-500 to-green-600";
    case "exercise":
      return "from-blue-500 to-blue-600";
    case "sleep":
      return "from-purple-500 to-purple-600";
    case "mental-health":
      return "from-pink-500 to-pink-600";
    case "prevention":
      return "from-amber-500 to-amber-600";
    default:
      return "from-primary-500 to-primary-600";
  }
};

export default function HealthTipsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const filteredTips = selectedCategory === "all"
    ? healthTips
    : healthTips.filter(tip => tip.category === selectedCategory);

  const currentTip = filteredTips[currentTipIndex];

  const handlePrevious = () => {
    setCurrentTipIndex((prev) => (prev === 0 ? filteredTips.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentTipIndex((prev) => (prev === filteredTips.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary-50/10 dark:to-primary-950/5">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Health Tips
          </h1>
          <p className="text-lg text-muted-foreground">
            Evidence-based advice to improve your wellbeing
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <Badge
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              className={`cursor-pointer hover-elevate active-elevate-2 px-4 py-2 text-sm border ${
                selectedCategory === category.value 
                  ? "bg-gradient-to-r from-primary-600 to-primary-500 shadow-md" 
                  : "border-border/50 bg-card/50"
              }`}
              onClick={() => {
                setSelectedCategory(category.value);
                setCurrentTipIndex(0);
              }}
              data-testid={`filter-${category.value}`}
            >
              <category.icon className="mr-2 h-4 w-4" />
              {category.label}
            </Badge>
          ))}
        </div>

        {/* Featured Tip Carousel */}
        {currentTip && (
          <Card className="overflow-hidden backdrop-blur-sm bg-card/50 border-border/50">
            <div className={`bg-gradient-to-r ${getCategoryGradient(currentTip.category)} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <Badge className={`${getCategoryColor(currentTip.category)} border bg-white/90`} data-testid={`badge-${currentTip.category}`}>
                  <currentTip.icon className="mr-1 h-3 w-3" />
                  {currentTip.category.replace("-", " ").toUpperCase()}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    data-testid="button-previous-tip"
                    className="text-white hover:bg-white/20 no-default-hover-elevate"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    data-testid="button-next-tip"
                    className="text-white hover:bg-white/20 no-default-hover-elevate"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold" data-testid="text-tip-title">
                {currentTip.title}
              </CardTitle>
            </div>
            <CardContent className="p-6">
              <p className="text-lg leading-relaxed mb-6" data-testid="text-tip-content">
                {currentTip.content}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Tip {currentTipIndex + 1} of {filteredTips.length}
                </p>
                <div className="flex gap-1.5">
                  {filteredTips.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentTipIndex ? "w-8 bg-primary" : "w-2 bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Tips Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Browse All Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTips.map((tip, index) => (
              <Card
                key={tip.id}
                className={`hover-elevate cursor-pointer backdrop-blur-sm bg-card/50 border-border/50 transition-all ${
                  index === currentTipIndex ? "ring-2 ring-primary shadow-lg shadow-primary-500/20" : ""
                }`}
                onClick={() => setCurrentTipIndex(index)}
                data-testid={`card-tip-${tip.id}`}
              >
                <CardHeader>
                  <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${getCategoryGradient(tip.category)} shadow-md`}>
                    <tip.icon className="h-7 w-7 text-white" />
                  </div>
                  <Badge className={`${getCategoryColor(tip.category)} border w-fit`}>
                    {tip.category.replace("-", " ")}
                  </Badge>
                  <CardTitle className="text-lg mt-2">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                    {tip.content}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredTips.length === 0 && (
          <Card className="text-center py-16 px-6 backdrop-blur-sm bg-card/50 border-border/50 border-dashed">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
              <Shield className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Tips Found</h3>
            <p className="text-muted-foreground mb-8">
              Try selecting a different category
            </p>
            <Button
              variant="outline"
              onClick={() => setSelectedCategory("all")}
            >
              Show All Tips
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
