import { NextFunction, Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { RegisterReqBody } from '~/models/requests/User.request'
export const loginController = async (req: Request, res: Response) => {
  //vào req lấy user ra, và lấy _id của user đó
  const { user }: any = req
  const user_id = user._id //objectId
  //dùng cái user_id đó tạo access_token và refresh_token
  const result = await usersService.login(user_id)
  //nếu k bug thì thành công luông
  return res.json({
    message: 'login successfully',
    result
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  //tạo 1 user mới và bỏ vào collection users trong database
  const result = await usersService.register(req.body)
  res.json({
    message: 'register successfully',
    result: result
  })
}
