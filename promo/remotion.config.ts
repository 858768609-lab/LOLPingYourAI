import { Config } from '@remotion/cli/config';

// JPEG frames keep renders fast; bt709 tags the H.264 output as limited-range yuv420p (not yuvj420p).
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('angle');
