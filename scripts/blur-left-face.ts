/**
 * 临时脚本：把指定图片中"最左边"那张脸 blur 掉
 *
 * 用法（项目根目录）：
 *   npx tsx --env-file=.env.local scripts/blur-left-face.ts
 *
 * 思路：
 *   1) 上传到 Cloudinary（detection: 'adv_face' 拿精确人脸框）
 *   2) 选 x 最小的那张脸（图像左边）
 *   3) 用 effect: 'blur_region' + x/y/width/height 只模糊该脸
 *   4) 下载结果到桌面，删除 Cloudinary 临时资源
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // Cloudinary free-plan 上限

const INPUT = '/Users/majiayu/Desktop/未命名文件夹/DSC_2644.JPG'
const OUTPUT = '/Users/majiayu/Desktop/未命名文件夹/DSC_2644.blurred-left.JPG'

type FaceBox = { x: number; y: number; width: number; height: number }

function configCloudinary() {
  const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const api_key = process.env.CLOUDINARY_API_KEY
  const api_secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'Missing Cloudinary env vars (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)'
    )
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
}

function pickLeftmostFace(uploadResult: any): FaceBox | null {
  // 1) adv_face: info.detection.adv_face.data.face[*].bounding_box {x,y,width,height}
  const advFaces: any[] | undefined =
    uploadResult?.info?.detection?.adv_face?.data?.face
  if (Array.isArray(advFaces) && advFaces.length > 0) {
    const boxes: FaceBox[] = advFaces
      .map((f) => f?.bounding_box)
      .filter(Boolean)
      .map((b) => ({
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
      }))
    if (boxes.length > 0) {
      boxes.sort((a, b) => a.x - b.x)
      return boxes[0]
    }
  }

  // 2) 兜底：upload response 顶层 faces: [[x, y, w, h], ...]（基础检测）
  const basic: number[][] | undefined = uploadResult?.faces
  if (Array.isArray(basic) && basic.length > 0) {
    const boxes: FaceBox[] = basic.map(([x, y, w, h]) => ({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
    }))
    boxes.sort((a, b) => a.x - b.x)
    return boxes[0]
  }

  return null
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} (${url})`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  configCloudinary()

  console.log('[1/4] reading input:', INPUT)
  let inputBuffer: Buffer<ArrayBufferLike> = await fs.readFile(INPUT)

  if (inputBuffer.length > MAX_UPLOAD_BYTES) {
    console.log(
      `       input is ${inputBuffer.length}B (> ${MAX_UPLOAD_BYTES}B), resizing with sharp ...`
    )
    let width = 4000
    let q = 90
    // 尝试逐步缩小直到 <= 10MB
    while (true) {
      const resized = await sharp(inputBuffer)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: q, mozjpeg: true })
        .toBuffer()
      if (resized.length <= MAX_UPLOAD_BYTES) {
        inputBuffer = resized
        console.log(
          `       resized: width=${width} q=${q} -> ${resized.length}B`
        )
        break
      }
      if (q > 75) q -= 5
      else width = Math.round(width * 0.85)
      if (width < 1200) {
        inputBuffer = resized
        console.warn(
          `       fallback: still ${resized.length}B at width=${width}, uploading anyway`
        )
        break
      }
    }
  }

  console.log('[2/4] uploading to Cloudinary (basic face detection) ...')
  const uploaded: any = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'temp-blur-left-face',
        resource_type: 'image',
        public_id: `${Date.now()}-${path
          .basename(INPUT)
          .replace(/\.[^.]+$/, '')}`,
        faces: true,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    )
    stream.end(inputBuffer)
  })

  console.log(
    `       uploaded: public_id=${uploaded.public_id}  ${uploaded.width}x${uploaded.height}  ${uploaded.bytes}B`
  )

  const face = pickLeftmostFace(uploaded)
  if (!face) {
    // 清理后报错
    try {
      await cloudinary.uploader.destroy(uploaded.public_id)
    } catch {}
    throw new Error('No face detected by Cloudinary (both adv_face and basic).')
  }

  // 给 face box 留一点 padding，避免边缘没盖住
  const pad = Math.round(Math.max(face.width, face.height) * 0.1)
  const padded: FaceBox = {
    x: Math.max(0, face.x - pad),
    y: Math.max(0, face.y - pad),
    width: face.width + pad * 2,
    height: face.height + pad * 2,
  }

  console.log('[3/4] leftmost face:', face, ' padded:', padded)

  const transformedUrl = cloudinary.url(uploaded.public_id, {
    transformation: [
      {
        effect: 'blur_region:2000',
        x: padded.x,
        y: padded.y,
        width: padded.width,
        height: padded.height,
      },
      { quality: 'auto:best', fetch_format: 'jpg' },
    ],
  })

  console.log('       transformedUrl:', transformedUrl)
  console.log('[4/4] downloading transformed image ...')
  const outBuf = await fetchBuffer(transformedUrl)
  await fs.writeFile(OUTPUT, outBuf)
  console.log('       saved:', OUTPUT, `(${outBuf.length}B)`)

  // 清理临时资源
  try {
    await cloudinary.uploader.destroy(uploaded.public_id)
    console.log('       cleaned cloudinary temp:', uploaded.public_id)
  } catch (e) {
    console.warn('       cleanup failed (ignored):', e)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
