import { Router } from 'express'
import { createBookmarkController } from '~/controllers/bookmarks.controllers'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'
const bookmarksRouter = Router()
bookmarksRouter.post('/', accessTokenValidator, verifiedUserValidator, wrapAsync(createBookmarkController))
export default bookmarksRouter
