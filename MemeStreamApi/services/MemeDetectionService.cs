using System.Text.Json;
using System.Text;
using MemeStreamApi.model;

namespace MemeStreamApi.services
{
    public interface IMemeDetectionService
    {
        Task<MemeDetectionResponse> AnalyzeTextAsync(MemeDetectionRequest request);
        Task<MemeDetectionResponse> AnalyzeImageAsync(MemeDetectionRequest request);
        Task<MemeDetectionResponse> AnalyzeCombinedAsync(MemeDetectionRequest request);
        Task<MemeDetectionResponse> AnalyzeAsync(MemeDetectionRequest request); // Main entry point
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

        // Main analysis entry point that routes based on detection mode
        public async Task<MemeDetectionResponse> AnalyzeAsync(MemeDetectionRequest request)
        {
            return request.DetectionMode.ToLower() switch
            {
                "text" => await AnalyzeTextAsync(request),
                "image" => await AnalyzeImageAsync(request),
                "combined" => await AnalyzeCombinedAsync(request),
                _ => await AnalyzeTextAsync(request) // Default to text analysis
            };
        }

        public async Task<MemeDetectionResponse> AnalyzeImageAsync(MemeDetectionRequest request)
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

                if (string.IsNullOrEmpty(request.ImageUrl))
                {
                    return new MemeDetectionResponse
                    {
                        Success = false,
                        Error = "Image URL is required for image analysis."
                    };
                }

                // Create image analysis prompt
                string prompt = CreateImageAnalysisPrompt(request);

                // Call Gemini API with image
                var geminiResponse = await CallGeminiAPIWithImageAsync(prompt, request.ImageUrl);

                if (geminiResponse == null)
                {
                    return new MemeDetectionResponse
                    {
                        Success = false,
                        Error = "Failed to get response from Gemini API for image analysis"
                    };
                }

                // Parse the response
                var result = ParseImageAnalysisResponse(geminiResponse);
                result.DetectionMode = "image";

                return new MemeDetectionResponse
                {
                    Success = true,
                    Message = "Image meme analysis completed successfully",
                    Result = result
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing image for meme detection");
                return new MemeDetectionResponse
                {
                    Success = false,
                    Error = $"Image analysis failed: {ex.Message}"
                };
            }
        }

        public async Task<MemeDetectionResponse> AnalyzeCombinedAsync(MemeDetectionRequest request)
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

                if (string.IsNullOrEmpty(request.Text) && string.IsNullOrEmpty(request.ImageUrl))
                {
                    return new MemeDetectionResponse
                    {
                        Success = false,
                        Error = "Both text and image URL are required for combined analysis."
                    };
                }

                // Get separate analyses
                var textAnalysis = !string.IsNullOrEmpty(request.Text) ? 
                    await AnalyzeTextAsync(new MemeDetectionRequest { Text = request.Text, Language = request.Language }) : null;
                
                var imageAnalysis = !string.IsNullOrEmpty(request.ImageUrl) ? 
                    await AnalyzeImageAsync(new MemeDetectionRequest { ImageUrl = request.ImageUrl, DetectionMode = "image" }) : null;

                // Create combined analysis prompt
                string prompt = CreateCombinedAnalysisPrompt(request, textAnalysis?.Result, imageAnalysis?.Result);

                // Call Gemini API with combined context
                var geminiResponse = await CallGeminiAPIWithImageAsync(prompt, request.ImageUrl);

                if (geminiResponse == null)
                {
                    return new MemeDetectionResponse
                    {
                        Success = false,
                        Error = "Failed to get response from Gemini API for combined analysis"
                    };
                }

                // Parse and combine results
                var result = ParseCombinedAnalysisResponse(geminiResponse, textAnalysis?.Result, imageAnalysis?.Result);
                result.DetectionMode = "combined";

                return new MemeDetectionResponse
                {
                    Success = true,
                    Message = "Combined meme analysis completed successfully",
                    Result = result
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in combined meme analysis");
                return new MemeDetectionResponse
                {
                    Success = false,
                    Error = $"Combined analysis failed: {ex.Message}"
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

        private string CreateImageAnalysisPrompt(MemeDetectionRequest request)
        {
            return $@"
You are an expert visual meme detector and cultural analyst. Analyze the provided image and determine if it contains meme elements.

Please analyze this image and respond with ONLY a valid JSON object containing the following fields:

{{
  ""isMeme"": boolean,
  ""memeProbability"": number (0.0 to 1.0),
  ""visualHumorScore"": number (0.0 to 10.0),
  ""detectedObjects"": [""array of objects/elements detected""],
  ""detectedText"": [""array of any text found in image via OCR""],
  ""visualMemeTypes"": [""reaction_face"", ""macro"", ""template"", ""rage_comic"", ""advice_animal"", etc.],
  ""imageDescription"": ""detailed description of the image"",
  ""containsMemeElements"": boolean,
  ""analysis"": ""detailed analysis of meme potential""
}}

Consider the following visual meme characteristics:
1. Popular meme templates and formats
2. Reaction faces and expressions
3. Text overlays typical in memes
4. Recognizable meme characters or objects
5. Visual humor elements (exaggerated expressions, absurd scenarios)
6. Cultural references visible in the image
7. Image composition typical of internet memes

Respond with ONLY the JSON object, no additional text.";
        }

        private string CreateCombinedAnalysisPrompt(MemeDetectionRequest request, MemeAnalysisResult? textResult, MemeAnalysisResult? imageResult)
        {
            var textInfo = textResult != null ? 
                $"Text Analysis - IsMeme: {textResult.IsMeme}, Probability: {textResult.MemeProbability:F2}, Humor: {textResult.HumorScore:F1}" : 
                "No text analysis available";

            var imageInfo = imageResult?.ImageAnalysis != null ? 
                $"Image Analysis - IsMeme: {imageResult.ImageAnalysis.ContainsMemeElements}, Visual Humor: {imageResult.ImageAnalysis.VisualHumorScore:F1}" : 
                "No image analysis available";

            return $@"
You are an expert meme analyst. Analyze the relationship between the provided text and image to determine overall meme potential.

Text: ""{request.Text}""
{textInfo}
{imageInfo}

Please provide a combined analysis in JSON format:

{{
  ""isMeme"": boolean,
  ""memeProbability"": number (0.0 to 1.0),
  ""combinedConfidence"": number (0.0 to 1.0),
  ""humorScore"": number (0.0 to 10.0),
  ""textImageAlignment"": number (0.0 to 1.0),
  ""sentiment"": ""positive/negative/neutral"",
  ""memeReferences"": [""array of meme references""],
  ""culturalContexts"": [""array of cultural contexts""],
  ""analysis"": ""detailed combined analysis""
}}

Consider:
1. How well the text complements the image
2. Whether text and image together create humor
3. If they reference the same meme or cultural context
4. Overall coherence as a meme unit
5. Synergy between visual and textual elements

Respond with ONLY the JSON object, no additional text.";
        }

        private async Task<string?> CallGeminiAPIWithImageAsync(string prompt, string imageUrl)
        {
            try
            {
                var request = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new object[]
                            {
                                new { text = prompt },
                                new { 
                                    inline_data = new {
                                        mime_type = "image/jpeg", // Cloudinary usually serves as JPEG
                                        data = await GetImageAsBase64Async(imageUrl)
                                    }
                                }
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
                _logger.LogError(ex, "Error calling Gemini API with image");
                return null;
            }
        }

        private async Task<string> GetImageAsBase64Async(string imageUrl)
        {
            try
            {
                var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);
                return Convert.ToBase64String(imageBytes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading image from URL: {ImageUrl}", imageUrl);
                throw;
            }
        }

        private MemeAnalysisResult ParseImageAnalysisResponse(string response)
        {
            try
            {
                var jsonStart = response.IndexOf('{');
                var jsonEnd = response.LastIndexOf('}') + 1;
                
                if (jsonStart >= 0 && jsonEnd > jsonStart)
                {
                    var json = response.Substring(jsonStart, jsonEnd - jsonStart);
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);

                    var imageAnalysis = new ImageAnalysisResult
                    {
                        ContainsMemeElements = parsed?.GetValueOrDefault("containsMemeElements").GetBoolean() ?? false,
                        VisualHumorScore = parsed?.GetValueOrDefault("visualHumorScore").GetDouble() ?? 0.0,
                        DetectedObjects = ParseArray(parsed?.GetValueOrDefault("detectedObjects")),
                        DetectedText = ParseArray(parsed?.GetValueOrDefault("detectedText")),
                        VisualMemeTypes = ParseArray(parsed?.GetValueOrDefault("visualMemeTypes")),
                        ImageDescription = parsed?.GetValueOrDefault("imageDescription").GetString() ?? ""
                    };

                    return new MemeAnalysisResult
                    {
                        IsMeme = parsed?.GetValueOrDefault("isMeme").GetBoolean() ?? false,
                        MemeProbability = parsed?.GetValueOrDefault("memeProbability").GetDouble() ?? 0.0,
                        HumorScore = imageAnalysis.VisualHumorScore,
                        DetectedLanguage = "Visual",
                        Sentiment = "neutral",
                        Analysis = parsed?.GetValueOrDefault("analysis").GetString() ?? "",
                        ImageAnalysis = imageAnalysis,
                        DetectionMode = "image"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing image analysis response");
            }

            return new MemeAnalysisResult
            {
                IsMeme = false,
                MemeProbability = 0.0,
                HumorScore = 0.0,
                DetectedLanguage = "Visual",
                Sentiment = "neutral",
                Analysis = "Failed to parse image analysis response",
                DetectionMode = "image"
            };
        }

        private MemeAnalysisResult ParseCombinedAnalysisResponse(string response, MemeAnalysisResult? textResult, MemeAnalysisResult? imageResult)
        {
            try
            {
                var jsonStart = response.IndexOf('{');
                var jsonEnd = response.LastIndexOf('}') + 1;
                
                if (jsonStart >= 0 && jsonEnd > jsonStart)
                {
                    var json = response.Substring(jsonStart, jsonEnd - jsonStart);
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);

                    var result = new MemeAnalysisResult
                    {
                        IsMeme = parsed?.GetValueOrDefault("isMeme").GetBoolean() ?? false,
                        MemeProbability = parsed?.GetValueOrDefault("memeProbability").GetDouble() ?? 0.0,
                        CombinedConfidence = parsed?.GetValueOrDefault("combinedConfidence").GetDouble() ?? 0.0,
                        HumorScore = parsed?.GetValueOrDefault("humorScore").GetDouble() ?? 0.0,
                        DetectedLanguage = textResult?.DetectedLanguage ?? "Unknown",
                        Sentiment = parsed?.GetValueOrDefault("sentiment").GetString() ?? "neutral",
                        MemeReferences = ParseArray(parsed?.GetValueOrDefault("memeReferences")),
                        CulturalContexts = ParseArray(parsed?.GetValueOrDefault("culturalContexts")),
                        Analysis = parsed?.GetValueOrDefault("analysis").GetString() ?? "",
                        DetectionMode = "combined"
                    };

                    // Merge image analysis if available
                    if (imageResult?.ImageAnalysis != null)
                    {
                        result.ImageAnalysis = imageResult.ImageAnalysis;
                        result.ImageAnalysis.TextImageAlignment = parsed?.GetValueOrDefault("textImageAlignment").GetDouble() ?? 0.0;
                    }

                    // Combine keywords from both analyses
                    if (textResult != null)
                    {
                        result.Keywords.AddRange(textResult.Keywords);
                        result.MemeReferences.AddRange(textResult.MemeReferences);
                        result.CulturalContexts.AddRange(textResult.CulturalContexts);
                    }

                    return result;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing combined analysis response");
            }

            // Fallback - merge individual results
            var fallback = new MemeAnalysisResult
            {
                IsMeme = (textResult?.IsMeme ?? false) || (imageResult?.ImageAnalysis?.ContainsMemeElements ?? false),
                MemeProbability = Math.Max(textResult?.MemeProbability ?? 0.0, imageResult?.MemeProbability ?? 0.0),
                HumorScore = Math.Max(textResult?.HumorScore ?? 0.0, imageResult?.HumorScore ?? 0.0),
                DetectedLanguage = textResult?.DetectedLanguage ?? "Unknown",
                Sentiment = textResult?.Sentiment ?? "neutral",
                Analysis = "Combined analysis using fallback method",
                DetectionMode = "combined",
                ImageAnalysis = imageResult?.ImageAnalysis
            };

            if (textResult != null)
            {
                fallback.Keywords.AddRange(textResult.Keywords);
                fallback.MemeReferences.AddRange(textResult.MemeReferences);
                fallback.CulturalContexts.AddRange(textResult.CulturalContexts);
            }

            return fallback;
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
