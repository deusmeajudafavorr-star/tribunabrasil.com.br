export async function callAIAssistant(payload: {
  action: 'generate_title' | 'summarize' | 'suggest_tags' | 'proofread' | 'generate_draft';
  prompt?: string;
  title?: string;
  content?: string;
  category?: string;
}): Promise<string> {
  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha na resposta do servidor AI');
    }

    const data = await res.json();
    return data.result || '';
  } catch (error: any) {
    console.error('Erro na chamada da AI:', error);
    throw error;
  }
}
