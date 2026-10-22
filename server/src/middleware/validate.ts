import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodTypeAny } from 'zod';

/**
 * ============================================================================
 * Type-Safe Zod Validation Middleware Factory
 * ============================================================================
 * 
 * Validates incoming HTTP requests across body, query, and params boundaries.
 * Enforces schema integrity before business logic execution.
 */
export const validateRequest = (schema: AnyZodObject | ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isContainer =
        schema &&
        typeof schema === 'object' &&
        'shape' in schema &&
        ((schema as AnyZodObject).shape.body !== undefined ||
          (schema as AnyZodObject).shape.query !== undefined ||
          (schema as AnyZodObject).shape.params !== undefined);

      if (isContainer) {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      } else {
        const parsedBody = await schema.parseAsync(req.body);
        req.body = parsedBody;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      res.status(500).json({ success: false, error: 'Internal validation error' });
    }
  };
