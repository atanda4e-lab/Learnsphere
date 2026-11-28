export default async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "AI service is not configured."
            });
        }

        const { message, history = [] } = req.body || {};

        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.length > 5000
        ) {
            return res.status(400).json({
                error: "Please provide a valid message (maximum 5,000 characters)."
            });
        }

        if (!Array.isArray(history) || history.length > 12) {
            return res.status(400).json({
                error: "Invalid conversation history."
            });
        }

        const contents = [];

        for (const item of history) {
            if (
                !item ||
                !["user", "model"].includes(item.role) ||
                typeof item.text !== "string" ||
                item.text.length > 5000
            ) {
                return res.status(400).json({
                    error: "Invalid conversation history."
                });
            }

            contents.push({
                role: item.role,
                parts: [{ text: item.text }]
            });
        }

        contents.push({
            role: "user",
            parts: [{ text: message.trim() }]
        });

        const geminiResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{
                            text: `You are LearnSphere AI, a friendly and intelligent academic learning assistant for Nigerian students.

Your responsibilities:
- Explain difficult academic concepts in simple language.
- Help students understand programming and technology.
- Generate practice questions and answers.
- Help students prepare for examinations.
- Summarise academic topics.
- Provide clear, step-by-step explanations.

Guidelines:
- Be accurate, patient, encouraging and educational.
- Use examples where helpful.
- Break complicated explanations into smaller steps.
- Never invent academic facts.
- If you are uncertain, say so.
- Do not simply give answers when teaching; help students understand why.
- Keep responses organised and easy to read.`
                        }]
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1200
                    }
                })
            }
        );

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error("Gemini API error:", data.error?.message);

            return res.status(502).json({
                error: "The AI service could not process your request. Please try again."
            });
        }

        const reply = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!reply) {
            return res.status(502).json({
                error: "The AI could not generate a response. Please try again."
            });
        }

        return res.status(200).json({
            reply
        });

    } catch (error) {
        console.error("LearnSphere AI error:", error.message);

        return res.status(500).json({
            error: "Something went wrong. Please try again."
        });
    }
}