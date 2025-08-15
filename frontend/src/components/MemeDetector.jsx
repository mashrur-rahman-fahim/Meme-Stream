import React, { useState } from "react";
import axios from "../utils/axios";

const MemeDetector = () => {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const languages = [
    { code: "", name: "Auto-detect" },
    { code: "English", name: "English" },
    { code: "Spanish", name: "Español" },
    { code: "French", name: "Français" },
    { code: "German", name: "Deutsch" },
    { code: "Japanese", name: "日本語" },
    { code: "Korean", name: "한국어" },
    { code: "Italian", name: "Italiano" },
    { code: "Portuguese", name: "Português" },
    { code: "Russian", name: "Русский" },
    { code: "Arabic", name: "العربية" },
    { code: "Hindi", name: "हिन्दी" },
    { code: "Chinese", name: "中文" },
  ];

  const sampleTexts = [
    { text: "This is fine. Everything is fine. 🔥", lang: "English" },
    {
      text: "Cuando terminas de estudiar y te das cuenta de que no entendiste nada 😅",
      lang: "Spanish",
    },
    { text: "Moi à 3h du matin: *mange du fromage* 🧀", lang: "French" },
    {
      text: "Ich wenn ich um 3 Uhr morgens aufwache und Hunger habe: *isst Brot* 🍞",
      lang: "German",
    },
    {
      text: "深夜3時に目が覚めてお腹が空いた時: *パンを食べる* 🍞",
      lang: "Japanese",
    },
    { text: "새벽 3시에 깨어나서 배고플 때: *빵을 먹는다* 🍞", lang: "Korean" },
    {
      text: "Io alle 3 del mattino quando ho fame: *mangio pane* 🍞",
      lang: "Italian",
    },
    {
      text: "Eu às 3 da manhã quando estou com fome: *como pão* 🍞",
      lang: "Portuguese",
    },
    { text: "Я в 3 часа ночи когда хочу есть: *ем хлеб* 🍞", lang: "Russian" },
    {
      text: "أنا الساعة 3 صباحاً عندما أشعر بالجوع: *آكل خبز* 🍞",
      lang: "Arabic",
    },
    { text: "मैं रात 3 बजे जब भूख लगती है: *रोटी खाता हूं* 🍞", lang: "Hindi" },
    { text: "我凌晨3点饿的时候: *吃面包* 🍞", lang: "Chinese" },
  ];

  const analyzeText = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const requestData = {
        text: text.trim(),
        includeSentiment: true,
        includeHumorScore: true,
        includeMemeReferences: true,
        includeCulturalContext: true,
      };

      if (language) {
        requestData.language = language;
      }

      const response = await axios.post(
        "/MemeDetector/analyze-text",
        requestData
      );
      setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze text");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleText = (sample) => {
    setText(sample.text);
    setLanguage(sample.lang);
  };

  const getMemeProbabilityColor = (probability) => {
    if (probability >= 0.7) return "text-green-600";
    if (probability >= 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const getHumorScoreColor = (score) => {
    if (score >= 7) return "text-green-600";
    if (score >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          🌍 Multi-Language Meme Detector
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text to Analyze
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text in any language to detect meme characteristics..."
                className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language (Optional)
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={analyzeText}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Text"}
            </button>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Sample Texts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Sample Texts to Try
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => loadSampleText(sample)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-700">
                    {sample.lang}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {sample.text}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {analysis && analysis.success && analysis.result && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Analysis Results
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Meme Probability</div>
                <div
                  className={`text-2xl font-bold ${getMemeProbabilityColor(
                    analysis.result.memeProbability
                  )}`}
                >
                  {(analysis.result.memeProbability * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {analysis.result.isMeme ? "✅ Is a meme" : "❌ Not a meme"}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Humor Score</div>
                <div
                  className={`text-2xl font-bold ${getHumorScoreColor(
                    analysis.result.humorScore
                  )}`}
                >
                  {analysis.result.humorScore}/10
                </div>
                <div className="text-sm text-gray-600">Humor rating</div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Language</div>
                <div className="text-2xl font-bold text-blue-600">
                  {analysis.result.detectedLanguage}
                </div>
                <div className="text-sm text-gray-600">Detected</div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">Sentiment</div>
                <div className="text-2xl font-bold text-purple-600 capitalize">
                  {analysis.result.sentiment}
                </div>
                <div className="text-sm text-gray-600">Emotional tone</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Meme References
                </h3>
                <div className="bg-white p-4 rounded-lg shadow">
                  {analysis.result.memeReferences.length > 0 ? (
                    <ul className="space-y-1">
                      {analysis.result.memeReferences.map((ref, index) => (
                        <li key={index} className="text-sm text-gray-700">
                          • {ref}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No specific meme references found
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Cultural Contexts
                </h3>
                <div className="bg-white p-4 rounded-lg shadow">
                  {analysis.result.culturalContexts.length > 0 ? (
                    <ul className="space-y-1">
                      {analysis.result.culturalContexts.map(
                        (context, index) => (
                          <li key={index} className="text-sm text-gray-700">
                            • {context}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No cultural contexts identified
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Keywords
              </h3>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex flex-wrap gap-2">
                  {analysis.result.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Detailed Analysis
              </h3>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-700 leading-relaxed">
                  {analysis.result.analysis}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemeDetector;
