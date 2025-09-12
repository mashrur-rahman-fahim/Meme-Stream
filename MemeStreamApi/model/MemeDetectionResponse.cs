namespace MemeStreamApi.model
{
    public class MemeDetectionResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public MemeAnalysisResult? Result { get; set; }
        public string? Error { get; set; }
    }

    public class MemeAnalysisResult
    {
        public bool IsMeme { get; set; }
        public double MemeProbability { get; set; }
        public string DetectedLanguage { get; set; } = string.Empty;
        public double HumorScore { get; set; }
        public string Sentiment { get; set; } = string.Empty;
        public List<string> MemeReferences { get; set; } = new();
        public List<string> CulturalContexts { get; set; } = new();
        public List<string> Keywords { get; set; } = new();
        public string Analysis { get; set; } = string.Empty;
        public Dictionary<string, object> Metadata { get; set; } = new();
        
        // Image analysis results
        public ImageAnalysisResult? ImageAnalysis { get; set; }
        
        // Combined analysis confidence
        public double CombinedConfidence { get; set; }
        public string DetectionMode { get; set; } = "text"; // "text", "image", "combined"
    }

    public class ImageAnalysisResult
    {
        public bool ContainsMemeElements { get; set; }
        public double VisualHumorScore { get; set; }
        public List<string> DetectedObjects { get; set; } = new();
        public List<string> DetectedText { get; set; } = new(); // OCR results
        public List<string> VisualMemeTypes { get; set; } = new(); // "reaction_face", "macro", "template", etc.
        public string ImageDescription { get; set; } = string.Empty;
        public double TextImageAlignment { get; set; } // How well text matches image content
    }
}
