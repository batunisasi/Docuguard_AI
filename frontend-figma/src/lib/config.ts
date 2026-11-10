/** Prototype configuration. The product spec sets no file-size limit, so none is enforced by default. */
export const config = {
  /** Set a number of bytes to enforce a technical upload limit; null = no limit. */
  maxFileBytes: null as number | null,
  acceptedExtensions: ['pdf', 'docx'] as const,
}
