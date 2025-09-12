using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;
using MemeStreamApi.model;
using MemeStreamApi.services;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class MemeDetectorController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly IMemeDetectionService _memeDetectionService;
        
        public MemeDetectorController(HttpClient httpClient, IMemeDetectionService memeDetectionService)
        {
            _httpClient = httpClient;
            _memeDetectionService = memeDetectionService;
            _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        }
        
        [HttpPost("test")]
        public async Task<IActionResult> Test()
        {
            try
            {
                // Check if API key exists
                if (string.IsNullOrEmpty(_apiKey))
                {
                    return BadRequest(new { 
                        success = false, 
                        error = "API key not found. Please set GEMINI_API_KEY environment variable." 
                    });
                }

                var req = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = "Hello, world!" }
                            }
                        }
                    }
                };
                
                var json = JsonSerializer.Serialize(req);
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
                    
                    // Try to parse the response
                    try
                    {
                        var result = JsonSerializer.Deserialize<GeminiResponse>(responseContent);
                        var aiResponse = result?.candidates?[0]?.content?.parts?[0]?.text;
                        
                        return Ok(new { 
                            success = true, 
                            message = "🎉 Gemini API is working!",
                            response = aiResponse,
                            apiKey = _apiKey.Substring(0, 10) + "..." // Show first 10 chars for verification
                        });
                    }
                    catch (Exception parseEx)
                    {
                        return Ok(new { 
                            success = true, 
                            message = "🎉 Gemini API responded! (Couldn't parse response)",
                            rawResponse = responseContent,
                            parseError = parseEx.Message
                        });
                    }
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return BadRequest(new { 
                        success = false, 
                        error = "Gemini API error", 
                        statusCode = (int)response.StatusCode,
                        statusText = response.StatusCode.ToString(),
                        details = errorContent
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { 
                    success = false, 
                    error = "Test failed", 
                    details = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        /// <summary>
        /// Analyze text for meme characteristics in any language
        /// </summary>
        [HttpPost("analyze-text")]
        public async Task<IActionResult> AnalyzeText([FromBody] MemeDetectionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _memeDetectionService.AnalyzeTextAsync(request);
            
            if (result.Success)
            {
                return Ok(result);
            }
            else
            {
                return BadRequest(result);
            }
        }

        /// <summary>
        /// Detect the language of the provided text
        /// </summary>
        [HttpPost("detect-language")]
        public async Task<IActionResult> DetectLanguage([FromBody] string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return BadRequest(new { error = "Text cannot be empty" });
            }

            var language = await _memeDetectionService.DetectLanguageAsync(text);
            return Ok(new { language = language });
        }

        /// <summary>
        /// Analyze image for meme characteristics
        /// </summary>
        [HttpPost("analyze-image")]
        public async Task<IActionResult> AnalyzeImage([FromBody] MemeDetectionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrEmpty(request.ImageUrl))
            {
                return BadRequest(new { error = "ImageUrl is required for image analysis" });
            }

            request.DetectionMode = "image";
            var result = await _memeDetectionService.AnalyzeImageAsync(request);
            
            if (result.Success)
            {
                return Ok(result);
            }
            else
            {
                return BadRequest(result);
            }
        }

        /// <summary>
        /// Analyze both text and image together for comprehensive meme detection
        /// </summary>
        [HttpPost("analyze-combined")]
        public async Task<IActionResult> AnalyzeCombined([FromBody] MemeDetectionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrEmpty(request.Text) && string.IsNullOrEmpty(request.ImageUrl))
            {
                return BadRequest(new { error = "Either text or image URL (or both) is required for analysis" });
            }

            request.DetectionMode = "combined";
            var result = await _memeDetectionService.AnalyzeCombinedAsync(request);
            
            if (result.Success)
            {
                return Ok(result);
            }
            else
            {
                return BadRequest(result);
            }
        }

        /// <summary>
        /// Main analysis endpoint that automatically routes based on provided data
        /// </summary>
        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze([FromBody] MemeDetectionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

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
            else
            {
                return BadRequest(new { error = "Either text, image URL, or both must be provided" });
            }

            var result = await _memeDetectionService.AnalyzeAsync(request);
            
            if (result.Success)
            {
                return Ok(result);
            }
            else
            {
                return BadRequest(result);
            }
        }

        /// <summary>
        /// Legacy method for backward compatibility
        /// </summary>
        [HttpPost("detect")]
        public IActionResult DetectMeme([FromBody] string imageUrl)
        {
            return Ok("Meme detected");
        }
    }

    // Classes for parsing Gemini response
    public class GeminiResponse
    {
        public Candidate[] candidates { get; set; }
    }

    public class Candidate
    {
        public Content content { get; set; }
    }

    public class Content
    {
        public Part[] parts { get; set; }
    }

    public class Part
    {
        public string text { get; set; }
    }
}