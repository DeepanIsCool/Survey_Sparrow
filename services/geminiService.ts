
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you would handle this more gracefully.
  // For this context, we assume the API key is provided.
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const surveySchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise and engaging title for the survey."
    },
    description: {
      type: Type.STRING,
      description: "A brief description of the survey's purpose."
    },
    questions: {
      type: Type.ARRAY,
      description: "An array of question objects for the survey.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "The type of the question.",
            enum: Object.values(QuestionType)
          },
          title: {
            type: Type.STRING,
            description: "The main text of the question."
          },
          description: {
            type: Type.STRING,
            description: "Optional additional details or instructions for the question."
          },
          isRequired: {
            type: Type.BOOLEAN,
            description: "Whether the question must be answered."
          },
          options: {
            type: Type.ARRAY,
            description: "An array of option objects for choice-based questions (single-choice, multiple-choice, dropdown).",
            items: {
              type: Type.OBJECT,
              properties: {
                label: {
                  type: Type.STRING,
                  description: "The text for an option."
                }
              }
            }
          },
          scale: {
            type: Type.INTEGER,
            description: "The maximum value for a rating scale question (e.g., 5 or 10)."
          },
          statements: {
            type: Type.ARRAY,
            description: "For Likert scale questions, the statements to be rated.",
            items: { type: Type.STRING }
          },
          choices: {
            type: Type.ARRAY,
            description: "For Likert scale questions, the choices for rating (e.g., 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree').",
            items: { type: Type.STRING }
          },
          rows: {
            type: Type.ARRAY,
            description: "For Matrix questions, the labels for the rows.",
            items: {
              type: Type.OBJECT,
              properties: { label: { type: Type.STRING } }
            }
          },
          columns: {
            type: Type.ARRAY,
            description: "For Matrix questions, the labels for the columns.",
            items: {
              type: Type.OBJECT,
              properties: { label: { type: Type.STRING } }
            }
          }
        },
        required: ["type", "title", "isRequired"]
      }
    }
  },
  required: ["title", "description", "questions"]
};

export const generateSurveyFromPrompt = async (prompt: string): Promise<{title: string, description: string, questions: Omit<Question, 'id'>[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a detailed survey based on the following topic: "${prompt}". Please include a variety of relevant question types.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: surveySchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);

    // Clean up the generated data to fit our types
    const cleanedQuestions = parsedData.questions.map((q: any) => ({
      ...q,
      options: q.options?.map((opt: {label: string}) => ({ label: opt.label })) || undefined,
      rows: q.rows?.map((row: {label: string}) => ({ label: row.label })) || undefined,
      columns: q.columns?.map((col: {label: string}) => ({ label: col.label })) || undefined,
    }));
    
    return { ...parsedData, questions: cleanedQuestions };

  } catch (error) {
    console.error("Error generating survey with Gemini API:", error);
    throw new Error("Failed to generate survey. Please check your prompt or API key.");
  }
};
