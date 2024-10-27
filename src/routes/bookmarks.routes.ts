import { Router } from 'express'
import { createBookmarkController, unbookmarkController } from '~/controllers/bookmarks.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'
const bookmarksRouter = Router()
bookmarksRouter.post('/', accessTokenValidator, verifiedUserValidator, wrapAsync(createBookmarkController))
bookmarksRouter.delete(
  '/tweets/:id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapAsync(unbookmarkController)
)
export default bookmarksRouter
