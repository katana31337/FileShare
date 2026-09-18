import { customAlphabet } from 'nanoid';

/**
 * Short Link Service - Single Responsibility Principle
 * Responsible for generating and managing short identifiers.
 * Uses only alphanumeric characters (no ambiguous characters like 0, O, I, l, 1)
 */
export class ShortLinkService {
  // Safe alphabet without ambiguous characters: 0, O, I, l, 1
  private readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  private readonly ID_LENGTH = 8;
  private readonly customNanoid = customAlphabet(this.ALPHABET, this.ID_LENGTH);

  generate(): string {
    return this.customNanoid();
  }

  generateCustom(length: number = this.ID_LENGTH): string {
    const customGenerator = customAlphabet(this.ALPHABET, length);
    return customGenerator();
  }

  isValid(id: string): boolean {
    const regex = /^[A-Za-z0-9]{4,20}$/;
    return regex.test(id);
  }
}

export const shortLinkService = new ShortLinkService();
export default ShortLinkService;
