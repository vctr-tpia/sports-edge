export type PlayerSnapshot = {
  id: string;
  fullName: string;
  countryCode: string | null;
  handedness: "right" | "left" | "unknown";
  birthDate: string | null;
  currentRank: number | null;
  overallElo: number;
  surfaceElos: {
    clay: number;
    hard: number;
    grass: number;
  };
  recentFormIndex: number;
  surfaceWinRate: {
    clay: number;
    hard: number;
    grass: number;
  };
};
