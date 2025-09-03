# MemeStream Meme Detector API

A comprehensive meme detection system that can analyze text in multiple languages to identify meme characteristics, humor patterns, and cultural references.

## Features

### 🌍 Multi-Language Support

- **Automatic Language Detection**: Automatically detects the language of input text
- **Language-Specific Analysis**: Tailored analysis for different cultural humor patterns
- **Supported Languages**: English, Spanish, French, German, Japanese, Korean, Italian, Portuguese, Russian, Arabic, Hindi, Chinese, and more

### 🎯 Advanced Analysis

- **Meme Probability**: Calculates the likelihood that text contains meme characteristics
- **Humor Scoring**: Rates humor on a scale of 0-10
- **Sentiment Analysis**: Determines emotional tone (positive/negative/neutral)
- **Cultural Context**: Identifies cultural references and contexts
- **Keyword Extraction**: Extracts relevant keywords and phrases
- **Meme References**: Identifies specific meme formats and references

### 🔧 Flexible Configuration

- **Customizable Analysis**: Choose which aspects to analyze
- **Configurable Parameters**: Adjust analysis depth and focus
- **Batch Processing**: Support for multiple text analysis requests

## API Endpoints

### 1. Analyze Text for Meme Characteristics

```http
POST /api/MemeDetector/analyze-text
Content-Type: application/json

{
  "text": "Your text here",
  "language": "English", // Optional - auto-detected if not provided
  "includeSentiment": true,
  "includeHumorScore": true,
  "includeMemeReferences": true,
  "includeCulturalContext": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Meme analysis completed successfully",
  "result": {
    "isMeme": true,
    "memeProbability": 0.85,
    "detectedLanguage": "English",
    "humorScore": 8.5,
    "sentiment": "positive",
    "memeReferences": ["This is fine", "Dog in burning house"],
    "culturalContexts": ["Internet culture", "Social media humor"],
    "keywords": ["fine", "everything", "fire"],
    "analysis": "This text uses the classic 'This is fine' meme format..."
  }
}
```

### 2. Detect Language

```http
POST /api/MemeDetector/detect-language
Content-Type: application/json

"Your text here"
```

**Response:**

```json
{
  "language": "Spanish"
}
```

### 3. Test API Connection

```http
POST /api/MemeDetector/test
Content-Type: application/json

{}
```

## Usage Examples

### English Meme Detection

```json
{
  "text": "This is fine. Everything is fine. 🔥",
  "includeSentiment": true,
  "includeHumorScore": true,
  "includeMemeReferences": true,
  "includeCulturalContext": true
}
```

### Spanish Meme Detection

```json
{
  "text": "Cuando terminas de estudiar y te das cuenta de que no entendiste nada 😅",
  "language": "Spanish",
  "includeSentiment": true,
  "includeHumorScore": true,
  "includeMemeReferences": true,
  "includeCulturalContext": true
}
```

### Japanese Meme Detection

```json
{
  "text": "深夜3時に目が覚めてお腹が空いた時: *パンを食べる* 🍞",
  "language": "Japanese",
  "includeSentiment": true,
  "includeHumorScore": true,
  "includeMemeReferences": true,
  "includeCulturalContext": true
}
```

## Setup and Configuration

### Prerequisites

- .NET 9.0 or later
- Google Gemini API key

### Environment Variables

Set the following environment variable:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Installation

1. Clone the repository
2. Set your Gemini API key in environment variables
3. Run the application:

```bash
dotnet run
```

## Technical Details

### Architecture

- **Service Layer**: `MemeDetectionService` handles core analysis logic
- **Controller Layer**: `MemeDetectorController` provides REST API endpoints
- **Model Layer**: Request/response models for data transfer
- **AI Integration**: Google Gemini API for advanced text analysis

### Analysis Algorithm

1. **Language Detection**: Automatically identifies text language
2. **Context Analysis**: Analyzes cultural and internet culture references
3. **Pattern Recognition**: Identifies meme formats and structures
4. **Humor Assessment**: Evaluates humor characteristics and scoring
5. **Sentiment Analysis**: Determines emotional tone and context

### Performance

- **Response Time**: Typically 1-3 seconds per analysis
- **Concurrent Requests**: Supports multiple simultaneous analyses
- **Caching**: Built-in response caching for improved performance

## Error Handling

The API provides comprehensive error handling:

- **Missing API Key**: Clear error message for configuration issues
- **Invalid Input**: Validation for required fields and text length
- **API Failures**: Graceful handling of external API errors
- **Parsing Errors**: Fallback responses for malformed data

## Testing

Use the provided `MemeDetectorTests.http` file to test all endpoints with various languages and text types.

### Test Categories

1. **Language Tests**: Multiple languages and scripts
2. **Meme Format Tests**: Classic and modern meme formats
3. **Cultural Context Tests**: Regional humor and references
4. **Edge Cases**: Minimal text, special characters, emojis

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

1. Check the existing documentation
2. Review the test examples
3. Open an issue on GitHub

---

**Note**: This meme detector uses Google's Gemini AI for analysis. Ensure you have proper API access and usage limits configured.
