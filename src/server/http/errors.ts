export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export const notFound = () =>
  new AppError('NOT_FOUND', 404, 'This ticket could not be found.');
