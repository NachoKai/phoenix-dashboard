import type { Request, Response } from 'express';

export async function aiQaHandler(_req: Request, res: Response) {
  res.status(501).json({
    error: 'AI Q&A widget is not yet implemented',
    message: 'This endpoint is stubbed for future LLM integration',
  });
}
