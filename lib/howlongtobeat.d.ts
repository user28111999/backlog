declare module "howlongtobeat-js" {
  export class HowLongToBeat {
    constructor(minSimilarity?: number);
    search(title: string): Promise<Array<{
      gameName: string;
      similarity: number;
      mainStory: number | null;
      mainExtra: number | null;
      completionist: number | null;
    }> | null>;
  }
}
