import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Readable } from 'stream';
import ClamScan from 'clamscan';

interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  file: string;
  date?: string;
}

@Injectable()
export class VirusService implements OnModuleInit {
  private readonly logger = new Logger(VirusService.name);
  private clamscan: ClamScan | null = null;
  private initializationPromise: Promise<void> | null = null;
  private readonly virusScanningEnabled: boolean;

  constructor() {
    this.virusScanningEnabled = process.env.VIRUS_SCANNING_ENABLED !== 'false';
  }

  async onModuleInit(): Promise<void> {
    if (this.virusScanningEnabled) {
      try {
        await this.initializeClamScan();
      } catch (error) {
        this.logger.warn('Virus scanning disabled due to initialization failure. Files will be accepted without virus scanning.');
        this.logger.debug(`ClamAV initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      this.logger.warn('Virus scanning is disabled via VIRUS_SCANNING_ENABLED=false');
    }
  }

  private async initializeClamScan(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeClamScan();
    return this.initializationPromise;
  }

  private async _initializeClamScan(): Promise<void> {
    try {
      this.logger.log('Initializing ClamAV scanner...');

      const clamscanInstance = new ClamScan();
      this.clamscan = await clamscanInstance.init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: undefined,
        debugMode: false,
        fileList: undefined,
        scanRecursively: false,
        clamscan: {
          path: '/usr/bin/clamscan',
          db: undefined,
          scanArchives: true,
          active: true
        },
        clamdscan: {
          socket: false,
          host: process.env.CLAMAV_HOST || 'clamav',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
          timeout: 30000,
          localFallback: false,
          path: undefined,
          configFile: undefined,
          active: true
        },
        preference: 'clamdscan'
      });

      this.logger.log('ClamAV scanner initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize ClamAV scanner: ${errorMessage}`);
      this.clamscan = null;
      // Don't throw - let the service continue without virus scanning
    }
  }

  async scan(buffer: Buffer): Promise<boolean> {
    // If virus scanning is disabled, allow all files
    if (!this.virusScanningEnabled) {
      this.logger.debug('Virus scanning disabled - allowing file');
      return true;
    }

    // If ClamAV is not available, allow files but log warning
    if (!this.clamscan) {
      this.logger.warn('ClamAV scanner not available - allowing file without virus scan');
      return true;
    }

    try {
      // Create readable stream from buffer
      const stream = Readable.from(buffer);

      const result: ScanResult = await this.clamscan.scanStream(stream);

      if (result.isInfected) {
        this.logger.warn(`Virus detected: ${result.viruses.join(', ')}`);
        return false;
      }

      this.logger.debug('File scan completed - clean');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Virus scan failed: ${errorMessage}`);

      // For security, block files when scan fails but scanner is available
      // Allow files when scanner is completely unavailable (graceful degradation)
      return false;
    }
  }
}