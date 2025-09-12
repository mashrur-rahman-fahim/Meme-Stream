# MemeStream Meme Detection Algorithm Documentation

## Overview

The MemeStream meme detection algorithm is a comprehensive AI-powered system that analyzes content to determine if it qualifies as meme content. The system supports three distinct analysis modes: text-only, image-only, and combined text+image analysis using Google Gemini AI with vision capabilities.

## Architecture

### Core Components

#### 1. Detection Modes

**📝 Text Analysis Mode**
- Analyzes textual content for meme characteristics
- Detects humor patterns, cultural references, and internet slang
- Language-aware analysis supporting multiple languages
- Identifies meme-specific linguistic patterns

**🖼️ Image Analysis Mode**
- Visual analysis of uploaded images
- OCR text extraction from images
- Meme template and format recognition
- Reaction face and visual humor detection

**🎯 Combined Analysis Mode**
- Synergistic analysis of text and image content
- Context alignment scoring between text and visuals
- Enhanced accuracy through multi-modal AI analysis
- Comprehensive meme authenticity assessment

#### 2. AI Integration

**Google Gemini AI Integration**
- Gemini 1.5 Flash for text analysis
- Gemini Vision API for image analysis
- Base64 image encoding for API compatibility
- Advanced prompt engineering for optimal results

## Models and Data Structures

### Request Models

**MemeDetectionRequest** (`model/MemeDetectionRequest.cs`)
```csharp
public class MemeDetectionRequest
{
    public string Text { get; set; } = string.Empty;
    public string? ImageUrl { get; set; } // Optional image URL for analysis
    public string? Language { get; set; } // Auto-detected if not provided
    
    public bool IncludeSentiment { get; set; } = true;
    public bool IncludeHumorScore { get; set; } = true;
    public bool IncludeMemeReferences { get; set; } = true;
    public bool IncludeCulturalContext { get; set; } = true;
    
    // Detection mode: "text", "image", "combined"
    public string DetectionMode { get; set; } = "text";
}
```

### Response Models

**MemeDetectionResponse** (`model/MemeDetectionResponse.cs`)
```csharp
public class MemeDetectionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public MemeAnalysisResult? Result { get; set; }
    public string? Error { get; set; }
}
```

**MemeAnalysisResult** (`model/MemeDetectionResponse.cs`)
```csharp
public class MemeAnalysisResult
{
    // Core Analysis
    public bool IsMeme { get; set; }
    public double MemeProbability { get; set; } // 0.0 to 1.0
    public string DetectedLanguage { get; set; } = string.Empty;
    public double HumorScore { get; set; } // 0.0 to 10.0
    public string Sentiment { get; set; } = string.Empty; // positive/negative/neutral
    
    // Content Analysis
    public List<string> MemeReferences { get; set; } = new();
    public List<string> CulturalContexts { get; set; } = new();
    public List<string> Keywords { get; set; } = new();
    public string Analysis { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    // Image Analysis
    public ImageAnalysisResult? ImageAnalysis { get; set; }
    
    // Combined Analysis
    public double CombinedConfidence { get; set; } // 0.0 to 1.0
    public string DetectionMode { get; set; } = "text";
}
```

**ImageAnalysisResult** (`model/MemeDetectionResponse.cs`)
```csharp
public class ImageAnalysisResult
{
    public bool ContainsMemeElements { get; set; }
    public double VisualHumorScore { get; set; } // 0.0 to 10.0
    public List<string> DetectedObjects { get; set; } = new();
    public List<string> DetectedText { get; set; } = new(); // OCR results
    public List<string> VisualMemeTypes { get; set; } = new(); 
    // Types: "reaction_face", "macro", "template", "rage_comic", "advice_animal"
    public string ImageDescription { get; set; } = string.Empty;
    public double TextImageAlignment { get; set; } // 0.0 to 1.0 (combined mode only)
}
```

## Service Implementation

### MemeDetectionService

**Interface** (`services/MemeDetectionService.cs`)
```csharp
public interface IMemeDetectionService
{
    Task<MemeDetectionResponse> AnalyzeTextAsync(MemeDetectionRequest request);
    Task<MemeDetectionResponse> AnalyzeImageAsync(MemeDetectionRequest request);
    Task<MemeDetectionResponse> AnalyzeCombinedAsync(MemeDetectionRequest request);
    Task<MemeDetectionResponse> AnalyzeAsync(MemeDetectionRequest request); // Main entry point
    Task<string> DetectLanguageAsync(string text);
}
```

### Core Analysis Methods

#### 1. Text Analysis (`AnalyzeTextAsync`)

**Process Flow:**
1. Language detection (if not provided)
2. Prompt engineering based on detected language
3. Gemini API call with structured prompt
4. JSON response parsing
5. Result validation and formatting

**Analysis Criteria:**
- Humor characteristics (irony, sarcasm, wordplay)
- Internet culture references
- Language-specific humor patterns
- Cultural context and regional humor
- Text patterns indicating meme content

**Prompt Template:**
```
You are an expert meme detector and cultural analyst. Analyze the following text and provide a comprehensive analysis in JSON format.

Text to analyze: "{text}"
Detected language: {language}

Please analyze this text and respond with ONLY a valid JSON object containing:
{
  "isMeme": boolean,
  "memeProbability": number (0.0 to 1.0),
  "humorScore": number (0.0 to 10.0),
  "sentiment": string (positive/negative/neutral),
  "memeReferences": ["array of meme references found"],
  "culturalContexts": ["array of cultural contexts"],
  "keywords": ["array of relevant keywords"],
  "analysis": "detailed analysis explanation"
}
```

#### 2. Image Analysis (`AnalyzeImageAsync`)

**Process Flow:**
1. Image URL validation
2. Image download and Base64 conversion
3. Gemini Vision API call with image data
4. Visual analysis and OCR text extraction
5. Meme template recognition
6. Result compilation and formatting

**Analysis Criteria:**
- Popular meme templates and formats
- Reaction faces and expressions
- Text overlays typical in memes
- Recognizable meme characters or objects
- Visual humor elements
- Cultural references visible in images

**Prompt Template:**
```
You are an expert visual meme detector and cultural analyst. Analyze the provided image and determine if it contains meme elements.

Please analyze this image and respond with ONLY a valid JSON object containing:
{
  "isMeme": boolean,
  "memeProbability": number (0.0 to 1.0),
  "visualHumorScore": number (0.0 to 10.0),
  "detectedObjects": ["array of objects/elements detected"],
  "detectedText": ["array of any text found in image via OCR"],
  "visualMemeTypes": ["reaction_face", "macro", "template", etc.],
  "imageDescription": "detailed description of the image",
  "containsMemeElements": boolean,
  "analysis": "detailed analysis of meme potential"
}
```

#### 3. Combined Analysis (`AnalyzeCombinedAsync`)

**Process Flow:**
1. Parallel execution of text and image analysis
2. Context correlation analysis
3. Text-image alignment scoring
4. Combined confidence calculation
5. Synergistic result compilation

**Analysis Criteria:**
- Text-image contextual alignment
- Synergistic humor creation
- Coherent meme narrative
- Cultural reference alignment
- Overall meme authenticity

**Advanced Features:**
- Cross-modal reference detection
- Context-aware humor analysis
- Alignment scoring algorithms
- Confidence weighting systems

## API Endpoints

### MemeDetector Controller Endpoints

**POST** `/api/memedetector/analyze-text`
- Text-only meme analysis
- Requires: `MemeDetectionRequest` with text content
- Returns: `MemeDetectionResponse` with text analysis

**POST** `/api/memedetector/analyze-image`  
- Image-only meme analysis
- Requires: `MemeDetectionRequest` with image URL
- Returns: `MemeDetectionResponse` with visual analysis

**POST** `/api/memedetector/analyze-combined`
- Combined text+image analysis
- Requires: `MemeDetectionRequest` with both text and image
- Returns: `MemeDetectionResponse` with comprehensive analysis

**POST** `/api/memedetector/analyze`
- Unified analysis endpoint (automatically detects mode)
- Requires: `MemeDetectionRequest` with any combination of content
- Returns: `MemeDetectionResponse` with appropriate analysis type

**POST** `/api/memedetector/detect-language`
- Language detection for text content
- Requires: Raw text string
- Returns: Detected language string

**POST** `/api/memedetector/test`
- API connectivity test endpoint
- Returns: API status and configuration info

### Post Controller Integration

**POST** `/api/post/check-meme`
- Pre-publication meme validation
- Uses unified analysis with automatic mode detection
- Returns: Validation result with detailed feedback

**POST** `/api/post/create`
- Post creation with mandatory meme validation
- Blocks non-meme content automatically
- Returns: Post creation result or validation error

## Algorithm Logic Flow

### Automatic Mode Detection

```csharp
// Determine analysis mode based on available data
if (!string.IsNullOrEmpty(request.Text) && !string.IsNullOrEmpty(request.ImageUrl))
{
    request.DetectionMode = "combined";
}
else if (!string.IsNullOrEmpty(request.ImageUrl))
{
    request.DetectionMode = "image";
}
else if (!string.IsNullOrEmpty(request.Text))
{
    request.DetectionMode = "text";
}
```

### Scoring Algorithms

#### Text Scoring
- **Humor Score**: Linguistic humor patterns (0.0-10.0)
- **Meme Probability**: Overall meme likelihood (0.0-1.0)
- **Cultural Relevance**: Context-specific scoring
- **Language Confidence**: Detection accuracy

#### Image Scoring
- **Visual Humor Score**: Visual comedy elements (0.0-10.0)
- **Template Recognition**: Known meme format detection
- **OCR Confidence**: Text extraction accuracy
- **Meme Element Detection**: Visual meme indicators

#### Combined Scoring
- **Alignment Score**: Text-image coherence (0.0-1.0)
- **Combined Confidence**: Overall analysis certainty
- **Synergy Bonus**: Multi-modal humor enhancement
- **Weighted Average**: Balanced scoring algorithm

## Frontend Integration

### Post Component Updates

**Enhanced User Feedback:**
```javascript
const analysisTypeText = {
  text: "📝 Text Analysis",
  image: "🖼️ Image Analysis", 
  combined: "🎯 Combined Analysis",
  none: "❌ No Analysis",
  unknown: "❓ Analysis"
}[analysisMode] || "❓ Analysis";
```

**Smart Button Logic:**
```javascript
// Enable button when either text or image is present
disabled={isCheckingMeme || (!FormData.content.trim() && !FormData.image.trim())}
```

**Analysis Mode Display:**
- Visual indicators for each analysis type
- Detailed feedback messages
- Progress indicators during analysis
- Error handling with mode-specific messages

### Image Upload Integration

**Cloudinary Integration:**
- Secure image upload with signed URLs
- Automatic image optimization
- Format validation and compression
- Real-time upload progress

**Image Validation:**
- File type validation (JPEG, PNG, GIF, WebP)
- File size limits (10MB maximum)
- Image compression for large files
- Error handling and user feedback

## Configuration and Environment

### Required Environment Variables

```bash
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret
```

### API Configuration

**Gemini API Settings:**
```csharp
var request = new
{
    contents = new[] { /* content structure */ },
    generationConfig = new
    {
        temperature = 0.3,      // Consistent results
        topK = 40,             // Token diversity
        topP = 0.95,           // Nucleus sampling
        maxOutputTokens = 2048  // Response length limit
    }
};
```

## Performance Considerations

### Optimization Strategies

1. **API Call Efficiency**
   - Request batching for combined analysis
   - Caching for repeated content
   - Timeout handling (2-minute default)
   - Retry logic for failed requests

2. **Image Processing**
   - Lazy loading for large images
   - Base64 conversion optimization
   - Memory management for image data
   - Concurrent processing capabilities

3. **Response Parsing**
   - Robust JSON parsing with fallbacks
   - Error recovery mechanisms
   - Structured data validation
   - Performance monitoring

### Scalability Features

- **Asynchronous Processing**: All analysis operations are async
- **Resource Management**: Proper disposal of HTTP clients
- **Error Handling**: Comprehensive exception management
- **Logging**: Detailed operation tracking

## Error Handling

### Common Error Scenarios

1. **API Key Issues**
   - Missing or invalid Gemini API key
   - Rate limit exceeded
   - Quota exhaustion

2. **Image Processing Errors**
   - Invalid image URLs
   - Unsupported image formats
   - Network connectivity issues
   - Image download failures

3. **Analysis Failures**
   - Malformed JSON responses
   - Unexpected API responses
   - Timeout scenarios
   - Service unavailability

### Error Recovery

```csharp
// Fallback analysis for failed requests
return new MemeAnalysisResult
{
    IsMeme = false,
    MemeProbability = 0.0,
    Analysis = "Analysis failed - content cannot be verified as meme",
    DetectionMode = detectionMode
};
```

## Testing and Validation

### Unit Testing

- **Service Method Testing**: Individual analysis functions
- **Model Validation**: Request/response data integrity
- **Error Scenario Testing**: Exception handling verification
- **API Integration Testing**: External service connectivity

### Integration Testing

- **End-to-End Workflows**: Complete analysis pipelines
- **Multi-Modal Testing**: Combined analysis accuracy
- **Performance Testing**: Response time validation
- **Load Testing**: Concurrent request handling

### Test Data Sets

1. **Text Samples**
   - Known meme phrases and formats
   - Non-meme content for negative testing
   - Multi-language meme content
   - Edge cases and boundary conditions

2. **Image Samples**
   - Popular meme templates
   - Non-meme images for validation
   - Text-heavy images for OCR testing
   - Various formats and sizes

3. **Combined Samples**
   - Coherent text-image meme pairs
   - Misaligned content for testing
   - Complex multi-modal memes
   - Cultural reference combinations

## Future Enhancements

### Planned Features

1. **Advanced AI Models**
   - Custom fine-tuned models
   - Specialized meme detection training
   - Context-aware improvements
   - Performance optimizations

2. **Enhanced Analysis**
   - Video meme support
   - Audio content analysis
   - Real-time trending detection
   - Community feedback integration

3. **Machine Learning Pipeline**
   - User feedback learning
   - Accuracy improvement algorithms
   - A/B testing frameworks
   - Analytics and insights

### Research Areas

- **Cultural Context Modeling**: Region-specific meme understanding
- **Temporal Meme Analysis**: Trending and viral content detection
- **User Behavior Integration**: Personalized meme recognition
- **Cross-Platform Analysis**: Multi-social-media meme tracking

## Troubleshooting Guide

### Common Issues

1. **"API key not found" Error**
   - Verify GEMINI_API_KEY environment variable
   - Check API key validity in Google Cloud Console
   - Ensure proper service account permissions

2. **Image Analysis Failures**
   - Validate image URL accessibility
   - Check image format compatibility
   - Verify network connectivity
   - Monitor API usage quotas

3. **Inconsistent Analysis Results**
   - Review prompt engineering
   - Check temperature and sampling settings
   - Validate input data quality
   - Consider model updates

### Debug Tools

- **Logging**: Comprehensive operation tracking
- **API Response Monitoring**: Raw response inspection
- **Performance Metrics**: Response time analysis
- **Error Analytics**: Failure pattern identification

This comprehensive meme detection algorithm provides robust, accurate, and scalable content analysis for the MemeStream platform, ensuring only authentic meme content is shared within the community.