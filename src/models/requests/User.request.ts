import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'

//định nghĩa những req body | param | query
export interface RegisterReqBody {
  //định nghĩa 1 req body của register trông ntn
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}
//định nghĩa req cho thằng logoutController
export interface LogoutReqBody {
  refresh_token: string
}
export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
}