using System.ComponentModel.DataAnnotations;

namespace MemeStreamApi.model
{
    public class MemeDetectionRequest
    {
        public string Text { get; set; } = string.Empty;
        
        public string? ImageUrl { get; set; } // Optional image URL for analysis
        
        public string? Language { get; set; } // Optional, will auto-detect if not provided
        
        public bool IncludeSentiment { get; set; } = true;
        
        public bool IncludeHumorScore { get; set; } = true;
        
        public bool IncludeMemeReferences { get; set; } = true;
        
        public bool IncludeCulturalContext { get; set; } = true;
        
        // Detection mode: "text", "image", "combined"
        public string DetectionMode { get; set; } = "text";
    }
}
