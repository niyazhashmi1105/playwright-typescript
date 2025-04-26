export class PasswordUtils {
    /**
     * Decodes a Base64 encoded password
     * @param encodedPassword The Base64 encoded password string
     * @returns The decoded password
     */
    static decodePassword(encodedPassword: string): string {
        return Buffer.from(encodedPassword, 'base64').toString();
    }

    /**
     * Encodes a password to Base64
     * @param password The plain text password
     * @returns The Base64 encoded password
     */
    static encodePassword(password: string): string {
        return Buffer.from(password).toString('base64');
    }
}