const axios = require('axios');
const fs = require('fs');

const extractWorkerDataFromAudio = async (audioPath) => {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key Check:", apiKey ? "Key Found" : "Key MISSING");
    // Switching to 'gemini-flash-latest' which was explicitly listed in the available models
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    try {
        const audioBase64 = fs.readFileSync(audioPath).toString("base64");

        const payload = {
            contents: [{
                parts: [
                    { text: "Return a single JSON object (NOT an array) with these exact keys: firstName, city, totalExperience, roleName, expectedSalary, and skills. If a numeric value is unknown, return the number 0 instead of N/A or text." },
                    {
                        inlineData: {
                            mimeType: "audio/mp3",
                            data: audioBase64
                        }
                    }
                ]
            }]
        };

        const response = await axios.post(url, payload);
        // Handle potential differences in response structure, but typically it's candidates[0].content.parts[0].text
        if (response.data.candidates && response.data.candidates.length > 0) {
            const resultText = response.data.candidates[0].content.parts[0].text;

            // Robust extraction: find the first '{' or '[' and the last '}' or ']'
            const startIdx = resultText.search(/{|\[/);
            const lastBrace = resultText.lastIndexOf('}');
            const lastBracket = resultText.lastIndexOf(']');
            const endIdx = Math.max(lastBrace, lastBracket);

            if (startIdx !== -1 && endIdx !== -1) {
                const jsonString = resultText.substring(startIdx, endIdx + 1);
                return JSON.parse(jsonString);
            }

            // Fallback if no brackets found (e.g. raw number or string)
            return JSON.parse(resultText);
        } else {
            throw new Error("No candidates returned from Gemini API");
        }
    } catch (error) {
        console.error("Manual Gemini API Error:", error.response?.data || error.message);
        throw new Error("AI Processing failed at the network level.");
    }
};

module.exports = { extractWorkerDataFromAudio };