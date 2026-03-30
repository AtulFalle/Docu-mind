import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';

export interface AudioConfig {
  channels: number; // mono = 1
  sampleRate: number; // 16000Hz
  codec: string; // pcm_s16le
}

@Injectable()
export class AudioProcessor {
  private readonly logger = new Logger(AudioProcessor.name);
  private readonly defaultConfig: AudioConfig = {
    channels: 1,
    sampleRate: 16000,
    codec: 'pcm_s16le',
  };

  constructor(private configService: ConfigService) {}

  /**
   * Extract audio from video file and convert to WAV using FFmpeg CLI
   * @param inputPath - Full path to input video file
   * @param outputPath - Full path to output audio file
   * @param audioConfig - Audio extraction config (optional, uses defaults)
   */
  async extractWavAudio(
    inputPath: string,
    outputPath: string,
    audioConfig?: AudioConfig,
  ): Promise<void> {
    const config = { ...this.defaultConfig, ...audioConfig };

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      this.logger.debug(
        `Starting audio extraction from ${inputPath} to ${outputPath}`,
      );

      // FFmpeg command arguments
      const args = [
        '-i',
        inputPath,
        '-vn', // disable video stream
        '-acodec',
        config.codec,
        '-ar',
        config.sampleRate.toString(),
        '-ac',
        config.channels.toString(),
        '-y', // overwrite output file without asking
        outputPath,
      ];

      this.logger.debug(`FFmpeg command: ffmpeg ${args.join(' ')}`);

      // Get FFmpeg path from config, fallback to 'ffmpeg' or 'ffmpeg.exe'
      const ffmpegPath = this.configService.get<string>('FFMPEG_PATH') ||
        (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

      const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'ignore', 'pipe'], // ignore stdin/stdout, capture stderr
      });

      let stderrOutput = '';
      let lastLogTime = startTime;

      // Capture stderr for logging
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderrOutput += output;

        // Log progress or important messages
        if (output.includes('Duration:') || output.includes('frame=')) {
          const now = Date.now();
          // Only log every 2 seconds to avoid spam
          if (now - lastLogTime > 2000) {
            this.logger.debug(`FFmpeg progress: ${output.trim().split('\n').pop()}`);
            lastLogTime = now;
          }
        }

        // Log errors immediately
        if (
          output.toLowerCase().includes('error') ||
          output.toLowerCase().includes('failed')
        ) {
          this.logger.warn(`FFmpeg warning: ${output.trim()}`);
        }
      });

      // Handle process exit
      ffmpeg.on('close', (code: number) => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          this.logger.log(
            `Audio extraction completed successfully in ${duration}ms`,
          );
          resolve();
        } else {
          const errorMsg = `FFmpeg exited with code ${code}`;
          this.logger.error(`${errorMsg} after ${duration}ms`);
          this.logger.debug(`FFmpeg stderr: ${stderrOutput}`);
          reject(new Error(errorMsg));
        }
      });

      // Handle process errors (e.g., command not found)
      ffmpeg.on('error', (err: Error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `FFmpeg process error after ${duration}ms: ${err.message}`,
        );
        reject(
          new Error(
            `FFmpeg process error: ${err.message}. Ensure FFmpeg is installed.`,
          ),
        );
      });
    });
  }

  /**
   * Generate unique filename with WAV extension
   */
  generateAudioFileName(baseFileName: string): string {
    const nameWithoutExt = path.basename(
      baseFileName,
      path.extname(baseFileName),
    );
    return `${nameWithoutExt}.wav`;
  }

  /**
   * Validate FFmpeg is installed by checking version
   */
  async validateFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.logger.debug('Validating FFmpeg availability...');
        const ffmpeg = spawn('ffmpeg', ['-version']);

        let versionOutput = '';
        ffmpeg.stdout.on('data', (data: Buffer) => {
          versionOutput += data.toString();
        });

        ffmpeg.on('close', (code: number) => {
          if (code === 0 && versionOutput.includes('ffmpeg version')) {
            this.logger.log('FFmpeg is available');
            resolve(true);
          } else {
            this.logger.warn('FFmpeg not available in system PATH');
            resolve(false);
          }
        });

        ffmpeg.on('error', (err: Error) => {
          this.logger.warn(`FFmpeg availability check failed: ${err.message}`);
          resolve(false);
        });
      } catch (error) {
        this.logger.warn('FFmpeg availability check failed', error);
        resolve(false);
      }
    });
  }
}
