import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterReqBody } from '~/models/requests/User.request'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enums'
import { config } from 'dotenv'
config()
class UsersService {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }

  async register(payLoad: RegisterReqBody) {
    const result = await databaseService.users.insertOne(
      new User({
        ...payLoad,
        date_of_birth: new Date(payLoad.date_of_birth),
        password: hashPassword(payLoad.password)
      })
    )
    //lấy user_id từ acccount vừa tạo
    const user_id = result.insertedId.toString()
    //từ user_id tạo ra 1 access token và 1 refresh token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])

    return result
  }
  async checkEmailExist(email: string) {
    //vào database và tìm user có email này
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }
}

const usersService = new UsersService()
export default usersService
