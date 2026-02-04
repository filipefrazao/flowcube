'use client';
import { useState, useCallback } from 'react';

interface UseAIStreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

export function useAIStream(options?: UseAIStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullText, setFullText] = useState('');

  const stream = useCallback(async (url: string, data: any) => {
    setIsStreaming(true);
    setError(null);
    setFullText('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                setError(parsed.error);
                setIsStreaming(false);
                options?.onError?.(parsed.error);
                return null;
              }
              
              if (parsed.done) {
                setIsStreaming(false);
                options?.onComplete?.(accumulated);
                return accumulated;
              }
              
              if (parsed.chunk) {
                accumulated += parsed.chunk;
                setFullText(accumulated);
                options?.onChunk?.(parsed.chunk);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      return accumulated;
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred';
      setError(errorMessage);
      setIsStreaming(false);
      options?.onError?.(errorMessage);
      return null;
    }
  }, [options]);

  return {
    stream,
    isStreaming,
    error,
    fullText
  };
}
