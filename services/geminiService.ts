import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Safely initialize the client only if key exists, otherwise we handle errors gracefully in calls
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const enhanceCardDescription = async (title: string, currentDesc: string): Promise<string> => {
  if (!ai) throw new Error("API Key missing");

  try {
    const prompt = `
      Você é um gerente de produto especialista. 
      Refine a seguinte descrição de cartão Kanban para ser mais acionável, clara e concisa.
      Mantenha o tom profissional, mas simples. Responda em Português do Brasil.
      
      Título do Cartão: ${title}
      Descrição Atual: ${currentDesc || "Nenhuma descrição fornecida."}
      
      Retorne APENAS o texto da descrição refinada, sem blocos de código markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const suggestSubtasks = async (title: string, description: string): Promise<string> => {
  if (!ai) throw new Error("API Key missing");

  try {
    const prompt = `
      Com base na tarefa a seguir, sugira uma lista de verificação de 3 a 5 subtarefas para concluí-la.
      Formate como uma lista simples com marcadores. Responda em Português do Brasil.

      Tarefa: ${title}
      Detalhes: ${description}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};