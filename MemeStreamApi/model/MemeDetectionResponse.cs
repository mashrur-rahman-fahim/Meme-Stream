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
    }
}
