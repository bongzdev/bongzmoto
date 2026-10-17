// BongzMoto AI Transcription Service Interface & Provider
// Safe, optional boundary: Core app functions 100% without external AI credentials.

export interface TranscriptionResult {
  rawTranscript: string;
  structured?: {
    issue: string;
    checks: string;
    findings: string;
    nextSteps: string;
  };
}

export interface ITranscriptionService {
  isConfigured(): boolean;
  transcribe(audioBuffer: Buffer, mimeType: string, filename: string): Promise<TranscriptionResult>;
}

export class ConfigurableTranscriptionService implements ITranscriptionService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async transcribe(audioBuffer: Buffer, mimeType: string, filename: string): Promise<TranscriptionResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'AI transcription service is not configured. Set OPENAI_API_KEY in your environment or .env file to enable automated speech-to-text.'
      );
    }

    try {
      // Create FormData with audio file blob
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append('file', blob, filename || 'voicenote.webm');
      formData.append('model', 'whisper-1');
      // Prompt Whisper with common South African automotive vocabulary
      formData.append(
        'prompt',
        'South African mechanic audio. Car parts: brake pads, clutch plate, cv joint, shock absorber, ball joint, alternator, fan belt, starter, gasket. May contain English, isiZulu, Sesotho expressions.'
      );

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        throw new Error(`Whisper API error (${whisperRes.status}): ${errText}`);
      }

      const whisperData = await whisperRes.json();
      const rawTranscript = whisperData.text || '';

      // Structure summary with GPT-4o-mini
      let structured: TranscriptionResult['structured'] | undefined;
      try {
        const summaryRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an assistant for a South African vehicle workshop. 
Extract only factual statements present in the mechanic transcript.
CRITICAL RULES:
- DO NOT invent diagnoses, parts, prices, or customer approvals.
- Keep exact customer descriptions.
- Respond with JSON:
{
  "issue": "Reported issue from transcript",
  "checks": "Checks performed or mentioned",
  "findings": "Physical inspection findings",
  "nextSteps": "Proposed next steps"
}`,
              },
              {
                role: 'user',
                content: `Mechanic voice transcript: "${rawTranscript}"`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (summaryRes.ok) {
          const chatData = await summaryRes.json();
          const parsed = JSON.parse(chatData.choices[0]?.message?.content || '{}');
          structured = {
            issue: parsed.issue || '',
            checks: parsed.checks || '',
            findings: parsed.findings || '',
            nextSteps: parsed.nextSteps || '',
          };
        }
      } catch (sumErr) {
        console.warn('Failed to generate structured summary from transcript:', sumErr);
      }

      return {
        rawTranscript,
        structured,
      };
    } catch (error: any) {
      console.error('Transcription error:', error);
      throw error;
    }
  }
}

export const transcriptionService = new ConfigurableTranscriptionService();
