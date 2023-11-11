import path from 'path'
import fs from 'fs'
import formidable, { File } from 'formidable'
import { Request } from 'express'
import { Files } from 'formidable'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { get } from 'lodash'

//tao ra thu muc bi thieu
export const initFolder = () => {
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }) //cho phep tao folder nested vao nhau
    }
  })
}

//lay ten nhung khong lay duoi file
export const getNameFromFullname = (filename: string) => {
  //asdasd.asdasd.png
  const nameArr = filename.split('.')
  nameArr.pop() //xóa phần tử cuối cùng, tức là xóa đuôi .png
  return nameArr.join('') //nối lại thành chuỗi
}

//lay duoi file
export const getExtension = (filename: string) => {
  const nameArr = filename.split('.')
  return nameArr[nameArr.length - 1] //dung pop cung oke
}

//ham xu li file ma client gui len
export const handleUploadImage = async (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR),
    maxFiles: 4,
    keepExtensions: true,
    maxFileSize: 300 * 1024 * 4,
    filter: function ({ name, originalFilename, mimetype }) {
      //name la truong du lieu cua input | key
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'))
      if (!valid) {
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.image) {
        return reject(new Error('Image is empty'))
      }
      return resolve(files.image as File[])
    })
  })
}

//upload video hong co keepExtensions
export const handleUploadVideo = async (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_VIDEO_DIR),
    maxFiles: 1,
    //keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, //50mb
    filter: function ({ name, originalFilename, mimetype }) {
      //name la truong du lieu cua input | key
      const valid = name === 'video' && Boolean(mimetype?.includes('video/'))
      if (!valid) {
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.video) {
        return reject(new Error('Video is empty'))
      }
      //trong file(originalFilename, filepath, newFilename)
      //vi minh da tat keepExtensions nen file se khong co duoi
      const videos = files.video as File[] //lay ra ds cac video da upload
      //duyet qua tung video va
      videos.forEach((video) => {
        //lay duoi cua ten goc
        const ext = getExtension(video.originalFilename as string)
        //lap duoi vao ten moi
        video.newFilename += `.${ext}`
        //lap duoi vao filepath: duong dan den file moi
        fs.renameSync(video.filepath, `${video.filepath}.${ext}`)
      })
      return resolve(files.video as File[])
    })
  })
}
