import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.request'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { config } from 'dotenv'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { Follower } from '~/models/schemas/Followers.schema'
import { has } from 'lodash'
import axios from 'axios'
import { log } from 'console'
config()
class UsersService {
  private decodeRefreshToken(refresh_token: string) {
    return verifyToken({
      token: refresh_token,
      secretOrPublickey: process.env.JWT_SECRET_REFRESH_TOKEN as string
    })
  }

  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken, verify },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN as string },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
    })
  }

  private signRefreshToken({ user_id, verify, exp }: { user_id: string; verify: UserVerifyStatus; exp?: number }) {
    if (exp) {
      return signToken({
        payload: { user_id, token_type: TokenType.RefreshToken, verify, exp },
        privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
      })
    } else {
      return signToken({
        payload: { user_id, token_type: TokenType.RefreshToken, verify },
        options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN },
        privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
      })
    }
  }

  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken, verify },
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
    })
  }
  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken, verify },
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
    })
  }

  private signAccessTokenAndRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify })])
  }

  async register(payLoad: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    const result = await databaseService.users.insertOne(
      new User({
        ...payLoad,
        _id: user_id,
        email_verify_token,
        username: `user${user_id.toString()}`,
        date_of_birth: new Date(payLoad.date_of_birth),
        password: hashPassword(payLoad.password)
      })
    )

    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    const { exp, iat } = await this.decodeRefreshToken(refresh_token)
    //lưu refresh token vào database
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id),
        exp,
        iat
      })
    )
    //giả lập gửi mail cái email_verify_token này cho user
    console.log(email_verify_token)
    return { access_token, refresh_token }
  }

  async checkEmailExist(email: string) {
    //vào database và tìm user có email này
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    //dùng cái user_id tạo access và refresh token
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
      user_id,
      verify
    })
    const { exp, iat } = await this.decodeRefreshToken(refresh_token)
    //lưu refresh token vào database
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id),
        exp,
        iat
      })
    )
    return { access_token, refresh_token }
  }

  async logout(refresh_token: string) {
    //dùng refresh_token tìm và xóa
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return {
      message: USERS_MESSAGES.LOGOUT_SUCCESS
    }
  }
  async verifyEmail(user_id: string) {
    //tạo access và refresh token gửi cho client và lưu vào database
    //đồng thười tim user và update lại email_verify_token thành '', verify: 1, updateAt
    const [token] = await Promise.all([
      this.signAccessTokenAndRefreshToken({ user_id, verify: UserVerifyStatus.Verified }),
      databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified,
            updated_at: '$$NOW'
          }
        }
      ])
    ])

    //destructuring token
    const [access_token, refresh_token] = token
    const { exp, iat } = await this.decodeRefreshToken(refresh_token)
    //lưu vào db
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id),
        exp,
        iat
      })
    )
    return { access_token, refresh_token }
  }

  async resendEmailVerify(user_id: string) {
    //tạo email_verify_token mới
    const email_verify_token = await this.signEmailVerifyToken({ user_id, verify: UserVerifyStatus.Unverified })
    //update lại email_verify_token mới vào DB
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    //giả lập gửi mail
    console.log(email_verify_token)
    return {
      message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS
    }
  }
  async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    //tạo ra forgot_password_token mới
    const forgot_password_token = await this.signForgotPasswordToken({ user_id, verify })
    //update lại user bằng forgot_password_token mới và update_at vào DB
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token,
          updated_at: '$$NOW'
        }
      }
    ])
    //giả lập gửi mail cái forgot_password_token này cho user đó
    console.log('forgot_password_token: ', forgot_password_token)
    //thông báo là gửi thành công
    return {
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    }
  }
  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    //dùng user_id đps để tìm user và update lại pwd
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token: '',
          password: hashPassword(password),
          updated_at: '$$NOW'
        }
      }
    ])
    return {
      message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
    }
  }

  async getMe(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return user
  }
  async updateMe(user_id: string, payLoad: UpdateMeReqBody) {
    //dùng user_id đó để tìm user và update lại password
    const _payload = payLoad.date_of_birth ? { ...payLoad, date_of_birth: new Date(payLoad.date_of_birth) } : payLoad
    //tiến hành update
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      [
        {
          $set: {
            ...payLoad,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return user.value
  }
  async getProfile(username: string) {
    const user = await databaseService.users.findOne(
      { username },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          verify: 0,
          created_at: 0,
          update_at: 0
        }
      }
    )
    if (!user) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    return user
  }

  async follow(user_id: string, followed_user_id: string) {
    //kiểm tra xem đã follow hay chưa
    const isFollowed = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    //nếu đã follow thì return message là đã follow
    if (isFollowed != null) {
      return {
        message: USERS_MESSAGES.FOLLOWED //
      }
    }
    //chưa thì thêm 1 document vào collection followers
    await databaseService.followers.insertOne(
      new Follower({
        user_id: new ObjectId(user_id),
        followed_user_id: new ObjectId(followed_user_id)
      })
    )
    return {
      message: USERS_MESSAGES.FOLLOW_SUCCESS //trong message.ts thêm   FOLLOW_SUCCESS: 'Follow success'
    }
  }

  async unfollow(user_id: string, followed_user_id: string) {
    //kiem tra xem minh da follow chua
    const isFollowed = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })

    if (!isFollowed) {
      return {
        message: USERS_MESSAGES.ALREADY_UNFOLLOWED
      }
    }

    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })

    return {
      message: USERS_MESSAGES.UNFOLLOW_SUCCESS
    }
  }

  async changePassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      [
        {
          $set: {
            password: hashPassword(password),
            forgot_password_token: '',
            updated_at: '$$NOW'
          }
        }
      ]
    )
    return {
      message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
    }
  }

  async refreshToken({
    user_id,
    verify,
    refresh_token,
    exp
  }: {
    user_id: string
    verify: UserVerifyStatus
    refresh_token: string
    exp: number
  }) {
    //tạo ra access_token va refresh_token moi
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify, exp })
    ])
    const { iat } = await this.decodeRefreshToken(refresh_token)
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: new_refresh_token, exp, iat })
    )
    return { access_token, refresh_token: new_refresh_token }
  }

  //getOAuthGoogleToken dùng code nhận được để yêu cầu gg tạo id_token
  private async getOAuthGoogleToken(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    }
    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return data as {
      access_token: string
      id_token: string
    }
  }

  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    })
    return data as {
      id: string
      email: string
      email_verified: boolean
      name: string
      given_name: string
      family_name: string
      locale: string
    }
  }

  async oAuth(code: string) {
    const { access_token, id_token } = await this.getOAuthGoogleToken(code)
    const userInfor = await this.getGoogleUserInfo(access_token, id_token)
    //kiểm tra xem email đã verify hay chưa
    if (!userInfor.email_verified) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.EMAIL_NOT_VERIFIED,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }
    //kiểm tra xem email đã tồn tại trong database hay chưa
    const user = await databaseService.users.findOne({ email: userInfor.email })
    //nếu có thì nghĩa là client đăng nhập
    if (user) {
      const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
        user_id: user._id.toString(),
        verify: user.verify
      })
      //lưu refresh token vào database
      const { exp, iat } = await this.decodeRefreshToken(refresh_token)
      await databaseService.refreshTokens.insertOne(
        new RefreshToken({
          user_id: new ObjectId(user._id),
          token: refresh_token,
          exp,
          iat
        })
      )
      return { access_token, refresh_token, new_user: 0, verify: user.verify }
    } else {
      const password = Math.random().toString(36).slice(1, 15)
      const data = await this.register({
        email: userInfor.email,
        name: userInfor.name,
        password,
        confirm_password: password,
        date_of_birth: new Date().toISOString()
      })
      return {
        ...data,
        new_user: 1,
        verify: UserVerifyStatus.Unverified
      }
    }
  }
}

const usersService = new UsersService()
export default usersService
