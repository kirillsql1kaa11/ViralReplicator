/**
 * Video recording and snapshot export for social media content creation.
 */

export class MediaExporter {
  constructor(canvas, vm, strainRegistry) {
    this.canvas = canvas;
    this.vm = vm;
    this.strainRegistry = strainRegistry;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingTimer = null;
  }

  startRecording(durationSeconds = 5, onStatusChange) {
    if (this.isRecording) return;

    try {
      const stream = this.canvas.captureStream(30); // 30 FPS
      this.recordedChunks = [];

      const options = { mimeType: 'video/webm; codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        delete options.mimeType;
      }

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (onStatusChange) onStatusChange('ready');
        this.downloadVideo();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      if (onStatusChange) onStatusChange('recording');

      // Auto stop after duration
      this.recordingTimer = setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
      }, durationSeconds * 1000);

    } catch (err) {
      console.error('Recording failed to start', err);
      if (onStatusChange) onStatusChange('error');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      clearTimeout(this.recordingTimer);
      this.mediaRecorder.stop();
    }
  }

  downloadVideo() {
    if (this.recordedChunks.length === 0) return;
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corewar-viral-evolution-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportSnapshot() {
    // Generate high-res 1024x1024 composite snapshot with cyber frame
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1024;
    exportCanvas.height = 1024;
    const ctx = exportCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw memory canvas scaled up
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 64, 96, 896, 896);

    // Decorative grid border
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(63, 95, 898, 898);

    // Header text
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('CORE WAR // VIRAL MEMORY REPLICATOR', 64, 52);

    // Subtitle & stats
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8e9aac';
    const stats = `CYCLES: ${this.vm.cycleCount} | ACTIVE STRAINS: ${this.strainRegistry.strains.size} | POPULATION: ${this.vm.processes.length}`;
    ctx.fillText(stats, 64, 76);

    // Download PNG
    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `corewar-evolution-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
