import { Request, Response, NextFunction, RequestHandler } from 'express'

export const wrapAsync =
  <P>(func: RequestHandler<P>) =>
  async (req: Request<P>, res: Response, next: NextFunction) => {
    try {
      func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
