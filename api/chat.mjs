export default async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    try {
        // Get Gemini API key from Vercel environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "AI service is not configured."
            });
        }

        // Get request data
        const { message, history = [] } = req.body || {};

        // Validate user message
        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.length > 5000
        ) {
            return res.status(400).json({
                error: "Please provide a valid message (maximum 5,000 characters)."
            });
        }

        // Validate conversation history
        if (!Array.isArray(history) || history.length > 12) {
            return res.status(400).json({
                error: "Invalid conversation history."
            });
        }

        // Prepare conversation contents
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
                parts: [
                    {
                        text: item.text
                    }
                ]
            });
        }

        // Add the latest user message
        contents.push({
            role: "user",
            parts: [
                {
                    text: message.trim()
                }
            ]
        });

        // LearnSphere AI system instructions
        const systemInstruction = `
You are LearnSphere AI, a friendly, intelligent and patient personal learning assistant for students using LearnSphere Nigeria.

YOUR PERSONALITY:
- Be friendly, natural, conversational and encouraging.
- Communicate like a helpful human tutor.
- Be respectful, patient and professional.
- Avoid sounding robotic or unnecessarily formal.
- Make students feel comfortable asking questions.

CONVERSATION RULES:
- When a student says "hello", "hi", "hey" or another simple greeting, respond with a short, warm greeting.
- Example: "Hello! 👋 What are we learning today?"
- Do not give a long introduction when greeting students.
- Do not repeatedly introduce yourself.
- Do not list all your capabilities unless the student asks.
- Keep simple conversations short and natural.
- Remember the context of the current conversation and respond accordingly.
- Ask relevant follow-up questions when necessary.

ACADEMIC SUPPORT:
You help students with:
- Mathematics and further mathematics.
- English language and communication.
- Physics, chemistry and biology.
- Economics, government and other school subjects.
- Computer science and information technology.
- Programming languages such as HTML, CSS, JavaScript and Python.
- Examination preparation for WAEC, JAMB and NECO.
- Practice questions, quizzes and assignments.
- Topic summaries and revision notes.

TEACHING GUIDELINES:
- Explain difficult concepts using simple language.
- Break complicated topics into smaller steps.
- Teach from the basics when a student does not understand a topic.
- Use practical examples where helpful.
- Explain why an answer is correct.
- When solving mathematics, show the calculation steps clearly.
- When teaching programming, explain the code and how it works.
- Encourage students to attempt questions themselves.
- Never invent academic facts.
- If you are uncertain, acknowledge it honestly.
- Adapt your explanations to the student's level.

RESPONSE FORMATTING:
- Use headings when they improve readability.
- Use bullet points for organised explanations.
- Use numbered steps for procedures and calculations.
- Format code using code blocks.
- Avoid unnecessarily long responses.
- Do not repeat information the student already understands.
- Give direct answers when the student asks straightforward questions.

IMPORTANT BEHAVIOUR:
- Do not claim to be a human.
- Do not pretend to know a student's personal information.
- Do not provide misleading academic information.
- Do not turn every conversation into an examination lesson.
- Be supportive when students are struggling.
- Celebrate genuine learning progress.

YOUR MISSION:
Help every LearnSphere student learn effectively, understand difficult subjects, practise confidently and improve academically.
`;

        // Send request to Gemini
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
                        parts: [
                            {
                                text: systemInstruction
                            }
                        ]
                    },

                    contents,

                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1200
                    }
                })
            }
        );

        // Read Gemini response
        const data = await geminiResponse.json();

        // Handle Gemini API errors
        if (!geminiResponse.ok) {
            console.error(
                "Gemini API error:",
                data.error?.message
            );

            return res.status(502).json({
                error: "The AI service could not process your request. Please try again."
            });
        }

        // Extract generated response
        const reply = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        // Handle empty responses
        if (!reply) {
            return res.status(502).json({
                error: "The AI could not generate a response. Please try again."
            });
        }

        // Return successful response
        return res.status(200).json({
            reply
        });

    } catch (error) {
        console.error(
            "LearnSphere AI error:",
            error.message
        );

        return res.status(500).json({
            error: "Something went wrong. Please try again."
        });
    }
}