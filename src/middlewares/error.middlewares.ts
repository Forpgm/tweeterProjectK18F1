import { Request, Response, NextFunction } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { omit } from 'lodash'
import { ErrorWithStatus } from '~/models/Errors'

//trong err thì có status và msg
export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi từ các nơi sẽ dồn về đây
  //nếu lỗi nhận được thuộc errorWithStatus thì trả về status và msg
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, ['status']))
  }
  //còn nếu code mà chạy xuống đc đây thì err sẽ là 1 lỗi mặc định
  //err(message, stack, name)
  //stack chứa tất cả thông tin đến lỗi: tên, dòng nào, lỗi gì
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })
  //ném lỗi đó cho người dùng
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfor: omit(err, ['stack'])
  })
}
