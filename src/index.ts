import express, { Request, Response, NextFunction } from 'express'
const app = express()
import usersRouter from './routes/users.routes'
import mediasRouter from './routes/medias.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import { initFolder } from './utils/file'
import { config } from 'dotenv'
import { UPLOAD_DIR } from './constants/dir'
import staticRouter from './routes/static.routes'
config()

const port = process.env.PORT || 4000
initFolder()
app.use(express.json())
databaseService.connect()

//route mặc định localhost:3000
app.get('/', (req, res) => {
  res.send('hello world')
})

// http://localhost:3000/users/tweets
app.use('/users', usersRouter) //route handler
app.use('/medias', mediasRouter)
//app.use('/static', express.static(UPLOAD_DIR))
app.use('/static', staticRouter)
//app sd 1 error handler tổng
app.use(defaultErrorHandler)
app.listen(port, () => {
  console.log(`Project twitter này đang chạy trên post ${port}`)
})
