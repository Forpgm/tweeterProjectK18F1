import express from 'express'
const app = express()
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
const port = 3000
databaseService.connect()

app.use(express.json())
//route mặc định localhost:3000
app.get('/', (req, res) => {
  res.send('hello world')
})

// http://localhost:3000/users/tweets
app.use('/users', usersRouter) //route handler
app.listen(port, () => {
  console.log(`Project twitter này đang chạy trên post ${port}`)
})
