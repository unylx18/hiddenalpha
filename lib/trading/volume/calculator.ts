export type VolumeAnalysis = {
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  condition: "HIGH" | "NORMAL" | "LOW";
};

export function calculateVolumeAnalysis(
  volumes: number[],
  period: number = 20
): VolumeAnalysis {
  if (volumes.length === 0) {
    throw new Error("No volume data available");
  }

  const currentVolume = volumes[volumes.length - 1];

  const startIndex = Math.max(
    0,
    volumes.length - period - 1
  );

  const referenceVolumes = volumes.slice(
    startIndex,
    volumes.length - 1
  );

  if (referenceVolumes.length === 0) {
    return {
      currentVolume,
      averageVolume: currentVolume,
      volumeRatio: 1,
      condition: "NORMAL",
    };
  }

  const averageVolume =
    referenceVolumes.reduce(
      (sum, volume) => sum + volume,
      0
    ) / referenceVolumes.length;

  const volumeRatio =
    averageVolume === 0
      ? 0
      : currentVolume / averageVolume;

  let condition: VolumeAnalysis["condition"] =
    "NORMAL";

  if (volumeRatio >= 1.5) {
    condition = "HIGH";
  } else if (volumeRatio <= 0.7) {
    condition = "LOW";
  }

  return {
    currentVolume,
    averageVolume,
    volumeRatio,
    condition,
  };
}