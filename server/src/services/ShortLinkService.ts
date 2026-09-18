import { nanoid } from 'nanoid';

/**
 * Short Link Service - Single Responsibility Principle
 * Responsible for generating and managing short identifiers.
 */
export class ShortLinkService {
  private readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  private readonly ID_LENGTH = 8;

  generate(): string {
    return nanoid(this.ID_LENGTH);
  }

  generateCustom(length: number = this.ID_LENGTH): string {
    return nanoid(length);
  }

  isValid(id: string): boolean {
    const regex = /^[A-Za-z0-9]{4,20}$/;
    return regex.test(id);
  }
}

export const shortLinkService = new ShortLinkService();
export default ShortLinkService;
