import express, { Request, Response, NextFunction } from 'express'
import { envConfig, isProduction } from '~/constants/config'
const app = express()
import usersRouter from './routes/users.routes'
import mediasRouter from './routes/medias.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import { initFolder } from './utils/file'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from './constants/dir'
import staticRouter from './routes/static.routes'
import tweetsRouter from './routes/tweets.routes'
import bookmarksRouter from './routes/bookmarks.routes'
import likeRoutes from './routes/likes.routes'
import searchRouter from './routes/search.routes'
import helmet from 'helmet'
import cors, { CorsOptions } from 'cors'
import { rateLimit } from 'express-rate-limit'

const port = envConfig.port

initFolder()
app.use(express.json())

databaseService.connect().then(() => {
  databaseService.indexUsers()
  databaseService.indexRefreshTokens()
  databaseService.indexFollowers()
  databaseService.indexTweets()
})

//route mặc định localhost:3000
app.get('/', (req, res) => {
  res.send('hello world')
})
app.use(helmet())
console.log(isProduction)
const corsOption: CorsOptions = {
  origin: isProduction ? envConfig.clientUrl : '*'
}
app.use(cors(corsOption))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56 // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)
// http://localhost:3000/users/tweets
app.use('/users', usersRouter) //route handler
app.use('/medias', mediasRouter)
app.use('/tweets', tweetsRouter)
app.use('/likes', likeRoutes)
app.use('/bookmarks', bookmarksRouter)
app.use('/search', searchRouter)
// app.use('/static/video', express.static(UPLOAD_VIDEO_DIR))
app.use('/static', staticRouter)

//app sd 1 error handler tổng
app.use(defaultErrorHandler)

app.listen(port, () => {
  console.log(`Project twitter này đang chạy trên post ${port}`)
})
