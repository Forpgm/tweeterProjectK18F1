//tweets.routes.ts
import { Router } from 'express'
import { createTweetController } from '~/controllers/Tweets.controllers'

import { createTweetValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'

const tweetsRouter = Router()

//lam route tao tweet
/*
des: lam route tao tweet
method: POST
path: /tweets
headers: {Authorization: Bearer <access_token>}
phai verify account thi moi tao duoc tweet duoc
body: TweetRequestBody
*/
tweetsRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  createTweetValidator,
  wrapAsync(createTweetController)
)
export default tweetsRouter
