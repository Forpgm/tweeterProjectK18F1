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
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN as string }
    })
  }

  private signAccessTokenAndRefreshToken(user_id: string) {
    return Promise.all([this.signAccessToken(user_id), this.signRefreshToken(user_id)])
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN as string }
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
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken(user_id)

    return { access_token, refresh_token }
  }
  async checkEmailExist(email: string) {
    //vào database và tìm user có email này
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async login(user_id: string) {
    //dùng cái user_id tạo access và refresh token
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken(user_id)
    //return access và refresh token cho controller
    return { access_token, refresh_token }
  }
}

const usersService = new UsersService()
export default usersService
