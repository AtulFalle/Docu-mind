import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  async parse(jsonPath: string): Promise<TranscriptSegment[]> {
    try {
      this.logger.log(`Parsing Whisper JSON output from: ${jsonPath}`);
      const data = await fs.readFile(jsonPath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (!parsed || !parsed.transcription || !Array.isArray(parsed.transcription)) {
        this.logger.warn('JSON does not contain a valid transcription array');
        return [];
      }

      const segments = parsed.transcription.map((segment: any) => {
        let start = segment.timestamps?.from;
        let end = segment.timestamps?.to;
        
        if (typeof start === 'string') {
          start = segment.offsets?.from ?? 0;
        }
        if (typeof end === 'string') {
          end = segment.offsets?.to ?? 0;
        }

        return {
          start: Number(start || 0),
          end: Number(end || 0),
          text: String(segment.text || '').trim()
        };
      });

      return segments;
    } catch (error: any) {
      this.logger.error(`Error parsing Whisper JSON: ${error.message}`);
      throw new Error(`Failed to parse transcript: ${error.message}`);
    }
  }
}
