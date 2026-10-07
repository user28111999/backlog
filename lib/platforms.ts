export const platformOptions = [
  "PC",
  "Linux",
  "Switch",
  "Nintendo Switch",
  "PS5",
  "PS4",
  "PS3",
  "PS2",
  "PlayStation",
  "Xbox Series X",
  "Xbox One",
  "Xbox 360",
  "Xbox",
  "Steam Deck",
  "PS Vita",
  "PlayStation Vita",
  "PSP",
  "3DS",
  "Nintendo DS",
  "DS",
  "NDS",
  "Wii U",
  "Wii",
  "GameCube",
  "N64",
  "SNES",
  "NES",
  "GBA",
  "Game Boy",
  "Dreamcast",
  "Mega Drive II",
  "Arcade",
  "3DO",
  "Atari 2600",
  "Commodore 64",
  "DOS",
  "PC-88",
  "V-Smile",
  "Android",
  "iOS",
  "Java ME",
  "Oculus Quest",
];

export function splitPlatforms(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((p) => p.trim())
    .filter((p) => {
      if (!p || seen.has(p.toLowerCase())) return false;
      seen.add(p.toLowerCase());
      return true;
    });
}
