using System.Text.Json;
using System.Text;
using MemeStreamApi.model;

namespace MemeStreamApi.services
{
    public interface IMemeDetectionService
    {
        Task<MemeDetectionResponse> AnalyzeTextAsync(MemeDetectionRequest request);
        Task<string> DetectLanguageAsync(string text);
    }

    public class MemeDetectionService : IMemeDetectionService
    {
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;
        private readonly ILogger<MemeDetectionService> _logger;

        public MemeDetectionService(HttpClient httpClient, ILogger<MemeDetectionService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? "";
        }

        public async Task<MemeDetectionResponse> AnalyzeTextAsync(MemeDetectionRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(_apiKey))
                {
                    return new MemeDetectionResponse
                    {
                        Success = false,
                        Error = "API key not found. Please set GEMINI_API_KEY environment variable."
                    };
                }

                // Detect language if not provided
                string language = request.Language ?? await DetectLanguageAsync(request.Text);

                // Create the analysis prompt
                string prompt = CreateAnalysisPrompt(request, language);

                // Call Gemini API
                var geminiResponse = await CallGeminiAPIAsync(prompt);

                if (geminiResponse == null)
                {
                    return new MemeDetectionResponse
                    {
                        Success = false,
                        Error = "Failed to get response from Gemini API"
                    };
                }

                // Parse the response
                var result = ParseGeminiResponse(geminiResponse, language);

                return new MemeDetectionResponse
                {
                    Success = true,
                    Message = "Meme analysis completed successfully",
                    Result = result
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing text for meme detection");
                return new MemeDetectionResponse
                {
                    Success = false,
                    Error = $"Analysis failed: {ex.Message}"
                };
            }
        }

        public async Task<string> DetectLanguageAsync(string text)
        {
            try
            {
                string prompt = $@"
Detect the language of the following text and respond with only the language name in English:

Text: ""{text}""

Language:";

                var response = await CallGeminiAPIAsync(prompt);
                return response?.Trim() ?? "Unknown";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error detecting language");
                return "Unknown";
            }
        }

        private string CreateAnalysisPrompt(MemeDetectionRequest request, string language)
        {
            return $@"
You are an expert meme detector and cultural analyst. Analyze the following text and provide a comprehensive analysis in JSON format.

Text to analyze: ""{request.Text}""
Detected language: {language}

Please analyze this text and respond with ONLY a valid JSON object containing the following fields:

{{
  ""isMeme"": boolean,
  ""memeProbability"": number (0.0 to 1.0),
  ""humorScore"": number (0.0 to 10.0),
  ""sentiment"": string (positive/negative/neutral),
  ""memeReferences"": [""array of meme references found""],
  ""culturalContexts"": [""array of cultural contexts""],
  ""keywords"": [""array of relevant keywords""],
  ""analysis"": ""detailed analysis explanation""
}}

Consider the following aspects:
1. Meme characteristics: humor, irony, sarcasm, wordplay, cultural references
2. Internet culture references: popular memes, viral content, social media trends
3. Language-specific humor patterns for {language}
4. Cultural context and regional humor styles
5. Text patterns that indicate meme-like content (repetition, exaggeration, etc.)

Respond with ONLY the JSON object, no additional text.";
        }

        private async Task<string?> CallGeminiAPIAsync(string prompt)
        {
            try
            {
                var request = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = prompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.3,
                        topK = 40,
                        topP = 0.95,
                        maxOutputTokens = 2048
                    }
                };

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("x-goog-api-key", _apiKey);

                var response = await _httpClient.PostAsync(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
                    content
                );

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<GeminiResponse>(responseContent);
                    return result?.candidates?[0]?.content?.parts?[0]?.text;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini API");
                return null;
            }
        }

        private MemeAnalysisResult ParseGeminiResponse(string response, string language)
        {
            try
            {
                // Clean the response to extract JSON
                var jsonStart = response.IndexOf('{');
                var jsonEnd = response.LastIndexOf('}') + 1;
                
                if (jsonStart >= 0 && jsonEnd > jsonStart)
                {
                    var json = response.Substring(jsonStart, jsonEnd - jsonStart);
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);

                    return new MemeAnalysisResult
                    {
                        IsMeme = parsed?.GetValueOrDefault("isMeme").GetBoolean() ?? false,
                        MemeProbability = parsed?.GetValueOrDefault("memeProbability").GetDouble() ?? 0.0,
                        DetectedLanguage = language,
                        HumorScore = parsed?.GetValueOrDefault("humorScore").GetDouble() ?? 0.0,
                        Sentiment = parsed?.GetValueOrDefault("sentiment").GetString() ?? "neutral",
                        MemeReferences = ParseArray(parsed?.GetValueOrDefault("memeReferences")),
                        CulturalContexts = ParseArray(parsed?.GetValueOrDefault("culturalContexts")),
                        Keywords = ParseArray(parsed?.GetValueOrDefault("keywords")),
                        Analysis = parsed?.GetValueOrDefault("analysis").GetString() ?? "Analysis not available"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing Gemini response");
            }

            // Fallback response
            return new MemeAnalysisResult
            {
                IsMeme = false,
                MemeProbability = 0.0,
                DetectedLanguage = language,
                HumorScore = 0.0,
                Sentiment = "neutral",
                Analysis = "Failed to parse analysis response"
            };
        }

        private List<string> ParseArray(JsonElement? element)
        {
            var result = new List<string>();
            
            if (element?.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.Value.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        result.Add(item.GetString() ?? "");
                    }
                }
            }
            
            return result;
        }
    }

    // Classes for parsing Gemini response
    public class GeminiResponse
    {
        public Candidate[] candidates { get; set; } = Array.Empty<Candidate>();
    }

    public class Candidate
    {
        public Content content { get; set; } = new();
    }

    public class Content
    {
        public Part[] parts { get; set; } = Array.Empty<Part>();
    }

    public class Part
    {
        public string text { get; set; } = "";
    }
}
