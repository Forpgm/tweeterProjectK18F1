import { Router } from 'express'
import {
  accessTokenValidator,
  emailVerifyValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middlewares'
import {
  emailVerifyController,
  forgotPasswordController,
  loginController,
  logoutController,
  registerController,
  resendEmailVerifyController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers'
import { wrapAsync } from '~/utils/handlers'
const usersRouter = Router()

usersRouter.get('/login', loginValidator, wrapAsync(loginController))

usersRouter.post('/register', registerValidator, wrapAsync(registerController))

/*
des: đăng xuất
path: /users/logout
method: POST
Header: {Authorization: 'Bearer <access_token>'}
body: {refresh_token: string}
*/
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

/*
des: verify email
khi người dùng đăng kí, trong email của họ sẽ có 1 link
trong link này đã setup sẵn 1 req kèm email_verify_token
thì verifyーemail là cái route cho req đó
method: POST
path: /users/verify-email
body: {email_verify_token: string}
*/
usersRouter.post('/verify-email', emailVerifyValidator, wrapAsync(emailVerifyController))

/*
des: resend email verify token
khi mail thất lạc, hoặc email_verify_token bị hết hạn thì người dùng 
có nhu cầu resend email_verify_token
method: POST
path: /users/resend-email-verify-token
headers: {Authorization: "Bearer <access_token>"}  đăng nhập mới được resend
body: {}
*/
usersRouter.post('/resend-email-verify', accessTokenValidator, wrapAsync(resendEmailVerifyController))

/*
des: forgot pwd
khi người dùng quên mật khẩu, họ cung cấp email cho mình
mình sẽ xem có user nào sở hữu email đó không, nếu có thì mình sẽ
tạo 1 forgot_password_token và gửi vào email của user đó
method: POST
path: /users/forgot-password
body: {email: string} 
*/
usersRouter.post('/forgot-password', forgotPasswordValidator, wrapAsync(forgotPasswordController))

/*
des: verify forgot pwd
khi người dùng nhấp vào link trong email để reset password
họ sẽ gửi 1 req kèm theo forgot_password_token lên server
server sẽ kiểm tra forgot_password_token có hợp lệ hay không
sau đó chuyển hướng người dùng đến trang reset password
method: POST
path: /users/verify-forgot-password
body: {forgot-password-token: string} 
*/

usersRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordTokenValidator,
  wrapAsync(verifyForgotPasswordController)
)
export default usersRouter
