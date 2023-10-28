import { Request, Response, NextFunction } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { omit } from 'lodash'

//trong err thì có status và msg
export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi từ các nơi sẽ dồn về đây
  console.log('lỗi nè ' + err.message)
  res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(err, ['status']))
}
