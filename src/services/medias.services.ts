import sharp from 'sharp'
import { getNameFromFullname, handleUploadImage, handleUploadVideo } from '~/utils/file'
import { Request } from 'express'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import fs from 'fs'
import { isProduction } from '~/constants/config'
import { Media } from '~/models/Other'
import { MediaType } from '~/constants/enums'

class MediasService {
  async uploadImage(req: Request) {
    //luu anh vao trong uploads/temp
    const files = await handleUploadImage(req)
    //xu li file bang sharp giup toi uu hinh anh | giam dung luong..
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newFilename = getNameFromFullname(file.newFilename) + '.jpg'
        const newPath = UPLOAD_IMAGE_DIR + '/' + newFilename
        const info = await sharp(file.filepath).jpeg().toFile(newPath)
        //xóa file trong temp
        fs.unlinkSync(file.filepath)

        return {
          url: isProduction
            ? `${process.env.HOST}/static/image/${newFilename}`
            : `http://localhost:${process.env.PORT}/static/image/${newFilename}`,
          type: MediaType.Image
        }
      })
    )
    return result
  }
  async uploadVideo(req: Request) {
    //luu video vao trong uploads/video
    const files = await handleUploadVideo(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const { newFilename } = file
        return {
          url: isProduction
            ? `${process.env.HOST}/static/video/${newFilename}`
            : `http://localhost:${process.env.PORT}/static/video/${newFilename}`,
          type: MediaType.Video
        }
      })
    )
    return result
  }
}

const mediasService = new MediasService()
export default mediasService
