import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);

  async transcribe(localAudioPath: string, outputDir: string, jobId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPrefix = path.join(outputDir, jobId);
      const whisperPath = './build/bin/whisper-cli';
      const modelPath = './models/ggml-base.en.bin';

      let spawnCmd = whisperPath;
      let args = [
        '-m', modelPath,
        '-f', localAudioPath,
        '--output-json',
        '-of', outputPrefix
      ];

      this.logger.log(`Starting Whisper transcription for ${localAudioPath}`);

      const whisperProcess = spawn(spawnCmd, args, {
        cwd: '/whisper.cpp',
      });

      whisperProcess.stderr.on('data', (data) => {
        this.logger.log(`Whisper stderr: ${data.toString().trim()}`);
      });

      whisperProcess.stdout.on('data', (data) => {
        this.logger.log(`Whisper stdout: ${data.toString().trim()}`);
      });

      whisperProcess.on('close', (code) => {
        if (code === 0) {
          const expectedJsonPath = `${outputPrefix}.json`;
          if (fs.existsSync(expectedJsonPath)) {
            this.logger.log(`Whisper transcription completed successfully: ${expectedJsonPath}`);
            resolve(expectedJsonPath);
          } else {
            reject(new Error(`Transcriptions finished with code 0 but JSON not found: ${expectedJsonPath}`));
          }
        } else {
          this.logger.error(`Whisper transcription failed with code ${code}`);
          reject(new Error(`Whisper process exited with code ${code}`));
        }
      });

      whisperProcess.on('error', (err) => {
        this.logger.error(`Failed to start Whisper process: ${err.message}`);
        reject(err);
      });
    });
  }
}
