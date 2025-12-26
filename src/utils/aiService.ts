import { MOCK_AI_RESPONSES } from '../constants';
import type { Attachment } from '../types';

export const generateAIContent = async (
  mode: string,
  prompt: string,
  apiKey: string,
  attachment: Attachment | null = null
): Promise<any> => {
  if (!apiKey || apiKey === 'demo') {
    await new Promise(r => setTimeout(r, 1000));
    if (mode === 'explain') return MOCK_AI_RESPONSES.explain;
    if (mode === 'quiz') return MOCK_AI_RESPONSES.quiz;
    if (mode === 'decompose') return MOCK_AI_RESPONSES.decompose;
    if (mode === 'brainstorm') return MOCK_AI_RESPONSES.brainstorm;
    if (mode === 'enhance') return MOCK_AI_RESPONSES.enhance;
    if (mode === 'flow') return MOCK_AI_RESPONSES.flow;
    return [];
  }

  try {
    let userPrompt = "";
    let contextMessage = "";

    // If attachment exists, add it to context
    if (attachment) {
      if (attachment.fileType === 'text') {
        contextMessage = `\n\n[Attached File Content]:\n${attachment.content}\n\n`;
      } else if (attachment.fileType === 'image') {
        contextMessage = `\n\n[Attached Image] Analyze this image content.`;
      }
    }

    if (mode === 'explain') {
      userPrompt = `Explain the concept or content found here clearly: "${prompt}"${contextMessage}`;
    } else if (mode === 'quiz') {
      userPrompt = `Generate 3 short quiz questions (with answers in parentheses) based on this content: "${prompt}"${contextMessage}. Return ONLY a JSON array of strings.`;
    } else if (mode === 'enhance') {
      userPrompt = `Rewrite, improve, and expand upon this content: "${prompt}"${contextMessage}`;
    } else if (mode === 'flow') {
      userPrompt = `Create a structured study plan for: "${prompt}". Return a JSON object with a "steps" array (id, title, type, description, dependsOn). Create 5 steps. No markdown.`;
    } else {
      userPrompt = `Generate 3 related sub-topics or tasks for: "${prompt}"${contextMessage}. Return ONLY a JSON array of strings. No markdown.`;
    }

    // Construct parts payload
    const parts = [{ text: userPrompt }];
    
    // Add Image Part if exists
    if (attachment && attachment.fileType === 'image' && attachment.url) {
      const base64Data = attachment.url.split(',')[1];
      const mimeType = attachment.url.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: parts }] })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Unknown API Error");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (mode === 'explain' || mode === 'enhance') return text;

    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(cleanText);
      return mode === 'flow' ? (json.steps || json) : json;
    } catch (e) {
      console.warn("JSON parse error", e);
      return mode === 'flow' ? [] : text.split('\n').filter(l => l.length > 0);
    }
  } catch (error) {
    console.error("AI Request Failed", error);
    throw error; 
  }
};

export const generateChatResponse = async (
  userQuery: string,
  visibleNodesContext: string,
  apiKey: string
): Promise<string> => {
  if (!apiKey || apiKey === 'demo') {
    await new Promise(r => setTimeout(r, 1500));
    return "Based on the visible nodes in your flow, I can see connections between different concepts. However, please set up your API key in Settings to get detailed responses about your specific content.";
  }

  try {
    const systemPrompt = `You are an AI assistant helping a user understand their learning flow. You have access to the text content of all currently visible nodes on their canvas. Analyze the relationships, concepts, and content across these nodes to provide helpful, context-aware answers.

Visible Nodes Context:
${visibleNodesContext}

User Question: ${userQuery}

Please provide a clear, helpful answer based on the visible nodes' content. If the question relates to specific nodes, reference them by their titles or content. Be concise but thorough.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ 
          parts: [{ text: systemPrompt }] 
        }] 
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Unknown API Error");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";
    return text;
  } catch (error) {
    console.error("Chat Request Failed", error);
    throw error;
  }
};