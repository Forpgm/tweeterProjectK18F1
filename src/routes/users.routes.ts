import { Router } from 'express'
import { loginValidator, registerValidator } from '~/middlewares/users.middlewares'
import { loginController, registerController } from '~/controllers/users.controllers'
import { register } from 'module'
const usersRouter = Router()

usersRouter.post('/login', loginValidator, loginController)
usersRouter.post('/register', registerValidator, registerController)

export default usersRouter
