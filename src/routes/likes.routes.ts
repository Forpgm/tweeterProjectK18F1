import { Router } from 'express'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'
import { likeTweetController, unlikeTweetController } from '~/controllers/likes.controllers'
const likeRoutes = Router()

likeRoutes.post(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapAsync(likeTweetController)
)
likeRoutes.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapAsync(unlikeTweetController)
)
export default likeRoutes
