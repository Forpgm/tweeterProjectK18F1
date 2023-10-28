import express from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

export const validate = (validations: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await validations.run(req)

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    const errorObjects = errors.mapped()
    const entityError = new EntityError({ errors: {} })

    for (const key in errorObjects) {
      //đi qua từng lỗi và lấy msg ra xem
      const { msg } = errorObjects[key]
      //nếu lỗi đặc biệt do mình tạo ra khác 422 thì mình next cho defaultErrorHandler xử lí
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      //nếu kp lỗi đặc biệc thì chắc chắn là 422
      //thì mình lưu vào entityError
      entityError.errors[key] = msg
    }
    //sau khi duyệt xong thì ném cho defaultErrorHandler xử lí
    next(entityError)
  }
}
